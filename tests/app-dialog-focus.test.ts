// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSavedState,
  clickModalButton,
  installBrowserStubs,
  modalEl,
  mount,
  startLevelViaUi,
  submit,
  termInput,
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

describe('focus after dismissing a dialog with its own button', () => {
  it('returns to the prompt after cancelling the solution dialog', () => {
    mount();
    startLevelViaUi('basics-1');
    submit('show solution');
    clickModalButton(ui().cancel);
    expect(modalEl()).toBeNull();
    expect(document.activeElement).toBe(termInput());
  });

  it('returns to the prompt after closing the about card', () => {
    mount();
    submit('about');
    expect(modalEl()!.querySelector('h2')!.textContent).toBe(ui().aboutTitle);
    clickModalButton(ui().close);
    expect(modalEl()).toBeNull();
    expect(document.activeElement).toBe(termInput());
  });
});
