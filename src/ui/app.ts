import type { LevelDef, LevelProgress, RepoState } from '../engine/types';
import { cloneState, sandboxState } from '../engine/state';
import { commandCountsForGolf, executeCommand } from '../engine/commands';
import { evaluateGoal, flattenGoal } from '../engine/compare';
import { allLevels, getNextLevel, seriesOf } from '../levels';
import { renderBoardHtml } from './board';
import { TerminalView, type LogLine } from './terminal';
import { renderMarkdown, showModal } from './dialog';

const STORAGE_KEY = 'learn-dvc-progress-v1';

interface Persist {
  progress: Record<string, LevelProgress>;
}

function loadProgress(): Record<string, LevelProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return (JSON.parse(raw) as Persist).progress ?? {};
  } catch {
    return {};
  }
}

function saveProgress(progress: Record<string, LevelProgress>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ progress }));
}

export class App {
  private root: HTMLElement;
  private state: RepoState;
  private level: LevelDef | null = null;
  private startSnapshot: RepoState;
  private golf: string[] = [];
  private log: LogLine[] = [];
  private goalOpen = false;
  private solvedFlash = false;
  private progress = loadProgress();
  private terminal!: TerminalView;
  private boardEl!: HTMLElement;
  private dockEl!: HTMLElement;
  private titleEl!: HTMLElement;
  private undoStack: RepoState[] = [];

  constructor(root: HTMLElement) {
    this.root = root;
    this.state = sandboxState();
    this.startSnapshot = cloneState(this.state);
    this.mount();
    this.renderAll();
    this.pushMeta(
      'LearnDVC — interactive DVC sandbox. Type `help`, or `levels` to start the first tutorial.',
    );
    this.pushMeta('Sandbox seeded with a DVC project and data/data.xml. Try `dvc add data/data.xml`.');
  }

