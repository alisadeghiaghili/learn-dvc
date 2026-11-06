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

/** courseRepo whose src/train.py already uses DVCLive (`Live()` / `log_metric`). */
function liveCourseRepo(): RepoState {
  const s = courseRepo();
  s.live.instrumented = true;
  s.pipeline[0]!.metrics = ['dvclive/metrics.json'];
  return s;
}

/** A dvc.yaml with a dictionary `foreach` that expands to featurize@a and featurize@b. */
function foreachCourseRepo(): RepoState {
  const s = courseRepo();
  s.pipeline = ['a', 'b'].map((key) => ({
    name: `featurize@${key}`,
    deps: ['src/evaluate.py'],
    outs: [`data/features/${key}.pkl`],
    cmd: `python src/evaluate.py ${key} ${key === 'a' ? 100 : 500}`,
    params: [],
    metrics: [],
    frozen: false,
    upToDate: false,
  }));
  s.dvcYaml = [
    'stages:',
    '  featurize:',
    '    foreach:',
    '      a:',
    '        max_features: 100',
    '      b:',
    '        max_features: 500',
    '    do:',
    '      cmd: python src/evaluate.py ${key} ${item.max_features}',
    '      deps:',
    '        - src/evaluate.py',
    '      outs:',
    '        - data/features/${key}.pkl',
  ].join('\n');
  return s;
}

/** The registry data is not in the project yet: the learner imports it (like the Get Started tutorial). */
function importCourseRepo(): RepoState {
  const s = courseRepo();
  delete s.files['data/data.xml'];
  delete s.files['data/data.xml.dvc'];
  s.cache = [];
  s.gitCommits = s.gitCommits.filter((c) => c.message !== 'Add raw data');
  return s;
}

