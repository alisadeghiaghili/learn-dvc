import { describe, expect, it } from 'vitest';
import { getLevel } from '../../src/levels';
import { run, setup, solutionOf, startOf } from './helpers';

// https://doc.dvc.org/command-reference/update
describe('dvc update only applies to import / import-url .dvc files', () => {
  it('dvc update on a file that was only `dvc add`ed fails ("not an import") and leaves the pointer alone', () => {
    const s = setup(startOf('basics-2'), 'dvc add data/data.xml');
    const before = s.files['data/data.xml']!.pointerMd5;
    const { last, state } = run(s, 'dvc update data/data.xml.dvc');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/not an import|import/i);
    expect(state.files['data/data.xml']!.pointerMd5).toBe(before);
  });

  it('(regression) dvc update on a real `dvc import` target succeeds and re-pins the pointer', () => {
    const s = setup(startOf('reg-3'), 'dvc import /tmp/registry data/external.csv');
    const before = s.files['data/external.csv']!.pointerMd5;
    expect(before).toBeTruthy();
    const { last, state } = run(s, 'dvc update data/external.csv.dvc');
    expect(last.result.ok).toBe(true);
    expect(state.files['data/external.csv']!.pointerMd5).not.toBe(before);
  });
});

// Curriculum guards
describe('levels that teach dvc update', () => {
  const updateTargets = (sol: string[]) =>
    sol.flatMap((c, i) => {
      const m = /^dvc update\s+(\S+)/.exec(c.trim());
      return m ? [{ i, target: m[1]!.replace(/\.dvc$/, '') }] : [];
    });
  const importedBefore = (sol: string[], i: number, target: string) =>
    sol.slice(0, i).some((c) => {
      const t = c.trim().split(/\s+/);
      return t[0] === 'dvc' && (t[1] === 'import' || t[1] === 'import-url') && (t[3] === target || t.includes(target));
    });

  it('camp-5 solution never runs `dvc update` on a target that was not imported earlier in the solution', () => {
    const sol = solutionOf('camp-5');
    const bad = updateTargets(sol).filter(({ i, target }) => !importedBefore(sol, i, target));
    expect(bad).toEqual([]);
  });

  it('reg-3 ("import then update") solution contains a `dvc update` step', () => {
    const level = getLevel('reg-3')!;
    expect(level.name).toMatch(/update/i);
    expect(level.solution.some((c) => /^dvc update\b/.test(c.trim()))).toBe(true);
  });
});
