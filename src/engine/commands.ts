import type { CommandResult, GitCommit, PipelineStage, RepoState } from './types';
import { commitHash, expId, fakeMd5, shortMd5 } from './hash';
import { teachAfterCommand } from './teach';
import { findConcept, formatConcepts } from './glossary';
import {
  addCache,
  addRemoteObject,
  applyDataEdit,
  cloneState,
  computeDirtyPaths,
  defaultRemote,
  ensureGit,
  isDirtyFile,
  isDirOut,
  makeFile,
  parseKeyValue,
  pipelineSignature,
  removeWorkspaceFile,
  restoreWorkspaceFromPointer,
  setParam,
  stageRunSig,
} from './state';

export interface CommandContext {
  state: RepoState;
  /** Command text used in level golf counting when it mutates state. */
  raw: string;
}

const COUNTING = /^dvc |^git (add|commit|checkout|init)|^edit |^rm /;

export function commandCountsForGolf(raw: string): boolean {
  return COUNTING.test(raw.trim());
}

function ok(output: string): CommandResult {
  return { ok: true, output };
}

function fail(error: string): CommandResult {
  return { ok: false, output: '', error };
}

function findGitCommit(state: RepoState, hash: string): GitCommit | undefined {
  return state.gitCommits.find((c) => c.hash.startsWith(hash));
}

function snapshotGit(state: RepoState, message: string): GitCommit {
  const pointers: Record<string, string> = {};
  for (const f of Object.values(state.files)) {
    if (f.tracked && f.pointerMd5) pointers[f.path] = f.pointerMd5;
  }
  const files = [...state.gitStaged];
  const commit: GitCommit = {
    hash: commitHash(`${message}|${state.gitCommits.length}|${JSON.stringify(pointers)}|${files.join(',')}`),
    message,
    pointers,
    pipelineSig: pipelineSignature(state),
    params: { ...state.params },
    metrics: { ...state.metrics },
    files,
  };
  state.gitCommits.push(commit);
  state.gitStaged = [];
  return commit;
}

function requireInit(state: RepoState): CommandResult | null {
  if (!state.initialized) {
    return fail('ERROR: this is not a DVC repository (no .dvc). Run `dvc init` first.');
  }
  return null;
}

function markPipelineDirtyIfInputChanged(state: RepoState, path: string): void {
  for (const stage of state.pipeline) {
    if (stage.deps.includes(path)) stage.upToDate = false;
  }
}

function syntheticMetrics(stage: PipelineStage, state: RepoState): void {
  // Deterministic metrics derived from params — good enough for teaching.
  const lr = Number(state.params.lr ?? state.params['train.lr'] ?? 0.1);
  const n = Number(state.params.n_estimators ?? state.params['train.n_est'] ?? 10);
  const acc = Math.min(0.99, 0.55 + n * 0.02 + (lr > 0 && lr < 0.3 ? 0.08 : 0) + (state.experiments.length * 0.001));
  if (stage.metrics.length) {
    for (const m of stage.metrics) {
      if (m.includes('acc') || m.includes('score')) state.metrics[m] = Number(acc.toFixed(4));
      else if (m.includes('loss') || m.includes('err')) state.metrics[m] = Number((1 - acc).toFixed(4));
      else state.metrics[m] = Number(acc.toFixed(4));
    }
  }
}

function parseStageAdd(args: string[]): { name?: string; deps: string[]; outs: string[]; params: string[]; metrics: string[]; cmd: string } {
  const deps: string[] = [];
  const outs: string[] = [];
  const params: string[] = [];
  const metrics: string[] = [];
  let name: string | undefined;
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-n' || a === '--name') name = args[++i];
    else if (a === '-d' || a === '--deps') deps.push(args[++i]);
    else if (a === '-o' || a === '--outs' || a === '-O' || a === '--outs-no-cache') outs.push(args[++i]);
    else if (a === '-p' || a === '--params') params.push(args[++i]);
    else if (a === '-m' || a === '--metrics' || a === '-M' || a === '--metrics-no-cache') metrics.push(args[++i]);
    else rest.push(a);
  }
  return { name, deps, outs, params, metrics, cmd: rest.join(' ') };
}

function runPipelineFrom(state: RepoState, stageName: string): string[] {
  const order: string[] = [];
  const visited = new Set<string>();
  const visit = (name: string) => {
    if (visited.has(name)) return;
    visited.add(name);
    const stage = state.pipeline.find((s) => s.name === name);
    if (!stage) return;
    for (const dep of stage.deps) {
      const upstream = state.pipeline.find((s) => s.outs.includes(dep));
      if (upstream) visit(upstream.name);
    }
    order.push(name);
  };
  visit(stageName);
  return order;
}

function reproStage(state: RepoState, stage: PipelineStage): string[] {
  const logs: string[] = [];
  if (stage.frozen) {
    logs.push(`Stage '${stage.name}' is frozen. Unfreeze with \`dvc unfreeze ${stage.name}\`.`);
    return logs;
  }
  for (const dep of stage.deps) {
    const f = state.files[dep];
    if (f && f.tracked && !f.present) {
      logs.push(`ERROR: missing dependency '${dep}'. Run \`dvc pull\` or \`dvc checkout\`.`);
      return logs;
    }
    if (f && f.tracked && isDirtyFile(f)) {
      logs.push(`WARNING: dependency '${dep}' is modified vs its .dvc pointer.`);
    }
    if (f && !f.present) {
      logs.push(`ERROR: dependency '${dep}' does not exist.`);
      return logs;
    }
  }

  const sig = stageRunSig(stage, state);
  if (stage.lastRunSig === sig || state.runCache.includes(sig)) {
    logs.push(`Stage '${stage.name}' restored from run cache (same inputs/params) — skip work.`);
    stage.upToDate = true;
    stage.lastRunSig = sig;
    if (!state.runCache.includes(sig)) state.runCache.push(sig);
    return logs;
  }

  logs.push(`Running stage '${stage.name}': ${stage.cmd}`);
  for (const out of stage.outs) {
    const dirOut = isDirOut(out);
    const contentId = fakeMd5(`out:${out}:${stage.cmd}:${JSON.stringify(state.params)}`);
    const existing = state.files[out];
    if (existing) {
      existing.contentId = contentId;
      existing.present = true;
      if (existing.tracked) {
        existing.pointerMd5 = contentId;
        existing.dirty = false;
        addCache(state, contentId);
      }
    } else {
      state.files[out] = makeFile(out, dirOut ? 'data' : out.endsWith('.json') || out.endsWith('.csv') ? 'data' : 'code', {
        contentId,
        present: true,
        tracked: false,
      });
    }
    if (dirOut) {
      // materialize a small "directory" marker so learners see nfiles
      const marker = `${out}/_dir`;
      state.files[marker] = makeFile(marker, 'data', {
        contentId: fakeMd5(`dir:${out}:${contentId}`),
        present: true,
      });
      logs.push(`  wrote directory out '${out}' (nfiles=2)`);
    }
    if (!state.generated.includes(out)) state.generated.push(out);
    addCache(state, contentId);
  }
  syntheticMetrics(stage, state);
  // plots: loss curve improves with more estimators
  const n = Number(state.params['train.n_est'] ?? state.params.n_estimators ?? 10);
  state.plots['loss'] = Array.from({ length: 6 }, (_, i) => Number((1 / (1 + (n / 20) * (i + 1))).toFixed(4)));
  state.plots['acc'] = state.plots['loss']!.map((v) => Number((1 - v).toFixed(4)));
  stage.upToDate = true;
  stage.lastRunSig = sig;
  if (!state.runCache.includes(sig)) state.runCache.push(sig);
  logs.push(`Stage '${stage.name}' is up to date (outputs regenerated).`);
  if (stage.metrics.length) {
    logs.push(`metrics: ${JSON.stringify(state.metrics)}`);
  }
  return logs;
}

