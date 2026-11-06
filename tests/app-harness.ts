import { vi } from 'vitest';
import { App } from '../src/ui/app';

/** Browser APIs the app touches that happy-dom cannot provide meaningfully. */
export interface BrowserStubs {
  open: ReturnType<typeof vi.fn>;
  writeText: ReturnType<typeof vi.fn>;
  fetch: ReturnType<typeof vi.fn>;
}

export function installBrowserStubs(visitorValue = 10): BrowserStubs {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ value: visitorValue }),
    text: async () => '',
  });
  vi.stubGlobal('fetch', fetch);
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { language: 'en-US', clipboard: { writeText } });
  const open = vi.fn();
  window.open = open as unknown as typeof window.open;
  return { open, writeText, fetch };
}

/** Forget saved progress everywhere the app persists it (localStorage and the mirror cookie). */
export function clearSavedState(): void {
  localStorage.clear();
  document.cookie = 'learn_dvc_progress=; path=/; max-age=0';
}

export function mount(): { root: HTMLElement; app: App } {
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.getElementById('app') as HTMLElement;
  const app = new App(root);
  return { root, app };
}

export function termInput(): HTMLInputElement {
  return document.querySelector('#term-input') as HTMLInputElement;
}

/** Type a line into the terminal and press Enter, like a user would. */
export function submit(cmd: string): void {
  const el = termInput();
  el.value = cmd;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
}

export function pressKey(key: string): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  termInput().dispatchEvent(e);
  return e;
}

export function logLines(): { cls: string; text: string }[] {
  return [...document.querySelectorAll('#term-log > div')].map((d) => ({
    cls: d.className,
    text: d.textContent ?? '',
  }));
}

export function logText(): string {
  return logLines()
    .map((l) => l.text)
    .join('\n');
}

export function modalEl(): HTMLElement | null {
  return document.querySelector('.overlay .modal');
}

export function modalButtons(): HTMLButtonElement[] {
  return [...document.querySelectorAll<HTMLButtonElement>('.overlay .modal-actions button')];
}

export function clickModalButton(label: string): void {
  const btn = modalButtons().find((b) => b.textContent === label);
  if (!btn) throw new Error(`no modal button "${label}" among ${modalButtons().map((b) => b.textContent).join(', ')}`);
  btn.click();
}

export function pills(): string[] {
  return [...document.querySelectorAll('.status-bar .pill')].map((p) => p.textContent!.replace(/\s+/g, ' ').trim());
}

export async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Open the level browser and start a level, then click through its intro lesson. */
export function startLevelViaUi(id: string): void {
  submit('levels');
  const row = document.querySelector<HTMLButtonElement>(`.level-row[data-level="${id}"]`);
  if (!row) throw new Error(`level ${id} not in browser`);
  row.click();
  dismissIntro();
}

export function dismissIntro(): void {
  for (let guard = 0; guard < 20 && modalEl(); guard++) {
    const buttons = modalButtons();
    buttons[buttons.length - 1]!.click();
  }
}
