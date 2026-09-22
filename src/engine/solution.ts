import type { GoalCheck, LevelDef, RepoState, SolutionStepStatus } from './types';
import { isDirtyFile, parseKeyValue } from './state';

function commitMessageOf(cmd: string): string | null {
  const m = cmd.match(/git\s+commit\b[\s\S]*-m\s+(?:"([^"]*)"|'([^']*)'|(\S+))/i);
  if (!m) return null;
  return m[1] ?? m[2] ?? m[3] ?? null;
}

function normalizeWs(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

function pathInList(list: string[], target: string): boolean {
  return list.some((s) => {
    if (s === target) return true;
    if (target === '.dvc') {
      return s === '.dvc' || s.startsWith('.dvc/') || s.startsWith('.dvc');
    }
    if (target.endsWith('/')) {
      return s === target || s.startsWith(target);
    }
    return s === target || s.startsWith(`${target}/`) || s.endsWith(target) || s.includes(target);
  });
}

function commandInHistory(state: RepoState, matcher: (cmd: string) => boolean): boolean {
  return (state.commandHistory ?? []).some((c) => matcher(normalizeWs(c)));
}

function parseArgs(cmd: string): string[] {
  return normalizeWs(cmd).split(' ');
}

function flagValues(cmd: string, flag: string): string[] {
  const parts = parseArgs(cmd);
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === flag && parts[i + 1]) out.push(parts[i + 1]!);
  }
  return out;
}

function setParamsOf(cmd: string): Record<string, string | number> {
  const parts = parseArgs(cmd);
  const out: Record<string, string | number> = {};
  for (let i = 0; i < parts.length; i++) {
    if ((parts[i] === '-S' || parts[i] === '--set-param' || parts[i] === '-s') && parts[i + 1]) {
      const kv = parts[i + 1]!.split('=');
      if (kv.length === 2) {
        const raw = kv[1]!;
        out[kv[0]!] = Number.isNaN(Number(raw)) ? raw : Number(raw);
      }
    }
  }
  return out;
}

/** True when historyCmd successfully covers the solution command (possibly more specific). */
function matchSolutionCommand(historyCmd: string, solutionCmd: string): boolean {
  const h = normalizeWs(historyCmd);
  const s = normalizeWs(solutionCmd);
  if (h === s) return true;
  if (h.startsWith(`${s} `) || s.startsWith(`${h} `)) return true;

  if (/^git\s+checkout\b/i.test(s) && /^git\s+checkout\b/i.test(h)) {
    const sRef = parseArgs(s)[2] ?? '';
    const hRef = parseArgs(h)[2] ?? '';
    return sRef === hRef || h.startsWith(normalizeWs(s)) || s.startsWith(normalizeWs(h));
  }

  const verb = (c: string) => c.split(' ').slice(0, 2).join(' ').toLowerCase();

  if (/^git\s+add\b/i.test(s) && /^git\s+add\b/i.test(h)) {
    const sPaths = parseArgs(s).slice(2).filter((a) => !a.startsWith('-'));
    const hPaths = parseArgs(h).slice(2).filter((a) => !a.startsWith('-'));
    return sPaths.some((p) => pathInList(hPaths, p));
  }
  if (/^git\s+commit\b/i.test(s) && /^git\s+commit\b/i.test(h)) {
    const sm = commitMessageOf(s);
    const hm = commitMessageOf(h);
    return !!sm && !!hm && (hm === sm || hm.includes(sm) || sm.includes(hm));
  }
  if (/^dvc\s+add\b/i.test(s) && /^dvc\s+add\b/i.test(h)) {
    const sp = parseArgs(s).filter((t) => !t.startsWith('-'))[2];
    const hp = parseArgs(h).filter((t) => !t.startsWith('-'))[2];
    return !!sp && sp === hp;
  }
  if (/^dvc\s+remote\s+add\b/i.test(s) && /^dvc\s+remote\s+add\b/i.test(h)) {
    const sName = parseArgs(s).filter((a) => !a.startsWith('-')).slice(3)[0];
    const hName = parseArgs(h).filter((a) => !a.startsWith('-')).slice(3)[0];
    return !sName || sName === hName;
  }
  if (/^dvc\s+stage\s+add\b/i.test(s) && /^dvc\s+stage\s+add\b/i.test(h)) {
    const sn = flagValues(s, '-n')[0];
    const hn = flagValues(h, '-n')[0];
    return !sn || sn === hn;
  }
  if (/^dvc\s+exp\s+run\b/i.test(s) && /^dvc\s+exp\s+run\b/i.test(h)) {
    const sSets = setParamsOf(s);
    const hSets = setParamsOf(h);
    return Object.entries(sSets).every(([k, v]) => hSets[k] === v || hSets[k] === String(v));
  }
  if (/^dvc\s+exp\s+apply\b/i.test(s) && /^dvc\s+exp\s+apply\b/i.test(h)) {
    return true; // any apply counts toward the apply solution line
  }
  if (/^edit\b/i.test(s) && /^edit\b/i.test(h)) {
    const sPath = parseArgs(s)[1];
    const hPath = parseArgs(h)[1];
    if (sPath !== hPath) return false;
    const sKv = parseArgs(s)[2];
    const hKv = parseArgs(h)[2];
    if (sKv?.includes('=') && hKv?.includes('=')) return sKv === hKv;
    return true;
  }

  return verb(h) === verb(s) && (h.startsWith(s) || s.startsWith(h));
}

