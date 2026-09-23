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
      checks: [{ kind: 'stageExists', name: 'featurize' }],
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
        { kind: 'tracked', paths: ['data/external.csv'] },
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
];
