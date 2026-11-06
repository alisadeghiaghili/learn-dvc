import { describe, expect, it } from 'vitest';
import { fakeMd5 } from '../src/engine/hash';
import {
  addCache,
  addRemoteObject,
  applyDataEdit,
  cloneState,
  computeDirtyPaths,
  contentMd5,
  defaultRemote,
  emptyState,
  ensureGit,
  getParam,
  gitTree,
  isDirOut,
  isDirtyFile,
  isGitRepo,
  makeFile,
  parseKeyValue,
  pipelineSignature,
  pointerMd5For,
  removeWorkspaceFile,
  remoteStore,
  restoreWorkspaceFromPointer,
  sandboxState,
  setDefaultRemote,
  setParam,
  stageRunSig,
} from '../src/engine/state';
import type { PipelineStage, RepoState } from '../src/engine/types';

function stage(over: Partial<PipelineStage> = {}): PipelineStage {
  return {
    name: 'train',
    deps: ['data.csv'],
    outs: ['model.pkl'],
    cmd: 'python train.py',
    params: ['lr'],
    metrics: [],
    frozen: false,
    upToDate: false,
    ...over,
  };
}

describe('emptyState / cloneState / makeFile', () => {
  it('starts as an uninitialised, empty project', () => {
    const s = emptyState();
    expect(s.initialized).toBe(false);
    expect(s.files).toEqual({});
    expect(s.gitCommits).toEqual([]);
    expect(isGitRepo(s)).toBe(false);
    expect(s.live.active).toBe(false);
  });

  it('cloneState is a deep copy', () => {
    const s = emptyState();
    s.cache.push('a');
    const c = cloneState(s);
    c.cache.push('b');
    c.live.metrics.x = [];
    expect(s.cache).toEqual(['a']);
    expect(s.live.metrics).toEqual({});
  });

  it('makeFile defaults to a present, untracked, clean file with a stable content id', () => {
    const f = makeFile('a.txt', 'data');
    expect(f).toMatchObject({ path: 'a.txt', kind: 'data', tracked: false, dirty: false, present: true, gitignored: false });
    expect(f.pointerMd5).toBeUndefined();
    expect(f.contentId).toBe(makeFile('a.txt', 'data').contentId);
    expect(f.contentId).not.toBe(makeFile('b.txt', 'data').contentId);
  });

  it('makeFile options override the defaults', () => {
    const f = makeFile('a.txt', 'code', { contentId: 'c1', tracked: true, pointerMd5: 'p1' });
    expect(f).toMatchObject({ contentId: 'c1', tracked: true, pointerMd5: 'p1', kind: 'code' });
  });
});

describe('git helpers', () => {
  it('ensureGit creates an origin remote and a root history entry once', () => {
    const s = emptyState();
    ensureGit(s);
    ensureGit(s);
    expect(isGitRepo(s)).toBe(true);
    expect(s.gitRemotes).toEqual(['origin']);
    expect(s.gitCommits).toHaveLength(1);
    expect(s.gitCommits[0]!.message).toBe('git init');
  });

  it('ensureGit tolerates a state saved without gitRemotes and keeps existing commits', () => {
    const s = emptyState();
    s.gitCommits.push({ hash: 'h1', message: 'm', pointers: {}, pipelineSig: '', params: {}, metrics: {}, files: [] });
    delete (s as Partial<RepoState>).gitRemotes;
    ensureGit(s);
    expect(s.gitRemotes).toEqual(['origin']);
    expect(s.gitCommits.map((c) => c.hash)).toEqual(['h1']);
  });

  it('gitTree maps committed paths to blobs, later commits win, unknown blobs are null', () => {
    const s = emptyState();
    const c = (hash: string, files: string[], blobs?: Record<string, string>) => ({
      hash, message: hash, pointers: {}, pipelineSig: '', params: {}, metrics: {}, files, blobs,
    });
    s.gitCommits = [c('1', ['a', 'b'], { a: 'A1' }), c('2', ['a'], { a: 'A2' }), c('3', [])];
    expect(gitTree(s)).toEqual({ a: 'A2', b: null });
  });
});

