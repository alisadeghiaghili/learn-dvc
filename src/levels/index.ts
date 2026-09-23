import type { LevelDef, RepoState } from '../engine/types';
import { emptyState, ensureGit, makeFile } from '../engine/state';
import { fakeMd5 } from '../engine/hash';
import { compareLevels, metaLevels, registryLevels } from './gaps';
import { campLevels } from './camp';
import { advancedLevels } from './advanced';

function rawRepo(): RepoState {
  const s = emptyState();
  s.initialized = true;
  ensureGit(s);
  s.files['.dvc/config'] = makeFile('.dvc/config', 'meta');
  s.files['.dvc/.gitignore'] = makeFile('.dvc/.gitignore', 'meta');
  s.files['data/data.xml'] = makeFile('data/data.xml', 'data');
  s.gitCommits.push({
    hash: 'a1b2c3d',
    message: 'Initialize DVC',
    pointers: {},
    pipelineSig: '',
    params: {},
    metrics: {},
    files: ['.dvc/config', '.dvc/.gitignore'],
  });
  s.gitStaged = [];
  return s;
}

function trackedDataRepo(
  path = 'data/data.xml',
  version = 0,
  opts: { remote?: boolean; commitMessage?: string; cachePresent?: boolean } = {},
): RepoState {
  const s = rawRepo();
  const md5 = fakeMd5(`file:${path}:v${version}`);
  s.dataVersions[path] = version;
  s.files[path] = makeFile(path, 'data', {
    contentId: md5,
    tracked: true,
    pointerMd5: md5,
    dirty: false,
    present: opts.cachePresent !== false,
    gitignored: true,
  });
  s.cache = opts.cachePresent === false ? [] : [md5];
  s.files[`${path}.dvc`] = makeFile(`${path}.dvc`, 'dvc');
  s.files['data/.gitignore'] = makeFile('data/.gitignore', 'meta');
  if (opts.remote) {
    s.remotes = [{ name: 'myremote', url: '/tmp/dvcstore', isDefault: true }];
    if (opts.cachePresent === false) {
      // Fresh machine: object exists on remote, not in local cache/workspace.
      s.remoteObjects = [md5];
    }
  }
  const message = opts.commitMessage ?? 'Add raw data';
  s.gitCommits.push({
    hash: 'c0ffee1',
    message,
    pointers: { [path]: md5 },
    pipelineSig: '',
    params: {},
    metrics: {},
    files: [`${path}.dvc`, `${path.split('/')[0]}/.gitignore`],
  });
  return s;
}

function pipelineRepo(): RepoState {
  const s = trackedDataRepo();
  s.files['src/train.py'] = makeFile('src/train.py', 'code');
  s.files['params.yaml'] = makeFile('params.yaml', 'params', {
    contentId: fakeMd5('params:lr=0.1:n=10'),
  });
  s.params = { lr: 0.1, n_estimators: 10 };
  s.remotes = [{ name: 'myremote', url: '/tmp/dvcstore', isDefault: true }];
  return s;
}

