// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TerminalView } from '../src/ui/terminal';
import { setLocale, ui } from '../src/i18n';
import { de } from '../src/i18n/de';
import { en } from '../src/i18n/en';

let root: HTMLElement;
let submitted: string[];
let term: TerminalView;

function input(): HTMLInputElement {
  return root.querySelector('#term-input') as HTMLInputElement;
}
function ghost(): HTMLElement {
  return root.querySelector('#term-ghost') as HTMLElement;
}
function hintBox(): HTMLElement {
  return root.querySelector('#term-hint') as HTMLElement;
}
function logLines(): { cls: string; text: string }[] {
  return [...root.querySelectorAll('#term-log > div')].map((d) => ({ cls: d.className, text: d.textContent ?? '' }));
}

function type(text: string): void {
  const el = input();
  el.value = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function press(key: string): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  input().dispatchEvent(e);
  return e;
}

beforeEach(() => {
  document.body.innerHTML = '<div id="host"></div>';
  root = document.getElementById('host') as HTMLElement;
  submitted = [];
  term = new TerminalView(root, (cmd) => submitted.push(cmd));
  // 10px per character keeps the ghost offset easy to assert
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    font: '',
    measureText: (t: string) => ({ width: t.length * 10 }),
  } as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  vi.restoreAllMocks();
  setLocale('en');
  document.body.innerHTML = '';
});

describe('rendering', () => {
  it('builds a labelled log region and an input row', () => {
    const log = root.querySelector('#term-log')!;
    expect(log.getAttribute('role')).toBe('log');
    expect(log.getAttribute('aria-live')).toBe('polite');
    expect(root.querySelector('.prompt')!.textContent).toBe('dvc $');
    expect(input().getAttribute('aria-label')).toBe(ui().termAriaLabel);
    expect(hintBox().hidden).toBe(true);
  });

  it('labels the input in the active language', () => {
    setLocale('de');
    const host = document.createElement('div');
    new TerminalView(host, () => undefined);
    const label = host.querySelector('#term-input')!.getAttribute('aria-label');
    expect(label).toBe(de.ui.termAriaLabel);
    expect(label).not.toBe(en.ui.termAriaLabel);
  });

  it('prefixes commands with a prompt and tags every line with its kind', () => {
    term.push('cmd', 'dvc init');
    term.push('out', 'Initialized DVC repository.');
    term.push('err', 'ERROR: nope');
    term.push('ok', 'done');
    term.push('meta', 'note');
    expect(logLines()).toEqual([
      { cls: 'cmd', text: '$ dvc init' },
      { cls: 'out', text: 'Initialized DVC repository.' },
      { cls: 'err', text: 'ERROR: nope' },
      { cls: 'ok', text: 'done' },
      { cls: 'meta', text: 'note' },
    ]);
  });

  it('escapes HTML in output instead of rendering it', () => {
    term.push('out', '<img src=x onerror=alert(1)> & more');
    const line = root.querySelector('#term-log > div')!;
    expect(line.querySelector('img')).toBeNull();
    expect(line.textContent).toBe('<img src=x onerror=alert(1)> & more');
  });

  it('keeps the newest output in view', () => {
    const log = root.querySelector('#term-log') as HTMLElement;
    Object.defineProperty(log, 'scrollHeight', { value: 999, configurable: true });
    term.push('out', 'x');
    expect(log.scrollTop).toBe(999);
  });

  it('setLog replaces the transcript and getLog returns it; clear empties it', () => {
    term.setLog([{ kind: 'out', text: 'restored' }]);
    expect(term.getLog()).toEqual([{ kind: 'out', text: 'restored' }]);
    expect(logLines()).toEqual([{ cls: 'out', text: 'restored' }]);
    term.clear();
    expect(term.getLog()).toEqual([]);
    expect(logLines()).toEqual([]);
  });

  it('trims the transcript to the latest 300 lines once it passes 400', () => {
    for (let i = 0; i < 401; i++) term.push('out', `line ${i}`);
    const lines = term.getLog();
    expect(lines).toHaveLength(300);
    expect(lines[0]!.text).toBe('line 101');
    expect(lines[299]!.text).toBe('line 400');
  });
});

