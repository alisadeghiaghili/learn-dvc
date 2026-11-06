import { describe, expect, it } from 'vitest';
import { emptyState, ensureGit } from '../../src/engine/state';
import { run } from './helpers';

// emptyState() has no commits => Git repo not initialised; ensureGit() models `git init`.
function gitRepo() {
  const s = emptyState();
  ensureGit(s);
  return s;
}

// https://doc.dvc.org/command-reference/init
describe('dvc init requires Git unless --no-scm', () => {
  it('dvc init outside a Git repo fails and mentions "not inside of a git repo" / --no-scm', () => {
    const { last, state } = run(emptyState(), 'dvc init');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/not inside of a git repo|--no-scm/i);
    expect(state.initialized).toBe(false);
  });

  it('(regression) dvc init --no-scm outside a Git repo succeeds', () => {
    const { last, state } = run(emptyState(), 'dvc init --no-scm');
    expect(last.result.ok).toBe(true);
    expect(state.initialized).toBe(true);
  });
});

// https://doc.dvc.org/command-reference/init  ("... and stages .dvc/config, .dvc/.gitignore, .dvcignore")
describe('dvc init inside a Git repo auto-stages its metadata', () => {
  it('stages .dvc/config and .dvc/.gitignore with git (no manual `git add .dvc` needed)', () => {
    const { state } = run(gitRepo(), 'dvc init');
    expect(state.gitStaged).toContain('.dvc/config');
    expect(state.gitStaged).toContain('.dvc/.gitignore');
  });

  it('creates and stages .dvcignore', () => {
    const { state } = run(gitRepo(), 'dvc init');
    expect(state.files['.dvcignore']?.present).toBe(true);
    expect(state.gitStaged).toContain('.dvcignore');
  });
});

describe('dvc init is not repeatable', () => {
  it('(regression) running dvc init twice fails the second time with "already"', () => {
    const { steps } = run(gitRepo(), 'dvc init', 'dvc init');
    expect(steps[0]!.result.ok).toBe(true);
    expect(steps[1]!.result.ok).toBe(false);
    expect(steps[1]!.text).toMatch(/already/i);
  });
});
