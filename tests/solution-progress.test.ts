import { describe, expect, it } from 'vitest';
import {
  flattenGoalChecks,
  goalChecklist,
  solutionComplete,
  solutionProgress,
  suggestFromSolution,
} from '../src/engine/solution';
import { emptyState, makeFile } from '../src/engine/state';
import type { LevelDef, RepoState } from '../src/engine/types';
import { getLevel } from '../src/levels';

function base(): RepoState {
  const s = emptyState();
  s.initialized = true;
  s.files['data/data.xml'] = makeFile('data/data.xml', 'data', { contentId: 'c1' });
  s.files['params.yaml'] = makeFile('params.yaml', 'params');
  s.params = { lr: 0.1 };
  return s;
}

function tracked(s: RepoState, path = 'data/data.xml', md5 = 'm1'): void {
  s.files[path] = makeFile(path, 'data', { tracked: true, pointerMd5: md5, contentId: md5 });
}

function stage(name: string, upToDate: boolean, frozen = false) {
  return { name, deps: [], outs: [], cmd: 'x', params: [], metrics: [], frozen, upToDate };
}

function step(state: RepoState, cmd: string, solution: string[] = [cmd], index = 0) {
  return solutionProgress(state, solution)[index]!;
}

describe('solutionProgress: setup steps', () => {
  it('dvc init is done when the project is initialised', () => {
    expect(step(emptyState(), 'dvc init')).toMatchObject({ done: false, note: 'run `dvc init`' });
    expect(step(base(), 'dvc init')).toMatchObject({ done: true, note: 'DVC project initialized' });
  });

  it('dvc add is done when the named path is tracked', () => {
    const s = base();
    expect(step(s, 'dvc add data/data.xml')).toMatchObject({ done: false, note: 'track `data/data.xml`' });
    tracked(s);
    expect(step(s, 'dvc add data/data.xml')).toMatchObject({ done: true, note: 'tracked data/data.xml' });
  });

  it('dvc add without a path asks for one', () => {
    expect(step(base(), 'dvc add').note).toBe('track `path`');
  });

  it('dvc stage add checks the stage name given with -n', () => {
    const s = base();
    const cmd = 'dvc stage add -n train -d src/train.py python src/train.py';
    expect(step(s, cmd).done).toBe(false);
    s.pipeline.push(stage('train', false));
    expect(step(s, cmd)).toMatchObject({ done: true, note: 'stage train' });
    expect(step(s, 'dvc stage add python x.py').done).toBe(false);
  });

  it('dvc remote add requires the remote, and -d requires it to be the default', () => {
    const s = base();
    expect(step(s, 'dvc remote add -d storage /tmp/s')).toMatchObject({ done: false, note: 'configure remote `storage`' });
    s.remotes.push({ name: 'storage', url: '/tmp/s', isDefault: false });
    expect(step(s, 'dvc remote add -d storage /tmp/s')).toMatchObject({ done: false, note: 'set this remote as default (`-d`)' });
    expect(step(s, 'dvc remote add storage /tmp/s')).toMatchObject({ done: true, note: 'remote storage → /tmp/s' });
    s.remotes[0]!.isDefault = true;
    expect(step(s, 'dvc remote add --default storage /tmp/s').done).toBe(true);
  });

  it('dvc remote modify needs a matching command in history (and config.local for --local)', () => {
    const s = base();
    const cmd = 'dvc remote modify storage url /tmp/other';
    expect(step(s, cmd)).toMatchObject({ done: false, note: 'modify remote' });
    s.commandHistory.push(cmd);
    expect(step(s, cmd)).toMatchObject({ done: true, note: 'remote modified' });

    const local = 'dvc remote modify --local storage password x';
    expect(step(s, local)).toMatchObject({ done: false, note: 'modify remote with --local' });
    s.files['.dvc/config.local'] = makeFile('.dvc/config.local', 'meta');
    expect(step(s, local)).toMatchObject({ done: false, note: 'modify remote' });
    s.commandHistory.push(local);
    expect(step(s, local).done).toBe(true);
  });
});

