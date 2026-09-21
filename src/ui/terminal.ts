export type LogKind = 'cmd' | 'out' | 'err' | 'meta' | 'ok';

export interface LogLine {
  kind: LogKind;
  text: string;
}

const BASE_COMMANDS = [
  'dvc init',
  'dvc add data/data.xml',
  'dvc status',
  'dvc commit',
  'dvc checkout',
  'dvc remote add -d myremote /tmp/dvcstore',
  'dvc remote list',
  'dvc push',
  'dvc pull',
  'dvc fetch',
  'dvc stage add -n prepare -d data/data.xml -d src/prepare.py -o data/prepared.csv python src/prepare.py',
  'dvc stage add -n train -d data/prepared.csv -d src/train.py -p lr -p n_estimators -o model.pkl -m metrics.json python src/train.py',
  'dvc stage list',
  'dvc repro',
  'dvc dag',
  'dvc params show',
  'dvc metrics show',
  'dvc exp run',
  'dvc exp run -S lr=0.05',
  'dvc exp show',
  'dvc exp apply exp-',
  'dvc remove',
  'dvc gc',
  'dvc version',
  'git init',
  'git add .dvc',
  'git add data/data.xml.dvc data/.gitignore',
  'git status',
  'git log',
  'git commit -m "Initialize DVC"',
  'git commit -m "Add raw data"',
  'git commit -m "Dataset updates"',
  'git checkout',
  'edit data/data.xml',
  'edit params.yaml lr=0.05',
  'rm data/data.xml',
  'cat data/data.xml',
  'ls',
  'levels',
  'hint',
  'steps',
  'show goal',
  'hide goal',
  'show solution',
  'reset',
  'undo',
  'sandbox',
  'clear',
  'help',
];

export class TerminalView {
  private logEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private wrapEl: HTMLElement;
  private ghostEl: HTMLElement;
  private hintEl: HTMLElement;
  private lines: LogLine[] = [];
  private history: string[] = [];
  private historyIdx = -1;
  private draft = '';
  private hint = '';
  private extraCompletions: string[] = [];
  private tabCycle: string[] = [];
  private tabIdx = 0;
  private tabPrefix = '';
  private measureCtx: CanvasRenderingContext2D | null = null;
  private onSubmit: (cmd: string) => void;

  constructor(root: HTMLElement, onSubmit: (cmd: string) => void) {
    this.onSubmit = onSubmit;
    root.innerHTML = `
      <div class="term-log" id="term-log" role="log" aria-live="polite"></div>
      <div class="term-hint" id="term-hint" hidden></div>
      <div class="term-input-row">
        <label class="prompt" for="term-input">dvc $</label>
        <div class="term-input-wrap" id="term-input-wrap">
          <div class="term-ghost" id="term-ghost" aria-hidden="true"></div>
          <input id="term-input" class="term-input" autocomplete="off" spellcheck="false"
            placeholder=""
            aria-label="DVC command input. Tab completes the next command. Arrow up and down browse history." />
        </div>
      </div>
    `;
    this.logEl = root.querySelector('#term-log')!;
    this.inputEl = root.querySelector('#term-input')!;
    this.wrapEl = root.querySelector('#term-input-wrap')!;
    this.ghostEl = root.querySelector('#term-ghost')!;
    this.hintEl = root.querySelector('#term-hint')!;
    this.inputEl.addEventListener('keydown', (e) => this.onKey(e));
    this.inputEl.addEventListener('input', () => this.syncGhost());
  }

  focus(): void {
    if (document.querySelector('.overlay .modal')) return;
    this.inputEl.focus();
    const len = this.inputEl.value.length;
    try {
      this.inputEl.setSelectionRange(len, len);
    } catch {
      // ignore unsupported input types
    }
  }

  setLog(lines: LogLine[]): void {
    this.lines = lines;
    this.render();
  }

  getLog(): LogLine[] {
    return this.lines;
  }

  push(kind: LogKind, text: string): void {
    if (kind === 'cmd' && text) {
      this.history.push(text);
      this.historyIdx = this.history.length;
    }
    this.lines.push({ kind, text });
    if (this.lines.length > 400) this.lines = this.lines.slice(-300);
    this.render();
  }

  clear(): void {
    this.lines = [];
    this.render();
  }

