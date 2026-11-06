// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COOKIE_KEY,
  STORAGE_KEY,
  loadProgress,
  resumeLine,
  saveProgress,
  summarizeCurriculum,
} from '../src/ui/progress';
import { allLevels } from '../src/levels';

function clearCookie(): void {
  document.cookie = `${COOKIE_KEY}=; path=/; max-age=0`;
}

function setCookie(value: unknown, raw = false): void {
  const text = raw ? String(value) : encodeURIComponent(JSON.stringify(value));
  document.cookie = `${COOKIE_KEY}=${text}; path=/`;
}

beforeEach(() => {
  localStorage.clear();
  clearCookie();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('saveProgress', () => {
  it('stores the progress with a timestamp in localStorage', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-04T05:06:07.000Z'));
    saveProgress({ 'basics-1': { solved: true, bestCommands: 2 } });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      progress: { 'basics-1': { solved: true, bestCommands: 2 } },
      savedAt: '2026-03-04T05:06:07.000Z',
    });
  });

  it('mirrors the payload into a cookie so a fresh browser profile can resume', () => {
    saveProgress({ 'basics-1': { solved: true } });
    expect(document.cookie).toContain(`${COOKIE_KEY}=`);
    localStorage.clear();
    expect(loadProgress()).toEqual({ 'basics-1': { solved: true, bestCommands: undefined } });
  });

  it('still writes the cookie when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => saveProgress({ 'basics-2': { solved: true } })).not.toThrow();
    expect(loadProgress()['basics-2']?.solved).toBe(true);
  });
});

describe('loadProgress', () => {
  it('returns nothing when nothing was saved', () => {
    expect(loadProgress()).toEqual({});
  });

  it('reads the wrapped blob written by saveProgress', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ progress: { a: { solved: true, bestCommands: 3 } } }));
    expect(loadProgress()).toEqual({ a: { solved: true, bestCommands: 3 } });
  });

  it('also accepts a bare id to progress map', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ a: { solved: true, bestCommands: 4 } }));
    expect(loadProgress()).toEqual({ a: { solved: true, bestCommands: 4 } });
  });

  it('treats a blob without a progress field as empty rather than crashing', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ progress: null, savedAt: 'x' }));
    expect(loadProgress()).toEqual({});
  });

  it('ignores corrupt JSON in localStorage and in the cookie', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    setCookie('also{broken', true);
    expect(loadProgress()).toEqual({});
  });

  it('survives a localStorage that throws on read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    setCookie({ progress: { c: { solved: true, bestCommands: 7 } } });
    expect(loadProgress()).toEqual({ c: { solved: true, bestCommands: 7 } });
  });

  it('merges cookie and localStorage: solved wins, best command count is the minimum', () => {
    setCookie({ progress: { a: { solved: true, bestCommands: 5 }, b: { solved: false, bestCommands: 9 }, c: { solved: true } } });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ progress: { a: { solved: false, bestCommands: 3 }, b: { solved: true }, c: { solved: false, bestCommands: 6 }, d: { solved: true, bestCommands: 1 } } }),
    );
    expect(loadProgress()).toEqual({
      a: { solved: true, bestCommands: 3 },
      b: { solved: true, bestCommands: 9 },
      c: { solved: true, bestCommands: 6 },
      d: { solved: true, bestCommands: 1 },
    });
  });

  it('skips null entries inside a saved map', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ progress: { a: null, b: { solved: true } } }));
    expect(Object.keys(loadProgress())).toEqual(['b']);
  });

  it('reads cookies among other cookies and tolerates an undecodable value', () => {
    document.cookie = 'theme=dark; path=/';
    document.cookie = `${COOKIE_KEY}=%E0%A4%A; path=/`;
    expect(loadProgress()).toEqual({});
    setCookie({ progress: { z: { solved: true } } });
    expect(loadProgress().z?.solved).toBe(true);
  });
});

