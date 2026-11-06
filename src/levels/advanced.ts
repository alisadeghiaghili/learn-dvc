import type { LevelDef, RepoState } from '../engine/types';
import { emptyState, ensureGit, makeFile } from '../engine/state';
import { fakeMd5 } from '../engine/hash';

/** Shared fixtures for advanced gap-closing levels. */

function baseRepo(): RepoState {
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
  return s;
}

function tracked(
  path = 'data/data.xml',
  opts: { remote?: boolean; version?: number; cache?: boolean } = {},
): RepoState {
  const s = baseRepo();
  const md5 = fakeMd5(`file:${path}:v${opts.version ?? 0}`);
  s.dataVersions[path] = opts.version ?? 0;
  s.files[path] = makeFile(path, 'data', {
    contentId: md5,
    tracked: true,
    pointerMd5: md5,
    dirty: false,
    present: true,
    gitignored: true,
  });
  s.cache = opts.cache === false ? [] : [md5];
  s.files[`${path}.dvc`] = makeFile(`${path}.dvc`, 'dvc');
  s.files['data/.gitignore'] = makeFile('data/.gitignore', 'meta');
  s.gitCommits.push({
    hash: 'c0ffee1',
    message: 'Add raw data',
    pointers: { [path]: md5 },
    pipelineSig: '',
    params: {},
    metrics: {},
    files: [`${path}.dvc`, 'data/.gitignore'],
  });
  if (opts.remote) {
    s.remotes = [{ name: 'myremote', url: '/tmp/dvcstore', isDefault: true }];
    s.remoteObjects = [md5];
  }
  return s;
}

function pipelineRepo(): RepoState {
  const s = tracked('data/data.xml', { remote: true });
  s.files['src/train.py'] = makeFile('src/train.py', 'code');
  s.files['params.yaml'] = makeFile('params.yaml', 'params', {
    contentId: fakeMd5('params:lr=0.1:n=10'),
  });
  s.params = { lr: 0.1, n_estimators: 10 };
  s.pipeline.push({
    name: 'train',
    deps: ['data/data.xml', 'src/train.py'],
    outs: ['model.pkl', 'metrics.json'],
    cmd: 'python src/train.py',
    params: ['lr', 'n_estimators'],
    metrics: ['metrics.json'],
    frozen: false,
    upToDate: true,
  });
  s.files['model.pkl'] = makeFile('model.pkl', 'data', {
    contentId: fakeMd5('model:pipeline'),
    tracked: false,
  });
  s.files['metrics.json'] = makeFile('metrics.json', 'metrics', {
    contentId: fakeMd5('metrics:pipeline'),
  });
  s.metrics = { acc: 0.8 };
  s.generated = ['model.pkl', 'metrics.json'];
  return s;
}

/** Pipeline whose src/train.py already contains the DVCLive `Live()` calls. */
function liveRepo(): RepoState {
  const s = pipelineRepo();
  s.live.instrumented = true;
  const train = s.pipeline[0]!;
  train.outs = ['model.pkl'];
  train.metrics = ['dvclive/metrics.json'];
  train.upToDate = false;
  delete s.files['metrics.json'];
  s.generated = ['model.pkl'];
  s.metrics = {};
  return s;
}

/** A dvc.yaml whose `foreach` template expands into train@50 and train@100 (not yet run). */
function foreachRepo(): RepoState {
  const s = tracked('data/data.xml', { remote: true });
  s.files['src/train.py'] = makeFile('src/train.py', 'code');
  s.files['dvc.yaml'] = makeFile('dvc.yaml', 'yaml');
  for (const n of [50, 100]) {
    s.pipeline.push({
      name: `train@${n}`,
      deps: ['data/data.xml', 'src/train.py'],
      outs: [`models/model-${n}.pkl`],
      cmd: `python src/train.py --n-estimators ${n}`,
      params: [],
      metrics: [`metrics/metrics-${n}.json`],
      frozen: false,
      upToDate: false,
    });
  }
  s.dvcYaml = [
    'stages:',
    '  train:',
    '    foreach:',
    '      - 50',
    '      - 100',
    '    do:',
    '      cmd: python src/train.py --n-estimators ${item}',
    '      deps:',
    '        - data/data.xml',
    '        - src/train.py',
    '      outs:',
    '        - models/model-${item}.pkl',
    '      metrics:',
    '        - metrics/metrics-${item}.json:',
    '            cache: false',
  ].join('\n');
  return s;
}

/** Tracked data that is missing from the workspace but present in cache and remote. */
function apiRepo(): RepoState {
  const s = tracked('data/data.xml', { remote: true });
  s.files['data/data.xml']!.present = false;
  return s;
}

/**
 * Advanced levels: close the gap from solid interactive intro → production-grade.
 * Target: every series at top-decile depth vs dvc.org + Iterative course + field practice.
 */
