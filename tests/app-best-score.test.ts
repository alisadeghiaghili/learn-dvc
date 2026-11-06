// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSavedState,
  clickModalButton,
  installBrowserStubs,
  mount,
  startLevelViaUi,
  submit,
} from './app-harness';
import { setLocale, ui } from '../src/i18n';
import { STORAGE_KEY } from '../src/ui/progress';

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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setLocale('en');
  document.body.innerHTML = '';
});

function storedProgress(): Record<string, { solved: boolean; bestCommands?: number }> {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{"progress":{}}').progress;
}

describe('progress recorded when the solution was run for the learner', () => {
  it('does not record a best of zero commands', () => {
    mount();
    startLevelViaUi('basics-1');
    submit('show solution');
    clickModalButton(ui().runSolution);
    const record = storedProgress()['basics-1']!;
    expect(record.solved).toBe(true);
    expect(record.bestCommands ?? Infinity).toBeGreaterThan(0);
  });

  it('still records the real command count of a later honest run', () => {
    mount();
    startLevelViaUi('basics-1');
    submit('show solution');
    clickModalButton(ui().runSolution);
    clickModalButton(ui().baskInIt);
    submit('reset');
    submit('dvc init');
    submit('git commit -m "Initialize DVC"');
    expect(storedProgress()['basics-1']!.bestCommands).toBe(2);
  });
});
