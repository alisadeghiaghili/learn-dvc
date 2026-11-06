// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COFFEE_URL,
  SHARE_URL,
  buildShareTargets,
  copySharePayload,
  openShareWindow,
  shareMessageLinkedIn,
  shareMessageX,
  shareWithClipboard,
  type ShareContext,
} from '../src/ui/share';
import { summarizeCurriculum } from '../src/ui/progress';
import { allLevels } from '../src/levels';
import { setLocale } from '../src/i18n';

function ctx(solvedIds: string[], over: Partial<ShareContext> = {}): ShareContext {
  return {
    levelName: 'Initialize DVC',
    levelId: 'basics-1',
    commands: 3,
    par: 2,
    curriculum: summarizeCurriculum(Object.fromEntries(solvedIds.map((id) => [id, { solved: true }]))),
    ...over,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocale('en');
  document.body.innerHTML = '';
});

describe('share messages', () => {
  it('invites the reader to start when nothing is solved yet', () => {
    const text = shareMessageLinkedIn(ctx([]));
    expect(text).not.toContain('What I have learned so far');
    expect(text).toContain(SHARE_URL);
    expect(text).toContain(COFFEE_URL);
    expect(text).toContain('0/' + allLevels.length);
  });

  it('mentions the latest win with the command count when known, and without it otherwise', () => {
    const withCount = shareMessageLinkedIn(ctx(['basics-1']));
    const noCount = shareMessageLinkedIn(ctx(['basics-1'], { commands: null }));
    expect(withCount).toContain('Initialize DVC');
    expect(withCount).toContain('3');
    expect(noCount).toContain('Initialize DVC');
    expect(noCount.length).toBeLessThan(withCount.length);
  });

  it('never leaves more than one blank line in a row', () => {
    expect(shareMessageLinkedIn(ctx(['basics-1', 'basics-2']))).not.toMatch(/\n{3,}/);
  });

  it('X text names the first learned level, or falls back to a generic line', () => {
    expect(shareMessageX(ctx(['basics-1']))).toContain('• Initialize DVC');
    const empty = shareMessageX(ctx([]));
    expect(empty).toContain(SHARE_URL);
    expect(empty).not.toContain('•');
  });

  it('X text drops the bullet when the post would exceed the character limit', () => {
    const long = ctx(['basics-1']);
    long.curriculum.learned[0]!.name = 'N'.repeat(300);
    const text = shareMessageX(long);
    expect(text.length).toBeLessThanOrEqual(275);
    expect(text).not.toContain('NNNN');
    expect(text.endsWith(SHARE_URL)).toBe(true);
  });

  it('uses the active locale for the copy', () => {
    const en = shareMessageX(ctx(['basics-1']));
    setLocale('de');
    const de = shareMessageX(ctx(['basics-1']));
    expect(de).not.toBe(en);
    expect(de).toContain(SHARE_URL);
  });
});

describe('buildShareTargets', () => {
  it('encodes the right payload for every network', () => {
    const c = ctx(['basics-1']);
    const t = buildShareTargets(c);
    expect(t.url).toBe(SHARE_URL);
    expect(t.text).toBe(shareMessageLinkedIn(c));
    expect(t.shortText).toBe(shareMessageX(c));
    expect(t.linkedin.startsWith('https://www.linkedin.com/shareArticle?mini=true&url=')).toBe(true);
    expect(t.linkedin).toContain(`url=${encodeURIComponent(SHARE_URL)}`);
    expect(t.linkedin).toContain(`summary=${encodeURIComponent(t.text)}`);
    expect(t.linkedin).toContain('source=LearnDVC');
    expect(t.x).toBe(`https://twitter.com/intent/tweet?text=${encodeURIComponent(t.shortText)}`);
    expect(t.facebook).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}&quote=${encodeURIComponent(t.text)}`,
    );
    expect(t.learnedLines).toEqual(['• Basics: Initialize DVC']);
  });
});

describe('openShareWindow', () => {
  it('opens a sandboxed popup', () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);
    window.open = open as unknown as typeof window.open;
    openShareWindow('https://example.test/share');
    expect(open).toHaveBeenCalledWith('https://example.test/share', '_blank', 'noopener,noreferrer,width=720,height=640');
  });
});

describe('copySharePayload', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('uses the async clipboard when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await copySharePayload('hello')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to a hidden textarea and execCommand when the clipboard API rejects', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    let copied = '';
    document.execCommand = vi.fn(() => {
      copied = (document.querySelector('textarea') as HTMLTextAreaElement).value;
      return true;
    });
    expect(await copySharePayload('fallback text')).toBe(true);
    expect(copied).toBe('fallback text');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('reports false when execCommand declines to copy', async () => {
    vi.stubGlobal('navigator', {});
    document.execCommand = vi.fn(() => false);
    expect(await copySharePayload('x')).toBe(false);
  });

  it('reports false when the fallback itself throws', async () => {
    vi.stubGlobal('navigator', {});
    document.execCommand = vi.fn(() => {
      throw new Error('unsupported');
    });
    expect(await copySharePayload('x')).toBe(false);
  });
});

describe('shareWithClipboard', () => {
  function setup() {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const open = vi.fn();
    window.open = open as unknown as typeof window.open;
    const targets = buildShareTargets(ctx(['basics-1']));
    return { writeText, open, targets };
  }

  it('copy only copies the long text and opens nothing', async () => {
    const { writeText, open, targets } = setup();
    expect(await shareWithClipboard('copy', targets)).toEqual({ opened: false, copied: true });
    expect(writeText).toHaveBeenCalledWith(targets.text);
    expect(open).not.toHaveBeenCalled();
  });

  it('x copies the short text and opens the tweet intent', async () => {
    const { writeText, open, targets } = setup();
    expect(await shareWithClipboard('x', targets)).toEqual({ opened: true, copied: true });
    expect(writeText).toHaveBeenCalledWith(targets.shortText);
    expect(open.mock.calls[0]![0]).toBe(targets.x);
  });

  it('linkedin and facebook copy the long text and open their own share URL', async () => {
    const { writeText, open, targets } = setup();
    await shareWithClipboard('linkedin', targets);
    await shareWithClipboard('facebook', targets);
    expect(writeText).toHaveBeenNthCalledWith(1, targets.text);
    expect(writeText).toHaveBeenNthCalledWith(2, targets.text);
    expect(open.mock.calls.map((c) => c[0])).toEqual([targets.linkedin, targets.facebook]);
  });

  it('still opens the popup when copying fails, and says so', async () => {
    const { open, targets } = setup();
    vi.stubGlobal('navigator', {});
    document.execCommand = vi.fn(() => false);
    expect(await shareWithClipboard('linkedin', targets)).toEqual({ opened: true, copied: false });
    expect(open).toHaveBeenCalledTimes(1);
  });
});