export const advancedLevels: LevelDef[] = [
  {
    id: 'cache-1',
    series: 'cache',
    seriesTitle: 'Cache discipline',
    name: 'Unused objects and gc',
    difficulty: 3,
    par: 4,
    hint: 'edit data/data.xml; dvc add data/data.xml; dvc gc -w',
    objective:
      'Create a dataset version that nothing references any more and reclaim it with `dvc gc -w`, keeping the current pointer valid.',
    learning: [
      'Content-addressed cache keeps old hashes until gc',
      'dvc gc needs a scope flag: -w keeps only what the workspace uses, -A keeps every Git commit',
      'gc deletes from the local cache only; -c/--cloud also cleans the remote (and then nobody can get that version back)',
    ],
    fieldNotes: [
      'CI runners: gc after pull+repro of the SHA you ship, not blindly',
      'Shared laptops fill with orphaned md5s — schedule gc, do not improvise it',
      'If a released model only lived in local cache, gc can destroy the only copy',
    ],
    startDialog: [
      {
        title: 'Cache is a warehouse, not a trash can',
        markdown:
          'Every `dvc add` writes a **new** object. Old objects linger so `dvc checkout` can restore history.\n\nOver months this becomes GBs of orphans. `dvc gc` is the broom — but it only keeps objects inside the scope you name.',
      },
      {
        title: 'What “referenced” means',
        markdown:
          'You choose the scope of what to **keep**:\n\n- `-w` — what the current workspace uses\n- `-a` / `-T` — branch tips / tags\n- `-A` — every commit\n\nWithout a scope flag `dvc gc` refuses to run. Everything outside the scope is deleted from the local cache; the remote is untouched unless you add `-c` (`--cloud`).\n\n**Rule:** push what production still needs, *then* gc.',
      },
      {
        title: 'Drill',
        markdown:
          '1. Dirty the dataset (`edit data/data.xml`)\n2. `dvc add data/data.xml` → new hash in the cache, pointer updated\n3. `dvc gc -w` → the old version, now unreferenced by the workspace, leaves the local cache (it stays on the remote)\n4. Confirm current data is still tracked and clean',
      },
    ],
    startState: tracked('data/data.xml', { remote: true }),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'notDirty' },
        { kind: 'tracked', paths: ['data/data.xml'] },
        { kind: 'cacheLacks', md5s: [fakeMd5('file:data/data.xml:v0')] },
      ],
    },
    solution: ['edit data/data.xml', 'dvc add data/data.xml', 'dvc gc -w'],
  },
  {
    id: 'cache-2',
    series: 'cache',
    seriesTitle: 'Cache discipline',
    name: 'Workspace vs cache vs remote truth',
    difficulty: 4,
    par: 5,
    hint: 'rm data/data.xml; dvc status; dvc pull; dvc status',
    objective:
      'Delete a tracked file from the workspace, read `dvc status`, restore from remote via `dvc pull`, and finish with a clean status.',
    learning: [
      'Missing workspace file ≠ lost data if cache/remote still hold the hash',
      'dvc pull = fetch + checkout in one step',
      'status is the honest map of pointer vs bytes',
    ],
    fieldNotes: [
      '“File missing on disk” is an ops event, not always data loss',
      'Never re-download by hand from S3 console — that breaks the pointer contract',
      'Runbook: status → pull → status. If still dirty, then escalate',
    ],
    startDialog: [
      {
        title: 'Three places, one truth table',
        markdown:
          '| | Workspace | Cache | Remote |\n|---|---|---|---|\n| tracked+present | yes | yes | maybe |\n| after `rm` | no | yes | maybe |\n| fresh clone | no | no | yes (if pushed) |\n\n`dvc status` / `dvc pull` read this table for you.',
      },
      {
        title: 'Drill',
        markdown:
          'Remove the raw file on purpose. Use status as evidence. Pull. Status again must be clean.',
      },
    ],
    startState: tracked('data/data.xml', { remote: true }),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'workspaceHas', paths: ['data/data.xml'] },
        { kind: 'notDirty' },
        { kind: 'tracked', paths: ['data/data.xml'] },
      ],
    },
    solution: ['rm data/data.xml', 'dvc status', 'dvc pull', 'dvc status'],
  },
  {
    id: 'remote-4',
    series: 'remotes',
    seriesTitle: 'Remotes',
    name: 'Second remote + default switch',
    difficulty: 3,
    par: 5,
    hint: 'dvc remote add backup /tmp/backupstore; dvc remote list; dvc remote default backup; dvc push; dvc remote list',
    objective:
      'Add a backup remote, inspect the list, switch the default, and push so both storage roles are visible.',
    learning: [
      'A project can address several remotes (origin, backup, team, region)',
      'Default remote is what push/pull use unless you pass -r',
      'Remote config lives in .dvc/config and is shared via Git',
    ],
    fieldNotes: [
      'Team remote for daily work + cold backup remote for DR',
      'Never put credentials in .dvc/config — use env/CI secrets',
      'Document which remote is default in the team README',
    ],
    startDialog: [
      {
        title: 'Why more than one remote',
        markdown:
          'Daily collaboration store ≠ disaster recovery store.\n\nYou want `push` to the team remote and an occasional `push -r backup`.',
      },
      {
        title: 'Default vs -r',
        markdown:
          'Default remote is what `push`/`pull` use. `push -r backup` is deliberate.\n\nIf you mix them up, teammates fetch from the wrong store.',
      },
    ],
    startState: tracked('data/data.xml'),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'remoteConfigured', name: 'backup' },
        { kind: 'remoteConfigured', name: 'backup', default: true },
        { kind: 'remoteHas', md5s: [] },
      ],
    },
    solution: [
      'dvc remote add backup /tmp/backupstore',
      'dvc remote list',
      'dvc remote default backup',
      'dvc push',
      'dvc remote list',
    ],
  },
  {
    id: 'remote-5',
    series: 'remotes',
    seriesTitle: 'Remotes',
    name: 'fetch vs pull on a fresh machine',
    difficulty: 4,
    par: 5,
    hint: 'dvc fetch; dvc status; dvc pull; dvc status',
    objective:
      'On a machine whose cache is empty but remote is full: `fetch` fills cache only, then `pull` materializes workspace files.',
    learning: [
      'fetch: remote → cache (no workspace touch)',
      'pull: fetch + checkout (workspace matches pointers)',
      'This split is why CI can prefetch without clobbering the tree',
    ],
    fieldNotes: [
      'CI prefetch (`dvc fetch`) before build; `pull` only in job stages that need bytes',
      'Laptop with tiny disk: fetch the train set only, not every artifact',
    ],
    startDialog: [
      {
        title: 'Two verbs, one warehouse',
        markdown:
          '`fetch` stocks the warehouse (cache).\n`pull` also delivers to the kitchen (workspace).\n\nUse fetch when you want the objects but not a rewritten tree.',
      },
      {
        title: 'CI and fetch',
        markdown:
          '`dvc fetch` downloads objects into `.dvc/cache` only; `dvc checkout` links them into the workspace. In CI you can `dvc fetch` early to warm a cache layer and `dvc checkout` in the job that needs files. Both accept targets, so `dvc fetch data/train.csv.dvc` brings one dataset instead of the whole project.',
      },
    ],
    startState: (() => {
      const s = tracked('data/data.xml', { remote: true, cache: false });
      return s;
    })(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'workspaceHas', paths: ['data/data.xml'] },
        { kind: 'notDirty' },
      ],
    },
    solution: ['dvc fetch', 'dvc status', 'dvc pull', 'dvc status'],
  },
  {
    id: 'pipe-4',
    series: 'pipelines',
    seriesTitle: 'Pipelines',
    name: 'wdir, always-changed, no-cache',
    difficulty: 4,
    par: 4,
    hint: 'dvc stage add -n featurize -d data/data.xml -o data/features --wdir src --always-changed python featurize.py; dvc stage list; dvc repro; dvc dag',
    objective:
      'Declare a stage with `--wdir`, mark it `--always-changed`, and understand `no-cache` outs — then repro and inspect the DAG.',
    learning: [
      '--wdir moves the stage working directory (relative deps/outs resolve there)',
      '--always-changed forces repro even when hashes look stable',
      'cache: false outs are outputs DVC tracks but does not copy into cache',
    ],
    fieldNotes: [
      'always-changed for stages that call external APIs / time-based scrapes',
      'no-cache for huge outputs already stored elsewhere (warehouse tables)',
      'wdir keeps python package layouts honest in dvc.yaml',
    ],
    startDialog: [
      {
        title: 'Stage flags that production uses',
        markdown:
          '- `--wdir src` — run as if cwd is `src/`\n- `--always-changed` — always dirty on repro\n- `-O` / `--outs-no-cache` — hash is tracked, bytes stay out of the cache (`cache: false`)\n\nThese are not cosmetics; they encode *how* the stage lies or stays honest.',
      },
      {
        title: 'always_changed in practice',
        markdown:
          '`--always-changed` (`always_changed: true` in `dvc.yaml`) makes DVC treat the stage as changed on every `dvc repro`, even when no dependency moved. Use it for stages that read the outside world: an API call, a database query, a timestamp. Downstream stages still re-run only if the output hash really differs.',
      },
    ],
    startState: (() => {
      const s = pipelineRepo();
      s.files['src/featurize.py'] = makeFile('src/featurize.py', 'code');
      return s;
    })(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'stageExists', name: 'featurize' },
        { kind: 'stageUpToDate', name: 'featurize' },
      ],
    },
    solution: [
      'dvc stage add -n featurize -d data/data.xml -o data/features --wdir src --always-changed python featurize.py',
      'dvc stage list',
      'dvc repro',
      'dvc dag',
    ],
  },
  {
    id: 'pipe-5',
    series: 'pipelines',
    seriesTitle: 'Pipelines',
    name: 'foreach and matrix in dvc.yaml',
    difficulty: 5,
    par: 5,
    hint: 'cat dvc.yaml; dvc stage list; dvc repro; dvc dag',
    objective:
      'Read a `dvc.yaml` whose `foreach` expands one template into several stages, reproduce the whole matrix and read the DAG.',
    learning: [
      'foreach / matrix exist only in dvc.yaml — `dvc stage add` has no such flag',
      'Each matrix cell becomes its own stage (train@50, train@100) with its own outs and invalidation',
      'DAG is how leads review the contract before merge',
    ],
    fieldNotes: [
      'Matrix stages for “these three models must ship together”',
      'Do not foreach what belongs in `dvc exp` — exp is for search; stages are for product',
    ],
    startDialog: [
      {
        title: 'foreach vs experiments',
        markdown:
          '**foreach stages** = product matrix (must ship, reproducible contract).\n**dvc exp** = search (many tries, pick a winner).\n\nMixing them creates pipelines nobody can explain in an incident.',
      },
      {
        title: 'One template, many stages',
        markdown:
          '`dvc stage add` cannot create these; you write them in `dvc.yaml`. `cat dvc.yaml` shows the template:\n\n```\ntrain:\n  foreach: [50, 100]\n  do:\n    cmd: python src/train.py --n ${item}\n    outs: [models/model-${item}.pkl]\n```\n\nDVC expands it into `train@50` and `train@100` — `dvc stage list`, `dvc repro` and `dvc dag` all see the expanded stages. `matrix:` does the same for several variables at once.',
      },
    ],
    startState: foreachRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'stageUpToDate', name: 'train@50' },
        { kind: 'stageUpToDate', name: 'train@100' },
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
    id: 'exp-4',
    series: 'experiments',
    seriesTitle: 'Experiments',
    name: 'Sweep twice + exp show',
    difficulty: 4,
    par: 5,
    hint: 'dvc exp run -S lr=0.05; dvc exp run -S lr=0.2; dvc exp show',
    objective:
      'Run two parameter sets and compare with `dvc exp show` — the evidence table for search.',
    learning: [
      'Every `dvc exp run -S` is recorded as its own experiment with its params and metrics',
      'exp show puts them side by side: params and metrics are columns',
      'Choose with the table, then apply the winner',
    ],
    fieldNotes: [
      'Friday sweep: queue 8 jobs, shut the laptop, read show on Monday',
      'Never hand-copy metrics into spreadsheets — exp show is the table',
    ],
    startDialog: [
      {
        title: 'Two runs, one table',
        markdown:
          'Same code, same data, two learning rates:\n\n```\ndvc exp run -S lr=0.05\ndvc exp run -S lr=0.2\ndvc exp show\n```\n\nFor long sweeps, `--queue` the runs and drain them later with `dvc queue start`.',
      },
      {
        title: 'Reading exp show',
        markdown:
          '`dvc exp show` lists the workspace and `HEAD`, with experiments nested under the commit they started from. Params and metrics are columns; `--sort-by acc --sort-order desc` ranks runs, `--only-changed` hides columns that never varied, `--md` / `--csv` export the table. Compare two rows in detail with `dvc exp diff`.',
      },
    ],
    startState: pipelineRepo(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'experimentCount', min: 1 }],
    },
    solution: [
      'dvc exp run -S lr=0.05',
      'dvc exp run -S lr=0.2',
      'dvc exp show',
    ],
  },
  {
    id: 'exp-5',
    series: 'experiments',
    seriesTitle: 'Experiments',
    name: 'Apply winner + verify params',
    difficulty: 4,
    par: 5,
    hint: 'dvc exp run -S lr=0.05; dvc exp show; dvc exp apply exp-; dvc params show; dvc status',
    objective:
      'Run a sweep, pick with `exp show`, `exp apply` the winner, then verify `params.yaml` and `dvc status` agree.',
    learning: [
      'apply brings params, metrics and outputs into the workspace — it does not “deploy”',
      'After apply, commit params.yaml and dvc.lock and push artifacts for production',
      'params show and status are the post-apply audit',
    ],
    fieldNotes: [
      'PR description should name the exp id you applied and why',
      'Applying is not releasing: nothing is shared until params.yaml and dvc.lock are committed',
    ],
    startDialog: [
      {
        title: 'Winner is not a release',
        markdown:
          '`exp apply` = restore the winning params, metrics **and outputs** into the workspace.\n`git commit` of `params.yaml` + `dvc.lock` = make it the baseline.\n`dvc push` = share the bytes.',
      },
      {
        title: 'Audit after apply',
        markdown:
          'Two quick checks close the loop:\n\n- `dvc params show` — the winning values are really in `params.yaml`\n- `dvc status` — the pipeline reports *up to date*, because apply restored the outputs of that run\n\nIf `status` still lists the stage as changed, something else (code or data) differs from the run you applied.',
      },
    ],
    startState: pipelineRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'paramsAt', key: 'lr', value: 0.05 },
        { kind: 'stageUpToDate', name: 'train' },
      ],
    },
    solution: [
      'dvc exp run -S lr=0.05',
      'dvc exp show',
      'dvc exp apply exp-',
      'dvc params show',
      'dvc status',
    ],
  },
  {
    id: 'cmp-3',
    series: 'compare',
    seriesTitle: 'Review & compare',
    name: 'params + metrics diff drill',
    difficulty: 4,
    par: 4,
    hint: 'edit params.yaml lr=0.05; dvc params diff; dvc repro; dvc metrics diff; dvc metrics show',
    objective:
      'Change a hyperparameter, review `params diff`, repro, then review `metrics diff` — the PR evidence pack for ML.',
    learning: [
      'params diff = what you intended to change',
      'metrics diff = what the change actually did',
      'Together they are the minimum ML review artifact',
    ],
    fieldNotes: [
      'Paste both diffs into the PR body. Reviewers should not open the notebook',
      'If metrics did not move, stop — do not merge vibes',
    ],
    startDialog: [
      {
        title: 'Review like a grown-up',
        markdown: 'Code review without metric evidence is superstition. DVC gives you two diffs:\n\n- `dvc params diff`\n- `dvc metrics diff`',
      },
      {
        title: 'Reading the two diffs',
        markdown:
          '`dvc params diff` compares `params.yaml` in the workspace with `HEAD`; pass two revisions (`dvc params diff main feature`) to compare commits. `dvc metrics diff` prints the old value, the new value and the numeric change per metric. Add `--md` to paste the table into a PR and `--all` to include values that did not change.',
      },
    ],
    startState: pipelineRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'paramsAt', key: 'lr', value: 0.05 },
        { kind: 'stageUpToDate', name: 'train' },
      ],
    },
    solution: [
      'edit params.yaml lr=0.05',
      'dvc params diff',
      'dvc repro',
      'dvc metrics diff',
      'dvc metrics show',
    ],
  },
  {
    id: 'cmp-4',
    series: 'compare',
    seriesTitle: 'Review & compare',
    name: 'plots show + diff',
    difficulty: 4,
    par: 4,
    hint: 'dvc repro; dvc plots show --template linear; dvc plots diff',
    objective:
      'Repro so plot series exist, render with a Vega template, then `plots diff` across the working change.',
    learning: [
      'plots are first-class review artifacts, not notebook screenshots',
      'templates (linear/confusion/scatter) encode how to read the series',
      'plots diff is the visual twin of metrics diff',
    ],
    fieldNotes: [
      'PR bots (CML) embed plots diff images — humans actually look at them',
      'Prefer generated plots over slideware screenshots that rot',
    ],
    startDialog: [
      {
        title: 'Plots are not decoration',
        markdown: 'If the metric moved, show the curve. `dvc plots show` / `dvc plots diff`.',
      },
      {
        title: 'Plots are files too',
        markdown:
          '`dvc plots show` renders the plot files declared under `plots:` in `dvc.yaml` into `dvc_plots/index.html`; `dvc plots diff` overlays the same plot at two revisions (workspace vs `HEAD` by default). Choose the Vega template with `-t` / `--template` (`linear`, `simple`, `confusion`, …) and use `--json` or `--show-vega` when CI needs the spec instead of HTML.',
      },
    ],
    startState: pipelineRepo(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'stageUpToDate', name: 'train' }],
    },
    solution: ['dvc repro', 'dvc plots show --template linear', 'dvc plots diff'],
  },
  {
    id: 'meta-4',
    series: 'meta',
    seriesTitle: 'Meta & contract files',
    name: 'freeze a stage on purpose',
    difficulty: 3,
    par: 4,
    hint: 'dvc freeze train; dvc repro; dvc status; dvc unfreeze train',
    objective:
      'Freeze `train` so repro skips it, observe status/repro behavior, then unfreeze deliberately.',
    learning: [
      'freeze pins a stage against invalidation re-runs',
      'unfreeze is an intentional production event',
      'Frozen stages still show in DAG/status contracts',
    ],
    fieldNotes: [
      'Freeze the “gold model” stage while research branches flail',
      'Pair unfreeze with review + repro + push — never at 4pm Friday alone',
    ],
    startDialog: [
      {
        title: 'A pin with consequences',
        markdown: 'Freeze protects a production artifact. It also hides staleness if you forget it.\n\nName the unfreeze owner in the PR template.',
      },
      {
        title: 'Freeze lives in dvc.yaml',
        markdown:
          '`dvc freeze` writes `frozen: true` into the stage in `dvc.yaml`, so the decision is reviewed in Git like any other change. A frozen stage is skipped by `dvc repro` even when its dependencies changed, and `dvc status` stops reporting it as changed. Pair every freeze with a reason and a ticket to unfreeze.',
      },
    ],
    startState: (() => {
      const s = pipelineRepo();
      s.pipeline.push({
        name: 'train',
        deps: ['data/data.xml', 'src/train.py'],
        outs: ['model.pkl'],
        cmd: 'python src/train.py',
        params: ['lr', 'n_estimators'],
        metrics: ['metrics.json'],
        frozen: false,
        upToDate: true,
      });
      s.files['model.pkl'] = makeFile('model.pkl', 'data', {
        contentId: fakeMd5('model:base'),
        tracked: true,
        pointerMd5: fakeMd5('model:base'),
      });
      s.cache.push(fakeMd5('model:base'));
      return s;
    })(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'stageExists', name: 'train' },
        { kind: 'notDirty' },
      ],
    },
    solution: ['dvc freeze train', 'dvc repro', 'dvc status', 'dvc unfreeze train'],
  },
  {
    id: 'meta-5',
    series: 'meta',
    seriesTitle: 'Meta & contract files',
    name: 'lock is the receipt',
    difficulty: 4,
    par: 4,
    hint: 'edit params.yaml lr=0.05; dvc repro; cat dvc.lock; cat dvc.yaml',
    objective:
      'Break a param, repro so `dvc.lock` updates, then read yaml vs lock — definition vs execution receipt.',
    learning: [
      'dvc.yaml = contract (what should run)',
      'dvc.lock = receipt (what ran, with which hashes/params)',
      'Hand-editing lock lies to every future clone',
    ],
    fieldNotes: [
      'PR: yaml changes need human review; lock changes should come from CI repro',
      'If lock and yaml disagree after merge, stop the pipeline',
    ],
    startDialog: [
      {
        title: 'Contract vs receipt',
        markdown: '`cat dvc.yaml` answers *what*.\n`cat dvc.lock` answers *what actually ran*.\n\nOnly the second is evidence.',
      },
      {
        title: 'What is inside dvc.lock',
        markdown:
          'For every stage `dvc.lock` records the exact `cmd`, the md5 and size of each dependency, the values of the tracked params and the md5 of each output. DVC compares the workspace with these entries to decide whether a stage is stale — which is why a conflict in `dvc.lock` is fixed by re-running `dvc repro`, never by hand-editing hashes.',
      },
    ],
    startState: (() => {
      const s = pipelineRepo();
      s.pipeline.push({
        name: 'train',
        deps: ['data/data.xml', 'src/train.py'],
        outs: ['model.pkl', 'metrics.json'],
        cmd: 'python src/train.py',
        params: ['lr', 'n_estimators'],
        metrics: ['metrics.json'],
        frozen: false,
        upToDate: false,
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
    solution: ['edit params.yaml lr=0.05', 'dvc repro', 'cat dvc.lock', 'cat dvc.yaml'],
  },
  {
    id: 'reg-3',
    series: 'registry',
    seriesTitle: 'Registry & reuse',
    name: 'import then update',
    difficulty: 4,
    par: 5,
    hint:
      'dvc import /tmp/registry data/external.csv -o data/external.csv; dvc update data/external.csv.dvc; dvc status',
    objective:
      'Import an upstream artifact as a versioned dependency, then `dvc update` it and keep status clean.',
    learning: [
      'import writes a .dvc that pins upstream version',
      'update refreshes that pin intentionally',
      'This is how teams share data without zip files in Slack',
    ],
    fieldNotes: [
      'Feature store exports become imports, not copies',
      'Update is a reviewed bump — like upgrading a library version',
    ],
    startDialog: [
      {
        title: 'Borrow, do not hoard',
        markdown:
          '`dvc get` = copy (no version pin).\n`dvc import` = copy + version pin + update path.\n\nPrefer import for anything a pipeline depends on.',
      },
      {
        title: 'Imports are the only thing update touches',
        markdown:
          '`dvc import` records where the data came from (`repo` and `rev_lock`) in the `.dvc` file. `dvc update data/external.csv.dvc` re-reads that source and moves the pin. On a `.dvc` file created by plain `dvc add`, `dvc update` has no source to read and fails.',
      },
    ],
    startState: (() => {
      const s = baseRepo();
      s.remotes = [{ name: 'myremote', url: '/tmp/dvcstore', isDefault: true }];
      s.remoteObjects = [fakeMd5('upstream:external:v2')];
      return s;
    })(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'workspaceHas', paths: ['data/external.csv'] },
        { kind: 'importUpdated', path: 'data/external.csv' },
      ],
    },
    solution: [
      'dvc import /tmp/registry data/external.csv -o data/external.csv',
      'dvc update data/external.csv.dvc',
      'dvc status',
    ],
  },
  {
    id: 'camp-6',
    series: 'collab-ci',
    seriesTitle: 'Collab & CI',
    name: 'CI skeleton: pull, repro, comment',
    difficulty: 4,
    par: 5,
    hint:
      'dvc pull; dvc repro; dvc metrics show --md > report.md; cml comment create report.md; git add dvc.lock; git commit -m "CI: refresh artifacts"',
    objective:
      'Execute the canonical CI loop: pull data, repro the pipeline, write a Markdown metrics report, post it with the separate `cml` CLI, commit the receipt.',
    learning: [
      'CI skeleton: clone → pull → repro → cml comment',
      'Heavy bytes stay in DVC remote; Git stays small',
      'CML is its own CLI (cml comment create report.md) that turns a Markdown report into a PR comment',
    ],
    fieldNotes: [
      'This is the exact YAML people paste into GitHub Actions',
      'Cache the DVC remote credentials in CI secrets, never in repo',
    ],
    startDialog: [
      {
        title: 'The three-line CI religion',
        markdown:
          '```\ndvc pull\ndvc repro\ncml comment create report.md\n```\n\nBetween repro and the comment you render the report: `dvc metrics show --md > report.md`. Everything else is plumbing.',
      },
      {
        title: 'The GitHub Actions skeleton',
        markdown:
          '```\n- uses: iterative/setup-dvc@v1\n- uses: iterative/setup-cml@v2\n- run: |\n    dvc pull\n    dvc repro\n    dvc metrics show --md > report.md\n    cml comment create report.md\n  env:\n    REPO_TOKEN: ${{ secrets.GITHUB_TOKEN }}\n```\n\n`cml` is installed separately from `dvc`; it only needs the Markdown file and a token.',
      },
    ],
    startState: pipelineRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'stageUpToDate', name: 'train' },
        { kind: 'gitCommitMessageIncludes', text: 'CI' },
      ],
    },
    solution: [
      'dvc pull',
      'dvc repro',
      'dvc metrics show --md > report.md',
      'cml comment create report.md',
      'git add dvc.lock',
      'git commit -m "CI: refresh artifacts"',
    ],
  },
  {
    id: 'camp-7',
    series: 'collab-ci',
    seriesTitle: 'Collab & CI',
    name: 'DVCLive metrics into exp show',
    difficulty: 4,
    par: 5,
    hint: 'cat src/train.py; dvc exp run -S lr=0.05; dvc exp show; dvc plots show',
    objective:
      'Run an experiment whose training script already logs with DVCLive, then see its metrics in `dvc exp show` and its curves in `dvc plots show`.',
    learning: [
      'DVCLive is a Python library called from train.py — not a dvc subcommand',
      'Scalars logged with live.log_metric become metrics; steps become plots',
      'exp show is the human table over that bridge',
    ],
    fieldNotes: [
      'One Live() in train.py beats ten shell echoes',
      'Reports go to the PR; tables go to decisions',
    ],
    startDialog: [
      {
        title: 'Stop copy-pasting loss curves',
        markdown:
          'The training script does the logging (`cat src/train.py`):\n\n```\nfrom dvclive import Live\n\nwith Live() as live:\n    for epoch in range(5):\n        ...\n        live.log_metric("acc", acc)\n        live.next_step()\n```\n\nDVC only has to run the script and read `dvclive/metrics.json` and `dvclive/plots/`.',
      },
      {
        title: 'From script to table',
        markdown:
          '`dvc exp run -S lr=0.05` executes the pipeline, so DVCLive writes its files. Then:\n\n- `dvc exp show` — one row per experiment, with the logged metrics as columns\n- `dvc plots show` — the per-step curves DVCLive wrote\n\nDeclare `dvclive/metrics.json` under `metrics:` and `dvclive/plots` under `plots:` in `dvc.yaml` so DVC picks them up automatically.',
      },
    ],
    startState: liveRepo(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'liveMetricLogged', name: 'acc' }, { kind: 'experimentCount', min: 1 }],
    },
    solution: [
      'cat src/train.py',
      'dvc exp run -S lr=0.05',
      'dvc exp show',
      'dvc plots show',
    ],
  },
  {
    id: 'collab-1',
    series: 'collab-ci',
    seriesTitle: 'Collab & CI',
    name: 'Pointer PR discipline',
    difficulty: 5,
    par: 6,
    hint:
      'edit data/data.xml; dvc status; dvc add data/data.xml; git add data/data.xml.dvc data/.gitignore; git commit -m "data: bump raw snapshot"',
    objective:
      'Walk the full data-change PR path: dirty → status → re-add → git commit of the pointer only — never the raw bytes.',
    learning: [
      'PR review surface is pointer md5 + lock, not gigabytes',
      'git commit message is the human narrative; .dvc is the machine narrative',
      'Skipping the re-add leaves a lying pointer in the PR',
    ],
    fieldNotes: [
      'CI should fail if someone `git add`s a tracked data path',
      'Reviewers read md5 diffs like they read lockfile diffs',
    ],
    startDialog: [
      {
        title: 'The only safe data PR',
        markdown:
          '1. Change data\n2. `dvc status`\n3. `dvc add` (records the new md5 and caches the bytes)\n4. `git add` **pointer files only**\n5. `git commit`\n\nAnything else is a data leak or a lie.',
      },
      {
        title: 'Guard the pointer-only rule',
        markdown:
          'After `dvc add`, `git add data/data.xml` fails because DVC put the path in `.gitignore` — that is the safety net. Add a CI check as a second one: reject a PR whose diff touches a path that has a `.dvc` file (`git diff --name-only origin/main | grep -v .dvc` against your data folders).',
      },
    ],
    startState: tracked('data/data.xml', { remote: true }),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'notDirty' },
        {
          kind: 'gitCommitMessageIncludes',
          text: 'data',
          requireFilesAny: ['data/data.xml.dvc'],
        },
      ],
    },
    solution: [
      'edit data/data.xml',
      'dvc status',
      'dvc add data/data.xml',
      'git add data/data.xml.dvc data/.gitignore',
      'git commit -m "data: bump raw snapshot"',
    ],
  },
  {
    id: 'collab-2',
    series: 'collab-ci',
    seriesTitle: 'Collab & CI',
    name: 'Incident: which data made this model?',
    difficulty: 5,
    par: 6,
    hint: 'cat data/data.xml.dvc; dvc status; git log; dvc pull; dvc checkout; dvc status',
    objective:
      'Answer the incident question with evidence: pointer → git history → remote object → clean checkout. No vibes.',
    learning: [
      'Incident answer chain: release commit → pointer md5 → cache/remote',
      'If pointers were never committed, the answer does not exist',
      'status/checkout/pull restore the crime scene',
    ],
    fieldNotes: [
      'This is the postmortem checklist for “bad model in prod”',
      'Teach it before the incident, not during',
    ],
    startDialog: [
      {
        title: '2am checklist',
        markdown: '1. Which commit shipped?\n2. Which `.dvc` pointers?\n3. Which md5s?\n4. Are those objects on remote?\n5. Checkout that commit + `dvc checkout`',
      },
      {
        title: 'Trace a model back to bytes',
        markdown:
          'Start from the release commit or tag. `git show <rev>:data/data.xml.dvc` gives the md5; `dvc.lock` at that commit lists the md5 of every dependency and output plus the params that ran. `dvc diff <old> <new>` shows what changed between two releases. If the object is in neither cache nor remote the trail ends — which is why you push before you tag.',
      },
    ],
    startState: tracked('data/data.xml', { remote: true, cache: false }),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'workspaceHas', paths: ['data/data.xml'] },
        { kind: 'notDirty' },
      ],
    },
    solution: [
      'cat data/data.xml.dvc',
      'dvc status',
      'git log',
      'dvc pull',
      'dvc checkout',
      'dvc status',
    ],
  },
  {
    id: 'collab-3',
    series: 'collab-ci',
    seriesTitle: 'Collab & CI',
    name: 'Teammate handoff: push then clean clone story',
    difficulty: 5,
    par: 5,
    hint: 'dvc push; git add data/data.xml.dvc; git commit -m "data: publish raw snapshot"; dvc status; dvc pull',
    objective:
      'Publish a data change so a teammate can reproduce: push objects, commit the pointer, and finish with a clean status after pull.',
    learning: [
      'Handoff = remote objects + Git pointer commit, not a zip file',
      'Push without pointer commit strands bytes nobody can find',
      'status after pull is the acceptance test for handoff',
    ],
    fieldNotes: [
      'Definition of done for data work: teammate pull succeeds on a clean machine',
      'Never Slack a 2GB file — push and send the commit SHA',
    ],
    startDialog: [
      {
        title: 'The handoff contract',
        markdown:
          'A change is shared only when:\n\n1. bytes are on the **DVC remote**\n2. the **pointer** is in Git history\n3. `dvc pull` on a clean tree restores it\n\nSkip any line and you have a private laptop artifact.',
      },
      {
        title: 'Verify the handoff from a clean clone',
        markdown:
          'A handoff only counts if a fresh `git clone` followed by `dvc pull` works. Order matters: `dvc push` first (bytes), then push the Git commit (pointer). The other way round, a teammate can fetch a pointer whose data is not on the remote yet. `dvc status --cloud` lists what is still local-only.',
      },
    ],
    startState: (() => {
      const s = tracked('data/data.xml');
      const md5 = fakeMd5('file:data/data.xml:v1');
      s.dataVersions['data/data.xml'] = 1;
      s.files['data/data.xml'] = makeFile('data/data.xml', 'data', {
        contentId: md5,
        tracked: true,
        pointerMd5: fakeMd5('file:data/data.xml:v0'),
        dirty: true,
        present: true,
        gitignored: true,
      });
      s.cache = [fakeMd5('file:data/data.xml:v0')];
      s.remotes = [{ name: 'myremote', url: '/tmp/dvcstore', isDefault: true }];
      return s;
    })(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'notDirty' },
        { kind: 'remoteHas', md5s: [] },
        {
          kind: 'gitCommitMessageIncludes',
          text: 'data',
          requireFilesAny: ['data/data.xml.dvc'],
        },
      ],
    },
    solution: [
      'dvc push',
      'git add data/data.xml.dvc',
      'git commit -m "data: publish raw snapshot"',
      'dvc status',
      'dvc pull',
    ],
  },
  {
    id: 'api-1',
    series: 'collab-ci',
    seriesTitle: 'Collab & CI',
    name: 'Read tracked data without checkout (dvc.api)',
    difficulty: 4,
    par: 3,
    hint:
      'python -c "import dvc.api; print(dvc.api.read(\'data/data.xml\'))"; dvc status; dvc checkout',
    objective:
      'Read tracked data from Python with `dvc.api` while the file is missing from the workspace, then prove the workspace still matches the pointers and restore it.',
    learning: [
      'dvc.api is a Python module (read, open, get_url, params_show) — there is no `dvc api` command',
      'API reads stream from cache/remote; they do not replace checkout when you need files on disk',
      'status remains the honesty check after any reader',
    ],
    fieldNotes: [
      'Dashboards and batch jobs should use dvc.api + pinned commit, not ad-hoc downloads',
      'If the API path and the workspace disagree, stop and pull',
    ],
    startDialog: [
      {
        title: 'Borrow bytes in code',
        markdown:
          '`dvc.api` is for **apps** that read data; `dvc checkout` is for **workspaces** that need files. Same md5 contract either way.\n\nThe file is deleted from the workspace in this level — the API still reads it from the cache or remote:\n\n```\npython -c "import dvc.api; print(dvc.api.read(\'data/data.xml\'))"\n```',
      },
      {
        title: 'Pin the revision',
        markdown:
          'Without `rev=` you read what the current checkout says. Services should pin: `dvc.api.read(path, rev="v1.2.0")` (a tag, branch or commit) and, if needed, `repo=` and `remote=`. A wrong or untracked path raises `PathMissingError`; fail closed instead of falling back to stale bytes.',
      },
    ],
    startState: apiRepo(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'notDirty' }, { kind: 'tracked', paths: ['data/data.xml'] }],
    },
    solution: [
      'python -c "import dvc.api; print(dvc.api.read(\'data/data.xml\'))"',
      'dvc status',
      'dvc checkout',
    ],
  },
  {
    id: 'cmp-5',
    series: 'compare',
    seriesTitle: 'Review & compare',
    name: 'Full ML review pack',
    difficulty: 5,
    par: 5,
    hint: 'edit params.yaml lr=0.05; dvc params diff; dvc repro; dvc metrics diff; dvc plots diff',
    objective:
      'Produce the complete PR evidence pack in one change: params diff, metrics diff, plots diff after repro.',
    learning: [
      'A serious ML PR ships intent + effect + curves',
      'Skip metrics/plots and reviewers rubber-stamp',
      'This pack is what CI should post automatically',
    ],
    fieldNotes: [
      'Template the PR body with three slots: params / metrics / plots',
      'If any slot is empty, the PR is not ready',
    ],
    startDialog: [
      {
        title: 'The minimum serious PR',
        markdown: '1. `dvc params diff`\n2. `dvc repro`\n3. `dvc metrics diff`\n4. `dvc plots diff`\n\nPaste all four into review.',
      },
      {
        title: 'Make CI produce the pack',
        markdown:
          'In CI run `dvc params diff --md`, `dvc metrics diff --md` and `dvc plots diff` against the PR base (`origin/main`) and post the result with `cml comment create`. Reviewers then see intent, effect and curves without checking out the branch. An empty section is information too: say so in the PR instead of leaving it out.',
      },
    ],
    startState: pipelineRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'paramsAt', key: 'lr', value: 0.05 },
        { kind: 'stageUpToDate', name: 'train' },
      ],
    },
    solution: [
      'edit params.yaml lr=0.05',
      'dvc params diff',
      'dvc repro',
      'dvc metrics diff',
      'dvc plots diff',
    ],
  },
  {
    id: 'collab-4',
    series: 'collab-ci',
    seriesTitle: 'Collab & CI',
    name: 'Lock/pointer conflict in a data PR',
    difficulty: 5,
    par: 6,
    hint: 'git merge origin/main; dvc status; dvc repro; git add dvc.lock params.yaml; git commit -m "pipeline: resolve lock after param change"; dvc status',
    objective:
      'Resolve a realistic PR conflict: git merge encounters conflict in dvc.lock. Never edit hashes manually; run `dvc repro`, commit the new receipt, and leave status clean.',
    learning: [
      'yaml is intent, lock is receipt — git merge conflict on dvc.lock is normal in teams',
      'Pointer conflict is data; lock conflict is pipeline — fix order matters',
      'Never hand-merge lock hashes; re-run `dvc repro` to regenerate the verified receipt',
      'status after commit is the merge acceptance test',
    ],
    fieldNotes: [
      'Conflict playbook: git merge → dvc status → dvc repro → commit lock+yaml → status',
      'Hand-editing hashes produces invalid signatures that break run-cache',
    ],
    startDialog: [
      {
        title: 'When two people touch the same contract',
        markdown:
          'Teammate A updates `params.yaml` on main.\nYou updated stage code on your branch.\n\nRunning `git merge origin/main` triggers a conflict on `dvc.lock`.\n\n**Do not hand-edit lock hashes.** Inspect with `dvc status`, run `dvc repro` to recompute the true receipt, then commit.',
      },
      {
        title: 'Resolving dvc.lock conflicts',
        markdown:
          '`dvc.lock` is generated, so a conflict there is not settled line by line. Take either side (`git checkout --ours dvc.lock`), re-run `dvc repro` — stages whose inputs match are skipped through the run cache — review the diff and commit. Conflicts in `dvc.yaml` or `params.yaml` need a human decision first, because they change what should run.',
      },
    ],
    startState: (() => {
      const s = pipelineRepo();
      s.pipeline = [
        {
          name: 'train',
          deps: ['data/data.xml', 'src/train.py'],
          outs: ['model.pkl', 'metrics.json'],
          cmd: 'python src/train.py',
          params: ['lr', 'n_estimators'],
          metrics: ['metrics.json'],
          frozen: false,
          upToDate: false,
        },
      ];
      s.params = { lr: 0.05, n_estimators: 10 };
      return s;
    })(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'stageUpToDate', name: 'train' },
        {
          kind: 'gitCommitMessageIncludes',
          text: 'lock',
          requireFilesAny: ['dvc.lock', 'dvc.yaml', 'params.yaml'],
        },
      ],
    },
    solution: [
      'dvc status',
      'dvc repro',
      'git add dvc.lock params.yaml',
      'git commit -m "pipeline: resolve lock after param change"',
      'dvc status',
    ],
  },
  {
    id: 'reg-4',
    series: 'registry',
    seriesTitle: 'Registry & reuse',
    name: 'Pin upstream and update deliberately',
    difficulty: 5,
    par: 5,
    hint:
      'dvc import /tmp/registry data/external.csv -o data/external.csv --rev v1.0; cat data/external.csv.dvc; dvc update --rev v2.0 data/external.csv.dvc; dvc status',
    objective:
      'Import upstream data pinned to a release, read the pin, then move it deliberately with `dvc update --rev` — version bumps are reviewed events.',
    learning: [
      'import writes a pin (source repo, rev and md5) you can read in the .dvc file',
      'update --rev is a deliberate bump, like upgrading a library',
      'status proves the bump landed cleanly',
    ],
    fieldNotes: [
      'Feature-store exports become imports, never Slack zips',
      'PR the update bump with the upstream changelog link',
    ],
    startDialog: [
      {
        title: 'Borrow with a receipt',
        markdown:
          '`dvc get` copies.\n`dvc import` copies **and** pins.\n`dvc update` moves the pin on purpose.\n\nRead `cat data/external.csv.dvc` before you update — know what you are leaving.',
      },
      {
        title: 'Pin to a rev, bump with a PR',
        markdown:
          '`dvc import … --rev v1.0` locks the import to a tag, branch or commit of the source repo. Plain `dvc update` re-resolves the *same* rev (useful for branches); `dvc update --rev v2.0 …` changes the rev itself. Either way the new md5 lands in the `.dvc` file, so the bump shows up in a Git diff for review.',
      },
    ],
    startState: (() => {
      const s = baseRepo();
      s.remotes = [{ name: 'myremote', url: '/tmp/registry', isDefault: true }];
      s.remoteObjects = [fakeMd5('upstream:external:v1'), fakeMd5('upstream:external:v2')];
      return s;
    })(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'workspaceHas', paths: ['data/external.csv'] },
        { kind: 'importUpdated', path: 'data/external.csv' },
      ],
    },
    solution: [
      'dvc import /tmp/registry data/external.csv -o data/external.csv --rev v1.0',
      'cat data/external.csv.dvc',
      'dvc update --rev v2.0 data/external.csv.dvc',
      'dvc status',
    ],
  },
  {
    id: 'capstone-2',
    series: 'collab-ci',
    seriesTitle: 'Collab & CI',
    name: 'Final checkpoint: ship a data change end-to-end',
    difficulty: 5,
    par: 7,
    hint:
      'edit data/data.xml; dvc status; dvc add data/data.xml; dvc push; git add data/data.xml.dvc data/.gitignore; git commit -m "data: ship snapshot v2"',
    objective:
      'Graduate drill: dirty data → status → re-add → push remote → pointer-only git commit. One clean story a lead can audit.',
    learning: [
      'End-to-end is one narrative: bytes, cache, remote, pointer, history',
      'Skipping push or pointer commit breaks the next teammate',
      'This checklist is the production definition of done',
    ],
    fieldNotes: [
      'Use this as the onboarding gate for anyone touching data',
      'If you cannot explain each step, you are not ready for a real remote',
    ],
    startDialog: [
      {
        title: 'Graduation',
        markdown:
          'No new commands. **One coherent story.**\n\nIf you can run this drill from memory on a clean repo, you are ready for production DVC.',
      },
      {
        title: 'Definition of done, written down',
        markdown:
          'Put the checklist in the PR template:\n\n- [ ] `dvc status` clean\n- [ ] `dvc status --cloud` shows cache and remote in sync\n- [ ] only `.dvc` / `.gitignore` / `dvc.lock` changes in the diff\n\nA review that cannot tick all three should not merge.',
      },
    ],
    startState: tracked('data/data.xml', { remote: true }),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'notDirty' },
        { kind: 'tracked', paths: ['data/data.xml'] },
        {
          kind: 'gitCommitMessageIncludes',
          text: 'data',
          requireFilesAny: ['data/data.xml.dvc'],
        },
      ],
    },
    solution: [
      'edit data/data.xml',
      'dvc status',
      'dvc add data/data.xml',
      'dvc push',
      'git add data/data.xml.dvc data/.gitignore',
      'git commit -m "data: ship snapshot v2"',
    ],
  },
  {
    id: 'mastery-1',
    series: 'collab-ci',
    seriesTitle: 'Mastery',
    name: 'Disaster recovery: restore from remote',
    difficulty: 5,
    par: 5,
    hint: 'rm data/data.xml; dvc status; dvc fetch; dvc pull; dvc status',
    objective:
      'Simulate a lost laptop: wipe workspace bytes, prove cache is not enough, restore from remote with fetch+pull, verify status.',
    learning: [
      'DR is remote + committed pointers, not Time Machine',
      'fetch stocks cache; pull restores the working tree',
      'If pointers were never pushed to Git, recovery is impossible',
    ],
    fieldNotes: [
      'Quarterly DR drill: new machine, clone, pull, run metrics',
      'RTO target is meaningless without a rehearsed pull path',
    ],
    startDialog: [
      {
        title: 'When the laptop dies',
        markdown:
          'The only durable story is:\n\n1. **Git** has the pointer history\n2. **DVC remote** has the bytes\n3. `git clone` + `dvc pull` rebuilds the world\n\nIf either side is missing, you are doing archaeology.',
      },
      {
        title: 'Rehearse the recovery path',
        markdown:
          'Recovery needs two things: the Git history (pointers, `dvc.yaml`, `dvc.lock`) and an intact remote. After a lost laptop, `git clone` then `dvc pull` rebuilds the project, skipping objects it already has. Check the remote *before* the disaster: `dvc status --cloud` lists objects that exist locally but never reached storage — exactly the ones a dead disk would take with it.',
      },
    ],
    startState: tracked('data/data.xml', { remote: true }),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'workspaceHas', paths: ['data/data.xml'] },
        { kind: 'notDirty' },
      ],
    },
    solution: ['rm data/data.xml', 'dvc status', 'dvc fetch', 'dvc pull', 'dvc status'],
  },
  {
    id: 'mastery-2',
    series: 'collab-ci',
    seriesTitle: 'Mastery',
    name: 'Git-LFS vs DVC decision drill',
    difficulty: 4,
    par: 3,
    hint: 'concepts lfs; dvc status; dvc add data/data.xml',
    objective:
      'Choose the right tool with evidence: read the LFS vs DVC concept, then commit to DVC tracking for ML data in this repo.',
    learning: [
      'LFS versions big blobs in Git remotes; DVC versions pointers + object store + pipelines',
      'ML data/models want DVC (repro + exp + cache semantics)',
      'Few huge binaries with no pipeline may be fine on LFS',
    ],
    fieldNotes: [
      'Decision table in the team wiki beats Slack folklore',
      'Migrations: freeze LFS path, add DVC, dual-run one release, cut over',
    ],
    startDialog: [
      {
        title: 'Pick the boring correct tool',
        markdown: 'If you need **repro, exp, cache, pipeline** → DVC.\nIf you need **a big binary in a git remote** → LFS may suffice.\n\nFor ML, the answer is almost always DVC.',
      },
      {
        title: 'What changes when you leave LFS',
        markdown:
          'Git LFS keeps file content on the Git host and versions files one by one. DVC keeps content in storage you choose (S3, GCS, Azure, SSH, …) and adds pipelines (`dvc.yaml`), experiments and metrics. Migrating means `git lfs untrack`, then `dvc add` per artifact and `dvc push`; teammates then need access to the DVC remote, not only the Git host.',
      },
    ],
    startState: tracked('data/data.xml'),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'tracked', paths: ['data/data.xml'] }, { kind: 'notDirty' }],
    },
    solution: ['concepts lfs', 'dvc status', 'dvc add data/data.xml'],
  },
  {
    id: 'mastery-3',
    series: 'collab-ci',
    seriesTitle: 'Mastery',
    name: 'CI secrets + pull + comment',
    difficulty: 5,
    par: 5,
    hint:
      'dvc pull; dvc repro; dvc metrics show --md > report.md; cml comment create report.md; git add dvc.lock; git commit -m "ci: report metrics"',
    objective:
      'Run the production CI body with the secret-backed remote already configured: pull, repro, metrics report, CML comment, commit receipt.',
    learning: [
      'Remote credentials live in CI secrets, never in .dvc/config',
      'CI body is pull → repro → comment; everything else is plumbing',
      'Commit the receipt so humans and bots share one history',
    ],
    fieldNotes: [
      'OIDC/role auth beats long-lived keys on GitHub Actions',
      'Fail the job if `dvc status` is dirty after repro',
    ],
    startDialog: [
      {
        title: 'CI that a security team will approve',
        markdown:
          'Secrets in the vault. Remote config in Git. Bytes in DVC remote.\n\nThe YAML is boring on purpose.',
      },
      {
        title: 'How the secrets reach DVC',
        markdown:
          'The remote URL is in `.dvc/config`; the credentials arrive as environment variables from the CI secret store (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) or, better, an OIDC role assumed by the job. `dvc pull` and `dvc push` read them from the environment, and `cml` gets its own `REPO_TOKEN`. Nothing is written to the repo.',
      },
    ],
    startState: pipelineRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'stageUpToDate', name: 'train' },
        { kind: 'gitCommitMessageIncludes', text: 'ci' },
      ],
    },
    solution: [
      'dvc pull',
      'dvc repro',
      'dvc metrics show --md > report.md',
      'cml comment create report.md',
      'git add dvc.lock',
      'git commit -m "ci: report metrics"',
    ],
  },
  {
    id: 'mastery-4',
    series: 'collab-ci',
    seriesTitle: 'Mastery',
    name: 'Artifact promote: model to release',
    difficulty: 5,
    par: 6,
    hint:
      'dvc exp run -S lr=0.05; dvc exp show; dvc exp apply exp-; dvc push; git add params.yaml dvc.lock; git commit -m "release: promote lr=0.05"',
    objective:
      'Promote a winning experiment into a release story: apply it (params and outputs return), push the bytes, commit params and lock in Git.',
    learning: [
      'Release = applied params + restored artifacts + pushed bytes + git commit',
      'exp apply is not deploy; push is not release without history',
      'The release commit is what incident response will ask for',
    ],
    fieldNotes: [
      'Release checklist: apply → push → commit → tag',
      'Never email weights; the release commit is the contract',
    ],
    startDialog: [
      {
        title: 'From winner to release',
        markdown:
          'Search (`exp`) → choose (`show`) → apply → **share** (`push`) → **remember** (`git commit`). `apply` already restored the winner’s outputs, so there is nothing to rebuild.',
      },
      {
        title: 'What goes into the release commit',
        markdown:
          '`git add params.yaml dvc.lock` — the winning values plus the receipt of the run that produced them. The model file itself stays out of Git (DVC ignores it); `dvc push` put its bytes on the remote. Tag the commit (`git tag v1.4.0`) so `dvc.api` and `dvc pull` users can pin it.',
      },
    ],
    startState: pipelineRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'paramsAt', key: 'lr', value: 0.05 },
        { kind: 'stageUpToDate', name: 'train' },
        { kind: 'gitCommitMessageIncludes', text: 'release' },
      ],
    },
    solution: [
      'dvc exp run -S lr=0.05',
      'dvc exp show',
      'dvc exp apply exp-',
      'dvc push',
      'git add params.yaml dvc.lock',
      'git commit -m "release: promote lr=0.05"',
    ],
  },
  {
    id: 'mastery-5',
    series: 'compare',
    seriesTitle: 'Mastery',
    name: 'Confusion-style plots review',
    difficulty: 4,
    par: 4,
    hint: 'dvc repro; dvc plots show --template confusion; dvc plots diff',
    objective:
      'Render the confusion template and diff plots across the working change — classification review without a notebook.',
    learning: [
      'Templates encode how to read a series (linear vs confusion)',
      'plots diff is the visual twin of metrics diff',
      'PR review should include curves/matrix, not just scalars',
    ],
    fieldNotes: [
      'Classification releases always attach confusion matrix plots',
      'If the matrix is worse on a slice, stop the release',
    ],
    startDialog: [
      {
        title: 'Read the matrix, not the mean',
        markdown: '`dvc plots show --template confusion` then `dvc plots diff`.',
      },
      {
        title: 'Feeding the confusion template',
        markdown:
          'The `confusion` template wants a table with one row per prediction: an `actual` and a `predicted` column (CSV, TSV or JSON). Declare it in `dvc.yaml` under `plots:` with `template: confusion`, `x: actual`, `y: predicted`. `dvc plots diff` can then overlay the matrix at two revisions.',
      },
    ],
    startState: pipelineRepo(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'stageUpToDate', name: 'train' }],
    },
    solution: [
      'dvc repro',
      'dvc plots show --template confusion',
      'dvc plots diff',
    ],
  },
  {
    id: 'mastery-6',
    series: 'meta',
    seriesTitle: 'Mastery',
    name: 'No-cache outputs and external data',
    difficulty: 5,
    par: 4,
    hint:
      'dvc stage add -n lift -d data/data.xml -d src/train.py -O reports/lift.json python src/train.py; dvc stage list; dvc repro; cat dvc.yaml',
    objective:
      'Declare a stage whose output skips the DVC cache (`-O`), reproduce it, and understand how that differs from external outputs.',
    learning: [
      '-O / --outs-no-cache (cache: false in dvc.yaml): DVC tracks the file’s hash but does not copy it into the cache',
      'A no-cache output is not gitignored, so Git can hold it when it is small',
      'External outputs (an s3:// path) are a different, discouraged feature; prefer cloud versioning or import-url',
    ],
    fieldNotes: [
      'Small report files, metrics and plots data: cache: false so reviewers see them in the PR',
      'Huge tables in a warehouse: reference them from code, do not make them stage outputs',
    ],
    startDialog: [
      {
        title: 'Cached or not?',
        markdown:
          'A normal `-o` output goes to the cache and is gitignored. `-O` / `--outs-no-cache` sets `cache: false`: the file stays in the workspace and **Git can version it**, while `dvc.lock` still records its hash.\n\nIt does **not** mean “lives outside the repo”.',
      },
      {
        title: 'External outputs are another thing',
        markdown:
          'An *external* output is a path outside the workspace such as `s3://bucket/file` and needs `--external` and a configured remote cache. It is a legacy feature with many caveats: if the data already lives in a bucket, version it with `dvc import-url` or the bucket’s own versioning and keep stage outputs local.',
      },
    ],
    startState: pipelineRepo(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'stageExists', name: 'lift' }],
    },
    solution: [
      'dvc stage add -n lift -d data/data.xml -d src/train.py -O reports/lift.json python src/train.py',
      'dvc stage list',
      'dvc repro',
      'cat dvc.yaml',
    ],
  },
  {
    id: 'mastery-7',
    series: 'remotes',
    seriesTitle: 'Mastery',
    name: 'Remote auth without leaking secrets',
    difficulty: 5,
    par: 5,
    hint: 'dvc remote add team s3://ml-team/dvcstore; dvc remote modify team profile ml-prod; dvc remote modify --local team secret_access_key CI_SECRET; dvc remote list',
    objective:
      'Configure a team remote with non-secret options in config and secrets in local config via --local — never commit credentials.',
    learning: [
      'URL and non-secret options live in .dvc/config (shared via Git)',
      'Secrets (keys, tokens) must be saved with --local in .dvc/config.local (gitignored)',
      'remote modify --local keeps credentials completely out of Git commits',
    ],
    fieldNotes: [
      'Audit .dvc/config in PR review — no long-lived keys, ever',
      'Use --local for machine-specific secrets; prefer OIDC/instance roles in CI',
    ],
    startDialog: [
      {
        title: 'Credentials are not project files',
        markdown:
          'Safe to share: remote URL, profile name, region (in `.dvc/config`).\nNever safe: `secret_access_key`, tokens, passwords.\n\nUse `dvc remote modify --local` to store secrets in `.dvc/config.local` (which is gitignored).\n\nKeep secrets completely out of Git commits.',
      },
      {
        title: 'Where credentials may live',
        markdown:
          'DVC also reads cloud credentials from the usual places: environment variables (`AWS_ACCESS_KEY_ID`, `GOOGLE_APPLICATION_CREDENTIALS`), shared profile files (`~/.aws/credentials`) and instance or OIDC roles — none of them touch the repo. Keep `dvc remote modify --local` for per-machine overrides. If a secret ever reached Git history, rotate it; deleting the commit is not enough.',
      },
    ],
    startState: baseRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'remoteConfigured', name: 'team' },
        { kind: 'workspaceHas', paths: ['.dvc/config.local'] },
      ],
    },
    solution: [
      'dvc remote add team s3://ml-team/dvcstore',
      'dvc remote modify team profile ml-prod',
      'dvc remote modify --local team secret_access_key CI_SECRET',
      'dvc remote list',
    ],
  },
  {
    id: 'mastery-8',
    series: 'collab-ci',
    seriesTitle: 'Mastery',
    name: 'Transfer: design the data change without a recipe',
    difficulty: 5,
    par: 6,
    hint:
      'edit data/data.xml; dvc status; dvc add data/data.xml; dvc push; git add data/data.xml.dvc data/.gitignore; git commit -m "data: ship reviewed snapshot"',
    objective:
      'No step list to copy. Dirty the dataset and finish with pointer committed and objects pushed — the production definition of done.',
    learning: [
      'Transfer test: you design the path, not the checklist',
      'Done = clean status + pointer in Git + bytes on remote',
    ],
    fieldNotes: [
      'Use this as a hiring/onboarding gate for data engineers',
      'Interviewers watch the order: status before commit, push before claim',
    ],
    startDialog: [
      {
        title: 'Open lab',
        markdown:
          'This level **does not hand you a recipe**.\n\nGoal is a state, not a command list. Think, type, verify with `dvc status`.',
      },
      {
        title: 'How to verify a state goal',
        markdown:
          'Do not trust the last command’s green text; query the state. `dvc status` for the workspace, `dvc status --cloud` for cache vs remote, `git status` and `git log` for what Git knows. Three clean answers = done.',
      },
    ],
    startState: tracked('data/data.xml', { remote: true }),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'notDirty' },
        {
          kind: 'gitCommitMessageIncludes',
          text: 'data',
          requireFilesAny: ['data/data.xml.dvc'],
        },
        { kind: 'remoteHas', md5s: [] },
      ],
    },
    solution: [
      'edit data/data.xml',
      'dvc status',
      'dvc add data/data.xml',
      'dvc push',
      'git add data/data.xml.dvc data/.gitignore',
      'git commit -m "data: ship reviewed snapshot"',
    ],
  },
];