  private render(): void {
    const html = this.lines
      .map((l) => {
        const cls = l.kind;
        const prefix = l.kind === 'cmd' ? '$ ' : '';
        return `<div class="${cls}">${prefix}${escapeHtml(l.text)}</div>`;
      })
      .join('');
    this.logEl.innerHTML = html;
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  /** Next step shown as faded placeholder + Tab target (learnGitBranching-style). */
  setHint(command: string | null): void {
    this.hint = command ?? '';
    this.inputEl.placeholder = this.hint
      ? `Tab → ${this.hint}`
      : 'Type a command — help · levels · hint · steps';
    this.hintEl.hidden = !this.hint;
    if (this.hint) {
      this.hintEl.innerHTML = `Next: <code>${escapeHtml(this.hint)}</code> <span class="par-note">· press Tab to fill</span>`;
    } else {
      this.hintEl.textContent = '';
    }
    this.syncGhost();
  }

  setExtraCompletions(commands: string[]): void {
    this.extraCompletions = commands.filter(Boolean);
  }

  private allCompletions(): string[] {
    const set = new Set<string>([
      ...this.extraCompletions,
      ...BASE_COMMANDS,
      ...this.history.slice().reverse(),
    ]);
    return [...set];
  }

  private candidates(prefix: string): string[] {
    const p = prefix.toLowerCase();
    return this.allCompletions().filter(
      (c) => c.toLowerCase().startsWith(p) && c.toLowerCase() !== p,
    );
  }

  private bestCompletion(value: string): string | null {
    if (!value) return this.hint || null;
    const matches = this.candidates(value);
    if (!matches.length) {
      return this.hint && this.hint.toLowerCase().startsWith(value.toLowerCase()) ? this.hint : null;
    }
    // Prefer exact solution/hint match order: extraCompletions come first in set iteration
    return matches[0]!;
  }

  private measureText(text: string): number {
    if (!this.measureCtx) {
      this.measureCtx = document.createElement('canvas').getContext('2d');
    }
    const ctx = this.measureCtx;
    if (!ctx) return text.length * 7.2;
    const font = getComputedStyle(this.inputEl).font;
    ctx.font = font || '13px Consolas, monospace';
    return ctx.measureText(text).width;
  }

  /** Ghost suffix aligned after typed prefix; full command when input is empty. */
  private syncGhost(): void {
    const value = this.inputEl.value;
    const completion = this.bestCompletion(value);

    if (!completion) {
      this.ghostEl.textContent = '';
      this.ghostEl.dataset.visible = '0';
      this.wrapEl.classList.remove('has-ghost');
      return;
    }

    if (!value) {
      // Full faded suggestion sitting in the empty prompt.
      this.ghostEl.textContent = completion;
      this.ghostEl.style.left = '0px';
      this.ghostEl.dataset.visible = '1';
      this.wrapEl.classList.add('has-ghost');
      return;
    }

    if (!completion.toLowerCase().startsWith(value.toLowerCase()) || completion.length <= value.length) {
      this.ghostEl.textContent = '';
      this.ghostEl.dataset.visible = '0';
      this.wrapEl.classList.remove('has-ghost');
      return;
    }

    const rest = completion.slice(value.length);
    this.ghostEl.textContent = rest;
    this.ghostEl.style.left = `${this.measureText(value)}px`;
    this.ghostEl.dataset.visible = '1';
    this.wrapEl.classList.add('has-ghost');
  }

  private applyTab(e: KeyboardEvent): void {
    e.preventDefault();
    const value = this.inputEl.value;

    if (!value && this.hint) {
      this.inputEl.value = this.hint;
      this.tabCycle = [this.hint];
      this.tabIdx = 0;
      this.tabPrefix = '';
      this.focus();
      this.syncGhost();
      return;
    }

    const matches = value ? this.candidates(value) : BASE_COMMANDS.filter((c) => c.startsWith('dvc '));

    if (!matches.length) {
      if (this.hint && this.hint.toLowerCase().startsWith(value.toLowerCase())) {
        this.inputEl.value = this.hint;
        this.focus();
        this.syncGhost();
      }
      return;
    }

    if (value !== this.tabPrefix || !this.tabCycle.length) {
      this.tabPrefix = value;
      this.tabCycle = matches;
      this.tabIdx = 0;
    } else {
      this.tabIdx = (this.tabIdx + 1) % this.tabCycle.length;
    }

    const chosen = this.tabCycle[this.tabIdx] ?? matches[0]!;
    this.inputEl.value = chosen;
    this.focus();
    this.syncGhost();

    if (this.tabCycle.length > 1) {
      const preview = this.tabCycle.slice(0, 5).map((m) => escapeHtml(m)).join(' · ');
      this.hintEl.hidden = false;
      this.hintEl.innerHTML = `Tab <strong>${this.tabIdx + 1}/${this.tabCycle.length}</strong>: ${preview}${
        this.tabCycle.length > 5 ? ' …' : ''
      }`;
    }
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key === 'Tab') {
      this.applyTab(e);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      this.inputEl.value = '';
      this.tabCycle = [];
      this.tabPrefix = '';
      this.syncGhost();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (document.querySelector('.overlay .modal')) return;
      const value = this.inputEl.value;
      this.inputEl.value = '';
      const trimmed = value.trim();
      if (trimmed) {
        this.history.push(trimmed);
        this.historyIdx = this.history.length;
      }
      this.tabCycle = [];
      this.tabPrefix = '';
      this.onSubmit(value);
      this.focus();
      this.syncGhost();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!this.history.length) return;
      if (this.historyIdx === this.history.length) {
        this.draft = this.inputEl.value;
      }
      this.historyIdx = Math.max(0, this.historyIdx - 1);
      this.inputEl.value = this.history[this.historyIdx] ?? '';
      this.tabCycle = [];
      this.syncGhost();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!this.history.length) return;
      this.historyIdx = Math.min(this.history.length, this.historyIdx + 1);
      this.inputEl.value =
        this.historyIdx >= this.history.length ? this.draft : (this.history[this.historyIdx] ?? '');
      this.tabCycle = [];
      this.syncGhost();
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
