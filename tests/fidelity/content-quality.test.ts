import { describe, expect, it } from 'vitest';
import { allLevels } from '../../src/levels';
import { run, startOf, textOf } from './helpers';
import { executeCommand } from '../../src/engine/commands';

// Curriculum hygiene: https://doc.dvc.org/start (each lesson should say something different)
describe('start dialogs are not copy-pasted', () => {
  it('no startDialog slide markdown appears in more than 2 levels', () => {
    const seen = new Map<string, Set<string>>();
    for (const l of allLevels) {
      for (const slide of l.startDialog) {
        const key = slide.markdown.trim();
        if (!key) continue;
        if (!seen.has(key)) seen.set(key, new Set());
        seen.get(key)!.add(l.id);
      }
    }
    const offenders = [...seen.entries()]
      .filter(([, ids]) => ids.size > 2)
      .map(([md, ids]) => `${ids.size}x "${md.slice(0, 50).replace(/\s+/g, ' ')}..."`);
    expect(offenders).toEqual([]);
  });
});

// https://doc.dvc.org/command-reference/update and /import
describe('level names promise commands the solution actually uses', () => {
  it.each(allLevels.map((l) => [l.id, l.name, l.solution] as const))(
    '%s ("%s"): name keywords import/update appear in the solution',
    (_id, name, solution) => {
      const has = (re: RegExp) => solution.some((c) => re.test(c.trim()));
      if (/update/i.test(name)) expect(has(/^dvc update\b/), 'name mentions update').toBe(true);
      if (/\bimport\b/i.test(name)) expect(has(/^dvc import\b/), 'name mentions import').toBe(true);
    },
  );
});

describe('every level solution replays without a failing step', () => {
  it.each(allLevels.map((l) => [l.id, l.name] as const))('%s ("%s"): all solution steps return ok=true', (id) => {
    const level = allLevels.find((l) => l.id === id)!;
    let s = startOf(id);
    const failures: string[] = [];
    for (const cmd of level.solution) {
      const out = executeCommand(s, cmd);
      s = out.state;
      if (!out.result.ok) failures.push(`"${cmd}" -> ${textOf(out.result)}`);
    }
    expect(failures).toEqual([]);
  });

  it('sanity: helper `run` agrees with a manual replay on a known-good level', () => {
    const level = allLevels.find((l) => l.id === 'basics-2')!;
    const { steps } = run(startOf('basics-2'), ...level.solution);
    expect(steps.every((st) => st.result.ok)).toBe(true);
  });
});

// https://doc.dvc.org/command-reference/run#-O  (--outs-no-cache != external output)
describe('-O (--outs-no-cache) is not taught as "external outputs"', () => {
  it('no level uses -O / --outs-no-cache with a path outside the repo (leading "/" or a URL)', () => {
    const offenders = allLevels.flatMap((l) =>
      l.solution.flatMap((c) => {
        const t = c.trim().split(/\s+/);
        return t.flatMap((tok, i) =>
          (tok === '-O' || tok === '--outs-no-cache') && t[i + 1] && (t[i + 1]!.startsWith('/') || t[i + 1]!.includes('://'))
            ? [`${l.id}: ${c}`]
            : [],
        );
      }),
    );
    expect(offenders).toEqual([]);
  });
});
