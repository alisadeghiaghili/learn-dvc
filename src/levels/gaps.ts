import type { LevelDef, RepoState } from '../engine/types';
import { emptyState, ensureGit, makeFile } from '../engine/state';
import { fakeMd5 } from '../engine/hash';

function metaBase(): RepoState {
  const s = emptyState();
  s.initialized = true;
  ensureGit(s);
  s.files['.dvc/config'] = makeFile('.dvc/config', 'meta');
  s.files['.dvc/.gitignore'] = makeFile('.dvc/.gitignore', 'meta');
  s.files['data/data.xml'] = makeFile('data/data.xml', 'data', {
    contentId: fakeMd5('file:data/data.xml:v0'),
    tracked: true,
    pointerMd5: fakeMd5('file:data/data.xml:v0'),
    gitignored: true,
  });
  s.cache = [fakeMd5('file:data/data.xml:v0')];
  s.files['data/data.xml.dvc'] = makeFile('data/data.xml.dvc', 'dvc');
  s.files['data/.gitignore'] = makeFile('data/.gitignore', 'meta');
  s.files['src/prepare.py'] = makeFile('src/prepare.py', 'code');
  s.files['params.yaml'] = makeFile('params.yaml', 'params');
  s.params = {
    'prepare.seed': 20170428,
    'prepare.split': 0.2,
    'train.n_est': 50,
  };
  s.gitCommits.push({
    hash: 'c0ffee1',
    message: 'Add raw data',
    pointers: { 'data/data.xml': fakeMd5('file:data/data.xml:v0') },
    pipelineSig: '',
    params: { ...s.params },
    metrics: {},
    files: ['data/data.xml.dvc', 'data/.gitignore'],
  });
  s.commandHistory = [];
  s.runCache = [];
  s.plots = {};
  return s;
}

