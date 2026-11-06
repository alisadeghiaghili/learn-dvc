// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSavedState,
  clickModalButton,
  installBrowserStubs,
  logLines,
  logText,
  modalButtons,
  modalEl,
  mount,
  pills,
  startLevelViaUi,
  submit,
  termInput,
} from './app-harness';
import { setLocale, ui } from '../src/i18n';
import { curriculumOutcomes, allLevels } from '../src/levels';
import { formatUiHelpText, uiElements } from '../src/ui/ui-help';
import { STORAGE_KEY } from '../src/ui/progress';
import { formatConcepts } from '../src/engine/glossary';

vi.mock('../src/ui/confetti', () => ({
  launchConfetti: vi.fn(() => ({ stop: vi.fn() })),
  playFanfare: vi.fn(),
}));

beforeEach(() => {
  clearSavedState();
  setLocale('en');
  installBrowserStubs();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setLocale('en');
  document.body.innerHTML = '';
});

describe('sandbox', () => {
  it('has no hint, no goal and no solution', () => {
    mount();
    submit('hint');
    expect(logLines().at(-1)).toEqual({ cls: 'out', text: ui().noHintSandbox });
    submit('steps');
    expect(logLines().at(-1)).toEqual({ cls: 'meta', text: ui().noGoalSandbox });
    submit('next');
    expect(logLines().at(-1)).toEqual({ cls: 'meta', text: ui().noGoalSandbox });
  });

  it('lets you experiment, undo and reset', () => {
    mount();
    submit('dvc add data/data.xml');
    expect(logLines().at(-1)!.cls).toBe('out');
    expect(document.querySelectorAll('.zone.cache .card')).toHaveLength(1);
    submit('undo');
    expect(document.querySelectorAll('.zone.cache .card')).toHaveLength(0);
    expect(logLines().at(-1)).toEqual({ cls: 'meta', text: ui().undoMeta });
    submit('dvc add data/data.xml');
    submit('reset');
    expect(document.querySelectorAll('.zone.cache .card')).toHaveLength(0);
    expect(logLines().at(-1)).toEqual({ cls: 'meta', text: ui().resetSandbox });
  });

  it('reports an error without losing the board', () => {
    mount();
    submit('dvc add missing.csv');
    expect(logLines().at(-1)).toEqual({ cls: 'err', text: "ERROR: bad path 'missing.csv' — nothing in the workspace." });
    expect(pills()[0]).toBe('dvc init');
  });

  it('undo with nothing to undo is an error', () => {
    mount();
    submit('undo');
    expect(logLines().at(-1)).toEqual({ cls: 'err', text: ui().nothingToUndo });
  });

  it('undo skips read-only shell commands and takes back the last DVC command', () => {
    mount();
    submit('dvc add data/data.xml');
    submit('ls');
    submit('undo');
    expect(document.querySelectorAll('.zone.cache .card')).toHaveLength(0);
  });
});

describe('drawer buttons', () => {
  function clickAction(action: string): void {
    document.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.click();
  }

  it('undo, reset and sandbox buttons behave like the commands', () => {
    mount();
    clickAction('undo');
    expect(logLines().at(-1)).toEqual({ cls: 'err', text: ui().nothingToUndo });
    clickAction('reset');
    expect(logLines().at(-1)).toEqual({ cls: 'meta', text: ui().resetSandbox });
    clickAction('sandbox');
    expect(logLines()).toEqual([{ cls: 'meta', text: ui().sandboxMode }]);
  });

  it('the lesson button shows the about card in the sandbox and the lesson inside a level', () => {
    mount();
    clickAction('lesson');
    expect(modalEl()!.querySelector('h2')!.textContent).toBe(ui().aboutTitle);
    clickModalButton(ui().close);
    startLevelViaUi('basics-1');
    clickAction('lesson');
    expect(modalEl()!.querySelector('h2')!.textContent).toBe('Why Git alone fails for ML data');
  });
});

