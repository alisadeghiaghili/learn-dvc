import { describe, expect, it } from 'vitest';
import { allLevels } from '../../../src/levels';
import { executeCommand } from '../../../src/engine/commands';
import { evaluateGoal } from '../../../src/engine/compare';
import { deLevels } from '../../../src/i18n/de-levels';
import { faLevels } from '../../../src/i18n/fa-levels';
import { textOf } from '../helpers';
import type { LevelDef } from '../../../src/engine/types';

/** The new "Production habits" series: level id + commands its solution must contain. */
export const PROD_SERIES = 'prod';
export const PROD_LEVELS: { id: string; key: RegExp[] }[] = [
  { id: 'prod-1', key: [/^dvc install$/, /^git checkout /] },
  { id: 'prod-2', key: [/^dvc exp save\b/, /^dvc exp remove\b/] },
  { id: 'prod-3', key: [/^cat dvc\.yaml$/, /^dvc repro train/] },
  { id: 'prod-4', key: [/^dvc repro --pull\b/] },
  {
    id: 'prod-5',
    key: [/^dvc cache dir \S+/, /^dvc config cache\.shared group$/, /^dvc config cache\.type /, /^git commit\b/],
  },
  {
    id: 'prod-6',
    key: [
      /^gto register model --version v1\.0\.0\b/,
      /^gto assign model --version v1\.0\.0 --stage prod\b/,
      /^dvc artifacts get \S+ model\b/,
    ],
  },
];

export function findLevel(id: string): LevelDef {
  const level = allLevels.find((l) => l.id === id);
  expect(level, `level ${id} must exist in allLevels`).toBeDefined();
  return level!;
}

/** Replay a level solution from its start state. */
export function replay(level: LevelDef, upTo = level.solution.length) {
  let s = structuredClone(level.startState);
  const failures: string[] = [];
  const outputs: string[] = [];
  for (const cmd of level.solution.slice(0, upTo)) {
    const out = executeCommand(s, cmd);
    s = out.state;
    outputs.push(textOf(out.result));
    if (!out.result.ok) failures.push(`"${cmd}" -> ${textOf(out.result)}`);
  }
  return { state: s, failures, outputs };
}

/** The contract every new real-world level must satisfy. */
export function levelContract(id: string, key: RegExp[]) {
  describe(`level ${id}`, () => {
    it('exists in allLevels, in the production series', () => {
      const level = findLevel(id);
      expect(level.series).toBe(PROD_SERIES);
      expect(allLevels.filter((l) => l.id === id)).toHaveLength(1);
    });

    it('is not already solved by its start state', () => {
      const level = findLevel(id);
      expect(evaluateGoal(structuredClone(level.startState), level.goal).solved).toBe(false);
    });

    it('solution replays with every command ok and satisfies the goal', () => {
      const level = findLevel(id);
      const { state, failures } = replay(level);
      expect(failures).toEqual([]);
      expect(evaluateGoal(state, level.goal).solved).toBe(true);
    });

    it.each(key.map((k) => [String(k), k] as const))('solution contains the key command %s', (_n, re) => {
      const level = findLevel(id);
      expect(level.solution.some((c) => re.test(c.trim()))).toBe(true);
    });

    it('has Persian and German overrides with matching slide counts and a translated second slide', () => {
      const level = findLevel(id);
      for (const [lang, copy] of [['de', deLevels[id]], ['fa', faLevels[id]]] as const) {
        expect(copy, `${lang} override for ${id}`).toBeTruthy();
        expect(copy!.name.length).toBeGreaterThan(0);
        expect(copy!.objective.length).toBeGreaterThan(0);
        expect(copy!.learning.length).toBe(level.learning.length);
        expect(copy!.startDialog.length).toBe(level.startDialog.length);
        expect(copy!.startDialog[1]?.markdown, `${lang} second slide`).not.toBe(level.startDialog[1]?.markdown);
      }
    });
  });
}
