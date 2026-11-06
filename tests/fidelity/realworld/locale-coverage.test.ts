import { describe, expect, it } from 'vitest';
import { en } from '../../../src/i18n/en';
import { de } from '../../../src/i18n/de';
import { fa } from '../../../src/i18n/fa';
import { allLevels, seriesOf } from '../../../src/levels';
import { run } from '../helpers';
import { trackedRepo } from './fixtures';

const NEW_TEACH = ['dvc-install', 'dvc-exp-save', 'dvc-cache-dir', 'dvc-artifacts'];
const NEW_CONCEPTS = ['git-hooks', 'shared-cache', 'repro-pull', 'artifacts-registry', 'exp-save-remove'];

describe('teach, glossary and quiz cover the production commands in en, de and fa', () => {
  it.each([['en', en], ['de', de], ['fa', fa]] as const)('%s has the new teach and glossary entries', (_l, cat) => {
    for (const k of NEW_TEACH) expect(cat.teach[k]?.lines.length, `teach ${k}`).toBeGreaterThan(0);
    for (const k of NEW_CONCEPTS) expect(cat.glossary[k]?.body.length, `glossary ${k}`).toBeGreaterThan(20);
  });

  it('the three quiz banks stay the same length and every item has three answers', () => {
    expect(de.ui.quiz.length).toBe(en.ui.quiz.length);
    expect(fa.ui.quiz.length).toBe(en.ui.quiz.length);
    for (const item of [...en.ui.quiz, ...de.ui.quiz, ...fa.ui.quiz]) {
      expect(item.a).toHaveLength(3);
      expect(item.correct).toBeGreaterThanOrEqual(0);
      expect(item.correct).toBeLessThan(3);
    }
  });

  it('commands print their teaching footer', () => {
    expect(run(trackedRepo(), 'dvc install').last.text).toMatch(/Why: dvc install/);
    expect(run(trackedRepo(), 'dvc cache dir /mnt/shared/dvc-cache').last.text).toMatch(/Why: dvc cache dir/);
  });
});

describe('prod series placement', () => {
  it('sits right before the field series and is listed in the level browser', () => {
    const order = seriesOf().map((s) => s.id);
    expect(order.indexOf('prod')).toBe(order.indexOf('field') - 1);
    expect(seriesOf().find((s) => s.id === 'prod')?.levels).toHaveLength(6);
  });

  it('keeps the global level order stable: prod levels come after reg and before field', () => {
    const ids = allLevels.map((l) => l.id);
    const firstProd = ids.indexOf('prod-1');
    expect(ids.slice(firstProd, firstProd + 6)).toEqual(['prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5', 'prod-6']);
    expect(allLevels[firstProd - 1]!.series).not.toBe('field');
    expect(allLevels[firstProd + 6]!.series).toBe('field');
  });
});