/**
 * Steps whose live effect can legitimately disappear and require re-running.
 * History alone must NOT keep them checked when the effect is clearly gone.
 */
function liveEffectContradicts(state: RepoState, cmd: string): boolean {
  const c = normalizeWs(cmd);

  if (/^dvc\s+add\b/i.test(c)) {
    const path = parseArgs(c).filter((t) => !t.startsWith('-'))[2];
    const f = path ? state.files[path] : undefined;
    return !!f && !f.tracked;
  }
  if (/^dvc\s+repro\b/i.test(c)) {
    return state.pipeline.length > 0 && state.pipeline.some((s) => !s.upToDate);
  }
  if (/^dvc\s+push\b/i.test(c)) {
    const tracked = Object.values(state.files).filter((f) => f.tracked && f.pointerMd5);
    if (!tracked.length) return false;
    return tracked.some((f) => !state.remoteObjects.includes(f.pointerMd5!));
  }
  if (/^dvc\s+(pull|fetch)\b/i.test(c)) {
    const pull = /^dvc\s+pull\b/i.test(c);
    const tracked = Object.values(state.files).filter((f) => f.tracked && f.pointerMd5);
    if (!tracked.length) return false;
    return tracked.some((f) => {
      const md5 = f.pointerMd5!;
      const cached = state.cache.includes(md5);
      if (pull) return !f.present || !cached;
      return !cached;
    });
  }
  if (/^dvc\s+commit\b/i.test(c)) {
    return Object.values(state.files).some((f) => isDirtyFile(f));
  }
  if (/^edit\b/i.test(c)) {
    const path = parseArgs(c)[1];
    if (path === '.dvcignore') return false;
    const kv = parseArgs(c)[2];
    if (path === 'params.yaml' && kv?.includes('=')) {
      const parsed = parseKeyValue(kv);
      if (!parsed) return false;
      return state.params[parsed.key] !== parsed.value;
    }
    const f = path ? state.files[path] : undefined;
    if (f?.tracked && f.present) {
      return f.pointerMd5 === f.contentId && (state.dataVersions[path!] ?? 0) === 0;
    }
  }
  if (/^dvc\s+exp\s+apply\b/i.test(c)) {
    if (!state.lastAppliedExpId) return false;
    const applied = state.experiments.find((e) => e.id === state.lastAppliedExpId);
    if (!applied) return false;
    return Object.entries(applied.params).some(([k, v]) => state.params[k] !== v);
  }
  if (/^git\s+commit\b/i.test(c)) {
    return false;
  }

  return false;
}