export const basicsLevels: LevelDef[] = [
  {
    id: 'basics-1',
    series: 'basics',
    seriesTitle: 'Basics',
    name: 'Initialize DVC',
    difficulty: 1,
    par: 3,
    hint: 'dvc init; git add .dvc; git commit -m "Initialize DVC"',
    objective:
      'Initialize DVC inside a Git repository and commit the DVC metadata so the team shares the same data-versioning setup.',
    learning: [
      'DVC extends Git for data; it does not replace Git',
      'dvc init only creates .dvc/ metadata — no data is versioned yet',
      'Git versions that metadata; teammates clone the same workflow',
    ],
    fieldNotes: [
      'Repo bootstrap: git init → dvc init → commit .dvc immediately',
      'Store remote config in .dvc/config so clones inherit the same data store',
      'If .dvc is not committed, every teammate has a different data workflow',
    ],
    startDialog: [
      {
        title: 'Why Git alone fails for ML data',
        markdown:
          'Git stores every version of a file in `.git`. That works for source code.\n\nIt breaks for **datasets and models**:\n\n- 10 GB in history × many versions → unusable clones\n- Binary diffs are opaque and slow\n- Reviewers do not want training data in the code repo\n\n**DVC** splits the problem: Git keeps *pointers*; a cache/remote keeps *bytes*.',
      },
      {
        title: 'What `dvc init` actually does',
        markdown:
          'Creates a `.dvc/` directory with:\n\n- `config` — where remotes and cache live for this project\n- `.gitignore` — so DVC’s internal cache is not committed by accident\n\n**It does not upload data.** You are turning data-versioning *on* for this project.\n\nMental model: `git init` for code ≈ `dvc init` for the data workflow.',
      },
      {
        title: 'Why you must Git-commit `.dvc/`',
        markdown:
          'The `.dvc/` folder is tiny and team-facing.\n\n```\ngit add .dvc\ngit commit -m "Initialize DVC"\n```\n\nIf you skip this, clone #2 has code but **no DVC project** — `dvc pull` will not know your cache layout.\n\nWatch the board: Workspace can be “initialized” while Git history still lacks the setup commit.',
      },
    ],
    startState: emptyState(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'initialized', value: true },
        {
          kind: 'gitCommitMessageIncludes',
          text: 'Initialize DVC',
          requireFilesAny: ['.dvc'],
        },
      ],
    },
    solution: ['dvc init', 'git add .dvc', 'git commit -m "Initialize DVC"'],
  },
  {
    id: 'basics-2',
    series: 'basics',
    seriesTitle: 'Basics',
    name: 'Track a dataset',
    difficulty: 2,
    par: 3,
    hint: 'dvc add data/data.xml; git add data/data.xml.dvc data/.gitignore; git commit -m "Add raw data"',
    objective:
      'Track `data/data.xml` so its content lives in cache, Git tracks only a pointer file, and the raw path is gitignored.',
    learning: [
      'dvc add = hash + cache object + .dvc pointer + gitignore',
      'Git commits the pointer (md5), never the large file',
      'Board: Workspace file turns into pointer + Cache object appears',
    ],
    fieldNotes: [
      'Track datasets/models/artifacts you cannot rebuild cheaply',
      'PR review should read pointer diffs (md5), not megabytes of CSV',
      'CI pulls data via DVC; images stay slim',
    ],
    startDialog: [
      {
        title: 'The core DVC move',
        markdown:
          'You have `data/data.xml` in the workspace (raw data).\n\nGoal: version it **without** putting bytes in Git.\n\n```\ndvc add data/data.xml\n```\n\nThen commit the *metadata* Git can review:\n\n```\ngit add data/data.xml.dvc data/.gitignore\ngit commit -m "Add raw data"\n```',
      },
      {
        title: 'What happens under the hood',
        markdown:
          'After `dvc add`:\n\n| Place | Content |\n| --- | --- |\n| Workspace | still has `data/data.xml` (linked to cache) |\n| `.dvc/cache/.../md5/xx/…` | the actual bytes, content-addressed |\n| `data/data.xml.dvc` | YAML: path + md5 — **what Git stores** |\n| `data/.gitignore` | ignores the raw path |\n\nTwo systems, one workflow:\n\n- **Git** → code + pointers (small, reviewable)\n- **DVC cache/remote** → data payloads',
      },
      {
        title: 'Common mistake',
        markdown:
          'People `git add data/data.xml` out of habit.\n\nThat reintroduces the original problem. After DVC tracks a file, **only** the `.dvc` file and ignore rules belong in Git.\n\nOn the board, the data card should show `.dvc` + `gitignored`, and Cache should show the md5 object.',
      },
    ],
    startState: rawRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'tracked', paths: ['data/data.xml'] },
        { kind: 'pointer', path: 'data/data.xml' },
        { kind: 'cacheHas', md5s: ['tracked:data/data.xml'] },
        { kind: 'workspaceHas', paths: ['data/data.xml'] },
        {
          kind: 'gitCommitMessageIncludes',
          text: 'Add raw data',
          requireFilesAny: ['data/data.xml.dvc', 'data/.gitignore'],
        },
      ],
    },
    solution: [
      'dvc add data/data.xml',
      'git add data/data.xml.dvc data/.gitignore',
      'git commit -m "Add raw data"',
    ],
  },
  {
    id: 'basics-3',
    series: 'basics',
    seriesTitle: 'Basics',
    name: 'Dirty data and status',
    difficulty: 3,
    par: 5,
    hint: 'edit data/data.xml; dvc status; dvc commit; git add data/data.xml.dvc; git commit -m "Dataset updates"',
    objective:
      'When data changes on disk, detect it with `dvc status`, promote it to cache/pointer with `dvc commit`, then record the pointer change in Git.',
    learning: [
      'Workspace change without pointer update = dirty data',
      'dvc status is the data analogue of git status',
      'dvc commit updates pointer+cache; git commit versions that pointer',
      'History keeps old md5 — you can go back with checkout later',
    ],
    fieldNotes: [
      'Pre-commit hook: fail CI if dvc status shows uncommitted data drift',
      'Every metric in a paper/model card should reference a data pointer commit',
    ],
    startDialog: [
      {
        title: 'Data changes; pointers lag',
        markdown:
          'In real projects the dataset grows (new scrape, new labels).\n\n```\nedit data/data.xml\n```\n\nNow **workspace content ≠ pointer md5**. That is “dirty”, exactly like uncommitted code.\n\nIf you trained on this file, the result is **not reproducible** until the data version is recorded.',
      },
      {
        title: 'Status → commit → Git',
        markdown:
          '```\ndvc status\ndvc commit\ngit add data/data.xml.dvc\ngit commit -m "Dataset updates"\n```\n\n1. **status** — human-readable: which data files drifted\n2. **dvc commit** — write new md5 into `.dvc` + ensure cache holds those bytes\n3. **git commit** — publish that pointer change to the code timeline\n\nWithout step 2, Git would version a *lie* (old hash, new file).',
      },
      {
        title: 'Why this matters for ML',
        markdown:
          'A model metric without a data version is folklore.\n\nAfter this level your Git history contains a line like “Dataset updates” **bound to a specific md5**. Anyone (or CI) can restore that data and re-check the metric.\n\nOptional simulators here: `edit` / `rm` / `cat` — in production these are your real tools.',
      },
    ],
    startState: trackedDataRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'tracked', paths: ['data/data.xml'] },
        { kind: 'notDirty' },
        {
          kind: 'gitCommitMessageIncludes',
          text: 'Dataset updates',
          requireFilesAny: ['data/data.xml.dvc'],
        },
        { kind: 'cacheHas', md5s: ['tracked:data/data.xml'] },
      ],
    },
    solution: [
      'edit data/data.xml',
      'dvc status',
      'dvc commit',
      'git add data/data.xml.dvc',
      'git commit -m "Dataset updates"',
    ],
  },
];