describe('solutionProgress: git steps', () => {
  it('git add is done while the path is staged', () => {
    const s = base();
    expect(step(s, 'git add data/data.xml.dvc')).toMatchObject({ done: false, note: 'git add data/data.xml.dvc' });
    s.gitStaged.push('data/data.xml.dvc');
    expect(step(s, 'git add data/data.xml.dvc')).toMatchObject({ done: true, note: 'paths staged' });
  });

  it('git add stays done after the commit that swallowed the staged paths', () => {
    const s = base();
    const sol = ['git add data/data.xml.dvc', 'git commit -m "track data"'];
    s.gitCommits.push({
      hash: 'h1', message: 'track data', pointers: {}, pipelineSig: '', params: {}, metrics: {},
      files: ['data/data.xml.dvc'],
    });
    expect(solutionProgress(s, sol)[0]).toMatchObject({ done: true, note: 'staged paths are in Git history' });
  });

  it('git add is not credited when the commit happened without those files', () => {
    const s = base();
    s.gitCommits.push({
      hash: 'h1', message: 'track data', pointers: {}, pipelineSig: '', params: {}, metrics: {},
      files: ['something-else.txt'],
    });
    const sol = ['git add data/data.xml.dvc', 'git commit -m "track data"'];
    expect(solutionProgress(s, sol)[0]!.done).toBe(false);
  });

  it('git commit needs a commit whose message contains the expected text', () => {
    const s = base();
    expect(step(s, 'git commit -m "track data"')).toMatchObject({ done: false, note: 'commit with message containing "track data"' });
    s.gitCommits.push({
      hash: 'abc1234', message: 'track data and more', pointers: {}, pipelineSig: '', params: {}, metrics: {}, files: [],
    });
    expect(step(s, 'git commit -m "track data"')).toMatchObject({ done: true, note: 'committed (abc1234)' });
    expect(step(s, "git commit -m 'track data'").done).toBe(true);
    expect(step(s, 'git commit').done).toBe(false);
  });

  it('git checkout and git merge are done once a matching command succeeded', () => {
    const s = base();
    expect(step(s, 'git checkout v1')).toMatchObject({ done: false, note: 'git checkout v1' });
    s.commandHistory.push('git checkout v1');
    expect(step(s, 'git checkout v1')).toMatchObject({ done: true, note: 'checkout command executed' });
    expect(step(s, 'git checkout v2').done).toBe(false);

    expect(step(s, 'git merge feature')).toMatchObject({ done: false, note: 'run git merge' });
    s.commandHistory.push('git merge feature');
    expect(step(s, 'git merge feature')).toMatchObject({ done: true, note: 'conflict examined' });
  });
});

describe('solutionProgress: data sync steps', () => {
  it('dvc push needs everything tracked to be on the remote', () => {
    const s = base();
    expect(step(s, 'dvc push')).toMatchObject({ done: false, note: 'nothing tracked to push' });
    tracked(s);
    expect(step(s, 'dvc push')).toMatchObject({ done: false, note: 'run `dvc push`' });
    s.remoteObjects.push('m1');
    expect(step(s, 'dvc push')).toMatchObject({ done: true, note: 'objects on remote' });
  });

  it('dvc pull needs the cache and the workspace; dvc fetch only the cache', () => {
    const s = base();
    expect(step(s, 'dvc pull')).toMatchObject({ done: false, note: 'no tracked files' });
    tracked(s);
    s.files['data/data.xml']!.present = false;
    expect(step(s, 'dvc pull')).toMatchObject({ done: false, note: 'run `dvc pull`' });
    expect(step(s, 'dvc fetch')).toMatchObject({ done: false, note: 'run `dvc fetch`' });
    s.cache.push('m1');
    expect(step(s, 'dvc fetch')).toMatchObject({ done: true, note: 'data available locally' });
    expect(step(s, 'dvc pull').done).toBe(false);
    s.files['data/data.xml']!.present = true;
    expect(step(s, 'dvc pull').done).toBe(true);
  });

  it('dvc commit demands tracked data, a clean workspace and a recorded modification', () => {
    const s = base();
    expect(step(s, 'dvc commit')).toMatchObject({ done: false, note: 'track data with `dvc add` first' });
    tracked(s);
    s.files['data/data.xml']!.contentId = 'changed';
    expect(step(s, 'dvc commit')).toMatchObject({ done: false, note: 'run `dvc commit` to sync dirty data' });
    s.files['data/data.xml']!.contentId = 'm1';
    expect(step(s, 'dvc commit')).toMatchObject({ done: false, note: 'modify data, then run `dvc commit`' });
    s.dataVersions['data/data.xml'] = 1;
    expect(step(s, 'dvc commit')).toMatchObject({ done: true, note: 'data pointers committed to cache' });
  });
});

