import type { PipelineStage, RepoState, WorkspaceFile } from './types';
import { fakeMd5 } from './hash';

export function emptyState(): RepoState {
  return {
    initialized: false,
    remotes: [],
    files: {},
    cache: [],
    remoteObjects: [],
    remoteStores: {},
    gitRemotes: [],
    pipeline: [],
    params: {},
    metrics: {},
    experiments: [],
    gitCommits: [],
    gitStaged: [],
    dataVersions: {},
    generated: [],
    commandHistory: [],
    runCache: [],
    plots: {},
    live: { active: false, step: 0, metrics: {}, images: [], plotData: [] },
    expQueue: [],
    dvcIgnore: [],
    stageMeta: {},
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

/** The simulator models "this directory is a Git repository" as having at least one entry in the log. */
export function isGitRepo(state: RepoState): boolean {
  return state.gitCommits.length > 0;
}

export function ensureGit(state: RepoState): void {
  if (!state.gitRemotes) state.gitRemotes = [];
  if (!state.gitRemotes.includes('origin')) state.gitRemotes.push('origin');
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

/**
 * Object storage of one DVC remote. The default remote's view is `state.remoteObjects`
 * (kept for goals and the board); every other remote has its own list in `remoteStores`.
 */
export function remoteStore(state: RepoState, name: string): string[] {
  if (defaultRemote(state)?.name === name) return state.remoteObjects;
  if (!state.remoteStores) state.remoteStores = {};
  if (!state.remoteStores[name]) state.remoteStores[name] = [];
  return state.remoteStores[name]!;
}

/** Make `name` the default remote and swap the storage views accordingly. */
export function setDefaultRemote(state: RepoState, name: string | undefined): void {
  const old = defaultRemote(state);
  const switching = Boolean(old && old.name !== name);
  if (!state.remoteStores) state.remoteStores = {};
  if (switching && old) state.remoteStores[old.name] = state.remoteObjects;
  for (const r of state.remotes) r.isDefault = r.name === name;
  if (switching && name) {
    state.remoteObjects = state.remoteStores[name] ?? [];
    delete state.remoteStores[name];
  }
}

/** Path -> content id of everything Git knows about (null = committed, content not recorded). */
export function gitTree(state: RepoState): Record<string, string | null> {
  const tree: Record<string, string | null> = {};
  for (const c of state.gitCommits) {
    for (const p of c.files ?? []) tree[p] = c.blobs?.[p] ?? null;
  }
  return tree;
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

/** Nested params keys use dots (prepare.seed) like real DVC params.yaml. */
export function getParam(state: RepoState, key: string): string | number | undefined {
  return state.params[key];
}

export function setParam(state: RepoState, key: string, value: string | number): void {
  state.params[key] = value;
}

export function parseKeyValue(token: string): { key: string; value: string | number } | null {
  const i = token.indexOf('=');
  if (i <= 0) return null;
  const key = token.slice(0, i);
  const raw = token.slice(i + 1);
  return { key, value: Number.isNaN(Number(raw)) ? raw : Number(raw) };
}

/** Detect directory-style outputs (no extension or trailing slash). */
export function isDirOut(path: string): boolean {
  return path.endsWith('/') || !/\.[A-Za-z0-9]+$/.test(path.split('/').pop() ?? '');
}

export function stageRunSig(stage: PipelineStage, state: RepoState): string {
  const depIds = stage.deps.map((d) => state.files[d]?.contentId ?? 'missing').join(',');
  const paramVals = stage.params
    .map((p) => `${p}=${state.params[p] ?? ''}`)
    .join(',');
  return fakeMd5(`${stage.name}|${stage.cmd}|${depIds}|${paramVals}`);
}

export function removeWorkspaceFile(state: RepoState, path: string): boolean {
  const f = state.files[path];
  if (!f || !f.present) return false;
  f.present = false;
  f.dirty = isDirtyFile(f);
  return true;
}

export function restoreWorkspaceFromPointer(
  state: RepoState,
  path: string,
  remoteObjects: string[] = state.remoteObjects,
): boolean {
  const f = state.files[path];
  if (!f || !f.tracked || !f.pointerMd5) return false;
  if (!state.cache.includes(f.pointerMd5) && !remoteObjects.includes(f.pointerMd5)) {
    return false;
  }
  f.present = true;
  f.contentId = f.pointerMd5;
  f.dirty = false;
  return true;
}
