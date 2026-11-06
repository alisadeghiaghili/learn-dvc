// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyDocumentLocale,
  detectLocale,
  getCatalog,
  getDir,
  getLocale,
  glossaryEntry,
  initLocale,
  levelCopy,
  localizeLevel,
  quizItems,
  setLocale,
  teachEntry,
  ui,
  LOCALES,
} from '../src/i18n';
import { en } from '../src/i18n/en';
import { de } from '../src/i18n/de';
import { fa } from '../src/i18n/fa';
import { getLevel } from '../src/levels';

const KEY = 'learndvc-locale';

function stubNavigator(language: string): void {
  vi.stubGlobal('navigator', { language });
}

beforeEach(() => {
  localStorage.clear();
  stubNavigator('en-US');
  setLocale('en');
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('detectLocale', () => {
  it('defaults to English', () => {
    expect(detectLocale()).toBe('en');
  });

  it('uses the browser language when nothing is saved', () => {
    stubNavigator('de-AT');
    expect(detectLocale()).toBe('de');
    stubNavigator('fa-IR');
    expect(detectLocale()).toBe('fa');
    stubNavigator('FA');
    expect(detectLocale()).toBe('fa');
    stubNavigator('pe');
    expect(detectLocale()).toBe('fa');
    stubNavigator('fr-FR');
    expect(detectLocale()).toBe('en');
  });

  it('prefers the saved choice over the browser language', () => {
    stubNavigator('de-DE');
    localStorage.setItem(KEY, 'fa');
    expect(detectLocale()).toBe('fa');
  });

  it('ignores a saved value that is not a supported locale', () => {
    stubNavigator('de-DE');
    localStorage.setItem(KEY, 'klingon');
    expect(detectLocale()).toBe('de');
  });

  it('falls back to the browser language when storage throws', () => {
    stubNavigator('de');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('private mode');
    });
    expect(detectLocale()).toBe('de');
  });

  it('is English when there is no navigator', () => {
    vi.stubGlobal('navigator', undefined);
    expect(detectLocale()).toBe('en');
  });
});

