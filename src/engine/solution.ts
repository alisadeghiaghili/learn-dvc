import type { GoalCheck, LevelDef, RepoState, SolutionStepStatus } from './types';
import { isDirtyFile } from './state';

/** Extract `git commit -m "..."` message (best-effort). */
function commitMessageOf(cmd: string): string | null {
  const m = cmd.match(/git\s+commit\b[\s\S]*-m\s+(?:"([^"]*)"|'([^']*)'|(\S+))/i);
  if (!m) return null;
  return m[1] ?? m[2] ?? m[3] ?? null;
}

function pathInList(staged: string[], target: string): boolean {
  return staged.some((s) => {
    if (s === target) return true;
    if (target === '.dvc' || target.endsWith('/')) {
      return s === target || s.startsWith(target.endsWith('/') ? target : `${target}/`) || s.startsWith('.dvc');
    }
    return s.startsWith(target) || s.endsWith(target);
  });
}

function commitFilesMatch(files: string[] | undefined, patterns: string[]): boolean {
  if (!files?.length) return false;
  return patterns.some((p) => pathInList(files, p));
}

/**
 * Map each solution command to a state-derived completion flag.
 * The Goal panel lists these commands verbatim so learners always know
 * the exact next step from the official solution.
 */
export function solutionProgress(state: RepoState, solution: string[]): SolutionStepStatus[] {
  return solution.map((command) => stepStatus(state, command, solution));
}