describe('file accessors and dirtiness', () => {
  it('pointerMd5For and contentMd5 read the file, undefined when unknown', () => {
    const s = emptyState();
    s.files['d'] = makeFile('d', 'data', { contentId: 'c', pointerMd5: 'p', tracked: true });
    expect(pointerMd5For(s, 'd')).toBe('p');
    expect(contentMd5(s, 'd')).toBe('c');
    expect(pointerMd5For(s, 'nope')).toBeUndefined();
    expect(contentMd5(s, 'nope')).toBeUndefined();
  });

  it('only tracked files can be dirty: when content drifted from the pointer or the file is gone', () => {
    expect(isDirtyFile(undefined)).toBe(false);
    expect(isDirtyFile(makeFile('x', 'data', { contentId: 'a', pointerMd5: 'b' }))).toBe(false);
    expect(isDirtyFile(makeFile('x', 'data', { tracked: true, contentId: 'a', pointerMd5: 'a' }))).toBe(false);
    expect(isDirtyFile(makeFile('x', 'data', { tracked: true, contentId: 'a', pointerMd5: 'b' }))).toBe(true);
    expect(isDirtyFile(makeFile('x', 'data', { tracked: true, contentId: 'a', pointerMd5: 'a', present: false }))).toBe(true);
  });

  it('computeDirtyPaths lists the dirty tracked files sorted', () => {
    const s = emptyState();
    s.files['b'] = makeFile('b', 'data', { tracked: true, contentId: '1', pointerMd5: '2' });
    s.files['a'] = makeFile('a', 'data', { tracked: true, contentId: '1', pointerMd5: '1', present: false });
    s.files['c'] = makeFile('c', 'data', { tracked: true, contentId: '1', pointerMd5: '1' });
    s.files['d'] = makeFile('d', 'data', { contentId: '1', pointerMd5: '2' });
    expect(computeDirtyPaths(s)).toEqual(['a', 'b']);
  });

  it('applyDataEdit changes the content id each time and marks tracked files dirty', () => {
    const s = emptyState();
    s.files['d'] = makeFile('d', 'data', { tracked: true, contentId: 'base', pointerMd5: 'base' });
    expect(applyDataEdit(s, 'd')).toBe(true);
    const first = s.files['d']!.contentId;
    expect(first).toBe(fakeMd5('file:d:v1'));
    expect(s.files['d']!.dirty).toBe(true);
    expect(applyDataEdit(s, 'd')).toBe(true);
    expect(s.files['d']!.contentId).not.toBe(first);
    expect(s.dataVersions['d']).toBe(2);
  });

  it('applyDataEdit refuses unknown or missing files', () => {
    const s = emptyState();
    s.files['gone'] = makeFile('gone', 'data', { present: false });
    expect(applyDataEdit(s, 'nope')).toBe(false);
    expect(applyDataEdit(s, 'gone')).toBe(false);
    expect(s.dataVersions).toEqual({});
  });

  it('removeWorkspaceFile marks a tracked file missing (and dirty) but ignores absent ones', () => {
    const s = emptyState();
    s.files['d'] = makeFile('d', 'data', { tracked: true, contentId: 'a', pointerMd5: 'a' });
    s.files['u'] = makeFile('u', 'data');
    expect(removeWorkspaceFile(s, 'd')).toBe(true);
    expect(s.files['d']).toMatchObject({ present: false, dirty: true });
    expect(removeWorkspaceFile(s, 'd')).toBe(false);
    expect(removeWorkspaceFile(s, 'nope')).toBe(false);
    expect(removeWorkspaceFile(s, 'u')).toBe(true);
    expect(s.files['u']!.dirty).toBe(false);
  });

  it('restoreWorkspaceFromPointer needs a tracked pointer whose object exists somewhere', () => {
    const s = emptyState();
    s.files['d'] = makeFile('d', 'data', { tracked: true, contentId: 'old', pointerMd5: 'obj', present: false });
    s.files['u'] = makeFile('u', 'data', { pointerMd5: 'obj', present: false });
    s.files['np'] = makeFile('np', 'data', { tracked: true, present: false });
    expect(restoreWorkspaceFromPointer(s, 'nope')).toBe(false);
    expect(restoreWorkspaceFromPointer(s, 'u')).toBe(false);
    expect(restoreWorkspaceFromPointer(s, 'np')).toBe(false);
    expect(restoreWorkspaceFromPointer(s, 'd')).toBe(false);
    expect(s.files['d']!.present).toBe(false);

    addCache(s, 'obj');
    expect(restoreWorkspaceFromPointer(s, 'd')).toBe(true);
    expect(s.files['d']).toMatchObject({ present: true, contentId: 'obj', dirty: false });
  });

  it('restoreWorkspaceFromPointer can restore from the default remote or an explicit store', () => {
    const s = emptyState();
    s.files['d'] = makeFile('d', 'data', { tracked: true, contentId: 'x', pointerMd5: 'obj', present: false });
    expect(restoreWorkspaceFromPointer(s, 'd', ['other'])).toBe(false);
    expect(restoreWorkspaceFromPointer(s, 'd', ['obj'])).toBe(true);
    s.files['d']!.present = false;
    s.remoteObjects.push('obj');
    expect(restoreWorkspaceFromPointer(s, 'd')).toBe(true);
  });
});

