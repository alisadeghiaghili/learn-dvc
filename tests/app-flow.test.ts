// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSavedState,
  clickModalButton,
  dismissIntro,
  flush,
  installBrowserStubs,
  logLines,
  logText,
  modalButtons,
  modalEl,
  mount,
  pills,
  pressKey,
  startLevelViaUi,
  submit,
  termInput,
  type BrowserStubs,
} from './app-harness';
import { allLevels, seriesOf } from '../src/levels';
import { de } from '../src/i18n/de';
import { ui, setLocale } from '../src/i18n';
import { STORAGE_KEY } from '../src/ui/progress';
import { launchConfetti, playFanfare } from '../src/ui/confetti';

vi.mock('../src/ui/confetti', () => ({
  launchConfetti: vi.fn(),
  playFanfare: vi.fn(),
}));

let stubs: BrowserStubs;
let confettiStop: ReturnType<typeof vi.fn>;

beforeEach(() => {
  clearSavedState();
  setLocale('en');
  clearSavedState();
  stubs = installBrowserStubs();
  confettiStop = vi.fn();
  vi.mocked(launchConfetti).mockReset().mockReturnValue({ stop: confettiStop });
  vi.mocked(playFanfare).mockReset();
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setLocale('en');
  document.body.innerHTML = '';
});

function storedProgress(): Record<string, { solved: boolean; bestCommands?: number }> {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{"progress":{}}').progress;
}

describe('first load (sandbox)', () => {
  it('shows the toolbar, the sandbox title, the board and the learning guide', () => {
    const { root } = mount();
    expect(root.querySelector('.brand')!.textContent).toBe('LearnDVC');
    expect(root.querySelector('#level-title')!.textContent).toBe(ui().sandboxTitle);
    expect(pills()).toEqual(['dvc init', 'remotes 1', 'cache 0', 'remote objects 0', 'experiments 0']);
    expect(root.querySelector('#dock h2')!.textContent).toBe(ui().learningGuide);
    expect(root.querySelectorAll('#dock .learning-box').length).toBe(2);
    expect(root.querySelector('#dock .goal-list')!.textContent).toContain(ui().noActiveLevel);
  });

  it('greets a new learner in the terminal and suggests the first command', () => {
    mount();
    expect(logLines().map((l) => l.text)).toEqual([ui().appWelcome, ui().sandboxSeeded, ui().progressSaved]);
    expect(logLines().every((l) => l.cls === 'meta')).toBe(true);
    expect(termInput().placeholder).toBe(ui().nextPlaceholder('dvc add data/data.xml'));
  });

  it('welcomes a returning learner back with their progress instead', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ progress: { 'basics-1': { solved: true, bestCommands: 2 } } }));
    mount();
    const text = logText();
    expect(text).toContain(`Welcome back — progress saved: 1/${allLevels.length} levels`);
    expect(text).toContain('Learned so far: Initialize DVC (basics-1)');
    expect(text).not.toContain(ui().sandboxSeeded);
  });

  it('shows the cached visitor count at once and the fresh one when the counter answers', async () => {
    const { root } = mount();
    const stat = root.querySelector<HTMLElement>('#visitor-stat')!;
    expect(stat.hidden).toBe(false);
    expect(root.querySelector('#visitor-count')!.textContent).toBe('204');
    await flush();
    expect(root.querySelector('#visitor-count')!.textContent).toBe('213');
    expect(stat.title).toBe(ui().visitorsTitle);
    expect(stubs.fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps showing the baseline when the counter is unreachable', async () => {
    stubs.fetch.mockRejectedValue(new Error('offline'));
    const { root } = mount();
    await flush();
    await flush();
    expect(root.querySelector('#visitor-count')!.textContent).toBe('204');
  });
});

