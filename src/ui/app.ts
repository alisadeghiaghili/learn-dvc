import type { LevelDef, LevelProgress, RepoState } from '../engine/types';
import { cloneState, sandboxState } from '../engine/state';
import { commandCountsForGolf, executeCommand } from '../engine/commands';
import { evaluateGoal } from '../engine/compare';
import { solutionComplete, solutionProgress } from '../engine/solution';
import { coachLine, nextSteps } from '../engine/coach';
import { allLevels, getNextLevel, seriesOf } from '../levels';
import { renderBoardHtml } from './board';
import { TerminalView, type LogLine } from './terminal';
import { renderMarkdown, showModal } from './dialog';
import { buildShareTargets, copySharePayload, openShareWindow } from './share';

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

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
  private lastWasMeta = false;
  private lastWasSolution = false;

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
    const level = this.level;
    const steps = solutionProgress(this.state, level.solution);
    const solved = solutionComplete(this.state, level.solution);
    // Declarative goal checks are secondary notes — solution is the checklist.
    const { statuses } = evaluateGoal(this.state, level.goal);
    const items = steps.map((s) => {
      return `<li class="${s.done ? 'met' : ''}${s.optional ? ' optional' : ''}">
        <div class="g-label">${s.done ? '✓' : '○'} <code>${escapeHtml(s.command)}</code>${
          s.optional ? ' <span class="chip">optional</span>' : ''
        }</div>
        <div class="g-detail">${escapeHtml(s.note)}</div>
      </li>`;
    });
    const remaining = nextSteps(this.state, level.goal, level);
    const firstNext = remaining[0]?.command;
    const nextBlock = solved
      ? `<div class="next-box met">All solution steps met.</div>`
      : `<div class="next-box">
            <div class="next-title">Type next</div>
            <div class="next-row"><span class="g-label">○ remaining</span>${
              firstNext ? `<code class="g-cmd">${escapeHtml(firstNext)}</code>` : ''
            }</div>
            <div class="par-note">Checklist above is the official solution. Also: <code>steps</code> · <code>hint</code> · <code>show solution</code></div>
          </div>`;
    const extra = statuses.filter((s) => !s.met);
    const prog = this.progress[level.id];
    const golfNote = prog?.bestCommands !== undefined ? `Best: ${prog.bestCommands} cmd · par ${level.par}` : `par ${level.par}`;
    this.dockEl.innerHTML = `
      <h2>${level.name}</h2>
      <p class="objective">${level.objective}</p>
      <div class="par-note">${golfNote}${solved ? ' · SOLVED' : ''}</div>
      ${this.solvedFlash ? `<div class="solved-banner">Level solved${this.golf.length ? ` in ${this.golf.length} command(s)` : ''}.</div>` : ''}
      ${nextBlock}
      <ul class="goal-list">${items.join('')}</ul>
      ${extra.length && !solved ? `<div class="par-note">State notes: ${extra.map((s) => escapeHtml(s.label)).join(' · ')}</div>` : ''}
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
    const coach = coachLine(this.state, level);
    if (coach) this.pushMeta(coach);
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
    if (this.level) {
      const coach = coachLine(this.state, this.level);
      if (coach) this.pushMeta(coach);
    }
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
    this.lastWasMeta = true;
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
      if (this.level) {
        const coach = coachLine(this.state, this.level);
        if (coach) this.pushMeta(coach);
      }
      return;
    }
    if (lower === 'steps' || lower === 'next') {
      if (!this.level) {
        this.pushMeta('Sandbox has no goal. Open Levels for a challenge.');
        return;
      }
      const coach = coachLine(this.state, this.level);
      this.pushOut(coach ?? 'All solution steps are met.');
      this.goalOpen = true;
      this.renderAll();
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
    this.lastWasMeta = false;
    this.lastWasSolution = opts.fromSolution;
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

    // Celebration modal may open on solve — steal focus from the terminal
    // input so a keyup Enter does not "click" a modal action.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.afterStateChange();
  }

  private afterStateChange(): void {
    if (this.level) {
      const solved = solutionComplete(this.state, this.level.solution);
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
      // After a real command in a level, always surface the next concrete step.
      if (this.level && !solved && !this.lastWasMeta && !this.lastWasSolution) {
        const coach = coachLine(this.state, this.level);
        if (coach) {
          const first = nextSteps(this.state, this.level.goal, this.level)[0];
          if (first?.command) {
            this.pushMeta(`Next: ${first.command}`);
          } else {
            this.pushMeta(coach.split('\n')[0] ?? 'Continue the level goal.');
          }
        }
      }
    }
    this.renderAll();
    if (this.solvedFlash && this.level) this.maybeOfferNext();
  }

  private offered = false;

  private maybeOfferNext(): void {
    if (!this.level || this.offered) return;
    this.offered = true;

    const level = this.level;
    const next = getNextLevel(level.id);
    const cmds = this.golf.length || null;
    const share = buildShareTargets({
      levelName: level.name,
      levelId: level.id,
      commands: cmds,
      par: level.par,
    });
    const total = allLevels.length;
    const solvedCount = Object.values(this.progress).filter((p) => p.solved).length;
    const underPar = cmds !== null && cmds <= level.par;
    const golfLine =
      cmds === null
        ? `Par for this level: ${level.par}`
        : underPar
          ? `You did it in **${cmds}** command${cmds === 1 ? '' : 's'} — at or under par (${level.par}).`
          : `You did it in **${cmds}** command${cmds === 1 ? '' : 's'}. Par is ${level.par}.`;

    const bodyHtml = `
      <div class="celebrate" aria-live="polite">
        <div class="celebrate-badge">SOLVED</div>
        <h3 class="celebrate-title">${escapeHtml(level.name)}</h3>
        <p class="celebrate-sub">${escapeHtml(level.seriesTitle)} · <code>${escapeHtml(level.id)}</code> · progress ${solvedCount}/${total}</p>
        <p class="celebrate-msg">You finished this level. Share the win — teaching solidifies learning.</p>
        <div class="celebrate-stats">${renderMarkdown(golfLine)}</div>
        <div class="share-block">
          <div class="next-title">Share this achievement</div>
          <div class="share-row" role="group" aria-label="Share on social networks">
            <button type="button" class="share-btn linkedin" data-share="linkedin">LinkedIn</button>
            <button type="button" class="share-btn x" data-share="x">X / Twitter</button>
            <button type="button" class="share-btn facebook" data-share="facebook">Facebook</button>
            <button type="button" class="share-btn copy" data-share="copy">Copy text</button>
          </div>
          <div class="share-status" data-share-status hidden></div>
        </div>
        ${
          next
            ? `<div class="celebrate-next">Next up: <strong>${escapeHtml(next.id)}</strong> — ${escapeHtml(next.name)}</div>`
            : `<div class="celebrate-next">That was the last level in this pack. Open <strong>Levels</strong> to replay or try another series.</div>`
        }
      </div>
    `;

    const actions = [
      {
        label: 'Stay here',
        className: 'ghost',
        onClick: () => {
          this.offered = false;
          this.terminal.focus();
        },
      },
    ];
    if (next) {
      actions.push({
        label: `Next level: ${next.id}`,
        className: 'primary',
        onClick: () => {
          this.offered = false;
          this.startLevel(next.id);
        },
      });
    } else {
      actions.push({
        label: 'Browse levels',
        className: 'primary',
        onClick: () => {
          this.offered = false;
          this.openLevels();
        },
      });
    }

    const modal = showModal({
      title: 'Level complete',
      bodyHtml,
      actions: actions.map((a) => ({
        ...a,
        onClick: () => {
          modal.close();
          a.onClick();
        },
      })),
      onClose: () => {
        this.offered = false;
        this.terminal.focus();
      },
    });

    modal.el.querySelectorAll<HTMLButtonElement>('[data-share]').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const kind = btn.dataset.share;
        const status = modal.el.querySelector<HTMLElement>('[data-share-status]');
        if (kind === 'linkedin') openShareWindow(share.linkedin);
        else if (kind === 'x') openShareWindow(share.x);
        else if (kind === 'facebook') openShareWindow(share.facebook);
        else if (kind === 'copy') {
          const ok = await copySharePayload(share.text, share.url);
          if (status) {
            status.hidden = false;
            status.textContent = ok
              ? 'Copied. Paste it anywhere.'
              : 'Could not copy — select the share text manually.';
          }
          return;
        }
        if (status && kind !== 'copy') {
          status.hidden = false;
          status.textContent = 'Share window opened (popup blocked? allow popups for this site).';
        }
      });
    });

    // Keep the celebration on screen; ignore accidental Enter on dialog chrome.
    modal.el.querySelector('.modal')?.addEventListener('keydown', (ev) => {
      const key = (ev as KeyboardEvent).key;
      if (key === 'Enter') {
        ev.preventDefault();
        ev.stopPropagation();
      }
    });
  }
}