function liveStatus(state: RepoState, cmd: string, solution: string[] = [cmd]): SolutionStepStatus {
  const fail = (note: string): SolutionStepStatus => ({ command: cmd, done: false, note });
  const ok = (note: string): SolutionStepStatus => ({ command: cmd, done: true, note });

  if (/^dvc\s+init\b/.test(cmd)) {
    return state.initialized ? ok('DVC project initialized') : fail('run `dvc init`');
  }

  if (/^git\s+checkout\b/.test(cmd)) {
    // Version-switch drills: success = command ran (pointer materialization checked via dvc checkout / goals).
    return commandInHistory(state, (h) => matchSolutionCommand(h, cmd))
      ? ok('checkout command executed')
      : fail(cmd);
  }

  if (/^git\s+add\b/.test(cmd)) {
    const paths = parseArgs(cmd).slice(2).filter((p) => !p.startsWith('-'));
    const stagedNow = paths.some((p) => pathInList(state.gitStaged, p));
    if (stagedNow) return ok('paths staged');
    const commitCmds = solution.filter((c) => /^git\s+commit\b/.test(c));
    const commitDone = commitCmds.every((c) => liveStatus(state, c, solution).done || commandInHistory(state, (h) => matchSolutionCommand(h, c)));
    if (commitDone && state.gitCommits.some((c) => pathInList(c.files ?? [], paths[0] ?? '.dvc'))) {
      return ok('staged paths are in Git history');
    }
    return fail(cmd);
  }

  if (/^git\s+commit\b/.test(cmd)) {
    const msg = commitMessageOf(cmd);
    if (!msg) return fail(cmd);
    const hit = state.gitCommits.find((c) => c.message.includes(msg));
    return hit ? ok(`committed (${hit.hash})`) : fail(`commit with message containing "${msg}"`);
  }

  if (/^dvc\s+add\b/.test(cmd)) {
    const path = parseArgs(cmd).filter((t) => !t.startsWith('-'))[2];
    const f = path ? state.files[path] : undefined;
    return f?.tracked ? ok(`tracked ${path}`) : fail(`track \`${path ?? 'path'}\``);
  }

  if (/^dvc\s+commit\b/.test(cmd)) {
    const anyTracked = Object.values(state.files).some((f) => f.tracked);
    if (!anyTracked) return fail('track data with `dvc add` first');
    if (Object.values(state.files).some((f) => isDirtyFile(f))) {
      return fail('run `dvc commit` to sync dirty data');
    }
    const modified = Object.values(state.files).some(
      (f) => f.tracked && (state.dataVersions[f.path] ?? 0) > 0,
    );
    return modified ? ok('data pointers committed to cache') : fail('modify data, then run `dvc commit`');
  }

  if (/^dvc\s+remote\s+add\b/.test(cmd)) {
    const parts = parseArgs(cmd);
    const isDefault = parts.includes('-d') || parts.includes('--default');
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
    return inCache && present
      ? ok('data available locally')
      : fail(pull ? 'run `dvc pull`' : 'run `dvc fetch`');
  }

  if (/^edit\b/.test(cmd)) {
    const path = parseArgs(cmd)[1];
    if (!path) return fail(cmd);
    const f = state.files[path];
    if (!f) return fail(`file ${path} missing`);
    if (path === 'params.yaml') {
      const kv = parseArgs(cmd)[2]?.split('=');
      if (kv?.length === 2) {
        const key = kv[0]!;
        const raw = kv[1]!;
        const val = Number.isNaN(Number(raw)) ? raw : Number(raw);
        return state.params[key] === val ? ok(`${key}=${val}`) : fail(cmd);
      }
    }
    const changed = f.tracked
      ? f.contentId !== f.pointerMd5 || (state.dataVersions[path] ?? 0) > 0
      : true;
    return changed || (state.dataVersions[path] ?? 0) > 0 ? ok(`modified ${path}`) : fail(cmd);
  }

  if (/^dvc\s+stage\s+add\b/.test(cmd)) {
    const name = flagValues(cmd, '-n')[0];
    if (!name) return fail(cmd);
    return state.pipeline.some((s) => s.name === name) ? ok(`stage ${name}`) : fail(cmd);
  }

  if (/^dvc\s+repro\b/.test(cmd)) {
    if (!state.pipeline.length) return fail('define a stage first');
    return state.pipeline.every((s) => s.upToDate) ? ok('pipeline up to date') : fail('run `dvc repro`');
  }

  if (/^dvc\s+exp\s+run\b/.test(cmd)) {
    const sets = setParamsOf(cmd);
    const keys = Object.keys(sets);
    const queued = /\s--queue\b/.test(cmd);
    if (queued) {
      const n = state.expQueue?.length ?? 0;
      return n > 0 ? ok(`${n} queued`) : fail(cmd);
    }
    if (!keys.length) {
      return state.experiments.length ? ok(`${state.experiments.length} exp(s)`) : fail(cmd);
    }
    const allRecorded = keys.every((key) =>
      state.experiments.some((e) => e.params[key] === sets[key] || String(e.params[key]) === String(sets[key])),
    );
    return allRecorded ? ok('sweep recorded') : fail(cmd);
  }

  if (/^dvc\s+exp\s+apply\b/.test(cmd)) {
    if (!state.lastAppliedExpId) return fail(cmd);
    const applied = state.experiments.find((e) => e.id === state.lastAppliedExpId);
    if (!applied) return fail(cmd);
    const paramsMatch = Object.entries(applied.params).every(([k, v]) => state.params[k] === v);
    return paramsMatch ? ok(`applied ${applied.id}`) : fail(cmd);
  }

  if (/^dvc\s+freeze\b/.test(cmd) || /^dvc\s+unfreeze\b/.test(cmd)) {
    const name = flagValues(cmd, '-n')[0] ?? parseArgs(cmd)[2];
    const freeze = /^dvc\s+freeze\b/.test(cmd);
    const stage = state.pipeline.find((s) => s.name === name);
    if (!stage) return fail(cmd);
    return stage.frozen === freeze ? ok(`stage ${name} ${freeze ? 'frozen' : 'unfrozen'}`) : fail(cmd);
  }

  if (/^dvc\s+diff\b/.test(cmd)) {
    return { command: cmd, done: true, note: 'inspect drift (does not block completion)', optional: true };
  }

  if (/^dvc\s+live\b/i.test(cmd) || /^dvc\s+queue\b/i.test(cmd) || /^dvc\s+update\b/i.test(cmd) || /^dvc\s+cml\b/i.test(cmd) || /^dvc\s+api\b/i.test(cmd)) {
    if (commandInHistory(state, (h) => matchSolutionCommand(h, cmd))) {
      return ok('ran');
    }
    if (/^dvc\s+live\s+log\s+metric\s+(\S+)/i.test(cmd)) {
      const m = cmd.match(/metric\s+([^=\s]+)=/i);
      const name = m?.[1];
      if (name && (state.live?.metrics?.[name]?.length ?? 0) > 0) return ok(`live metric ${name}`);
    }
    if (/^dvc\s+queue\s+start/i.test(cmd) || /--run-all/.test(cmd)) {
      return (state.expQueue?.length ?? 0) === 0 && state.experiments.length > 0 ? ok('queue drained') : fail(cmd);
    }
    if (/^dvc\s+update\b/i.test(cmd)) {
      const path = parseArgs(cmd)[2];
      const dataPath = path?.endsWith('.dvc') ? path.slice(0, -4) : path;
      if (dataPath && (state.dataVersions[dataPath] ?? 0) > 0) return ok('import updated');
    }
    return fail(cmd);
  }

  if (/^edit\s+\.dvcignore\b/i.test(cmd)) {
    const pat = parseArgs(cmd)[2];
    return pat && (state.dvcIgnore ?? []).includes(pat) ? ok(`ignored ${pat}`) : fail(cmd);
  }

  if (/^dvc\s+plots\b/i.test(cmd)) {
    return { command: cmd, done: true, note: 'inspect plots (does not block completion)', optional: true };
  }

  if (/^dvc\s+status\b/.test(cmd)) {
    return { command: cmd, done: true, note: 'inspect status (does not block completion)', optional: true };
  }

  if (/^dvc\s+(metrics|params)\s+show\b/.test(cmd) || /^dvc\s+exp\s+show\b/.test(cmd)) {
    return { command: cmd, done: true, note: 'inspect output (does not block completion)', optional: true };
  }

  if (/^dvc\s+dag\b/.test(cmd)) {
    return state.pipeline.length ? ok('pipeline exists') : fail(cmd);
  }

  return fail(cmd);
}

