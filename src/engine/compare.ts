import type { GoalCheck, RepoState } from './types';
import { computeDirtyPaths } from './state';

function pathInCommitFiles(files: string[] | undefined, pattern: string): boolean {
  if (!files?.length) return false;
  return files.some((f) => f === pattern || f.startsWith(pattern.endsWith('/') ? pattern : `${pattern}/`) || f.startsWith(pattern));
}

export interface GoalStatus {
  met: boolean;
  label: string;
  detail: string;
  /** Optional concrete command learners can type next. */
  command?: string;
}

function checkOne(state: RepoState, check: GoalCheck): GoalStatus {
  switch (check.kind) {
    case 'initialized': {
      const want = check.value !== false;
      const met = state.initialized === want;
      return {
        met,
        label: want ? 'DVC initialized' : 'DVC not initialized',
        detail: met ? 'ok' : want ? 'run `dvc init`' : 'DVC is already initialized',
        command: want && !met ? 'dvc init' : undefined,
      };
    }
    case 'tracked': {
      const missing = check.paths.filter((p) => !state.files[p]?.tracked);
      return {
        met: missing.length === 0,
        label: `Tracked: ${check.paths.join(', ')}`,
        detail: missing.length ? `missing tracking for ${missing.join(', ')}` : 'ok',
      };
    }
    case 'pointer': {
      const f = state.files[check.path];
      const has = !!f?.tracked && !!f?.pointerMd5;
      const md5Ok = !check.md5 || f?.pointerMd5 === check.md5 || (f?.pointerMd5 !== undefined && check.md5 === undefined);
      // pointer means tracked + has md5; optional exact md5
      const exact = check.md5 ? f?.pointerMd5 === check.md5 : has;
      return {
        met: has && exact && md5Ok,
        label: `Pointer for ${check.path}`,
        detail: has ? `md5=${f.pointerMd5!.slice(0, 8)}…` : 'no .dvc pointer yet',
      };
    }
    case 'cacheHas': {
      // resolve aliases: 'tracked:<path>' means current pointer of path
      const resolved = check.md5s.map((m) => {
        if (m.startsWith('tracked:')) {
          return state.files[m.slice(8)]?.pointerMd5 ?? '';
        }
        return m;
      });
      const miss2 = resolved.filter((m) => !m || !state.cache.includes(m));
      return {
        met: miss2.length === 0,
        label: 'Cache contains required objects',
        detail: miss2.length ? `cache missing ${miss2.length} object(s)` : 'ok',
      };
    }
    case 'cacheLacks': {
      const present = check.md5s.filter((m) => state.cache.includes(m));
      return {
        met: present.length === 0,
        label: 'Cache does not hold specific objects',
        detail: present.length ? `still cached: ${present.map((p) => p.slice(0, 8)).join(', ')}` : 'ok',
      };
    }
    case 'remoteConfigured': {
      const remotes = state.remotes.filter((r) => {
        if (check.name && r.name !== check.name) return false;
        if (check.default !== undefined && r.isDefault !== check.default) return false;
        return true;
      });
      return {
        met: remotes.length > 0,
        label: check.name ? `Remote '${check.name}'` : 'Remote configured',
        detail: remotes.length ? remotes[0].url : 'no matching remote',
      };
    }
    case 'remoteHas': {
      const resolved = check.md5s.map((m) =>
        m.startsWith('tracked:') ? state.files[m.slice(8)]?.pointerMd5 ?? '' : m,
      );
      const miss = resolved.filter((m) => !m || !state.remoteObjects.includes(m));
      return {
        met: miss.length === 0,
        label: 'Remote holds required objects',
        detail: miss.length ? `remote missing ${miss.length} object(s)` : 'ok',
      };
    }
    case 'remoteLacks': {
      const present = check.md5s.filter((m) => state.remoteObjects.includes(m));
      return {
        met: present.length === 0,
        label: 'Remote does not hold specific objects',
        detail: present.length ? 'objects already pushed' : 'ok',
      };
    }
    case 'workspaceHas': {
      const missing = check.paths.filter((p) => !state.files[p]?.present);
      return {
        met: missing.length === 0,
        label: `Workspace has ${check.paths.join(', ')}`,
        detail: missing.length ? `missing ${missing.join(', ')}` : 'ok',
      };
    }
    case 'workspaceMissing': {
      const present = check.paths.filter((p) => state.files[p]?.present);
      return {
        met: present.length === 0,
        label: `Workspace missing ${check.paths.join(', ')}`,
        detail: present.length ? `still present: ${present.join(', ')}` : 'ok',
      };
    }
    case 'stageExists': {
      const met = state.pipeline.some((s) => s.name === check.name);
      return {
        met,
        label: `Stage '${check.name}' exists`,
        detail: met ? 'ok' : 'define with `dvc stage add`',
      };
    }
    case 'stageUpToDate': {
      const s = state.pipeline.find((x) => x.name === check.name);
      return {
        met: !!s?.upToDate,
        label: `Stage '${check.name}' reproduced`,
        detail: s?.upToDate ? 'ok' : s ? 'run `dvc repro`' : 'stage missing',
      };
    }
    case 'metricsExact': {
      const v = state.metrics[check.key];
      const met = v !== undefined && Math.abs(v - check.value) < 1e-9;
      return {
        met,
        label: `${check.key} = ${check.value}`,
        detail: v === undefined ? 'metric not produced' : `current=${v}`,
      };
    }
    case 'metricsAtLeast': {
      const v = state.metrics[check.key];
      const met = v !== undefined && v >= check.value;
      return {
        met,
        label: `${check.key} ≥ ${check.value}`,
        detail: v === undefined ? 'metric not produced' : `current=${v}`,
      };
    }
    case 'paramsAt': {
      const v = state.params[check.key];
      return {
        met: v === check.value,
        label: `${check.key} = ${check.value}`,
        detail: `current=${v}`,
      };
    }
    case 'experimentCount': {
      const met = state.experiments.length >= check.min;
      return {
        met,
        label: `At least ${check.min} experiment(s)`,
        detail: `current=${state.experiments.length}`,
      };
    }
    case 'gitCommitMessageIncludes': {
      const hit = state.gitCommits.find((c) => {
        if (!c.message.includes(check.text)) return false;
        if (check.requireFilesAny?.length) {
          return check.requireFilesAny.some((p) => pathInCommitFiles(c.files, p));
        }
        return true;
      });
      return {
        met: !!hit,
        label: check.requireFilesAny?.length
          ? `Commit "${check.text}" includes ${check.requireFilesAny.join(' / ')}`
          : `Commit message contains "${check.text}"`,
        detail: hit ? `ok (${hit.hash})` : `log: ${state.gitCommits.map((c) => c.message).join(' | ') || '(empty)'}`,
      };
    }
    case 'gitStagedIncludesAny': {
      const met = check.paths.some((p) =>
        state.gitStaged.some(
          (s) => s === p || s.startsWith(p.endsWith('/') ? p : `${p}/`) || s.startsWith(p),
        ),
      );
      return {
        met,
        label: `Staged includes ${check.paths.join(' or ')}`,
        detail: met
          ? 'ok'
          : state.gitStaged.length
            ? `staged: ${state.gitStaged.join(', ')}`
            : 'nothing staged',
      };
    }
    case 'notDirty': {
      const dirty = computeDirtyPaths(state);
      return {
        met: dirty.length === 0,
        label: 'No dirty DVC-tracked data',
        detail: dirty.length ? `dirty: ${dirty.join(', ')}` : 'ok',
      };
    }
    case 'allOf': {
      const results = check.checks.map((c) => checkOne(state, c));
      return {
        met: results.every((r) => r.met),
        label: results.map((r) => r.label).join(' · '),
        detail: results.filter((r) => !r.met).map((r) => r.detail).join('; ') || 'ok',
      };
    }
    default: {
      return { met: false, label: 'Unknown goal', detail: 'unknown check' };
    }
  }
}

export function evaluateGoal(state: RepoState, goal: GoalCheck): { solved: boolean; statuses: GoalStatus[] } {
  if (goal.kind === 'allOf') {
    const statuses = goal.checks.map((c) => checkOne(state, c));
    return { solved: statuses.every((s) => s.met), statuses };
  }
  const single = checkOne(state, goal);
  return { solved: single.met, statuses: [single] };
}

export function flattenGoal(goal: GoalCheck): GoalCheck[] {
  return goal.kind === 'allOf' ? goal.checks : [goal];
}