function checkoutGitRef(state: RepoState, ref: string): CommandResult {
  if (ref === 'HEAD' || ref === 'main' || ref === 'master') {
    return ok(`Already on ${ref === 'HEAD' ? 'HEAD' : ref}.`);
  }
  if (/^HEAD~(\d+)$/.test(ref) || /^[0-9a-f]{4,7}$/.test(ref)) {
    let commit: GitCommit | undefined;
    if (ref.startsWith('HEAD~')) {
      const n = Number(ref.slice(5));
      commit = state.gitCommits[state.gitCommits.length - 1 - n];
    } else {
      commit = findGitCommit(state, ref);
    }
    if (!commit) return fail(`ERROR: pathspec '${ref}' did not match any commit.`);

    // Partial path checkout form is handled elsewhere; full ref switches pointers.
    for (const [path, md5] of Object.entries(commit.pointers)) {
      const f = state.files[path];
      if (!f) {
        state.files[path] = makeFile(path, 'data', {
          tracked: true,
          pointerMd5: md5,
          contentId: md5,
          present: state.cache.includes(md5),
          gitignored: true,
        });
      } else {
        f.tracked = true;
        f.pointerMd5 = md5;
        f.gitignored = true;
        // workspace not auto-synced; dvc checkout does that
        f.dirty = f.present && f.contentId !== md5;
        if (!f.present) f.dirty = true;
      }
    }
    // Drop pointers that didn't exist in that commit? Keep simple: leave extras.
    state.params = { ...commit.params };
    state.metrics = { ...commit.metrics };
    // Detach is not simulated; we stay "on" a virtual HEAD at that commit for .dvc files.
    return ok(`Switched data pointers to commit ${commit.hash} (${commit.message}).\nRun \`dvc checkout\` to sync workspace data.`);
  }
  if (ref.endsWith('.dvc') || ref.includes('/')) {
    // git checkout <commit> -- <path.dvc> form handled by caller via args
    return fail(`ERROR: unexpected git checkout target '${ref}'`);
  }
  return fail(`ERROR: pathspec '${ref}' did not match any file(s) known to git.`);
}

function gitCheckoutPartial(state: RepoState, commitRef: string, paths: string[]): CommandResult {
  const commit = findGitCommit(state, commitRef) ??
    (commitRef.startsWith('HEAD~')
      ? state.gitCommits[state.gitCommits.length - 1 - Number(commitRef.slice(5))]
      : undefined);
  if (!commit) return fail(`ERROR: unknown commit '${commitRef}'.`);
  const lines: string[] = [];
  for (const p of paths) {
    if (p.endsWith('.dvc')) {
      const dataPath = p.slice(0, -4);
      const md5 = commit.pointers[dataPath];
      const f = state.files[dataPath];
      if (!f) continue;
      if (!md5) {
        // file wasn't tracked in that commit
        f.tracked = false;
        f.pointerMd5 = undefined;
        lines.push(`Untracked ${dataPath} at ${commit.hash} (no .dvc entry).`);
      } else {
        f.pointerMd5 = md5;
        f.tracked = true;
        f.dirty = f.present && f.contentId !== md5;
        lines.push(`Checked out ${p} from ${commit.hash} → md5 ${shortMd5(md5)}…`);
      }
    } else if (p === 'params.yaml') {
      state.params = { ...commit.params };
      state.files['params.yaml'] = makeFile('params.yaml', 'params', {
        contentId: fakeMd5(`params:${JSON.stringify(commit.params)}`),
      });
      lines.push(`Checked out params.yaml from ${commit.hash}`);
    } else if (p === 'dvc.yaml' || p === 'dvc.lock') {
      lines.push(`Checked out ${p} pointer metadata from ${commit.hash} (pipeline state left as-is for this lesson).`);
    } else {
      lines.push(`Checked out ${p} from ${commit.hash}`);
    }
  }
  if (!lines.length) return fail(`ERROR: no matching paths in ${commit.hash}`);
  return ok(lines.join('\n') + `\nRun \`dvc checkout\` if data files must be restored from cache.`);
}

function statusLines(state: RepoState): string {
  if (!state.initialized) return 'ERROR: not a DVC repository.';
  const lines: string[] = [];
  const dirty = computeDirtyPaths(state);
  for (const path of dirty) {
    const f = state.files[path];
    if (!f) continue;
    if (!f.present && f.tracked) {
      lines.push(`deleted:           ${path}`);
    } else if (f.tracked) {
      lines.push(`modified:          ${path}`);
    }
  }
  const missingRemote = state.remotes.length === 0 && state.cache.length > 0;
  if (missingRemote) lines.push('warn: no remote configured — `dvc push` will fail');
  const notInCache = Object.values(state.files)
    .filter((f) => f.tracked && f.pointerMd5 && !state.cache.includes(f.pointerMd5) && f.present)
    .map((f) => f.path);
  for (const p of notInCache) {
    lines.push(`update file:       ${p} (pointer not in cache — try \`dvc commit\`)`);
  }
  if (!lines.length) return 'Data and pipelines are up to date.';
  return lines.join('\n');
}

export function executeCommand(prev: RepoState, rawInput: string): { state: RepoState; result: CommandResult } {
  const raw = rawInput.trim();
  const out = executeCommandInner(prev, rawInput);
  // Sticky learning checklist: remember successful commands even if a later
  // mistake clears git staging or mutates workspace state.
  if (out.result.ok && raw) {
    if (!out.state.commandHistory) out.state.commandHistory = [];
    out.state.commandHistory.push(raw);
  }
  return out;
}