  private mount(): void {
    this.root.innerHTML = `
      <header class="toolbar">
        <div class="brand">Learn<span>DVC</span></div>
        <div class="level-title" id="level-title"></div>
        <div class="toolbar-actions">
          <button type="button" data-action="levels">Levels</button>
          <button type="button" data-action="goal">Goal</button>
          <button type="button" data-action="hint">Hint</button>
          <button type="button" data-action="solution">Solution</button>
          <button type="button" data-action="undo">Undo</button>
          <button type="button" data-action="reset">Reset</button>
          <button type="button" data-action="sandbox" class="ghost">Sandbox</button>
        </div>
      </header>
      <div class="stage no-dock" id="stage">
        <div class="board-wrap" id="board-wrap"></div>
        <aside class="dock" id="dock" hidden></aside>
      </div>
      <div class="terminal" id="terminal"></div>
    `;
    this.boardEl = this.root.querySelector('#board-wrap')!;
    this.dockEl = this.root.querySelector('#dock')!;
    this.titleEl = this.root.querySelector('#level-title')!;
    this.terminal = new TerminalView(this.root.querySelector('#terminal')!, (cmd) =>
      this.handleCommand(cmd),
    );
    this.root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'levels') this.openLevels();
        if (action === 'goal') this.toggleGoal();
        if (action === 'hint') this.handleCommand('hint');
        if (action === 'solution') this.handleCommand('show solution');
        if (action === 'undo') this.handleCommand('undo');
        if (action === 'reset') this.handleCommand('reset');
        if (action === 'sandbox') this.handleCommand('sandbox');
        this.terminal.focus();
      });
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.goalOpen) this.toggleGoal(false);
    });
  }

  private pushMeta(text: string): void {
    this.log.push({ kind: 'meta', text });
    this.terminal.setLog(this.log);
  }

  private pushOut(text: string): void {
    if (!text) return;
    this.log.push({ kind: 'out', text });
    this.terminal.setLog(this.log);
  }

  private pushErr(text: string): void {
    this.log.push({ kind: 'err', text });
    this.terminal.setLog(this.log);
  }

  private renderAll(): void {
    this.boardEl.innerHTML = renderBoardHtml(this.state);
    this.titleEl.textContent = this.level
      ? `${this.level.id} · ${this.level.name} · par ${this.level.par}`
      : 'sandbox mode';
    this.renderDock();
    const stage = this.root.querySelector('#stage')!;
    if (this.goalOpen) {
      stage.classList.remove('no-dock');
      this.dockEl.hidden = false;
    } else {
      stage.classList.add('no-dock');
      this.dockEl.hidden = true;
    }
  }

  private renderDock(): void {
    if (!this.level) {
      this.dockEl.innerHTML = `<h2>Sandbox</h2>
        <p class="objective">Free-form practice. Open <strong>Levels</strong> for guided challenges.</p>
        <ul class="goal-list">
          <li class="met"><div class="g-label">No active goal</div><div class="g-detail">levels → pick a challenge</div></li>
        </ul>`;
      return;
    }
    const { solved, statuses } = evaluateGoal(this.state, this.level.goal);
    const items = flattenGoal(this.level.goal).map((_, i) => {
      const s = statuses[i];
      return `<li class="${s.met ? 'met' : ''}">
        <div class="g-label">${s.met ? '✓' : '○'} ${s.label}</div>
        <div class="g-detail">${s.detail}</div>
      </li>`;
    });
    const prog = this.progress[this.level.id];
    const golfNote = prog?.bestCommands !== undefined ? `Best: ${prog.bestCommands} cmd · par ${this.level.par}` : `par ${this.level.par}`;
    this.dockEl.innerHTML = `
      <h2>${this.level.name}</h2>
      <p class="objective">${this.level.objective}</p>
      <div class="par-note">${golfNote}${solved ? ' · SOLVED' : ''}</div>
      ${this.solvedFlash ? `<div class="solved-banner">Level solved${this.golf.length ? ` in ${this.golf.length} command(s)` : ''}.</div>` : ''}
      <ul class="goal-list">${items.join('')}</ul>
    `;
  }

  private toggleGoal(force?: boolean): void {
    this.goalOpen = force ?? !this.goalOpen;
    this.renderAll();
    if (this.goalOpen) this.pushMeta('Goal panel opened. (`hide goal` or Esc to close.)');
  }

  private openLevels(): void {
    const series = seriesOf();
    const body = series
      .map((s) => {
        const rows = s.levels
          .map((l) => {
            const p = this.progress[l.id];
            return `<button type="button" class="level-row ${p?.solved ? 'solved' : ''}" data-level="${l.id}">
              <span class="id">${l.id}</span>
              <span class="name">${l.name}</span>
              <span class="par-note">par ${l.par}</span>
              <span class="chip ${p?.solved ? 'ok' : ''}">${p?.solved ? `solved ${p.bestCommands ?? ''}` : `${'●'.repeat(l.difficulty)}`}</span>
            </button>`;
          })
          .join('');
        return `<div class="series-block"><h3>${s.title}</h3><div class="level-list">${rows}</div></div>`;
      })
      .join('');

    const modal = showModal({
      title: 'Levels',
      bodyHtml: `<p>Pick a challenge. Solved levels persist in this browser.</p>${body}`,
      actions: [{ label: 'Close', className: 'ghost', onClick: () => modal.close() }],
    });

    modal.el.querySelectorAll('[data-level]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.level!;
        modal.close();
        this.startLevel(id);
      });
    });
  }

  private startLevel(id: string): void {
    const level = allLevels.find((l) => l.id === id);
    if (!level) {
      this.pushErr(`Unknown level '${id}'`);
      return;
    }
    this.level = level;
    this.state = cloneState(level.startState);
    this.startSnapshot = cloneState(level.startState);
    this.golf = [];
    this.undoStack = [];
    this.solvedFlash = false;
    this.log = [];
    this.pushMeta(`Level ${level.id} — ${level.name}`);
    this.pushOut(level.objective);
    this.renderAll();
    this.showIntro(level);
    this.goalOpen = true;
    this.renderAll();
    this.terminal.focus();
  }

  private showIntro(level: LevelDef): void {
    if (!level.startDialog.length) return;
    let idx = 0;
    const show = () => {
      const slide = level.startDialog[idx];
      const actions = [];
      const modalRef: { close: () => void } = { close: () => undefined };
      if (idx > 0) {
        actions.push({
          label: 'Back',
          className: 'ghost',
          onClick: () => {
            idx -= 1;
            modalRef.close();
            show();
          },
        });
      }
      if (idx < level.startDialog.length - 1) {
        actions.push({
          label: 'Next',
          className: 'primary',
          onClick: () => {
            idx += 1;
            modalRef.close();
            show();
          },
        });
      } else {
        actions.push({
          label: 'Start level',
          className: 'primary',
          onClick: () => {
            modalRef.close();
            this.terminal.focus();
          },
        });
      }
      const m = showModal({
        title: slide.title ?? `Level ${level.id}`,
        bodyHtml: renderMarkdown(slide.markdown),
        actions,
        onClose: () => this.terminal.focus(),
      });
      modalRef.close = m.close;
    };
    show();
  }

  private enterSandbox(): void {
    this.level = null;
    this.state = sandboxState();
    this.startSnapshot = cloneState(this.state);
    this.golf = [];
    this.undoStack = [];
    this.solvedFlash = false;
    this.log = [];
    this.pushMeta('Sandbox mode.');
    this.renderAll();
    this.terminal.focus();
  }

  private resetLevel(): void {
    this.state = cloneState(this.startSnapshot);
    this.golf = [];
    this.undoStack = [];
    this.solvedFlash = false;
    this.pushMeta(this.level ? `Reset level ${this.level.id}.` : 'Reset sandbox.');
    this.renderAll();
    this.terminal.focus();
  }

  private showSolution(): void {
    if (!this.level) {
      this.pushMeta('Sandbox has no solution. Open Levels.');
      return;
    }
    const cmds = this.level.solution;
    showModal({
      title: `Solution — ${this.level.id}`,
      bodyHtml: renderMarkdown(
        [
          'Commands that solve this level:',
          '',
          '```',
          cmds.join('\n'),
          '```',
          '',
          'It will reset first, then run the solution.',
        ].join('\n'),
      ),
      actions: [
        { label: 'Cancel', className: 'ghost', onClick: () => this.terminal.focus() },
        {
          label: 'Run solution',
          className: 'primary',
          onClick: () => {
            this.resetLevel();
            for (const c of cmds) this.runCommand(c, { fromSolution: true });
            this.terminal.focus();
          },
        },
      ],
    });
  }

  private handleCommand(raw: string): void {
    const cmd = raw.trim();
    if (!cmd) return;
    this.log.push({ kind: 'cmd', text: cmd });
    this.terminal.setLog(this.log);

    // meta
    const lower = cmd.toLowerCase();
    if (lower === 'levels' || lower === 'level') {
      this.openLevels();
      return;
    }
    if (lower === 'sandbox' || lower === 'exit level') {
      this.enterSandbox();
      return;
    }
    if (lower === 'hint') {
      this.pushOut(this.level?.hint ?? 'No hint in sandbox. Open Levels.');
      return;
    }
    if (lower === 'show goal' || lower === 'goal') {
      this.toggleGoal(true);
      return;
    }
    if (lower === 'hide goal') {
      this.toggleGoal(false);
      return;
    }
    if (lower === 'show solution' || lower === 'solution') {
      this.showSolution();
      return;
    }
    if (lower === 'reset') {
      this.resetLevel();
      return;
    }
    if (lower === 'undo') {
      if (!this.undoStack.length) {
        this.pushErr('Nothing to undo.');
        return;
      }
      this.state = this.undoStack.pop()!;
      if (this.golf.length) this.golf.pop();
      this.pushMeta('Undo.');
      this.afterStateChange();
      return;
    }
    if (lower === 'clear') {
      this.log = [];
      this.terminal.clear();
      return;
    }
    if (lower === 'help level') {
      this.pushOut(this.level?.objective ?? 'No level.');
      return;
    }

    this.runCommand(cmd, { fromSolution: false });
  }

  private runCommand(cmd: string, opts: { fromSolution: boolean }): void {
    const prev = cloneState(this.state);
    const { state, result } = executeCommand(this.state, cmd);
    this.state = state;

    if (result.error) {
      this.pushErr(result.error);
    } else if (result.output) {
      this.pushOut(result.output);
    }

    const counts = commandCountsForGolf(cmd) && !result.error;
    if (counts && !opts.fromSolution) {
      this.undoStack.push(prev);
      this.golf.push(cmd);
    } else if (counts && opts.fromSolution) {
      this.undoStack.push(prev);
    }

    this.afterStateChange();
  }

  private afterStateChange(): void {
    if (this.level) {
      const { solved } = evaluateGoal(this.state, this.level.goal);
      const already = this.progress[this.level.id]?.solved ?? false;
      if (solved && !this.solvedFlash) {
        this.solvedFlash = true;
        const num = this.golf.length;
        const best = this.progress[this.level.id]?.bestCommands;
        const nextBest = best === undefined ? num : Math.min(best, num);
        this.progress[this.level.id] = { solved: true, bestCommands: nextBest };
        saveProgress(this.progress);
        this.pushOut('');
        this.pushOut(`*** LEVEL SOLVED *** ${this.level.name}`);
        this.pushOut(
          num > 0 ? `Commands used: ${num} (par ${this.level.par})` : `Par ${this.level.par}`,
        );
        this.goalOpen = true;
      } else if (!solved && this.solvedFlash) {
        this.solvedFlash = false;
      }
      if (solved && !already) {
        // auto offer next
      }
    }
    this.renderAll();
    if (this.solvedFlash && this.level) this.maybeOfferNext();
  }

  private offered = false;

  private maybeOfferNext(): void {
    if (!this.level || this.offered) return;
    this.offered = true;
    const next = getNextLevel(this.level.id);
    if (!next) {
      this.offered = false;
      return;
    }
    showModal({
      title: 'Level solved',
      bodyHtml: renderMarkdown(
        `**${this.level.name}** complete.\n\nCommand golf: ${this.golf.length || '—'} · par ${this.level.par}.\n\nNext up: **${next.id} — ${next.name}**.`,
      ),
      actions: [
        { label: 'Stay', className: 'ghost', onClick: () => { this.offered = false; this.terminal.focus(); } },
        {
          label: `Next: ${next.id}`,
          className: 'primary',
          onClick: () => {
            this.offered = false;
            this.startLevel(next.id);
          },
        },
      ],
      onClose: () => {
        this.offered = false;
        this.terminal.focus();
      },
    });
  }
}
