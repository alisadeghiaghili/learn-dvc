import { describe, expect, it } from 'vitest';
import { findUnknownFlag, stageCommandStart } from '../src/engine/flags';

describe('findUnknownFlag: argparse-style validation', () => {
  it('accepts the options a command knows and rejects the first unknown one', () => {
    expect(findUnknownFlag('add', ['data/data.xml', '--no-commit'])).toBeNull();
    expect(findUnknownFlag('add', ['--bogus', 'data/data.xml'])).toBe('--bogus');
    expect(findUnknownFlag('add', ['--nope', '--worse'])).toBe('--nope');
  });

  it('accepts the common options on every command', () => {
    for (const flag of ['-h', '--help', '-q', '--quiet', '-v', '--verbose']) {
      expect(findUnknownFlag('push', [flag])).toBeNull();
    }
  });

  it('treats a flag as unknown when it belongs to a different command', () => {
    expect(findUnknownFlag('init', ['--no-scm'])).toBeNull();
    expect(findUnknownFlag('add', ['--no-scm'])).toBe('--no-scm');
    expect(findUnknownFlag('push', ['--to-remote'])).toBe('--to-remote');
  });

  it('lets commands the table does not know through', () => {
    expect(findUnknownFlag('frobnicate', ['--anything'])).toBeNull();
    expect(findUnknownFlag('stage', ['--anything'])).toBeNull();
  });

  it('picks the subcommand table from the first non-option argument', () => {
    expect(findUnknownFlag('remote', ['add', '-d', 'store', '/tmp/s'])).toBeNull();
    expect(findUnknownFlag('remote', ['add', '--bogus'])).toBe('--bogus');
    expect(findUnknownFlag('exp', ['run', '--queue'])).toBeNull();
    expect(findUnknownFlag('exp', ['show', '--queue'])).toBe('--queue');
    expect(findUnknownFlag('metrics', ['diff', '--all'])).toBeNull();
    expect(findUnknownFlag('metrics', ['show', '--all'])).toBe('--all');
  });

  it('falls back to the command table for subcommands without their own entry', () => {
    expect(findUnknownFlag('queue', ['start', '-j', '2'])).toBeNull();
    expect(findUnknownFlag('queue', ['start', '--bogus'])).toBe('--bogus');
  });

  it('lets value options consume the next token, even when it looks like a flag', () => {
    expect(findUnknownFlag('add', ['--file', '--weird-name', 'data'])).toBeNull();
    expect(findUnknownFlag('push', ['-r', 'origin', '--bogus'])).toBe('--bogus');
  });

  it('accepts --option=value for value options and rejects it for unknown options', () => {
    expect(findUnknownFlag('exp', ['run', '--set-param=lr=0.5'])).toBeNull();
    expect(findUnknownFlag('exp', ['run', '--bogus=1'])).toBe('--bogus=1');
  });

  it('ignores negative numbers and a lone dash, and stops checking after --', () => {
    expect(findUnknownFlag('metrics', ['show', '-1'])).toBeNull();
    expect(findUnknownFlag('add', ['-'])).toBeNull();
    expect(findUnknownFlag('add', ['--', '--bogus'])).toBeNull();
    expect(findUnknownFlag('add', ['--bogus', '--', 'x'])).toBe('--bogus');
  });

  it('accepts combined short flags only when every letter is known', () => {
    expect(findUnknownFlag('gc', ['-wc'])).toBeNull();
    expect(findUnknownFlag('gc', ['-wz'])).toBe('-wz');
    expect(findUnknownFlag('exp', ['run', '-fs'])).toBeNull();
  });

  it('accepts a short value option glued to its value', () => {
    expect(findUnknownFlag('exp', ['run', '-Slr=0.5'])).toBeNull();
    expect(findUnknownFlag('exp', ['run', '-Zlr=0.5'])).toBe('-Zlr=0.5');
  });

  it('does not check the shell command that follows `dvc stage add`', () => {
    expect(
      findUnknownFlag('stage', ['add', '-n', 'train', '-d', 'data', 'python', 'train.py', '--epochs', '5']),
    ).toBeNull();
    expect(findUnknownFlag('stage', ['add', '--bogus', '-n', 'train', 'python', 'train.py'])).toBe('--bogus');
    expect(findUnknownFlag('stage', ['add', '-n', 'train', '-o', 'model.pkl'])).toBeNull();
  });
});

describe('stageCommandStart', () => {
  it('returns the index of the first token of the trailing command', () => {
    expect(stageCommandStart(['add', '-n', 'train', 'python', 'train.py'])).toBe(3);
    expect(stageCommandStart(['add', '-n', 'train', '-d', 'data', 'python', 'x.py'])).toBe(5);
    expect(stageCommandStart(['add', '--always-changed', 'make'])).toBe(2);
  });

  it('skips the value of a value option even if it is not a flag', () => {
    expect(stageCommandStart(['add', '-n', 'python', 'python', 'a.py'])).toBe(3);
  });

  it('returns the length when no command follows', () => {
    expect(stageCommandStart(['add', '-n', 'train'])).toBe(3);
    expect(stageCommandStart([])).toBe(0);
  });
});
