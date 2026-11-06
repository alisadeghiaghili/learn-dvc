import { describe, expect, it } from 'vitest';
import { executeCommand } from '../src/engine/commands';
import { solutionProgress } from '../src/engine/solution';
import { emptyState } from '../src/engine/state';

const SOLUTION = ['edit .dvcignore scratch/*'];

function fresh() {
  const s = emptyState();
  s.initialized = true;
  return s;
}

describe('solution checklist: edit .dvcignore <pattern>', () => {
  it('is not done before anything is ignored', () => {
    expect(solutionProgress(fresh(), SOLUTION)[0]!.done).toBe(false);
  });

  it('is done once the requested pattern is in .dvcignore', () => {
    const s = executeCommand(fresh(), 'edit .dvcignore scratch/*').state;
    expect(s.dvcIgnore).toContain('scratch/*');
    expect(solutionProgress(s, SOLUTION)[0]!.done).toBe(true);
  });

  it('is not done when a different pattern was ignored', () => {
    const s = executeCommand(fresh(), 'edit .dvcignore logs/*').state;
    expect(s.dvcIgnore).toEqual(['logs/*']);
    expect(solutionProgress(s, SOLUTION)[0]!.done).toBe(false);
  });
});
