/** Core simulation types for LearnDVC. */

export type FileKind = 'data' | 'code' | 'meta' | 'dvc' | 'yaml' | 'params' | 'metrics';

export interface WorkspaceFile {
  path: string;
  kind: FileKind;
  /** Stable content identity used like an md5 for simulation. */
  contentId: string;
  /** True when a `.dvc` pointer exists for this path. */
  tracked: boolean;
  /** md5 recorded in the `.dvc` file / last dvc commit for this path. */
  pointerMd5?: string;
  /** Workspace content differs from pointerMd5. */
  dirty?: boolean;
  /** Present in the working tree (false after `rm` when not pulled). */
  present: boolean;
  /** Listed in a .gitignore (data files after dvc add). */
  gitignored: boolean;
}

export interface DvcPointer {
  path: string;
  md5: string;
}

export interface RemoteEntry {
  name: string;
  url: string;
  isDefault: boolean;
}

export interface PipelineStage {
  name: string;
  deps: string[];
  outs: string[];
  cmd: string;
  params: string[];
  metrics: string[];
  frozen: boolean;
  /** Whether outs currently match last successful repro. */
  upToDate: boolean;
  /** true when out path is a directory artifact (`.dir` style). */
  outDirs?: string[];
  /** Signature of last successful run — powers the run cache. */
  lastRunSig?: string;
}

export interface ExperimentRun {
  id: string;
  name?: string;
  commitRef: string;
  params: Record<string, string | number>;
  metrics: Record<string, number>;
}

export interface GitCommit {
  hash: string;
  message: string;
  /** Snapshot of .dvc pointers at this commit. */
  pointers: Record<string, string>;
  /** Snapshot of dvc.yaml stage names + frozen flags. */
  pipelineSig: string;
  params: Record<string, string | number>;
  metrics: Record<string, number>;
  /** Paths that were staged when this commit was created. */
  files: string[];
}

export interface RepoState {
  initialized: boolean;
  remotes: RemoteEntry[];
  /** path -> workspace file meta */
  files: Record<string, WorkspaceFile>;
  /** md5 present in .dvc/cache */
  cache: string[];
  /** md5 present in remote storage */
  remoteObjects: string[];
  pipeline: PipelineStage[];
  params: Record<string, string | number>;
  metrics: Record<string, number>;
  experiments: ExperimentRun[];
  gitCommits: GitCommit[];
  gitStaged: string[];
  /** Artificial data version counter for `edit` simulation. */
  dataVersions: Record<string, number>;
  /** Pipeline outputs currently materialized in workspace. */
  generated: string[];
  /** Set by `dvc exp apply` so goals can require promotion, not just a matching param. */
  lastAppliedExpId?: string;
  /** Successful commands run this level — sticky checklist completion. */
  commandHistory: string[];
  /** Content-addressed run-cache signatures already executed. */
  runCache: string[];
  /** Simple plot series (name → points) for plots show/diff. */
  plots: Record<string, number[]>;
  /** DVCLive-style scalar/image/plot logs. */
  live: {
    active: boolean;
    step: number;
    metrics: Record<string, number[]>;
    images: string[];
    plotData: string[];
  };
  /** Queued experiment specs (exp run --queue). */
  expQueue: { params: Record<string, string | number>; id: string }[];
  /** Paths ignored via .dvcignore. */
  dvcIgnore: string[];
  /** Extra pipeline metadata from stage flags. */
  stageMeta: Record<string, { alwaysChanged?: boolean; noCache?: string[]; external?: string[]; wdir?: string; desc?: string; foreach?: string[] }>;
}

export interface CommandResult {
  ok: boolean;
  output: string;
  error?: string;
}

export interface DialogSlide {
  title?: string;
  markdown: string;
}

export type GoalCheck =
  | { kind: 'initialized'; value?: boolean }
  | { kind: 'tracked'; paths: string[] }
  | { kind: 'pointer'; path: string; md5?: string }
  | { kind: 'cacheHas'; md5s: string[] }
  | { kind: 'remoteConfigured'; name?: string; default?: boolean }
  | { kind: 'remoteHas'; md5s: string[] }
  | { kind: 'remoteLacks'; md5s: string[] }
  | { kind: 'cacheLacks'; md5s: string[] }
  | { kind: 'workspaceHas'; paths: string[] }
  | { kind: 'workspaceMissing'; paths: string[] }
  | { kind: 'stageExists'; name: string }
  | { kind: 'stageUpToDate'; name: string }
  | { kind: 'metricsAtLeast'; key: string; value: number }
  | { kind: 'metricsExact'; key: string; value: number }
  | { kind: 'paramsAt'; key: string; value: string | number }
  | { kind: 'experimentCount'; min: number }
  | { kind: 'gitCommitMessageIncludes'; text: string; requireFilesAny?: string[] }
  | { kind: 'gitStagedIncludesAny'; paths: string[] }
  | { kind: 'runCacheHits'; min: number }
  | { kind: 'liveMetricLogged'; name: string }
  | { kind: 'expQueueSize'; min: number }
  | { kind: 'ignoredPath'; path: string }
  | { kind: 'importUpdated'; path: string }
  | { kind: 'notDirty' }
  | { kind: 'allOf'; checks: GoalCheck[] };

export interface SolutionStepStatus {
  command: string;
  done: boolean;
  note: string;
  /** Inspect/help commands that do not block level completion. */
  optional?: boolean;
}

export interface LevelDef {
  id: string;
  series: string;
  seriesTitle: string;
  name: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  par: number;
  hint: string;
  objective: string;
  /** Concepts this level is supposed to install — shown in the goal panel. */
  learning: string[];
  /** What a working data/ML engineer does with this in production. */
  fieldNotes?: string[];
  startDialog: DialogSlide[];
  startState: RepoState;
  /** State checks that mark the level solved — must mirror `solution` step effects. */
  goal: GoalCheck;
  /** Ordered commands that solve the level; the Goal panel lists these verbatim. */
  solution: string[];
  disabled?: string[];
}

export interface LevelProgress {
  solved: boolean;
  bestCommands?: number;
}
