import { describe, expect, it } from 'vitest';
import { emptyState, sandboxState } from '../src/engine/state';
import { run } from './fidelity/helpers';

// https://doc.dvc.org/command-reference/remote/default
describe('dvc remote with a missing <name>', () => {
  it('`dvc remote default` without a name prints the current default remote', () => {
    const { last, state } = run(sandboxState(), 'dvc remote default');
    expect(last.result.ok).toBe(true);
    expect(last.text).toBe('myremote');
    expect(last.text).not.toMatch(/undefined/);
    expect(state.remotes.map((r) => r.name)).toEqual(['myremote']);
  });

  it('`dvc remote default` with no default remote configured fails and says how to set one', () => {
    const s = sandboxState();
    s.remotes = [];
    const { last } = run(s, 'dvc remote default');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/no default remote set/);
  });

  // https://doc.dvc.org/command-reference/remote/remove
  it('`dvc remote remove` without a name prints usage, not "remote \'undefined\'"', () => {
    const { last, state } = run(sandboxState(), 'dvc remote remove');
    expect(last.result.ok).toBe(false);
    expect(last.text).not.toMatch(/undefined/);
    expect(last.text).toMatch(/Usage: dvc remote remove/);
    expect(state.remotes).toHaveLength(1);
  });

  // https://doc.dvc.org/command-reference/remote/modify
  it('`dvc remote modify` without a name prints usage, not "remote \'undefined\'"', () => {
    const { last } = run(sandboxState(), 'dvc remote modify');
    expect(last.result.ok).toBe(false);
    expect(last.text).not.toMatch(/undefined/);
    expect(last.text).toMatch(/Usage: dvc remote modify/);
  });
});

describe('bare `git`', () => {
  it('prints usage instead of "git: \'undefined\' is not supported"', () => {
    const { last } = run(emptyState(), 'git');
    expect(last.result.ok).toBe(false);
    expect(last.text).not.toMatch(/undefined/);
    expect(last.text).toMatch(/^usage: git /);
  });
});