export const remoteLevels: LevelDef[] = [
  {
    id: 'remote-1',
    series: 'remote',
    seriesTitle: 'Remotes',
    name: 'Configure a remote',
    difficulty: 2,
    par: 2,
    hint: 'dvc remote add -d myremote /tmp/dvcstore; dvc remote list',
    objective:
      'Configure a default DVC remote so data objects can be shared independently of the Git remote.',
    learning: [
      'Two remotes: Git remote (code/pointers) vs DVC remote (data objects)',
      'dvc remote add -d sets the default push/pull target',
      'Local folder remotes are valid for learning; production uses S3/GCS/SSH',
    ],
    fieldNotes: [
      'Secrets for remotes go in CI/CD, not committed config',
      'Separate buckets per env (dev/stage/prod) when data sensitivity differs',
    ],
    startDialog: [
      {
        title: 'Why remotes exist',
        markdown:
          'Your cache is **local**. A teammate’s laptop has a different cache (or empty).\n\n```\ndvc remote add -d myremote /tmp/dvcstore\n```\n\nThe DVC remote is where **content-addressed objects** are shared:\n\n- Git remote URL → code hosting (GitHub, GitLab)\n- DVC remote URL → data store (S3, GCS, SSH, NFS, local path)\n\nConfusing them is the #1 onboarding mistake.',
      },
      {
        title: 'What `-d` means',
        markdown:
          '`-d` / `--default` marks the remote used when you do not pass `--remote <name>`.\n\nTeams often have `origin` + `s3-staging` + `s3-prod`. Default is usually the shared team bucket.\n\nIn this simulator `/tmp/dvcstore` stands in for object storage — same mental model, no cloud bill.',
      },
    ],
    startState: trackedDataRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'remoteConfigured', name: 'myremote', default: true },
      ],
    },
    solution: ['dvc remote add -d myremote /tmp/dvcstore'],
  },
  {
    id: 'remote-2',
    series: 'remote',
    seriesTitle: 'Remotes',
    name: 'Push data to the remote',
    difficulty: 3,
    par: 3,
    hint: 'dvc remote add -d myremote /tmp/dvcstore; dvc push',
    objective:
      'Configure a remote if needed, then upload cached data objects with `dvc push`.',
    learning: [
      'push copies cache → remote only for objects the remote lacks',
      'Pointers can be on Git while data is not yet shared — incomplete collaboration',
      'Board: Cache object should also appear under Remote after push',
    ],
    fieldNotes: [
      'Release = git push + dvc push; both are required for teammates/CI',
      'Orphan cache objects: periodically dvc gc after backups — know the tradeoff',
    ],
    startDialog: [
      {
        title: 'push = cache → remote',
        markdown:
          '```\ndvc remote add -d myremote /tmp/dvcstore\ndvc push\n```\n\n`dvc push` does **not** run `git push`. It uploads missing cache objects.\n\nTypical release flow:\n\n1. `dvc push` (data objects)\n2. `git push` (code + pointers)\n\nIf you only `git push`, the clone has pointers but **cannot restore data**.',
      },
      {
        title: 'Idempotency',
        markdown:
          'Push is incremental: already-uploaded md5s are skipped.\n\nThat is why content-addressing matters — the same dataset version uploaded twice costs once.',
      },
    ],
    startState: trackedDataRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'remoteConfigured', default: true },
        { kind: 'remoteHas', md5s: ['tracked:data/data.xml'] },
      ],
    },
    solution: ['dvc remote add -d myremote /tmp/dvcstore', 'dvc push'],
  },
  {
    id: 'remote-3',
    series: 'remote',
    seriesTitle: 'Remotes',
    name: 'Fresh machine: pull data',
    difficulty: 4,
    par: 3,
    hint: 'dvc pull data/data.xml',
    objective:
      'This workspace has pointers and a remote, but no local cache and no data file. Restore data with `dvc pull`.',
    learning: [
      'git clone ≠ data present — pointers yes, bytes no',
      'dvc pull = fetch remote objects + checkout to match pointers',
      'Board: empty Workspace data + empty Cache → after pull both filled from Remote',
    ],
    startDialog: [
      {
        title: 'The day-after-clone story',
        markdown:
          'You are the second engineer. You `git clone` and open the project:\n\n- `src/` code is there\n- `data/data.xml.dvc` pointer is there\n- `data/data.xml` **missing**\n\n```\ndvc pull\n```\n\nDownloads the md5 the pointer references, fills cache, materializes workspace files.',
      },
      {
        title: 'Why this is the product moment',
        markdown:
          'This is the whole pitch of DVC:\n\n> Clone stays small. Data arrives on demand at the exact version Git says you need.\n\nIf pull fails, either the remote is wrong or nobody pushed that version — a real reproducibility bug, not a mystery.',
      },
    ],
    startState: trackedDataRepo('data/data.xml', 0, {
      remote: true,
      cachePresent: false,
    }),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'workspaceHas', paths: ['data/data.xml'] },
        { kind: 'cacheHas', md5s: ['tracked:data/data.xml'] },
        { kind: 'notDirty' },
      ],
    },
    solution: ['dvc pull'],
  },
];

