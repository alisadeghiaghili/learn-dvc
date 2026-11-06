import { describe, expect, it } from 'vitest';
import { evaluateGoal, flattenGoal } from '../src/engine/compare';
import { emptyState, makeFile } from '../src/engine/state';
import type { GoalCheck, RepoState } from '../src/engine/types';

function one(state: RepoState, goal: GoalCheck) {
  const { solved, statuses } = evaluateGoal(state, goal);
  expect(statuses).toHaveLength(1);
  return { solved, ...statuses[0]! };
}

function trackedState(): RepoState {
  const s = emptyState();
  s.initialized = true;
  s.files['data/data.xml'] = makeFile('data/data.xml', 'data', {
    tracked: true,
    pointerMd5: 'abcdef1234567890',
  });
  return s;
}

describe('evaluateGoal: initialized', () => {
  it('is met once DVC is initialized and tells learners otherwise to run dvc init', () => {
    expect(one(emptyState(), { kind: 'initialized' })).toMatchObject({
      solved: false,
      label: 'DVC initialized',
      detail: 'run `dvc init`',
      command: 'dvc init',
    });
    expect(one(trackedState(), { kind: 'initialized' })).toMatchObject({ solved: true, detail: 'ok' });
  });

  it('supports the negative form (value: false)', () => {
    expect(one(emptyState(), { kind: 'initialized', value: false })).toMatchObject({
      solved: true,
      label: 'DVC not initialized',
    });
    expect(one(trackedState(), { kind: 'initialized', value: false })).toMatchObject({
      solved: false,
      detail: 'DVC is already initialized',
      command: undefined,
    });
  });
});

describe('evaluateGoal: tracking and pointers', () => {
  it('tracked lists the paths still missing tracking', () => {
    const s = trackedState();
    expect(one(s, { kind: 'tracked', paths: ['data/data.xml'] }).solved).toBe(true);
    const r = one(s, { kind: 'tracked', paths: ['data/data.xml', 'models/m.pkl'] });
    expect(r.solved).toBe(false);
    expect(r.detail).toBe('missing tracking for models/m.pkl');
    expect(r.label).toBe('Tracked: data/data.xml, models/m.pkl');
  });

  it('pointer needs a tracked file with a recorded md5, optionally an exact one', () => {
    const s = trackedState();
    const ok = one(s, { kind: 'pointer', path: 'data/data.xml' });
    expect(ok.solved).toBe(true);
    expect(ok.detail).toBe('md5=abcdef12…');
    expect(one(s, { kind: 'pointer', path: 'data/data.xml', md5: 'abcdef1234567890' }).solved).toBe(true);
    expect(one(s, { kind: 'pointer', path: 'data/data.xml', md5: 'other' }).solved).toBe(false);
    const missing = one(s, { kind: 'pointer', path: 'nope.csv' });
    expect(missing).toMatchObject({ solved: false, detail: 'no .dvc pointer yet' });
  });
});

