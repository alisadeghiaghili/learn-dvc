import type { CommandResult, ExperimentRun, GitCommit, PipelineStage, RepoState, WorkspaceFile } from './types';
import { commitHash, expId, fakeMd5, shortMd5 } from './hash';
import { teachAfterCommand } from './teach';
import { findConcept, formatConcepts } from './glossary';
import { tokenize } from './tokenizer';
import { findUnknownFlag } from './flags';
import {
  addCache,
  applyDataEdit,
  cloneState,
  computeDirtyPaths,
  defaultRemote,
  ensureGit,
  gitTree,
  isDirtyFile,
  isDirOut,
  isGitRepo,
  makeFile,
  parseKeyValue,
  pipelineSignature,
  remoteStore,
  removeWorkspaceFile,
  restoreWorkspaceFromPointer,
  setDefaultRemote,
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
  const files = [...new Set(state.gitStaged)];
  const blobs: Record<string, string> = {};
  for (const p of files) {
    const f = state.files[p];
    if (f) blobs[p] = f.contentId;
  }
  const outs: Record<string, string> = {};
  for (const stage of state.pipeline) {
    for (const o of stage.outs) {
      const f = state.files[o];
      if (f?.present && !f.tracked) outs[o] = f.contentId;
    }
  }
  const commit: GitCommit = {
    hash: commitHash(`${message}|${state.gitCommits.length}|${JSON.stringify(pointers)}|${files.join(',')}`),
    message,
    pointers,
    pipelineSig: pipelineSignature(state),
    params: { ...state.params },
    metrics: { ...state.metrics },
    files,
    blobs,
    outs,
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
    if (stage.deps.includes(path)) {
      stage.upToDate = false;
      const stale = (stage.stale ??= { deps: [], params: [] });
      if (!stale.deps.includes(path)) stale.deps.push(path);
    }
  }
}