export const pipelineLevels: LevelDef[] = [
  {
    id: 'pipe-1',
    series: 'pipe',
    seriesTitle: 'Pipelines',
    name: 'Define a stage',
    difficulty: 3,
    par: 3,
    hint: 'dvc stage add -n prepare -d data/data.xml -o data/prepared.csv python src/prepare.py',
    objective:
      'Define a `prepare` stage in `dvc.yaml` that depends on raw data and writes `data/prepared.csv`.',
    learning: [
      'dvc.yaml is the ML build file — stages, deps, outs, cmd',
      'Deps declare invalidation inputs; outs declare tracked products',
      'Reproducibility starts as a contract in YAML, not a tribal runbook',
    ],
    startDialog: [
      {
        title: 'From scripts to a pipeline',
        markdown:
          'Most ML repos start as loose scripts: “run prepare, then train, then look at metrics”. That breaks when someone forgets a step or uses different data.\n\n`dvc stage add` writes a **declared** step into `dvc.yaml`:\n\n```\ndvc stage add -n prepare \\\n  -d data/data.xml -d src/prepare.py \\\n  -o data/prepared.csv \\\n  python src/prepare.py\n```',
      },
      {
        title: 'Reading the declaration',
        markdown:
          '- `-n prepare` — stage name (node in the DAG)\n- `-d …` — dependencies; change these ⇒ stage dirty\n- `-o …` — outputs DVC should care about (often tracked/cached)\n- trailing command — what to execute\n\n**Why YAML and not a bash script?**\n\nTools (and CI) can answer: *what depends on this data?* without guessing.',
      },
      {
        title: 'Look at the board + DAG',
        markdown:
          'After this level, open `show goal` / type `dvc dag` once the pipeline exists.\n\nYou are building a **graph**: raw data → prepared data → model.\n\nThat graph is how teams reason about cost (only retrain what broke) and audit (how was this model produced?).',
      },
    ],
    startState: (() => {
      const s = pipelineRepo();
      s.files['src/prepare.py'] = makeFile('src/prepare.py', 'code');
      return s;
    })(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'stageExists', name: 'prepare' }],
    },
    solution: [
      'dvc stage add -n prepare -d data/data.xml -d src/prepare.py -o data/prepared.csv python src/prepare.py',
    ],
  },
  {
    id: 'pipe-2',
    series: 'pipe',
    seriesTitle: 'Pipelines',
    name: 'Train stage + repro',
    difficulty: 4,
    par: 6,
    hint: 'Add prepare and train stages, then `dvc repro`',
    objective:
      'Build a two-stage pipeline (prepare → train) and run it with `dvc repro`. Metrics must be produced from the train stage.',
    learning: [
      'Stages compose: train deps on prepare outs',
      'dvc repro executes dirty stages in topological order',
      'dvc.lock is the execution receipt (hashes + outputs)',
      '-p links params.yaml keys; -m links metrics files',
    ],
    startDialog: [
      {
        title: 'Wire train after prepare',
        markdown:
          '```\ndvc stage add -n prepare \\\n  -d data/data.xml -d src/prepare.py \\\n  -o data/prepared.csv \\\n  python src/prepare.py\n\ndvc stage add -n train \\\n  -d data/prepared.csv -d src/train.py \\\n  -p lr -p n_estimators \\\n  -o model.pkl -m metrics.json \\\n  python src/train.py\n```',
      },
      {
        title: 'Why `repro` is not just “run”',
        markdown:
          '```\ndvc repro\n```\n\nDVC walks the graph:\n\n1. Which stages are dirty? (dep/param hash change)\n2. Run them **in order**\n3. Write/update outputs + `dvc.lock`\n\nIf nothing changed, it skips work — the value of a build system on GPUs.',
      },
      {
        title: 'params and metrics as edges',
        markdown:
          '`-p lr` says: *this stage reads lr from params.yaml*.\n\n`-m metrics.json` says: *this stage produces metrics I want to compare later*.\n\nWithout `-p`/`-m`, experiments cannot attribute results. You are wiring the experiment graph, not just launching a job.',
      },
    ],
    startState: (() => {
      const s = pipelineRepo();
      s.files['src/prepare.py'] = makeFile('src/prepare.py', 'code');
      s.files['src/train.py'] = makeFile('src/train.py', 'code');
      return s;
    })(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'stageExists', name: 'prepare' },
        { kind: 'stageExists', name: 'train' },
        { kind: 'stageUpToDate', name: 'train' },
        { kind: 'workspaceHas', paths: ['model.pkl'] },
      ],
    },
    solution: [
      'dvc stage add -n prepare -d data/data.xml -d src/prepare.py -o data/prepared.csv python src/prepare.py',
      'dvc stage add -n train -d data/prepared.csv -d src/train.py -p lr -p n_estimators -o model.pkl -m metrics.json python src/train.py',
      'dvc repro',
    ],
  },
  {
    id: 'pipe-3',
    series: 'pipe',
    seriesTitle: 'Pipelines',
    name: 'Params change → repro',
    difficulty: 4,
    par: 5,
    hint: 'edit params.yaml lr=0.05; dvc repro; dvc metrics show',
    objective:
      'Pipeline is defined and was run. Change a parameter with `edit params.yaml lr=0.05`, then `dvc repro` so train re-runs and metrics refresh.',
    learning: [
      'Hyperparameters live in params.yaml (reviewable, not hardcoded)',
      'Changing a linked param marks only the dependent stages dirty',
      'repro refreshes outputs/metrics for the new configuration',
      'This is the precursor to experiments without changing code',
    ],
    startDialog: [
      {
        title: 'The experiment loop without DVC exp',
        markdown:
          'Edit a hyperparameter, re-run, look at metrics:\n\n```\nedit params.yaml lr=0.05\ndvc repro\ndvc metrics show\n```\n\nNote **prepare did not need to re-run** if its inputs did not change — only `train` is dirty because of `-p lr`.',
      },
      {
        title: 'Why params.yaml',
        markdown:
          'Hardcoded `lr=0.1` in Python is invisible to review and tooling.\n\n`params.yaml` + `-p` creates a **tracked contract**:\n\n- Code review sees the hyperparameter diff\n- DVC knows what invalidates training\n- Later, `dvc exp` can override the same keys per run',
      },
    ],
    startState: (() => {
      const s = pipelineRepo();
      s.files['src/prepare.py'] = makeFile('src/prepare.py', 'code');
      s.files['src/train.py'] = makeFile('src/train.py', 'code');
      s.pipeline = [
        {
          name: 'prepare',
          deps: ['data/data.xml', 'src/prepare.py'],
          outs: ['data/prepared.csv'],
          cmd: 'python src/prepare.py',
          params: [],
          metrics: [],
          frozen: false,
          upToDate: true,
        },
        {
          name: 'train',
          deps: ['data/prepared.csv', 'src/train.py'],
          outs: ['model.pkl'],
          cmd: 'python src/train.py',
          params: ['lr', 'n_estimators'],
          metrics: ['metrics.json'],
          frozen: false,
          upToDate: true,
        },
      ];
      s.files['data/prepared.csv'] = makeFile('data/prepared.csv', 'data');
      s.files['model.pkl'] = makeFile('model.pkl', 'data');
      s.files['dvc.yaml'] = makeFile('dvc.yaml', 'yaml');
      s.files['dvc.lock'] = makeFile('dvc.lock', 'yaml');
      s.metrics = { 'metrics.json:acc': 0.77 };
      s.gitCommits.push({
        hash: 'd0d0d0d',
        message: 'Add pipeline',
        pointers: { 'data/data.xml': s.files['data/data.xml'].pointerMd5! },
        pipelineSig: 'prepare|python src/prepare.py|data/data.xml,src/prepare.py>data/prepared.csv|frozen=false;train|python src/train.py|data/prepared.csv,src/train.py>model.pkl|frozen=false',
        params: { ...s.params },
        metrics: { ...s.metrics },
        files: ['dvc.yaml', 'dvc.lock', 'data/data.xml.dvc'],
      });
      return s;
    })(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'paramsAt', key: 'lr', value: 0.05 },
        { kind: 'stageUpToDate', name: 'train' },
      ],
    },
    solution: ['edit params.yaml lr=0.05', 'dvc repro'],
  },
];