describe('evaluateGoal: cache and remote contents', () => {
  it('cacheHas resolves tracked:<path> aliases against the current pointer', () => {
    const s = trackedState();
    expect(one(s, { kind: 'cacheHas', md5s: ['tracked:data/data.xml'] })).toMatchObject({
      solved: false,
      detail: 'cache missing 1 object(s)',
    });
    s.cache.push('abcdef1234567890');
    expect(one(s, { kind: 'cacheHas', md5s: ['tracked:data/data.xml'] })).toMatchObject({ solved: true, detail: 'ok' });
    expect(one(s, { kind: 'cacheHas', md5s: ['abcdef1234567890'] }).solved).toBe(true);
    // an alias to an untracked path never resolves to a cached object
    expect(one(s, { kind: 'cacheHas', md5s: ['tracked:ghost'] }).solved).toBe(false);
  });

  it('cacheLacks fails and names the still cached objects', () => {
    const s = trackedState();
    expect(one(s, { kind: 'cacheLacks', md5s: ['abcdef1234567890'] }).solved).toBe(true);
    s.cache.push('abcdef1234567890');
    expect(one(s, { kind: 'cacheLacks', md5s: ['abcdef1234567890'] })).toMatchObject({
      solved: false,
      detail: 'still cached: abcdef12',
    });
  });

  it('remoteHas and remoteLacks look at the default remote storage', () => {
    const s = trackedState();
    expect(one(s, { kind: 'remoteHas', md5s: ['tracked:data/data.xml'] })).toMatchObject({
      solved: false,
      detail: 'remote missing 1 object(s)',
    });
    expect(one(s, { kind: 'remoteLacks', md5s: ['abcdef1234567890'] }).solved).toBe(true);
    s.remoteObjects.push('abcdef1234567890');
    expect(one(s, { kind: 'remoteHas', md5s: ['tracked:data/data.xml'] }).solved).toBe(true);
    expect(one(s, { kind: 'remoteHas', md5s: ['tracked:ghost'] }).solved).toBe(false);
    expect(one(s, { kind: 'remoteLacks', md5s: ['abcdef1234567890'] })).toMatchObject({
      solved: false,
      detail: 'objects already pushed',
    });
  });

  it('remoteConfigured filters by name and default flag', () => {
    const s = emptyState();
    s.remotes = [
      { name: 'a', url: '/tmp/a', isDefault: false },
      { name: 'b', url: 's3://b', isDefault: true },
    ];
    expect(one(s, { kind: 'remoteConfigured' })).toMatchObject({ solved: true, label: 'Remote configured', detail: '/tmp/a' });
    expect(one(s, { kind: 'remoteConfigured', name: 'b' })).toMatchObject({ solved: true, label: "Remote 'b'", detail: 's3://b' });
    expect(one(s, { kind: 'remoteConfigured', name: 'a', default: true }).solved).toBe(false);
    expect(one(s, { kind: 'remoteConfigured', default: true })).toMatchObject({ solved: true, detail: 's3://b' });
    expect(one(s, { kind: 'remoteConfigured', name: 'zzz' })).toMatchObject({ solved: false, detail: 'no matching remote' });
  });
});

describe('evaluateGoal: workspace and stages', () => {
  it('workspaceHas and workspaceMissing report what is absent or still there', () => {
    const s = trackedState();
    expect(one(s, { kind: 'workspaceHas', paths: ['data/data.xml'] }).solved).toBe(true);
    expect(one(s, { kind: 'workspaceHas', paths: ['data/data.xml', 'x'] })).toMatchObject({ solved: false, detail: 'missing x' });
    expect(one(s, { kind: 'workspaceMissing', paths: ['x'] }).solved).toBe(true);
    expect(one(s, { kind: 'workspaceMissing', paths: ['data/data.xml'] })).toMatchObject({
      solved: false,
      detail: 'still present: data/data.xml',
    });
    s.files['data/data.xml']!.present = false;
    expect(one(s, { kind: 'workspaceMissing', paths: ['data/data.xml'] }).solved).toBe(true);
  });

  it('stageExists, stageUpToDate and stagesUpToDate follow the pipeline', () => {
    const s = emptyState();
    s.pipeline = [
      { name: 'prep', deps: [], outs: [], cmd: 'x', params: [], metrics: [], frozen: false, upToDate: true },
      { name: 'train', deps: [], outs: [], cmd: 'y', params: [], metrics: [], frozen: false, upToDate: false },
    ];
    expect(one(s, { kind: 'stageExists', name: 'prep' }).solved).toBe(true);
    expect(one(s, { kind: 'stageExists', name: 'nope' })).toMatchObject({ solved: false, detail: 'define with `dvc stage add`' });
    expect(one(s, { kind: 'stageUpToDate', name: 'prep' })).toMatchObject({ solved: true, detail: 'ok' });
    expect(one(s, { kind: 'stageUpToDate', name: 'train' })).toMatchObject({ solved: false, detail: 'run `dvc repro`' });
    expect(one(s, { kind: 'stageUpToDate', name: 'nope' })).toMatchObject({ solved: false, detail: 'stage missing' });
    expect(one(s, { kind: 'stagesUpToDate', names: ['prep'] }).solved).toBe(true);
    expect(one(s, { kind: 'stagesUpToDate', names: ['prep', 'train', 'nope'] })).toMatchObject({
      solved: false,
      detail: 'stale: train, nope',
    });
  });
});