describe('solutionProgress: edit steps', () => {
  it('edit params.yaml key=value compares against the live param', () => {
    const s = base();
    expect(step(s, 'edit params.yaml lr=0.5').done).toBe(false);
    s.params.lr = 0.5;
    expect(step(s, 'edit params.yaml lr=0.5')).toMatchObject({ done: true, note: 'lr=0.5' });
    s.params.mode = 'fast';
    expect(step(s, 'edit params.yaml mode=fast').done).toBe(true);
  });

  it('edit of a data file is done once its content moved away from the pointer', () => {
    const s = base();
    expect(step(s, 'edit data/data.xml').done).toBe(true);
    tracked(s);
    expect(step(s, 'edit data/data.xml').done).toBe(false);
    s.files['data/data.xml']!.contentId = 'new';
    expect(step(s, 'edit data/data.xml')).toMatchObject({ done: true, note: 'modified data/data.xml' });
  });

  it('edit without a path or for a missing file fails with a pointer to the problem', () => {
    const s = base();
    expect(step(s, 'edit')).toMatchObject({ done: false, note: 'edit' });
    expect(step(s, 'edit ghost.txt')).toMatchObject({ done: false, note: 'file ghost.txt missing' });
  });

  it('an earlier probe edit of a param stays checked when a later step rewrites the same key', () => {
    const s = base();
    const sol = ['edit params.yaml lr=0.5', 'edit params.yaml lr=0.1'];
    s.commandHistory.push('edit params.yaml lr=0.5');
    expect(solutionProgress(s, sol)[0]).toMatchObject({ done: true, note: 'ran (probe/round-trip step)' });
    expect(solutionProgress(s, sol)[1]).toMatchObject({ done: true });
  });
});

