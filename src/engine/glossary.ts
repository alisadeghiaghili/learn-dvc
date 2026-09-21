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