/**
 * Checklist completion:
 * 1) live effects win when they hold
 * 2) otherwise, if the solution command already ran successfully this session,
 *    keep it checked — unless later work clearly contradicted that effect
 * 3) intermediate param edits (later solution step rewrites the same key) stay sticky once run
 */
function stepStatus(state: RepoState, command: string, solution: string[] = [command], index = 0): SolutionStepStatus {
  const cmd = command.trim();
  const live = liveStatus(state, cmd, solution);
  if (live.done || live.optional) return live;

  const ran = commandInHistory(state, (h) => matchSolutionCommand(h, cmd));
  const intermediateParamEdit = isIntermediateParamEdit(solution, index);
  if (ran && (intermediateParamEdit || !liveEffectContradicts(state, cmd))) {
    return {
      command: cmd,
      done: true,
      note: intermediateParamEdit ? 'ran (probe/round-trip step)' : 'already completed earlier',
    };
  }
  return live;
}

function isIntermediateParamEdit(solution: string[], index: number): boolean {
  const cmd = (solution[index] ?? '').trim();
  if (!/^edit\b/i.test(cmd)) return false;
  const key = parseKeyValue(parseArgs(cmd)[2] ?? '')?.key;
  if (!key) return false;
  return solution.slice(index + 1).some((c) => {
    if (!/^edit\b/i.test(c)) return false;
    return parseKeyValue(parseArgs(c)[2] ?? '')?.key === key;
  });
}

export function solutionProgress(state: RepoState, solution: string[]): SolutionStepStatus[] {
  return solution.map((command, index) => stepStatus(state, command, solution, index));
}

export function solutionComplete(state: RepoState, solution: string[]): boolean {
  return solutionProgress(state, solution).every((s) => s.done || s.optional);
}

export function goalChecklist(state: RepoState, level: LevelDef): SolutionStepStatus[] {
  return solutionProgress(state, level.solution);
}

export function suggestFromSolution(state: RepoState, level: LevelDef | null): string | null {
  if (!level) return null;
  const steps = solutionProgress(state, level.solution);
  const next = steps.find((s) => !s.done);
  return next?.command ?? null;
}

export function flattenGoalChecks(goal: GoalCheck): GoalCheck[] {
  return goal.kind === 'allOf' ? goal.checks : [goal];
}