describe('evaluateGoal: metrics, params and experiments', () => {
  it('metricsExact needs the metric to exist and equal the target', () => {
    const s = emptyState();
    expect(one(s, { kind: 'metricsExact', key: 'auc', value: 0.9 })).toMatchObject({ solved: false, detail: 'metric not produced', label: 'auc = 0.9' });
    s.metrics.auc = 0.9;
    expect(one(s, { kind: 'metricsExact', key: 'auc', value: 0.9 }).solved).toBe(true);
    expect(one(s, { kind: 'metricsExact', key: 'auc', value: 0.8 })).toMatchObject({ solved: false, detail: 'current=0.9' });
  });

  it('metricsAtLeast is a lower bound', () => {
    const s = emptyState();
    expect(one(s, { kind: 'metricsAtLeast', key: 'auc', value: 0.9 })).toMatchObject({ solved: false, detail: 'metric not produced', label: 'auc ≥ 0.9' });
    s.metrics.auc = 0.95;
    expect(one(s, { kind: 'metricsAtLeast', key: 'auc', value: 0.9 }).solved).toBe(true);
    expect(one(s, { kind: 'metricsAtLeast', key: 'auc', value: 0.99 })).toMatchObject({ solved: false, detail: 'current=0.95' });
  });

  it('paramsAt compares strictly', () => {
    const s = emptyState();
    s.params.lr = 0.1;
    expect(one(s, { kind: 'paramsAt', key: 'lr', value: 0.1 }).solved).toBe(true);
    expect(one(s, { kind: 'paramsAt', key: 'lr', value: 0.2 })).toMatchObject({ solved: false, detail: 'current=0.1' });
  });

  it('experimentCount, experimentNamed, runCacheHits, expQueueSize and liveMetricLogged', () => {
    const s = emptyState();
    expect(one(s, { kind: 'experimentCount', min: 1 })).toMatchObject({ solved: false, detail: 'current=0' });
    s.experiments.push({ id: 'abc', name: 'exp-a', commitRef: 'a1', params: {}, metrics: {} });
    expect(one(s, { kind: 'experimentCount', min: 1 }).solved).toBe(true);
    expect(one(s, { kind: 'experimentNamed', name: 'exp-a', exists: true }).solved).toBe(true);
    expect(one(s, { kind: 'experimentNamed', name: 'exp-a', exists: false })).toMatchObject({
      solved: false,
      detail: 'still listed in `dvc exp list`',
      label: "Experiment 'exp-a' removed",
    });
    expect(one(s, { kind: 'experimentNamed', name: 'exp-b', exists: true })).toMatchObject({
      solved: false,
      detail: 'not saved yet',
      label: "Experiment 'exp-b' kept",
    });
    expect(one(s, { kind: 'experimentNamed', name: 'exp-b', exists: false }).solved).toBe(true);

    expect(one(s, { kind: 'runCacheHits', min: 1 })).toMatchObject({ solved: false, detail: 'current=0' });
    s.runCache.push('sig');
    expect(one(s, { kind: 'runCacheHits', min: 1 }).solved).toBe(true);

    expect(one(s, { kind: 'expQueueSize', min: 2 })).toMatchObject({ solved: false, detail: 'done=1 queued=0' });
    s.expQueue.push({ id: 'q', params: {} });
    expect(one(s, { kind: 'expQueueSize', min: 2 })).toMatchObject({ solved: true, detail: 'done=1 queued=1' });

    expect(one(s, { kind: 'liveMetricLogged', name: 'loss' })).toMatchObject({ solved: false, detail: 'points=0' });
    s.live.metrics.loss = [0.5, 0.4];
    expect(one(s, { kind: 'liveMetricLogged', name: 'loss' })).toMatchObject({ solved: true, detail: 'points=2' });
  });
});