export const experimentLevels: LevelDef[] = [
  {
    id: 'exp-1',
    series: 'exp',
    seriesTitle: 'Experiments',
    name: 'Run an experiment',
    difficulty: 3,
    par: 2,
    hint: 'dvc exp run',
    objective: 'Run your first experiment with `dvc exp run` on the existing pipeline.',
    learning: [
      'Experiments run the pipeline with recorded params + metrics',
      'Avoids git branch explosion for every hyperparameter try',
      'dvc exp show is the comparison table',
    ],
    startDialog: [
      {
        title: 'Why experiments are not git branches',
        markdown:
          'Teams sometimes do `git checkout -b exp-lr-0.05` for every trial. Branches multiply; comparison stays manual.\n\n`dvc exp run`:\n\n- executes the pipeline\n- snapshots params/metrics for that run\n- keeps the working branch clean\n\n```\ndvc exp run\ndvc exp show\n```',
      },
      {
        title: 'What you should notice',
        markdown:
          'After the run:\n\n- pipeline stages become up to date\n- metrics exist for that configuration\n- an experiment id appears (`exp-…`)\n\nThe learning goal is **process**: every serious training run is a recorded experiment, not a notebook cell you hope someone saved.',
      },
    ],
    startState: (() => {
      const s = pipelineRepo();
      s.pipeline = [
        {
          name: 'train',
          deps: ['data/data.xml', 'src/train.py'],
          outs: ['model.pkl'],
          cmd: 'python src/train.py',
          params: ['lr', 'n_estimators'],
          metrics: ['metrics.json'],
          frozen: false,
          upToDate: false,
        },
      ];
      return s;
    })(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'experimentCount', min: 1 }],
    },
    solution: ['dvc exp run'],
  },
  {
    id: 'exp-2',
    series: 'exp',
    seriesTitle: 'Experiments',
    name: 'Sweep a parameter',
    difficulty: 4,
    par: 4,
    hint: 'dvc exp run -S lr=0.05; dvc exp run -S lr=0.2; dvc exp show',
    objective:
      'Launch two parameter sweeps (`lr=0.05` and `lr=0.2`) using `dvc exp run -S`, then leave at least two experiments recorded.',
    learning: [
      '-S / --set-param overrides hyperparameters per experiment',
      'Sweeps are comparable only if data + code are fixed',
      'exp show turns folklore (“0.05 felt better”) into a table',
    ],
    startDialog: [
      {
        title: 'Controlled sweeps',
        markdown:
          'Change **one thing**: learning rate.\n\n```\ndvc exp run -S lr=0.05\ndvc exp run -S lr=0.2\ndvc exp show\n```\n\nIf data version and code stay constant, metric differences are attributable to `lr` — that is science, not vibes.',
      },
      {
        title: 'Production tip',
        markdown:
          'In real DVC, `-S` applies to that experiment run. Here the simulator keeps workspace params at the last set value — still run each sweep as a separate `exp run` so both appear in history.\n\nAlways `dvc exp show` before deciding.',
      },
    ],
    startState: (() => {
      const s = pipelineRepo();
      s.pipeline = [
        {
          name: 'train',
          deps: ['data/data.xml', 'src/train.py'],
          outs: ['model.pkl'],
          cmd: 'python src/train.py',
          params: ['lr', 'n_estimators'],
          metrics: ['metrics.json'],
          frozen: false,
          upToDate: false,
        },
      ];
      return s;
    })(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'experimentCount', min: 2 }],
    },
    solution: ['dvc exp run -S lr=0.05', 'dvc exp run -S lr=0.2'],
  },
  {
    id: 'exp-3',
    series: 'exp',
    seriesTitle: 'Experiments',
    name: 'Apply a winning experiment',
    difficulty: 4,
    par: 4,
    hint: 'dvc exp run -S lr=0.05; dvc exp show; dvc exp apply exp-xxxxxx',
    objective:
      'Run an experiment with `lr=0.05`, list experiments, then `dvc exp apply <id>` so workspace params become that experiment’s params.',
    learning: [
      'Selection after comparison — apply promotes a winner',
      'Workspace baseline becomes the chosen config',
      'Pointers + params + metrics stay linked for audit',
    ],
    startDialog: [
      {
        title: 'From table to baseline',
        markdown:
          '```\ndvc exp run -S lr=0.05\ndvc exp show\ndvc exp apply <exp-id>\n```\n\n`apply` copies that experiment’s params/metrics into the workspace — your new **baseline**.\n\nWithout apply, the “best run” lives only in history; nobody knows which config shipped.',
      },
      {
        title: 'Closing the loop',
        markdown:
          'You have now practiced the full DVC loop:\n\n**track data → share via remote → pipeline repro → experiment → promote winner**\n\nThat is the skill employers mean by “reproducible ML”, not memorizing flags.',
      },
    ],
    startState: (() => {
      const s = pipelineRepo();
      s.pipeline = [
        {
          name: 'train',
          deps: ['data/data.xml', 'src/train.py'],
          outs: ['model.pkl'],
          cmd: 'python src/train.py',
          params: ['lr', 'n_estimators'],
          metrics: ['metrics.json'],
          frozen: false,
          upToDate: false,
        },
      ];
      return s;
    })(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'experimentCount', min: 1 },
        { kind: 'paramsAt', key: 'lr', value: 0.05 },
      ],
    },
    solution: ['dvc exp run -S lr=0.05', 'dvc exp show', 'dvc exp apply exp-'],
  },
];

