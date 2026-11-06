// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '../src/i18n/en';
import { de } from '../src/i18n/de';
import { clearSavedState, installBrowserStubs, modalButtons, modalEl, termInput } from './app-harness';

async function boot(): Promise<void> {
  vi.resetModules();
  await import('../src/main');
}

beforeEach(() => {
  clearSavedState();
  installBrowserStubs();
  document.body.innerHTML = '<div id="app"></div>';
  window.history.pushState({}, '', '/');
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (window as unknown as { learnDvcApp?: unknown }).learnDvcApp;
  window.history.pushState({}, '', '/');
  document.body.innerHTML = '';
});

describe('application bootstrap', () => {
  it('mounts the app into #app and greets first-time visitors with the welcome dialog', async () => {
    await boot();
    expect(document.querySelector('#app .toolbar')).not.toBeNull();
    expect(document.querySelector('#app #term-input')).toBe(termInput());
    const modal = modalEl()!;
    expect(modal.getAttribute('aria-label')).toBe(en.ui.welcomeTitle);
    expect(modal.querySelectorAll('.markdown p, .markdown ul').length).toBeGreaterThan(3);
    expect(modal.textContent).toMatch(/\d+ levels included/);
    expect(modal.querySelector('a[href*="buymeacoffee"] img')).not.toBeNull();
    expect(modalButtons().map((b) => b.textContent)).toEqual(['Sandbox', 'Open levels']);
  });

  it('exposes the app for debugging in the console', async () => {
    await boot();
    expect((window as unknown as { learnDvcApp?: unknown }).learnDvcApp).toBeDefined();
  });

  it('Sandbox simply dismisses the welcome', async () => {
    await boot();
    modalButtons()[0]!.click();
    expect(modalEl()).toBeNull();
    expect(document.querySelector('#level-title')!.textContent).toBe('sandbox mode');
  });

  it('Open levels dismisses the welcome and opens the level browser', async () => {
    await boot();
    modalButtons()[1]!.click();
    const modal = modalEl()!;
    expect(modal.querySelector('h2')!.textContent).toBe('Levels');
    expect(modal.querySelectorAll('.level-row').length).toBeGreaterThan(10);
  });

  it('skips the welcome dialog when the URL carries NODEMO', async () => {
    window.history.pushState({}, '', '/?NODEMO');
    await boot();
    expect(modalEl()).toBeNull();
    expect(document.querySelector('#app .toolbar')).not.toBeNull();
  });

  it('starts in the language the visitor chose last time', async () => {
    localStorage.setItem('learndvc-locale', 'de');
    await boot();
    expect(document.documentElement.lang).toBe('de');
    expect(document.querySelector('[data-lang-label]')!.textContent).toBe('DE');
    expect(modalButtons().map((b) => b.textContent)).toEqual([de.ui.sandbox, de.ui.openLevels]);
    expect(de.ui.openLevels).not.toBe(en.ui.openLevels);
  });

  it('uses the right-to-left layout for Persian', async () => {
    localStorage.setItem('learndvc-locale', 'fa');
    await boot();
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('fails loudly when the page has no #app element', async () => {
    document.body.innerHTML = '';
    await expect(boot()).rejects.toThrow('#app root missing');
  });
});