describe('hint and placeholder', () => {
  it('shows the next expected command as a placeholder and in the hint bar', () => {
    term.setHint('dvc init');
    expect(input().placeholder).toBe(ui().nextPlaceholder('dvc init'));
    expect(hintBox().hidden).toBe(false);
    expect(hintBox().querySelector('code')!.textContent).toBe('dvc init');
    expect(hintBox().textContent).toContain(ui().nextPrompt);
    expect(hintBox().textContent).toContain(ui().tabFillsWord);
  });

  it('goes back to the generic placeholder and hides the bar when there is no hint', () => {
    term.setHint('dvc init');
    term.setHint(null);
    expect(input().placeholder).toBe('Type a command — help · levels · hint · steps');
    expect(hintBox().hidden).toBe(true);
    expect(hintBox().textContent).toBe('');
  });

  it('escapes the hint text', () => {
    term.setHint('echo <b>x</b>');
    expect(hintBox().querySelector('b')).toBeNull();
    expect(hintBox().querySelector('code')!.textContent).toBe('echo <b>x</b>');
  });
});

describe('submitting commands', () => {
  it('Enter hands the typed line to the app and clears the field', () => {
    type('dvc status');
    const e = press('Enter');
    expect(e.defaultPrevented).toBe(true);
    expect(submitted).toEqual(['dvc status']);
    expect(input().value).toBe('');
  });

  it('Enter on an empty line still notifies the app (so it can print a fresh prompt)', () => {
    press('Enter');
    expect(submitted).toEqual(['']);
  });

  it('does not submit while a dialog is open', () => {
    document.body.insertAdjacentHTML('beforeend', '<div class="overlay"><div class="modal"></div></div>');
    type('dvc status');
    press('Enter');
    expect(submitted).toEqual([]);
    expect(input().value).toBe('dvc status');
  });

  it('focus() is a no-op while a dialog is open and focuses the input otherwise', () => {
    document.body.insertAdjacentHTML('beforeend', '<div class="overlay"><div class="modal"></div></div>');
    term.focus();
    expect(document.activeElement).not.toBe(input());
    document.querySelector('.overlay')!.remove();
    term.focus();
    expect(document.activeElement).toBe(input());
  });

  it('Escape discards the line', () => {
    type('dvc ad');
    const e = press('Escape');
    expect(e.defaultPrevented).toBe(true);
    expect(input().value).toBe('');
    expect(ghost().dataset.visible).toBe('0');
  });
});

describe('command history', () => {
  function submit(cmd: string): void {
    type(cmd);
    press('Enter');
  }

  it('ArrowUp walks back through earlier commands and stops at the oldest', () => {
    submit('first');
    submit('second');
    press('ArrowUp');
    expect(input().value).toBe('second');
    press('ArrowUp');
    expect(input().value).toBe('first');
    press('ArrowUp');
    expect(input().value).toBe('first');
  });

  it('ArrowDown walks forward and returns to the unfinished draft', () => {
    submit('first');
    submit('second');
    type('half-typed');
    press('ArrowUp');
    press('ArrowUp');
    expect(input().value).toBe('first');
    press('ArrowDown');
    expect(input().value).toBe('second');
    press('ArrowDown');
    expect(input().value).toBe('half-typed');
    press('ArrowDown');
    expect(input().value).toBe('half-typed');
  });

  it('arrow keys do nothing with an empty history but are still captured', () => {
    type('abc');
    expect(press('ArrowUp').defaultPrevented).toBe(true);
    expect(press('ArrowDown').defaultPrevented).toBe(true);
    expect(input().value).toBe('abc');
  });

  it('history excludes blank lines and trims whitespace', () => {
    submit('   ');
    submit('  dvc add x  ');
    press('ArrowUp');
    expect(input().value).toBe('dvc add x');
    press('ArrowUp');
    expect(input().value).toBe('dvc add x');
  });

  it('commands echoed into the log are recallable too', () => {
    term.push('cmd', 'dvc repro');
    press('ArrowUp');
    expect(input().value).toBe('dvc repro');
  });
});

