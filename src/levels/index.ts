import type { LevelDef, RepoState } from '../engine/types';
import { emptyState, ensureGit, makeFile } from '../engine/state';
import { fakeMd5 } from '../engine/hash';

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
      'DVC extends Git for data. Initialize a DVC project, stage the internal `.dvc` metadata, and commit it with Git.',
    startDialog: [
      {
        title: 'Welcome to LearnDVC',
        markdown:
          'Git versions code well — not datasets and models. **DVC** versions data by storing content in a cache/remote and tracking small pointer files with Git.\n\nWatch the **Workspace → Cache → Remote** board. That material flow is what DVC actually does.',
      },
      {
        title: 'Level goal',
        markdown:
          'Run `dvc init`, stage `.dvc`, and commit.\n\nMeta commands: `levels`, `hint`, `show goal`, `reset`, `undo`, `help`.',
      },
    ],
    startState: emptyState(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'initialized', value: true },
        { kind: 'gitCommitMessageIncludes', text: 'Initialize DVC' },
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
      'Track `data/data.xml` with `dvc add`. Content goes to cache; a `.dvc` pointer appears; the data path is gitignored. Commit the pointer with Git.',
    startDialog: [
      {
        title: 'What `dvc add` does',
        markdown:
          '1. Hashes the data file (md5)\n2. Stores the object in `.dvc/cache`\n3. Creates a small **`.dvc` pointer** Git can track\n4. Gitignores the raw data path\n\nCommit **the pointer**, not the raw bytes.',
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
        { kind: 'gitCommitMessageIncludes', text: 'Add raw data' },
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
      'Change the dataset, inspect `dvc status`, commit the new content into cache/pointer with `dvc commit`, then record the pointer change in Git.',
    startDialog: [
      {
        title: 'Modify ≠ lose history',
        markdown:
          'Simulate a data refresh:\n\n```\nedit data/data.xml\n```\n\n`dvc status` shows **modified**. `dvc commit` points the `.dvc` file at the new hash and caches it. Git versions the updated pointer.',
      },
    ],
    startState: trackedDataRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'tracked', paths: ['data/data.xml'] },
        { kind: 'notDirty' },
        { kind: 'gitCommitMessageIncludes', text: 'Dataset updates' },
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
      'Data does not travel with Git clones. Configure a default DVC remote (local path is fine in this simulator).',
    startDialog: [
      {
        title: 'Why remotes exist',
        markdown:
          '`.dvc` pointers go to Git. **Cache objects** go to remote storage (S3, GCS, SSH, a local folder, …).\n\n`dvc remote add -d <name> <url>` sets the default remote used by `push`/`pull`/`fetch`.',
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
    objective: 'Configure a remote if needed, then upload cached data with `dvc push`.',
    startDialog: [
      {
        title: 'push = cache → remote',
        markdown:
          'After `dvc add`, objects live in local cache. `dvc push` copies missing objects to the default remote.\n\nGit remotes and DVC remotes are **different stores**.',
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
    startDialog: [
      {
        title: 'clone git → pull dvc',
        markdown:
          'A teammate cloned Git history: they get `.dvc` pointers immediately, but **not** the heavy data.\n\n`dvc pull` = fetch from remote + checkout into the workspace.',
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
    hint: 'dvc stage add -n prepare -d data/data.xml -o data/prepared.csv python src/prepare.py; (ensure code file exists — edit or it is seeded)',
    objective:
      'Define a `prepare` stage in `dvc.yaml` that depends on raw data and writes `data/prepared.csv`.',
    startDialog: [
      {
        title: 'Pipelines as code',
        markdown:
          'DVC can act as a **build system** for ML workflows. Stages declare deps, outs, params, metrics, and a command.\n\n```\ndvc stage add -n prepare \\\n  -d data/data.xml -d src/prepare.py \\\n  -o data/prepared.csv \\\n  python src/prepare.py\n```',
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
    startDialog: [
      {
        title: 'repro',
        markdown:
          '`dvc repro` runs out-of-date stages in dependency order, then writes `dvc.lock`.\n\n```\ndvc stage add -n train \\\n  -d data/prepared.csv -d src/train.py -p lr -p n_estimators \\\n  -o model.pkl -m metrics.json \\\n  python src/train.py\n```\n\nUse `-p lr` / `-m metrics.json` so params and metrics are linked to the stage.',
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
    startDialog: [
      {
        title: 'Params drive re-runs',
        markdown:
          'When a `params.yaml` value linked with `-p` changes, DVC marks the stage dirty.\n\n```\nedit params.yaml lr=0.05\ndvc repro\n```\n\nInspect with `dvc params show` and `dvc metrics show`.',
      },
    ],
    startState: (() => {
      const s = pipelineRepo();
      s.files['src/prepare.py'] = makeFile('src/prepare.py', 'code');
      s.files['src/train.py'] = makeFile('src/train.py', 'code');
      // pre-define pipeline as already built once
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
    startDialog: [
      {
        title: 'Experiments without branch chaos',
        markdown:
          '`dvc exp run` executes the pipeline in an experiment context, recording params and metrics.\n\nInspect results with `dvc exp show`.',
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
    startDialog: [
      {
        title: 'Set params for one run',
        markdown:
          '```\ndvc exp run -S lr=0.05\ndvc exp run -S lr=0.2\ndvc exp show\n```\n\n`-S` / `--set-param` changes params for that experiment only (in this simulator params persist until you change them — apply a different value for each run).',
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
    startDialog: [
      {
        title: 'Promote an experiment',
        markdown:
          'When an experiment wins, apply it to the workspace:\n\n```\ndvc exp show\ndvc exp apply <exp-id>\n```\n\nThe goal checks that `lr` is `0.05` and at least one experiment exists.',
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

export const allLevels: LevelDef[] = [
  ...basicsLevels,
  ...remoteLevels,
  ...pipelineLevels,
  ...experimentLevels,
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
  const order = ['basics', 'remote', 'pipe', 'exp'];
  const titles: Record<string, string> = {
    basics: 'Basics',
    remote: 'Remotes',
    pipe: 'Pipelines',
    exp: 'Experiments',
  };
  return order.map((id) => ({
    id,
    title: titles[id],
    levels: allLevels.filter((l) => l.series === id),
  }));
}
