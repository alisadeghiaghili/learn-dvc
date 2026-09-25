import type { LevelDef, RepoState } from '../engine/types';
import { emptyState, ensureGit, makeFile } from '../engine/state';
import { fakeMd5 } from '../engine/hash';

/**
 * Transfer pack — raise real skill acquisition to ~90%.
 * Rules: state goals, wrong-order traps, error recovery, evidence over recipes.
 */

function seeded(): RepoState {
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

function trackedRemote(): RepoState {
  const s = seeded();
  const md5 = fakeMd5('transfer:data:v0');
  s.files['data/data.xml'] = makeFile('data/data.xml', 'data', {
    contentId: md5,
    tracked: true,
    pointerMd5: md5,
    dirty: false,
    present: true,
    gitignored: true,
  });
  s.files['data/data.xml.dvc'] = makeFile('data/data.xml.dvc', 'dvc');
  s.files['data/.gitignore'] = makeFile('data/.gitignore', 'meta');
  s.cache = [md5];
  s.remotes = [{ name: 'myremote', url: '/tmp/dvcstore', isDefault: true }];
  s.remoteObjects = [md5];
  s.gitCommits.push({
    hash: 'c0ffee1',
    message: 'Add raw data',
    pointers: { 'data/data.xml': md5 },
    pipelineSig: '',
    params: {},
    metrics: {},
    files: ['data/data.xml.dvc', 'data/.gitignore'],
  });
  return s;
}

function pipelineRepo(): RepoState {
  const s = trackedRemote();
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
    contentId: fakeMd5('model:v0'),
  });
  s.files['metrics.json'] = makeFile('metrics.json', 'metrics', {
    contentId: fakeMd5('metrics:v0'),
  });
  s.metrics = { acc: 0.8 };
  s.generated = ['model.pkl', 'metrics.json'];
  return s;
}