describe('inline suggestion (ghost text)', () => {
  it('stays hidden for an empty field', () => {
    type('');
    expect(ghost().dataset.visible).toBe('0');
    expect(ghost().textContent).toBe('');
  });

  it('shows the rest of the word being typed, positioned after the caret', () => {
    type('dvc ad');
    expect(ghost().dataset.visible).toBe('1');
    expect(ghost().textContent).toBe('d');
    expect(ghost().style.left).toBe('60px');
    expect(root.querySelector('#term-input-wrap')!.classList.contains('has-ghost')).toBe(true);
  });

  it('after a space, offers the next word', () => {
    type('dvc add ');
    expect(ghost().textContent).toBe('data/data.xml');
    expect(ghost().style.left).toBe('80px');
  });

  it('puts the current hint ahead of the built-in command list', () => {
    term.setHint('dvc status --cloud');
    type('dvc ');
    expect(ghost().textContent).toBe('status');
  });

  it('suggests from commands the lesson registered', () => {
    term.setExtraCompletions(['dvc exp run -S lr=0.9', '']);
    type('dvc exp run -S ');
    expect(ghost().textContent).toBe('lr=0.9');
  });

  it('learns from what the user already typed', () => {
    type('dvc frobnicate --all');
    press('Enter');
    type('dvc frob');
    expect(ghost().textContent).toBe('nicate');
  });

  it('is hidden when nothing matches, or when the word is already complete', () => {
    type('zzz');
    expect(ghost().dataset.visible).toBe('0');
    type('dvc init');
    expect(ghost().dataset.visible).toBe('0');
  });

  it('falls back to an estimated width when no canvas is available', () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    const host = document.createElement('div');
    document.body.appendChild(host);
    new TerminalView(host, () => undefined);
    const el = host.querySelector('#term-input') as HTMLInputElement;
    el.value = 'dvc ad';
    el.dispatchEvent(new Event('input'));
    expect((host.querySelector('#term-ghost') as HTMLElement).style.left).toBe(`${6 * 7.2}px`);
  });
});

describe('Tab completion', () => {
  it('first Tab on an empty field with a hint types only the first word', () => {
    term.setHint('dvc init');
    const e = press('Tab');
    expect(e.defaultPrevented).toBe(true);
    expect(input().value).toBe('dvc');
  });

  it('then completes the hint word by word', () => {
    term.setHint('dvc init');
    press('Tab');
    type('dvc ');
    press('Tab');
    expect(input().value).toBe('dvc init');
  });

  it('completes a unique partial word', () => {
    type('dvc ad');
    press('Tab');
    expect(input().value).toBe('dvc add');
  });

  it('truncates a long list of choices in the hint bar', () => {
    type('dvc ');
    press('Tab');
    expect(hintBox().textContent).toMatch(/Tab word 1\/\d+/);
    expect(hintBox().textContent).toContain('…');
  });

  it('restores the hint text after a single-choice completion when a hint exists', () => {
    term.setHint('dvc init');
    type('dvc ad');
    press('Tab');
    expect(hintBox().querySelector('code')!.textContent).toBe('dvc init');
  });

  it('does nothing when no word matches, but still swallows the Tab key', () => {
    type('qqq');
    const e = press('Tab');
    expect(e.defaultPrevented).toBe(true);
    expect(input().value).toBe('qqq');
  });

  it('offers first words on an empty field without a hint', () => {
    press('Tab');
    expect(input().value).toBe('dvc');
  });

  it('cycles through ambiguous words on repeated Tab and shows the choices', () => {
    type('dvc re');
    press('Tab');
    expect(input().value).toBe('dvc remote');
    expect(hintBox().hidden).toBe(false);
    expect(hintBox().textContent).toContain('Tab word 1/3');
    expect(hintBox().querySelector('code')!.textContent).toBe('remote · repro · remove');
    press('Tab');
    expect(input().value).toBe('dvc repro');
    expect(hintBox().textContent).toContain('Tab word 2/3');
    press('Tab');
    expect(input().value).toBe('dvc remove');
    press('Tab');
    expect(input().value).toBe('dvc remote');
  });

  it('starts a fresh cycle after the user types something else', () => {
    type('dvc re');
    press('Tab');
    press('Tab');
    expect(input().value).toBe('dvc repro');
    type('dvc ex');
    press('Tab');
    expect(input().value).toBe('dvc exp');
  });

  it('cycles through next words after a space as well', () => {
    type('dvc ');
    press('Tab');
    expect(input().value).toBe('dvc init');
    press('Tab');
    expect(input().value).toBe('dvc add');
  });
});
