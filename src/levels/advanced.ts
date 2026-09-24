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
    hint: 'edit data/data.xml; dvc add data/data.xml; dvc commit; dvc gc',
    objective:
      'Produce an unreferenced cache object (dirty data + new version) and reclaim space with `dvc gc` while keeping the current pointer valid.',
    learning: [
      'Content-addressed cache keeps old hashes until gc',
      'dvc gc removes objects not referenced by current workspace/Git refs',
      'gc is safe only when remotes still hold what teammates need',
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
          'Every `dvc add`/`commit` writes a **new** object. Old objects linger so `dvc checkout` can restore history.\n\nOver months this becomes GBs of orphans. `dvc gc` is the broom — but it only keeps objects referenced by what you point it at.',
      },
      {
        title: 'What “referenced” means',
        markdown:
          'A pointer md5 in the current workspace or in Git history you keep.\n\nNo pointer → candidate for gc.\n\n**Rule:** push what production still needs, *then* gc.',
      },
      {
        title: 'Drill',
        markdown:
          '1. Dirty the dataset (`edit data/data.xml`)\n2. `dvc add` + `dvc commit` → new hash in cache\n3. `dvc gc` → old unused object goes away\n4. Confirm current data is still tracked and clean',
      },
    ],
    startState: tracked('data/data.xml', { remote: true }),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'notDirty' },
        { kind: 'tracked', paths: ['data/data.xml'] },
        { kind: 'cacheLacks', md5s: [] },
      ],
    },
    solution: [
      'edit data/data.xml',
      'dvc add data/data.xml',
      'dvc commit',
      'dvc gc',
    ],
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
          '- `--wdir src` — run as if cwd is `src/`\n- `--always-changed` — always dirty on repro\n- `--no-cache` outs — track identity, skip cache bytes\n\nThese are not cosmetics; they encode *how* the stage lies or stays honest.',
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
    name: 'foreach matrix + DAG',
    difficulty: 5,
    par: 5,
    hint: 'dvc stage add -n train --foreach 50,100 -p n_estimators -o model-50.pkl -m metrics-50.json python src/train.py; dvc stage list; dvc repro; dvc dag',
    objective:
      'Expand one logical stage into a parameter matrix with `--foreach`, then list stages and visualize the DAG.',
    learning: [
      '--foreach turns one template into N stages (sweep-like, but in the pipeline)',
      'Each matrix cell has its own outs/metrics and invalidation',
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
    ],
    startState: pipelineRepo(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'stageExists', name: 'train' }],
    },
    solution: [
      'dvc stage add -n train --foreach 50,100 -p n_estimators -o model-50.pkl -m metrics-50.json python src/train.py',
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
      '--queue records work without blocking your laptop on training',
      'queue status is the standup view of pending experiments',
      'exp show is how you choose with evidence',
    ],
    fieldNotes: [
      'Friday sweep: queue 8 jobs, shut the laptop, read show on Monday',
      'Never hand-copy metrics into spreadsheets — exp show is the table',
    ],
    startDialog: [
      {
        title: 'Search without babysitting',
        markdown: 'Queue is a job board for hyperparameter sets. `queue start` / `--run-all` drains it.',
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
    hint: 'dvc exp run -S lr=0.05; dvc exp show; dvc exp apply exp-; dvc params show; dvc repro',
    objective:
      'Run a sweep, pick with `exp show`, `exp apply` the winner, verify `params.yaml` reflects it, then repro artifacts.',
    learning: [
      'apply promotes config into the workspace — it does not “deploy”',
      'After apply you still repro/push artifacts for production',
      'params show is the post-apply audit',
    ],
    fieldNotes: [
      'PR description should name the exp id you applied and why',
      'Applying without repro leaves models stale relative to params',
    ],
    startDialog: [
      {
        title: 'Winner is not a release',
        markdown: '`exp apply` = write winning params back.\n`dvc repro` = rebuild what those params produce.\n`dvc push` = share the bytes.',
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
      'dvc repro',
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
    hint: 'dvc import /tmp/registry data/external.csv; dvc status; dvc update data/external.csv.dvc; dvc status',
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
        markdown: '`dvc get` = copy (no version pin).\n`dvc import` = copy + version pin + update path.\n\nPrefer import for anything a pipeline depends on.',
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
      ],
    },
    solution: ['dvc import /tmp/registry data/external.csv', 'dvc status'],
  },
  {
    id: 'camp-6',
    series: 'collab-ci',
    seriesTitle: 'Collab & CI',
    name: 'CI skeleton: pull, repro, comment',
    difficulty: 4,
    par: 5,
    hint: 'dvc pull; dvc repro; dvc metrics show; dvc cml "metrics updated"; git add .; git commit -m "CI: refresh artifacts"',
    objective:
      'Execute the canonical CI loop: pull data, repro pipeline, read metrics, post a CML comment, commit the receipt.',
    learning: [
      'CI skeleton: clone → pull → repro → cml comment',
      'Heavy bytes stay in DVC remote; Git stays small',
      'CML turns metrics into reviewable PR comments',
    ],
    fieldNotes: [
      'This is the exact YAML people paste into GitHub Actions',
      'Cache the DVC remote credentials in CI secrets, never in repo',
    ],
    startDialog: [
      {
        title: 'The three-line CI religion',
        markdown: '```\ndvc pull\ndvc repro\ndvc cml "…"\n```\n\nEverything else is plumbing.',
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
      'dvc metrics show',
      'dvc cml "metrics updated"',
      'git add .',
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
    hint: 'dvc live start; dvc live log param train.lr=0.05; dvc live log metric acc=0.92; dvc live log plot roc.json; dvc live report; dvc exp show',
    objective:
      'Instrument a run with DVCLive (params, metric, plot, report) and surface it in the experiment table.',
    learning: [
      'DVCLive bridges training code → dvc metrics/plots',
      'Scalars become metrics; series become plots',
      'exp show is the human table over that bridge',
    ],
    fieldNotes: [
      'One Live() in train.py beats ten shell echoes',
      'Reports go to the PR; tables go to decisions',
    ],
    startDialog: [
      {
        title: 'Stop copy-pasting loss curves',
        markdown: 'DVCLive writes metrics/plots in the shape DVC already understands.',
      },
    ],
    startState: pipelineRepo(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'liveMetricLogged', name: 'acc' }],
    },
    solution: [
      'dvc live start',
      'dvc live log param train.lr=0.05',
      'dvc live log metric acc=0.92',
      'dvc live log plot roc.json',
      'dvc live report',
      'dvc exp show',
    ],
  },
  {
    id: 'collab-1',
    series: 'collab-ci',
    seriesTitle: 'Collab & CI',
    name: 'Pointer PR discipline',
    difficulty: 5,
    par: 6,
    hint: 'edit data/data.xml; dvc status; dvc add data/data.xml; dvc commit; git add data/data.xml.dvc data/.gitignore; git commit -m "data: bump raw snapshot"',
    objective:
      'Walk the full data-change PR path: dirty → status → add/commit → git commit of pointer only — never the raw bytes.',
    learning: [
      'PR review surface is pointer md5 + lock, not gigabytes',
      'git commit message is the human narrative; .dvc is the machine narrative',
      'Skipping dvc commit leaves a lying pointer in the PR',
    ],
    fieldNotes: [
      'CI should fail if someone `git add`s a tracked data path',
      'Reviewers read md5 diffs like they read lockfile diffs',
    ],
    startDialog: [
      {
        title: 'The only safe data PR',
        markdown: '1. Change data\n2. `dvc status`\n3. `dvc add` + `dvc commit`\n4. `git add` **pointer files only**\n5. `git commit`\n\nAnything else is a data leak or a lie.',
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
      'dvc commit',
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
    hint: 'dvc api; dvc status; dvc checkout',
    objective:
      'Use the DVC API surface in the simulator, then prove the workspace still matches pointers — apps read data without breaking the contract.',
    learning: [
      'dvc.api opens tracked data from a DVC repo in Python apps/notebooks',
      'API does not replace checkout when you need files on disk',
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
          '`dvc.api` is for **apps** that read data.\n`dvc checkout` is for **workspaces** that need files.\n\nSame md5 contract either way.',
      },
    ],
    startState: tracked('data/data.xml', { remote: true }),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'notDirty' }, { kind: 'tracked', paths: ['data/data.xml'] }],
    },
    solution: ['dvc api', 'dvc status', 'dvc checkout'],
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
    hint: 'dvc status; dvc repro; git add dvc.lock params.yaml; git commit -m "pipeline: resolve lock after param change"; dvc status',
    objective:
      'Resolve a realistic PR conflict: params changed, lock is stale, pointer still valid. Repro, commit the receipt, leave status clean.',
    learning: [
      'yaml is intent, lock is receipt — stale lock blocks honest review',
      'Pointer conflict is data; lock conflict is pipeline — fix order matters',
      'status after commit is the merge acceptance test',
    ],
    fieldNotes: [
      'Conflict playbook: status → repro → commit lock+yaml → status',
      'Never hand-merge lock hashes; re-run repro and take the new receipt',
    ],
    startDialog: [
      {
        title: 'When two people touch the same contract',
        markdown:
          'Teammate A changes `params.yaml`.\nTeammate B changes a stage command.\n\nGit will fight over `dvc.lock`.\n\n**Do not hand-edit lock.** Repro, then commit the new receipt with a clear message.',
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
    hint: 'dvc import /tmp/registry data/external.csv; cat data/external.csv.dvc; dvc update data/external.csv.dvc; dvc status',
    objective:
      'Import upstream data as a pinned dependency, read the pin, then `dvc update` on purpose — version bumps are reviewed events.',
    learning: [
      'import writes a pin (path + md5) you can read in the .dvc file',
      'update is a deliberate bump, like upgrading a library',
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
          '`dvc get` copies.\n`dvc import` copies **and** pins.\n`dvc update` moves the pin on purpose.\n\nRead `cat …​.dvc` before you update — know what you are leaving.',
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
      ],
    },
    solution: [
      'dvc import /tmp/registry data/external.csv',
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
    hint: 'edit data/data.xml; dvc status; dvc add data/data.xml; dvc commit; dvc push; git add data/data.xml.dvc data/.gitignore; git commit -m "data: ship snapshot v2"',
    objective:
      'Graduate drill: dirty data → status → add/commit → push remote → pointer-only git commit. One clean story a lead can audit.',
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
      'dvc commit',
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
    hint: 'dvc pull; dvc repro; dvc metrics show; dvc cml "ci: metrics"; git add .; git commit -m "ci: report metrics"',
    objective:
      'Run the production CI body with the secret-backed remote already configured: pull, repro, metrics, CML comment, commit receipt.',
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
        markdown: 'Secrets in the vault. Remote config in Git. Bytes in DVC remote.\n\nThe YAML is boring on purpose.',
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
      'dvc metrics show',
      'dvc cml "ci: metrics"',
      'git add .',
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
    hint: 'dvc exp run -S lr=0.05; dvc exp show; dvc exp apply exp-; dvc repro; dvc push; git add .; git commit -m "release: promote lr=0.05"',
    objective:
      'Promote a winning experiment into a release story: apply, repro artifacts, push bytes, tag the narrative in Git.',
    learning: [
      'Release = applied params + repro artifacts + pushed bytes + git commit',
      'exp apply is not deploy; push is not release without history',
      'The release commit is what incident response will ask for',
    ],
    fieldNotes: [
      'Release checklist: apply → repro → push → commit → tag',
      'Never email weights; the release commit is the contract',
    ],
    startDialog: [
      {
        title: 'From winner to release',
        markdown: 'Search (`exp`) → choose (`show`) → apply → **build** (`repro`) → **share** (`push`) → **remember** (`git commit`).',
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
      'dvc repro',
      'dvc push',
      'git add .',
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
    name: 'External data + no-cache contract',
    difficulty: 5,
    par: 4,
    hint: 'dvc stage add -n lift -d data/data.xml -O /tmp/ext/out.bin python src/train.py; dvc stage list; dvc repro; dvc dag',
    objective:
      'Declare a stage that writes an external/no-cache style out, list stages, repro, and read the DAG as the contract.',
    learning: [
      'External / no-cache outs track identity without copying warehouse bytes',
      'The DAG is how leads review data contracts before merge',
      'Invalidation still follows deps even when outs are external',
    ],
    fieldNotes: [
      'Warehouse tables are external outs, not cache objects',
      'Document who owns the external path in the stage description',
    ],
    startDialog: [
      {
        title: 'When bytes live elsewhere',
        markdown: '`-O` / cache:false means: track the **name**, not the warehouse.\n\nUse for S3 tables, shared disks, feature stores.',
      },
    ],
    startState: pipelineRepo(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'stageExists', name: 'lift' }],
    },
    solution: [
      'dvc stage add -n lift -d data/data.xml -O /tmp/ext/out.bin python src/train.py',
      'dvc stage list',
      'dvc repro',
      'dvc dag',
    ],
  },
];