/** Mark the stages that read param `key` as stale (falls back to every stage with params). */
function markPipelineDirtyIfParamChanged(state: RepoState, key: string): void {
  const reads = (p: string) => p === key || key.startsWith(`${p}.`) || p.startsWith(`${key}.`);
  let hit = state.pipeline.filter((s) => s.params.some(reads));
  if (!hit.length) hit = state.pipeline.filter((s) => s.params.length);
  for (const stage of hit) {
    stage.upToDate = false;
    const stale = (stage.stale ??= { deps: [], params: [] });
    if (!stale.params.includes(key)) stale.params.push(key);
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

interface ParsedStage {
  name?: string;
  deps: string[];
  outs: string[];
  params: string[];
  metrics: string[];
  noCache: string[];
  wdir?: string;
  alwaysChanged: boolean;
  cmd: string;
}

/** Options come first; the first bare token starts the stage command (argparse REMAINDER). */
function parseStageAdd(args: string[]): ParsedStage {
  const out: ParsedStage = { deps: [], outs: [], params: [], metrics: [], noCache: [], alwaysChanged: false, cmd: '' };
  let i = 0;
  for (; i < args.length; i++) {
    const a = args[i]!;
    if (!a.startsWith('-')) break;
    if (a === '-n' || a === '--name') out.name = args[++i];
    else if (a === '-d' || a === '--deps') out.deps.push(args[++i]!);
    else if (a === '-o' || a === '--outs') out.outs.push(args[++i]!);
    else if (a === '-O' || a === '--outs-no-cache') {
      const o = args[++i]!;
      out.outs.push(o);
      out.noCache.push(o);
    } else if (a === '-p' || a === '--params') out.params.push(args[++i]!);
    else if (a === '-m' || a === '--metrics') out.metrics.push(args[++i]!);
    else if (a === '-M' || a === '--metrics-no-cache') {
      const m = args[++i]!;
      out.metrics.push(m);
      out.noCache.push(m);
    } else if (a === '-w' || a === '--wdir') out.wdir = args[++i];
    else if (a === '--always-changed') out.alwaysChanged = true;
    else if (['--plots', '--plots-no-cache', '--desc'].includes(a)) i++;
  }
  out.cmd = args.slice(i).join(' ');
  return out;
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

/**
 * Emulates a training script that already contains the DVCLive calls
 * (`from dvclive import Live` ... `live.log_metric(...)` ... `live.next_step()`).
 * Does nothing unless the level marked the script as instrumented.
 */
function runDvcLive(state: RepoState, cmd: string): string[] {
  if (!state.live.instrumented || !/train/.test(cmd)) return [];
  const lr = Number(state.params.lr ?? state.params['train.lr'] ?? 0.1);
  const n = Number(state.params.n_estimators ?? state.params['train.n_est'] ?? 10);
  const steps = 5;
  const acc: number[] = [];
  const loss: number[] = [];
  for (let i = 1; i <= steps; i++) {
    const a = Math.min(0.99, 0.5 + (n * 0.003 + (lr > 0 && lr < 0.3 ? 0.05 : 0)) * i);
    acc.push(Number(a.toFixed(4)));
    loss.push(Number((1 - a).toFixed(4)));
  }
  state.live.active = true;
  state.live.step = steps;
  state.live.metrics = { ...state.live.metrics, acc, loss };
  state.plots['acc'] = acc;
  state.plots['loss'] = loss;
  state.metrics['acc'] = acc[steps - 1]!;
  state.metrics['loss'] = loss[steps - 1]!;
  if (!state.live.plotData.includes('dvclive/plots/metrics/acc.tsv')) state.live.plotData.push('dvclive/plots/metrics/acc.tsv');
  for (const p of ['dvclive/metrics.json', 'dvclive/plots/metrics/acc.tsv', 'dvclive/plots/metrics/loss.tsv', 'dvclive/params.yaml']) {
    if (!state.files[p]) state.files[p] = makeFile(p, 'metrics');
    state.files[p]!.contentId = fakeMd5(`dvclive:${p}:${JSON.stringify(state.params)}`);
  }
  return [
    `DVCLive: Live(dir='dvclive') writing metrics and plots (${steps} steps via live.next_step())`,
    `  live.log_metric('acc', ${acc[steps - 1]})  live.log_metric('loss', ${loss[steps - 1]})`,
    '  files: dvclive/metrics.json, dvclive/plots/metrics/acc.tsv, dvclive/plots/metrics/loss.tsv',
  ];
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
    stage.stale = undefined;
    stage.locked = true;
    stage.lastRunSig = sig;
    if (!state.runCache.includes(sig)) state.runCache.push(sig);
    return logs;
  }

  logs.push(`Running stage '${stage.name}': ${stage.cmd}`);
  for (const out of stage.outs) {
    const dirOut = isDirOut(out);
    const contentId = fakeMd5(`out:${out}:${stage.cmd}:${JSON.stringify(state.params)}`);
    const existing = state.files[out];
    // DVC git-ignores cached outputs; metrics files (cache: false) stay visible to Git.
    const ignoredByGit = !stage.metrics.includes(out) && !(state.stageMeta[stage.name]?.noCache ?? []).includes(out);
    if (existing) {
      existing.contentId = contentId;
      existing.present = true;
      if (ignoredByGit) existing.gitignored = true;
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
        gitignored: ignoredByGit,
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
  stage.stale = undefined;
  stage.locked = true;
  stage.lastRunSig = sig;
  if (!state.runCache.includes(sig)) state.runCache.push(sig);
  logs.push(...runDvcLive(state, stage.cmd));
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

interface ParsedArgs {
  /** non-option tokens */
  pos: string[];
  /** every option seen (as typed) */
  flags: string[];
  /** value of options that take one, keyed by the spelling that was typed */
  vals: Record<string, string>;
  has: (...names: string[]) => boolean;
  val: (...names: string[]) => string | undefined;
}

/** Tiny argv parser: `valFlags` consume the next token; `-wc` style bundles are expanded. */
function parseArgv(args: string[], valFlags: string[] = []): ParsedArgs {
  const pos: string[] = [];
  const flags: string[] = [];
  const vals: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (!a.startsWith('-') || a === '-' || /^-\d/.test(a)) {
      pos.push(a);
      continue;
    }
    if (valFlags.includes(a)) {
      flags.push(a);
      vals[a] = args[++i] ?? '';
      continue;
    }
    if (/^-[A-Za-z]{2,}$/.test(a) && !valFlags.includes(`-${a[1]}`)) {
      for (const ch of a.slice(1)) flags.push(`-${ch}`);
      continue;
    }
    flags.push(a);
  }
  return {
    pos,
    flags,
    vals,
    has: (...names) => names.some((n) => flags.includes(n)),
    val: (...names) => names.map((n) => vals[n]).find((v) => v !== undefined),
  };
}

const TRANSFER_VAL_FLAGS = ['-r', '--remote', '-j', '--jobs'];

/** Resolve `-r/--remote` (or the default remote). Returns an error text when it cannot. */
function resolveRemote(
  state: RepoState,
  requested: string | undefined,
  verb: string,
): { name: string } | { error: string } {
  if (requested) {
    const r = state.remotes.find((x) => x.name === requested);
    if (!r) {
      return { error: `ERROR: failed to ${verb} - remote '${requested}' does not exist. See \`dvc remote list\`.` };
    }
    return { name: r.name };
  }
  const def = defaultRemote(state);
  if (!def) {
    return {
      error: [
        'ERROR: no remote specified. Setup default remote with',
        '    dvc remote default <remote>',
        'or use:',
        `    dvc ${verb.split(' ')[0]} -r <remote>`,
        'To add a remote: `dvc remote add -d <name> <url>`.',
      ].join('\n'),
    };
  }
  return { name: def.name };
}

/** Tracked files selected by command targets (paths, .dvc files, directories or stage names). */
function targetFiles(state: RepoState, targets: string[]): { files: WorkspaceFile[] } | { error: string } {
  const all = Object.values(state.files).filter((f) => f.tracked && f.pointerMd5);
  if (!targets.length) return { files: all };
  const picked = new Map<string, WorkspaceFile>();
  for (const raw of targets) {
    const t = raw.replace(/\/+$/, '').replace(/\.dvc$/, '');
    const stage = state.pipeline.find((s) => s.name === t);
    const hits = all.filter((f) => f.path === t || f.path.startsWith(`${t}/`) || (stage && stage.outs.includes(f.path)));
    if (!hits.length && !stage) {
      return { error: `ERROR: '${raw}' does not exist as an output of a .dvc file or stage.` };
    }
    for (const f of hits) picked.set(f.path, f);
  }
  return { files: [...picked.values()] };
}

function pipelineStatusLines(state: RepoState): string[] {
  const out: string[] = [];
  for (const s of state.pipeline) {
    if (s.frozen || s.upToDate) continue;
    out.push(`${s.name}:`);
    const st = s.stale;
    if (st && (st.deps.length || st.params.length)) {
      if (st.deps.length) {
        out.push('\tchanged deps:');
        for (const d of st.deps) out.push(`\t\tmodified:           ${d}`);
      }
      if (st.params.length) {
        out.push('\tchanged params:', '\t\tparams.yaml:');
        for (const k of st.params) out.push(`\t\t\tmodified:           ${k}`);
      }
    } else if (!s.locked) {
      out.push('\tchanged outs:');
      for (const o of s.outs) out.push(`\t\tnot in cache:       ${o}`);
    } else {
      out.push('\tchanged deps:', '\t\tmodified:           (an input changed since the last run)');
    }
  }
  return out;
}

function statusLines(state: RepoState): string {
  if (!state.initialized) return 'ERROR: not a DVC repository.';
  const lines: string[] = [...pipelineStatusLines(state)];
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

/** `dvc status --cloud`: compare the local cache with one remote. */
function cloudStatusLines(state: RepoState, remoteName: string, files: WorkspaceFile[]): string {
  const store = remoteStore(state, remoteName);
  const lines: string[] = [];
  for (const f of files) {
    const md5 = f.pointerMd5!;
    const inCache = state.cache.includes(md5);
    const onRemote = store.includes(md5);
    if (inCache && !onRemote) lines.push(`\tnew:            ${f.path}`);
    else if (!inCache && onRemote) lines.push(`\tdeleted:        ${f.path}`);
    else if (!inCache && !onRemote) lines.push(`\tmissing:        ${f.path}`);
  }
  if (!lines.length) return `Cache and remote '${remoteName}' are in sync.`;
  return [
    `Comparing the local cache with remote '${remoteName}':`,
    ...lines,
    '(new = only in cache, push it; deleted = only on the remote, pull it; missing = nowhere)',
  ].join('\n');
}

type Finish = (st: RepoState, res: CommandResult) => { state: RepoState; result: CommandResult };

function sampleBytes(path: string): string {
  if (path.endsWith('.xml')) return '<xml><sample id="1" feature="0.82"/><sample id="2" feature="0.91"/></xml>';
  if (path.endsWith('.csv')) return 'id,feature,label\n1,0.82,0\n2,0.91,1';
  return `<${path}: 1,024 bytes>`;
}

function storageUrl(state: RepoState, md5: string): string {
  const remote = defaultRemote(state);
  const base = (remote?.url ?? 's3://ml-team/dvcstore').replace(/\/+$/, '');
  return `${base}/files/md5/${md5.slice(0, 2)}/${md5.slice(2)}`;
}

/** `python -c "..."` snippets that call dvc.api, and `python <script>` runs. */
function runPython(state: RepoState, args: string[], finish: Finish): { state: RepoState; result: CommandResult } {
  if (args[0] === '-c') {
    const code = args.slice(1).join(' ');
    const m = /dvc\.api\.(read|open|get_url|params_show)\(\s*(?:(['"])([^'"]*)\2)?/.exec(code);
    if (!m) {
      if (/dvc\.api|dvc\b/.test(code)) {
        return { state, result: fail('AttributeError: module \'dvc.api\' has no such function. Real ones: read, open, get_url, params_show, metrics_show, exp_show.') };
      }
      return finish(state, ok('(python -c ran; nothing printed)'));
    }
    const fn = m[1]!;
    const path = m[3];
    const printed = /print\s*\(/.test(code);
    if (fn === 'params_show') {
      const body = JSON.stringify(state.params, null, 2);
      return finish(state, ok(printed ? body : '# dvc.api.params_show() returned the params dict (wrap it in print() to see it)'));
    }
    const f = path ? state.files[path] : undefined;
    const readable =
      !!f &&
      (f.present ||
        (f.tracked && !!f.pointerMd5 && (state.cache.includes(f.pointerMd5) || state.remoteObjects.includes(f.pointerMd5))));
    if (!path || !f || !readable) {
      return {
        state,
        result: fail(
          `dvc.exceptions.PathMissingError: The path '${path ?? ''}' does not exist in the target repository neither as a DVC output nor as a Git-tracked file.`,
        ),
      };
    }
    if (fn === 'get_url') {
      if (!f.tracked || !f.pointerMd5) {
        return { state, result: fail(`dvc.exceptions.OutputNotFoundError: Unable to find DVC file with output '${path}'`) };
      }
      const url = storageUrl(state, f.pointerMd5);
      return finish(state, ok(printed ? url : `# dvc.api.get_url('${path}') returned ${url}`));
    }
    const body = sampleBytes(path);
    if (printed) return finish(state, ok(body));
    return finish(
      state,
      ok(`# dvc.api.${fn}('${path}') streamed ${f.isDir ? 'a directory' : '1,024 bytes'} from the cache/remote; the workspace was not touched.`),
    );
  }

  const script = args[0];
  if (!script) return { state, result: fail('Python 3.11 (simulated): use `python -c "..."` or `python src/train.py`.') };
  const f = state.files[script];
  if (!f || !f.present) {
    return { state, result: fail(`python: can't open file '${script}': [Errno 2] No such file or directory`) };
  }
  if (/train/.test(script)) {
    const lines = [`Training with params ${JSON.stringify(state.params)}`];
    const live = runDvcLive(state, 'train');
    if (live.length) lines.push(...live);
    else lines.push('Training finished. This src/train.py has no DVCLive calls, so nothing was logged to dvclive/.');
    return finish(state, ok(lines.join('\n')));
  }
  return finish(state, ok(`Ran ${script}`));
}

/** dvc.lock is the execution receipt: refreshed by repro, exp run and exp apply. */
function writeLock(state: RepoState): void {
  state.files['dvc.lock'] = makeFile('dvc.lock', 'yaml', {
    contentId: fakeMd5(`lock:${pipelineSignature(state)}:${JSON.stringify(state.params)}:${JSON.stringify(state.metrics)}`),
  });
}

/** Store the current params, metrics and pipeline outputs as a new experiment. */
function recordExperiment(state: RepoState, name?: string): ExperimentRun {
  const id = expId(JSON.stringify(state.params) + state.experiments.length);
  const outputs: Record<string, string> = {};
  const stageSigs: Record<string, string> = {};
  for (const s of state.pipeline) {
    stageSigs[s.name] = stageRunSig(s, state);
    for (const o of s.outs) {
      const f = state.files[o];
      if (f) outputs[o] = f.contentId;
    }
  }
  const run: ExperimentRun = {
    id,
    name: name ?? id,
    commitRef: state.gitCommits[state.gitCommits.length - 1]?.hash ?? 'HEAD',
    params: { ...state.params },
    metrics: { ...state.metrics },
    outputs,
    stageSigs,
  };
  state.experiments.push(run);
  return run;
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
  if (raw.includes(';') && !raw.startsWith('echo') && !raw.startsWith('python')) {
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

  // `<command> > file`: run the command, write its stdout into the workspace file
  const redirect = /^(.*\S)\s+>\s*(\S+)\s*$/.exec(raw);
  if (redirect && !/^echo\b/.test(raw)) {
    const inner = executeCommandInner(prev, redirect[1]!);
    if (!inner.result.ok) return inner;
    const target = redirect[2]!;
    const text = inner.result.output.split('\n\n── Why:')[0]!;
    inner.state.files[target] = makeFile(target, 'code', {
      contentId: fakeMd5(`redirect:${target}:${text}`),
      text,
    });
    return { state: inner.state, result: ok('') };
  }

  const tokens = tokenize(raw);
  const cmd = tokens[0];
  const args = tokens.slice(1);

  if (cmd === 'help' || cmd === '?') {
    return {
      state,
      result: ok(
        [
          'DVC commands: init, add, status, commit, checkout, remote, push, pull, fetch,',
          '  config (--local), stage add (--wdir/--always-changed), repro, dag, freeze, unfreeze,',
          '  metrics, params, plots --template, exp (run --queue|diff|apply|push|pull|branch), queue, get, import,',
          '  update (imports only), remove, gc (-w|-A|-c), diff, version',
          'Git (simulated): init, add, commit [--amend], log, status, checkout, remote',
          'Separate tools: cml (comment create, runner launch); Python: python src/train.py, python -c "import dvc.api; ..."',
          'Workspace simulators: edit <path>, rm <path>, cat <path> (dvc.yaml|dvc.lock|params.yaml), ls, dvc metrics show --md > report.md',
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
    if (path === 'src/train.py' && state.live.instrumented) {
      return {
        state,
        result: ok(
          [
            'import yaml',
            'from dvclive import Live',
            '',
            'params = yaml.safe_load(open("params.yaml"))',
            '',
            'with Live() as live:',
            '    live.log_param("lr", params["lr"])',
            '    for epoch in range(5):',
            '        acc, loss = train_one_epoch(params)',
            '        live.log_metric("acc", acc)',
            '        live.log_metric("loss", loss)',
            '        live.next_step()',
          ].join('\n'),
        ),
      };
    }
    if (path === 'dvc.yaml' && state.dvcYaml) return { state, result: ok(state.dvcYaml) };
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
    if (f.text !== undefined) return { state, result: ok(f.text) };
    if (path.endsWith('.dvc')) {
      const dataPath = path.replace(/\.dvc$/, '');
      const data = state.files[dataPath];
      const md5 = data?.pointerMd5 ?? f.contentId;
      return {
        state,
        result: ok(
          [
            'outs:',
            `- path: ${dataPath}`,
            '  md5: ' + md5,
            '  size: ' + String(1024 + (md5.charCodeAt(0) * 32)).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
          ].join('\n'),
        ),
      };
    }
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
          markPipelineDirtyIfParamChanged(state, kv.key);
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
      const already = isGitRepo(state);
      ensureGit(state);
      return {
        state,
        result: ok(already ? 'Reinitialized existing Git repository.' : 'Initialized empty Git repository.'),
      };
    }
    if (sub === 'status') {
      const tree = gitTree(state);
      const staged = state.gitStaged;
      const present = Object.values(state.files).filter((f) => f.present && !f.gitignored);
      const untracked = present
        .filter((f) => !(f.path in tree) && !staged.includes(f.path))
        .map((f) => f.path);
      const modified = present
        .filter((f) => f.path in tree && tree[f.path] !== null && tree[f.path] !== f.contentId && !staged.includes(f.path))
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
              ? `Changes to be committed:\n${[...new Set(staged)].map((s) => `\t${s}`).join('\n')}`
              : 'No changes added to commit.',
            modified.length ? `Changes not staged for commit:\n${modified.map((s) => `\tmodified: ${s}`).join('\n')}` : null,
            ptrModified.length ? `modified: ${ptrModified.join(', ')}` : null,
            untracked.length
              ? `Untracked files:\n${untracked.map((s) => `\t${s}`).join('\n')}\n\nNext: git add <file> && git commit -m "..."`
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
    if (sub === 'remote') {
      const rsub = args[1];
      if (!rsub || rsub === '-v') {
        const names = state.gitRemotes ?? [];
        if (!names.length) return { state, result: ok('') };
        const lines =
          rsub === '-v'
            ? names.flatMap((n) => [`${n}\thttps://github.com/acme/ml-project.git (fetch)`, `${n}\thttps://github.com/acme/ml-project.git (push)`])
            : names;
        return { state, result: ok(lines.join('\n')) };
      }
      if (rsub === 'add') {
        const [name, url] = args.slice(2);
        if (!name || !url) return { state, result: fail('usage: git remote add <name> <url>') };
        if ((state.gitRemotes ?? []).includes(name)) return { state, result: fail(`error: remote ${name} already exists.`) };
        state.gitRemotes = [...(state.gitRemotes ?? []), name];
        return { state, result: ok(`Added Git remote '${name}' → ${url}\n(A Git remote is not a DVC remote: it holds refs and code, DVC data goes to \`dvc remote\`.)`) };
      }
      if (rsub === 'remove' || rsub === 'rm') {
        const name = args[2];
        if (!name || !(state.gitRemotes ?? []).includes(name)) return { state, result: fail(`error: No such remote: '${name ?? ''}'`) };
        state.gitRemotes = (state.gitRemotes ?? []).filter((n) => n !== name);
        return { state, result: ok('') };
      }
      return { state, result: fail('usage: git remote [-v] | add <name> <url> | remove <name>') };
    }
    if (sub === 'add') {
      const rest = args.slice(1);
      const flagArgs = rest.filter((a) => a.startsWith('-') && a !== '.');
      const paths = rest.filter((a) => !a.startsWith('-'));
      const addAll = flagArgs.includes('-A') || flagArgs.includes('--all');
      if (!paths.length && !addAll) return { state, result: fail('Nothing specified, nothing added.') };
      const tree = gitTree(state);
      const isChanged = (f: WorkspaceFile) =>
        f.present && !f.gitignored && (!(f.path in tree) || (tree[f.path] !== null && tree[f.path] !== f.contentId));
      const added: string[] = [];
      const ignored: string[] = [];
      const warnings: string[] = [];
      const stage = (p: string) => {
        if (!state.gitStaged.includes(p)) state.gitStaged.push(p);
        if (!added.includes(p)) added.push(p);
      };
      const targets = addAll && !paths.length ? ['.'] : paths;
      for (const p of targets) {
        if (p === '.' || p === './') {
          for (const f of Object.values(state.files)) if (isChanged(f)) stage(f.path);
          continue;
        }
        if (p === '.dvc' || p === '.dvc/') {
          if (!state.initialized) return { state, result: fail(`fatal: pathspec '${p}' did not match any files`) };
          for (const meta of ['.dvc/config', '.dvc/.gitignore']) {
            if (!state.files[meta]) state.files[meta] = makeFile(meta, 'meta');
            const committed = state.gitCommits.some((c) => c.files?.includes(meta));
            if (!committed) stage(meta);
          }
          continue;
        }
        const f = state.files[p];
        if (f && f.present) {
          if (f.gitignored) {
            ignored.push(p);
            continue;
          }
          stage(p);
          if (f.kind === 'data' && !f.tracked && !state.generated.includes(p)) {
            warnings.push(
              `WARNING: ${p} looks like a data file. Git would store every version of it forever.\n` +
                `  Prefer \`dvc add ${p}\`: Git then tracks only the small ${p}.dvc pointer.`,
            );
          }
          continue;
        }
        const dir = p.replace(/\/+$/, '');
        const under = Object.values(state.files).filter((x) => x.present && x.path.startsWith(`${dir}/`));
        if (under.length) {
          const hits = under.filter(isChanged);
          for (const x of hits) stage(x.path);
          if (!hits.length && under.every((x) => x.gitignored)) ignored.push(p);
          continue;
        }
        if (p.endsWith('.dvc') && state.files[p.slice(0, -4)]?.tracked) {
          stage(p);
          continue;
        }
        if (p === 'params.yaml' || p === 'dvc.yaml' || p === 'dvc.lock' || p === 'src/train.py') {
          stage(p);
          continue;
        }
        return { state, result: fail(`fatal: pathspec '${p}' did not match any files`) };
      }
      if (ignored.length) {
        return {
          state,
          result: fail(
            [
              'The following paths are ignored by one of your .gitignore files:',
              ...ignored,
              'hint: Use -f if you really want to add them.',
              'hint: DVC git-ignores tracked data on purpose: commit the .dvc pointer instead.',
            ].join('\n'),
          ),
        };
      }
      const lines = [added.length ? `Staged:\n  ${added.join('\n  ')}` : 'Nothing staged.', ...warnings];
      return { state, result: ok(lines.join('\n')) };
    }
    if (sub === 'commit') {
      const amend = args.includes('--amend');
      const msgIdx = args.indexOf('-m');
      const hasMsg = msgIdx !== -1 && Boolean(args[msgIdx + 1]);
      if (!hasMsg && !amend) return { state, result: fail('error: switch `m` requires a value') };
      if (amend) {
        const last = state.gitCommits[state.gitCommits.length - 1];
        if (!last || last.hash === '0000000') return { state, result: fail('fatal: You have nothing to amend.') };
        state.gitCommits.pop();
        state.gitStaged = [...new Set([...(last.files ?? []), ...state.gitStaged])];
        const message = hasMsg ? args.slice(msgIdx + 1).join(' ').replace(/^["']|["']$/g, '') : last.message;
        const c = snapshotGit(state, message);
        return finish(state, ok(`[${c.hash}] ${message} (amended)`));
      }
      const message = args.slice(msgIdx + 1).join(' ').replace(/^["']|["']$/g, '');
      if (!state.gitStaged.length) {
        return {
          state,
          result: fail(
            [
              'On branch main',
              'nothing to commit — the index is empty (no changes added to commit).',
              'Stage the files first with `git add <paths>`. Typo in the last commit message? `git commit --amend -m "..."` rewrites it.',
            ].join('\n'),
          ),
        };
      }
      const c = snapshotGit(state, message);
      return finish(state, ok(`[${c.hash}] ${message}`));
    }
    if (sub === 'checkout') {
      // forms:
      // git checkout HEAD~1
      // git checkout HEAD~1 data/data.xml.dvc
      // git checkout <hash> -- <path>
      // git checkout --ours / --theirs <path>
      if (args[1] === '--ours' || args[1] === '--theirs') {
        const target = args[2] || 'dvc.lock';
        return { state, result: ok(`Updated 1 path from the ${args[1].slice(2)} tree for ${target}`) };
      }
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
    if (sub === 'merge') {
      const branch = args[1] || 'origin/main';
      return {
        state,
        result: fail(
          [
            `Auto-merging dvc.lock with ${branch}`,
            `CONFLICT (content): Merge conflict in dvc.lock`,
            `Automatic merge failed; fix conflicts and then commit the result.`,
            `Hint: Never hand-edit dvc.lock hashes. Run \`dvc repro\` to recompute the verified execution receipt.`,
          ].join('\n'),
        ),
      };
    }
    return { state, result: fail(`git: '${sub}' is not supported in this simulator.`) };
  }

  // ── cml (Continuous Machine Learning) — a separate CLI, not a DVC subcommand ──
  if (cmd === 'cml') {
    const [group, action] = args;
    if (group === 'runner') {
      const isSingleShot = args.includes('--single-shot');
      const cloudArg = args.find((a) => a.startsWith('--cloud=') || a.startsWith('--cloud'));
      const cloudType = args.find((a) => a.startsWith('--cloud-type=') || a.startsWith('--cloud-type'));
      return finish(
        state,
        ok(
          [
            'CML Cloud Runner Provisioning:',
            `  Provider:   ${cloudArg ? cloudArg.replace(/^--cloud=?/, '') : 'AWS EC2'}`,
            `  Instance:   ${cloudType ? cloudType.replace(/^--cloud-type=?/, '') : 'g4dn.xlarge (1x NVIDIA T4 GPU)'}`,
            `  Lifecycle:  ${isSingleShot ? 'Single-shot (auto-terminates upon job completion — 0$ idle cost)' : 'Persistent'}`,
            '  Status:     Provisioned -> Connected to GitHub Actions -> Running job -> Cleaned up',
          ].join('\n'),
        ),
      );
    }
    if (group === 'comment' && action === 'create') {
      const file = args.slice(2).find((a) => !a.startsWith('-'));
      if (!file) {
        return { state, result: fail('Error: Not enough non-option arguments: got 0, need at least 1 (cml comment create <markdown-file>)') };
      }
      const f = state.files[file];
      if (!f || !f.present) {
        return {
          state,
          result: fail(
            `Error: ENOENT: no such file or directory, open '${file}'\nBuild the report first, e.g. \`dvc metrics show --md > ${file}\`.`,
          ),
        };
      }
      return finish(
        state,
        ok(
          [
            `CML: posting ${file} as a comment on the current pull request (simulated; CI provides REPO_TOKEN).`,
            'https://github.com/acme/ml-project/pull/12#issuecomment-1234567',
          ].join('\n'),
        ),
      );
    }
    return {
      state,
      result: fail(
        'cml: unknown command. The CML CLI offers e.g. `cml comment create <report.md>`, `cml runner launch ...`, `cml pr create`, `cml check create`.',
      ),
    };
  }

  // ── python: dvc.api one-liners and the training script ──────
  if (cmd === 'python' || cmd === 'python3') {
    return runPython(state, args, finish);
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

  // Names that look like DVC subcommands but are not: point learners at the real tool.
  if (sub === 'live') {
    return {
      state,
      result: fail(
        [
          "ERROR: unknown command 'dvc live'. DVCLive is a Python library, not a DVC subcommand.",
          'Instrument the training script with `from dvclive import Live` (live.log_metric(...), live.next_step()),',
          'run it with `dvc exp run` or `python src/train.py`, then inspect with `dvc exp show` / `dvc plots show`.',
        ].join('\n'),
      ),
    };
  }
  if (sub === 'api') {
    return {
      state,
      result: fail(
        [
          "ERROR: unknown command 'dvc api'. `dvc.api` is the Python API, not a CLI command.",
          'Use it from Python: dvc.api.read(), dvc.api.open(), dvc.api.get_url(), dvc.api.params_show().',
          "Example: python -c \"import dvc.api; print(dvc.api.read('data/data.xml'))\"",
        ].join('\n'),
      ),
    };
  }
  if (sub === 'cml') {
    return {
      state,
      result: fail(
        [
          "ERROR: unknown command 'dvc cml'. CML is a separate CLI, not a DVC subcommand.",
          'Install it next to DVC in CI and call it directly: `cml comment create report.md`.',
        ].join('\n'),
      ),
    };
  }
  if (sub === 'stage' && (args.includes('--foreach') || args.includes('--matrix'))) {
    const flag = args.includes('--foreach') ? '--foreach' : '--matrix';
    return {
      state,
      result: fail(
        [
          `ERROR: unrecognized arguments: ${flag}`,
          '`foreach` and `matrix` exist only inside dvc.yaml; `dvc stage add` has no such option.',
          'Write the stage template in dvc.yaml (see https://dvc.org/doc/user-guide/project-structure/dvcyaml-files#foreach-stages).',
        ].join('\n'),
      ),
    };
  }
  const unknownFlag = findUnknownFlag(sub, args.slice(1));
  if (unknownFlag) {
    return { state, result: fail(`ERROR: unrecognized arguments: ${unknownFlag}\nTry \`dvc ${sub} --help\` for the options this command accepts.`) };
  }

  if (sub === 'init') {
    if (state.initialized) return { state, result: fail('ERROR: DVC already initialized (existing .dvc directory).') };
    const noScm = args.includes('--no-scm');
    if (!noScm && !isGitRepo(state)) {
      return {
        state,
        result: fail(
          [
            'ERROR: failed to initiate DVC - this directory is not inside of a Git repository.',
            'Run `git init` first, or use `dvc init --no-scm` if you do not want to use any SCM.',
          ].join('\n'),
        ),
      };
    }
    state.initialized = true;
    const created = ['.dvc/config', '.dvc/.gitignore', '.dvcignore'];
    for (const p of created) {
      if (!state.files[p]) state.files[p] = makeFile(p, 'meta');
    }
    if (!noScm) {
      for (const p of created) if (!state.gitStaged.includes(p)) state.gitStaged.push(p);
    }
    return finish(
      state,
      ok(
        [
          'Initialized DVC repository.',
          '',
          'Created:',
          '  .dvc/config',
          '  .dvc/.gitignore',
          '  .dvcignore',
          '',
          noScm
            ? 'No SCM: nothing was staged. Without Git you lose the history that ties code to data versions.'
            : 'DVC staged these files with Git (`git status` shows them). Commit them: git commit -m "Initialize DVC"',
        ].join('\n'),
      ),
    );
  }


  if (sub === 'config') {
    const isLocal = args.includes('--local');
    const clean = args.slice(1).filter((a) => !a.startsWith('-'));
    if (!clean.length) {
      const lines = ['core.analytics = false'];
      for (const r of state.remotes) {
        lines.push(`remote.${r.name}.url = ${r.url}`);
      }
      if (state.files['.dvc/config.local']) {
        lines.push('[local] remote.myremote.secret_access_key = ***');
      }
      return { state, result: ok(lines.join('\n')) };
    }
    const key = clean[0];
    const val = clean[1] ?? 'true';
    const secretKeys = ['secret', 'key', 'password', 'token', 'credential'];
    const isSecret = secretKeys.some((s) => key.toLowerCase().includes(s));
    if (isLocal) {
      if (!state.files['.dvc/config.local']) {
        state.files['.dvc/config.local'] = makeFile('.dvc/config.local', 'meta', { gitignored: true });
      }
      return finish(
        state,
        ok(
          `Set ${key}=${isSecret ? '***' : val} in .dvc/config.local (gitignored).\nSafe: sensitive credentials will never be committed to Git.`,
        ),
      );
    }
    if (isSecret) {
      return finish(
        state,
        ok(
          `WARNING: '${key}' contains sensitive credentials!\nStoring in shared .dvc/config will leak secrets to Git.\nRecommended: use \`dvc config --local ${key} ...\` to store in .dvc/config.local.`,
        ),
      );
    }
    return finish(state, ok(`Set ${key}=${val} in .dvc/config (shared via Git).`));
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
    const p = parseArgv(args.slice(1), TRANSFER_VAL_FLAGS);
    if (p.has('-c', '--cloud')) {
      const err = requireInit(state);
      if (err) return { state, result: err };
      const rr = resolveRemote(state, p.val('-r', '--remote'), 'status');
      if ('error' in rr) return { state, result: fail(rr.error) };
      const tf = targetFiles(state, p.pos);
      if ('error' in tf) return { state, result: fail(tf.error) };
      return finish(state, ok(cloudStatusLines(state, rr.name, tf.files)));
    }
    return finish(state, ok(statusLines(state)));
  }

  if (sub === 'add') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    const p = parseArgv(args.slice(1), ['--file', '-o', '--out', '-r', '--remote', '-j', '--remote-jobs', '--desc', '--type', '--label', '--meta']);
    const noCommit = p.has('--no-commit');
    const rawPath = p.pos[0];
    if (!rawPath) return { state, result: fail('Usage: dvc add [--no-commit] <path>') };
    const path = rawPath.replace(/\/+$/, '');
    let f = state.files[path];
    const isDir = Boolean(f?.isDir || Object.keys(state.files).some((x) => x.startsWith(`${path}/`)));
    if (!f && isDir) {
      f = makeFile(path, 'data', { isDir: true });
      state.files[path] = f;
    }
    if (!f || !f.present) return { state, result: fail(`ERROR: bad path '${path}' — nothing in the workspace.`) };
    if (f.kind === 'code' || f.kind === 'params' || f.kind === 'yaml') {
      return { state, result: fail(`ERROR: refusing to track '${path}'. DVC tracks data artifacts, not code.`) };
    }
    const md5 = isDir ? `${f.contentId.replace(/\.dir$/, '')}.dir` : f.contentId;
    if (isDir) {
      f.isDir = true;
      f.contentId = md5;
    }
    f.tracked = true;
    f.pointerMd5 = md5;
    f.gitignored = true;
    f.dirty = false;
    if (!noCommit) addCache(state, md5);
    state.files[`${path}.dvc`] = makeFile(`${path}.dvc`, 'dvc', {
      contentId: fakeMd5(`dvcfile:${path}:${md5}`),
      present: true,
    });
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
    const gitignorePath = dir ? `${dir}/.gitignore` : '.gitignore';
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
        `Pointer file written: ${path}.dvc`,
        `  md5: ${md5}${isDir ? ' (directory manifest)' : ''}`,
        `  size: ${(f.contentId.length * (isDir ? 2048 : 1024)).toLocaleString()} bytes (simulated)`,
        `Cache object: .dvc/cache/files/md5/${md5.slice(0, 2)}/${md5.slice(2)}`,
        noCommit
          ? '--no-commit: pointer updated but cache object NOT committed yet. Run `dvc commit`.'
          : `${path} is now gitignored — Git will track the pointer, not the bytes.`,
        '',
        'To track the changes with git, run:',
        '',
        `\tgit add ${path}.dvc ${gitignorePath}`,
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
      const first = state.remotes.length === 0;
      state.remotes.push({ name, url, isDefault: false });
      if (isDefault || first) setDefaultRemote(state, name);
      return finish(state, ok(`Added remote '${name}' → ${url}${isDefault || first ? ' (default)' : ''}`));
    }
    if (rsub === 'default') {
      const name = args[2];
      const remote = state.remotes.find((r) => r.name === name);
      if (!remote) return { state, result: fail(`ERROR: remote '${name}' doesn't exist.`) };
      setDefaultRemote(state, name);
      return { state, result: ok(`Default remote: ${name}`) };
    }
    if (rsub === 'remove') {
      const name = args[2];
      const target = state.remotes.find((r) => r.name === name);
      if (!target) return { state, result: fail(`ERROR: remote '${name}' doesn't exist.`) };
      const wasDefault = defaultRemote(state)?.name === name;
      state.remotes = state.remotes.filter((r) => r.name !== name);
      if (state.remoteStores) delete state.remoteStores[name];
      if (wasDefault && state.remotes.length) {
        const next = state.remotes[0]!;
        next.isDefault = true;
        state.remoteObjects = state.remoteStores?.[next.name] ?? [];
        if (state.remoteStores) delete state.remoteStores[next.name];
      }
      return { state, result: ok(`Removed remote '${name}'`) };
    }
    if (rsub === 'modify') {
      const rest = args.slice(2);
      const isLocal = rest.includes('--local');
      const cleanArgs = rest.filter((a) => a !== '--local');
      const name = cleanArgs[0];
      const key = cleanArgs[1];
      const value = cleanArgs[2];
      const remote = state.remotes.find((r) => r.name === name);
      if (!remote) return { state, result: fail(`ERROR: remote '${name}' doesn't exist.`) };
      if (!key) return { state, result: fail('Usage: dvc remote modify [--local] <name> <key> <value>') };
      const secretKeys = ['secret_access_key', 'token', 'password', 'private_key_password'];
      const hidden = secretKeys.includes(key) ? '***' : (value ?? '');

      if (isLocal) {
        if (!state.files['.dvc/config.local']) {
          state.files['.dvc/config.local'] = makeFile('.dvc/config.local', 'meta', { gitignored: true });
        }
      }

      return finish(state, ok([
        `Updated remote '${name}' ${key}=${hidden}`,
        isLocal
          ? 'Option stored locally in .dvc/config.local (gitignored). Credentials will never leak into Git commits.'
          : secretKeys.includes(key)
            ? 'WARNING: Secret credentials in shared .dvc/config leak to Git. Use `--local` to store in .dvc/config.local.'
            : 'Non-secret option stored in .dvc/config and shared via Git.',
      ].join('\n')));
    }
    return { state, result: fail('Usage: dvc remote [add|list|default|remove|modify]') };
  }

  if (sub === 'push') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    const p = parseArgv(args.slice(1), TRANSFER_VAL_FLAGS);
    const rr = resolveRemote(state, p.val('-r', '--remote'), 'push data to the cloud');
    if ('error' in rr) return { state, result: fail(rr.error) };
    const tf = targetFiles(state, p.pos);
    if ('error' in tf) return { state, result: fail(tf.error) };
    const store = remoteStore(state, rr.name);
    const tracked = tf.files;
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
      if (state.cache.includes(md5) && !store.includes(md5)) {
        store.push(md5);
        pushed++;
        lines.push(`pushed ${f.path} (${shortMd5(md5)}…) → ${rr.name}`);
      } else if (store.includes(md5)) {
        lines.push(`${f.path} already on remote '${rr.name}'`);
      }
    }
    if (!pushed && !lines.length) return finish(state, ok('Everything is up to date.'));
    return finish(state, ok(lines.join('\n') || `Pushed ${pushed} object(s) to ${rr.name}`));
  }

  if (sub === 'fetch' || sub === 'pull') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    const p = parseArgv(args.slice(1), TRANSFER_VAL_FLAGS);
    const rr = resolveRemote(state, p.val('-r', '--remote'), `${sub} data from the cloud`);
    if ('error' in rr) return { state, result: fail(rr.error) };
    const tf = targetFiles(state, p.pos);
    if ('error' in tf) return { state, result: fail(tf.error) };
    const store = remoteStore(state, rr.name);
    const lines: string[] = [];
    for (const f of tf.files) {
      const md5 = f.pointerMd5!;
      if (!state.cache.includes(md5) && store.includes(md5)) {
        addCache(state, md5);
        lines.push(`${sub === 'pull' ? 'pulled' : 'fetched'} ${f.path} (${shortMd5(md5)}…) ← ${rr.name}`);
      } else if (state.cache.includes(md5)) {
        lines.push(`${f.path} already in cache`);
      } else {
        lines.push(`WARNING: ${f.path} (md5 ${shortMd5(md5)}…) not on remote '${rr.name}'`);
      }
      if (sub === 'pull' && state.cache.includes(md5)) restoreWorkspaceFromPointer(state, f.path, store);
    }
    return finish(state, ok(lines.join('\n') || 'Everything is up to date.'));
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
    const p = parseArgv(args.slice(1), ['-r', '--remote', '-j', '--jobs', '-p', '--projects', '--rev', '-n', '--num']);
    const workspace = p.has('-w', '--workspace');
    const allBranches = p.has('-a', '--all-branches');
    const allTags = p.has('-T', '--all-tags');
    const allCommits = p.has('-A', '--all-commits');
    const allExps = p.has('--all-experiments');
    if (!workspace && !allBranches && !allTags && !allCommits && !allExps) {
      return {
        state,
        result: fail(
          [
            'ERROR: Either of `-w|--workspace`, `-a|--all-branches`, `-T|--all-tags`, `-A|--all-commits`, `--all-experiments`',
            'needs to be set. Nothing was removed.',
            'Pick the scope of objects to KEEP: -w keeps only what the workspace uses, -A keeps every commit.',
          ].join('\n'),
        ),
      };
    }
    const keep = new Set<string>();
    if (workspace) {
      for (const f of Object.values(state.files)) {
        if (f.tracked && f.pointerMd5) keep.add(f.pointerMd5);
      }
      for (const stage of state.pipeline) {
        for (const o of stage.outs) {
          const f = state.files[o];
          if (f?.present && !f.tracked) keep.add(f.contentId);
        }
      }
    }
    const keepCommit = (c: GitCommit | undefined) => {
      if (!c) return;
      for (const md5 of Object.values(c.pointers)) keep.add(md5);
      for (const md5 of Object.values(c.outs ?? {})) keep.add(md5);
    };
    if (allCommits) for (const c of state.gitCommits) keepCommit(c);
    // The simulator has one branch (main): its tip is HEAD. There are no tags.
    if (allBranches) keepCommit(state.gitCommits[state.gitCommits.length - 1]);
    if (allExps) {
      for (const e of state.experiments) for (const md5 of Object.values(e.outputs ?? {})) keep.add(md5);
      for (const f of Object.values(state.files)) if (f.tracked && f.pointerMd5) keep.add(f.pointerMd5);
    }
    void allTags;
    const removed = state.cache.filter((m) => !keep.has(m));
    state.cache = state.cache.filter((m) => keep.has(m));
    const lines = [
      removed.length
        ? `Removed ${removed.length} unused cache object(s) (kept: ${[workspace && 'workspace', allBranches && 'branch tips', allTags && 'tags', allCommits && 'all commits', allExps && 'experiments'].filter(Boolean).join(', ')}).`
        : 'Nothing to collect in the local cache.',
    ];
    if (p.has('-c', '--cloud')) {
      const rr = resolveRemote(state, p.val('-r', '--remote'), 'garbage collect the remote');
      if ('error' in rr) return { state, result: fail(rr.error) };
      const store = remoteStore(state, rr.name);
      const gone = store.filter((m) => !keep.has(m));
      store.splice(0, store.length, ...store.filter((m) => keep.has(m)));
      lines.push(
        gone.length
          ? `Removed ${gone.length} object(s) from remote '${rr.name}' as well (--cloud).`
          : `Nothing to collect on remote '${rr.name}'.`,
      );
    } else if (removed.length) {
      lines.push('The remote storage was not touched: use --cloud (-c) to clean it too.');
    }
    return finish(state, ok(lines.join('\n')));
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
      const { alwaysChanged, noCache, wdir } = parsed;
      const external: string[] = [];
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
      };
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
    writeLock(state);
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
        const run = recordExperiment(state);
        logs.push(`  finished ${run.id}`);
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
    const up = parseArgv(args.slice(1), ['--rev', '-j', '--jobs', '-r', '--remote']);
    const path = up.pos[0];
    if (!path) return { state, result: fail('Usage: dvc update [--rev <rev>] <path.dvc>') };
    const dataPath = path.endsWith('.dvc') ? path.slice(0, -4) : path;
    const f = state.files[dataPath];
    if (!f || !f.tracked) return { state, result: fail(`ERROR: '${path}' does not exist or is not a DVC-tracked output.`) };
    if (!f.importedFrom) {
      return {
        state,
        result: fail(
          [
            `ERROR: failed to update '${path}' - the .dvc file is not an import.`,
            '`dvc update` only works on .dvc files created by `dvc import` or `dvc import-url`.',
            'To record a new version of data you track yourself, run `dvc add` again.',
          ].join('\n'),
        ),
      };
    }
    const newRev = up.val('--rev');
    const oldRev = f.importedFrom.rev;
    if (newRev) f.importedFrom = { ...f.importedFrom, rev: newRev };
    const v = (state.dataVersions[dataPath] ?? 0) + 1;
    state.dataVersions[dataPath] = v;
    f.contentId = fakeMd5(`import:${dataPath}:v${v}`);
    f.pointerMd5 = f.contentId;
    f.present = true;
    f.dirty = false;
    addCache(state, f.contentId);
    return finish(
      state,
      ok(
        `Updated ${path} from ${f.importedFrom.url}${newRev ? ` (rev ${oldRev ?? 'HEAD'} → ${newRev})` : ''} → md5 ${shortMd5(f.contentId)}…`,
      ),
    );
  }

  if (sub === 'plots') {
    const plsub = args[1] ?? 'show';
    const tIdx = args.findIndex((a) => a === '--template' || a === '-t');
    const template = tIdx >= 0 ? args[tIdx + 1] : undefined;
    const series = state.plots;
    const render = (label: string) => {
      const names = Object.keys(series);
      if (!names.length) return `No plots data. Run \`dvc repro\`, \`dvc exp run\` or your DVCLive-instrumented script first.`;
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
    const gp = parseArgv(args.slice(1), ['-o', '--out', '--rev', '-j', '--jobs']);
    const url = gp.pos[0];
    const positionalOut = gp.pos[1];
    const out = gp.val('-o', '--out') ?? positionalOut ?? (sub === 'import-url' ? 'data/imported.bin' : 'data/registry.xml');
    if (!url && sub !== 'import-url') {
      return { state, result: fail(`Usage: dvc ${sub} <url> [-o <path>]`) };
    }
    const md5 = fakeMd5(`${sub}:${url ?? 'url'}:${out}`);
    const tracks = sub === 'import' || sub === 'import-url';
    state.files[out] = makeFile(out, 'data', {
      contentId: md5,
      tracked: tracks,
      pointerMd5: tracks ? md5 : undefined,
      present: true,
      gitignored: tracks,
      importedFrom: tracks ? { url: url ?? '', path: positionalOut, rev: gp.val('--rev') } : undefined,
    });
    if (tracks) {
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
              ? `  import = versioned dependency on an external DVC project (creates ${out}.dvc, refresh it with \`dvc update ${out}.dvc\`)`
              : `  import-url = track an external URL as data (creates ${out}.dvc, refresh it with \`dvc update ${out}.dvc\`)`,
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
      const refs = args.slice(2).filter((a) => !a.startsWith('-'));
      const find = (name: string) => state.experiments.find((e) => e.id === name || e.name === name || e.id.startsWith(name));
      const head = state.gitCommits[state.gitCommits.length - 1];
      type Side = { label: string; params: Record<string, string | number>; metrics: Record<string, number> };
      const baseline: Side = { label: 'HEAD', params: head?.params ?? {}, metrics: head?.metrics ?? {} };
      const workspace: Side = { label: 'workspace', params: state.params, metrics: state.metrics };
      const resolve = (name: string): Side | undefined => {
        if (name === 'HEAD') return baseline;
        if (name === 'workspace') return workspace;
        const e = find(name);
        return e ? { label: e.name ?? e.id, params: e.params, metrics: e.metrics } : undefined;
      };
      // no arguments: workspace vs the HEAD baseline (the DVC default)
      const a = refs[0] ? resolve(refs[0]) : baseline;
      const b = refs[1] ? resolve(refs[1]) : refs[0] ? workspace : workspace;
      if (!a) return { state, result: fail(`ERROR: experiment '${refs[0]}' not found.`) };
      if (!b) return { state, result: fail(`ERROR: experiment '${refs[1]}' not found.`) };
      const lines = [`Path\t\tMetric/Param\t${a.label}\t${b.label}\tChange`];
      const keys = new Set([
        ...Object.keys(a.params), ...Object.keys(b.params), ...Object.keys(a.metrics), ...Object.keys(b.metrics),
      ]);
      for (const k of keys) {
        const isMetric = k in a.metrics || k in b.metrics;
        const va = (isMetric ? a.metrics[k] : a.params[k]) as string | number | undefined;
        const vb = (isMetric ? b.metrics[k] : b.params[k]) as string | number | undefined;
        if (va === vb) continue;
        const change = typeof va === 'number' && typeof vb === 'number' ? (vb - va).toFixed(4) : '—';
        lines.push(`${isMetric ? 'metrics.json' : 'params.yaml'}\t${k}\t${va ?? '—'}\t${vb ?? '—'}\t${change}`);
      }
      if (lines.length === 1) lines.push(`(no differences between ${a.label} and ${b.label})`);
      return { state, result: ok(lines.join('\n')) };
    }
    if (esub === 'run') {
      if (!state.pipeline.length) return { state, result: fail('ERROR: experiments need a pipeline. Add a stage first.') };
      const sets: Record<string, string | number> = {};
      let queued = false;
      let expName: string | undefined;
      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--queue') queued = true;
        if (args[i] === '--run-all') {
          return executeCommand(state, 'dvc queue start');
        }
        if (args[i] === '-S' || args[i] === '--set-param') {
          const kv = parseKeyValue(args[++i] ?? '');
          if (kv) sets[kv.key] = kv.value;
        }
        if (args[i] === '-n' || args[i] === '--name') expName = args[++i];
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
      // the run happens in the workspace: params.yaml is modified, stages re-run
      for (const [k, v] of Object.entries(sets)) {
        state.params[k] = v;
        markPipelineDirtyIfParamChanged(state, k);
      }
      state.files['params.yaml'] = makeFile('params.yaml', 'params', {
        contentId: fakeMd5(`params:${JSON.stringify(state.params)}`),
      });
      for (const s of state.pipeline) s.upToDate = false;
      const logs: string[] = [];
      for (const s of state.pipeline) {
        logs.push(...reproStage(state, s));
      }
      writeLock(state);
      const run = recordExperiment(state, expName);
      logs.push(`Reproduced experiment(s): ${run.name}`);
      logs.push('Experiment results have been applied to your workspace (params.yaml is now modified).');
      logs.push(`To promote an experiment to a Git branch run:\n\n\tdvc exp branch ${run.name} <branch>`);
      logs.push('Check results with `dvc exp show`.');
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
      // outputs come back too: restore every snapshotted file from the experiment
      for (const [path, contentId] of Object.entries(run.outputs ?? {})) {
        const f = state.files[path];
        if (f) {
          f.contentId = contentId;
          f.present = true;
          if (f.tracked) f.pointerMd5 = contentId;
        } else {
          state.files[path] = makeFile(path, 'data', { contentId, present: true });
        }
        addCache(state, contentId);
      }
      for (const s of state.pipeline) {
        const sig = run.stageSigs?.[s.name];
        if (sig) {
          s.lastRunSig = sig;
          s.upToDate = stageRunSig(s, state) === sig;
          s.stale = s.upToDate ? undefined : s.stale;
          if (s.upToDate) s.locked = true;
        } else {
          s.upToDate = false;
        }
      }
      writeLock(state);
      return {
        state,
        result: ok(
          `Changes for experiment '${run.name ?? run.id}' have been applied to your current workspace.\nparams: ${JSON.stringify(state.params)}\nParams, metrics and outputs are restored; commit them with Git to make the winner the new baseline.`,
        ),
      };
    }
    if (esub === 'push' || esub === 'pull') {
      const target = args.slice(2).find((a) => !a.startsWith('-')) ?? 'origin';
      const gitRemotes = state.gitRemotes ?? [];
      if (!gitRemotes.includes(target)) {
        const isDvcRemote = state.remotes.some((r) => r.name === target);
        return {
          state,
          result: fail(
            isDvcRemote
              ? [
                  `ERROR: '${target}' is a DVC remote (data storage), not a Git remote.`,
                  `\`dvc exp ${esub}\` moves experiment refs through a Git remote such as \`origin\` (see \`git remote -v\`);`,
                  'the experiment data itself goes to the DVC remote with the usual `dvc push` mechanism (-r selects it).',
                ].join('\n')
              : `ERROR: unknown Git remote '${target}'. Known Git remotes: ${gitRemotes.join(', ') || '(none)'}. Add one with \`git remote add <name> <url>\`.`,
          ),
        };
      }
      return finish(
        state,
        ok(
          esub === 'push'
            ? `Pushed ${state.experiments.length || 1} experiment(s) to Git remote '${target}' (refs/exps synced).\nTeam members can now review runs with \`dvc exp pull ${target}\`.`
            : `Pulled experiment refs from Git remote '${target}' (refs/exps synced).\nView shared team experiments with \`dvc exp show\`.`,
        ),
      );
    }
    if (esub === 'branch') {
      const id = args[2] || (state.experiments[state.experiments.length - 1]?.id ?? 'exp-latest');
      const branchName = args[3] || 'experiment-promoted';
      return finish(
        state,
        ok(
          `Created Git branch '${branchName}' from experiment '${id}'.\nTo switch to the new branch run:\n\n\tgit checkout ${branchName}\nThe branch is ready for push and Pull Request review.`,
        ),
      );
    }
    return { state, result: fail('Usage: dvc exp [run|show|apply|diff|push|pull|branch]') };
  }


  return { state, result: fail(`ERROR: unknown command 'dvc ${sub}'. Type \`help\`.`) };
}