describe('toolbar menus', () => {
  it('the hamburger button opens and closes the navigation drawer', () => {
    const { root } = mount();
    const toggle = root.querySelector<HTMLButtonElement>('[data-action="nav-toggle"]')!;
    const drawer = root.querySelector<HTMLElement>('#nav-drawer')!;
    expect(drawer.hidden).toBe(true);
    toggle.click();
    expect(drawer.hidden).toBe(false);
    expect(drawer.classList.contains('is-open')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.click();
    expect(drawer.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('opening the language menu closes the drawer and vice versa', () => {
    const { root } = mount();
    const nav = root.querySelector<HTMLButtonElement>('[data-action="nav-toggle"]')!;
    const lang = root.querySelector<HTMLButtonElement>('[data-action="lang-toggle"]')!;
    const drawer = root.querySelector<HTMLElement>('#nav-drawer')!;
    const menu = root.querySelector<HTMLElement>('#lang-dropdown')!;
    nav.click();
    lang.click();
    expect(menu.hidden).toBe(false);
    expect(lang.getAttribute('aria-expanded')).toBe('true');
    expect(drawer.hidden).toBe(true);
    nav.click();
    expect(drawer.hidden).toBe(false);
    expect(menu.hidden).toBe(true);
  });

  it('choosing a drawer action closes the drawer and runs the command in the terminal', () => {
    const { root } = mount();
    root.querySelector<HTMLButtonElement>('[data-action="nav-toggle"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-action="hint"]')!.click();
    expect(root.querySelector<HTMLElement>('#nav-drawer')!.hidden).toBe(true);
    const lines = logLines();
    expect(lines.at(-2)).toEqual({ cls: 'cmd', text: '$ hint' });
    expect(lines.at(-1)).toEqual({ cls: 'out', text: ui().noHintSandbox });
    expect(document.activeElement).toBe(termInput());
  });

  it('the Levels button opens the level browser', () => {
    const { root } = mount();
    root.querySelector<HTMLButtonElement>('[data-action="levels"]')!.click();
    expect(modalEl()!.querySelector('h2')!.textContent).toBe(ui().levelsTitle);
  });

  it('the guide button pulses the guide panel and says it is always visible', () => {
    const { root } = mount();
    root.querySelector<HTMLButtonElement>('[data-action="goal"]')!.click();
    expect(root.querySelector('#dock')!.classList.contains('dock-pulse')).toBe(true);
    submit('show goal');
    expect(logLines().at(-1)).toEqual({ cls: 'meta', text: ui().guideAlwaysRight });
    submit('hide goal');
    expect(logLines().at(-1)).toEqual({ cls: 'meta', text: ui().guideAlwaysRight });
  });
});

describe('language switching', () => {
  it('offers every language with the current one marked', () => {
    const { root } = mount();
    const options = [...root.querySelectorAll<HTMLButtonElement>('.lang-option')];
    expect(options.map((o) => [o.dataset.lang, o.classList.contains('on'), o.getAttribute('aria-checked')])).toEqual([
      ['en', true, 'true'],
      ['de', false, 'false'],
      ['fa', false, 'false'],
    ]);
  });

  it('switches the whole interface to German and remembers the choice', () => {
    const { root } = mount();
    root.querySelector<HTMLButtonElement>('[data-action="lang-toggle"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-lang="de"]')!.click();
    expect(document.documentElement.lang).toBe('de');
    expect(document.documentElement.dir).toBe('ltr');
    expect(localStorage.getItem('learndvc-locale')).toBe('de');
    expect(root.querySelector('[data-lang-label]')!.textContent).toBe('DE');
    expect(root.querySelector('[data-action="levels"]')!.textContent).toBe(de.ui.levels);
    expect(root.querySelector('#level-title')!.textContent).toBe(de.ui.sandboxTitle);
    expect(logLines()[0]!.text).toBe(de.ui.appWelcome);
    expect(root.querySelector('[data-lang="de"]')!.classList.contains('on')).toBe(true);
  });

  it('switches to Persian and flips the page to right-to-left', () => {
    const { root } = mount();
    root.querySelector<HTMLButtonElement>('[data-lang="fa"]')!.click();
    expect(document.documentElement.lang).toBe('fa');
    expect(document.documentElement.dir).toBe('rtl');
    expect(root.querySelector('[data-lang-label]')!.textContent).toBe('FA');
  });

  it('picking the current language only closes the menu', () => {
    const { root } = mount();
    const menu = root.querySelector<HTMLElement>('#lang-dropdown')!;
    root.querySelector<HTMLButtonElement>('[data-action="lang-toggle"]')!.click();
    expect(menu.hidden).toBe(false);
    root.querySelector<HTMLButtonElement>('[data-lang="en"]')!.click();
    expect(root.querySelector<HTMLElement>('#lang-dropdown')!.hidden).toBe(true);
    expect(localStorage.getItem('learndvc-locale')).toBeNull();
    expect(logLines()[0]!.text).toBe(ui().appWelcome);
  });

  it('keeps the current level and re-seeds the transcript in the new language', () => {
    const { root } = mount();
    startLevelViaUi('basics-1');
    submit('dvc init');
    root.querySelector<HTMLButtonElement>('[data-lang="de"]')!.click();
    const copy = de.levels['basics-1']!;
    expect(root.querySelector('#level-title')!.textContent).toBe(de.ui.titleLine('basics-1', copy.name, 2));
    expect(root.querySelector('#dock h2')!.textContent).toBe(copy.name);
    expect(logLines().map((l) => l.text)).toEqual(
      expect.arrayContaining([de.ui.levelMeta('basics-1', copy.name), copy.objective]),
    );
    // game state survives the switch: dvc init already ran
    expect(pills()[0]).toBe('dvc init');
    expect(root.querySelectorAll('#dock .goal-list li.met')).toHaveLength(1);
  });

  it('restores the welcome-back message in the new language for a returning learner', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ progress: { 'basics-1': { solved: true } } }));
    const { root } = mount();
    root.querySelector<HTMLButtonElement>('[data-lang="de"]')!.click();
    expect(logText()).toContain('Welcome back');
  });
});