export const transferLevels: LevelDef[] = [
  {
    id: 'xfer-1',
    series: 'transfer',
    seriesTitle: 'Transfer',
    name: 'Pointer forensics: prove you understand',
    difficulty: 5,
    par: 5,
    hint: 'cat data/data.xml.dvc; dvc status; concepts pointer; dvc diff',
    objective:
      'No new commands. Read the pointer file, state what Git vs DVC own, then prove workspace integrity with status/diff.',
    learning: [
      'Pointer file is the contract: path + md5 (+ size)',
      'If you cannot explain .dvc to a teammate, you do not own this skill',
      'status/diff are evidence, not paperwork',
    ],
    fieldNotes: [
      'Incident questions start here: “which bytes?” = which pointer?',
      'Teach juniors to cat the pointer before touching data',
    ],
    startDialog: [
      {
        title: 'Explain it or you do not own it',
        markdown:
          'This level does **not** teach new flags.\n\nIt asks you to **read evidence** and act on it.\n\n`cat data/data.xml.dvc` — what do you see?\n`dvc status` — is the workspace honest?',
      },
      {
        title: 'Production note',
        markdown: 'Read the evidence before you type. Status first, then act.\n\nIf you cannot explain the step, you are guessing.',
      },
    ],
    startState: trackedRemote(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'notDirty' },
        { kind: 'tracked', paths: ['data/data.xml'] },
      ],
    },
    solution: ['cat data/data.xml.dvc', 'dvc status', 'concepts pointer', 'dvc diff'],
  },
  {
    id: 'xfer-2',
    series: 'transfer',
    seriesTitle: 'Transfer',
    name: 'Ship under pressure — no skipped links',
    difficulty: 5,
    par: 7,
    hint: 'edit data/data.xml; dvc status; dvc add data/data.xml; dvc commit; dvc push; git add data/data.xml.dvc data/.gitignore; git commit -m "data: ship v2"',
    objective:
      'Production handoff in one flow: dirty → evidence → pointer → remote → history. Goal is a clean audited state, not a checklist.',
    learning: [
      'Skipping push or pointer commit breaks the next teammate',
      'status before commit is non-negotiable',
      'Handoff = remote bytes + Git narrative',
    ],
    fieldNotes: [
      'This is the definition of done for data work',
      'If you cannot narrate each step, you are not ready for prod',
    ],
    startDialog: [
      {
        title: 'No safety net',
        markdown:
          'You are the on-call engineer. Dataset changed. Team needs it tomorrow.\n\n**Finish the handoff.**',
      },
      {
        title: 'Production note',
        markdown: 'Read the evidence before you type. Status first, then act.\n\nIf you cannot explain the step, you are guessing.',
      },
    ],
    startState: trackedRemote(),
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
      'dvc commit',
      'dvc push',
      'git add data/data.xml.dvc data/.gitignore',
      'git commit -m "data: ship v2"',
    ],
  },
  {
    id: 'xfer-3',
    series: 'transfer',
    seriesTitle: 'Transfer',
    name: 'Pipeline design without a recipe',
    difficulty: 5,
    par: 6,
    hint: 'dvc stage add -n train -d data/data.xml -d src/train.py -p lr -p n_estimators -o model.pkl -m metrics.json python src/train.py; dvc repro; dvc dag',
    objective:
      'Design a training stage that links data, code, params, outs, and metrics. Then repro and read the DAG as your contract.',
    learning: [
      'deps decide invalidation; params decide knobs; metrics decide evidence',
      'A missing dep is a silent production bug',
      'DAG is how leads review the contract before merge',
    ],
    fieldNotes: [
      'Interview drill: whiteboard the stage before typing',
      'If metrics are not declared, exp show is empty — design flaw',
    ],
    startDialog: [
      {
        title: 'You design it',
        markdown:
          'No copy-paste solution first.\n\nThink: what must the stage **depend on**? What should it **emit**?\n\nThen prove it with repro + dag.',
      },
      {
        title: 'Production note',
        markdown: 'Read the evidence before you type. Status first, then act.\n\nIf you cannot explain the step, you are guessing.',
      },
    ],
    startState: pipelineRepo(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'stageExists', name: 'train' },
        { kind: 'stageUpToDate', name: 'train' },
      ],
    },
    solution: [
      'dvc stage add -n train -d data/data.xml -d src/train.py -p lr -p n_estimators -o model.pkl -m metrics.json python src/train.py',
      'dvc repro',
      'dvc dag',
    ],
  },
  {
    id: 'xfer-4',
    series: 'transfer',
    seriesTitle: 'Transfer',
    name: 'Experiment lifecycle + error recovery',
    difficulty: 5,
    par: 7,
    hint: 'dvc exp run -S lr=0.2; dvc exp show; dvc exp run -S lr=0.05; dvc exp apply exp-; dvc params show; dvc repro; dvc status',
    objective:
      'Run a bad and a good config, choose with evidence, apply the winner, and recover until params/artifacts/status agree.',
    learning: [
      'A bad run is data — keep it, learn, then apply the winner',
      'apply is not done until params show + repro + status agree',
      'Recovery is a skill: re-apply, re-repro, re-check',
    ],
    fieldNotes: [
      'Never delete a failed run before reading exp show',
      'Post-apply checklist: params → repro → status',
    ],
    startDialog: [
      {
        title: 'First try is wrong on purpose',
        markdown:
          'Run a **bad** hyperparameter first.\n\nThen a better one. Choose with `exp show`.\n\nThen recover to a consistent release state.',
      },
      {
        title: 'Production note',
        markdown: 'Read the evidence before you type. Status first, then act.\n\nIf you cannot explain the step, you are guessing.',
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
      'dvc status',
    ],
  },
  {
    id: 'xfer-5',
    series: 'transfer',
    seriesTitle: 'Transfer',
    name: 'PR review bar: evidence or reject',
    difficulty: 5,
    par: 6,
    hint: 'edit params.yaml lr=0.05; dvc params diff; dvc repro; dvc metrics diff; dvc plots diff',
    objective:
      'Produce the ML PR evidence pack. If metrics did not move, the PR should not merge — say so in the review.',
    learning: [
      'Review bar: params diff + metrics diff + plots diff',
      'No metric movement = do not merge vibes',
      'The PR body is the product of this skill',
    ],
    fieldNotes: [
      'This is the review template your team should adopt',
      'Reject PRs that only change code without evidence',
    ],
    startDialog: [
      {
        title: 'You are the reviewer',
        markdown:
          'Change a hyperparameter.\n\nGather **all three** diffs.\n\nIf effect is missing, this level is not passed by “running commands” alone — the goal is a consistent evidence pack.',
      },
      {
        title: 'Production note',
        markdown: 'Read the evidence before you type. Status first, then act.\n\nIf you cannot explain the step, you are guessing.',
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
    id: 'xfer-6',
    series: 'transfer',
    seriesTitle: 'Transfer',
    name: 'Incident: broken chain repair',
    difficulty: 5,
    par: 6,
    hint: 'cat data/data.xml.dvc; dvc status; dvc fetch; dvc pull; dvc checkout; dvc status',
    objective:
      'Workspace file is gone. Rebuild the chain pointer → cache/remote → workspace and finish with clean status.',
    learning: [
      'Lost file ≠ lost data if remote + pointer exist',
      'fetch vs pull is the repair order',
      'status is the acceptance test after repair',
    ],
    fieldNotes: [
      'This is the 2am runbook',
      'If pointer is missing, escalate — do not improvise',
    ],
    startDialog: [
      {
        title: 'The file is gone',
        markdown: '`data/data.xml` disappeared from disk.\n\n**Repair without panicking.**',
      },
      {
        title: 'Production note',
        markdown: 'Read the evidence before you type. Status first, then act.\n\nIf you cannot explain the step, you are guessing.',
      },
    ],
    startState: (() => {
      const s = trackedRemote();
      s.files['data/data.xml'].present = false;
      s.cache = [];
      return s;
    })(),
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
      'dvc fetch',
      'dvc pull',
      'dvc checkout',
      'dvc status',
    ],
  },
  {
    id: 'xfer-7',
    series: 'transfer',
    seriesTitle: 'Transfer',
    name: 'Lock integrity: receipt never lies',
    difficulty: 5,
    par: 5,
    hint: 'edit params.yaml lr=0.05; dvc status; dvc repro; cat dvc.lock; cat dvc.yaml',
    objective:
      'Force a stale lock, fix it only via repro, then prove yaml and lock tell the same story.',
    learning: [
      'Never hand-edit lock',
      'Stale lock = lying receipt for every future clone',
      'yaml is intent; lock is what actually ran',
    ],
    fieldNotes: [
      'CI should fail if lock is dirty after repro',
      'This is how you keep pipeline history honest',
    ],
    startDialog: [
      {
        title: 'The receipt must be true',
        markdown: 'Change params. See status complain.\n\nFix with `repro`, not with an editor.',
      },
      {
        title: 'Production note',
        markdown: 'Read the evidence before you type. Status first, then act.\n\nIf you cannot explain the step, you are guessing.',
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
      'dvc status',
      'dvc repro',
      'cat dvc.lock',
      'cat dvc.yaml',
    ],
  },
];