describe('cache and remote storage', () => {
  it('addCache and addRemoteObject are idempotent', () => {
    const s = emptyState();
    addCache(s, 'a');
    addCache(s, 'a');
    addRemoteObject(s, 'r');
    addRemoteObject(s, 'r');
    addRemoteObject(s, 's');
    expect(s.cache).toEqual(['a']);
    expect(s.remoteObjects).toEqual(['r', 's']);
  });

  it('defaultRemote prefers the flagged remote, falls back to the first, else undefined', () => {
    const s = emptyState();
    expect(defaultRemote(s)).toBeUndefined();
    s.remotes = [{ name: 'a', url: 'u1', isDefault: false }, { name: 'b', url: 'u2', isDefault: true }];
    expect(defaultRemote(s)!.name).toBe('b');
    s.remotes[1]!.isDefault = false;
    expect(defaultRemote(s)!.name).toBe('a');
  });

  it('remoteStore returns remoteObjects for the default remote and a private list for others', () => {
    const s = emptyState();
    s.remotes = [{ name: 'a', url: 'u1', isDefault: true }, { name: 'b', url: 'u2', isDefault: false }];
    expect(remoteStore(s, 'a')).toBe(s.remoteObjects);
    const b = remoteStore(s, 'b');
    expect(b).toEqual([]);
    b.push('x');
    expect(remoteStore(s, 'b')).toEqual(['x']);
    expect(s.remoteObjects).toEqual([]);
  });

  it('remoteStore copes with a state saved before remoteStores existed', () => {
    const s = emptyState();
    delete (s as Partial<RepoState>).remoteStores;
    expect(remoteStore(s, 'x')).toEqual([]);
    expect(s.remoteStores).toEqual({ x: [] });
  });

  it('setDefaultRemote swaps which remote\'s objects are exposed as remoteObjects', () => {
    const s = emptyState();
    s.remotes = [{ name: 'a', url: 'u1', isDefault: true }, { name: 'b', url: 'u2', isDefault: false }];
    s.remoteObjects = ['from-a'];
    remoteStore(s, 'b').push('from-b');

    setDefaultRemote(s, 'b');
    expect(s.remotes.map((r) => r.isDefault)).toEqual([false, true]);
    expect(s.remoteObjects).toEqual(['from-b']);
    expect(s.remoteStores!['a']).toEqual(['from-a']);
    expect(s.remoteStores!['b']).toBeUndefined();

    setDefaultRemote(s, 'a');
    expect(s.remoteObjects).toEqual(['from-a']);
    expect(s.remoteStores!['b']).toEqual(['from-b']);
  });

  it('setDefaultRemote with the current default only re-flags, with no default it just sets the flag', () => {
    const s = emptyState();
    s.remotes = [{ name: 'a', url: 'u1', isDefault: true }, { name: 'b', url: 'u2', isDefault: false }];
    s.remoteObjects = ['o'];
    setDefaultRemote(s, 'a');
    expect(s.remoteObjects).toEqual(['o']);

    const t = emptyState();
    t.remotes = [{ name: 'a', url: 'u1', isDefault: false }];
    delete (t as Partial<RepoState>).remoteStores;
    setDefaultRemote(t, 'a');
    expect(t.remotes[0]!.isDefault).toBe(true);
    expect(t.remoteStores).toEqual({});
  });

  it('setDefaultRemote(undefined) unflags every remote and keeps the old default\'s objects', () => {
    const s = emptyState();
    s.remotes = [{ name: 'a', url: 'u1', isDefault: true }];
    s.remoteObjects = ['o'];
    setDefaultRemote(s, undefined);
    expect(s.remotes[0]!.isDefault).toBe(false);
    expect(s.remoteStores!['a']).toEqual(['o']);
  });
});

