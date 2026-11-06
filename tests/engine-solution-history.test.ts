import { describe, expect, it } from 'vitest';
import { executeCommand } from '../src/engine/commands';
import { solutionProgress } from '../src/engine/solution';
import { emptyState, makeFile } from '../src/engine/state';
import type { RepoState } from '../src/engine/types';

function project(): RepoState {
  const s = emptyState();
  s.initialized = true;
  s.files['params.yaml'] = makeFile('params.yaml', 'params');
  s.params = { lr: 0.1 };
  return s;
}

function done(state: RepoState, cmd: string): boolean {
  return solutionProgress(state, [cmd])[0]!.done;
}

describe('a less specific command must not credit a more specific solution step', () => {
  it('a bare `git commit` (no message) does not credit `git commit -m "Track data"`', () => {
    const s = project();
    s.commandHistory = ['git commit'];
    expect(done(s, 'git commit -m "Track data"')).toBe(false);
  });

  it('a plain `dvc exp run` does not credit `dvc exp run -S lr=0.5`', () => {
    const s = executeCommand(project(), 'dvc exp run').state;
    expect(s.commandHistory).toContain('dvc exp run');
    expect(done(s, 'dvc exp run -S lr=0.5')).toBe(false);
  });

  it('`dvc exp run -S lr=0.5` still credits itself', () => {
    const s = project();
    s.commandHistory = ['dvc exp run -S lr=0.5'];
    expect(done(s, 'dvc exp run -S lr=0.5')).toBe(true);
  });
});
