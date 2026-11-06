import { describe, expect, it } from 'vitest';
import { de } from '../src/i18n/de';
import { en } from '../src/i18n/en';
import { fa } from '../src/i18n/fa';

describe('English count-dependent strings', () => {
  it('use the singular for exactly one and the plural otherwise', () => {
    expect(en.ui.bestSoFar(1, 1)).toBe('Best so far: 1 command · ideal: 1');
    expect(en.ui.bestSoFar(5, 3)).toBe('Best so far: 5 commands · ideal: 3');
    expect(en.ui.idealSolution(1)).toBe('Ideal solution: 1 command (under or equal is excellent)');
    expect(en.ui.idealSolution(4)).toBe('Ideal solution: 4 commands (under or equal is excellent)');
    expect(en.ui.idealForLevel(1)).toBe('Ideal for this level: 1 command');
    expect(en.ui.idealForLevel(2)).toBe('Ideal for this level: 2 commands');
    expect(en.ui.shareCommands(1, 2)).toBe(' — 1 command (ideal 2)');
    expect(en.ui.shareCommands(6, 2)).toBe(' — 6 commands (ideal 2)');
  });

  it('idealForLevelShort states the ideal count', () => {
    expect(en.ui.idealForLevelShort(3)).toBe('— at or under the ideal (3). Clean run.');
  });

  it('shareLatestWin names the level and its id', () => {
    expect(en.ui.shareLatestWin('Track data', 'basics-2')).toBe('Latest win: Track data (basics-2)');
  });
});

describe('German count-dependent strings', () => {
  it('use Befehl for one and Befehle otherwise', () => {
    expect(de.ui.bestSoFar(1, 1)).toBe('Bisher beste: 1 Befehl · ideal: 1');
    expect(de.ui.bestSoFar(5, 3)).toBe('Bisher beste: 5 Befehle · ideal: 3');
    expect(de.ui.idealSolution(1)).toContain('1 Befehl ');
    expect(de.ui.idealSolution(2)).toContain('2 Befehle ');
    expect(de.ui.idealCommands(1)).toBe('Ideal: 1 Befehl');
    expect(de.ui.idealCommands(2)).toBe('Ideal: 2 Befehle');
    expect(de.ui.idealForLevel(1)).toBe('Ideal für dieses Level: 1 Befehl');
    expect(de.ui.idealForLevel(3)).toBe('Ideal für dieses Level: 3 Befehle');
    expect(de.ui.shareCommands(1, 2)).toBe(' — 1 Befehl (ideal 2)');
    expect(de.ui.shareCommands(4, 2)).toBe(' — 4 Befehle (ideal 2)');
  });
});

describe('coachNextSteps in every language', () => {
  const catalogs = { en, de, fa };
  for (const [name, c] of Object.entries(catalogs)) {
    it(`${name}: names the level when there is one and omits it otherwise`, () => {
      const withId = c.ui.coachNextSteps(3, 'basics-2');
      const without = c.ui.coachNextSteps(3, '');
      expect(withId).toContain('3');
      expect(withId).toContain('basics-2');
      expect(without).toContain('3');
      expect(without).not.toContain('basics-2');
      expect(without).not.toMatch(/undefined|null/);
      expect(withId.length).toBeGreaterThan(without.length);
      expect(without.endsWith(':')).toBe(true);
    });

    it(`${name}: solvedBanner mentions the count only when it is known`, () => {
      expect(c.ui.solvedBanner(4)).toContain('4');
      expect(c.ui.solvedBanner(null)).not.toMatch(/\d|null|undefined/);
    });
  }
});

describe('Persian formatters', () => {
  it('keep the numbers they are given', () => {
    expect(fa.ui.shareCommands(5, 2)).toBe(' — 5 فرمان (ایده‌آل 2)');
    expect(fa.ui.idealCommands(2)).toBe('ایده‌آل: 2 فرمان');
    expect(fa.ui.progressLevels(3, 10)).toBe('پیشرفت: 3/10 مرحله حل شد.');
  });
});