function executeCommandInner(prev: RepoState, rawInput: string): { state: RepoState; result: CommandResult } {
  const state = cloneState(prev);
  const raw = rawInput.trim();
  if (!raw) return { state, result: ok('') };

  const finish = (st: RepoState, res: CommandResult): { state: RepoState; result: CommandResult } => {
    if (!res.ok || !res.output) return { state: st, result: res };
    const teach = teachAfterCommand(raw, st);
    return { state: st, result: ok(res.output + (teach ? `\n${teach}` : '')) };
  };

  // support simple `;` chains
  if (raw.includes(';') && !raw.startsWith('echo')) {
    const parts = raw.split(';').map((s) => s.trim()).filter(Boolean);
    let lastState = state;
    const outs: string[] = [];
    for (const part of parts) {
      const step = executeCommand(lastState, part);
      if (step.result.error) {
        return { state: prev, result: step.result };
      }
      lastState = step.state;
      if (step.result.output) outs.push(step.result.output);
    }
    return { state: lastState, result: ok(outs.join('\n')) };
  }

  const tokens = raw.split(/\s+/);
  const cmd = tokens[0];
  const args = tokens.slice(1);

  if (cmd === 'help' || cmd === '?') {
    return {
      state,
      result: ok(
        [
          'DVC commands: init, add, status, commit, checkout, remote, push, pull, fetch,',
          '  stage (with --foreach/--wdir/--always-changed), repro, dag, freeze, unfreeze,',
          '  metrics, params, plots --template, exp (run --queue|diff), queue, live, get, import,',
          '  update, api, cml, remove, gc, diff, version',
          'Git (simulated): init, add, commit, log, status, checkout',
          'Workspace simulators: edit <path>, rm <path>, cat <path> (dvc.yaml|dvc.lock|params.yaml), ls',
          'Meta: levels, help/ui/tour, curriculum, concepts|glossary, quiz, steps, hint, show goal, reset, undo, sandbox, clear',
        ].join('\n'),
      ),
    };
  }

  if (cmd === 'concepts' || cmd === 'glossary') {
    if (args.length) {
      const c = findConcept(args.join(' '));
      return c
        ? { state, result: ok(`${c.title}\n${c.body}`) }
        : { state, result: fail(`Unknown concept '${args.join(' ')}'. Type \`concepts\`.`) };
    }
    return {
      state,
      result: ok(
        [
          'DVC mental models (type `concepts <term>` for one entry):',
          '',
          formatConcepts(),
        ].join('\n'),
      ),
    };
  }

  if (cmd === 'ls') {
    const files = Object.values(state.files).filter((f) => f.present).map((f) => {
      const marks = [
        f.tracked ? 'DVC' : null,
        f.gitignored ? 'gitignored' : null,
        f.dirty ? 'dirty' : null,
      ].filter(Boolean).join(',');
      return `${f.path}${marks ? `  [${marks}]` : ''}`;
    });
    return { state, result: ok(files.join('\n') || '(empty workspace)') };
  }

  if (cmd === 'cat') {
    const path = args[0];
    if (!path) return { state, result: fail('Usage: cat <path>') };
    if (path === 'dvc.yaml' && state.pipeline.length) {
      const yaml: string[] = ['stages:'];
      for (const s of state.pipeline) {
        yaml.push(`  ${s.name}:`, `    cmd: ${s.cmd}`);
        if (s.deps.length) {
          yaml.push('    deps:');
          for (const d of s.deps) yaml.push(`      - ${d}`);
        }
        if (s.params.length) {
          yaml.push('    params:');
          for (const p of s.params) yaml.push(`      - ${p}`);
        }
        if (s.outs.length) {
          yaml.push('    outs:');
          for (const o of s.outs) yaml.push(`      - ${o}`);
        }
        if (s.metrics.length) {
          yaml.push('    metrics:');
          for (const m of s.metrics) yaml.push(`      - ${m}`);
        }
      }
      return { state, result: ok(yaml.join('\n')) };
    }
    if (path === 'dvc.lock' && state.pipeline.length) {
      const lock: string[] = ["schema: '2.0'", 'stages:'];
      for (const s of state.pipeline) {
        lock.push(`  ${s.name}:`, `    cmd: ${s.cmd}`, '    deps:');
        for (const d of s.deps) {
          lock.push(`      - path: ${d}`, `        md5: ${state.files[d]?.contentId ?? ''}`);
        }
        lock.push('    params:', '      params.yaml:');
        for (const p of s.params) lock.push(`        ${p}: ${state.params[p] ?? ''}`);
        lock.push('    outs:');
        for (const o of s.outs) {
          lock.push(`      - path: ${o}`, `        md5: ${state.files[o]?.contentId ?? ''}`);
        }
      }
      return { state, result: ok(lock.join('\n')) };
    }
    if (path === 'params.yaml') {
      return {
        state,
        result: ok(
          Object.entries(state.params)
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n'),
        ),
      };
    }
    const f = state.files[path];
    if (!f || !f.present) return { state, result: fail(`cat: ${path}: No such file`) };
    if (f.tracked) {
      return {
        state,
        result: ok(
          `${path}\ncontent_id=${f.contentId}\npointer=${f.pointerMd5 ?? '(none)'}\n${f.dirty ? 'status=dirty' : 'status=clean'}`,
        ),
      };
    }
    if (path.endsWith('.dvc')) {
      const dataPath = path.slice(0, -4);
      const ptr = state.files[dataPath];
      return {
        state,
        result: ok(
          [
            'outs:',
            '  - md5: ' + (ptr?.pointerMd5 ?? ''),
            '    path: ' + dataPath.split('/').pop(),
          ].join('\n'),
        ),
      };
    }
    return { state, result: ok(`${path}\n${f.kind} ${f.contentId}`) };
  }

  if (cmd === 'edit') {
    const path = args[0];
    if (!path) return { state, result: fail('Usage: edit <path>') };
    if (path === '.dvcignore') {
      const pattern = args[1];
      if (pattern) {
        if (!state.dvcIgnore.includes(pattern)) state.dvcIgnore.push(pattern);
        return finish(state, ok(`.dvcignore += ${pattern}\nDVC will skip matching paths in status/add scans.`));
      }
      return { state, result: ok((state.dvcIgnore || []).join('\n') || '(.dvcignore empty)') };
    }
    const f = state.files[path];
    if (!f) return { state, result: fail(`edit: ${path}: No such file`) };
    if (!f.present) return { state, result: fail(`edit: ${path}: file not present in workspace`) };
    if (f.kind === 'code' || f.kind === 'params') {
      if (path === 'params.yaml' && args[1]) {
        // edit params.yaml prepare.seed=0.2  (nested keys use dots)
        const kv = parseKeyValue(args[1]);
        if (kv) {
          setParam(state, kv.key, kv.value);
          f.contentId = fakeMd5(`params:${JSON.stringify(state.params)}`);
          for (const s of state.pipeline) if (s.params.length) s.upToDate = false;
          return { state, result: ok(`Updated ${path}: ${kv.key}=${kv.value}`) };
        }
      }
      f.contentId = fakeMd5(`edit:${path}:${Date.now()}`);
      markPipelineDirtyIfInputChanged(state, path);
      return { state, result: ok(`Modified ${path}`) };
    }
    applyDataEdit(state, path);
    markPipelineDirtyIfInputChanged(state, path);
    state.files[path].dirty = isDirtyFile(state.files[path]);
    return {
      state,
      result: ok(`Modified ${path} → content_id=${state.files[path].contentId}`),
    };
  }

  if (cmd === 'rm') {
    const path = args[0];
    if (!path) return { state, result: fail('Usage: rm <path>') };
    const removed = removeWorkspaceFile(state, path);
    return removed
      ? { state, result: ok(`Removed ${path} from workspace (cache may still hold it).`) }
      : { state, result: fail(`rm: ${path}: No such file`) };
  }

  // ── git simulation ──────────────────────────────────────────
  if (cmd === 'git') {
    const sub = args[0];
    if (sub === 'init') {
      ensureGit(state);
      return { state, result: ok('Initialized empty Git repository.') };
    }
    if (sub === 'status') {
      const staged = state.gitStaged.length ? state.gitStaged : [];
      const committed = new Set(state.gitCommits.flatMap((c) => Object.keys(c.pointers)));
      const unstaged = Object.values(state.files)
        .filter((f) => f.present && !f.gitignored && !f.tracked)
        .filter((f) => {
          // hide .dvc meta once Initialize DVC is committed
          if (f.path === '.dvc/config' || f.path === '.dvc/.gitignore') {
            return !state.gitCommits.some((c) => c.message.includes('Initialize DVC'));
          }
          return !committed.has(f.path);
        })
        .map((f) => f.path);
      const ptrModified = Object.values(state.files)
        .filter((f) => f.tracked && f.dirty)
        .map((f) => `${f.path}.dvc`);
      return {
        state,
        result: ok(
          [
            'On branch main',
            staged.length
              ? `Changes to be committed:\n${staged.map((s) => `\t${s}`).join('\n')}`
              : 'No changes added to commit.',
            ptrModified.length ? `modified: ${ptrModified.join(', ')}` : null,
            unstaged.length
              ? `Untracked files:\n${unstaged.map((s) => `\t${s}`).join('\n')}\n\nNext: git add <file> && git commit -m "..."`
              : null,
          ]
            .filter(Boolean)
            .join('\n'),
        ),
      };
    }
    if (sub === 'log') {
      const lines = state.gitCommits
        .slice()
        .reverse()
        .map((c) => `commit ${c.hash}\n    ${c.message}`);
      return { state, result: ok(lines.join('\n\n') || 'No commits yet') };
    }
    if (sub === 'add') {
      const paths = args.slice(1);
      if (!paths.length) return { state, result: fail('Nothing specified, nothing added.') };
      const added: string[] = [];
      for (const p of paths) {
        if (p === '.dvc' || p === '.dvc/') {
          if (!state.initialized) return { state, result: fail(`fatal: pathspec '${p}' did not match any files`) };
          for (const meta of ['.dvc/config', '.dvc/.gitignore']) {
            if (!state.gitStaged.includes(meta) && !state.gitCommits.some((c) => c.message.includes('Initialize DVC'))) {
              state.gitStaged.push(meta);
              added.push(meta);
            } else if (!state.gitStaged.includes(meta) && state.initialized) {
              // still allow staging if not in any commit content — use staged list
              if (!state.gitCommits.some((c) => c.message === 'Initialize DVC')) {
                state.gitStaged.push(meta);
                added.push(meta);
              } else {
                state.gitStaged.push(meta);
                added.push(meta + ' (already tracked)');
              }
            }
          }
          continue;
        }
        if (p.endsWith('.dvc')) {
          const dataPath = p.slice(0, -4);
          const f = state.files[dataPath];
          if (!f || !f.tracked) return { state, result: fail(`fatal: pathspec '${p}' did not match any files`) };
          state.gitStaged.push(p);
          added.push(p);
          continue;
        }
        if (p === 'params.yaml' || p === 'dvc.yaml' || p === 'dvc.lock' || p === 'src/train.py') {
          state.gitStaged.push(p);
          added.push(p);
          continue;
        }
        if (state.files[p] && !state.files[p].gitignored) {
          state.gitStaged.push(p);
          added.push(p);
          continue;
        }
        return { state, result: fail(`fatal: pathspec '${p}' did not match any files`) };
      }
      return { state, result: ok(added.length ? `Staged:\n  ${added.join('\n  ')}` : 'Nothing staged.') };
    }
    if (sub === 'commit') {
      const msgIdx = args.indexOf('-m');
      if (msgIdx === -1 || !args[msgIdx + 1]) return { state, result: fail('error: switch `m` requires a value') };
      const message = args.slice(msgIdx + 1).join(' ').replace(/^["']|["']$/g, '');
      if (!state.gitStaged.length) {
        // After a wrong-message commit the index is empty. If this project has
        // DVC metadata (or tracked pointers), re-stage them so the learner can
        // retry the commit message without "losing" earlier steps.
        const restage: string[] = [];
        if (state.initialized) {
          if (!state.files['.dvc/config']) state.files['.dvc/config'] = makeFile('.dvc/config', 'meta');
          if (!state.files['.dvc/.gitignore']) state.files['.dvc/.gitignore'] = makeFile('.dvc/.gitignore', 'meta');
          restage.push('.dvc/config', '.dvc/.gitignore');
        }
        for (const f of Object.values(state.files)) {
          if (f.tracked) restage.push(`${f.path}.dvc`);
        }
        const ranGitAdd = (state.commandHistory ?? []).some((c) => /^git\s+add\b/.test(c.trim()));
        if (!restage.length && !ranGitAdd) {
          return { state, result: fail('nothing to commit, working tree clean (stage .dvc files first)') };
        }
        if (!restage.length) restage.push('.dvc/config', '.dvc/.gitignore');
        state.gitStaged = [...new Set(restage)];
      }
      const c = snapshotGit(state, message);
      return finish(state, ok(`[${c.hash}] ${message}`));
    }
    if (sub === 'checkout') {
      // forms:
      // git checkout HEAD~1
      // git checkout HEAD~1 data/data.xml.dvc
      // git checkout <hash> -- <path>
      if (args.includes('--')) {
        const idx = args.indexOf('--');
        const ref = args[1];
        const paths = args.slice(idx + 1);
        return { state, result: gitCheckoutPartial(state, ref, paths) };
      }
      if (args.length >= 3 && (args[2].endsWith('.dvc') || args[2].includes('/'))) {
        return { state, result: gitCheckoutPartial(state, args[1], args.slice(2)) };
      }
      if (args.length === 2) {
        return { state, result: checkoutGitRef(state, args[1]) };
      }
      return { state, result: fail('Usage: git checkout <ref> [-- <path>]') };
    }
    return { state, result: fail(`git: '${sub}' is not supported in this simulator.`) };
  }

  // ── dvc ─────────────────────────────────────────────────────
  if (cmd !== 'dvc') {
    // sandbox helpers listed in help
    return { state, result: fail(`command not found: ${cmd}. Type \`help\`.`) };
  }

  const sub = args[0];
  if (!sub || sub === '--help' || sub === '-h') {
    return { state, result: ok('usage: dvc <command> [...] — type `help` for the short list.') };
  }
  if (sub === 'version' || sub === '--version') {
    return { state, result: ok('3.x (LearnDVC simulator)') };
  }

  if (sub === 'init') {
    if (state.initialized) return { state, result: fail('ERROR: DVC already initialized (existing .dvc directory).') };
    ensureGit(state);
    state.initialized = true;
    state.files['.dvc/config'] = makeFile('.dvc/config', 'meta');
    state.files['.dvc/.gitignore'] = makeFile('.dvc/.gitignore', 'meta');
    return finish(state, ok(
      [
        'Initialized DVC local workspace.',
        '',
        'Created:',
        '  .dvc/config',
        '  .dvc/.gitignore',
        '',
        'DVC alone is not enough — Git must version this metadata.',
      ].join('\n'),
    ));
  }

  if (sub === 'freeze' || sub === 'unfreeze') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    const name = args[1];
    if (!name) return { state, result: fail(`Usage: dvc ${sub} <stage>`) };
    const stage = state.pipeline.find((s) => s.name === name);
    if (!stage) return { state, result: fail(`ERROR: stage '${name}' not found.`) };
    stage.frozen = sub === 'freeze';
    return finish(
      state,
      ok(
        stage.frozen
          ? `Frozen stage '${name}' — repro will skip it until unfreeze.`
          : `Unfrozen stage '${name}' — repro can run it again when dirty.`,
      ),
    );
  }

  if (sub === 'diff') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    const dirty = computeDirtyPaths(state);
    const lines: string[] = ['Data/workspace diff vs pointers (simplified):'];
    if (!dirty.length) lines.push('  (no dirty tracked data)');
    for (const p of dirty) {
      const f = state.files[p]!;
      lines.push(
        `  ${!f.present ? 'deleted' : 'modified'}  ${p}  pointer=${f.pointerMd5?.slice(0, 8) ?? '—'}… content=${f.contentId.slice(0, 8)}…`,
      );
    }
    const tracked = Object.values(state.files).filter((f) => f.tracked);
    const onRemote = tracked.filter((f) => f.pointerMd5 && state.remoteObjects.includes(f.pointerMd5)).length;
    lines.push(`  remote coverage: ${onRemote}/${tracked.length} tracked object(s)`);
    return finish(state, ok(lines.join('\n')));
  }

  if (sub === 'status') {
    return finish(state, ok(statusLines(state)));
  }

  if (sub === 'add') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    const path = args.slice(1).filter((a) => !a.startsWith('-'))[0];
    if (!path) return { state, result: fail('Usage: dvc add <path>') };
    const f = state.files[path];
    if (!f || !f.present) return { state, result: fail(`ERROR: bad path '${path}' — nothing in the workspace.`) };
    if (f.kind === 'code' || f.kind === 'params' || f.kind === 'yaml') {
      return { state, result: fail(`ERROR: refusing to track '${path}'. DVC tracks data artifacts, not code.`) };
    }
    const md5 = f.contentId;
    f.tracked = true;
    f.pointerMd5 = md5;
    f.gitignored = true;
    f.dirty = false;
    addCache(state, md5);
    state.files[`${path}.dvc`] = makeFile(`${path}.dvc`, 'dvc', {
      contentId: fakeMd5(`dvcfile:${path}:${md5}`),
      present: true,
    });
    const gitignorePath = `${path.split('/')[0]}/.gitignore`;
    if (!state.files[gitignorePath]) {
      state.files[gitignorePath] = makeFile(gitignorePath, 'meta', {
        gitignored: false,
        contentId: fakeMd5(`gi:${gitignorePath}`),
      });
    }
    markPipelineDirtyIfInputChanged(state, path);
    return finish(state, ok(
      [
        `100% ${path}`,
        `Pointer file written: ${path}.dvc  (md5 ${md5.slice(0, 8)}…)`,
        `Cache object: .dvc/cache/files/md5/${md5.slice(0, 2)}/${md5.slice(2)}`,
        `${path} is now gitignored — Git will track the pointer, not the bytes.`,
        `Next in Git: git add ${path}.dvc data/.gitignore`,
      ].join('\n'),
    ));
  }

  if (sub === 'commit') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    const path = args.slice(1).filter((a) => !a.startsWith('-'))[0];
    const lines: string[] = [];
    const targets = path
      ? [path]
      : Object.values(state.files).filter((f) => f.tracked && f.dirty).map((f) => f.path);
    if (!targets.length) return { state, result: ok('No modified data to commit.') };
    for (const p of targets) {
      const f = state.files[p];
      if (!f) continue;
      if (!f.present) {
        lines.push(`ERROR: '${p}' is missing. Cannot commit without the file or a cache object.`);
        continue;
      }
      f.pointerMd5 = f.contentId;
      f.dirty = false;
      addCache(state, f.pointerMd5);
      lines.push(`committed ${p} → ${shortMd5(f.pointerMd5)}`);
    }
    return finish(state, ok(lines.join('\n')));
  }

  if (sub === 'checkout') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    const path = args[1];
    const targets = path
      ? [path]
      : Object.values(state.files).filter((f) => f.tracked).map((f) => f.path);
    const lines: string[] = [];
    for (const p of targets) {
      const f = state.files[p];
      if (!f || !f.tracked || !f.pointerMd5) {
        lines.push(`ERROR: '${p}' is not DVC-tracked.`);
        continue;
      }
      const restored = restoreWorkspaceFromPointer(state, p);
      if (restored) {
        markPipelineDirtyIfInputChanged(state, p);
        lines.push(`checked out ${p} (${shortMd5(f.pointerMd5)}…)`);
      } else if (state.remoteObjects.includes(f.pointerMd5!)) {
        lines.push(`ERROR: '${p}' is not in local cache. Run \`dvc pull\`.`);
      } else {
        lines.push(`ERROR: cache object for '${p}' not found locally or on remote.`);
      }
    }
    return { state, result: ok(lines.join('\n')) };
  }

  if (sub === 'remote') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    const rsub = args[1];
    if (!rsub || rsub === 'list') {
      if (!state.remotes.length) return { state, result: ok('No remotes configured.') };
      return {
        state,
        result: ok(
          state.remotes.map((r) => `${r.isDefault ? '*' : ' '} ${r.name}\t${r.url}`).join('\n'),
        ),
      };
    }
    if (rsub === 'add') {
      const flags = args.slice(2);
      const isDefault = flags.includes('-d') || flags.includes('--default');
      const rest = flags.filter((a) => !a.startsWith('-'));
      const name = rest[0];
      const url = rest[1];
      if (!name || !url) return { state, result: fail('Usage: dvc remote add [-d] <name> <url>') };
      if (state.remotes.some((r) => r.name === name)) {
        return { state, result: fail(`ERROR: remote '${name}' already exists.`) };
      }
      if (isDefault) {
        for (const r of state.remotes) r.isDefault = false;
      }
      state.remotes.push({ name, url, isDefault: isDefault || state.remotes.length === 0 });
      return finish(state, ok(`Added remote '${name}' → ${url}${isDefault || state.remotes.length === 1 ? ' (default)' : ''}`));
    }
    if (rsub === 'default') {
      const name = args[2];
      const remote = state.remotes.find((r) => r.name === name);
      if (!remote) return { state, result: fail(`ERROR: remote '${name}' doesn't exist.`) };
      for (const r of state.remotes) r.isDefault = r.name === name;
      return { state, result: ok(`Default remote: ${name}`) };
    }
    if (rsub === 'remove') {
      const name = args[2];
      const before = state.remotes.length;
      state.remotes = state.remotes.filter((r) => r.name !== name);
      if (state.remotes.length === before) return { state, result: fail(`ERROR: remote '${name}' doesn't exist.`) };
      if (state.remotes.length && !state.remotes.some((r) => r.isDefault)) {
        state.remotes[0].isDefault = true;
      }
      return { state, result: ok(`Removed remote '${name}'`) };
    }
    return { state, result: fail('Usage: dvc remote [add|list|default|remove]') };
  }

  if (sub === 'push') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    const remote = defaultRemote(state);
    if (!remote) return { state, result: fail('ERROR: no remote configured. Use `dvc remote add -d <name> <url>`.') };
    const tracked = Object.values(state.files).filter((f) => f.tracked && f.pointerMd5);
    if (!tracked.length) return { state, result: ok('Nothing to push.') };
    let pushed = 0;
    const lines: string[] = [];
    for (const f of tracked) {
      const md5 = f.pointerMd5!;
      if (!state.cache.includes(md5)) {
        // push what we can from cache
        if (f.present && !isDirtyFile(f)) {
          addCache(state, md5);
        } else if (isDirtyFile(f)) {
          lines.push(`WARNING: ${f.path} is dirty — push committed cache only (run dvc commit first).`);
          continue;
        } else if (!state.cache.includes(md5)) {
          lines.push(`WARNING: ${f.path} not in cache, skipped.`);
          continue;
        }
      }
      if (state.cache.includes(md5) && !state.remoteObjects.includes(md5)) {
        addRemoteObject(state, md5);
        pushed++;
        lines.push(`pushed ${f.path} (${shortMd5(md5)}…) → ${remote.name}`);
      } else if (state.remoteObjects.includes(md5)) {
        lines.push(`${f.path} already on remote`);
      }
    }
    if (!pushed && !lines.length) return finish(state, ok('Everything is up to date.'));
    return finish(state, ok(lines.join('\n') || `Pushed ${pushed} object(s) to ${remote.name}`));
  }

  if (sub === 'fetch' || sub === 'pull') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    const remote = defaultRemote(state);
    if (!remote) return { state, result: fail('ERROR: no remote configured.') };
    const tracked = Object.values(state.files).filter((f) => f.tracked && f.pointerMd5);
    const lines: string[] = [];
    for (const f of tracked) {
      const md5 = f.pointerMd5!;
      if (state.remoteObjects.includes(md5)) {
        addCache(state, md5);
        lines.push(`${sub === 'pull' ? 'pulled' : 'fetched'} ${f.path} (${shortMd5(md5)}…)`);
        if (sub === 'pull') {
          restoreWorkspaceFromPointer(state, f.path);
        }
      } else if (state.cache.includes(md5)) {
        lines.push(`${f.path} already in cache`);
      } else {
        lines.push(`WARNING: ${f.path} (md5 ${shortMd5(md5)}…) not on remote`);
      }
    }
    return { state, result: ok(lines.join('\n') || 'Everything is up to date.') };
  }

  if (sub === 'remove' || sub === 'destroy') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    if (sub === 'destroy') {
      return { state, result: fail('ERROR: destroy is disabled in the simulator. Use `reset`.') };
    }
    const path = args[1];
    if (!path) return { state, result: fail('Usage: dvc remove <target>') };
    const dataPath = path.endsWith('.dvc') ? path.slice(0, -4) : path;
    const f = state.files[dataPath];
    if (!f || !f.tracked) return { state, result: fail(`ERROR: '${path}' is not a DVC output.`) };
    f.tracked = false;
    f.pointerMd5 = undefined;
    f.gitignored = false;
    delete state.files[`${dataPath}.dvc`];
    state.pipeline = state.pipeline.map((s) => ({
      ...s,
      outs: s.outs.filter((o) => o !== dataPath),
      upToDate: false,
    }));
    return { state, result: ok(`Removed DVC tracking for ${dataPath}`) };
  }

  if (sub === 'gc') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    const keep = new Set<string>();
    for (const f of Object.values(state.files)) {
      if (f.tracked && f.pointerMd5) keep.add(f.pointerMd5);
    }
    for (const c of state.gitCommits) {
      for (const md5 of Object.values(c.pointers)) keep.add(md5);
    }
    const before = state.cache.length;
    const removed = state.cache.filter((m) => !keep.has(m));
    state.cache = state.cache.filter((m) => keep.has(m));
    return {
      state,
      result: ok(removed.length ? `Removed ${before - state.cache.length} unused cache object(s).` : 'Nothing to collect.'),
    };
  }

  if (sub === 'stage') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    const ssub = args[1];
    if (!ssub || ssub === 'list') {
      if (!state.pipeline.length) return { state, result: ok('No stages in dvc.yaml.') };
      return { state, result: ok(state.pipeline.map((s) => s.name).join('\n')) };
    }
    if (ssub === 'add') {
      const parsed = parseStageAdd(args.slice(2));
      if (!parsed.name) return { state, result: fail('Usage: dvc stage add -n <name> -d <dep> -o <out> <command>') };
      if (state.pipeline.some((s) => s.name === parsed.name)) {
        return { state, result: fail(`ERROR: stage '${parsed.name}' already exists.`) };
      }
      if (!parsed.cmd) return { state, result: fail('ERROR: stage command is required.') };
      // ensure code dep exists for teaching
      for (const dep of parsed.deps) {
        if (!state.files[dep] && dep !== 'params.yaml') {
          state.files[dep] = makeFile(dep, 'code');
        }
      }
      const outDirs = parsed.outs.filter((o) => isDirOut(o));
      // stage flags from raw args (advanced course surface)
      const alwaysChanged = args.includes('--always-changed');
      const noCache: string[] = [];
      const external: string[] = [];
      const wIdx = args.indexOf('--wdir');
      const wdir = wIdx >= 0 ? args[wIdx + 1] : undefined;
      const foreachIdx = args.indexOf('--foreach');
      const foreachList =
        foreachIdx >= 0
          ? (args[foreachIdx + 1] ?? '').split(',').filter(Boolean)
          : [];
      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--outs-no-cache' && args[i + 1]) noCache.push(args[i + 1]!);
        if ((args[i] === '-O' || args[i] === '--outs-no-cache') && args[i + 1]) noCache.push(args[i + 1]!);
      }
      for (const o of parsed.outs) {
        if (o.includes('://') || o.startsWith('s3://') || o.startsWith('gs://')) external.push(o);
      }
      const stage: PipelineStage = {
        name: parsed.name,
        deps: parsed.deps,
        outs: parsed.outs,
        cmd: parsed.cmd,
        params: parsed.params,
        metrics: parsed.metrics,
        frozen: false,
        upToDate: false,
        outDirs,
      };
      state.pipeline.push(stage);
      state.stageMeta[parsed.name] = {
        alwaysChanged,
        noCache,
        external,
        wdir,
        foreach: foreachList,
      };
      if (foreachList.length) {
        for (const key of foreachList) {
          const expanded = `${parsed.name}[${key}]`;
          if (!state.pipeline.some((s) => s.name === expanded)) {
            state.pipeline.push({ ...stage, name: expanded, upToDate: false });
          }
        }
      }
      state.files['dvc.yaml'] = makeFile('dvc.yaml', 'yaml', {
        contentId: fakeMd5(`dvc.yaml:${pipelineSignature(state)}`),
      });
      return finish(state, ok(
        [
          `Added stage '${parsed.name}' to dvc.yaml`,
          `  deps: ${parsed.deps.join(', ') || '(none)'}`,
          `  outs: ${parsed.outs.join(', ') || '(none)'}${outDirs.length ? `  [dir outs: ${outDirs.join(', ')}]` : ''}`,
          `  params: ${parsed.params.join(', ') || '(none)'}`,
          `  metrics: ${parsed.metrics.join(', ') || '(none)'}`,
          `  cmd:  ${parsed.cmd}`,
          '',
          'dvc.yaml excerpt (metafile — commit this with Git):',
          `  ${parsed.name}:`,
          `    cmd: ${parsed.cmd}`,
          `    deps: [${parsed.deps.join(', ')}]`,
          `    outs: [${parsed.outs.join(', ')}]`,
        ].join('\n'),
      ));
    }
    return { state, result: fail('Usage: dvc stage [add|list]') };
  }

  if (sub === 'repro') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    if (!state.pipeline.length) return { state, result: fail('ERROR: no stages to reproduce. Define one with `dvc stage add`.') };
    const target = args[1];
    const logs: string[] = [];
    if (target) {
      const stage = state.pipeline.find((s) => s.name === target);
      if (!stage) return { state, result: fail(`ERROR: stage '${target}' not found.`) };
      for (const name of runPipelineFrom(state, target)) {
        const s = state.pipeline.find((x) => x.name === name);
        if (!s) continue;
        if (s.upToDate) {
          logs.push(`Stage '${s.name}' didn't change, skipping.`);
          continue;
        }
        logs.push(...reproStage(state, s));
      }
    } else {
      for (const s of state.pipeline) {
        if (s.upToDate) {
          logs.push(`Stage '${s.name}' didn't change, skipping.`);
          continue;
        }
        logs.push(...reproStage(state, s));
      }
    }
    state.files['dvc.lock'] = makeFile('dvc.lock', 'yaml', {
      contentId: fakeMd5(`lock:${pipelineSignature(state)}:${JSON.stringify(state.metrics)}`),
    });
    return finish(state, ok(logs.join('\n')));
  }

  if (sub === 'dag') {
    if (!state.pipeline.length) return { state, result: fail('ERROR: no stages to visualize.') };
    const names = state.pipeline.map((s) => s.name);
    const lines = state.pipeline.map((s) => {
      const outs = s.outs.map((o) => `${s.name} -> ${o}`);
      const depEdges = s.deps.map((d) => {
        const up = state.pipeline.find((u) => u.outs.includes(d));
        return up ? `${up.name} -> ${s.name}` : `${d} -> ${s.name}`;
      });
      return [...depEdges, ...outs].join('\n');
    });
    return { state, result: ok(`stages: ${names.join(', ')}\n` + lines.filter(Boolean).join('\n')) };
  }

  if (sub === 'params') {
    const psub = args[1] ?? 'show';
    if (psub === 'show') {
      return {
        state,
        result: ok(
          Object.entries(state.params)
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n') || 'No params.',
        ),
      };
    }
    if (psub === 'diff') {
      const head = state.gitCommits[state.gitCommits.length - 1]?.params ?? {};
      const keys = [...new Set([...Object.keys(head), ...Object.keys(state.params)])];
      const lines = ['Path\t\tParam\t\tHEAD\tworkspace'];
      for (const k of keys) {
        const a = head[k];
        const b = state.params[k];
        if (a !== b) lines.push(`params.yaml\t${k}\t${a ?? '—'}\t${b ?? '—'}`);
      }
      return {
        state,
        result: ok(lines.length > 1 ? lines.join('\n') : 'No param differences vs last commit.'),
      };
    }
    return { state, result: fail('Usage: dvc params show|diff') };
  }

  if (sub === 'metrics') {
    const msub = args[1] ?? 'show';
    if (msub === 'show') {
      if (!Object.keys(state.metrics).length) return { state, result: ok('No metrics found. Run a pipeline stage first.') };
      return {
        state,
        result: ok(
          Object.entries(state.metrics)
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n'),
        ),
      };
    }
    if (msub === 'diff') {
      const head = state.gitCommits[state.gitCommits.length - 1]?.metrics ?? {};
      const keys = [...new Set([...Object.keys(head), ...Object.keys(state.metrics)])];
      const lines = ['Path\t\tMetric\t\tHEAD\tworkspace\tChange'];
      for (const k of keys) {
        const a = head[k];
        const b = state.metrics[k];
        if (a !== b) {
          const change = a !== undefined && b !== undefined ? (b - a).toFixed(4) : '—';
          lines.push(`eval/metrics.json\t${k}\t${a ?? '—'}\t${b ?? '—'}\t${change}`);
        }
      }
      return {
        state,
        result: ok(lines.length > 1 ? lines.join('\n') : 'No metric differences vs last commit.'),
      };
    }
    return { state, result: fail('Usage: dvc metrics show|diff') };
  }

  if (sub === 'live') {
    // DVCLive-style instrumentation (simulated API surface used in courses).
    const lsub = args[1] ?? 'status';
    if (lsub === 'start' || lsub === 'init') {
      state.live = { active: true, step: 0, metrics: {}, images: [], plotData: [] };
      return finish(state, ok('DVCLive: Live(dir="dvclive_logs") started (simulated).\nIn real code: with Live() as live: ...'));
    }
    if (lsub === 'log') {
      const kind = args[2]; // metric|image|plot|param
      const kv = args[3];
      if (!state.live.active) state.live.active = true;
      state.live.step += 1;
      if (kind === 'metric' && kv) {
        const p = parseKeyValue(kv);
        if (!p) return { state, result: fail('Usage: dvc live log metric name=value') };
        const arr = state.live.metrics[p.key] ?? [];
        arr.push(Number(p.value));
        state.live.metrics[p.key] = arr;
        state.metrics[`live:${p.key}`] = Number(p.value);
        state.plots[p.key] = arr;
        return finish(state, ok(`live.log_metric('${p.key}', ${p.value})  step=${state.live.step}`));
      }
      if (kind === 'image' && kv) {
        state.live.images.push(kv);
        return finish(state, ok(`live.log_image('${kv}')`));
      }
      if (kind === 'plot' && kv) {
        state.live.plotData.push(kv);
        state.plots[kv.split('/').pop() ?? kv] = [0.2, 0.35, 0.5, 0.72];
        return finish(state, ok(`live.log_plot('${kv}')  (series registered for plots show)`));
      }
      if (kind === 'param' && kv) {
        const p = parseKeyValue(kv);
        if (p) setParam(state, p.key, p.value);
        return finish(state, ok(`live.log_param('${p?.key}', ${p?.value})`));
      }
      return { state, result: fail('Usage: dvc live log metric|image|plot|param …') };
    }
    if (lsub === 'report' || lsub === 'make-report') {
      return finish(
        state,
        ok(
          [
            'DVCLive HTML report (simulated): dvclive_reports/report.html',
            `  metrics steps: ${state.live.step}`,
            `  series: ${Object.keys(state.live.metrics).join(', ') || '(none)'}`,
            `  images: ${state.live.images.length}  plots: ${state.live.plotData.length}`,
            'In real projects Live.make_report() writes browsable HTML + dvc.yaml metrics/plots hooks.',
          ].join('\n'),
        ),
      );
    }
    return {
      state,
      result: ok(
        [
          'DVCLive (simulated API used in courses):',
          '  dvc live start',
          '  dvc live log metric acc=0.92',
          '  dvc live log image confusion.png',
          '  dvc live log plot roc.json',
          '  dvc live log param lr=0.05',
          '  dvc live report',
        ].join('\n'),
      ),
    };
  }

  if (sub === 'queue') {
    const qsub = args[1] ?? 'status';
    if (qsub === 'status') {
      return {
        state,
        result: ok(
          [
            `queued: ${state.expQueue.length}`,
            `done:   ${state.experiments.length}`,
            ...state.expQueue.map((q, i) => `  [${i}] ${q.id} params=${JSON.stringify(q.params)}`),
          ].join('\n'),
        ),
      };
    }
    if (qsub === 'start') {
      if (!state.expQueue.length) return { state, result: fail('Queue is empty. Use `dvc exp run --queue -S key=val`.') };
      const logs = [`Starting queued experiments (${state.expQueue.length})…`];
      for (const q of state.expQueue) {
        for (const [k, v] of Object.entries(q.params)) setParam(state, k, v);
        for (const st of state.pipeline) st.upToDate = false;
        for (const st of state.pipeline) logs.push(...reproStage(state, st));
        const id = expId(JSON.stringify(q.params) + state.experiments.length);
        state.experiments.push({
          id,
          name: id,
          commitRef: state.gitCommits[state.gitCommits.length - 1]?.hash ?? 'HEAD',
          params: { ...state.params },
          metrics: { ...state.metrics },
        });
        logs.push(`  finished ${id}`);
      }
      state.expQueue = [];
      return finish(state, ok(logs.join('\n')));
    }
    if (qsub === 'remove') {
      state.expQueue = [];
      return finish(state, ok('Cleared experiment queue.'));
    }
    return { state, result: fail('Usage: dvc queue [status|start|remove]') };
  }

  if (sub === 'update') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    const path = args[1];
    if (!path) return { state, result: fail('Usage: dvc update <path.dvc>') };
    const dataPath = path.endsWith('.dvc') ? path.slice(0, -4) : path;
    const f = state.files[dataPath];
    if (!f || !f.tracked) return { state, result: fail(`ERROR: '${path}' is not an imported .dvc target.`) };
    const v = (state.dataVersions[dataPath] ?? 0) + 1;
    state.dataVersions[dataPath] = v;
    f.contentId = fakeMd5(`import:${dataPath}:v${v}`);
    f.pointerMd5 = f.contentId;
    f.present = true;
    f.dirty = false;
    addCache(state, f.contentId);
    return finish(state, ok(`Updated ${path} from upstream → md5 ${shortMd5(f.contentId)}…`));
  }

  if (sub === 'api') {
    return finish(
      state,
      ok(
        [
          'dvc.api (Python) — read data without leaving your project:',
          '  import dvc.api',
          '  with dvc.api.open("data/data.xml") as f: ...',
          '  dvc.api.read("data/data.xml", remote="myremote")',
          '  dvc.api.exp_show()  # table of experiments',
          'Simulator tip: use `cat <path>` to inspect registry-style files here.',
        ].join('\n'),
      ),
    );
  }

  if (sub === 'cml') {
    // Continuous Machine Learning — PR comment bot (scenario).
    const body = args.slice(1).join(' ') || 'metrics update';
    return finish(
      state,
      ok(
        [
          `CML report comment posted (simulated): ${body}`,
          'Typical CI: checkout → dvc pull → dvc repro → cml comment with metrics/plots',
          'See cml.dev for GitHub/GitLab actions templates.',
        ].join('\n'),
      ),
    );
  }

  if (sub === 'plots') {
    const plsub = args[1] ?? 'show';
    const tIdx = args.indexOf('--template');
    const template = tIdx >= 0 ? args[tIdx + 1] : undefined;
    const series = state.plots;
    const render = (label: string) => {
      const names = Object.keys(series);
      if (!names.length) return `No plots data. Run \`dvc repro\` or \`dvc live log plot …\` first.`;
      const lines = [label + (template ? `  template=${template}` : ''), `templates: simple | linear | confusion | scatter`];
      for (const name of names) {
        const pts = series[name] ?? [];
        if (template === 'confusion') {
          lines.push(`${name}: [[8,1],[2,9]]  (confusion matrix cells, simulated)`);
        } else {
          lines.push(`${name}: ${pts.map((p) => Number(p).toFixed(3)).join(' → ')}`);
        }
      }
      lines.push(`Opened plots HTML (simulated): dvc_plots/index.html${template ? ` (${template}.json template)` : ''}`);
      return lines.join('\n');
    };
    if (plsub === 'show') return finish(state, ok(render('plots show')));
    if (plsub === 'diff') return finish(state, ok(render('plots diff (workspace series)')));
    return { state, result: fail('Usage: dvc plots show|diff [--template simple|linear|confusion]') };
  }

  if (sub === 'get' || sub === 'import' || sub === 'import-url') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    const url = args[1];
    const outIdx = args.indexOf('-o');
    const out = outIdx >= 0 ? args[outIdx + 1] : sub === 'import-url' ? 'data/imported.bin' : 'data/registry.xml';
    if (!url && sub !== 'import-url') {
      return { state, result: fail(`Usage: dvc ${sub} <url> [-o <path>]`) };
    }
    const md5 = fakeMd5(`${sub}:${url ?? 'url'}:${out}`);
    state.files[out] = makeFile(out, 'data', {
      contentId: md5,
      tracked: false,
      present: true,
      gitignored: true,
    });
    if (sub === 'import') {
      // import also records .dvc and tracks
      state.files[out] = makeFile(out, 'data', {
        contentId: md5,
        tracked: true,
        pointerMd5: md5,
        present: true,
        gitignored: true,
      });
      state.files[`${out}.dvc`] = makeFile(`${out}.dvc`, 'dvc');
      addCache(state, md5);
    }
    return finish(
      state,
      ok(
        [
          `${sub}: downloaded ${out}`,
          `  content_id=${md5.slice(0, 8)}…`,
          sub === 'get'
            ? '  get = copy without tracking (data registry pattern)'
            : sub === 'import'
              ? '  import = versioned dependency on an external DVC project (creates .dvc)'
              : '  import-url = track external URL as data',
        ].join('\n'),
      ),
    );
  }

  if (sub === 'exp') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    const esub = args[1];
    if (!esub || esub === 'show') {
      if (!state.experiments.length) return { state, result: ok('No experiments yet. Try `dvc exp run`.') };
      const header = ['exp', ...Object.keys(state.params), ...Object.keys(state.metrics)].join('\t');
      const rows = state.experiments.map((e) => {
        const vals = [
          e.name ?? e.id,
          ...Object.values(e.params).map(String),
          ...Object.values(e.metrics).map(String),
        ];
        return vals.join('\t');
      });
      return { state, result: ok([header, ...rows].join('\n')) };
    }
    if (esub === 'diff') {
      const a = state.experiments[state.experiments.length - 2];
      const b = state.experiments[state.experiments.length - 1];
      if (!a || !b) return { state, result: fail('Need at least two experiments for `dvc exp diff`.') };
      const keys = [...new Set([...Object.keys(a.params), ...Object.keys(b.params), ...Object.keys(a.metrics), ...Object.keys(b.metrics)])];
      const lines = [`${a.id} → ${b.id}`];
      for (const k of keys) {
        const va = (a.params[k] ?? a.metrics[k]) as string | number;
        const vb = (b.params[k] ?? b.metrics[k]) as string | number;
        if (va !== vb) lines.push(`  ${k}: ${va} → ${vb}`);
      }
      return { state, result: ok(lines.join('\n')) };
    }
    if (esub === 'run') {
      if (!state.pipeline.length) return { state, result: fail('ERROR: experiments need a pipeline. Add a stage first.') };
      const sets: Record<string, string | number> = {};
      let queued = false;
      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--queue') queued = true;
        if (args[i] === '--run-all') {
          return executeCommand(state, 'dvc queue start');
        }
        if (args[i] === '-S' || args[i] === '--set-param' || args[i] === '-s') {
          const kv = parseKeyValue(args[++i] ?? '');
          if (kv) sets[kv.key] = kv.value;
        }
      }
      if (queued) {
        const id = expId(`q${state.expQueue.length}${JSON.stringify(sets)}`);
        state.expQueue.push({ params: sets, id });
        return finish(
          state,
          ok(
            `Queued experiment ${id}\nparams=${JSON.stringify(sets)}\nRun \`dvc queue start\` or \`dvc exp run --run-all\`.`,
          ),
        );
      }
      // apply param changes
      for (const [k, v] of Object.entries(sets)) state.params[k] = v;
      state.files['params.yaml'] = makeFile('params.yaml', 'params', {
        contentId: fakeMd5(`params:${JSON.stringify(state.params)}`),
      });
      for (const s of state.pipeline) s.upToDate = false;
      const logs: string[] = [];
      for (const s of state.pipeline) {
        logs.push(...reproStage(state, s));
      }
      const id = expId(JSON.stringify(state.params) + state.experiments.length);
      const run = {
        id,
        name: id,
        commitRef: state.gitCommits[state.gitCommits.length - 1]?.hash ?? 'HEAD',
        params: { ...state.params },
        metrics: { ...state.metrics },
      };
      state.experiments.push(run);
      logs.push(`Queued experiment ${id}`);
      logs.push(`Check results with \`dvc exp show\``);
      return finish(state, ok(logs.join('\n')));
    }
    if (esub === 'apply') {
      const id = args[2];
      if (!id) return { state, result: fail('Usage: dvc exp apply <exp-id>') };
      const run = state.experiments.find((e) => e.id === id || e.name === id || e.id.startsWith(id));
      if (!run) return { state, result: fail(`ERROR: experiment '${id}' not found.`) };
      state.params = { ...run.params };
      state.metrics = { ...run.metrics };
      state.lastAppliedExpId = run.id;
      state.files['params.yaml'] = makeFile('params.yaml', 'params', {
        contentId: fakeMd5(`params:${JSON.stringify(state.params)}`),
      });
      for (const s of state.pipeline) s.upToDate = false;
      return { state, result: ok(`Applied experiment ${run.id}\nparams: ${JSON.stringify(state.params)}`) };
    }
    return { state, result: fail('Usage: dvc exp [run|show|apply]') };
  }

  return { state, result: fail(`ERROR: unknown command 'dvc ${sub}'. Type \`help\`.`) };
}
