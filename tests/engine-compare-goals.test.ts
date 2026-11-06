import { describe, expect, it } from 'vitest';
import { evaluateGoal } from '../src/engine/compare';
import { emptyState, makeFile } from '../src/engine/state';
import type { GoalCheck, RepoState } from '../src/engine/types';

function one(state: RepoState, goal: GoalCheck) {
  const { solved, statuses } = evaluateGoal(state, goal);
  expect(statuses).toHaveLength(1);
  return { solved, ...statuses[0]! };
}

/** States saved by older versions of the app lack the optional fields; goals must still evaluate. */
function legacy(): RepoState {
  const s = emptyState();
  const l = s as Partial<RepoState>;
  delete l.runCache;
  delete l.expQueue;
  delete l.dvcIgnore;
  delete l.dvcConfig;
  delete l.dvcConfigLocal;
  delete l.gitTags;
  delete l.hooks;
  return s;
}

describe('evaluateGoal on states without optional fields', () => {
  it('runCacheHits counts zero hits', () => {
    expect(one(legacy(), { kind: 'runCacheHits', min: 1 })).toMatchObject({ solved: false, detail: 'current=0' });
    expect(one(legacy(), { kind: 'runCacheHits', min: 0 }).solved).toBe(true);
  });

  it('expQueueSize counts only finished experiments', () => {
    const s = legacy();
    expect(one(s, { kind: 'expQueueSize', min: 1 })).toMatchObject({ solved: false, detail: 'done=0 queued=0' });
    s.experiments.push({ id: 'e1', name: 'a', params: {}, metrics: {} } as RepoState['experiments'][number]);
    expect(one(s, { kind: 'expQueueSize', min: 1 })).toMatchObject({ solved: true, detail: 'done=1 queued=0' });
  });

  it('expQueueSize adds the queue to finished experiments', () => {
    const s = emptyState();
    s.experiments.push({ id: 'e1', name: 'a', params: {}, metrics: {} } as RepoState['experiments'][number]);
    s.expQueue = [{ id: 'q1' } as RepoState['expQueue'][number]];
    expect(one(s, { kind: 'expQueueSize', min: 2 })).toMatchObject({ solved: true, detail: 'done=1 queued=1' });
    expect(one(s, { kind: 'expQueueSize', min: 3 }).solved).toBe(false);
  });

  it('ignoredPath reports an empty .dvcignore', () => {
    expect(one(legacy(), { kind: 'ignoredPath', path: 'scratch' })).toMatchObject({
      solved: false,
      detail: 'ignores: (none)',
    });
  });

  it('ignoredPath lists what is ignored when the path is not', () => {
    const s = emptyState();
    s.dvcIgnore = ['logs/*', 'tmp'];
    expect(one(s, { kind: 'ignoredPath', path: 'scratch' }).detail).toBe('ignores: logs/*, tmp');
  });

  it('liveMetricLogged needs at least one logged point of that metric', () => {
    const s = emptyState();
    expect(one(s, { kind: 'liveMetricLogged', name: 'acc' })).toMatchObject({ solved: false, detail: 'points=0' });
    s.live.metrics.acc = [0.5, 0.6];
    expect(one(s, { kind: 'liveMetricLogged', name: 'acc' })).toMatchObject({ solved: true, detail: 'points=2' });
    expect(one(s, { kind: 'liveMetricLogged', name: 'loss' }).solved).toBe(false);
  });

  it('gitTag, hooksInstalled and configEquals report unset values', () => {
    const s = legacy();
    expect(one(s, { kind: 'gitTag', name: 'v1' }).solved).toBe(false);
    expect(one(s, { kind: 'hooksInstalled' })).toMatchObject({ solved: false, command: 'dvc install' });
    expect(one(s, { kind: 'configEquals', key: 'cache.type', value: 'symlink' })).toMatchObject({
      solved: false,
      detail: 'not set',
    });
  });

  it('hooksInstalled offers no command once installed', () => {
    const s = emptyState();
    s.hooks = { installed: true };
    const r = one(s, { kind: 'hooksInstalled' });
    expect(r.solved).toBe(true);
    expect(r.command).toBeUndefined();
  });
});