describe('evaluateGoal: git state', () => {
  function withCommit(): RepoState {
    const s = emptyState();
    s.gitCommits.push({
      hash: 'h1',
      message: 'Track data',
      pointers: {},
      pipelineSig: '',
      params: {},
      metrics: {},
      files: ['data/data.xml.dvc', 'models/'],
    });
    return s;
  }

  it('gitCommitMessageIncludes matches on message text, optionally on committed files', () => {
    const s = withCommit();
    expect(one(s, { kind: 'gitCommitMessageIncludes', text: 'Track' })).toMatchObject({
      solved: true,
      label: 'Commit message contains "Track"',
      detail: 'ok (h1)',
    });
    const withFiles = one(s, { kind: 'gitCommitMessageIncludes', text: 'Track', requireFilesAny: ['data/data.xml.dvc'] });
    expect(withFiles.solved).toBe(true);
    expect(withFiles.label).toBe('Commit "Track" includes data/data.xml.dvc');
    expect(one(s, { kind: 'gitCommitMessageIncludes', text: 'Track', requireFilesAny: ['models'] }).solved).toBe(true);
    expect(one(s, { kind: 'gitCommitMessageIncludes', text: 'Track', requireFilesAny: ['other.txt'] }).solved).toBe(false);
    const none = one(s, { kind: 'gitCommitMessageIncludes', text: 'Missing' });
    expect(none).toMatchObject({ solved: false, detail: 'log: Track data' });
    expect(one(emptyState(), { kind: 'gitCommitMessageIncludes', text: 'x' }).detail).toBe('log: (empty)');
  });

  it('gitStagedIncludesAny matches exact paths and directory prefixes', () => {
    const s = emptyState();
    expect(one(s, { kind: 'gitStagedIncludesAny', paths: ['a.dvc'] })).toMatchObject({ solved: false, detail: 'nothing staged' });
    s.gitStaged = ['data/a.dvc'];
    expect(one(s, { kind: 'gitStagedIncludesAny', paths: ['b'] })).toMatchObject({ solved: false, detail: 'staged: data/a.dvc' });
    expect(one(s, { kind: 'gitStagedIncludesAny', paths: ['data/'] })).toMatchObject({ solved: true, detail: 'ok' });
    expect(one(s, { kind: 'gitStagedIncludesAny', paths: ['data', 'zzz'] }).solved).toBe(true);
    expect(one(s, { kind: 'gitStagedIncludesAny', paths: ['data/a.dvc'] }).label).toBe('Staged includes data/a.dvc');
  });

  it('gitTag looks the tag up by name', () => {
    const s = emptyState();
    expect(one(s, { kind: 'gitTag', name: 'v1' })).toMatchObject({ solved: false, detail: 'tag not created yet' });
    s.gitTags = [{ name: 'v1', commit: 'h1' }];
    expect(one(s, { kind: 'gitTag', name: 'v1' })).toMatchObject({ solved: true, label: 'Git tag v1' });
  });
});

