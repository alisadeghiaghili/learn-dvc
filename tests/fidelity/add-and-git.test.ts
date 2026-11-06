import { describe, expect, it } from 'vitest';
import { allLevels } from '../../src/levels';
import { run, setup, solutionOf, startOf } from './helpers';

// https://doc.dvc.org/command-reference/add  (dvc add gitignores the data file)
describe('git add on DVC-tracked data behaves like real Git', () => {
  it('after dvc add, `git add data/data.xml` fails with Git "ignored by one of your .gitignore files"', () => {
    const s = setup(startOf('basics-2'), 'dvc add data/data.xml');
    const { last, state } = run(s, 'git add data/data.xml');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/ignored by one of your \.gitignore/i);
    expect(last.text).not.toMatch(/did not match/i);
    expect(state.gitStaged).not.toContain('data/data.xml');
  });

  it('(regression) before dvc add, `git add data/data.xml` is allowed (real Git has no objection)', () => {
    const { last, state } = run(startOf('basics-2'), 'git add data/data.xml');
    expect(last.result.ok).toBe(true);
    expect(state.gitStaged).toContain('data/data.xml');
  });

  it('(pedagogy expectation) before dvc add, `git add data/data.xml` still works but warns about large data / `dvc add`', () => {
    const { last } = run(startOf('basics-2'), 'git add data/data.xml');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/large|dvc add/i);
  });

  it('`git add .` stages data/data.xml.dvc and data/.gitignore after dvc add, but not the ignored data file', () => {
    const s = setup(startOf('basics-2'), 'dvc add data/data.xml');
    const { last, state } = run(s, 'git add .');
    expect(last.result.ok).toBe(true);
    expect(state.gitStaged).toContain('data/data.xml.dvc');
    expect(state.gitStaged).toContain('data/.gitignore');
    expect(state.gitStaged).not.toContain('data/data.xml');
  });
});

// https://git-scm.com/docs/git-commit  ("nothing to commit")
describe('git commit with an empty index', () => {
  it('fails with "nothing to commit" and creates no commit', () => {
    const before = startOf('basics-2');
    const { last, state } = run(before, 'git commit -m x');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/nothing to commit/i);
    expect(state.gitCommits.length).toBe(before.gitCommits.length);
  });
});

// https://doc.dvc.org/command-reference/add  (re-run dvc add on a modified tracked file)
describe('updating an already-tracked dataset', () => {
  it('(regression) edit + `dvc add` re-pins the pointer, cleans the file and caches the new md5', () => {
    const { state } = run(startOf('basics-3'), 'edit data/data.xml', 'dvc add data/data.xml');
    const f = state.files['data/data.xml']!;
    expect(f.dirty).toBeFalsy();
    expect(f.pointerMd5).toBe(f.contentId);
    expect(state.cache).toContain(f.contentId);
  });
});

// Curriculum guards: teach `dvc add` (not `add` + redundant `commit`) for new data.
describe('level solutions do not teach a redundant `dvc add` + `dvc commit`', () => {
  it('no solution has `dvc add X` immediately followed by `dvc commit` (dvc add already commits to cache)', () => {
    const offenders = allLevels.flatMap((l) =>
      l.solution.flatMap((c, i) =>
        /^dvc add\b/.test(c.trim()) && /^dvc commit\b/.test((l.solution[i + 1] ?? '').trim())
          ? [`${l.id}: "${c}" -> "${l.solution[i + 1]}"`]
          : [],
      ),
    );
    expect(offenders).toEqual([]);
  });

  it('basics-3 accepts new data with `dvc add data/data.xml`, not `dvc commit`', () => {
    const sol = solutionOf('basics-3');
    expect(sol).toContain('dvc add data/data.xml');
    expect(sol.some((c) => /^dvc commit\b/.test(c.trim()))).toBe(false);
  });
});