export const metaLevels: LevelDef[] = [
  {
    id: 'meta-1',
    series: 'meta',
    seriesTitle: 'Metafiles',
    name: 'Read dvc.yaml and dvc.lock',
    difficulty: 3,
    par: 4,
    hint: 'dvc stage add -n prepare -p prepare.seed -p prepare.split -d data/data.xml -d src/prepare.py -o data/prepared python src/prepare.py; dvc repro; cat dvc.yaml; cat dvc.lock',
    objective:
      'Create a prepare stage with nested params and a **directory output**, reproduce it, then read the real metafiles `dvc.yaml` and `dvc.lock`.',
    learning: [
      'dvc.yaml is the contract (cmd/deps/params/outs) — Git versions this file',
      'dvc.lock is the receipt (hashes of what actually ran)',
      'Nested params use dotted keys: prepare.seed, not only flat lr',
      'Directory outs (data/prepared) are first-class DVC outputs',
    ],
    fieldNotes: [
      'PR review of ML work = review dvc.yaml/dvc.lock diffs + pointer diffs',
      'Never hand-edit dvc.lock; let repro write it',
      'If lock and yaml disagree, trust status/repro, not your memory',
    ],
    startDialog: [
      {
        title: 'Metafiles are the product',
        markdown:
          'Commands write **files Git should review**:\n\n- `dvc.yaml` — stage definitions\n- `dvc.lock` — exact md5s/params used in the last repro\n\n```\ndvc stage add -n prepare \\\n  -p prepare.seed -p prepare.split \\\n  -d data/data.xml -d src/prepare.py \\\n  -o data/prepared \\\n  python src/prepare.py\ndvc repro\ncat dvc.yaml\ncat dvc.lock\n```',
      },
      {
        title: 'Why nested params matter',
        markdown:
          'Real projects use trees in `params.yaml`:\n\n```\nprepare:\n  seed: 20170428\n  split: 0.2\n```\n\n`-p prepare.seed` wires **that key** to the stage. Changing `train.n_est` must not dirty `prepare`.',
      },
      {
        title: 'Directory outputs',
        markdown:
          '`-o data/prepared` is a **folder** of features/splits — not one file.\n\nDVC hashes the directory as one object. Board/lock show it as a dir output. That is how teams version `processed/` or `features/` trees.',
      },
    ],
    startState: metaBase(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'stageExists', name: 'prepare' },
        { kind: 'stageUpToDate', name: 'prepare' },
        { kind: 'workspaceHas', paths: ['data/prepared'] },
      ],
    },
    solution: [
      'dvc stage add -n prepare -p prepare.seed -p prepare.split -d data/data.xml -d src/prepare.py -o data/prepared python src/prepare.py',
      'dvc repro',
      'cat dvc.yaml',
      'cat dvc.lock',
    ],
  },
  {
    id: 'meta-2',
    series: 'meta',
    seriesTitle: 'Metafiles',
    name: 'Run cache skip',
    difficulty: 4,
    par: 5,
    hint: 'dvc repro; edit params.yaml train.n_est=80; dvc repro; edit params.yaml train.n_est=50; dvc repro',
    objective:
      'Train once, change a param, train again, then **revert the param** and `dvc repro` — the third run must hit the **run cache** instead of re-training.',
    learning: [
      'Run cache keys = stage cmd + dep hashes + linked param values',
      'Same signature → restore outputs without re-running the command',
      'Official docs: change n_est then change it back — second matching run is free',
    ],
    fieldNotes: [
      'CI can share run cache to avoid re-training unchanged stages',
      'If you expect a skip and do not get it, a dep hash or param moved',
    ],
    startDialog: [
      {
        title: 'Build-system behavior',
        markdown:
          '```\ndvc repro\nedit params.yaml train.n_est=80\ndvc repro\nedit params.yaml train.n_est=50\ndvc repro\n```\n\nThe **third** repro should print `restored from run cache` — same inputs as run #1.',
      },
      {
        title: 'Why this pays rent',
        markdown:
          'A/B tests often bounce one hyperparameter. Without run cache you re-train twice. With it, the known configuration is a cache hit and you only pay for novelty.',
      },
    ],
    startState: (() => {
      const s = metaBase();
      s.params = {
        'prepare.seed': 20170428,
        'prepare.split': 0.2,
        'train.n_est': 50,
      };
      s.pipeline = [
        {
          name: 'train',
          deps: ['data/data.xml', 'src/prepare.py'],
          outs: ['model.pkl'],
          cmd: 'python src/prepare.py',
          params: ['train.n_est'],
          metrics: ['eval/metrics.json'],
          frozen: false,
          upToDate: false,
        },
      ];
      s.files['dvc.yaml'] = makeFile('dvc.yaml', 'yaml');
      return s;
    })(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'paramsAt', key: 'train.n_est', value: 50 },
        { kind: 'stageUpToDate', name: 'train' },
        { kind: 'runCacheHits', min: 1 },
      ],
    },
    solution: [
      'dvc repro',
      'edit params.yaml train.n_est=80',
      'dvc repro',
      'edit params.yaml train.n_est=50',
      'dvc repro',
    ],
  },
  {
    id: 'meta-3',
    series: 'meta',
    seriesTitle: 'Metafiles',
    name: 'Nested param invalidation',
    difficulty: 4,
    par: 3,
    hint: 'edit params.yaml prepare.split=0.3; cat params.yaml; dvc repro',
    objective:
      'Change a **nested** param (`prepare.split`), inspect `params.yaml`, and `dvc repro` so only dependents re-run.',
    learning: [
      'Dotted keys map into YAML sections teams actually use',
      'Invalidation is key-scoped when stages list those keys in -p',
      'lock records the param values used for the receipt',
    ],
    fieldNotes: [
      'Hyperparameter PRs should only show the param subtree + lock delta',
      'Avoid dumping all params into every stage — keep -p tight',
    ],
    startDialog: [
      {
        title: 'Surgical repro',
        markdown:
          '```\nedit params.yaml prepare.split=0.3\ncat params.yaml\ndvc repro\n```\n\n`prepare` depends on `prepare.split` → must re-run.\nChanging `train.n_est` alone would not dirty `prepare`.',
      },
      {
        title: 'lock will tell on you',
        markdown:
          'After repro, `cat dvc.lock` should show `prepare.split: 0.3`.\n\nIf you forget to repro, lock stays stale and `dvc status` would disagree with your notebook metric.',
      },
    ],
    startState: (() => {
      const s = metaBase();
      s.pipeline = [
        {
          name: 'prepare',
          deps: ['data/data.xml', 'src/prepare.py'],
          outs: ['data/prepared'],
          cmd: 'python src/prepare.py',
          params: ['prepare.seed', 'prepare.split'],
          metrics: [],
          frozen: false,
          upToDate: true,
          outDirs: ['data/prepared'],
          lastRunSig: 'seed',
        },
      ];
      s.files['data/prepared'] = makeFile('data/prepared', 'data');
      s.files['dvc.yaml'] = makeFile('dvc.yaml', 'yaml');
      s.files['dvc.lock'] = makeFile('dvc.lock', 'yaml');
      s.runCache = [];
      return s;
    })(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'paramsAt', key: 'prepare.split', value: 0.3 },
        { kind: 'stageUpToDate', name: 'prepare' },
      ],
    },
    solution: ['edit params.yaml prepare.split=0.3', 'cat params.yaml', 'dvc repro'],
  },
];