describe('level browser', () => {
  it('lists every level grouped by series, with ideal command counts and difficulty dots', () => {
    mount();
    submit('levels');
    const modal = modalEl()!;
    expect(modal.querySelector('h2')!.textContent).toBe(ui().levelsTitle);
    expect(modal.querySelectorAll('.series-block')).toHaveLength(seriesOf().length);
    expect(modal.querySelectorAll('.level-row')).toHaveLength(allLevels.length);
    const first = modal.querySelector('.level-row[data-level="basics-1"]')!;
    expect(first.querySelector('.id')!.textContent).toBe('basics-1');
    expect(first.querySelector('.name')!.textContent).toBe('Initialize DVC');
    expect(first.querySelector('.par-note')!.textContent).toBe('ideal 2 cmds');
    expect(first.querySelectorAll('.diff-dot')).toHaveLength(5);
    expect(first.querySelectorAll('.diff-dot.on')).toHaveLength(1);
    expect(modal.querySelector('.legend-box')).not.toBeNull();
  });

  it('accepts the singular alias', () => {
    mount();
    submit('level');
    expect(modalEl()).not.toBeNull();
  });

  it('marks solved levels with the best command count', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ progress: { 'basics-1': { solved: true, bestCommands: 2 } } }));
    mount();
    submit('levels');
    const row = modalEl()!.querySelector('.level-row[data-level="basics-1"]')!;
    expect(row.classList.contains('solved')).toBe(true);
    expect(row.querySelector('.chip')!.textContent!.trim()).toBe(`${ui().solvedLabel} 2`);
    expect(row.querySelectorAll('.diff-dot')).toHaveLength(0);
  });

  it('Close dismisses it', () => {
    mount();
    submit('levels');
    clickModalButton(ui().close);
    expect(modalEl()).toBeNull();
  });

  it('picking a level closes the browser and walks through the lesson slides', () => {
    mount();
    submit('levels');
    document.querySelector<HTMLButtonElement>('.level-row[data-level="basics-1"]')!.click();
    expect(document.querySelector('.level-row')).toBeNull();
    expect(modalEl()!.querySelector('h2')!.textContent).toBe('Why Git alone fails for ML data');
    expect(modalButtons().map((b) => b.textContent)).toEqual([ui().next]);
    clickModalButton(ui().next);
    expect(modalEl()!.querySelector('h2')!.textContent).toBe('What `dvc init` actually does');
    expect(modalButtons().map((b) => b.textContent)).toEqual([ui().back, ui().next]);
    clickModalButton(ui().back);
    expect(modalEl()!.querySelector('h2')!.textContent).toBe('Why Git alone fails for ML data');
    clickModalButton(ui().next);
    clickModalButton(ui().next);
    expect(modalEl()!.querySelector('h2')!.textContent).toBe('Why you must Git-commit the result');
    expect(modalButtons().map((b) => b.textContent)).toEqual([ui().back, ui().startLevel]);
    expect(modalEl()!.querySelector('pre')!.textContent).toContain('git commit -m "Initialize DVC"');
    clickModalButton(ui().startLevel);
    expect(modalEl()).toBeNull();
    expect(document.activeElement).toBe(termInput());
  });
});

