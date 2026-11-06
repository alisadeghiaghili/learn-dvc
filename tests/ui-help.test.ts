// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatUiHelpText, startUiTour, uiElements, uiHelpModalHtml } from '../src/ui/ui-help';
import { setLocale, ui } from '../src/i18n';
import { renderBoardHtml } from '../src/ui/board';
import { sandboxState } from '../src/engine/state';

afterEach(() => {
  vi.useRealTimers();
  setLocale('en');
  document.body.innerHTML = '';
});

describe('uiElements', () => {
  it('documents every region the board and terminal render', () => {
    const ids = uiElements().map((e) => e.id);
    expect(ids).toEqual(
      expect.arrayContaining(['workspace-zone', 'cache-zone', 'remote-zone', 'flow-arrow', 'dag', 'term-log', 'term-hint', 'term-ghost']),
    );
    for (const e of uiElements()) {
      expect(e.title.length, e.id).toBeGreaterThan(0);
      expect(e.what.length, e.id).toBeGreaterThan(0);
      expect(e.how.length, e.id).toBeGreaterThan(0);
      expect(e.selector.length, e.id).toBeGreaterThan(0);
    }
  });

  it('follows the active language', () => {
    setLocale('de');
    expect(uiElements()).toBe(ui().helpSections);
  });
});

describe('formatUiHelpText', () => {
  it('prints a numbered page map followed by the related commands', () => {
    const lines = formatUiHelpText().split('\n');
    const elements = uiElements();
    expect(lines[0]).toBe(ui().uiHelpMapTitle);
    expect(lines[1]).toBe('');
    expect(lines[2]).toBe(`1. ${elements[0]!.title}`);
    expect(lines[3]).toBe(`   ${elements[0]!.what.split('\n')[0]}`);
    expect(lines[lines.length - 1]).toBe(ui().uiHelpCommands);
    for (let i = 0; i < elements.length; i++) {
      expect(formatUiHelpText()).toContain(`${i + 1}. ${elements[i]!.title}`);
    }
  });

  it('indents the continuation lines of multi-line descriptions', () => {
    const multi = uiElements().find((e) => e.what.includes('\n'))!;
    const second = multi.what.split('\n')[1]!;
    expect(formatUiHelpText()).toContain(`\n   ${second}`);
  });
});

describe('uiHelpModalHtml', () => {
  function modal(): HTMLElement {
    const host = document.createElement('div');
    host.innerHTML = uiHelpModalHtml();
    return host;
  }

  it('renders one section per region with a highlight button pointing at it', () => {
    const host = modal();
    const sections = [...host.querySelectorAll('.ui-help-item')];
    expect(sections).toHaveLength(uiElements().length);
    uiElements().forEach((e, i) => {
      expect(sections[i]!.getAttribute('data-help-id')).toBe(e.id);
      expect(sections[i]!.querySelector('h3')!.textContent).toBe(e.title);
      const btn = sections[i]!.querySelector('button.ui-help-focus') as HTMLButtonElement;
      expect(btn.dataset.focusId).toBe(e.id);
      expect(btn.textContent).toBe(ui().highlightThis);
      expect(btn.type).toBe('button');
    });
  });

  it('formats bold text and line breaks in the descriptions and escapes markup', () => {
    const host = modal();
    const zone = host.querySelector('[data-help-id="workspace-zone"]')!;
    expect(zone.querySelector('.ui-help-how strong')!.textContent).toBe(ui().useIt);
    expect(zone.querySelectorAll('.ui-help-how strong').length).toBeGreaterThan(1);
    expect(zone.querySelectorAll('.ui-help-how br').length).toBeGreaterThan(0);
    expect(zone.querySelector('script')).toBeNull();
  });

  it('escapes angle brackets and ampersands found in the copy', () => {
    const original = ui().helpSections[0]!.what;
    try {
      ui().helpSections[0]!.what = '<img src=x> & **bold**';
      const host = modal();
      const what = host.querySelector('.ui-help-what')!;
      expect(what.querySelector('img')).toBeNull();
      expect(what.innerHTML).toBe('&lt;img src=x&gt; &amp; <strong>bold</strong>');
    } finally {
      ui().helpSections[0]!.what = original;
    }
  });

  it('escapes the highlight label used as button text', () => {
    const u = ui() as unknown as { highlightThis: string };
    const original = u.highlightThis;
    try {
      u.highlightThis = 'A & "B" <i>';
      const btn = modal().querySelector('button.ui-help-focus')!;
      expect(btn.textContent).toBe('A & "B" <i>');
      expect(btn.querySelector('i')).toBeNull();
    } finally {
      u.highlightThis = original;
    }
  });
});

describe('startUiTour', () => {
  let root: HTMLElement;
  beforeEach(() => {
    root = document.createElement('div');
    root.innerHTML = renderBoardHtml(sandboxState()) + '<div class="term-log"></div><div class="term-hint"></div><div class="term-input-wrap"></div>';
    document.body.appendChild(root);
  });

  function highlighted(): string[] {
    return [...root.querySelectorAll('.ui-tour-on')].map((e) => e.className.replace(' ui-tour-on', ''));
  }

  it('outlines every documented region that exists on the page', () => {
    startUiTour(root);
    expect(root.querySelectorAll('.ui-tour-on').length).toBeGreaterThanOrEqual(6);
    expect(root.querySelector('.zone.workspace')!.classList.contains('ui-tour-on')).toBe(true);
    expect(root.querySelector('.term-log')!.classList.contains('ui-tour-on')).toBe(true);
  });

  it('can focus a single region', () => {
    startUiTour(root, 'cache-zone');
    expect(highlighted()).toEqual(['zone cache']);
  });

  it('replaces an earlier highlight instead of stacking', () => {
    startUiTour(root, 'cache-zone');
    startUiTour(root, 'remote-zone');
    expect(highlighted()).toEqual(['zone remote']);
  });

  it('ignores regions that are not on the page', () => {
    startUiTour(root, 'dag');
    expect(highlighted()).toEqual([]);
  });

  it('the returned stop function clears the outline', () => {
    const stop = startUiTour(root);
    stop();
    expect(root.querySelectorAll('.ui-tour-on')).toHaveLength(0);
  });

  it('clears the outline by itself after the duration', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    startUiTour(root, 'cache-zone', 2500);
    vi.advanceTimersByTime(2499);
    expect(highlighted()).toEqual(['zone cache']);
    vi.advanceTimersByTime(2);
    expect(highlighted()).toEqual([]);
  });
});