/** Two-version data history: HEAD has v1, HEAD~1 has v0; cache holds both. */
function twoVersionRepo(path = 'data/data.xml'): RepoState {
  const s = rawRepo();
  const md5v0 = fakeMd5(`file:${path}:v0`);
  const md5v1 = fakeMd5(`file:${path}:v1`);
  s.dataVersions[path] = 1;
  s.files[path] = makeFile(path, 'data', {
    contentId: md5v1,
    tracked: true,
    pointerMd5: md5v1,
    dirty: false,
    present: true,
    gitignored: true,
  });
  s.cache = [md5v0, md5v1];
  s.remoteObjects = [md5v0, md5v1];
  s.remotes = [{ name: 'myremote', url: '/tmp/dvcstore', isDefault: true }];
  s.files[`${path}.dvc`] = makeFile(`${path}.dvc`, 'dvc');
  s.files['data/.gitignore'] = makeFile('data/.gitignore', 'meta');
  s.gitCommits.push({
    hash: 'aaa0001',
    message: 'Add raw data',
    pointers: { [path]: md5v0 },
    pipelineSig: '',
    params: {},
    metrics: {},
    files: [`${path}.dvc`, 'data/.gitignore'],
  });
  s.gitCommits.push({
    hash: 'bbb0002',
    message: 'Dataset updates',
    pointers: { [path]: md5v1 },
    pipelineSig: '',
    params: {},
    metrics: {},
    files: [`${path}.dvc`],
  });
  s.commandHistory = [];
  return s;
}

function dirtyPipelineRepo(): RepoState {
  const s = pipelineRepo();
  s.pipeline = [
    {
      name: 'train',
      deps: ['data/data.xml', 'src/train.py'],
      outs: ['model.pkl'],
      cmd: 'python src/train.py',
      params: ['lr', 'n_estimators'],
      metrics: ['metrics.json'],
      frozen: false,
      upToDate: true,
    },
  ];
  s.files['model.pkl'] = makeFile('model.pkl', 'data');
  s.files['dvc.yaml'] = makeFile('dvc.yaml', 'yaml');
  s.files['dvc.lock'] = makeFile('dvc.lock', 'yaml');
  s.metrics = { 'metrics.json:acc': 0.7 };
  s.commandHistory = [];
  return s;
}

function promotePipelineRepo(): RepoState {
  const s = pipelineRepo();
  s.pipeline = [
    {
      name: 'train',
      deps: ['data/data.xml', 'src/train.py'],
      outs: ['model.pkl'],
      cmd: 'python src/train.py',
      params: ['lr', 'n_estimators'],
      metrics: ['metrics.json'],
      frozen: false,
      upToDate: false,
    },
  ];
  s.commandHistory = [];
  return s;
}

function capstoneRepo(): RepoState {
  const s = trackedDataRepo();
  s.files['src/train.py'] = makeFile('src/train.py', 'code');
  s.files['src/prepare.py'] = makeFile('src/prepare.py', 'code');
  s.files['params.yaml'] = makeFile('params.yaml', 'params', {
    contentId: fakeMd5('params:lr=0.1:n=10'),
  });
  s.params = { lr: 0.1, n_estimators: 10 };
  s.remotes = [];
  s.commandHistory = [];
  return s;
}