describe('about card', () => {
  it.each(['lesson', 'intro', 'about'])('%s opens the publisher card in the sandbox', (alias) => {
    mount();
    submit(alias);
    const modal = modalEl()!;
    expect(modal.querySelector('h2')!.textContent).toBe(ui().aboutTitle);
    const links = [...modal.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toContain('https://github.com/alisadeghiaghili/learn-dvc');
    expect(links).toContain('https://www.buymeacoffee.com/alisadeghil');
    expect(modal.querySelector('a[href*="buymeacoffee"] img')!.getAttribute('alt')).toBe('Buy me a coffee');
    expect(modalButtons().map((b) => b.textContent)).toEqual([ui().close]);
  });
});

describe('help and the page tour', () => {
  it('help prints the command list and opens the UI guide', () => {
    mount();
    submit('help');
    const out = logLines().filter((l) => l.cls === 'out').map((l) => l.text);
    expect(out[0]).toContain('help ui | tour');
    expect(out[0]).toContain('curriculum');
    expect(out[1]).toBe(formatUiHelpText());
    const modal = modalEl()!;
    expect(modal.querySelector('h2')!.textContent).toBe(ui().uiGuideTitle);
    expect(modal.querySelectorAll('.ui-help-item')).toHaveLength(uiElements().length);
    // plain help does not start the highlight tour
    expect(document.querySelectorAll('.ui-tour-on')).toHaveLength(0);
  });

  it('? is a shortcut for help', () => {
    mount();
    submit('?');
    expect(modalEl()!.querySelector('h2')!.textContent).toBe(ui().uiGuideTitle);
  });

  it.each(['help ui', 'help page', 'tour'])('%s explains the page and highlights its regions', (cmd) => {
    mount();
    submit(cmd);
    expect(logLines().at(-1)).toEqual({ cls: 'out', text: formatUiHelpText() });
    expect(modalEl()!.querySelector('h2')!.textContent).toBe(ui().uiGuideTitle);
    expect(document.querySelector('.zone.workspace')!.classList.contains('ui-tour-on')).toBe(true);
    expect(document.querySelector('.term-log')!.classList.contains('ui-tour-on')).toBe(true);
  });

  it('the ? button in the drawer opens the guide with the tour', () => {
    mount();
    document.querySelector<HTMLButtonElement>('[data-action="help"]')!.click();
    expect(modalEl()!.querySelector('h2')!.textContent).toBe(ui().uiGuideTitle);
    expect(document.querySelectorAll('.ui-tour-on').length).toBeGreaterThan(0);
  });

  it('Close dismisses the guide and puts the cursor back in the terminal', () => {
    mount();
    submit('help');
    clickModalButton(ui().close);
    expect(modalEl()).toBeNull();
    expect(document.activeElement).toBe(termInput());
  });

  it('Highlight on one entry closes the guide, outlines only that region and then reopens the guide', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    mount();
    submit('help');
    modalEl()!.querySelector<HTMLButtonElement>('[data-focus-id="cache-zone"]')!.click();
    expect(modalEl()).toBeNull();
    expect([...document.querySelectorAll('.ui-tour-on')].map((e) => e.className)).toEqual(['zone cache ui-tour-on']);
    vi.advanceTimersByTime(2999);
    expect(modalEl()).toBeNull();
    vi.advanceTimersByTime(2);
    expect(modalEl()!.querySelector('h2')!.textContent).toBe(ui().uiGuideTitle);
    expect(document.querySelectorAll('.ui-tour-on')).toHaveLength(0);
  });
});