describe('setLocale / initLocale', () => {
  it('switches the catalog, persists the choice and updates the document language and direction', () => {
    setLocale('fa');
    expect(getLocale()).toBe('fa');
    expect(getCatalog()).toBe(fa);
    expect(getDir()).toBe('rtl');
    expect(ui()).toBe(fa.ui);
    expect(localStorage.getItem(KEY)).toBe('fa');
    expect(document.documentElement.lang).toBe('fa');
    expect(document.documentElement.dir).toBe('rtl');

    setLocale('de');
    expect(document.documentElement.lang).toBe('de');
    expect(document.documentElement.dir).toBe('ltr');
    expect(ui()).toBe(de.ui);
  });

  it('still switches when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => setLocale('de')).not.toThrow();
    expect(getLocale()).toBe('de');
  });

  it('initLocale restores the saved language on load', () => {
    localStorage.setItem(KEY, 'de');
    expect(initLocale()).toBe('de');
    expect(getLocale()).toBe('de');
    expect(document.documentElement.lang).toBe('de');
  });

  it('applyDocumentLocale re-syncs the document with the current locale', () => {
    setLocale('fa');
    document.documentElement.lang = 'zz';
    document.documentElement.dir = 'ltr';
    applyDocumentLocale();
    expect(document.documentElement.lang).toBe('fa');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('exposes exactly the supported locales', () => {
    expect([...LOCALES].sort()).toEqual(['de', 'en', 'fa']);
  });
});

describe('level localisation', () => {
  it('leaves English levels untouched', () => {
    const level = getLevel('basics-1')!;
    expect(localizeLevel(level)).toBe(level);
  });

  it('overlays translated teaching copy but never the structural fields', () => {
    const level = getLevel('basics-1')!;
    setLocale('de');
    const localized = localizeLevel(level);
    const copy = de.levels['basics-1']!;
    expect(localized.name).toBe(copy.name);
    expect(localized.objective).toBe(copy.objective);
    expect(localized.seriesTitle).toBe(copy.seriesTitle);
    expect(localized.learning).toEqual(copy.learning);
    expect(localized.startDialog).toEqual(copy.startDialog);
    expect(localized.name).not.toBe(level.name);
    expect(localized.hint).toBe(level.hint);
    expect(localized.solution).toBe(level.solution);
    expect(localized.goal).toBe(level.goal);
    expect(localized.startState).toBe(level.startState);
  });

  it('keeps the English dialog and field notes when a translation omits them', () => {
    const level = getLevel('basics-1')!;
    setLocale('de');
    const original = de.levels['basics-1']!;
    try {
      de.levels['basics-1'] = { ...original, startDialog: [], fieldNotes: undefined };
      const localized = localizeLevel(level);
      expect(localized.startDialog).toBe(level.startDialog);
      expect(localized.fieldNotes).toBe(level.fieldNotes);
    } finally {
      de.levels['basics-1'] = original;
    }
  });

  it('returns a level unchanged when it has no translation', () => {
    setLocale('de');
    const ghost = { ...getLevel('basics-1')!, id: 'no-such-level' };
    expect(localizeLevel(ghost)).toBe(ghost);
  });

  it('levelCopy extracts only the translatable fields', () => {
    const level = getLevel('basics-1')!;
    expect(levelCopy(level)).toEqual({
      seriesTitle: level.seriesTitle,
      name: level.name,
      objective: level.objective,
      learning: level.learning,
      fieldNotes: level.fieldNotes,
      startDialog: level.startDialog,
    });
  });
});

describe('copy lookups', () => {
  it('teachEntry and glossaryEntry use the active locale and fall back to English', () => {
    const teachKey = Object.keys(en.teach)[0]!;
    expect(teachEntry(teachKey)).toBe(en.teach[teachKey]);
    setLocale('de');
    expect(teachEntry(teachKey)).toBe(de.teach[teachKey]);
    expect(teachEntry('nonexistent-key')).toBeUndefined();

    const original = de.teach[teachKey];
    try {
      delete de.teach[teachKey];
      expect(teachEntry(teachKey)).toBe(en.teach[teachKey]);
    } finally {
      de.teach[teachKey] = original!;
    }

    const gId = Object.keys(en.glossary)[0]!;
    expect(glossaryEntry(gId)).toBe(de.glossary[gId]);
    const gOriginal = de.glossary[gId];
    try {
      delete de.glossary[gId];
      expect(glossaryEntry(gId)).toBe(en.glossary[gId]);
    } finally {
      de.glossary[gId] = gOriginal!;
    }
  });

  it('quizItems returns the quiz of the active locale', () => {
    expect(quizItems()).toBe(en.ui.quiz);
    setLocale('fa');
    expect(quizItems()).toBe(fa.ui.quiz);
  });
});

describe('formatter functions in every catalog', () => {
  const locales = { en, de, fa };

  for (const [name, catalog] of Object.entries(locales)) {
    it(`${name}: every parameterised UI string interpolates its arguments`, () => {
      const entries = Object.entries(catalog.ui).filter(([, v]) => typeof v === 'function') as [string, (...a: unknown[]) => string][];
      expect(entries.length).toBeGreaterThan(20);
      for (const [key, fn] of entries) {
        const args = Array.from({ length: fn.length }, (_x, i) => 7001 + i * 11);
        const text = fn(...args);
        expect(typeof text, key).toBe('string');
        expect(text.length, key).toBeGreaterThan(0);
        const mentionsArg = args.some((a) => text.includes(String(a)));
        expect(mentionsArg, `${name}.${key} ignores its arguments: ${text}`).toBe(true);
      }
    });
  }

  it('the null command count in solvedBanner is accepted (level solved without a count)', () => {
    for (const catalog of Object.values(locales)) {
      expect(catalog.ui.solvedBanner(null)).not.toMatch(/null|undefined/);
      expect(catalog.ui.solvedBanner(4)).toContain('4');
    }
  });

  it('English plural helpers agree with the count', () => {
    expect(en.ui.idealCommands(1)).toBe('Ideal: 1 command');
    expect(en.ui.idealCommands(3)).toBe('Ideal: 3 commands');
  });
});
