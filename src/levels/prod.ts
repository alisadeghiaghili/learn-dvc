import type { LevelDef, PipelineStage, RepoState } from '../engine/types';
import { emptyState, ensureGit, makeFile } from '../engine/state';
import { fakeMd5 } from '../engine/hash';

/**
 * Production habits: the commands a team adds once the basics work -
 * Git hooks, saved experiments, matrix stages, repro --pull, a shared cache and a model registry.
 */

const SERIES = 'prod';
const SERIES_TITLE = 'Production habits';
const DATA = 'data/data.xml';

/** Git + DVC initialized, "Initialize DVC" committed, nothing tracked yet. */
function baseRepo(): RepoState {
  const s = emptyState();
  s.initialized = true;
  ensureGit(s);
  s.files['.dvc/config'] = makeFile('.dvc/config', 'meta');
  s.files['.dvc/.gitignore'] = makeFile('.dvc/.gitignore', 'meta');
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

/** Track data/data.xml at `version` and commit its pointer. Returns the md5. */
function commitData(s: RepoState, version: number, hash: string, message: string): string {
  const md5 = fakeMd5(`file:${DATA}:v${version}`);
  s.dataVersions[DATA] = version;
  s.files[DATA] = makeFile(DATA, 'data', {
    contentId: md5,
    tracked: true,
    pointerMd5: md5,
    dirty: false,
    present: true,
    gitignored: true,
  });
  s.files[`${DATA}.dvc`] ??= makeFile(`${DATA}.dvc`, 'dvc');
  s.files['data/.gitignore'] ??= makeFile('data/.gitignore', 'meta');
  if (!s.cache.includes(md5)) s.cache.push(md5);
  s.gitCommits.push({
    hash,
    message,
    pointers: { [DATA]: md5 },
    pipelineSig: '',
    params: { ...s.params },
    metrics: { ...s.metrics },
    files: [`${DATA}.dvc`, 'data/.gitignore'],
  });
  return md5;
}

function withRemote(s: RepoState, objects: string[]): void {
  s.remotes = [{ name: 'myremote', url: '/tmp/dvcstore', isDefault: true }];
  s.remoteObjects = [...objects];
}

function stage(partial: Partial<PipelineStage> & Pick<PipelineStage, 'name' | 'cmd' | 'deps' | 'outs'>): PipelineStage {
  return { params: [], metrics: [], frozen: false, upToDate: true, ...partial };
}

// ── prod-1: Git hooks ───────────────────────────────────────────────────────

function hooksStart(): RepoState {
  const s = baseRepo();
  const v0 = commitData(s, 0, 'c0ffee1', 'Add raw data');
  commitData(s, 1, 'd00d001', 'Update the dataset');
  withRemote(s, [v0]);
  return s;
}

// ── prod-2: exp save / remove ───────────────────────────────────────────────

function expStart(): RepoState {
  const s = baseRepo();
  const v0 = commitData(s, 0, 'c0ffee1', 'Add raw data');
  withRemote(s, [v0]);
  s.files['src/train.py'] = makeFile('src/train.py', 'code');
  s.files['params.yaml'] = makeFile('params.yaml', 'params', { contentId: fakeMd5('params:lr=0.1:n=10') });
  s.params = { lr: 0.1, n_estimators: 10 };
  s.files['dvc.yaml'] = makeFile('dvc.yaml', 'yaml');
  s.files['model.pkl'] = makeFile('model.pkl', 'data', { contentId: fakeMd5('prod:model:v0'), gitignored: true });
  s.files['metrics.json'] = makeFile('metrics.json', 'metrics', { contentId: fakeMd5('prod:metrics:v0') });
  s.metrics = { acc: 0.81 };
  s.generated = ['model.pkl', 'metrics.json'];
  s.pipeline.push(
    stage({
      name: 'train',
      cmd: 'python src/train.py',
      deps: [DATA, 'src/train.py'],
      outs: ['model.pkl', 'metrics.json'],
      params: ['lr', 'n_estimators'],
      metrics: ['metrics.json'],
      locked: true,
    }),
  );
  return s;
}

// ── prod-3: vars + matrix ───────────────────────────────────────────────────

const MATRIX_YAML = [
  'vars:',
  '  - data: data/data.xml',
  'stages:',
  '  train:',
  '    matrix:',
  '      model: [cnn, xgb]',
  '      feature: [a, b]',
  '    cmd: python src/train.py --model ${item.model} --feature ${item.feature}',
  '    deps:',
  '      - ${data}',
  '      - src/train.py',
  '    outs:',
  '      - models/${item.model}-${item.feature}.pkl',
].join('\n');

const MATRIX_NAMES = ['train@cnn-a', 'train@cnn-b', 'train@xgb-a', 'train@xgb-b'];

function matrixStart(): RepoState {
  const s = baseRepo();
  const v0 = commitData(s, 0, 'c0ffee1', 'Add raw data');
  withRemote(s, [v0]);
  s.files['src/train.py'] = makeFile('src/train.py', 'code');
  s.files['dvc.yaml'] = makeFile('dvc.yaml', 'yaml');
  for (const model of ['cnn', 'xgb']) {
    for (const feature of ['a', 'b']) {
      s.pipeline.push(
        stage({
          name: `train@${model}-${feature}`,
          cmd: `python src/train.py --model ${model} --feature ${feature}`,
          deps: [DATA, 'src/train.py'],
          outs: [`models/${model}-${feature}.pkl`],
          upToDate: false,
        }),
      );
    }
  }
  s.dvcYaml = MATRIX_YAML;
  return s;
}

// ── prod-4: fresh clone ─────────────────────────────────────────────────────

const CLONE_OUTS = ['data/prepared.csv', 'model.pkl'];
const CLONE_IDS = CLONE_OUTS.map((o) => fakeMd5(`prod:clone:out:${o}`));

function cloneStart(): RepoState {
  const s = baseRepo();
  const v0 = commitData(s, 0, 'c0ffee1', 'Add raw data');
  s.files['src/prepare.py'] = makeFile('src/prepare.py', 'code');
  s.files['src/train.py'] = makeFile('src/train.py', 'code');
  s.files['params.yaml'] = makeFile('params.yaml', 'params', { contentId: fakeMd5('params:lr=0.1:n=10') });
  s.params = { lr: 0.1, n_estimators: 10 };
  s.files['dvc.yaml'] = makeFile('dvc.yaml', 'yaml');
  s.files['dvc.lock'] = makeFile('dvc.lock', 'yaml');
  s.files['metrics.json'] = makeFile('metrics.json', 'metrics', { contentId: fakeMd5('prod:clone:metrics') });
  s.metrics = { acc: 0.84 };
  CLONE_OUTS.forEach((o, i) => {
    // exactly what a fresh clone looks like: the pointer in Git, the bytes only on the remote
    s.files[o] = makeFile(o, 'data', { contentId: CLONE_IDS[i]!, present: false, gitignored: true });
  });
  s.pipeline.push(
    stage({
      name: 'prepare',
      cmd: 'python src/prepare.py',
      deps: [DATA, 'src/prepare.py'],
      outs: ['data/prepared.csv'],
      locked: true,
    }),
    stage({
      name: 'train',
      cmd: 'python src/train.py',
      deps: ['data/prepared.csv', 'src/train.py'],
      outs: ['model.pkl', 'metrics.json'],
      params: ['lr', 'n_estimators'],
      metrics: ['metrics.json'],
      locked: true,
    }),
  );
  withRemote(s, [v0, ...CLONE_IDS]);
  s.gitCommits.push({
    hash: 'f1f1f1f',
    message: 'Add the training pipeline',
    pointers: {},
    pipelineSig: '',
    params: { ...s.params },
    metrics: { ...s.metrics },
    files: ['dvc.yaml', 'dvc.lock', 'params.yaml', 'metrics.json', 'src/prepare.py', 'src/train.py'],
  });
  return s;
}

// ── prod-5: shared cache ────────────────────────────────────────────────────

const SHARED_DIR = '/mnt/shared/dvc-cache';

function sharedCacheStart(): RepoState {
  const s = baseRepo();
  const v0 = commitData(s, 0, 'c0ffee1', 'Add raw data');
  withRemote(s, [v0]);
  return s;
}

// ── prod-6: artifacts + registry ────────────────────────────────────────────

const REGISTRY_URL = 'https://github.com/acme/model-registry.git';

const ARTIFACTS_YAML = [
  'stages:',
  '  train:',
  '    cmd: python src/train.py',
  '    outs:',
  '      - models/model.pkl',
  'artifacts:',
  '  model:',
  '    path: models/model.pkl',
  '    type: model',
].join('\n');

function registryStart(): RepoState {
  const s = baseRepo();
  const v0 = commitData(s, 0, 'c0ffee1', 'Add raw data');
  withRemote(s, [v0]);
  s.files['src/train.py'] = makeFile('src/train.py', 'code');
  s.files['dvc.yaml'] = makeFile('dvc.yaml', 'yaml');
  s.files['models/model.pkl'] = makeFile('models/model.pkl', 'data', {
    contentId: fakeMd5('prod:registry:model'),
    gitignored: true,
  });
  s.pipeline.push(
    stage({ name: 'train', cmd: 'python src/train.py', deps: [DATA, 'src/train.py'], outs: ['models/model.pkl'], locked: true }),
  );
  s.generated = ['models/model.pkl'];
  s.dvcYaml = ARTIFACTS_YAML;
  s.gitCommits.push({
    hash: 'e5e5e5e',
    message: 'Train the first model',
    pointers: {},
    pipelineSig: '',
    params: {},
    metrics: {},
    files: ['dvc.yaml', 'dvc.lock', 'src/train.py'],
  });
  return s;
}

export const prodLevels: LevelDef[] = [
  {
    id: 'prod-1',
    series: SERIES,
    seriesTitle: SERIES_TITLE,
    name: 'Git hooks: let Git run DVC for you',
    difficulty: 2,
    par: 3,
    hint: 'dvc install; git checkout HEAD~1; dvc status',
    objective:
      'Install the DVC Git hooks, then step back one commit with `git checkout HEAD~1` and confirm that the data followed the code without you running `dvc checkout`.',
    learning: [
      'dvc install adds three hooks to .git/hooks: pre-commit runs dvc status, post-checkout runs dvc checkout, pre-push runs dvc push',
      'With the post-checkout hook, git checkout <ref> moves code and data together; without it the workspace keeps the newer data',
      'Hooks belong to one clone and are not versioned: every teammate runs dvc install, or the team shares .pre-commit-config.yaml via --use-pre-commit-tool',
    ],
    fieldNotes: [
      'Put "run dvc install" in the README setup section, right next to the pip install line',
      'A failing pre-push hook is a feature: it stops code from reaching the remote before its data has been pushed',
      'CI does not need the hooks; it runs dvc pull and dvc repro explicitly',
    ],
    startDialog: [
      {
        title: 'Code moves, data stays behind',
        markdown:
          'You check out last week’s commit to reproduce a bug report. Git rewinds the code and the `.dvc` pointers, but `data/data.xml` on disk is still the newest version until somebody runs `dvc checkout`.\n\nForget that step and you debug today’s data with last week’s code. The numbers still look plausible, which is exactly what makes it dangerous.',
      },
      {
        title: 'Three hooks, installed once per clone',
        markdown:
          '`dvc install` writes three Git hooks into `.git/hooks`: **pre-commit** runs `dvc status`, **post-checkout** runs `dvc checkout`, and **pre-push** runs `dvc push`.\n\nAfterwards `git checkout HEAD~1` moves the code and the data together, and `git push` stops when the data cannot reach the remote. The failure shows up on your laptop, not in a teammate’s `dvc pull` the next morning.\n\nHooks live in `.git`, which Git does not version, so each teammate runs `dvc install` once per clone. Teams that already use the pre-commit tool run `dvc install --use-pre-commit-tool` and commit `.pre-commit-config.yaml` instead.',
      },
    ],
    startState: hooksStart(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'hooksInstalled' },
        { kind: 'pointer', path: DATA, md5: fakeMd5(`file:${DATA}:v0`) },
        { kind: 'notDirty' },
      ],
    },
    solution: ['dvc install', 'git checkout HEAD~1', 'dvc status'],
  },
  {
    id: 'prod-2',
    series: SERIES,
    seriesTitle: SERIES_TITLE,
    name: 'Save and prune experiments',
    difficulty: 3,
    par: 5,
    hint: 'edit params.yaml lr=0.05; dvc exp save -n lr-005; edit params.yaml lr=0.9; dvc exp save -n lr-09; dvc exp remove lr-09',
    objective:
      'Record two hand-tried learning rates as named experiments with `dvc exp save`, then delete the failed one with `dvc exp remove` so that only the useful experiment stays in the list.',
    learning: [
      'dvc exp save -n <name> stores the current workspace params and metrics as an experiment and runs no stage',
      'Without -n DVC generates an adjective-noun name; saving an existing name fails unless you add -f',
      'dvc exp remove <name> deletes one experiment; -A removes all of them, --queue the queued ones, -g <git-remote> deletes it from a Git remote',
    ],
    fieldNotes: [
      'Name an experiment after the change (lr-005), not after yourself: that name is what the pull request discussion refers to',
      'Prune before you share: `dvc exp push origin -A` sends every experiment (without `-A` or names it sends only those based on the current commit), so remove the dead ends first',
      'dvc exp gc no longer exists in DVC 3; dvc exp remove replaces it',
    ],
    startDialog: [
      {
        title: 'Results that only exist in your workspace',
        markdown:
          'You tried two learning rates by hand. Each result sits in `params.yaml` and `metrics.json` in the workspace, and the next edit overwrites it. `git stash` does not help, because those files are the experiment.\n\nRunning the whole pipeline again just to record what you already have would waste the compute you already paid for.',
      },
      {
        title: 'exp save records, exp remove prunes',
        markdown:
          '`dvc exp save -n lr-005` stores the params and metrics that are in the workspace right now as an experiment. It runs no stage, so stale stages stay stale and nothing is recomputed. Without `-n` DVC invents an adjective-noun name such as `brisk-otter`, and saving an existing name fails unless you add `-f`.\n\nThe list grows quickly. `dvc exp remove lr-09` deletes one experiment, `dvc exp remove -A` all of them, and `dvc exp remove -g origin lr-09` deletes it from a Git remote after a `dvc exp push`. Experiments are shared in a team, so a clean list is part of the review: everyone else has to scroll past your dead ends. (`dvc exp gc` was removed in DVC 3.)',
      },
    ],
    startState: expStart(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'experimentNamed', name: 'lr-005', exists: true },
        { kind: 'experimentNamed', name: 'lr-09', exists: false },
      ],
    },
    solution: [
      'edit params.yaml lr=0.05',
      'dvc exp save -n lr-005',
      'edit params.yaml lr=0.9',
      'dvc exp save -n lr-09',
      'dvc exp remove lr-09',
    ],
  },
  {
    id: 'prod-3',
    series: SERIES,
    seriesTitle: SERIES_TITLE,
    name: 'One template, four stages: vars and matrix',
    difficulty: 3,
    par: 2,
    hint: 'cat dvc.yaml; dvc repro train; dvc status',
    objective:
      'Read the `vars` and `matrix` template in `dvc.yaml`, then reproduce all four generated stages with a single `dvc repro train`.',
    learning: [
      'vars defines a value once; ${name} reuses it in deps, outs and cmd',
      'matrix expands one stage template into one stage per combination, named train@cnn-a, train@cnn-b and so on; ${item.model} is the current value',
      'dvc repro train runs every generated stage, dvc repro train@cnn-a only one; dvc dag and dvc status list the generated names',
    ],
    fieldNotes: [
      'Keep the grid small: every combination is a stage, an output and a dvc.lock entry',
      'Use a matrix for a fixed grid and dvc exp run -S for open-ended sweeps',
      'dvc stage add cannot create a matrix; you write it in dvc.yaml by hand',
    ],
    startDialog: [
      {
        title: 'Copy-pasted stages drift apart',
        markdown:
          'Two models and two feature sets mean four almost identical stages. Copied by hand, they drift: one gets a new flag, another keeps the old one, and nobody notices until a result cannot be reproduced.\n\nA template removes the copies.',
      },
      {
        title: 'Reading a matrix stage',
        markdown:
          'In `dvc.yaml`, `vars` holds values you use more than once and `matrix` lists the options. DVC builds one stage for every combination: `train@cnn-a`, `train@cnn-b`, `train@xgb-a` and `train@xgb-b`. Inside the template `${item.model}` and `${item.feature}` become the current combination, while `${data}` comes from `vars`.\n\n`cat dvc.yaml` shows the template, not the generated stages; `dvc dag` and `dvc status` show the expanded names. `dvc repro train` runs the whole group and `dvc repro train@cnn-a` just one, which is how you re-run a single failed cell of the grid without touching the other three.',
      },
    ],
    startState: matrixStart(),
    goal: { kind: 'stagesUpToDate', names: MATRIX_NAMES },
    solution: ['cat dvc.yaml', 'dvc repro train', 'dvc status'],
  },
  {
    id: 'prod-4',
    series: SERIES,
    seriesTitle: SERIES_TITLE,
    name: 'Fresh clone: repro --pull',
    difficulty: 3,
    par: 2,
    hint: 'dvc status; dvc repro --pull',
    objective:
      'You just cloned the project. dvc.lock is current, but no model or prepared data is on disk. Bring the outputs back with `dvc repro --pull` instead of retraining.',
    learning: [
      'On a fresh clone dvc.lock says the stages are current, but the outputs are neither in the workspace nor in the local cache',
      'A plain dvc repro treats missing outputs as a reason to run the stage again',
      'dvc repro --pull downloads the missing outputs from the remote; if the remote lacks them the stage runs after all, and --allow-missing skips such stages instead',
    ],
    fieldNotes: [
      'In CI, dvc repro --pull restores unchanged stages from the remote and trains only what really changed',
      'dvc repro --allow-missing is the cheap CI check that nothing is stale: it never downloads data',
      'Push the outputs of every stage you commit, otherwise --pull has nothing to pull',
    ],
    startDialog: [
      {
        title: 'The expensive way to start the day',
        markdown:
          'You clone the repository on a new machine and run `dvc repro`. DVC sees that the outputs listed in `dvc.lock` are not on disk, treats the stages as stale and starts training again: hours of compute to recreate files that already sit on the remote.',
      },
      {
        title: 'Pull instead of recompute',
        markdown:
          '`dvc status` right after a clone shows `changed outs` marked `not in cache`: the stages are locked and current, only the bytes are missing. `dvc repro --pull` checks each stage against `dvc.lock`; when nothing changed it downloads the missing outputs from the default remote and moves on without running anything. If the remote does not hold an output, the stage runs as usual, so the flag is safe as a default.\n\nWith `--allow-missing` DVC skips stages whose only difference is missing data and downloads nothing, which suits a CI job that merely checks that nobody forgot to run `dvc repro`.',
      },
    ],
    startState: cloneStart(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'workspaceHas', paths: CLONE_OUTS },
        { kind: 'cacheHas', md5s: CLONE_IDS },
        { kind: 'stagesUpToDate', names: ['prepare', 'train'] },
      ],
    },
    solution: ['dvc status', 'dvc repro --pull'],
  },
  {
    id: 'prod-5',
    series: SERIES,
    seriesTitle: SERIES_TITLE,
    name: 'A shared team cache',
    difficulty: 4,
    par: 6,
    hint: `dvc cache dir ${SHARED_DIR}; dvc config cache.shared group; dvc config cache.type symlink,hardlink; dvc checkout --relink; git add .dvc/config; git commit -m "Use a shared team cache"`,
    objective:
      'Point the project at a team-wide cache directory, make it group-writable, link instead of copy, and commit the shared `.dvc/config` so that every clone gets the same setup.',
    learning: [
      'dvc cache dir <path> sets cache.dir in .dvc/config; with --local it goes to .dvc/config.local and stays on one machine',
      'cache.shared group makes cache files group-writable so several users can fill one cache; cache.type symlink,hardlink links instead of copying, and DVC rejects unknown values',
      'dvc checkout --relink recreates the workspace files as links into the new cache; the settings are an ordinary Git change to .dvc/config',
    ],
    fieldNotes: [
      'Put the shared cache on the same filesystem as the workspaces, otherwise hardlinks are impossible',
      'Never put credentials in the shared .dvc/config; use --local for values that differ per machine',
      'With links a tracked file is the cache object itself: replace it and run dvc add again instead of editing it in place',
    ],
    startDialog: [
      {
        title: 'Five copies of the same dataset',
        markdown:
          'Five people share one GPU server and each runs `dvc pull`. Each of them gets a private 50 GB cache inside their own project, and the disk is full by Friday. All five caches hold the same files, because DVC names every object by its content hash.',
      },
      {
        title: 'One cache, three settings and a commit',
        markdown:
          'A shared cache is configuration, not a new tool. `dvc cache dir /mnt/shared/dvc-cache` sets where the cache lives, `dvc config cache.shared group` makes its files group-writable so any teammate can add to it, and `dvc config cache.type symlink,hardlink` makes workspaces point at the cache instead of copying from it. DVC checks the values and refuses unknown ones such as `cache.shared everyone`.\n\nRun `dvc checkout --relink` after changing the link type, then read `cat .dvc/config` and `git status`: the settings live in the committed `.dvc/config`, so one `git commit` gives every clone the same layout. A path that differs per machine belongs in `.dvc/config.local` (`--local`) instead.',
      },
    ],
    startState: sharedCacheStart(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'configEquals', key: 'cache.dir', value: SHARED_DIR },
        { kind: 'configEquals', key: 'cache.shared', value: 'group' },
        { kind: 'configEquals', key: 'cache.type', value: 'symlink,hardlink' },
        { kind: 'gitCommitMessageIncludes', text: 'shared team cache', requireFilesAny: ['.dvc/config'] },
      ],
    },
    solution: [
      `dvc cache dir ${SHARED_DIR}`,
      'dvc config cache.shared group',
      'dvc config cache.type symlink,hardlink',
      'dvc checkout --relink',
      'git add .dvc/config',
      'git commit -m "Use a shared team cache"',
    ],
  },
  {
    id: 'prod-6',
    series: SERIES,
    seriesTitle: SERIES_TITLE,
    name: 'Model registry with GTO tags',
    difficulty: 4,
    par: 3,
    hint: `gto register model --version v1.0.0; gto assign model --version v1.0.0 --stage prod; dvc artifacts get ${REGISTRY_URL} model --stage prod -o deploy/model.pkl`,
    objective:
      'Register version v1.0.0 of the `model` artifact declared in dvc.yaml, assign it to the prod stage with GTO, then download exactly that version with `dvc artifacts get`.',
    learning: [
      'The artifacts: section of dvc.yaml names the models and datasets a team publishes (path and type)',
      'GTO is a separate CLI: gto register creates the Git tag model@v1.0.0 and gto assign creates model#prod#1; a commit carries one version, so the next version needs a new commit',
      'dvc artifacts get <url> <name> --rev <version> or --stage <stage> downloads that registered version into -o, and fails while nothing is registered',
    ],
    fieldNotes: [
      'Deploy by stage, not by file path: the service asks for "model in prod" and a promotion becomes one Git tag',
      'Push the tags with git push --tags, otherwise nobody else sees the registry',
      'dvc artifact and dvc register are not commands; the registry verbs belong to gto',
    ],
    startDialog: [
      {
        title: 'Which model is in production?',
        markdown:
          'Somebody asks which model file is serving traffic. The answer lives in a chat thread, in a file name like `final_v2_REAL.pkl`, or in one person’s memory. A registry replaces that guesswork with a record the whole team can query.',
      },
      {
        title: 'Git tags as a registry',
        markdown:
          'Declare the model once in `dvc.yaml` under `artifacts:` (path and type). Then use the separate GTO CLI: `gto register model --version v1.0.0` creates the Git tag `model@v1.0.0` on the current commit, and `gto assign model --version v1.0.0 --stage prod` creates `model#prod#1`. Assigning prod again later makes `model#prod#2`, and the highest number wins.\n\nConsumers never touch your branch: `dvc artifacts get <registry-url> model --stage prod -o deploy/model.pkl` resolves the tag, finds its commit and downloads the file as it was there. GTO only writes Git tags, so push them (`git push --tags`) for others to see the registry. Promotion and rollback become one tag each.',
      },
    ],
    startState: registryStart(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'gitTag', name: 'model@v1.0.0' },
        { kind: 'gitTag', name: 'model#prod#1' },
        { kind: 'workspaceHas', paths: ['deploy/model.pkl'] },
      ],
    },
    solution: [
      'gto register model --version v1.0.0',
      'gto assign model --version v1.0.0 --stage prod',
      `dvc artifacts get ${REGISTRY_URL} model --stage prod -o deploy/model.pkl`,
    ],
  },
];
