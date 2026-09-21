import { describe, expect, it } from 'vitest';
import { emptyState } from '../src/engine/state';
import { executeCommand } from '../src/engine/commands';
import { solutionComplete, solutionProgress } from '../src/engine/solution';
import { getLevel, allLevels } from '../src/levels';

describe('solution checklist mirrors goals', () => {
  it('basics-1 checklist: init → git add → commit', () => {
    const level = getLevel('basics-1');
    expect(level).toBeTruthy();
    expect(level!.solution).toEqual([
      'dvc init',
      'git add .dvc',
      'git commit -m "Initialize DVC"',
    ]);

    let state = emptyState();
    let steps = solutionProgress(state, level!.solution);
    expect(steps[0].done).toBe(false);
    expect(steps[0].command).toBe('dvc init');
    expect(steps[1].done).toBe(false);
    expect(steps[1].command).toBe('git add .dvc');
    expect(steps[2].done).toBe(false);

    state = executeCommand(state, 'dvc init').state;
    steps = solutionProgress(state, level!.solution);
    expect(steps[0].done).toBe(true);
    expect(steps[1].done).toBe(false);
    expect(steps[2].done).toBe(false);
    expect(solutionComplete(state, level!.solution)).toBe(false);

    state = executeCommand(state, 'git add .dvc').state;
    steps = solutionProgress(state, level!.solution);
    expect(steps[1].done).toBe(true);
    expect(steps[2].done).toBe(false);

    state = executeCommand(state, 'git commit -m "Initialize DVC"').state;
    steps = solutionProgress(state, level!.solution);
    expect(steps.every((s) => s.done)).toBe(true);
    expect(solutionComplete(state, level!.solution)).toBe(true);
  });

  it('every level solution command appears in the checklist UI list', () => {
    for (const level of allLevels) {
      const steps = solutionProgress(level.startState, level.solution);
      expect(steps.map((s) => s.command)).toEqual(level.solution);
    }
  });

  it('level solutions complete their checklists', () => {
    for (const level of allLevels) {
      let state = structuredClone(level.startState);
      let commands = [...level.solution];
      if (level.id === 'exp-3') {
        commands = ['dvc exp run -S lr=0.05'];
      }
      for (const cmd of commands) {
        state = executeCommand(state, cmd).state;
      }
      if (level.id === 'exp-3') {
        const runId = state.experiments[0]?.id;
        if (runId) state = executeCommand(state, `dvc exp apply ${runId}`).state;
      }
      expect(
        solutionComplete(state, level.solution),
        `checklist incomplete for ${level.id}: ${JSON.stringify(solutionProgress(state, level.solution))}`,
      ).toBe(true);
    }
  });
});