export const fieldLevels: LevelDef[] = [
  {
    id: 'field-1',
    series: 'field',
    seriesTitle: 'Field practice',
    name: 'Restore older data version',
    difficulty: 5,
    par: 2,
    hint: 'git checkout HEAD~1 data/data.xml.dvc; dvc checkout',
    objective:
      'Git history holds two data versions. Restore the older pointer and sync workspace bytes with `dvc checkout`.',
    learning: [
      'Data versions live in Git as pointer snapshots, not as file copies',
      'git checkout of a .dvc path switches the requested version pointer',
      'dvc checkout materializes cache objects into the workspace',
      'Incident skill: roll back data without hunting backups',
    ],
    fieldNotes: [
      'When a bad dataset ships: find the Git commit that still has the good pointer',
      'git checkout <good-sha> -- path/to/file.dvc && dvc checkout',
      'If cache lacks that md5, dvc pull --rev or restore from remote backup',
      'Never “fix data” by overwriting files on a shared server without a pointer commit',
    ],
    startDialog: [
      {
        title: 'The real rollback drill',
        markdown:
          'Your board should show `data/data.xml` at **v1** (Dataset updates).\n\nGoal: go back to **v0** (Add raw data):\n\n```\ngit checkout HEAD~1 data/data.xml.dvc\ndvc checkout\n```\n\nWatch Cache — both md5 objects stay; only the **pointer** and workspace link change.',
      },
      {
        title: 'Why two commands',
        markdown:
          '- `git checkout … -- file.dvc` → metadata says “this project wants hash X”\n- `dvc checkout` → put hash X’s bytes on disk\n\nSkipping DVC checkout leaves code training on **wrong bytes** while Git claims an old version. That silent mismatch is worse than a crash.',
      },
      {
        title: 'Interview-grade answer',
        markdown:
          '“DVC is not a second Git. Git versions *intent* (which data hash). DVC versions *payload* (objects). Rollback = move intent, then materialize payload.”',
      },
    ],
    startState: twoVersionRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'pointer', path: 'data/data.xml', md5: fakeMd5('file:data/data.xml:v0') },
        { kind: 'notDirty' },
        { kind: 'workspaceHas', paths: ['data/data.xml'] },
      ],
    },
    solution: ['git checkout HEAD~1 data/data.xml.dvc', 'dvc checkout'],
  },
  {
    id: 'field-2',
    series: 'field',
    seriesTitle: 'Field practice',
    name: 'Data changed → pipeline stale',
    difficulty: 4,
    par: 2,
    hint: 'edit data/data.xml; dvc repro',
    objective:
      'Pipeline looks green until data changes. Edit the dataset, then `dvc repro` so dependents re-run.',
    learning: [
      'Data files are first-class pipeline dependencies',
      'edit/dirty data invalidates stages that declared those deps',
      'dvc repro re-runs only what is stale — cost control at scale',
    ],
    fieldNotes: [
      'Nightly data refreshes should land as dvc add/commit + pipeline repro, not ad-hoc notebooks',
      'If repro “skips everything” unexpectedly, check whether deps actually changed hashes',
      'Pair data releases with pointer commits so metrics stay attributable',
    ],
    startDialog: [
      {
        title: 'Green until it isn’t',
        markdown:
          'Train is marked up to date. Then new data arrives:\n\n```\nedit data/data.xml\ndvc repro\n```\n\n`edit` here means *the dataset changed*. DVC should treat `train` as dirty because `data/data.xml` is a dependency.',
      },
      {
        title: 'Build-system thinking',
        markdown:
          'ML cost is compute. A reproducible DAG lets you answer:\n\n- what must re-run?\n- what can reuse cache?\n- what changed since last green build?\n\nWithout deps declared, everyone re-runs everything — or worse, nobody re-runs train.',
      },
    ],
    startState: dirtyPipelineRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'stageUpToDate', name: 'train' },
        { kind: 'workspaceHas', paths: ['model.pkl'] },
      ],
    },
    solution: ['edit data/data.xml', 'dvc repro'],
  },
  {
    id: 'field-3',
    series: 'field',
    seriesTitle: 'Field practice',
    name: 'Promote winner then repro',
    difficulty: 5,
    par: 3,
    hint: 'dvc exp run -S lr=0.05; dvc exp apply exp-…; dvc repro',
    objective:
      'Winning experiment must become the production baseline: run, apply, then `dvc repro` so artifacts match the new params.',
    learning: [
      'apply updates workspace params/metrics, not magically all artifacts',
      'After apply, stages are stale until repro materializes new outputs',
      'Shipping config without repro produces “params say X, model is Y”',
    ],
    fieldNotes: [
      'Release checklist: exp show → exp apply winner → dvc repro → git commit pointer/yaml/params → dvc push',
      'CI can re-run repro on the release commit to prove the model matches committed config',
    ],
    startDialog: [
      {
        title: 'The incomplete promotion',
        markdown:
          '```\ndvc exp run -S lr=0.05\ndvc exp apply <id>\ndvc repro\n```\n\nMany teams stop at apply. Metrics on the experiment are recorded; **model.pkl on disk** may still be the old run until repro.',
      },
      {
        title: 'Definition of done',
        markdown:
          'A baseline is done when:\n\n1. Git commit pins code + params + data pointers\n2. Pipeline outputs are regenerated (or cached) for that lock\n3. Remote holds the objects teammates need\n\nApply + repro is how you get (1) and (2) aligned.',
      },
    ],
    startState: promotePipelineRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'experimentCount', min: 1 },
        { kind: 'paramsAt', key: 'lr', value: 0.05 },
        { kind: 'stageUpToDate', name: 'train' },
        { kind: 'workspaceHas', paths: ['model.pkl'] },
      ],
    },
    solution: [
      'dvc exp run -S lr=0.05',
      'dvc exp apply exp-',
      'dvc repro',
    ],
  },
  {
    id: 'capstone-1',
    series: 'field',
    seriesTitle: 'Field practice',
    name: 'Capstone: ship a data version',
    difficulty: 5,
    par: 10,
    hint: 'remote add; push; stage prepare+train; repro; exp run; exp apply; (optionally repro again)',
    objective:
      'Ship a data-backed experiment end-to-end: remote, push, pipeline, repro, experiment, apply — then leave train up to date.',
    learning: [
      'Integrate the whole loop under time pressure',
      'Every missing step shows up as a broken board or failed goal',
      'Independence = knowing the next correct command from state, not a tutorial',
    ],
    fieldNotes: [
      'On a new repo: dvc init → track data → remote → push → pipeline → repro → exp',
      'Demo to stakeholders: show Git log + dvc exp show + board cache/remote alignment',
      'If you can explain this capstone aloud, you can survive a DVC onboarding week',
    ],
    startDialog: [
      {
        title: 'Capstone',
        markdown:
          'You have tracked `data/data.xml`, code for prepare/train, and params — **no remote, no pipeline runs**.\n\nDeliver:\n\n1. Default remote + `dvc push` data objects\n2. `prepare` then `train` stages + `dvc repro`\n3. `dvc exp run -S lr=0.05` + `dvc exp apply`\n4. End with `train` up to date and `model.pkl` present\n\nUse `steps` freely. This is a drill, not a trick.',
      },
      {
        title: 'Success looks like',
        markdown:
          'Board: data tracked, cache filled, remote holds objects.\nDAG: prepare → train reproduced.\nExperiments: at least one with `lr=0.05` applied.\n\nThat is a miniature production pipeline you can explain on an interview whiteboard.',
      },
    ],
    startState: capstoneRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'remoteConfigured', default: true },
        { kind: 'remoteHas', md5s: ['tracked:data/data.xml'] },
        { kind: 'stageExists', name: 'prepare' },
        { kind: 'stageExists', name: 'train' },
        { kind: 'stageUpToDate', name: 'train' },
        { kind: 'workspaceHas', paths: ['model.pkl'] },
        { kind: 'experimentCount', min: 1 },
        { kind: 'paramsAt', key: 'lr', value: 0.05 },
      ],
    },
    solution: [
      'dvc remote add -d myremote /tmp/dvcstore',
      'dvc push',
      'dvc stage add -n prepare -d data/data.xml -d src/prepare.py -o data/prepared.csv python src/prepare.py',
      'dvc stage add -n train -d data/prepared.csv -d src/train.py -p lr -p n_estimators -o model.pkl -m metrics.json python src/train.py',
      'dvc repro',
      'dvc exp run -S lr=0.05',
      'dvc exp apply exp-',
      'dvc repro',
    ],
  },
  {
    id: 'field-5',
    series: 'field',
    seriesTitle: 'Field practice',
    name: 'Freeze a production stage',
    difficulty: 4,
    par: 3,
    hint: 'dvc freeze train; edit params.yaml lr=0.2; dvc repro; dvc unfreeze train; dvc repro',
    objective:
      'Protect a production `train` artifact with freeze, see that repro skips it even when params change, then unfreeze and repro the new baseline.',
    learning: [
      'freeze pins a stage against input invalidation',
      'repro skips frozen stages by design — not a DVC bug',
      'unfreeze + repro is how you intentionally take a new baseline',
    ],
    fieldNotes: [
      'Use freeze on a blessed production model while you experiment on downstream evals',
      'Document freeze reasons in Git commit messages — silent freezes hide stale models',
      'Interview answer: freeze is a guardrail, not a substitute for review',
    ],
    startDialog: [
      {
        title: 'Why freeze exists',
        markdown:
          'You are investigating a data drift issue. You must **not** overwrite the production model while trying params.\n\n```\ndvc freeze train\nedit params.yaml lr=0.2\ndvc repro\n```\n\nExpect repro to **refuse** to re-run `train`. That refusal is the feature.',
      },
      {
        title: 'Then take the new baseline on purpose',
        markdown:
          '```\ndvc unfreeze train\ndvc repro\n```\n\nNow the pipeline is allowed to produce a new `model.pkl` for the new params.\n\nAlways unfreeze in a reviewed PR — otherwise “main” silently keeps old artifacts.',
      },
    ],
    startState: dirtyPipelineRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'paramsAt', key: 'lr', value: 0.2 },
        { kind: 'stageUpToDate', name: 'train' },
      ],
    },
    solution: [
      'dvc freeze train',
      'edit params.yaml lr=0.2',
      'dvc repro',
      'dvc unfreeze train',
      'dvc repro',
    ],
  },
  {
    id: 'field-6',
    series: 'field',
    seriesTitle: 'Field practice',
    name: 'Diagnose with status/diff',
    difficulty: 4,
    par: 3,
    hint: 'edit data/data.xml; dvc status; dvc diff; dvc commit',
    objective:
      'Intentionally dirty a tracked file, read `dvc status` and `dvc diff`, then accept the new data version with `dvc commit`.',
    learning: [
      'Diagnosis before action: status/diff show pointer vs content drift',
      'diff is the data analogue of git diff — hashes, not text hunks',
      'commit is an explicit acceptance of a new data version',
    ],
    fieldNotes: [
      'Incident: training loss spiked → dvc status/diff on dataset pointers first',
      'If diff shows unexpected md5 change, stop and find who ran add/push',
      'Never “quietly re-add” data without an explainable pointer commit',
    ],
    startDialog: [
      {
        title: 'Observe, then accept',
        markdown:
          '```\nedit data/data.xml\ndvc status\ndvc diff\ndvc commit\n```\n\nRead the board: workspace content id ≠ pointer. Cache will gain the new object only after commit.',
      },
      {
        title: 'What good engineers write down',
        markdown:
          'In PR/issue text include:\n\n- old md5 → new md5\n- why the data changed (source, filter, date range)\n- whether models must be retrained\n\nDVC gives you the hashes; you supply the narrative.',
      },
    ],
    startState: trackedDataRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'notDirty' },
        { kind: 'cacheHas', md5s: ['tracked:data/data.xml'] },
      ],
    },
    solution: ['edit data/data.xml', 'dvc status', 'dvc diff', 'dvc commit'],
  },
];

