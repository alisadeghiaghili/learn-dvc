/** Dense mental-model reference — `concepts` / `glossary` in the terminal. */

export interface Concept {
  id: string;
  title: string;
  body: string;
}

export const CONCEPTS: Concept[] = [
  {
    id: 'split',
    title: 'Git vs DVC split',
    body: 'Git versions intent (code + pointer files). DVC versions payload (data/model objects). Never store GB datasets in Git history; store md5 pointers + reviewable YAML.',
  },
  {
    id: 'pointer',
    title: 'Pointer file (.dvc)',
    body: 'A small YAML that records path + md5 (+ size). Git commits the pointer. When bytes change, dvc add/commit updates the pointer; Git history keeps old pointers for rollback.',
  },
  {
    id: 'cache',
    title: 'Content-addressed cache',
    body: 'Objects live under .dvc/cache/files/md5/xx/… keyed by content hash. Identical bytes are stored once. Local cache is a materialization source for workspace checkout.',
  },
  {
    id: 'remote',
    title: 'Remote storage',
    body: 'Shared object store for cache artifacts (S3, GCS, SSH, local). dvc push uploads missing objects; dvc pull/fetch downloads them. Distinct from git remote.',
  },
  {
    id: 'dirty',
    title: 'Dirty data',
    body: 'Workspace bytes ≠ pointer md5 (or file missing). dvc status surfaces this. Fix: dvc commit (accept new version) or dvc checkout (discard drift).',
  },
  {
    id: 'checkout',
    title: 'Materialize version',
    body: 'dvc checkout reads pointers and restores matching cache objects into the workspace. After git checkout of an older commit, always dvc checkout so bytes match intent.',
  },
  {
    id: 'pipeline',
    title: 'Pipeline DAG',
    body: 'dvc.yaml stages declare deps, outs, cmd, params, metrics. dvc repro runs dirty stages in topological order and writes dvc.lock as an execution receipt.',
  },
  {
    id: 'invalidation',
    title: 'Invalidation rules',
    body: 'A stage is dirty when any dep hash, linked param value, or command definition changed. Data file change invalidates every stage that listed it as -d.',
  },
  {
    id: 'params',
    title: 'params.yaml',
    body: 'Human-reviewable hyperparameters. Stage flags -p key link params to stages so repro/expruns know what to watch and experiments can -S override keys.',
  },
  {
    id: 'metrics',
    title: 'Metrics & comparison',
    body: '-m marks metric files produced by a stage. dvc exp show tabulates experiments. Decisions need tables, not memory of notebook cells.',
  },
  {
    id: 'exp',
    title: 'Experiments',
    body: 'dvc exp run executes the pipeline with recorded params/metrics without branch explosion. exp apply promotes a winner’s config into the workspace; then repro artifacts.',
  },
  {
    id: 'run-cache',
    title: 'Run cache',
    body: 'DVC remembers (cmd + dep hashes + params) → outputs. Change a hyperparam, change it back, and repro restores from cache instead of re-training.',
  },
  {
    id: 'metafiles',
    title: 'dvc.yaml & dvc.lock',
    body: 'dvc.yaml is the stage contract (cmd/deps/params/outs). dvc.lock is the execution receipt (md5s and param values). Both go to Git; never hand-edit lock.',
  },
  {
    id: 'diffs',
    title: 'Iteration diffs',
    body: 'dvc params diff / metrics diff / plots diff compare workspace vs HEAD (or revisions). This is how ML changes get reviewed.',
  },
  {
    id: 'registry-cmds',
    title: 'get / import',
    body: 'dvc get copies a file from another DVC project. dvc import also versions the dependency (writes .dvc). import-url tracks an external URL as data.',
  },
  {
    id: 'dvclive',
    title: 'DVCLive',
    body: 'Python library inside training code: Live(), log_metric, log_plot, log_image, make_report. Feeds dvc.yaml metrics/plots so exp show and plots work without hand wiring.',
  },
  {
    id: 'plots-templates',
    title: 'Plots templates',
    body: 'Vega templates: simple, linear, confusion, scatter. Configure in dvc.yaml under plots:. dvc plots show --template confusion renders matrix views.',
  },
  {
    id: 'queue',
    title: 'Experiment queue',
    body: 'dvc exp run --queue -S k=v parks a run; dvc queue start / exp run --run-all executes them. Standard sweep pattern in courses.',
  },
  {
    id: 'cml',
    title: 'CML (CI for ML)',
    body: 'Continuous Machine Learning posts metrics/plots to PRs. Flow: git clone + dvc pull + dvc repro + cml comment. Not a replacement for DVC.',
  },
  {
    id: 'lfs',
    title: 'Git-LFS vs DVC',
    body: 'Git-LFS versions large blobs in Git remotes. DVC versions pointer files in Git and content-addressed objects in DVC remotes, plus pipelines/exps. Choose LFS for big binaries with few versions; DVC for ML data/models + repro.',
  },
  {
    id: 'foreach',
    title: 'foreach / matrix stages',
    body: 'dvc stage add --foreach expands one stage into many (e.g. per-model). Course-level alternative to copy-pasting stages.',
  },
  {
    id: 'external-outs',
    title: 'External data / no-cache',
    body: 'Deps/outs may live outside the project (s3://…). Use cache: false / -O when DVC must not copy bytes. update/track external datasets with import-url.',
  },
  {
    id: 'api',
    title: 'dvc.api',
    body: 'Python API to open/read tracked data and exp_show() from a DVC repo without dvc checkout — useful in apps and notebooks.',
  },
  {
    id: 'registry-promote',
    title: 'Model registry',
    body: 'Later DVC releases treat artifacts/models as first-class (dvc artifacts, stages like dev/prod). Promote a git tag + pulled model instead of emailing weights.',
  },
  {
    id: 'dvcignore',
    title: '.dvcignore',
    body: 'Path patterns DVC should skip — speed on huge trees. Not the same as .gitignore (Git) or the data path ignore written by dvc add.',
  },
  {
    id: 'incident',
    title: 'Incident question',
    body: '“Which data produced this model?” Answer = Git commit of the release → pointer md5s → cache/remote object. If pointers were never committed, the answer does not exist.',
  },
  {
    id: 'ci',
    title: 'CI / fresh clone pattern',
    body: 'git clone (code+pointers) → dvc pull (payload) → dvc repro (rebuild) or load cached outputs. Heavy jobs need credentials for the DVC remote, not Git LFS hacks.',
  },
  {
    id: 'freeze',
    title: 'Freeze a stage',
    body: 'dvc freeze <stage> pins a stage so repro will not re-run it even if inputs change — useful to protect a production artifact while experimenting downstream.',
  },
  {
    id: 'gc',
    title: 'Garbage collection',
    body: 'dvc gc removes cache objects not referenced by current workspace/Git refs you keep. After gc you may need dvc pull if a referenced hash was on remote only.',
  },
];

export function formatConcepts(): string {
  return CONCEPTS.map((c, i) => `${i + 1}. ${c.title}\n   ${c.body}`).join('\n\n');
}

export function findConcept(query: string): Concept | undefined {
  const q = query.trim().toLowerCase();
  return CONCEPTS.find((c) => c.id === q || c.title.toLowerCase().includes(q));
}
