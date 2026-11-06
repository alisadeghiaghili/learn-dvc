import { describe, expect, it } from 'vitest';
import { allLevels } from '../../../src/levels';
import { PROD_LEVELS, PROD_SERIES, findLevel } from './level-contract';

// Curriculum hygiene for the production-habits series (extends fidelity/content-quality.test.ts,
// whose it.each blocks run over every level in allLevels, including these).
const FILLER = [
  /\b(lorem ipsum|todo|tbd|coming soon|placeholder)\b/i,
  /^\s*(in this level|congratulations|good luck|let'?s get started|welcome to)\b/i,
  /\b(as we (have )?(seen|learned)|you already know)\b/i,
];

describe('production series is registered', () => {
  it('has exactly the six prod levels, in order, in one series', () => {
    const ids = allLevels.filter((l) => l.series === PROD_SERIES).map((l) => l.id);
    expect(ids).toEqual(PROD_LEVELS.map((p) => p.id));
  });

  it('shares one seriesTitle', () => {
    const titles = new Set(allLevels.filter((l) => l.series === PROD_SERIES).map((l) => l.seriesTitle));
    expect(titles.size).toBe(1);
  });
});

describe.each(PROD_LEVELS)('$id start dialog', ({ id, key }) => {
  it('has at least two slides, each with a title', () => {
    const level = findLevel(id);
    expect(level.startDialog.length).toBeGreaterThanOrEqual(2);
    for (const s of level.startDialog) expect((s.title ?? '').trim().length).toBeGreaterThan(0);
  });

  it('second slide is substantial, free of filler and shows a command', () => {
    const slide = findLevel(id).startDialog[1]!;
    expect(slide.markdown.trim().length).toBeGreaterThanOrEqual(200);
    for (const re of FILLER) expect(slide.markdown, String(re)).not.toMatch(re);
    expect(slide.markdown).toMatch(/`[^`\n]*(dvc|gto|git)[^`\n]*`|```/);
  });

  it('second slide is unique: no other slide anywhere repeats it', () => {
    const md = findLevel(id).startDialog[1]!.markdown.trim();
    const dupes = allLevels.flatMap((l) =>
      l.startDialog.flatMap((s, i) => (l.id !== id || i !== 1) && s.markdown.trim() === md ? [`${l.id}[${i}]`] : []),
    );
    expect(dupes).toEqual([]);
  });

  it('second slide names at least one command taught by the solution', () => {
    const level = findLevel(id);
    const md = level.startDialog[1]!.markdown;
    const cmds = level.solution.map((c) => c.trim().split(/\s+/).slice(0, 2).join(' '));
    expect(cmds.some((c) => md.includes(c))).toBe(true);
    expect(key.length).toBeGreaterThan(0);
  });
});

describe('prod levels are distinct from each other', () => {
  it('no slide markdown is shared between two prod levels', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const { id } of PROD_LEVELS) {
      for (const s of findLevel(id).startDialog) {
        const k = s.markdown.trim();
        if (seen.has(k)) dupes.push(`${seen.get(k)} / ${id}`);
        seen.set(k, id);
      }
    }
    expect(dupes).toEqual([]);
  });

  it.each(PROD_LEVELS.map((p) => p.id))('%s has learning bullets, field notes, hint and a par', (id) => {
    const l = findLevel(id);
    expect(l.learning.length).toBeGreaterThanOrEqual(2);
    expect((l.fieldNotes ?? []).length).toBeGreaterThanOrEqual(1);
    expect(l.hint.length).toBeGreaterThan(0);
    expect(l.par).toBeGreaterThan(0);
  });
});
