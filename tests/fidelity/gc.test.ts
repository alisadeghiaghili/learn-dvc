import { describe, expect, it } from 'vitest';
import { evaluateGoal } from '../../src/engine/compare';
import { fakeMd5 } from '../../src/engine/hash';
import { getLevel } from '../../src/levels';
import { run, setup, solutionOf, startOf } from './helpers';

const ORPHAN = fakeMd5('orphan-object-referenced-by-nothing');

/**
 * Two-version repo: v0 tracked + committed (cache-1 start, also on the remote),
 * then data edited, `dvc add`ed, committed as v1 and pushed.
 * HEAD references only v1; v0 is referenced only by an OLDER commit.
 */
function twoVersionRepo() {
  const s0 = startOf('cache-1');
  const v0 = s0.files['data/data.xml']!.pointerMd5!;
  const s = setup(
    s0,
    'edit data/data.xml',
    'dvc add data/data.xml',
    'git add data/data.xml.dvc data/.gitignore',
    'git commit -m "data v1"',
    'dvc push',
  );
  const v1 = s.files['data/data.xml']!.pointerMd5!;
  if (v1 === v0) throw new Error('fixture: v1 must differ from v0');
  if (!s.cache.includes(v0) || !s.cache.includes(v1)) throw new Error('fixture: cache must hold v0 and v1');
  if (!s.remoteObjects.includes(v0) || !s.remoteObjects.includes(v1)) throw new Error('fixture: remote must hold v0 and v1');
  return { s, v0, v1 };
}

// https://doc.dvc.org/command-reference/gc
describe('dvc gc scope flags', () => {
  it('dvc gc without a scope flag is a no-op and tells the user to pass -w/-a/-T/-A', () => {
    const { s } = twoVersionRepo();
    s.cache.push(ORPHAN); // something a naive gc would happily delete
    const { state, last } = run(s, 'dvc gc');
    expect(state.cache).toEqual(s.cache);
    expect(last.text).toMatch(/-w|--workspace|scope/i);
  });

  it('dvc gc -w keeps only the workspace version: v0 (referenced only by an older commit) is removed, v1 kept', () => {
    const { s, v0, v1 } = twoVersionRepo();
    const { state, last } = run(s, 'dvc gc -w');
    expect(last.result.ok).toBe(true);
    expect(state.cache).not.toContain(v0);
    expect(state.cache).toContain(v1);
  });

  it('(regression) dvc gc -A / --all-commits keeps objects referenced by any commit (v0 and v1)', () => {
    const { s, v0, v1 } = twoVersionRepo();
    for (const cmd of ['dvc gc -A', 'dvc gc --all-commits']) {
      const { state } = run(s, cmd);
      expect(state.cache, cmd).toEqual(expect.arrayContaining([v0, v1]));
    }
  });
});

// https://doc.dvc.org/command-reference/gc#-c  (--cloud also cleans remote storage)
describe('dvc gc and remote storage', () => {
  it('(regression) dvc gc -w never touches remote storage', () => {
    const { s, v0, v1 } = twoVersionRepo();
    const { state } = run(s, 'dvc gc -w');
    expect(state.remoteObjects).toEqual(expect.arrayContaining([v0, v1]));
  });

  it('dvc gc -w -c also removes v0 from the remote but keeps v1', () => {
    const { s, v0, v1 } = twoVersionRepo();
    const { state } = run(s, 'dvc gc -w -c');
    expect(state.remoteObjects).not.toContain(v0);
    expect(state.remoteObjects).toContain(v1);
  });
});

// Curriculum guard: cache-1 teaches gc, so its goal must actually need it.
describe('cache-1 level requires garbage collection', () => {
  it('goal is not already satisfied at the start state', () => {
    const level = getLevel('cache-1')!;
    expect(evaluateGoal(startOf('cache-1'), level.goal).solved).toBe(false);
  });

  it('goal is NOT solved by the solution with the gc step removed (old object must be gone)', () => {
    const level = getLevel('cache-1')!;
    const withoutGc = solutionOf('cache-1').filter((c) => !/^dvc gc\b/.test(c.trim()));
    const { state } = run(startOf('cache-1'), ...withoutGc);
    expect(evaluateGoal(state, level.goal).solved).toBe(false);
  });

  it('solution uses a gc scope flag (bare `dvc gc` is not a valid cleanup)', () => {
    expect(solutionOf('cache-1').some((c) => /^dvc gc\s+.*(-w|-A|-a|-T|--workspace|--all-)/.test(c))).toBe(true);
  });
});