/** Targets a data-camp / official-get-started level DVC learner must hit. */
export const campLevels: LevelDef[] = [
  {
    id: 'camp-1',
    series: 'camp',
    seriesTitle: 'DVCLive',
    name: 'DVCLive: log from the training script',
    difficulty: 4,
    par: 4,
    hint: 'cat src/train.py; python src/train.py; ls; dvc plots show',
    objective:
      'See how **DVCLive** works: read the logging calls inside `src/train.py`, run the script, and look at the metrics and plots it writes.',
    learning: [
      'DVCLive is a Python library imported by the training script (`from dvclive import Live`) — not a dvc subcommand',
      'live.log_metric → scalars in dvclive/metrics.json; live.next_step() → one more point on the plots',
      'log_param, log_plot, log_image and make_report add params, custom plots, images and an HTML report',
    ],
    fieldNotes: [
      'Replace print(loss) with live.log_metric — then plots/exp work for free',
      'Commit the dvc.yaml metrics/plots entries that point at dvclive/',
    ],
    startDialog: [
      {
        title: 'What every DVC course adds after pipelines',
        markdown:
          'Official Get Started **Metrics/Plots** chapter is powered by DVCLive inside the training code:\n\n```\nfrom dvclive import Live\n\nwith Live() as live:\n    live.log_param("lr", 0.05)\n    for epoch in range(5):\n        ...\n        live.log_metric("acc", acc)\n        live.next_step()\n```\n\nThere is no `dvc live` command. `cat src/train.py` here shows the instrumented script; `python src/train.py` runs it.',
      },
      {
        title: 'Mental map',
        markdown:
          '| Python call | Artifact |\n| --- | --- |\n| `log_param` | `dvclive/params.yaml` |\n| `log_metric` | `dvclive/metrics.json` + `plots/metrics/*.tsv` |\n| `log_plot` | custom plot data |\n| `log_image` | images for the report |\n| `make_report` | HTML dashboard |\n\nWithout this layer, `exp show` and `plots diff` stay empty in real projects.',
      },
    ],
    startState: liveCourseRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'liveMetricLogged', name: 'acc' },
        { kind: 'workspaceHas', paths: ['dvclive/metrics.json'] },
      ],
    },
    solution: [
      'cat src/train.py',
      'python src/train.py',
      'ls',
      'dvc plots show',
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
    name: 'foreach stages in dvc.yaml',
    difficulty: 5,
    par: 4,
    hint: 'cat dvc.yaml; dvc stage list; dvc repro; dvc dag',
    objective:
      'Read a `dvc.yaml` whose **foreach** expands one definition over a dictionary, reproduce every generated stage and read the DAG.',
    learning: [
      'foreach expands one definition into many stages (featurize@a, featurize@b) — it is written in dvc.yaml, not via dvc stage add',
      '${key} and ${item.field} fill the template from each entry',
      'Each generated stage has its own outs and invalidation; one DAG shows them all',
    ],
    fieldNotes: ['foreach beats copy-paste YAML for per-model / per-region jobs'],
    startDialog: [
      {
        title: 'The next 20% of pipelines',
        markdown:
          '`foreach` (and `matrix`) live in `dvc.yaml` only. Run `cat dvc.yaml` to read one:\n\n```\nfeaturize:\n  foreach:\n    a: {max_features: 100}\n    b: {max_features: 500}\n  do:\n    cmd: python src/evaluate.py ${key} ${item.max_features}\n    outs: [data/features/${key}.pkl]\n```\n\nDVC expands it to `featurize@a` and `featurize@b`.',
      },
      {
        title: 'Stage options worth knowing',
        markdown:
          '| Option | Meaning |\n| --- | --- |\n| `foreach` / `matrix` | generate stages from a list or grid |\n| `wdir` | run from another directory |\n| `always_changed: true` | never skipped by repro |\n| `outs: [x: {cache: false}]` | `-O`, keep out of the cache |\n\nOnly the last three can also be set with `dvc stage add` flags.',
      },
    ],
    startState: foreachCourseRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'stageUpToDate', name: 'featurize@a' },
        { kind: 'stageUpToDate', name: 'featurize@b' },
      ],
    },
    solution: [
      'cat dvc.yaml',
      'dvc stage list',
      'dvc repro',
      'dvc dag',
    ],
  },
  {
    id: 'camp-5',
    series: 'camp',
    seriesTitle: 'Collab & CI',
    name: '.dvcignore + import/update + CML comment',
    difficulty: 4,
    par: 7,
    hint:
      'edit .dvcignore scratch/*; dvc import <url> get-started/data.xml -o data/data.xml; dvc update data/data.xml.dvc; dvc repro; dvc metrics show --md > report.md; cml comment create report.md',
    objective:
      'Do the collab trio courses drill: **`.dvcignore`**, **`dvc import` + `dvc update`**, and a **CML PR comment** from the separate `cml` CLI.',
    learning: [
      '.dvcignore speeds DVC on huge noisy trees',
      'dvc update only works on .dvc files created by dvc import / import-url',
      'CML posts a Markdown report to PRs: clone → pull → repro → cml comment create',
    ],
    fieldNotes: [
      'CI without dvc pull is a lie about reproducibility',
      'Git-LFS versions blobs in Git remotes; DVC splits pointers + object store + pipeline/exp',
    ],
    startDialog: [
      {
        title: 'Team-day checklist',
        markdown:
          '```\nedit .dvcignore scratch/*\ndvc import <registry-url> get-started/data.xml -o data/data.xml\ndvc update data/data.xml.dvc\ndvc repro\ndvc metrics show --md > report.md\ncml comment create report.md\n```\n\nThe last step uses the separate **CML** tool, not `dvc`. A Python one-liner with `dvc.api` shows how apps read the same data without a checkout.',
      },
      {
        title: 'Git-LFS vs DVC (exam favorite)',
        markdown:
          '- **Git-LFS**: large blobs via Git hosts\n- **DVC**: Git keeps pointers/YAML; remotes keep objects; plus repro/exp\n- ML wants pipelines + experiments → DVC; generic big binaries may be enough with LFS',
      },
    ],
    startState: importCourseRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'ignoredPath', path: 'scratch' },
        { kind: 'importUpdated', path: 'data/data.xml' },
      ],
    },
    solution: [
      'edit .dvcignore scratch/*',
      'dvc import https://github.com/iterative/dataset-registry get-started/data.xml -o data/data.xml',
      'dvc update data/data.xml.dvc',
      'dvc repro',
      'dvc metrics show --md > report.md',
      'cml comment create report.md',
      'python -c "import dvc.api; print(dvc.api.get_url(\'data/data.xml\'))"',
    ],
  },
];
