import { describe, expect, it } from 'vitest';
import { emptyState, ensureGit } from '../src/engine/state';
import { executeCommand } from '../src/engine/commands';
import { solutionProgress, solutionComplete } from '../src/engine/solution';
import { getLevel } from '../src/levels';

// A directory that is already a Git repository: `dvc init` refuses to run elsewhere.
function gitRepo() {
  const s = emptyState();
  ensureGit(s);
  return s;
}

describe('checklist sticky completion', () => {
  it('keeps dvc init checked after a wrong commit message', () => {
    const level = getLevel('basics-1');
    const solution = level!.solution;
    let state = gitRepo();

    state = executeCommand(state, 'dvc init').state;

    let steps = solutionProgress(state, solution);
    expect(steps.find((s) => s.command.includes('dvc init'))?.done).toBe(true);
    expect(steps.find((s) => s.command.includes('git commit'))?.done).toBe(false);

    // Wrong commit message — still "succeeds" as a git commit, but is not the solution step.
    state = executeCommand(state, 'git commit -m "Wrong"').state;
    steps = solutionProgress(state, solution);
    expect(steps.find((s) => s.command.includes('dvc init'))?.done).toBe(true);
    expect(steps.find((s) => s.command.includes('git commit'))?.done).toBe(false);
    expect(solutionComplete(state, solution)).toBe(false);

    // Real Git has an empty index now; fixing the message is `git commit --amend`.
    const again = executeCommand(state, 'git commit -m "Initialize DVC"');
    expect(again.result.ok).toBe(false);
    state = executeCommand(state, 'git commit --amend -m "Initialize DVC"').state;
    steps = solutionProgress(state, solution);
    expect(solutionComplete(state, solution)).toBe(true);
  });

  it('keeps dvc init checked after a failed commit command', () => {
    const level = getLevel('basics-1');
    const solution = level!.solution;
    let state = gitRepo();
    state = executeCommand(state, 'dvc init').state;
    const before = solutionProgress(state, solution);

    const failed = executeCommand(state, 'git commit');
    expect(failed.result.error).toBeTruthy();
    state = failed.state;

    const after = solutionProgress(state, solution);
    expect(after.find((s) => s.command.includes('dvc init'))?.done).toBe(true);
    expect(before.find((s) => s.command.includes('dvc init'))?.done).toBe(true);
  });
});