export const compareLevels: LevelDef[] = [
  {
    id: 'cmp-1',
    series: 'cmp',
    seriesTitle: 'Compare',
    name: 'params/metrics/plots diff',
    difficulty: 4,
    par: 5,
    hint: 'dvc repro; dvc params diff; dvc metrics diff; dvc plots show',
    objective:
      'After a run, use the comparison family: `dvc params diff`, `dvc metrics diff`, and `dvc plots show`.',
    learning: [
      'Iteration review is a **diff**, not a memory of last notebook cell',
      'params diff = what changed vs last commit/HEAD',
      'metrics/plots diff = did quality move and how',
    ],
    fieldNotes: [
      'SOP after every training run: params diff + metrics diff + plots show',
      'Paste these outputs into the PR instead of screenshots alone',
    ],
    startDialog: [
      {
        title: 'Compare like an engineer',
        markdown:
          '```\ndvc repro\ndvc params diff\ndvc metrics diff\ndvc plots show\n```\n\nOfficial Get Started teaches this trio right after pipelines. If you skip it, you cannot defend a model upgrade.',
      },
      {
        title: 'What “good” looks like',
        markdown:
          '- params diff lists the exact hyperparameter delta\n- metrics diff shows Change column (sign + magnitude)\n- plots show opens curves (here: loss/acc series)\n\nPaste those three into the review thread.',
      },
    ],
    startState: (() => {
      const s = metaBase();
      s.pipeline = [
        {
          name: 'train',
          deps: ['data/data.xml', 'src/prepare.py'],
          outs: ['model.pkl'],
          cmd: 'python src/prepare.py',
          params: ['train.n_est'],
          metrics: ['eval/metrics.json'],
          frozen: false,
          upToDate: false,
        },
      ];
      s.files['params.yaml'] = makeFile('params.yaml', 'params');
      s.files['dvc.yaml'] = makeFile('dvc.yaml', 'yaml');
      return s;
    })(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'stageUpToDate', name: 'train' },
        { kind: 'workspaceHas', paths: ['model.pkl'] },
      ],
    },
    solution: [
      'dvc repro',
      'dvc params diff',
      'dvc metrics diff',
      'dvc plots show',
    ],
  },
  {
    id: 'cmp-2',
    series: 'cmp',
    seriesTitle: 'Compare',
    name: 'exp diff two runs',
    difficulty: 4,
    par: 4,
    hint: 'dvc exp run -S train.n_est=50; dvc exp run -S train.n_est=100; dvc exp diff',
    objective:
      'Run two experiments with different nested hyperparameters and compare them with `dvc exp diff`.',
    learning: [
      'Two runs + diff > one run and a guess',
      'Nested keys work with -S (train.n_est=…)',
      'exp diff is the decision artifact',
    ],
    fieldNotes: [
      'Keep sweeps single-variable when possible',
      'Record the winning id before apply',
    ],
    startDialog: [
      {
        title: 'Sweep then diff',
        markdown:
          '```\ndvc exp run -S train.n_est=50\ndvc exp run -S train.n_est=100\ndvc exp diff\n```',
      },
      {
        title: 'Nested -S keys',
        markdown:
          'Note `train.n_est=…` — the same dotted key as `params.yaml` / stage `-p`.\n\n`dvc exp diff` prints the param and metric deltas between the last two experiments.',
      },
    ],
    startState: (() => {
      const s = metaBase();
      s.pipeline = [
        {
          name: 'train',
          deps: ['data/data.xml', 'src/prepare.py'],
          outs: ['model.pkl'],
          cmd: 'python src/prepare.py',
          params: ['train.n_est'],
          metrics: ['eval/metrics.json'],
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
    solution: [
      'dvc exp run -S train.n_est=50',
      'dvc exp run -S train.n_est=100',
      'dvc exp diff',
    ],
  },
];

export const registryLevels: LevelDef[] = [
  {
    id: 'reg-1',
    series: 'reg',
    seriesTitle: 'Registry & CI',
    name: 'get from a data registry',
    difficulty: 3,
    par: 2,
    hint: 'dvc get https://github.com/treeverse/dataset-registry get-started/data.xml -o data/from_registry.xml',
    objective:
      'Use `dvc get` to copy a tracked artifact from an external DVC project (data registry) without history bloat.',
    learning: [
      'Data registry = another Git+DVC repo as a source of datasets',
      'get downloads without creating a .dvc pointer (one-shot copy)',
      'import versions a dependency and writes a .dvc file',
    ],
    fieldNotes: [
      'Central datasets repo + project repos that get/import from it',
      'Pin import revisions so teams do not silently drift',
    ],
    startDialog: [
      {
        title: 'Registry pattern',
        markdown:
          '```\ndvc get https://github.com/treeverse/dataset-registry \\\n  get-started/data.xml -o data/from_registry.xml\n```\n\nThis is how Get Started seeds `data.xml` in the wild. Our simulator only needs the command shape + why.',
      },
      {
        title: 'get vs import',
        markdown:
          '- **get** — copy now, do not track\n- **import** — tracked dependency (creates `.dvc`, can `update` later)\n- **import-url** — track an arbitrary URL as data',
      },
    ],
    startState: metaBase(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'workspaceHas', paths: ['data/from_registry.xml'] }],
    },
    solution: [
      'dvc get https://github.com/treeverse/dataset-registry get-started/data.xml -o data/from_registry.xml',
    ],
  },
  {
    id: 'reg-2',
    series: 'reg',
    seriesTitle: 'Registry & CI',
    name: 'import tracked dependency',
    difficulty: 4,
    par: 2,
    hint: 'dvc import https://github.com/treeverse/dataset-registry get-started/data.xml -o data/imported.xml',
    objective:
      'Use `dvc import` so the external dataset becomes a **versioned** DVC-tracked dependency (`.dvc` pointer).',
    learning: [
      'import writes a .dvc and tracks content like dvc add',
      'Better than get when you must update/repro against that source later',
      'CI clones project + dvc pull can restore imported objects',
    ],
    fieldNotes: [
      'Prefer import for long-lived dataset edges between repos',
      'Document the registry URL in the PR description',
    ],
    startDialog: [
      {
        title: 'Track the edge',
        markdown:
          '```\ndvc import https://github.com/treeverse/dataset-registry \\\n  get-started/data.xml -o data/imported.xml\n```\n\nBoard should show a tracked file + cache object — not only a loose download.',
      },
      {
        title: 'When to prefer import',
        markdown:
          'If a stage depends on this data long-term, use **import** so `dvc update` / repro stay honest.\n\n`get` is for ad-hoc copies and training scripts outside the pipeline graph.',
      },
    ],
    startState: metaBase(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'tracked', paths: ['data/imported.xml'] },
        { kind: 'cacheHas', md5s: ['tracked:data/imported.xml'] },
      ],
    },
    solution: [
      'dvc import https://github.com/treeverse/dataset-registry get-started/data.xml -o data/imported.xml',
    ],
  },
];
