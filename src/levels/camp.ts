import type { LevelDef, RepoState } from '../engine/types';
import { emptyState, ensureGit, makeFile } from '../engine/state';
import { fakeMd5 } from '../engine/hash';

function courseRepo(): RepoState {
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
  s.files['src/train.py'] = makeFile('src/train.py', 'code');
  s.files['src/evaluate.py'] = makeFile('src/evaluate.py', 'code');
  s.files['params.yaml'] = makeFile('params.yaml', 'params');
  s.params = { 'train.lr': 0.1, 'train.n_est': 50, 'featurize.max_features': 100 };
  s.remotes = [{ name: 'myremote', url: 's3://bucket/dvcstore', isDefault: true }];
  s.pipeline = [
    {
      name: 'train',
      deps: ['data/data.xml', 'src/train.py'],
      outs: ['model.pkl'],
      cmd: 'python src/train.py',
      params: ['train.lr', 'train.n_est'],
      metrics: ['eval/metrics.json'],
      frozen: false,
      upToDate: false,
    },
  ];
  s.files['dvc.yaml'] = makeFile('dvc.yaml', 'yaml');
  s.live = { active: false, step: 0, metrics: {}, images: [], plotData: [] };
  s.expQueue = [];
  s.dvcIgnore = [];
  s.stageMeta = {};
  s.plots = {};
  s.runCache = [];
  s.commandHistory = [];
  s.gitCommits.push({
    hash: 'c0ffee1',
    message: 'Add raw data',
    pointers: { 'data/data.xml': fakeMd5('file:data/data.xml:v0') },
    pipelineSig: 'train',
    params: { ...s.params },
    metrics: {},
    files: ['data/data.xml.dvc'],
  });
  return s;
}

