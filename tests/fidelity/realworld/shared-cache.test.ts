import { describe, expect, it } from 'vitest';
import { run, setup } from '../helpers';
import { findLevel, PROD_LEVELS, levelContract, replay } from './level-contract';
import { trackedRepo } from './fixtures';

const DIR = '/mnt/shared/dvc-cache';

// https://doc.dvc.org/command-reference/cache/dir
describe('dvc cache dir', () => {
  it('sets cache.dir and confirms it', () => {
    const { last } = run(trackedRepo(), `dvc cache dir ${DIR}`);
    expect(last.result.ok).toBe(true);
    expect(last.text).toContain(DIR);
    expect(last.text).not.toMatch(/unknown command|usage/i);
  });

  it('with no argument it prints the current cache directory', () => {
    const { last } = run(trackedRepo(), `dvc cache dir ${DIR}`, 'dvc cache dir');
    expect(last.result.ok).toBe(true);
    expect(last.text.trim()).toBe(DIR);
  });

  it('with no argument and nothing configured it prints the default .dvc/cache', () => {
    const { last } = run(trackedRepo(), 'dvc cache dir');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/\.dvc[\\/]cache/);
  });

  it('`cat .dvc/config` shows [cache] with the dir', () => {
    const { last } = run(trackedRepo(), `dvc cache dir ${DIR}`, 'cat .dvc/config');
    expect(last.text).toMatch(/\[cache\]/);
    expect(last.text).toMatch(new RegExp(`dir\\s*=\\s*${DIR}`));
  });

  it('modifies the committed .dvc/config, which `git status` then lists', () => {
    const { last } = run(trackedRepo(), `dvc cache dir ${DIR}`, 'git status');
    expect(last.text).toMatch(/\.dvc\/config/);
  });

  it('--local writes .dvc/config.local instead, so the shared config stays clean', () => {
    const { steps, last } = run(trackedRepo(), `dvc cache dir --local ${DIR}`, 'git status');
    expect(steps[0]!.result.ok).toBe(true);
    expect(last.text).not.toMatch(/\.dvc\/config\b(?!\.local)/);
  });
});

// https://doc.dvc.org/user-guide/how-to/share-a-dvc-cache  and /user-guide/project-structure/configuration#cache
describe('dvc config cache.shared / cache.type', () => {
  it('cache.shared group is accepted and stored', () => {
    const { steps } = run(trackedRepo(), 'dvc config cache.shared group', 'dvc config cache.shared');
    expect(steps[0]!.result.ok).toBe(true);
    expect(steps[1]!.text.trim()).toBe('group');
  });

  it('cache.type symlink,hardlink is accepted and `dvc config cache.type` prints it', () => {
    const { steps } = run(trackedRepo(), 'dvc config cache.type symlink,hardlink', 'dvc config cache.type');
    expect(steps[0]!.result.ok).toBe(true);
    expect(steps[1]!.text.trim()).toBe('symlink,hardlink');
  });

  it('reading an unset option never invents the value "true"', () => {
    const { last } = run(trackedRepo(), 'dvc config cache.type');
    expect(last.text).not.toMatch(/set cache\.type=true/i);
  });

  it('values land in .dvc/config (visible via cat) and make it show up in git status', () => {
    const { steps } = run(
      trackedRepo(),
      'dvc config cache.shared group',
      'dvc config cache.type symlink,hardlink',
      'cat .dvc/config',
      'git status',
    );
    expect(steps[2]!.text).toMatch(/shared\s*=\s*group/);
    expect(steps[2]!.text).toMatch(/type\s*=\s*symlink,hardlink/);
    expect(steps[3]!.text).toMatch(/\.dvc\/config/);
  });

  it('rejects an invalid cache.type value and an invalid cache.shared value', () => {
    expect(run(trackedRepo(), 'dvc config cache.type bogus').last.result.ok).toBe(false);
    expect(run(trackedRepo(), 'dvc config cache.shared everyone').last.result.ok).toBe(false);
  });
});

// https://doc.dvc.org/command-reference/checkout#--relink
describe('dvc checkout --relink', () => {
  it('is accepted and reports relinking', () => {
    const s = setup(trackedRepo(), 'dvc config cache.type symlink,hardlink');
    const { last } = run(s, 'dvc checkout --relink');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/relink/i);
  });
});

describe('prod series: level for a shared team cache', () => {
  const { id, key } = PROD_LEVELS[4]!;
  levelContract(id, key);

  it('after the config steps (before the commit) .dvc/config is changed and shows the shared setup', () => {
    const level = findLevel(id);
    const commitAt = level.solution.findIndex((c) => /^git commit\b/.test(c.trim()));
    expect(commitAt).toBeGreaterThan(0);
    const { state, failures } = replay(level, commitAt);
    expect(failures).toEqual([]);
    const cat = run(state, 'cat .dvc/config', 'git status');
    expect(cat.steps[0]!.text).toMatch(/\[cache\]/);
    expect(cat.steps[0]!.text).toMatch(/shared\s*=\s*group/);
    expect(cat.steps[1]!.text).toMatch(/\.dvc\/config/);
  });

  it('the solution runs a relink (checkout --relink) or dvc add after setting cache.type', () => {
    const sol = findLevel(id).solution.map((c) => c.trim());
    const typeAt = sol.findIndex((c) => /^dvc config cache\.type\b/.test(c));
    expect(typeAt).toBeGreaterThanOrEqual(0);
    expect(sol.slice(typeAt + 1).some((c) => /^dvc checkout --relink\b|^dvc add\b/.test(c))).toBe(true);
  });
});