describe('solutionProgress: pipeline and experiment steps', () => {
  it('dvc repro needs a pipeline and every stage up to date', () => {
    const s = base();
    expect(step(s, 'dvc repro')).toMatchObject({ done: false, note: 'define a stage first' });
    s.pipeline.push(stage('a', false));
    expect(step(s, 'dvc repro')).toMatchObject({ done: false, note: 'run `dvc repro`' });
    s.pipeline[0]!.upToDate = true;
    expect(step(s, 'dvc repro')).toMatchObject({ done: true, note: 'pipeline up to date' });
  });

  it('dvc exp run without params counts any experiment, with -S requires that param recorded', () => {
    const s = base();
    expect(step(s, 'dvc exp run').done).toBe(false);
    s.experiments.push({ id: 'e1', commitRef: 'h', params: { lr: 0.05 }, metrics: {} });
    expect(step(s, 'dvc exp run')).toMatchObject({ done: true, note: '1 exp(s)' });
    expect(step(s, 'dvc exp run -S lr=0.05')).toMatchObject({ done: true, note: 'sweep recorded' });
    expect(step(s, 'dvc exp run -S lr=0.9').done).toBe(false);
    expect(step(s, 'dvc exp run --set-param lr=0.05').done).toBe(true);
  });

  it('dvc exp run --queue reports the queued count', () => {
    const s = base();
    const cmd = 'dvc exp run --queue -S lr=0.2';
    expect(step(s, cmd).done).toBe(false);
    s.expQueue.push({ id: 'q1', params: { lr: 0.2 } });
    expect(step(s, cmd)).toMatchObject({ done: true, note: '1 queued' });
  });

  it('dvc exp apply is done when the workspace params match the applied experiment', () => {
    const s = base();
    s.experiments.push({ id: 'e1', commitRef: 'h', params: { lr: 0.3 }, metrics: {} });
    expect(step(s, 'dvc exp apply e1').done).toBe(false);
    s.lastAppliedExpId = 'e1';
    expect(step(s, 'dvc exp apply e1').done).toBe(false);
    s.params.lr = 0.3;
    expect(step(s, 'dvc exp apply e1')).toMatchObject({ done: true, note: 'applied e1' });
    s.lastAppliedExpId = 'gone';
    expect(step(s, 'dvc exp apply e1').done).toBe(false);
  });

  it('freeze and unfreeze compare the stage flag', () => {
    const s = base();
    s.pipeline.push(stage('a', true));
    expect(step(s, 'dvc freeze a').done).toBe(false);
    expect(step(s, 'dvc unfreeze a')).toMatchObject({ done: true, note: 'stage a unfrozen' });
    s.pipeline[0]!.frozen = true;
    expect(step(s, 'dvc freeze a')).toMatchObject({ done: true, note: 'stage a frozen' });
    expect(step(s, 'dvc freeze nope').done).toBe(false);
  });

  it('dvc dag needs at least one stage', () => {
    const s = base();
    expect(step(s, 'dvc dag').done).toBe(false);
    s.pipeline.push(stage('a', true));
    expect(step(s, 'dvc dag')).toMatchObject({ done: true, note: 'pipeline exists' });
  });

  it('dvc queue start is done when the queue drained into experiments', () => {
    const s = base();
    expect(step(s, 'dvc queue start').done).toBe(false);
    s.experiments.push({ id: 'e1', commitRef: 'h', params: {}, metrics: {} });
    expect(step(s, 'dvc queue start')).toMatchObject({ done: true, note: 'queue drained' });
    s.expQueue.push({ id: 'q', params: {} });
    expect(step(s, 'dvc queue start').done).toBe(false);
  });

  it('dvc update is done after the command ran or the import data version advanced', () => {
    const s = base();
    expect(step(s, 'dvc update data/data.xml.dvc').done).toBe(false);
    s.dataVersions['data/data.xml'] = 1;
    expect(step(s, 'dvc update data/data.xml.dvc')).toMatchObject({ done: true, note: 'import updated' });
    s.dataVersions['data/data.xml'] = 0;
    s.commandHistory.push('dvc update data/data.xml.dvc');
    expect(step(s, 'dvc update data/data.xml.dvc')).toMatchObject({ done: true, note: 'ran' });
  });
});

describe('solutionProgress: inspection steps never block completion', () => {
  it.each([
    ['dvc diff', 'inspect drift (does not block completion)'],
    ['dvc plots show', 'inspect plots (does not block completion)'],
    ['dvc status', 'inspect status (does not block completion)'],
    ['dvc metrics show', 'inspect output (does not block completion)'],
    ['dvc params show', 'inspect output (does not block completion)'],
    ['dvc exp show', 'inspect output (does not block completion)'],
  ])('%s is optional', (cmd, note) => {
    expect(step(base(), cmd)).toMatchObject({ done: true, optional: true, note });
  });

  it('solutionComplete ignores optional steps but not unfinished ones', () => {
    expect(solutionComplete(base(), ['dvc status', 'dvc init'])).toBe(true);
    expect(solutionComplete(emptyState(), ['dvc status', 'dvc init'])).toBe(false);
  });

  it('an unknown command can only be satisfied by having been run', () => {
    const s = base();
    expect(step(s, 'cml comment create report.md')).toMatchObject({ done: false, note: 'cml comment create report.md' });
    s.commandHistory.push('cml comment create report.md');
    expect(step(s, 'cml comment create report.md')).toMatchObject({ done: true, note: 'already completed earlier' });
  });
});