/** Targets a data-camp / official-get-started level DVC learner must hit. */
export const campLevels: LevelDef[] = [
  {
    id: 'camp-1',
    series: 'camp',
    seriesTitle: 'DVCLive',
    name: 'Instrument with DVCLive',
    difficulty: 4,
    par: 5,
    hint: 'dvc live start; dvc live log param train.lr=0.05; dvc live log metric acc=0.92; dvc live log plot roc.json; dvc live report',
    objective:
      'Exercise the **DVCLive** surface courses teach: Live start, log_param, log_metric, log_plot, make report.',
    learning: [
      'DVCLive lives in training code (not a separate notebook hack)',
      'log_metric → scalars for metrics show/exp',
      'log_plot → series for plots show/diff templates',
      'make_report → human HTML',
    ],
    fieldNotes: [
      'Replace print(loss) with live.log_metric — then plots/exp work for free',
      'Commit dvc.yaml metrics/plots hooks DVCLive generates',
    ],
    startDialog: [
      {
        title: 'What every DVC course adds after pipelines',
        markdown:
          'Official Get Started **Metrics/Plots** chapter is powered by DVCLive in `evaluate.py`.\n\n```\ndvc live start\ndvc live log param train.lr=0.05\ndvc live log metric acc=0.92\ndvc live log metric loss=0.21\ndvc live log image confusion.png\ndvc live log plot roc.json\ndvc live report\n```\n\nHere we simulate the API so you learn **what to call** and **why**.',
      },
      {
        title: 'Mental map',
        markdown:
          '| API | Artifact |\n| --- | --- |\n| log_param | params.yaml keys |\n| log_metric | metrics.json scalars |\n| log_plot | plots series / JSON |\n| log_image | report images |\n| make_report | HTML dashboard |\n\nWithout this layer, `exp show` and `plots diff` stay empty in real projects.',
      },
    ],
    startState: courseRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'liveMetricLogged', name: 'acc' },
        { kind: 'runCacheHits', min: 0 },
      ],
    },
    solution: [
      'dvc live start',
      'dvc live log param train.lr=0.05',
      'dvc live log metric acc=0.92',
      'dvc live log plot roc.json',
      'dvc live report',
    ],
  },
  {
    id: 'camp-2',
    series: 'camp',
    seriesTitle: 'DVCLive',
    name: 'Plots templates',
    difficulty: 3,
    par: 4,
    hint: 'dvc repro; dvc plots show --template linear; dvc plots show --template confusion; dvc plots diff',
    objective:
      'Render plots with course templates: `simple`/`linear`/`confusion`, then `plots diff`.',
    learning: [
      'Templates are how teams standardize ROC/PR/confusion figures',
      'dvc.yaml can pin plots: templates (official Get Started does this)',
      'diff overlays iterations instead of exporting two PNGs by hand',
    ],
    fieldNotes: [
      'Reviewers want the same chart type every PR — pin templates in YAML',
    ],
    startDialog: [
      {
        title: 'Beyond a debug print',
        markdown:
          '```\ndvc repro\ndvc plots show --template linear\ndvc plots show --template confusion\ndvc plots diff\n```',
      },
      {
        title: 'Where templates live',
        markdown:
          'Real `dvc.yaml`:\n\n```\nplots:\n- ROC:\n    template: simple\n    x: fpr\n    y: tpr\n```\n\nYou do not hand-draw Vega; you declare intent.',
      },
    ],
    startState: courseRepo(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'stageUpToDate', name: 'train' }],
    },
    solution: [
      'dvc repro',
      'dvc plots show --template linear',
      'dvc plots show --template confusion',
      'dvc plots diff',
    ],
  },
  {
    id: 'camp-3',
    series: 'camp',
    seriesTitle: 'Queue & sweeps',
    name: 'Queue a parameter sweep',
    difficulty: 4,
    par: 5,
    hint: 'dvc exp run --queue -S train.n_est=50; dvc exp run --queue -S train.n_est=100; dvc queue status; dvc queue start',
    objective:
      'Park two sweep runs in the **experiment queue**, inspect status, then execute with `dvc queue start`.',
    learning: [
      'Course pattern: queue many -S variants, then run-all',
      'queue status shows pending jobs before burning GPU time',
      'Results land as normal experiments (exp show)',
    ],
    fieldNotes: [
      'On shared runners use queue + CML instead of one mega-bash loop',
    ],
    startDialog: [
      {
        title: 'Do not babysit one job',
        markdown:
          '```\ndvc exp run --queue -S train.n_est=50\ndvc exp run --queue -S train.n_est=100\ndvc queue status\ndvc queue start\n```\n\nOr `dvc exp run --run-all`.',
      },
      {
        title: 'Why courses teach queue',
        markdown:
          'A 10-point grid search should be **declarative**. Queue N configs, check `queue status`, then execute.\n\nFailures stay attributable per experiment id in `exp show`.',
      },
    ],
    startState: courseRepo(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'experimentCount', min: 2 }],
    },
    solution: [
      'dvc exp run --queue -S train.n_est=50',
      'dvc exp run --queue -S train.n_est=100',
      'dvc queue status',
      'dvc queue start',
    ],
  },
  {
    id: 'camp-4',
    series: 'camp',
    seriesTitle: 'Pipeline depth',
    name: 'foreach stage + advanced flags',
    difficulty: 5,
    par: 4,
    hint: 'dvc stage add -n featurize --foreach a,b -p featurize.max_features -d src/evaluate.py -o data/features python src/evaluate.py; dvc stage list',
    objective:
      'Create a **foreach** stage (matrix expansion) and recognize advanced stage flags courses mention: `--wdir`, `--always-changed`, `--outs-no-cache`.',
    learning: [
      'foreach expands one definition into many stages (featurize[a], featurize[b])',
      'always_changed = never run-cache skip',
      'no-cache outs / external paths = data lives outside DVC cache',
    ],
    fieldNotes: [
      'foreach beats copy-paste YAML for per-model / per-region jobs',
    ],
    startDialog: [
      {
        title: 'The next 20% of pipelines',
        markdown:
          '```\ndvc stage add -n featurize --foreach a,b \\\n  -p featurize.max_features \\\n  -d src/evaluate.py -o data/features \\\n  python src/evaluate.py\ndvc stage list\n```\n\nAlso know: `--wdir`, `--always-changed`, `-O` / `--outs-no-cache`, `s3://…` external outs.',
      },
      {
        title: 'Flags cheat-sheet',
        markdown:
          '| Flag | Meaning |\n| --- | --- |\n| --foreach a,b | matrix stages |\n| --wdir src | run from another dir |\n| --always-changed | skip cache |\n| --outs-no-cache | do not cache out |\n| s3://… deps/outs | external path |',
      },
    ],
    startState: courseRepo(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'stageExists', name: 'featurize' }],
    },
    solution: [
      'dvc stage add -n featurize --foreach a,b -p featurize.max_features -d src/evaluate.py -o data/features python src/evaluate.py',
      'dvc stage list',
    ],
  },
  {
    id: 'camp-5',
    series: 'camp',
    seriesTitle: 'Collab & CI',
    name: '.dvcignore + update + CML comment',
    difficulty: 4,
    par: 5,
    hint: 'edit .dvcignore scratch/*; dvc update data/data.xml.dvc; dvc repro; dvc cml "accuracy improved"',
    objective:
      'Do the collab trio courses drill: **`.dvcignore`**, **`dvc update`** (imports), and a **CML-style PR comment**.',
    learning: [
      '.dvcignore speeds DVC on huge noisy trees',
      'dvc update refreshes imported registry files',
      'CML posts metrics to PRs: clone → pull → repro → cml comment',
    ],
    fieldNotes: [
      'CI without dvc pull is a lie about reproducibility',
      'Git-LFS versions blobs in Git remotes; DVC splits pointers + object store + pipeline/exp',
    ],
    startDialog: [
      {
        title: 'Team-day checklist',
        markdown:
          '```\nedit .dvcignore scratch/*\ndvc update data/data.xml.dvc\ndvc repro\ndvc cml \"accuracy improved\"\n```\n\nThen `dvc api` shows how apps read data without a full checkout.',
      },
      {
        title: 'Git-LFS vs DVC (exam favorite)',
        markdown:
          '- **Git-LFS**: large blobs via Git hosts\n- **DVC**: Git keeps pointers/YAML; remotes keep objects; plus repro/exp\n- ML wants pipelines + experiments → DVC; generic big binaries may be enough with LFS',
      },
    ],
    startState: courseRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'ignoredPath', path: 'scratch' },
        { kind: 'importUpdated', path: 'data/data.xml' },
      ],
    },
    solution: [
      'edit .dvcignore scratch/*',
      'dvc update data/data.xml.dvc',
      'dvc repro',
      'dvc cml "accuracy improved"',
      'dvc api',
    ],
  },
];