describe('evaluateGoal: ignore, imports, dirty data, hooks, config', () => {
  it('ignoredPath matches substrings in either direction', () => {
    const s = emptyState();
    expect(one(s, { kind: 'ignoredPath', path: 'tmp/' })).toMatchObject({ solved: false, detail: 'ignores: (none)' });
    s.dvcIgnore = ['tmp/'];
    expect(one(s, { kind: 'ignoredPath', path: 'tmp/' }).solved).toBe(true);
    expect(one(s, { kind: 'ignoredPath', path: 'tmp/cache/x' }).solved).toBe(true);
    expect(one(s, { kind: 'ignoredPath', path: 'logs/' })).toMatchObject({ solved: false, detail: 'ignores: tmp/' });
  });

  it('importUpdated requires a tracked import whose data version moved on', () => {
    const s = trackedState();
    expect(one(s, { kind: 'importUpdated', path: 'data/data.xml' })).toMatchObject({ solved: false, detail: 'run `dvc update`' });
    s.dataVersions['data/data.xml'] = 1;
    expect(one(s, { kind: 'importUpdated', path: 'data/data.xml' })).toMatchObject({ solved: true, detail: 'refreshed' });
  });

  it('notDirty lists tracked files whose workspace content drifted from the pointer', () => {
    const s = trackedState();
    s.files['data/data.xml']!.contentId = 'abcdef1234567890';
    expect(one(s, { kind: 'notDirty' })).toMatchObject({ solved: true, detail: 'ok' });
    s.files['data/data.xml']!.contentId = 'changed';
    expect(one(s, { kind: 'notDirty' })).toMatchObject({ solved: false, detail: 'dirty: data/data.xml' });
  });

  it('hooksInstalled suggests dvc install until the hooks exist', () => {
    const s = emptyState();
    expect(one(s, { kind: 'hooksInstalled' })).toMatchObject({ solved: false, command: 'dvc install', detail: 'run `dvc install`' });
    s.hooks = { installed: true };
    expect(one(s, { kind: 'hooksInstalled' })).toMatchObject({ solved: true, command: undefined });
  });

  it('configEquals reads shared config first and falls back to config.local', () => {
    const s = emptyState();
    expect(one(s, { kind: 'configEquals', key: 'cache.type', value: 'symlink' })).toMatchObject({ solved: false, detail: 'not set' });
    s.dvcConfig = { 'cache.type': 'copy' };
    expect(one(s, { kind: 'configEquals', key: 'cache.type', value: 'symlink' })).toMatchObject({ solved: false, detail: 'current=copy' });
    s.dvcConfig = {};
    s.dvcConfigLocal = { 'cache.type': 'symlink' };
    expect(one(s, { kind: 'configEquals', key: 'cache.type', value: 'symlink' }).solved).toBe(true);
  });
});

describe('evaluateGoal: allOf and unknown kinds', () => {
  it('allOf is solved only when every child is, with one status per child', () => {
    const s = trackedState();
    const goal: GoalCheck = {
      kind: 'allOf',
      checks: [{ kind: 'initialized' }, { kind: 'tracked', paths: ['nope'] }],
    };
    const r = evaluateGoal(s, goal);
    expect(r.solved).toBe(false);
    expect(r.statuses.map((x) => x.met)).toEqual([true, false]);
    s.files.nope = makeFile('nope', 'data', { tracked: true });
    expect(evaluateGoal(s, goal).solved).toBe(true);
  });

  it('a nested allOf is combined into one status listing the unmet details', () => {
    const s = emptyState();
    const goal: GoalCheck = {
      kind: 'allOf',
      checks: [
        { kind: 'allOf', checks: [{ kind: 'initialized' }, { kind: 'gitTag', name: 'v1' }] },
        { kind: 'allOf', checks: [{ kind: 'initialized', value: false }] },
      ],
    };
    const r = evaluateGoal(s, goal);
    expect(r.solved).toBe(false);
    expect(r.statuses[0]).toMatchObject({
      met: false,
      label: 'DVC initialized · Git tag v1',
      detail: 'run `dvc init`; tag not created yet',
    });
    expect(r.statuses[1]).toMatchObject({ met: true, detail: 'ok' });
  });

  it('an unrecognised goal kind is never satisfied', () => {
    const bogus = { kind: 'madeUp' } as unknown as GoalCheck;
    expect(evaluateGoal(emptyState(), bogus)).toEqual({
      solved: false,
      statuses: [{ met: false, label: 'Unknown goal', detail: 'unknown check' }],
    });
  });

  it('flattenGoal returns the children of allOf and wraps single goals', () => {
    const a: GoalCheck = { kind: 'initialized' };
    const b: GoalCheck = { kind: 'notDirty' };
    expect(flattenGoal({ kind: 'allOf', checks: [a, b] })).toEqual([a, b]);
    expect(flattenGoal(a)).toEqual([a]);
  });
});