describe('summarizeCurriculum', () => {
  it('starts at the first level when nothing is solved', () => {
    const s = summarizeCurriculum({});
    expect(s.solvedCount).toBe(0);
    expect(s.total).toBe(allLevels.length);
    expect(s.percent).toBe(0);
    expect(s.learned).toEqual([]);
    expect(s.remaining).toHaveLength(allLevels.length);
    expect(s.next?.id).toBe(allLevels[0]!.id);
  });

  it('moves solved levels to learned, with their best command counts, and points at the following level', () => {
    const [a, b, c] = allLevels;
    const s = summarizeCurriculum({
      [a!.id]: { solved: true, bestCommands: 2 },
      [b!.id]: { solved: true },
    });
    expect(s.solvedCount).toBe(2);
    expect(s.learned.map((l) => l.id)).toEqual([a!.id, b!.id]);
    expect(s.learned[0]).toMatchObject({ name: a!.name, seriesTitle: a!.seriesTitle, bestCommands: 2 });
    expect(s.learned[1]!.bestCommands).toBeUndefined();
    expect(s.next?.id).toBe(c!.id);
    expect(s.percent).toBe(Math.round((2 / allLevels.length) * 100));
  });

  it('prefers the level after the last solved one over the first gap', () => {
    const solvedLater = allLevels[5]!;
    const s = summarizeCurriculum({ [solvedLater.id]: { solved: true } });
    expect(s.next?.id).toBe(allLevels[6]!.id);
    expect(s.remaining[0]!.id).toBe(allLevels[0]!.id);
  });

  it('falls back to the first unsolved level when the official next one is already solved', () => {
    const progress = {
      [allLevels[1]!.id]: { solved: true },
      [allLevels[2]!.id]: { solved: true },
    };
    // last solved is index 2 -> official next is index 3 (unsolved)
    expect(summarizeCurriculum(progress).next?.id).toBe(allLevels[3]!.id);
    // last solved is the final level -> there is no official next; first gap is offered
    const last = allLevels[allLevels.length - 1]!;
    expect(summarizeCurriculum({ [last.id]: { solved: true } }).next?.id).toBe(allLevels[0]!.id);
  });

  it('reports no next level once everything is solved', () => {
    const all = Object.fromEntries(allLevels.map((l) => [l.id, { solved: true }]));
    const s = summarizeCurriculum(all);
    expect(s.next).toBeNull();
    expect(s.percent).toBe(100);
    expect(s.remaining).toEqual([]);
  });

  it('lists only teaching commands, leaving out plain inspection commands', () => {
    const s = summarizeCurriculum({});
    for (const item of s.remaining) {
      for (const cmd of item.commands) {
        expect(cmd).not.toMatch(/^(dvc status|dvc exp show|dvc metrics show|dvc params show)/);
      }
    }
    expect(s.remaining[0]!.commands).toEqual(allLevels[0]!.solution);
  });
});

describe('resumeLine', () => {
  it('invites a first-time visitor to open the level list', () => {
    expect(resumeLine(summarizeCurriculum({}))).toBe(
      `No saved progress yet (${allLevels.length} levels waiting). Start with \`levels\`.`,
    );
  });

  it('welcomes a returning learner with progress, what they learned and the next command', () => {
    const [a, b] = allLevels;
    const text = resumeLine(summarizeCurriculum({ [a!.id]: { solved: true } }));
    const lines = text.split('\n');
    expect(lines[0]).toBe(
      `Welcome back — progress saved: 1/${allLevels.length} levels (${Math.round(100 / allLevels.length)}%).`,
    );
    expect(lines[1]).toBe(`Learned so far: ${a!.name} (${a!.id})`);
    expect(lines[2]).toBe(`Next up: ${b!.name} — \`${b!.solution[0]}\``);
    expect(lines[3]).toBe('Open Levels to resume. Type `steps` after starting a level.');
  });

  it('says everything is cleared when no level remains', () => {
    const all = Object.fromEntries(allLevels.map((l) => [l.id, { solved: true }]));
    const text = resumeLine(summarizeCurriculum(all));
    expect(text.split('\n')[2]).toBe('All levels cleared.');
  });

  it('falls back to a generic command when the next level lists none', () => {
    const summary = summarizeCurriculum({});
    summary.solvedCount = 1;
    summary.learned = [{ id: 'x', name: 'X', seriesTitle: 's', commands: [] }];
    summary.next = { id: 'y', name: 'Y', seriesTitle: 's', commands: [] };
    expect(resumeLine(summary).split('\n')[2]).toBe('Next up: Y — `continue`');
  });
});