describe('curriculum and concepts', () => {
  it('curriculum lists the learning outcomes and the saved progress', () => {
    mount();
    submit('curriculum');
    const lines = logLines();
    const outcomes = curriculumOutcomes();
    const list = lines.find((l) => l.cls === 'out' && l.text.startsWith(' 1. '))!;
    expect(list.text.split('\n')).toHaveLength(outcomes.length);
    expect(list.text.split('\n')[0]).toBe(` 1. ${outcomes[0]}`);
    expect(lines.some((l) => l.text === ui().curriculumOutcomes)).toBe(true);
    expect(lines.at(-2)).toEqual({ cls: 'meta', text: ui().progressLevels(0, allLevels.length) });
    expect(lines.at(-1)).toEqual({ cls: 'meta', text: ui().fieldGlossary });
  });

  it.each(['outcomes', 'syllabus'])('%s is an alias for curriculum', (alias) => {
    mount();
    submit(alias);
    expect(logText()).toContain(ui().curriculumOutcomes);
  });

  it('curriculum reflects solved levels', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ progress: { 'basics-1': { solved: true }, 'basics-2': { solved: true } } }));
    mount();
    submit('curriculum');
    expect(logLines().at(-2)!.text).toBe(ui().progressLevels(2, allLevels.length));
  });

  it('concepts shows the mental-model glossary and accepts a term', () => {
    mount();
    submit('concepts');
    const first = logLines().at(-1)!;
    expect(first.cls).toBe('out');
    expect(first.text.split('\n')[0]).toBe('DVC mental models (type `concepts <term>` for one entry):');
    expect(first.text).toContain(formatConcepts());
    submit('glossary');
    expect(logLines().at(-1)!.text).toContain(formatConcepts());
    submit('concepts pointer');
    const last = logLines().at(-1)!;
    expect(last.cls).toBe('out');
    expect(last.text).toContain('Pointer file');
    expect(document.activeElement).toBe(termInput());
  });
});

describe('quiz', () => {
  it('starts with the first question and its three options', () => {
    mount();
    submit('quiz');
    const quiz = ui().quiz;
    const text = logLines().at(-1)!.text;
    expect(text.split('\n')).toEqual([
      `${ui().quizHeader(1, quiz.length)}: ${quiz[0]!.q}`,
      `  A) ${quiz[0]!.a[0]}`,
      `  B) ${quiz[0]!.a[1]}`,
      `  C) ${quiz[0]!.a[2]}`,
      ui().quizAnswerUsage,
    ]);
  });

  it('confirms a correct answer and asks the next question', () => {
    mount();
    submit('quiz');
    const quiz = ui().quiz;
    const letter = ['a', 'b', 'c'][quiz[0]!.correct]!;
    submit(`quiz ${letter}`);
    const lines = logLines();
    expect(lines.at(-2)).toEqual({ cls: 'out', text: ui().correct });
    expect(lines.at(-1)!.text).toContain(`${ui().quizHeader(2, quiz.length)}: ${quiz[1]!.q}`);
  });

  it('corrects a wrong answer by naming the right one, then moves on', () => {
    mount();
    submit('quiz');
    const quiz = ui().quiz;
    const wrong = ['a', 'b', 'c'][(quiz[0]!.correct + 1) % 3]!;
    submit(`quiz ${wrong}`);
    const right = ['A', 'B', 'C'][quiz[0]!.correct];
    expect(logLines().at(-2)).toEqual({
      cls: 'out',
      text: `✗ Not quite. Best answer: ${right} — ${quiz[0]!.a[quiz[0]!.correct]}`,
    });
    expect(logLines().at(-1)!.text).toContain(`${ui().quizHeader(2, quiz.length)}:`);
  });

  it('is case-insensitive and rejects anything that is not A, B or C', () => {
    mount();
    submit('quiz');
    submit('quiz D');
    expect(logLines().at(-1)).toEqual({ cls: 'err', text: ui().quizAnswerUsage });
    submit('QUIZ A');
    expect(logLines().at(-2)!.text.startsWith(ui().correct) || logLines().at(-2)!.text.startsWith('✗')).toBe(true);
  });

  it('finishes after the last question and can be restarted', () => {
    mount();
    submit('quiz');
    const quiz = ui().quiz;
    for (const item of quiz) submit(`quiz ${['a', 'b', 'c'][item.correct]}`);
    expect(logLines().at(-1)).toEqual({ cls: 'out', text: ui().quizFinished });
    submit('quiz');
    expect(logLines().at(-1)!.text).toContain(`${ui().quizHeader(1, quiz.length)}:`);
  });
});

describe('keeping the prompt usable', () => {
  it('Escape clears a half-typed command', () => {
    mount();
    termInput().value = 'dvc ad';
    termInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(termInput().value).toBe('');
  });

  it('arrow up recalls the previous command', () => {
    mount();
    submit('dvc status');
    termInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    expect(termInput().value).toBe('dvc status');
  });

  it('suggests the lesson commands while a level is active', () => {
    mount();
    startLevelViaUi('basics-1');
    termInput().value = 'git comm';
    termInput().dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector('#term-ghost')!.textContent).toBe('it');
  });
});
