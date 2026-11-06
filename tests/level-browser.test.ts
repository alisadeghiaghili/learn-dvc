import { describe, expect, it } from 'vitest';
import { allLevels, seriesOf } from '../src/levels';
import { en } from '../src/i18n/en';
import { de } from '../src/i18n/de';
import { fa } from '../src/i18n/fa';

type WithSeriesTitles = { seriesTitles?: Record<string, string> };

const locales = { en, de, fa } as const;

function firstAppearanceOrder(): string[] {
  const seen: string[] = [];
  for (const l of allLevels) if (!seen.includes(l.series)) seen.push(l.series);
  return seen;
}

describe('level browser grouping', () => {
  const groups = seriesOf();

  it('lists every distinct series found in allLevels', () => {
    const listed = new Set(groups.map((g) => g.id));
    for (const id of firstAppearanceOrder()) {
      expect(listed.has(id), `series "${id}" is missing from the level browser`).toBe(true);
    }
  });

  it('lists no series that has no levels', () => {
    const real = new Set(firstAppearanceOrder());
    for (const g of groups) {
      expect(real.has(g.id), `series "${g.id}" has no levels`).toBe(true);
      expect(g.levels.length).toBeGreaterThan(0);
    }
  });

  it('orders series by first appearance in allLevels', () => {
    expect(groups.map((g) => g.id)).toEqual(firstAppearanceOrder());
  });

  it('places every level exactly once, inside its own series', () => {
    const seen = new Map<string, number>();
    for (const g of groups) {
      for (const l of g.levels) {
        expect(l.series).toBe(g.id);
        seen.set(l.id, (seen.get(l.id) ?? 0) + 1);
      }
    }
    expect(seen.size).toBe(allLevels.length);
    for (const l of allLevels) {
      expect(seen.get(l.id), `level ${l.id} must appear exactly once`).toBe(1);
    }
  });

  it('keeps levels in learning-path order within a series', () => {
    for (const g of groups) {
      const expected = allLevels.filter((l) => l.series === g.id).map((l) => l.id);
      expect(g.levels.map((l) => l.id)).toEqual(expected);
    }
  });
});

describe('level browser series titles', () => {
  const ids = firstAppearanceOrder();

  for (const [code, catalog] of Object.entries(locales)) {
    describe(code, () => {
      const titles = (catalog as unknown as WithSeriesTitles).seriesTitles;

      it('defines a title map', () => {
        expect(titles, `${code} has no seriesTitles`).toBeTruthy();
      });

      it('has a non-empty title for every series that is not the raw id', () => {
        for (const id of ids) {
          const title = titles?.[id];
          expect(title?.trim().length ?? 0, `${code} title for "${id}"`).toBeGreaterThan(0);
          expect(title, `${code} title for "${id}" must not be the raw id`).not.toBe(id);
        }
      });

      it('gives each series a distinct title', () => {
        const values = ids.map((id) => titles?.[id]);
        expect(new Set(values).size).toBe(ids.length);
      });
    });
  }

  it('uses Persian letters, not Arabic ones, in fa titles', () => {
    const titles = (fa as unknown as WithSeriesTitles).seriesTitles ?? {};
    for (const [id, t] of Object.entries(titles)) {
      expect(t, `fa title for "${id}"`).not.toMatch(/[يك]/);
    }
  });
});