describe('evaluateGoal: remaining edge cases', () => {
  it('remoteHas resolves tracked:<path> and treats an untracked path as missing', () => {
    const s = emptyState();
    s.files['d'] = makeFile('d', 'data', { tracked: true, pointerMd5: 'p1' });
    expect(one(s, { kind: 'remoteHas', md5s: ['tracked:d'] })).toMatchObject({
      solved: false,
      detail: 'remote missing 1 object(s)',
    });
    s.remoteObjects.push('p1');
    expect(one(s, { kind: 'remoteHas', md5s: ['tracked:d'] }).solved).toBe(true);
    expect(one(s, { kind: 'remoteHas', md5s: ['tracked:nope'] }).solved).toBe(false);
    expect(one(s, { kind: 'remoteHas', md5s: ['p1', 'zzz'] }).detail).toBe('remote missing 1 object(s)');
  });

  it('cacheHas counts every missing object', () => {
    const s = emptyState();
    s.cache.push('a');
    expect(one(s, { kind: 'cacheHas', md5s: ['a', 'b', 'c'] })).toMatchObject({
      solved: false,
      detail: 'cache missing 2 object(s)',
    });
  });

  it('remoteLacks is only solved while none of the objects were pushed', () => {
    const s = emptyState();
    expect(one(s, { kind: 'remoteLacks', md5s: ['x'] }).solved).toBe(true);
    s.remoteObjects.push('x');
    expect(one(s, { kind: 'remoteLacks', md5s: ['x'] })).toMatchObject({ solved: false, detail: 'objects already pushed' });
  });

  it('gitCommitMessageIncludes with requiredFiles ignores commits that carry no file list', () => {
    const s = emptyState();
    s.gitCommits.push({
      hash: 'h1', message: 'Track data', pointers: {}, pipelineSig: '', params: {}, metrics: {},
      files: undefined as unknown as string[],
    });
    expect(one(s, { kind: 'gitCommitMessageIncludes', text: 'Track', requireFilesAny: ['a.dvc'] }).solved).toBe(false);
    expect(one(s, { kind: 'gitCommitMessageIncludes', text: 'Track' }).solved).toBe(true);
  });

  it('gitCommitMessageIncludes with several candidate files is satisfied by any of them', () => {
    const s = emptyState();
    s.gitCommits.push({
      hash: 'h1', message: 'Track data', pointers: {}, pipelineSig: '', params: {}, metrics: {}, files: ['dvc.yaml'],
    });
    const goal: GoalCheck = { kind: 'gitCommitMessageIncludes', text: 'Track', requireFilesAny: ['a.dvc', 'dvc.yaml'] };
    const r = one(s, goal);
    expect(r.solved).toBe(true);
    expect(r.label).toBe('Commit "Track" includes a.dvc / dvc.yaml');
  });

  it('a stale stage is reported as such by stageUpToDate and stagesUpToDate', () => {
    const s = emptyState();
    s.pipeline.push({ name: 'train', deps: [], outs: [], cmd: 'x', params: [], metrics: [], frozen: false, upToDate: false });
    expect(one(s, { kind: 'stageUpToDate', name: 'train' })).toMatchObject({ solved: false, detail: 'run `dvc repro`' });
    expect(one(s, { kind: 'stageUpToDate', name: 'prep' })).toMatchObject({ solved: false, detail: 'stage missing' });
    expect(one(s, { kind: 'stagesUpToDate', names: ['train', 'prep'] })).toMatchObject({
      solved: false,
      detail: 'stale: train, prep',
    });
  });

  it('experimentNamed with exists:false is solved only once the experiment is gone', () => {
    const s = emptyState();
    expect(one(s, { kind: 'experimentNamed', name: 'e', exists: false })).toMatchObject({ solved: true, label: "Experiment 'e' removed" });
    s.experiments.push({ id: 'x', name: 'e', params: {}, metrics: {} } as RepoState['experiments'][number]);
    expect(one(s, { kind: 'experimentNamed', name: 'e', exists: false })).toMatchObject({
      solved: false,
      detail: 'still listed in `dvc exp list`',
    });
    expect(one(s, { kind: 'experimentNamed', name: 'e', exists: true }).solved).toBe(true);
    expect(one(s, { kind: 'experimentNamed', name: 'other', exists: true })).toMatchObject({
      solved: false,
      detail: 'not saved yet',
    });
  });
});