describe('solutionProgress: history stickiness', () => {
  it('dvc add that ran earlier is unchecked when the path is no longer tracked', () => {
    const s = base();
    s.commandHistory.push('dvc add data/data.xml');
    expect(step(s, 'dvc add data/data.xml').done).toBe(false);
  });

  it('dvc repro that ran earlier is unchecked when a stage became stale again', () => {
    const s = base();
    s.pipeline.push(stage('a', false));
    s.commandHistory.push('dvc repro');
    expect(step(s, 'dvc repro').done).toBe(false);
  });

  it('dvc push that ran earlier is unchecked when new data is not on the remote', () => {
    const s = base();
    tracked(s);
    s.commandHistory.push('dvc push');
    expect(step(s, 'dvc push').done).toBe(false);
    s.remoteObjects.push('m1');
    expect(step(s, 'dvc push').done).toBe(true);
  });

  it('dvc pull history is contradicted by missing cache objects', () => {
    const s = base();
    tracked(s);
    s.commandHistory.push('dvc pull');
    expect(step(s, 'dvc pull').done).toBe(false);
    s.cache.push('m1');
    expect(step(s, 'dvc pull').done).toBe(true);
  });

  it('dvc exp apply history is contradicted when params drifted from the applied experiment', () => {
    const s = base();
    s.experiments.push({ id: 'e1', commitRef: 'h', params: { lr: 0.3 }, metrics: {} });
    s.commandHistory.push('dvc exp apply e1');
    s.lastAppliedExpId = 'e1';
    s.params.lr = 0.9;
    expect(step(s, 'dvc exp apply e1').done).toBe(false);
  });

  it('edit history of a tracked file is contradicted once the edit was reverted', () => {
    const s = base();
    tracked(s);
    s.commandHistory.push('edit data/data.xml');
    expect(step(s, 'edit data/data.xml').done).toBe(false);
    s.dataVersions['data/data.xml'] = 1;
    expect(step(s, 'edit data/data.xml').done).toBe(true);
  });

  it('dvc commit history is contradicted by dirty files', () => {
    const s = base();
    tracked(s);
    s.files['data/data.xml']!.contentId = 'changed';
    s.commandHistory.push('dvc commit');
    expect(step(s, 'dvc commit').done).toBe(false);
  });

  it('param edit history is contradicted when the param moved on', () => {
    const s = base();
    s.commandHistory.push('edit params.yaml lr=0.5');
    expect(step(s, 'edit params.yaml lr=0.5').done).toBe(false);
  });
});

describe('level helpers', () => {
  it('goalChecklist is the solution progress of the level', () => {
    const level = getLevel('basics-1') as LevelDef;
    const state = structuredClone(level.startState);
    expect(goalChecklist(state, level)).toEqual(solutionProgress(state, level.solution));
  });

  it('suggestFromSolution returns the first unfinished command, null when done or without a level', () => {
    const level = getLevel('basics-1') as LevelDef;
    const state = structuredClone(level.startState);
    expect(suggestFromSolution(state, level)).toBe('dvc init');
    expect(suggestFromSolution(state, null)).toBeNull();
    state.initialized = true;
    expect(suggestFromSolution(state, level)).toBe('git commit -m "Initialize DVC"');
    state.gitCommits.push({
      hash: 'x', message: 'Initialize DVC', pointers: {}, pipelineSig: '', params: {}, metrics: {}, files: [],
    });
    expect(suggestFromSolution(state, level)).toBeNull();
  });

  it('flattenGoalChecks unwraps the top-level allOf and wraps single goals', () => {
    const a = { kind: 'notDirty' } as const;
    const b = { kind: 'hooksInstalled' } as const;
    expect(flattenGoalChecks({ kind: 'allOf', checks: [a, b] })).toEqual([a, b]);
    expect(flattenGoalChecks(a)).toEqual([a]);
  });
});