describe('playing a level', () => {
  beforeEach(() => {
    mount();
    startLevelViaUi('basics-1');
  });

  it('shows the level title, objective, coach steps and the checklist', () => {
    expect(document.querySelector('#level-title')!.textContent).toBe(ui().titleLine('basics-1', 'Initialize DVC', 2));
    const lines = logLines();
    expect(lines[0]).toEqual({ cls: 'meta', text: ui().levelMeta('basics-1', 'Initialize DVC') });
    expect(lines[1]!.cls).toBe('out');
    expect(lines[1]!.text).toContain('Initialize DVC inside a Git repository');
    expect(lines[2]!.text).toContain('Next steps (2 remaining) for basics-1:');
    expect(pills()[0]).toBe('dvc not initialized');

    const dock = document.querySelector('#dock')!;
    expect(dock.querySelector('h2')!.textContent).toBe('Initialize DVC');
    expect(dock.querySelectorAll('.learning-box li')).toHaveLength(3);
    expect(dock.querySelectorAll('.field-box li')).toHaveLength(3);
    const steps = [...dock.querySelectorAll('.goal-list li')];
    expect(steps.map((s) => s.querySelector('code')!.textContent)).toEqual(['dvc init', 'git commit -m "Initialize DVC"']);
    expect(steps[0]!.classList.contains('current')).toBe(true);
    expect(steps[0]!.querySelector('.current-chip')!.textContent).toBe(ui().nowChip);
    expect(steps[1]!.classList.contains('current')).toBe(false);
    expect(dock.querySelector('.next-box .g-cmd')!.textContent).toBe('dvc init');
    expect(dock.querySelector('.par-note')!.textContent).toBe(ui().idealSolution(2));
    expect(termInput().placeholder).toBe(ui().nextPlaceholder('dvc init'));
  });

  it('Tab on an empty prompt starts typing the suggested command', () => {
    pressKey('Tab');
    expect(termInput().value).toBe('dvc');
  });

  it('a correct command updates the board, ticks the checklist and points at the next step', () => {
    submit('dvc init');
    const lines = logLines();
    expect(lines.some((l) => l.cls === 'cmd' && l.text === '$ dvc init')).toBe(true);
    expect(lines.some((l) => l.cls === 'out' && l.text.includes('Initialized DVC repository.'))).toBe(true);
    expect(lines.at(-1)).toEqual({ cls: 'meta', text: ui().nextMeta('git commit -m "Initialize DVC"') });
    expect(pills()[0]).toBe('dvc init');
    const steps = [...document.querySelectorAll('#dock .goal-list li')];
    expect(steps[0]!.classList.contains('met')).toBe(true);
    expect(steps[0]!.textContent).toContain('✓');
    expect(steps[1]!.classList.contains('current')).toBe(true);
    expect(document.querySelector('#dock .next-box .g-cmd')!.textContent).toBe('git commit -m "Initialize DVC"');
    expect(termInput().placeholder).toBe(ui().nextPlaceholder('git commit -m "Initialize DVC"'));
    expect(termInput().value).toBe('');
  });

  it('a wrong command prints the error, changes nothing and reminds you where you are', () => {
    submit('dvc init');
    submit('dvc bogus');
    const lines = logLines();
    expect(lines.at(-3)).toEqual({ cls: 'err', text: "ERROR: unknown command 'dvc bogus'. Type `help`." });
    expect(lines.at(-2)).toEqual({ cls: 'meta', text: ui().progressKept('git commit -m "Initialize DVC"') });
    expect(lines.at(-1)).toEqual({ cls: 'meta', text: ui().nextMeta('git commit -m "Initialize DVC"') });
    expect(pills()[0]).toBe('dvc init');
    expect(document.querySelectorAll('#dock .goal-list li.met')).toHaveLength(1);
  });

  it('an unknown program is reported like a shell would', () => {
    submit('foo');
    expect(logLines().some((l) => l.cls === 'err' && l.text === 'command not found: foo. Type `help`.')).toBe(true);
  });

  it('a blank line does nothing', () => {
    const before = logLines().length;
    submit('   ');
    expect(logLines()).toHaveLength(before);
  });

  it('hint shows the level hint and the coach text', () => {
    submit('hint');
    const lines = logLines();
    expect(lines.at(-2)).toEqual({ cls: 'out', text: 'dvc init; git commit -m "Initialize DVC"' });
    expect(lines.at(-1)!.text).toContain('Next steps (2 remaining)');
  });

  it('steps repeats the remaining steps; once finished it says everything is met', () => {
    submit('steps');
    expect(logLines().at(-1)!.text).toContain('1. [ ] ');
    submit('dvc init');
    submit('git commit -m "Initialize DVC"');
    clickModalButton(ui().baskInIt);
    submit('steps');
    expect(logLines().at(-1)).toEqual({ cls: 'out', text: ui().allStepsMet });
  });

  it('undo takes back the last command and its progress', () => {
    submit('dvc init');
    submit('undo');
    expect(pills()[0]).toBe('dvc not initialized');
    expect(logLines().at(-1)).toEqual({ cls: 'meta', text: ui().undoMeta });
    expect(document.querySelectorAll('#dock .goal-list li.met')).toHaveLength(0);
    submit('undo');
    expect(logLines().at(-1)).toEqual({ cls: 'err', text: ui().nothingToUndo });
  });

  it('reset returns the level to its starting position', () => {
    submit('dvc init');
    submit('reset');
    expect(pills()[0]).toBe('dvc not initialized');
    expect(logLines().at(-1)!.text).toContain('Next steps (2 remaining)');
    expect(logLines().some((l) => l.text === ui().resetLevel('basics-1'))).toBe(true);
    submit('undo');
    expect(logLines().at(-1)).toEqual({ cls: 'err', text: ui().nothingToUndo });
  });

  it('sandbox leaves the level and starts a clean playground', () => {
    submit('dvc init');
    submit('sandbox');
    expect(document.querySelector('#level-title')!.textContent).toBe(ui().sandboxTitle);
    expect(logLines()).toEqual([{ cls: 'meta', text: ui().sandboxMode }]);
    expect(pills()[0]).toBe('dvc init');
    expect(document.querySelector('#dock h2')!.textContent).toBe(ui().learningGuide);
    submit('exit level');
    expect(logLines().at(-1)).toEqual({ cls: 'meta', text: ui().sandboxMode });
  });

  it('lesson replays the intro and says so', () => {
    submit('lesson');
    expect(modalEl()!.querySelector('h2')!.textContent).toBe('Why Git alone fails for ML data');
    expect(logLines().at(-1)).toEqual({ cls: 'meta', text: ui().lessonReplayed });
    dismissIntro();
    expect(modalEl()).toBeNull();
  });

  it('clear wipes the transcript', () => {
    submit('clear');
    expect(logLines()).toEqual([]);
  });
});

