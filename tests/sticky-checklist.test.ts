import { describe, expect, it } from 'vitest';
import { emptyState } from '../src/engine/state';
import { executeCommand } from '../src/engine/commands';
import { solutionProgress, solutionComplete } from '../src/engine/solution';
import { getLevel } from '../src/levels';

describe('checklist sticky completion', () => {
  it('keeps git add checked after a wrong commit message', () => {
    const level = getLevel('basics-1');
    const solution = level!.solution;
    let state = emptyState();

    state = executeCommand(state, 'dvc init').state;
    state = executeCommand(state, 'git add .dvc').state;

    let steps = solutionProgress(state, solution);
    expect(steps.find((s) => s.command.includes('git add'))?.done).toBe(true);
    expect(steps.find((s) => s.command.includes('git commit'))?.done).toBe(false);

    // Wrong commit message — still "succeeds" as a git commit, but is not the solution step.
    state = executeCommand(state, 'git commit -m "Wrong"').state;
    steps = solutionProgress(state, solution);
    expect(steps.find((s) => s.command.includes('dvc init'))?.done).toBe(true);
    expect(steps.find((s) => s.command.includes('git add'))?.done).toBe(true);
    expect(steps.find((s) => s.command.includes('git commit'))?.done).toBe(false);
    expect(solutionComplete(state, solution)).toBe(false);

    // Correct commit finishes the level without redoing git add.
    state = executeCommand(state, 'git commit -m "Initialize DVC"').state;
    steps = solutionProgress(state, solution);
    expect(steps.find((s) => s.command.includes('git add'))?.done).toBe(true);
    expect(solutionComplete(state, solution)).toBe(true);
  });

  it('keeps git add checked after a failed commit command', () => {
    const level = getLevel('basics-1');
    const solution = level!.solution;
    let state = emptyState();
    state = executeCommand(state, 'dvc init').state;
    state = executeCommand(state, 'git add .dvc').state;
    const before = solutionProgress(state, solution);

    const failed = executeCommand(state, 'git commit');
    expect(failed.result.error).toBeTruthy();
    state = failed.state;

    const after = solutionProgress(state, solution);
    expect(after.find((s) => s.command.includes('git add'))?.done).toBe(true);
    expect(before.find((s) => s.command.includes('git add'))?.done).toBe(true);
  });
});
