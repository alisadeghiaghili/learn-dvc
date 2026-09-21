import { describe, expect, it } from 'vitest';
import { emptyState } from '../src/engine/state';
import { executeCommand } from '../src/engine/commands';
import { solutionComplete, solutionProgress } from '../src/engine/solution';
import { getLevel } from '../src/levels';

function run(state = emptyState(), cmds: string[]) {
  let s = state;
  for (const c of cmds) s = executeCommand(s, c).state;
  return s;
}

function doneFor(state: ReturnType<typeof run>, levelId: string, includes: string) {
  const level = getLevel(levelId)!;
  return solutionProgress(state, level.solution).find((s) => s.command.includes(includes))?.done;
}

describe('sticky checklist across all level packs', () => {
  it('basics-2: wrong git message does not uncheck dvc add', () => {
    const level = getLevel('basics-2')!;
    let s = structuredClone(level.startState);
    s = executeCommand(s, 'dvc add data/data.xml').state;
    s = executeCommand(s, 'git add data/data.xml.dvc data/.gitignore').state;
    expect(doneFor(s, 'basics-2', 'dvc add')).toBe(true);
    expect(doneFor(s, 'basics-2', 'git add')).toBe(true);

    s = executeCommand(s, 'git commit -m "nope"').state;
    expect(doneFor(s, 'basics-2', 'dvc add')).toBe(true);
    expect(doneFor(s, 'basics-2', 'git add')).toBe(true);
    expect(doneFor(s, 'basics-2', 'git commit')).toBe(false);

    s = executeCommand(s, 'git commit -m "Add raw data"').state;
    expect(solutionComplete(s, level.solution)).toBe(true);
  });

  it('basics-3: dvc commit stays after a bad git commit retry', () => {
    const level = getLevel('basics-3')!;
    let s = structuredClone(level.startState);
    for (const c of ['edit data/data.xml', 'dvc commit', 'git add data/data.xml.dvc']) {
      s = executeCommand(s, c).state;
    }
    expect(doneFor(s, 'basics-3', 'edit')).toBe(true);
    expect(doneFor(s, 'basics-3', 'dvc commit')).toBe(true);

    s = executeCommand(s, 'git commit').state; // failed: maybe ok if restaged
    s = executeCommand(s, 'git commit -m "oops"').state;
    expect(doneFor(s, 'basics-3', 'edit')).toBe(true);
    expect(doneFor(s, 'basics-3', 'dvc commit')).toBe(true);
    expect(doneFor(s, 'basics-3', 'git add')).toBe(true);

    s = executeCommand(s, 'git commit -m "Dataset updates"').state;
    expect(solutionComplete(s, level.solution)).toBe(true);
  });

  it('remote-2: push stays checked after noise command', () => {
    const level = getLevel('remote-2')!;
    let s = structuredClone(level.startState);
    s = executeCommand(s, 'dvc remote add -d myremote /tmp/dvcstore').state;
    s = executeCommand(s, 'dvc push').state;
    expect(doneFor(s, 'remote-2', 'remote add')).toBe(true);
    expect(doneFor(s, 'remote-2', 'dvc push')).toBe(true);

    s = executeCommand(s, 'git commit -m "noise"').state;
    expect(doneFor(s, 'remote-2', 'remote add')).toBe(true);
    expect(doneFor(s, 'remote-2', 'dvc push')).toBe(true);
    expect(solutionComplete(s, level.solution)).toBe(true);
  });

  it('pipe-2: stage add stays checked after failed repro attempt', () => {
    const level = getLevel('pipe-2')!;
    let s = structuredClone(level.startState);
    const prepare = 'dvc stage add -n prepare -d data/data.xml -d src/prepare.py -o data/prepared.csv python src/prepare.py';
    const train = 'dvc stage add -n train -d data/prepared.csv -d src/train.py -p lr -p n_estimators -o model.pkl -m metrics.json python src/train.py';
    s = executeCommand(s, prepare).state;
    s = executeCommand(s, train).state;
    expect(doneFor(s, 'pipe-2', 'stage add -n prepare')).toBe(true);
    expect(doneFor(s, 'pipe-2', 'stage add -n train')).toBe(true);
    expect(doneFor(s, 'pipe-2', 'dvc repro')).toBe(false);

    s = executeCommand(s, 'git commit -m "noise"').state;
    expect(doneFor(s, 'pipe-2', 'stage add -n prepare')).toBe(true);
    expect(doneFor(s, 'pipe-2', 'stage add -n train')).toBe(true);

    s = executeCommand(s, 'dvc repro').state;
    expect(solutionComplete(s, level.solution)).toBe(true);
  });

  it('pipe-3: edit step unchecks if params drift away again', () => {
    const level = getLevel('pipe-3')!;
    let s = structuredClone(level.startState);
    s = executeCommand(s, 'edit params.yaml lr=0.05').state;
    expect(doneFor(s, 'pipe-3', 'edit params.yaml')).toBe(true);
    s = executeCommand(s, 'edit params.yaml lr=0.5').state;
    expect(doneFor(s, 'pipe-3', 'edit params.yaml')).toBe(false);
  });

  it('exp-2: both sweeps stay recorded after noise', () => {
    const level = getLevel('exp-2')!;
    let s = structuredClone(level.startState);
    s = executeCommand(s, 'dvc exp run -S lr=0.05').state;
    s = executeCommand(s, 'dvc exp run -S lr=0.2').state;
    expect(doneFor(s, 'exp-2', 'lr=0.05')).toBe(true);
    expect(doneFor(s, 'exp-2', 'lr=0.2')).toBe(true);
    s = executeCommand(s, 'git log').state;
    expect(solutionComplete(s, level.solution)).toBe(true);
  });

  it('exp-3: apply stays checked after noise commit', () => {
    const level = getLevel('exp-3')!;
    let s = structuredClone(level.startState);
    s = executeCommand(s, 'dvc exp run -S lr=0.05').state;
    const expId = s.experiments[0]!.id;
    s = executeCommand(s, `dvc exp apply ${expId}`).state;
    expect(doneFor(s, 'exp-3', 'exp apply')).toBe(true);
    s = executeCommand(s, 'git commit -m "noise"').state;
    expect(doneFor(s, 'exp-3', 'exp apply')).toBe(true);
    expect(solutionComplete(s, level.solution)).toBe(true);
  });
});