describe('completing a level', () => {
  function solveBasics1(): void {
    mount();
    startLevelViaUi('basics-1');
    submit('dvc init');
    submit('git commit -m "Initialize DVC"');
  }

  it('records the result in the terminal and in the guide panel', () => {
    solveBasics1();
    const text = logText();
    expect(text).toContain(`${ui().levelSolvedBanner} Initialize DVC`);
    expect(text).toContain(ui().commandsUsed(2, 2));
    expect(text).toContain(ui().partyMode);
    expect(document.querySelector('#dock .solved-banner')!.textContent).toBe(ui().solvedBanner(2));
    expect(document.querySelector('#dock .next-box')!.textContent).toBe(ui().allSolutionMet);
    expect(document.querySelectorAll('#dock .goal-list li.met')).toHaveLength(2);
  });

  it('saves the progress with the number of commands used', () => {
    solveBasics1();
    expect(storedProgress()).toEqual({ 'basics-1': { solved: true, bestCommands: 2 } });
    expect(document.cookie).toContain('learn_dvc_progress=');
  });

  it('opens a celebration with the stats, a progress bar and the next level on offer', () => {
    solveBasics1();
    const overlay = document.querySelector('.overlay')!;
    expect(overlay.classList.contains('overlay-celebrate')).toBe(true);
    const modal = modalEl()!;
    expect(modal.querySelector('.celebrate-title')!.textContent).toBe('Initialize DVC');
    expect(modal.querySelector('.celebrate-sub')!.textContent).toBe('Basics · basics-1');
    expect(modal.querySelector('.celebrate-badge')!.textContent).toBe('LEVEL CLEARED');
    expect(modal.querySelector('.celebrate-cheer')!.textContent).toBe(ui().cheers[0]);
    expect(modal.querySelector('.celebrate-stats')!.textContent).toBe(`2 ${ui().idealForLevelShort(2)}`);
    expect(modal.querySelector('.celebrate-progress .par-note')!.textContent).toBe(
      `1 / ${allLevels.length} levels solved · progress saved in this browser`,
    );
    expect((modal.querySelector('.prog-fill') as HTMLElement).style.width).toBe(`${Math.round(100 / allLevels.length)}%`);
    expect(modal.querySelector('.learned-preview li')!.textContent).toBe('Basics: Initialize DVC');
    expect(modal.querySelector('.celebrate-next')!.textContent).toContain('basics-2');
    expect(modalButtons().map((b) => b.textContent)).toEqual([ui().baskInIt, ui().celebrateOn('basics-2')]);
    expect(launchConfetti).toHaveBeenCalledWith(4800);
    expect(playFanfare).toHaveBeenCalledTimes(1);
  });

  it('describes an over-par run honestly', () => {
    mount();
    startLevelViaUi('basics-1');
    submit('dvc init');
    submit('git tag v1');
    submit('git commit -m "Initialize DVC"');
    expect(modalEl()!.querySelector('.celebrate-stats')!.textContent).toBe('3 commands. Ideal is 2. Still counts — you got there.');
  });

  it('keeps the best score across attempts', () => {
    mount();
    startLevelViaUi('basics-1');
    submit('dvc init');
    submit('git tag v1');
    submit('git commit -m "Initialize DVC"');
    expect(storedProgress()['basics-1']!.bestCommands).toBe(3);
    clickModalButton(ui().baskInIt);
    submit('reset');
    submit('dvc init');
    submit('git commit -m "Initialize DVC"');
    expect(storedProgress()['basics-1']!.bestCommands).toBe(2);
    clickModalButton(ui().baskInIt);
    expect(document.querySelector('#dock .par-note')!.textContent).toBe(ui().bestSoFar(2, 2));
  });

  it('swallows Enter inside the celebration so it cannot trigger a button by accident', () => {
    solveBasics1();
    const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    modalEl()!.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
  });

  it('blocks typing in the terminal while the celebration is open', () => {
    solveBasics1();
    const before = logLines().length;
    submit('hint');
    expect(logLines()).toHaveLength(before);
  });

  it('Bask in it dismisses the celebration, stops the confetti and returns focus to the prompt', () => {
    solveBasics1();
    clickModalButton(ui().baskInIt);
    expect(modalEl()).toBeNull();
    expect(confettiStop).toHaveBeenCalled();
    expect(document.activeElement).toBe(termInput());
  });

  it('clicking outside the celebration also dismisses it', () => {
    solveBasics1();
    (document.querySelector('.overlay') as HTMLElement).click();
    expect(modalEl()).toBeNull();
    expect(confettiStop).toHaveBeenCalled();
  });

  it('the primary button jumps straight into the next level', () => {
    solveBasics1();
    clickModalButton(ui().celebrateOn('basics-2'));
    expect(document.querySelector('.overlay-celebrate')).toBeNull();
    expect(confettiStop).toHaveBeenCalled();
    expect(document.querySelector('#level-title')!.textContent).toContain('basics-2');
    expect(modalEl()!.querySelector('h2')).not.toBeNull(); // its lesson opens
    dismissIntro();
    expect(logLines()[0]!.text).toContain('basics-2');
  });

  it('undoing the winning command withdraws the banner but keeps the saved progress', () => {
    solveBasics1();
    clickModalButton(ui().baskInIt);
    submit('undo');
    expect(document.querySelector('#dock .solved-banner')).toBeNull();
    expect(document.querySelector('#dock .next-box .g-cmd')!.textContent).toBe('git commit -m "Initialize DVC"');
    expect(storedProgress()['basics-1']!.solved).toBe(true);
  });

  it('the level browser shows the level as solved afterwards', () => {
    solveBasics1();
    clickModalButton(ui().baskInIt);
    submit('levels');
    const row = modalEl()!.querySelector('.level-row[data-level="basics-1"]')!;
    expect(row.classList.contains('solved')).toBe(true);
    expect(row.querySelector('.chip')!.textContent!.trim()).toBe(`${ui().solvedLabel} 2`);
  });
});

