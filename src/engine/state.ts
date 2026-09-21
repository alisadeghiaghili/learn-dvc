import type { RepoState, WorkspaceFile } from './types';
import { fakeMd5 } from './hash';

export function emptyState(): RepoState {
  return {
    initialized: false,
    remotes: [],
    files: {},
    cache: [],
    remoteObjects: [],
    pipeline: [],
    params: {},
    metrics: {},
    experiments: [],
    gitCommits: [],
    gitStaged: [],
    dataVersions: {},
    generated: [],
  };
}

export function cloneState(state: RepoState): RepoState {
  return structuredClone(state);
}

export function makeFile(
  path: string,
  kind: WorkspaceFile['kind'],
  opts: Partial<WorkspaceFile> = {},
): WorkspaceFile {
  const contentId = opts.contentId ?? fakeMd5(`file:${path}:v0`);
  return {
    path,
    kind,
    contentId,
    tracked: false,
    pointerMd5: undefined,
    dirty: false,
    present: true,
    gitignored: false,
    ...opts,
  };
}

export function ensureGit(state: RepoState): void {
  if (!state.gitCommits.length) {
    state.gitCommits.push({
      hash: '0000000',
      message: 'git init',
      pointers: {},
      pipelineSig: '',
      params: {},
      metrics: {},
      files: [],
    });
  }
}

export function pointerMd5For(state: RepoState, path: string): string | undefined {
  return state.files[path]?.pointerMd5;
}

export function contentMd5(state: RepoState, path: string): string | undefined {
  return state.files[path]?.contentId;
}

export function isDirtyFile(f: WorkspaceFile | undefined): boolean {
  if (!f || !f.tracked) return false;
  if (!f.present) return true;
  return f.pointerMd5 !== f.contentId;
}

export function computeDirtyPaths(state: RepoState): string[] {
  return Object.values(state.files)
    .filter((f) => isDirtyFile(f) || (!f.present && f.tracked))
    .map((f) => f.path)
    .sort();
}

export function pipelineSignature(state: RepoState): string {
  return state.pipeline
    .map((s) => `${s.name}|${s.cmd}|${s.deps.join(',')}>${s.outs.join(',')}|frozen=${s.frozen}`)
    .sort()
    .join(';');
}

export function addCache(state: RepoState, md5: string): void {
  if (!state.cache.includes(md5)) state.cache.push(md5);
}

export function addRemoteObject(state: RepoState, md5: string): void {
  if (!state.remoteObjects.includes(md5)) state.remoteObjects.push(md5);
}

export function defaultRemote(state: RepoState) {
  return state.remotes.find((r) => r.isDefault) ?? state.remotes[0];
}

export function sandboxState(): RepoState {
  const state = emptyState();
  state.initialized = true;
  ensureGit(state);
  state.files = {
    'data/data.xml': makeFile('data/data.xml', 'data'),
    'src/train.py': makeFile('src/train.py', 'code'),
    'params.yaml': makeFile('params.yaml', 'params', {
      contentId: fakeMd5('params:lr=0.1:n=10'),
    }),
  };
  state.params = { lr: 0.1, n_estimators: 10 };
  state.metrics = {};
  state.remotes = [
    { name: 'myremote', url: '/tmp/dvcstore', isDefault: true },
  ];
  state.cache = [];
  // start with git history "Initialize DVC"
  state.gitStaged = ['.dvc/config', '.dvc/.gitignore'];
  state.gitCommits.push({
    hash: 'a1b2c3d',
    message: 'Initialize DVC',
    pointers: {},
    pipelineSig: '',
    params: { ...state.params },
    metrics: {},
    files: ['.dvc/config', '.dvc/.gitignore'],
  });
  state.gitStaged = [];
  return state;
}

export function applyDataEdit(state: RepoState, path: string): boolean {
  const f = state.files[path];
  if (!f || !f.present) return false;
  const v = (state.dataVersions[path] ?? 0) + 1;
  state.dataVersions[path] = v;
  f.contentId = fakeMd5(`file:${path}:v${v}`);
  f.dirty = isDirtyFile(f);
  return true;
}

export function removeWorkspaceFile(state: RepoState, path: string): boolean {
  const f = state.files[path];
  if (!f || !f.present) return false;
  f.present = false;
  f.dirty = isDirtyFile(f);
  return true;
}

export function restoreWorkspaceFromPointer(state: RepoState, path: string): boolean {
  const f = state.files[path];
  if (!f || !f.tracked || !f.pointerMd5) return false;
  if (!state.cache.includes(f.pointerMd5) && !state.remoteObjects.includes(f.pointerMd5)) {
    return false;
  }
  f.present = true;
  f.contentId = f.pointerMd5;
  f.dirty = false;
  return true;
}