describe('pipeline helpers', () => {
  it('pipelineSignature is order independent and reflects commands, deps, outs and frozen', () => {
    const s = emptyState();
    s.pipeline = [stage({ name: 'b' }), stage({ name: 'a' })];
    const t = emptyState();
    t.pipeline = [stage({ name: 'a' }), stage({ name: 'b' })];
    expect(pipelineSignature(s)).toBe(pipelineSignature(t));
    expect(pipelineSignature(s)).toContain('a|python train.py|data.csv>model.pkl|frozen=false');
    t.pipeline[0]!.frozen = true;
    expect(pipelineSignature(s)).not.toBe(pipelineSignature(t));
    expect(pipelineSignature(emptyState())).toBe('');
  });

  it('stageRunSig changes with dep content, param values and the command, not with outputs', () => {
    const s = emptyState();
    s.files['data.csv'] = makeFile('data.csv', 'data', { contentId: 'v1' });
    s.params = { lr: 0.1 };
    const st = stage();
    const base = stageRunSig(st, s);
    expect(stageRunSig(st, s)).toBe(base);

    s.files['data.csv']!.contentId = 'v2';
    const afterData = stageRunSig(st, s);
    expect(afterData).not.toBe(base);

    s.params.lr = 0.2;
    expect(stageRunSig(st, s)).not.toBe(afterData);

    expect(stageRunSig(stage({ cmd: 'python other.py' }), s)).not.toBe(stageRunSig(st, s));
    expect(stageRunSig(stage({ outs: ['x'] }), s)).toBe(stageRunSig(st, s));
  });

  it('stageRunSig treats a missing dependency and an unset param as distinct from a present one', () => {
    const s = emptyState();
    const st = stage();
    const missing = stageRunSig(st, s);
    s.files['data.csv'] = makeFile('data.csv', 'data');
    expect(stageRunSig(st, s)).not.toBe(missing);
  });

  it('isDirOut recognises directory outputs: trailing slash or no extension', () => {
    expect(isDirOut('models/')).toBe(true);
    expect(isDirOut('models')).toBe(true);
    expect(isDirOut('data/raw')).toBe(true);
    expect(isDirOut('model.pkl')).toBe(false);
    expect(isDirOut('out/metrics.json')).toBe(false);
  });
});

describe('params', () => {
  it('getParam / setParam read and write flat keys', () => {
    const s = emptyState();
    expect(getParam(s, 'train.lr')).toBeUndefined();
    setParam(s, 'train.lr', 0.5);
    setParam(s, 'name', 'x');
    expect(getParam(s, 'train.lr')).toBe(0.5);
    expect(getParam(s, 'name')).toBe('x');
  });

  it('parseKeyValue converts numeric values and keeps text, splitting on the first =', () => {
    expect(parseKeyValue('lr=0.1')).toEqual({ key: 'lr', value: 0.1 });
    expect(parseKeyValue('model=rf')).toEqual({ key: 'model', value: 'rf' });
    expect(parseKeyValue('url=a=b')).toEqual({ key: 'url', value: 'a=b' });
    expect(parseKeyValue('=1')).toBeNull();
    expect(parseKeyValue('novalue')).toBeNull();
  });
});

describe('sandboxState', () => {
  it('is an initialised project with one committed "Initialize DVC" and nothing staged', () => {
    const s = sandboxState();
    expect(s.initialized).toBe(true);
    expect(isGitRepo(s)).toBe(true);
    expect(s.gitCommits.map((c) => c.message)).toEqual(['git init', 'Initialize DVC']);
    expect(s.gitStaged).toEqual([]);
    expect(Object.keys(s.files).sort()).toEqual(['data/data.xml', 'params.yaml', 'src/train.py']);
    expect(s.params).toEqual({ lr: 0.1, n_estimators: 10 });
    expect(defaultRemote(s)!.name).toBe('myremote');
    expect(s.gitCommits[1]!.params).toEqual(s.params);
    expect(s.gitCommits[1]!.params).not.toBe(s.params);
  });
});