function stepStatus(state: RepoState, command: string, solution: string[] = [command]): SolutionStepStatus {
  const cmd = command.trim();
  const fail = (note: string): SolutionStepStatus => ({ command: cmd, done: false, note });
  const ok = (note: string): SolutionStepStatus => ({ command: cmd, done: true, note });

  if (/^dvc\s+init\b/.test(cmd)) {
    return state.initialized ? ok('DVC project initialized') : fail('run `dvc init`');
  }

  if (/^git\s+add\b/.test(cmd)) {
    const paths = cmd.split(/\s+/).slice(2).filter((p) => !p.startsWith('-'));
    const stagedNow = paths.some((p) => pathInList(state.gitStaged, p));
    if (stagedNow) return ok('paths staged');
    // Historical baseline commits may already contain these paths; only credit
    // "git add" when the level's git commit step is also satisfied.
    const commitCmds = solution.filter((c) => /^git\s+commit\b/.test(c));
    const commitDone = commitCmds.every((c) => stepStatus(state, c).done);
    const inHistory = commitDone && state.gitCommits.some((c) => commitFilesMatch(c.files, paths.length ? paths : ['.dvc']));
    if (inHistory) return ok('staged paths are in Git history');
    return fail(cmd);
  }

  if (/^git\s+commit\b/.test(cmd)) {
    const msg = commitMessageOf(cmd);
    if (!msg) return fail(cmd);
    const hit = state.gitCommits.find((c) => c.message.includes(msg));
    return hit ? ok(`committed (${hit.hash})`) : fail(`commit with message containing "${msg}"`);
  }

  if (/^dvc\s+add\b/.test(cmd)) {
    const path = cmd.split(/\s+/).filter((t) => !t.startsWith('-'))[2];
    const f = path ? state.files[path] : undefined;
    return f?.tracked ? ok(`tracked ${path}`) : fail(`track \`${path ?? 'path'}\``);
  }

  if (/^dvc\s+commit\b/.test(cmd)) {
    const anyTracked = Object.values(state.files).some((f) => f.tracked);
    if (!anyTracked) return fail('track data with `dvc add` first');
    const dirty = Object.values(state.files).filter((f) => isDirtyFile(f));
    if (dirty.length) return fail('run `dvc commit` to sync dirty data');
    const modified = Object.values(state.files).some(
      (f) => f.tracked && (state.dataVersions[f.path] ?? 0) > 0,
    );
    return modified ? ok('data pointers committed to cache') : fail('modify data, then run `dvc commit`');
  }

  if (/^dvc\s+remote\s+add\b/.test(cmd)) {
    const parts = cmd.split(/\s+/);
    const isDefault = parts.includes('-d') || parts.includes('--default');
    // dvc remote add [-d] <name> <url>
    const rest = parts.slice(parts.indexOf('add') + 1).filter((a) => !a.startsWith('-'));
    const name = rest[0];
    const remote = state.remotes.find((r) => (name ? r.name === name : r.isDefault));
    if (!remote) return fail(`configure remote \`${name ?? 'name'}\``);
    if (isDefault && !remote.isDefault) return fail('set this remote as default (`-d`)');
    return ok(`remote ${remote.name} → ${remote.url}`);
  }

  if (/^dvc\s+push\b/.test(cmd)) {
    const tracked = Object.values(state.files).filter((f) => f.tracked && f.pointerMd5);
    if (!tracked.length) return fail('nothing tracked to push');
    const allOnRemote = tracked.every((f) => state.remoteObjects.includes(f.pointerMd5!));
    return allOnRemote ? ok('objects on remote') : fail('run `dvc push`');
  }

  if (/^dvc\s+(pull|fetch)\b/.test(cmd)) {
    const pull = /^dvc\s+pull\b/.test(cmd);
    const tracked = Object.values(state.files).filter((f) => f.tracked && f.pointerMd5);
    if (!tracked.length) return fail('no tracked files');
    const inCache = tracked.every((f) => state.cache.includes(f.pointerMd5!));
    const present = !pull || tracked.every((f) => f.present);
    return inCache && present ? ok('data available locally') : fail(cmd.startsWith('dvc pull') ? 'run `dvc pull`' : 'run `dvc fetch`');
  }

  if (/^edit\b/.test(cmd)) {
    const path = cmd.split(/\s+/)[1];
    if (!path) return fail(cmd);
    const f = state.files[path];
    if (!f) return fail(`file ${path} missing`);
    const changed =
      path === 'params.yaml'
        ? cmd.includes('=') && (state.dataVersions['params.yaml'] !== undefined || cmd.split(/\s+/)[2])
        : f.tracked
          ? f.contentId !== f.pointerMd5 || (state.dataVersions[path] ?? 0) > 0
          : true;
    // params: if command sets key=val, check params
    if (path === 'params.yaml') {
      const kv = cmd.split(/\s+/)[2]?.split('=');
      if (kv?.length === 2) {
        const key = kv[0];
        const raw = kv[1];
        const val = Number.isNaN(Number(raw)) ? raw : Number(raw);
        return state.params[key] === val ? ok(`${key}=${val}`) : fail(cmd);
      }
    }
    return changed || (state.dataVersions[path] ?? 0) > 0 ? ok(`modified ${path}`) : fail(cmd);
  }

  if (/^dvc\s+stage\s+add\b/.test(cmd)) {
    const nameIdx = cmd.split(/\s+/).indexOf('-n');
    const name = nameIdx >= 0 ? cmd.split(/\s+/)[nameIdx + 1] : undefined;
    if (!name) return fail(cmd);
    return state.pipeline.some((s) => s.name === name) ? ok(`stage ${name}`) : fail(cmd);
  }

  if (/^dvc\s+repro\b/.test(cmd)) {
    if (!state.pipeline.length) return fail('define a stage first');
    const allUp = state.pipeline.every((s) => s.upToDate);
    return allUp ? ok('pipeline up to date') : fail('run `dvc repro`');
  }

  if (/^dvc\s+exp\s+run\b/.test(cmd)) {
    const sets = cmd.match(/-S\s+([A-Za-z0-9_.]+)=([^\s]+)/g) ?? [];
    if (!sets.length) {
      return state.experiments.length ? ok(`${state.experiments.length} exp(s)`) : fail(cmd);
    }
    // Each -S in solution should appear in at least one experiment's params.
    const allRecorded = sets.every((s) => {
      const kv = s.replace(/^-S\s+/, '').split('=');
      const key = kv[0];
      const raw = kv[1];
      const val = Number.isNaN(Number(raw)) ? raw : Number(raw);
      return state.experiments.some((e) => e.params[key] === val);
    });
    return allRecorded ? ok('sweep recorded') : fail(cmd);
  }

  if (/^dvc\s+exp\s+apply\b/.test(cmd)) {
    const id = cmd.split(/\s+/)[3] ?? '';
    if (!state.lastAppliedExpId) return fail(cmd);
    const applied = state.experiments.find((e) => e.id === state.lastAppliedExpId);
    if (!applied) return fail(cmd);
    if (id && id !== 'exp-' && !applied.id.startsWith(id) && applied.id !== id) {
      return fail(cmd);
    }
    const paramsMatch = Object.entries(applied.params).every(([k, v]) => state.params[k] === v);
    return paramsMatch ? ok(`applied ${applied.id}`) : fail(cmd);
  }

  if (/^dvc\s+status\b/.test(cmd)) {
    return { command: cmd, done: true, note: 'inspect status (does not block completion)', optional: true };
  }

  if (/^dvc\s+metrics\s+show\b/.test(cmd) || /^dvc\s+params\s+show\b/.test(cmd) || /^dvc\s+exp\s+show\b/.test(cmd)) {
    return { command: cmd, done: true, note: 'inspect output (does not block completion)', optional: true };
  }

  if (/^dvc\s+dag\b/.test(cmd)) {
    return state.pipeline.length ? ok('pipeline exists') : fail(cmd);
  }

  // Unknown custom command — leave unchecked unless solver marked goal via state.
  return fail(cmd);
}

/** Level is solved when every required official solution step is complete. */
export function solutionComplete(state: RepoState, solution: string[]): boolean {
  return solutionProgress(state, solution).every((s) => s.done || s.optional);
}

/** Prefer solution checklist; fall back to declarative goal checks for labels. */
export function goalChecklist(state: RepoState, level: LevelDef): SolutionStepStatus[] {
  return solutionProgress(state, level.solution);
}

export function suggestFromSolution(state: RepoState, level: LevelDef | null): string | null {
  if (!level) return null;
  const steps = solutionProgress(state, level.solution);
  const next = steps.find((s) => !s.done);
  return next?.command ?? null;
}

/** Keep declarative goal in sync for any leftover state checks (tests, dock notes). */
export function flattenGoalChecks(goal: GoalCheck): GoalCheck[] {
  return goal.kind === 'allOf' ? goal.checks : [goal];
}