describe('sharing a finished level', () => {
  function solveBasics1(): void {
    mount();
    startLevelViaUi('basics-1');
    submit('dvc init');
    submit('git commit -m "Initialize DVC"');
  }
  const status = () => modalEl()!.querySelector<HTMLElement>('[data-share-status]')!;
  const share = (kind: string) => modalEl()!.querySelector<HTMLButtonElement>(`[data-share="${kind}"]`)!;

  it('offers LinkedIn, X, Facebook and copy', () => {
    solveBasics1();
    const buttons = [...modalEl()!.querySelectorAll<HTMLButtonElement>('[data-share]')];
    expect(buttons.map((b) => [b.dataset.share, b.textContent])).toEqual([
      ['linkedin', ui().linkedin],
      ['x', ui().xTwitter],
      ['facebook', ui().facebook],
      ['copy', ui().copyPost],
    ]);
    expect(status().hidden).toBe(true);
  });

  it('copy puts the full post on the clipboard and confirms', async () => {
    solveBasics1();
    share('copy').click();
    await flush();
    expect(stubs.writeText).toHaveBeenCalledTimes(1);
    const text = stubs.writeText.mock.calls[0]![0] as string;
    expect(text).toContain('Latest win: Initialize DVC (basics-1)');
    expect(text).toContain('https://alisadeghiaghili.github.io/learn-dvc/');
    expect(status().hidden).toBe(false);
    expect(status().textContent).toBe(ui().copyOk);
    expect(stubs.open).not.toHaveBeenCalled();
  });

  it('copy tells you when it could not copy', async () => {
    solveBasics1();
    stubs.writeText.mockRejectedValue(new Error('denied'));
    document.execCommand = vi.fn(() => false);
    share('copy').click();
    await flush();
    expect(status().textContent).toBe(ui().copyFail);
  });

  it('LinkedIn copies the post and opens the share dialog', async () => {
    solveBasics1();
    share('linkedin').click();
    await flush();
    expect(stubs.open).toHaveBeenCalledTimes(1);
    expect(stubs.open.mock.calls[0]![0]).toMatch(/^https:\/\/www\.linkedin\.com\/shareArticle\?mini=true&url=/);
    expect(stubs.writeText.mock.calls[0]![0]).toContain('Latest win');
    expect(status().textContent).toBe(ui().shareCopied);
  });

  it('X shares the short text', async () => {
    solveBasics1();
    share('x').click();
    await flush();
    expect(stubs.open.mock.calls[0]![0]).toMatch(/^https:\/\/twitter\.com\/intent\/tweet\?text=/);
    expect(stubs.writeText.mock.calls[0]![0] as string).toContain('1/');
  });

  it('Facebook opens its sharer, and reports that it only opened when copying failed', async () => {
    solveBasics1();
    stubs.writeText.mockRejectedValue(new Error('denied'));
    document.execCommand = vi.fn(() => false);
    share('facebook').click();
    await flush();
    expect(stubs.open.mock.calls[0]![0]).toMatch(/^https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=/);
    expect(status().textContent).toBe(ui().shareOpened);
  });
});