export const allLevels: LevelDef[] = [
  ...basicsLevels,
  ...remoteLevels,
  ...pipelineLevels,
  ...experimentLevels,
  ...metaLevels,
  ...compareLevels,
  ...campLevels,
  ...advancedLevels,
  ...registryLevels,
  ...fieldLevels,
];

export function getLevel(id: string): LevelDef | undefined {
  return allLevels.find((l) => l.id === id);
}

export function getLevelIndex(id: string): number {
  return allLevels.findIndex((l) => l.id === id);
}

export function getNextLevel(id: string): LevelDef | undefined {
  const i = getLevelIndex(id);
  return i >= 0 ? allLevels[i + 1] : undefined;
}

export function seriesOf(): { id: string; title: string; levels: LevelDef[] }[] {
  const order = ['basics', 'remote', 'pipe', 'exp', 'meta', 'cmp', 'camp', 'reg', 'field'];
  const titles: Record<string, string> = {
    basics: 'Basics',
    remote: 'Remotes',
    pipe: 'Pipelines',
    exp: 'Experiments',
    meta: 'Metafiles',
    cmp: 'Compare',
    camp: 'Camp / DVCLive',
    reg: 'Registry & CI',
    field: 'Field practice',
  };
  return order.map((id) => ({
    id,
    title: titles[id],
    levels: allLevels.filter((l) => l.series === id),
  }));
}

/** What an independent DVC user should be able to do after this course. */
export function curriculumOutcomes(): string[] {
  return [
    'Explain why Git alone cannot version large datasets/models',
    'Track data with dvc add and commit only pointers + ignore rules to Git',
    'Diagnose dirty data with dvc status / dvc diff and promote with dvc commit',
    'Configure a DVC remote and share objects with push/pull/fetch',
    'Reproduce after clone: git clone → dvc pull → data on disk',
    'Restore an older data version: git checkout <ref> -- path.dvc → dvc checkout',
    'Declare ML pipelines in dvc.yaml (deps/outs/params/metrics) and run dvc repro',
    'Read dvc.yaml / dvc.lock as the PR artifacts of an ML change',
    'Use nested params (prepare.seed) and directory outputs',
    'Recognize run-cache skips when inputs/params are unchanged',
    'Compare iterations with dvc params/metrics/plots diff',
    'Fetch registry data with dvc get / import / import-url',
    'Know when a stage is dirty and why repro skipped or re-ran work',
    'Freeze/unfreeze stages to protect production artifacts intentionally',
    'Run controlled experiments with dvc exp run -S and compare with exp show',
    'Promote a winning experiment with dvc exp apply, then repro the baseline',
    'Read the board: Workspace pointers ↔ cache objects ↔ remote artifacts',
    'Answer “which data produced this model?” using Git + DVC history',
    'Use `concepts` as a field glossary when stuck on a real project',
    'Instrument training with DVCLive (log_metric/plot, reports)',
    'Use plots templates (linear/confusion) and plots diff',
    'Queue sweeps with exp run --queue and queue start',
    'Use foreach stages and advanced flags (wdir, always-changed, no-cache)',
    'Harden collab: .dvcignore, dvc update, CML PR comments',
    'Choose Git-LFS vs DVC deliberately',
    'Read data in apps with dvc.api',
  ];
}
