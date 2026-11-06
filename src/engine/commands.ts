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

const COUNTING = /^dvc |^gto |^git (add|commit|checkout|init|push|tag)|^edit |^rm /;

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

function resolveGitRef(state: RepoState, ref: string | undefined): GitCommit | undefined {
  if (!ref || ref === 'HEAD') return state.gitCommits[state.gitCommits.length - 1];
  const rel = /^HEAD~(\d+)$/.exec(ref);
  if (rel) return state.gitCommits[state.gitCommits.length - 1 - Number(rel[1])];
  return findGitCommit(state, ref);
}

/** Strip the teaching footer from a nested command's output so it can be embedded in another one. */
function plainOutput(res: CommandResult): string {
  return (res.output || res.error || '').split('\n\n── Why:')[0]!;
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

/** Pipeline outputs that a stage declares but that are not in the workspace (fresh clone, deleted file). */
function missingOuts(state: RepoState, stage: PipelineStage): string[] {
  return stage.outs.filter((o) => {
    const f = state.files[o];
    return !!f && !f.present;
  });
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
  // the run cache only helps when the outputs it points at can be checked out from the local cache
  const lost = missingOuts(state, stage);
  const restorable = lost.every((o) => state.cache.includes(state.files[o]!.contentId));
  if ((stage.lastRunSig === sig || state.runCache.includes(sig)) && restorable) {
    if (lost.length) {
      for (const o of lost) state.files[o]!.present = true;
      logs.push(`Stage '${stage.name}' is cached - skipping run, checking out outputs`);
    }
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
    if (s.frozen) continue;
    if (s.upToDate) {
      // locked and current, but the outputs are not in the workspace (fresh clone / deleted file)
      const lost = missingOuts(state, s);
      if (lost.length) {
        out.push(`${s.name}:`, '\tchanged outs:');
        for (const o of lost) {
          out.push(`\t\t${state.cache.includes(state.files[o]!.contentId) ? 'deleted:           ' : 'not in cache:       '}${o}`);
        }
      }
      continue;
    }
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
  // advisory only: it must not hide the "up to date" verdict
  const warn = state.remotes.length === 0 && state.cache.length > 0 ? ['warn: no remote configured — `dvc push` will fail'] : [];
  const notInCache = Object.values(state.files)
    .filter((f) => f.tracked && f.pointerMd5 && !state.cache.includes(f.pointerMd5) && f.present)
    .map((f) => f.path);
  for (const p of notInCache) {
    lines.push(`update file:       ${p} (pointer not in cache — try \`dvc commit\`)`);
  }
  if (!lines.length) return ['Data and pipelines are up to date.', ...warn].join('\n');
  return [...lines, ...warn].join('\n');
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

/** True for a stage output that DVC caches (and therefore adds to .gitignore). */
function isCachedStageOut(state: RepoState, path: string): boolean {
  return state.pipeline.some(
    (s) => s.outs.includes(path) && !s.metrics.includes(path) && !(state.stageMeta[s.name]?.noCache ?? []).includes(path),
  );
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

/** Names of the artifacts declared in the `artifacts:` section of dvc.yaml, with their path. */
function declaredArtifacts(state: RepoState): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = (state.dvcYaml ?? '').split('\n');
  const start = lines.findIndex((l) => /^artifacts:\s*$/.test(l));
  if (start < 0) return out;
  let current: string | undefined;
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break;
    const head = /^ {2}([\w./:-]+):\s*$/.exec(line);
    if (head) {
      current = head[1];
      out[current!] = '';
      continue;
    }
    const pm = /^ {4}path:\s*(\S+)/.exec(line);
    if (pm && current) out[current] = pm[1]!;
  }
  return out;
}

const SEMVER_RE = /^v?(\d+)\.(\d+)\.(\d+)$/;
const semverKey = (v: string): number[] => (SEMVER_RE.exec(v) ?? []).slice(1).map(Number);
function compareSemver(a: string, b: string): number {
  const x = semverKey(a);
  const y = semverKey(b);
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function registeredVersions(state: RepoState, name: string): { version: string; commit: string; tag: string }[] {
  const prefix = `${name}@`;
  return (state.gitTags ?? [])
    .filter((t) => t.name.startsWith(prefix))
    .map((t) => ({ version: t.name.slice(prefix.length), commit: t.commit, tag: t.name }))
    .sort((a, b) => compareSemver(a.version, b.version));
}

/** Latest `name#stage#N` assignment: the version currently in that stage. */
function stageAssignment(
  state: RepoState,
  name: string,
  stage: string,
): { n: number; version: string; commit: string } | undefined {
  const re = new RegExp(`^${escapeRe(name)}#${escapeRe(stage)}#(\\d+)$`);
  let best: { n: number; version: string; commit: string } | undefined;
  for (const t of state.gitTags ?? []) {
    const m = re.exec(t.name);
    if (!m || !t.version) continue;
    const n = Number(m[1]);
    if (!best || n > best.n) best = { n, version: t.version, commit: t.commit };
  }
  return best;
}

/** `gto` is a separate CLI (Git tags as a model registry); here it reads and writes the simulated tags. */
function gtoCommand(state: RepoState, args: string[]): { state: RepoState; result: CommandResult } {
  const g = args[0];
  if (!g || g === '--help' || g === '-h') {
    return {
      state,
      result: ok(
        [
          'usage: gto <register|assign|show> ...',
          '  gto register NAME [REF] --version vX.Y.Z',
          '  gto assign NAME --version vX.Y.Z --stage STAGE',
          '  gto show [NAME]',
        ].join('\n'),
      ),
    };
  }
  const p = parseArgv(args.slice(1), ['--version', '--stage', '-m', '--message', '--ref']);
  if (!isGitRepo(state)) return { state, result: fail('ERROR: gto works on Git tags: this directory is not a Git repository.') };
  const tags = (state.gitTags ??= []);

  if (g === 'register') {
    const name = p.pos[0];
    if (!name || /[@#\s]/.test(name)) {
      return { state, result: fail('Usage: gto register NAME [REF] [--version vX.Y.Z]   (NAME may not contain @, # or spaces)') };
    }
    const commit = resolveGitRef(state, p.pos[1]);
    if (!commit) return { state, result: fail(`fatal: Failed to resolve '${p.pos[1]}' as a valid ref.`) };
    const existing = registeredVersions(state, name);
    const atCommit = existing.find((v) => v.commit === commit.hash);
    if (atCommit) {
      return {
        state,
        result: fail(
          [
            `ERROR: ${name} already has version ${atCommit.version} registered at commit ${commit.hash}.`,
            'GTO allows one version per commit (VersionExistsForCommit): commit your change first, then register the next version.',
          ].join('\n'),
        ),
      };
    }
    let version = p.val('--version');
    if (version) {
      if (!SEMVER_RE.test(version)) {
        return { state, result: fail(`ERROR: Version '${version}' is not valid. Example of valid version: 'v1.0.0'`) };
      }
      if (!version.startsWith('v')) version = `v${version}`;
      if (existing.some((v) => v.version === version)) {
        return { state, result: fail(`ERROR: Version '${version}' of ${name} is already registered (VersionAlreadyRegistered).`) };
      }
    } else {
      const last = existing[existing.length - 1];
      if (last) {
        const [maj, min, pat] = semverKey(last.version);
        version = `v${maj}.${min}.${(pat ?? 0) + 1}`;
      } else {
        version = 'v0.0.1';
      }
    }
    const tag = `${name}@${version}`;
    tags.push({ name: tag, commit: commit.hash });
    return {
      state,
      result: ok(`Created git tag '${tag}' that registers a version\nTo push the changes upstream, run:\n    git push origin ${tag}`),
    };
  }

  if (g === 'assign') {
    const name = p.pos[0];
    const stage = p.val('--stage');
    let version = p.val('--version');
    if (!name || !stage || !version) {
      return { state, result: fail('Usage: gto assign NAME --version vX.Y.Z --stage STAGE') };
    }
    if (!SEMVER_RE.test(version)) {
      return { state, result: fail(`ERROR: Version '${version}' is not valid. Example of valid version: 'v1.0.0'`) };
    }
    if (!version.startsWith('v')) version = `v${version}`;
    const found = registeredVersions(state, name).find((v) => v.version === version);
    if (!found) {
      return {
        state,
        result: fail(`ERROR: Version '${version}' is not registered. Register it first: gto register ${name} --version ${version}`),
      };
    }
    const current = stageAssignment(state, name, stage);
    if (current?.version === version && !p.has('--force')) {
      return {
        state,
        result: fail(`ERROR: Version '${version}' is already in stage '${stage}'. Use the '--force' flag to create a new Git tag nevertheless.`),
      };
    }
    const tag = `${name}#${stage}#${(current?.n ?? 0) + 1}`;
    tags.push({ name: tag, commit: found.commit, version });
    return {
      state,
      result: ok(`Created git tag '${tag}' that assigns stage to version '${version}'\nTo push the changes upstream, run:\n    git push origin ${tag}`),
    };
  }

  if (g === 'show') {
    const only = p.pos[0];
    const names = [...new Set(tags.map((t) => t.name.split(/[@#]/)[0]!))].filter((n) => !only || n === only).sort();
    if (!names.length) {
      return { state, result: ok(only ? `No versions of '${only}' registered.` : 'Nothing registered yet. Try `gto register <name> --version v1.0.0`.') };
    }
    const stages = [...new Set(tags.filter((t) => t.version).map((t) => t.name.split('#')[1]!))].sort();
    const rows = [['artifact', 'latest', ...stages.map((s) => `#${s}`)]];
    for (const n of names) {
      const latest = registeredVersions(state, n).slice(-1)[0]?.version ?? '-';
      rows.push([n, latest, ...stages.map((s) => stageAssignment(state, n, s)?.version ?? '-')]);
    }
    const widths = rows[0]!.map((_, i) => Math.max(...rows.map((r) => r[i]!.length)));
    return { state, result: ok(rows.map((r) => r.map((c, i) => c.padEnd(widths[i]!)).join('  ').trimEnd()).join('\n')) };
  }

  return { state, result: fail(`gto: unknown command '${g}'. This simulator supports: register, assign, show.`) };
}

// ── .dvc/config, shared cache ────────────────────────────────────────────────

const CACHE_LINK_TYPES = ['reflink', 'hardlink', 'symlink', 'copy'];

/** Mirrors dvc/config_schema.py: cache.type is a list of link types, cache.shared accepts only `group`. */
function validateConfigValue(key: string, value: string): string | null {
  const k = key.toLowerCase();
  if (k === 'cache.type') {
    const bad = value.split(',').map((t) => t.trim()).filter((t) => !CACHE_LINK_TYPES.includes(t));
    if (bad.length) {
      return [
        `ERROR: configuration error - config file error: Unsupported cache type(s): ${bad.join(', ')}`,
        `cache.type takes a comma-separated list of: ${CACHE_LINK_TYPES.join(', ')} (DVC tries them in order).`,
      ].join('\n');
    }
  }
  if (k === 'cache.shared' && value.toLowerCase() !== 'group') {
    return [
      `ERROR: configuration error - config file error: expected one of group for cache.shared, got '${value}'`,
      'The only supported value is `group`: it makes the cache group-writable for a shared team cache.',
    ].join('\n');
  }
  return null;
}

function readConfigValue(state: RepoState, key: string): string | undefined {
  return state.dvcConfigLocal?.[key] ?? state.dvcConfig?.[key];
}

/** Record a changed `.dvc/config` so Git sees a modification (the committed content becomes the baseline). */
function touchConfigFile(state: RepoState, local: boolean): void {
  const path = local ? '.dvc/config.local' : '.dvc/config';
  let f = state.files[path];
  if (!f) {
    f = makeFile(path, 'meta', { gitignored: local });
    state.files[path] = f;
  }
  if (local) return;
  for (let i = state.gitCommits.length - 1; i >= 0; i--) {
    const c = state.gitCommits[i]!;
    if (c.files?.includes(path)) {
      c.blobs ??= {};
      if (c.blobs[path] === undefined) c.blobs[path] = f.contentId;
      break;
    }
  }
  f.contentId = fakeMd5(`config:${JSON.stringify(state.dvcConfig ?? {})}:${JSON.stringify(state.remotes)}`);
}

function writeConfigValue(state: RepoState, key: string, value: string, local: boolean): void {
  if (local) (state.dvcConfigLocal ??= {})[key] = value;
  else (state.dvcConfig ??= {})[key] = value;
  touchConfigFile(state, local);
}

function unsetConfigValue(state: RepoState, key: string, local: boolean): boolean {
  const store = local ? state.dvcConfigLocal : state.dvcConfig;
  if (!store || !(key in store)) return false;
  delete store[key];
  touchConfigFile(state, local);
  return true;
}

/** INI text of `.dvc/config` (or `.dvc/config.local`) in the layout DVC writes. */
function renderConfigIni(state: RepoState, local: boolean): string {
  const sections = new Map<string, [string, string][]>();
  const add = (section: string, opt: string, value: string) => {
    if (!sections.has(section)) sections.set(section, []);
    sections.get(section)!.push([opt, value]);
  };
  const conf = (local ? state.dvcConfigLocal : state.dvcConfig) ?? {};
  if (!local) {
    const def = state.remotes.find((r) => r.isDefault);
    if (def) add('core', 'remote', def.name);
  }
  for (const [key, value] of Object.entries(conf).sort(([a], [b]) => a.localeCompare(b))) {
    const parts = key.split('.');
    if (parts[0] === 'remote' && parts.length >= 3) add(`'remote "${parts[1]}"'`, parts.slice(2).join('.'), value);
    else add(parts[0]!, parts.slice(1).join('.'), value);
  }
  if (!local) {
    for (const r of state.remotes) {
      const name = `'remote "${r.name}"'`;
      const existing = sections.get(name) ?? [];
      if (!existing.some(([o]) => o === 'url')) existing.unshift(['url', r.url]);
      sections.set(name, existing);
    }
  }
  const rank = (x: string) => (x === 'core' ? 0 : x.startsWith("'remote") ? 1 : 2);
  const lines: string[] = [];
  for (const sec of [...sections.keys()].sort((a, b) => rank(a) - rank(b))) {
    lines.push(`[${sec}]`);
    for (const [o, v] of sections.get(sec)!) lines.push(`    ${o} = ${v}`);
  }
  return lines.join('\n');
}

const EXP_ADJECTIVES = [
  'agile', 'bland', 'brisk', 'calm', 'dusty', 'eager', 'fancy', 'hardy', 'jolly', 'keen', 'lucid',
  'mossy', 'noble', 'plush', 'quiet', 'rapid', 'sunny', 'tidy', 'vivid', 'witty',
];
const EXP_NOUNS = [
  'acorn', 'bison', 'cedar', 'delta', 'ember', 'finch', 'grove', 'heron', 'islet', 'jasper', 'kiwi',
  'lotus', 'maple', 'newt', 'otter', 'pecan', 'quail', 'raven', 'tulip', 'walnut',
];

/** `adjective-noun` experiment name, unique among the saved experiments (like DVC's generated names). */
function generateExpName(state: RepoState): string {
  const taken = new Set(state.experiments.map((e) => e.name));
  for (let attempt = 0; attempt < 400; attempt++) {
    const h = fakeMd5(`expname:${JSON.stringify(state.params)}:${state.experiments.length}:${attempt}`);
    const adj = EXP_ADJECTIVES[parseInt(h.slice(0, 6), 16) % EXP_ADJECTIVES.length]!;
    const noun = EXP_NOUNS[parseInt(h.slice(6, 12), 16) % EXP_NOUNS.length]!;
    const name = `${adj}-${noun}`;
    if (!taken.has(name)) return name;
  }
  return `run-${state.experiments.length + 1}-saved`;
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
          'DVC commands: init, add, status, commit, checkout [--relink], remote, push, pull, fetch,',
          '  config [key [value]] (--local), cache dir [path], install [--use-pre-commit-tool],',
          '  stage add (--wdir/--always-changed), repro [--pull|--allow-missing], dag, freeze, unfreeze,',
          '  metrics, params, plots --template, exp (run --queue|save|remove|diff|apply|push|pull|branch), queue, get, import,',
          '  update (imports only), artifacts get, remove, gc (-w|-A|-c), diff, version',
          'Git (simulated): init, add, commit [--amend], log, status, checkout, push, tag, remote',
          'Separate tools: cml (comment create, runner launch); gto (register, assign, show); Python: python src/train.py, python -c "import dvc.api; ..."',
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
    if (path === '.dvc/config' && state.initialized) return { state, result: ok(renderConfigIni(state, false)) };
    if (path === '.dvc/config.local' && state.files['.dvc/config.local']) {
      return { state, result: ok(renderConfigIni(state, true)) };
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
      const present = Object.values(state.files).filter(
        (f) => f.present && !f.gitignored && !isCachedStageOut(state, f.path),
      );
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
      // DVC git-ignores cached stage outputs even when the fixture never wrote the .gitignore entry
      const gitIgnored = (f: WorkspaceFile) => f.gitignored || isCachedStageOut(state, f.path);
      const isChanged = (f: WorkspaceFile) =>
        f.present && !gitIgnored(f) && (!(f.path in tree) || (tree[f.path] !== null && tree[f.path] !== f.contentId));
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
            if (!committed || isChanged(state.files[meta]!)) stage(meta);
          }
          continue;
        }
        const f = state.files[p];
        if (f && f.present) {
          if (gitIgnored(f)) {
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
          if (!hits.length && under.every((x) => gitIgnored(x))) ignored.push(p);
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
              'hint: DVC git-ignores tracked data and cached outputs on purpose: commit the .dvc pointer or dvc.lock instead.',
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
      const hookNote = state.hooks?.installed
        ? ['pre-commit hook: dvc status', ...statusLines(state).split('\n').map((l) => `  ${l}`)]
        : [];
      const c = snapshotGit(state, message);
      return finish(state, ok([...hookNote, `[${c.hash}] ${message}`].join('\n')));
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
        const res = checkoutGitRef(state, args[1]);
        // post-checkout hook (flag 1 = ref checkout): runs `dvc checkout` so the workspace follows the pointers
        if (res.ok && state.hooks?.installed && state.initialized && !res.output.startsWith('Already on')) {
          const hook = executeCommandInner(state, 'dvc checkout');
          const head = res.output.split('\n')[0]!;
          return {
            state: hook.state,
            result: ok([head, 'post-checkout hook: dvc checkout', ...plainOutput(hook.result).split('\n').map((l) => `  ${l}`)].join('\n')),
          };
        }
        return { state, result: res };
      }
      return { state, result: fail('Usage: git checkout <ref> [-- <path>]') };
    }
    if (sub === 'push') {
      const rest = args.slice(1);
      const positional = rest.filter((a) => !a.startsWith('-'));
      const remote = positional[0] ?? 'origin';
      const remotes = state.gitRemotes ?? [];
      if (!remotes.length) {
        return {
          state,
          result: fail('fatal: No configured push destination.\nEither specify the URL from the command-line or configure a remote repository using: git remote add <name> <url>'),
        };
      }
      if (!remotes.includes(remote)) {
        return { state, result: fail(`fatal: '${remote}' does not appear to be a git repository\nfatal: Could not read from remote repository.`) };
      }
      const lines: string[] = [];
      let next = state;
      // pre-push hook: runs `dvc push` first; a failing hook aborts the push
      if (state.hooks?.installed && state.initialized) {
        lines.push('pre-push hook: dvc push');
        const hook = executeCommandInner(state, 'dvc push');
        const text = plainOutput(hook.result).split('\n').map((l) => `  ${l}`);
        if (!hook.result.ok) {
          return {
            state,
            result: fail([...lines, ...text, `error: failed to push some refs to '${remote}' (the pre-push hook exited with an error)`].join('\n')),
          };
        }
        lines.push(...text);
        next = hook.state;
      }
      const head = next.gitCommits[next.gitCommits.length - 1];
      const tagNames = rest.includes('--tags')
        ? (next.gitTags ?? []).map((t) => t.name)
        : positional.slice(1).filter((n) => (next.gitTags ?? []).some((t) => t.name === n));
      lines.push(`To ${remote}`, `   ${head?.hash ?? '0000000'}  main -> main`, ...tagNames.map((n) => ` * [new tag]  ${n} -> ${n}`));
      return { state: next, result: ok(lines.join('\n')) };
    }
    if (sub === 'tag') {
      const rest = args.slice(1);
      const names = rest.filter((a) => !a.startsWith('-'));
      const tags = (state.gitTags ??= []);
      if (rest.includes('-d') || rest.includes('--delete')) {
        const missing = names.filter((n) => !tags.some((t) => t.name === n));
        if (!names.length || missing.length) return { state, result: fail(`error: tag '${missing[0] ?? ''}' not found.`) };
        state.gitTags = tags.filter((t) => !names.includes(t.name));
        return { state, result: ok(names.map((n) => `Deleted tag '${n}'`).join('\n')) };
      }
      if (!names.length) return { state, result: ok(tags.map((t) => t.name).sort().join('\n')) };
      const name = names[0]!;
      const ref = names[1];
      if (tags.some((t) => t.name === name)) return { state, result: fail(`fatal: tag '${name}' already exists`) };
      const commit = resolveGitRef(state, ref);
      if (!commit) return { state, result: fail(`fatal: Failed to resolve '${ref}' as a valid ref.`) };
      tags.push({ name, commit: commit.hash });
      return { state, result: ok('') };
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

  // ── gto: a separate CLI that turns Git tags into a model registry ──
  if (cmd === 'gto') return gtoCommand(state, args);

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
  if (sub === 'artifact') {
    return {
      state,
      result: fail(
        [
          "ERROR: unknown command 'dvc artifact'. The command group is plural: `dvc artifacts get <url> <name>`.",
          'Artifacts are declared in the artifacts: section of dvc.yaml; versions and stages are Git tags made with the separate `gto` CLI.',
        ].join('\n'),
      ),
    };
  }
  if (sub === 'register' || sub === 'assign') {
    return {
      state,
      result: fail(
        [
          `ERROR: unknown command 'dvc ${sub}'. Registering and assigning stages is done by the separate GTO CLI, not by DVC:`,
          `    gto ${sub} model --version v1.0.0${sub === 'assign' ? ' --stage prod' : ''}`,
          'Then fetch the artifact with `dvc artifacts get <url> model --rev v1.0.0`.',
        ].join('\n'),
      ),
    };
  }
  if (sub === 'gto') {
    return {
      state,
      result: fail(
        [
          "ERROR: unknown command 'dvc gto'. GTO is a separate CLI (like CML), not a DVC subcommand.",
          'Call it directly: `gto register model --version v1.0.0`, `gto assign model --version v1.0.0 --stage prod`.',
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


  if (sub === 'install') {
    if (!isGitRepo(state)) {
      return {
        state,
        result: fail(
          [
            'ERROR: failed to install the DVC Git hooks - this directory is not inside of a Git repository.',
            'The hooks live in .git/hooks, so Git must exist first: run `git init` (and `dvc init`).',
          ].join('\n'),
        ),
      };
    }
    const err = requireInit(state);
    if (err) return { state, result: err };
    if (args.includes('--use-pre-commit-tool')) {
      const text = [
        'repos:',
        '- repo: https://github.com/treeverse/dvc',
        '  rev: 3.0.0',
        '  hooks:',
        '  - id: dvc-pre-commit',
        '    stages: [pre-commit]',
        '  - id: dvc-pre-push',
        '    stages: [pre-push]',
        '  - id: dvc-post-checkout',
        '    stages: [post-checkout]',
        '    always_run: true',
      ].join('\n');
      state.files['.pre-commit-config.yaml'] = makeFile('.pre-commit-config.yaml', 'yaml', {
        contentId: fakeMd5('pre-commit-config:dvc'),
        text,
      });
      state.hooks = { installed: state.hooks?.installed ?? false, preCommitConfig: true };
      return finish(
        state,
        ok(
          [
            'Wrote the DVC hooks into .pre-commit-config.yaml (dvc-pre-commit, dvc-pre-push, dvc-post-checkout).',
            'Nothing is active in .git/hooks yet: the pre-commit tool owns the hooks. Activate them with',
            '    pre-commit install --hook-type pre-commit --hook-type pre-push --hook-type post-checkout',
            'and commit .pre-commit-config.yaml so the whole team gets the same hooks.',
          ].join('\n'),
        ),
      );
    }
    if (state.hooks?.installed) {
      return {
        state,
        result: fail("ERROR: Hook 'post-checkout' already exists. Please refer to https://man.dvc.org/install for more info."),
      };
    }
    state.hooks = { installed: true, preCommitConfig: state.hooks?.preCommitConfig };
    return finish(
      state,
      ok(
        [
          'Installed Git hooks in .git/hooks:',
          '  pre-commit     runs `dvc status` before each commit',
          '  post-checkout  runs `dvc checkout` after `git checkout <ref>` so the data follows the branch',
          '  pre-push       runs `dvc push` before `git push` so the code never lands without its data',
          'Hooks are local to this clone (.git is not versioned): every teammate runs `dvc install` once.',
        ].join('\n'),
      ),
    );
  }

  if (sub === 'config') {
    const cp = parseArgv(args.slice(1));
    const isLocal = cp.has('--local');
    const clean = cp.pos;
    if (cp.has('-l', '--list') || !clean.length) {
      const lines = ['core.analytics = false'];
      for (const r of state.remotes) {
        lines.push(`remote.${r.name}.url = ${r.url}`);
      }
      for (const [k, v] of Object.entries(state.dvcConfig ?? {})) lines.push(`${k} = ${v}`);
      if (state.files['.dvc/config.local']) {
        lines.push('[local] remote.myremote.secret_access_key = ***');
      }
      for (const [k, v] of Object.entries(state.dvcConfigLocal ?? {})) lines.push(`[local] ${k} = ${v}`);
      return { state, result: ok(lines.join('\n')) };
    }
    const key = clean[0]!;
    const secretKeys = ['secret', 'key', 'password', 'token', 'credential'];
    const isSecret = secretKeys.some((x) => key.toLowerCase().includes(x));
    if (cp.has('-u', '--unset')) {
      const removed = unsetConfigValue(state, key, isLocal);
      return removed
        ? finish(state, ok(`Unset ${key} in ${isLocal ? '.dvc/config.local' : '.dvc/config'}.`))
        : { state, result: fail(`ERROR: configuration error - config file error: option '${key}' does not exist in ${isLocal ? '.dvc/config.local' : '.dvc/config'}`) };
    }
    if (clean.length === 1) {
      // read-back: `dvc config cache.type` prints the value, nothing is written
      const value = readConfigValue(state, key);
      if (value === undefined) {
        const [section, ...rest] = key.split('.');
        return {
          state,
          result: fail(`ERROR: configuration error - config file error: option '${rest.join('.')}' doesn't exist in section '${section}'`),
        };
      }
      return { state, result: ok(isSecret && state.dvcConfigLocal?.[key] !== undefined ? '***' : value) };
    }
    const val = clean[1]!;
    const invalid = validateConfigValue(key, val);
    if (invalid) return { state, result: fail(invalid) };
    writeConfigValue(state, key, val, isLocal);
    if (isLocal) {
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

  if (sub === 'cache') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    if (args[1] !== 'dir') {
      return {
        state,
        result: fail(`ERROR: unknown command 'dvc cache ${args[1] ?? ''}'. This simulator has \`dvc cache dir [path]\` (also set the link type with \`dvc config cache.type\`).`),
      };
    }
    const dp = parseArgv(args.slice(2));
    const local = dp.has('--local');
    const file = local ? '.dvc/config.local' : '.dvc/config';
    if (dp.has('-u', '--unset')) {
      unsetConfigValue(state, 'cache.dir', local);
      return finish(state, ok(`Unset cache.dir in ${file}: the cache is back at .dvc/cache.`));
    }
    const dir = dp.pos[0];
    if (!dir) return { state, result: ok(readConfigValue(state, 'cache.dir') ?? '.dvc/cache') };
    writeConfigValue(state, 'cache.dir', dir, local);
    return finish(
      state,
      ok(
        [
          `Cache directory is now '${dir}' (cache.dir in ${file}).`,
          'Objects already in the old cache are not moved: copy them over, or let teammates re-fill the new directory with `dvc pull`.',
          local
            ? 'Stored in .dvc/config.local: only this machine uses the path, Git never sees it.'
            : 'Stored in .dvc/config: commit it so every clone uses the same cache location.',
        ].join('\n'),
      ),
    );
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
    const text = statusLines(state);
    // the footer explains "modified"; it only makes sense when something is
    return text.startsWith('Data and pipelines are up to date.') ? { state, result: ok(text) } : finish(state, ok(text));
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
    const co = parseArgv(args.slice(1));
    const path = co.pos[0];
    const targets = path
      ? [path]
      : Object.values(state.files).filter((f) => f.tracked).map((f) => f.path);
    const lines: string[] = [];
    if (co.has('--relink')) {
      const linkType = readConfigValue(state, 'cache.type') ?? 'reflink,copy';
      const relinkable = targets.filter((p) => {
        const f = state.files[p];
        return !!f?.tracked && !!f.pointerMd5 && f.present && state.cache.includes(f.pointerMd5);
      });
      lines.push(
        `Relinking ${relinkable.length} tracked file(s) from the cache using cache.type=${linkType} (first link type the filesystem supports wins).`,
        ...relinkable.map((p) => `  relinked ${p}`),
      );
      if (readConfigValue(state, 'cache.shared') === 'group') {
        lines.push('cache.shared=group: new cache files are group-writable, so teammates in the same group can add to it.');
      }
    }
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
    const rp = parseArgv(args.slice(1));
    const pull = rp.has('--pull');
    const allowMissing = rp.has('--allow-missing');
    const target = rp.pos[0];
    const logs: string[] = [];

    // which stages are in scope, in pipeline order
    let scope: PipelineStage[];
    if (target) {
      // a matrix/foreach group name (`train`) stands for every generated stage `train@...`
      const roots = state.pipeline.some((s) => s.name === target)
        ? [target]
        : state.pipeline.filter((s) => s.name.startsWith(`${target}@`)).map((s) => s.name);
      if (!roots.length) return { state, result: fail(`ERROR: stage '${target}' not found.`) };
      const wanted = new Set(roots.flatMap((r) => runPipelineFrom(state, r)));
      scope = state.pipeline.filter((s) => wanted.has(s.name));
      // keep dependency order for a single chain
      if (roots.length === 1) {
        scope = runPipelineFrom(state, roots[0]!).flatMap((n) => state.pipeline.find((x) => x.name === n) ?? []);
      }
    } else {
      scope = [...state.pipeline];
    }

    // stages whose lock is current but whose outputs are not in the workspace (fresh clone)
    const gone = (s: PipelineStage) => (s.upToDate && !s.frozen ? missingOuts(state, s) : []);
    let remoteName: string | undefined;
    if (pull && !allowMissing && scope.some((s) => gone(s).length)) {
      const rr = resolveRemote(state, undefined, 'pull missing outputs for repro --pull');
      if ('error' in rr) return { state, result: fail(rr.error) };
      remoteName = rr.name;
    }

    for (const s of scope) {
      const lost = gone(s);
      if (s.upToDate && !lost.length) {
        logs.push(`Stage '${s.name}' didn't change, skipping.`);
        continue;
      }
      if (lost.length && allowMissing) {
        logs.push(`Stage '${s.name}' didn't change, skipping (outputs missing locally, --allow-missing).`);
        continue;
      }
      if (lost.length && pull && remoteName) {
        const store = remoteStore(state, remoteName);
        const need = lost.filter((o) => !state.cache.includes(state.files[o]!.contentId));
        if (need.every((o) => store.includes(state.files[o]!.contentId))) {
          logs.push(`Pulling data for stage '${s.name}'`);
          for (const o of need) {
            const id = state.files[o]!.contentId;
            addCache(state, id);
            logs.push(`  pulled ${o} (${shortMd5(id)}…) ← ${remoteName}`);
          }
          for (const o of lost) {
            state.files[o]!.present = true;
            if (!state.generated.includes(o)) state.generated.push(o);
          }
          logs.push(`Stage '${s.name}' didn't change, skipping (outputs pulled from remote '${remoteName}', not re-run).`);
          continue;
        }
        logs.push(`Unable to pull data for stage '${s.name}': remote '${remoteName}' does not hold its outputs. Running it instead.`);
      }
      logs.push(...reproStage(state, s));
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

  if (sub === 'artifacts') {
    if (args[1] !== 'get') {
      return {
        state,
        result: fail(
          `ERROR: unknown command 'dvc artifacts ${args[1] ?? ''}'. Only \`dvc artifacts get <url> <name>\` exists; register and assign with the separate \`gto\` CLI.`,
        ),
      };
    }
    const ap = parseArgv(args.slice(2), ['--rev', '--stage', '-o', '--out', '-j', '--jobs', '--config', '--remote', '--remote-config']);
    const [url, name] = ap.pos;
    if (!url || !name) return { state, result: fail('Usage: dvc artifacts get <url> <name> [--rev <version>] [--stage <stage>] [-o <path>]') };
    const rev = ap.val('--rev');
    const stage = ap.val('--stage');
    if (rev && stage) return { state, result: fail('ERROR: Artifact version and stage are mutually exclusive.') };
    // --rev names a registered version (GTO tag name@vX.Y.Z); --stage resolves name#stage#N to its version
    let version: string | undefined;
    if (rev) {
      version = registeredVersions(state, name).find((v) => v.version === rev || v.version === `v${rev}`)?.version;
      if (!version) {
        const known = registeredVersions(state, name).map((v) => v.version);
        return {
          state,
          result: fail(
            `ERROR: Unable to find artifact '${name}' with version '${rev}'. ${known.length ? `Registered versions: ${known.join(', ')}.` : 'No version is registered yet.'}`,
          ),
        };
      }
    } else if (stage) {
      const at = stageAssignment(state, name, stage);
      if (!at) {
        return {
          state,
          result: fail(`ERROR: Unable to find artifact '${name}' in stage '${stage}'. Assign one first: gto assign ${name} --version <vX.Y.Z> --stage ${stage}`),
        };
      }
      version = at.version;
    } else {
      version = registeredVersions(state, name).slice(-1)[0]?.version;
      if (!version) {
        return {
          state,
          result: fail(
            [
              `ERROR: Unable to find artifact '${name}': no version of it is registered in this repository.`,
              `Register one with the separate GTO CLI first: gto register ${name} --version v1.0.0`,
            ].join('\n'),
          ),
        };
      }
    }
    const declared = declaredArtifacts(state);
    if (!(name in declared)) {
      return {
        state,
        result: fail(`ERROR: Unable to find artifact '${name}' in the artifacts: section of dvc.yaml at ${name}@${version}. Declared: ${Object.keys(declared).join(', ') || '(none)'}.`),
      };
    }
    const src = declared[name]!;
    const out = ap.val('-o', '--out') ?? src.split('/').pop()!;
    state.files[out] = makeFile(out, 'data', {
      contentId: state.files[src]?.contentId ?? fakeMd5(`artifact:${name}:${version}`),
      present: true,
    });
    return finish(
      state,
      ok(
        [
          `Downloaded artifact '${name}' version ${version}${stage ? ` (stage ${stage})` : ''} from ${url}`,
          `  ${src} -> ${out}`,
        ].join('\n'),
      ),
    );
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
    if (esub === 'save') {
      const p = parseArgv(args.slice(2), ['-n', '--name', '-I', '--include-untracked', '-m', '--message']);
      let name = p.val('-n', '--name');
      const message = p.val('-m', '--message');
      if (name !== undefined && !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) {
        return {
          state,
          result: fail(`ERROR: invalid experiment name '${name}'. Use letters, digits, '.', '_' and '-' (it becomes a Git ref name).`),
        };
      }
      const included: string[] = [];
      args.slice(2).forEach((a, i, all) => {
        if ((a === '-I' || a === '--include-untracked') && all[i + 1]) included.push(all[i + 1]!);
      });
      for (const path of included) {
        if (!state.files[path]?.present) {
          return { state, result: fail(`ERROR: cannot include '${path}': no such file in the workspace.`) };
        }
      }
      if (name !== undefined) {
        const at = state.experiments.findIndex((e) => e.name === name);
        if (at >= 0) {
          if (!p.has('-f', '--force')) {
            return {
              state,
              result: fail(
                `ERROR: Experiment conflicts with existing experiment '${name}'.\nTo overwrite the existing experiment run:\n\n\tdvc exp save -f -n ${name}`,
              ),
            };
          }
          state.experiments.splice(at, 1);
        }
      } else {
        name = generateExpName(state);
      }
      // nothing runs: the workspace params and metrics are stored as they are
      const run = recordExperiment(state, name);
      if (message) run.message = message;
      return finish(
        state,
        ok(
          [
            `Experiment has been saved with name '${name}'.`,
            `  params:  ${JSON.stringify(run.params)}`,
            `  metrics: ${JSON.stringify(run.metrics)}`,
            ...(included.length ? [`  included untracked: ${included.join(', ')}`] : []),
            ...(message ? [`  message: ${message}`] : []),
            'No stage was re-run: `dvc exp save` stores what the workspace holds right now.',
            `Compare with \`dvc exp show\`, keep it with \`dvc exp apply ${name}\`, share it with \`dvc exp push origin\`.`,
          ].join('\n'),
        ),
      );
    }
    if (esub === 'remove') {
      const p = parseArgv(args.slice(2), ['-g', '--git-remote', '--rev', '-n', '--num']);
      const names = p.pos;
      const all = p.has('-A', '--all', '--all-commits');
      const queue = p.has('--queue');
      const rev = p.val('--rev');
      const gitRemote = p.val('-g', '--git-remote');
      if (!names.length && !all && !queue && !rev) {
        return {
          state,
          result: fail('ERROR: Either provide an `experiment` argument, or use the `--rev` or `--all-commits` (`--all`) flag.'),
        };
      }
      const match = (e: ExperimentRun, n: string) => e.name === n || e.id === n || e.id.startsWith(n);
      const lines: string[] = [];
      if (queue) {
        lines.push(`Removed ${state.expQueue.length} queued experiment(s).`);
        state.expQueue = [];
        if (!names.length && !all && !rev) return finish(state, ok(lines.join('\n')));
      }
      if (gitRemote) {
        if (!(state.gitRemotes ?? []).includes(gitRemote)) {
          const isDvc = state.remotes.some((r) => r.name === gitRemote);
          return {
            state,
            result: fail(
              isDvc
                ? `ERROR: '${gitRemote}' is a DVC remote (data storage), not a Git remote.\n\`-g/--git-remote\` deletes experiment refs from a Git remote such as \`origin\` (see \`git remote -v\`).`
                : `ERROR: unknown Git remote '${gitRemote}'. Known Git remotes: ${(state.gitRemotes ?? []).join(', ') || '(none)'}.`,
            ),
          };
        }
        const remoteSet = ((state.expRemotes ??= {})[gitRemote] ??= []);
        const pushed = (n: string) => remoteSet.includes(n);
        const selected = all ? [...remoteSet] : names;
        const unknown = selected.filter((n) => !pushed(n));
        if (unknown.length) {
          return {
            state,
            result: fail(
              `ERROR: Experiment(s) ${unknown.map((n) => `'${n}'`).join(', ')} not found in Git remote '${gitRemote}'. Push first with \`dvc exp push ${gitRemote}\`; \`-g\` can only delete what is already there.`,
            ),
          };
        }
        state.expRemotes![gitRemote] = remoteSet.filter((n) => !selected.includes(n));
        lines.push(`Removed experiments from Git remote '${gitRemote}': ${selected.join(', ') || '(none)'}`);
        return finish(state, ok(lines.join('\n')));
      }
      let doomed: ExperimentRun[];
      if (names.length) {
        const unknown = names.filter((n) => !state.experiments.some((e) => match(e, n)));
        if (unknown.length) {
          return {
            state,
            result: fail(`ERROR: Experiment(s) ${unknown.map((n) => `'${n}'`).join(', ')} not found. List them with \`dvc exp list\`; nothing was removed.`),
          };
        }
        doomed = state.experiments.filter((e) => names.some((n) => match(e, n)));
      } else if (all) {
        doomed = [...state.experiments];
      } else if (rev) {
        const base = resolveGitRef(state, rev);
        if (!base) return { state, result: fail(`ERROR: unknown revision '${rev}'.`) };
        doomed = state.experiments.filter((e) => base.hash.startsWith(e.commitRef) || e.commitRef.startsWith(base.hash));
      } else {
        doomed = [];
      }
      state.experiments = state.experiments.filter((e) => !doomed.includes(e));
      lines.push(doomed.length ? `Removed experiments: ${doomed.map((e) => e.name ?? e.id).join(', ')}` : 'No experiments to remove.');
      return finish(state, ok(lines.join('\n')));
    }
    if (esub === 'gc') {
      return {
        state,
        result: fail(
          [
            'ERROR: `dvc exp gc` was removed in DVC 3 (it is no longer a `dvc exp` subcommand).',
            'Use `dvc exp remove <name>` for one experiment, `dvc exp remove -A` for all of them,',
            '`dvc exp remove --queue` for queued runs and `dvc exp remove -g <git-remote> <name>` for a Git remote.',
            'Unused cache objects are collected with `dvc gc` (-w, -A, -c), not with experiments commands.',
          ].join('\n'),
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
      if (esub === 'push') {
        const wanted = args.slice(2).filter((a) => !a.startsWith('-')).slice(1);
        const names = wanted.length ? wanted : state.experiments.map((e) => e.name ?? e.id);
        const remoteSet = ((state.expRemotes ??= {})[target] ??= []);
        for (const n of names) if (!remoteSet.includes(n)) remoteSet.push(n);
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
    if (esub === 'list') {
      if (!state.experiments.length) return { state, result: ok('No experiments to list.') };
      const base = state.gitCommits[state.gitCommits.length - 1]?.hash ?? 'HEAD';
      return { state, result: ok([`${base}:`, ...state.experiments.map((e) => `\t${e.name ?? e.id} [${e.id}]`)].join('\n')) };
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