describe('solutions', () => {
  beforeEach(() => {
    mount();
    startLevelViaUi('basics-1');
  });

  it('show solution lists the commands and lets you cancel', () => {
    submit('show solution');
    const modal = modalEl()!;
    expect(modal.querySelector('h2')!.textContent).toBe(ui().solutionTitle('basics-1'));
    expect(modal.querySelector('pre')!.textContent).toBe('dvc init\ngit commit -m "Initialize DVC"\n');
    expect(modalButtons().map((b) => b.textContent)).toEqual([ui().cancel, ui().runSolution]);
    clickModalButton(ui().cancel);
    expect(modalEl()).toBeNull();
    expect(pills()[0]).toBe('dvc not initialized');
  });

  it('the toolbar solution button and the alias open the same dialog', () => {
    document.querySelector<HTMLButtonElement>('[data-action="solution"]')!.click();
    expect(modalEl()!.querySelector('h2')!.textContent).toBe(ui().solutionTitle('basics-1'));
    clickModalButton(ui().cancel);
    submit('solution');
    expect(modalEl()!.querySelector('h2')!.textContent).toBe(ui().solutionTitle('basics-1'));
  });

  it('running the solution plays the commands and solves the level', () => {
    submit('show solution');
    clickModalButton(ui().runSolution);
    expect(pills()[0]).toBe('dvc init');
    expect(document.querySelector('#dock .solved-banner')).not.toBeNull();
    expect(document.querySelector('.overlay-celebrate')).not.toBeNull();
  });

  it('in the sandbox there is no solution to show', () => {
    submit('sandbox');
    submit('show solution');
    expect(modalEl()).toBeNull();
    expect(logLines().at(-1)).toEqual({ cls: 'meta', text: ui().noSolutionSandbox });
  });
});

describe('last level of the pack', () => {
  it('invites you to browse the levels instead of continuing', () => {
    const last = allLevels[allLevels.length - 1]!;
    mount();
    startLevelViaUi(last.id);
    submit('show solution');
    clickModalButton(ui().runSolution);
    expect(modalEl()!.querySelector('.celebrate-next')!.textContent).toContain('Last level in this pack');
    expect(modalButtons().map((b) => b.textContent)).toEqual([ui().baskInIt, ui().browseLevels]);
    clickModalButton(ui().browseLevels);
    expect(modalEl()!.querySelector('h2')!.textContent).toBe(ui().levelsTitle);
  });
});
