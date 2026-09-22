export interface UiElementDoc {
  selector: string;
  id: string;
  title: string;
  what: string;
  how: string;
}

export const UI_ELEMENTS: UiElementDoc[] = [
  {
    id: 'level-title',
    selector: '.level-title',
    title: 'Current context strip',
    what: 'Shows sandbox mode or the active level id/name and **ideal command count** (how many commands the clean solution uses).',
    how: 'Read it to confirm which level you are on. “Ideal: 3 commands” = golf target, not a hard limit.',
  },
  {
    id: 'toolbar',
    selector: '.toolbar-actions',
    title: 'Toolbar buttons',
    what: [
      '**Levels** — open the challenge browser / packs. Each row shows **difficulty dots** (1–5 filled ●) and **ideal command count**.',
      '**Guide** — pulse/scroll the always-on right guide panel.',
      '**Hint** — print remaining solution steps in the terminal.',
      '**Solution** — show official commands (can run them).',
      '**Undo** — revert last successful command.',
      '**Reset** — restart this level/sandbox to its start state.',
      '**Sandbox** — leave the level and free-play.',
      '**Help** — UI element map (also `help ui`).',
    ].join('\n'),
    how: 'The right Guide panel is **always open** and spans the full page height — you do not need to open it first. Dots = how many DVC ideas a level stacks (difficulty), not progress.',
  },
  {
    id: 'dock',
    selector: '.dock',
    title: 'Right guide panel (always on)',
    what: [
      'Full-height column on the right of the whole app.',
      '**You are learning** — concepts for this level.',
      '**In production (field notes)** — what engineers do with this skill.',
      '**Type next** — first unfinished official command.',
      '**Checklist** — every solution command; orange neon = current step.',
      'Green ✓ = done (sticky after mistakes unless the effect is undone).',
    ].join('\n'),
    how: 'Keep it in view while typing. It never collapses on desktop; on narrow screens it docks under the board.',
  },
  {
    id: 'status-pills',
    selector: '.status-bar',
    title: 'Status pills (top of board)',
    what: 'Quick health: DVC initialized?, remote count, cache object count, remote object count, experiment count.',
    how: 'After push, remote objects should rise. After add, cache should rise.',
  },
  {
    id: 'workspace-zone',
    selector: '.zone.workspace',
    title: 'Workspace zone',
    what: 'Files on disk in the simulated project: raw data, code, params, `.dvc` pointer files, `dvc.yaml`.',
    how: [
      'Chips explain state:',
      '• **.dvc pointer** — DVC tracks this path (Git should track only the `.dvc` file)',
      '• **gitignored** — raw data excluded from Git on purpose',
      '• **dirty** — bytes ≠ pointer md5 (run `dvc status`)',
      '• **git staged** — ready for `git commit`',
      '• **missing** — file not present (need pull/checkout)',
    ].join('\n'),
  },
  {
    id: 'cache-zone',
    selector: '.zone.cache',
    title: 'Cache zone',
    what: 'Local `.dvc/cache` objects — content-addressed copies of tracked data (md5).',
    how: '`dvc add`/`commit` fill it. `dvc checkout`/`pull` read from it. Same bytes = one object.',
  },
  {
    id: 'remote-zone',
    selector: '.zone.remote',
    title: 'Remote zone',
    what: 'Configured DVC remotes + objects uploaded with `dvc push`.',
    how: 'Empty remote objects + populated cache ⇒ you still need to push before teammates can pull.',
  },
  {
    id: 'flow-arrow',
    selector: '.flow-arrow',
    title: 'Material flow caption',
    what: 'One-line reminder: workspace ⇄ cache ⇄ remote.',
    how: 'Ask “where are the bytes?” using this direction when debugging.',
  },
  {
    id: 'dag',
    selector: '.dag',
    title: 'Pipeline strip',
    what: 'Stages from `dvc.yaml` with cmd/outs. Green/up = current; warn = stale/needs repro.',
    how: '`dvc dag`, `dvc repro`. Params/metrics summary appears when produced.',
  },
  {
    id: 'term-log',
    selector: '.term-log',
    title: 'Terminal log',
    what: 'Command echo, outputs, errors, coach lines, Why blocks, celebration text.',
    how: 'Scroll for `── Why: … ──` after important DVC commands.',
  },
  {
    id: 'term-hint',
    selector: '.term-hint',
    title: 'Hint strip above input',
    what: 'Shows the next official command and Tab-cycle options.',
    how: 'Orange `now` chip in the dock matches this “next” step.',
  },
  {
    id: 'term-ghost',
    selector: '.term-input-wrap',
    title: 'Prompt + ghost completion',
    what: [
      '`dvc $` prompt.',
      'Placeholder: next command when empty (single cue).',
      'Ghost: remainder of the **current word** when typing.',
      'Tab: complete **one word** (bash-like). ↑/↓ history. Esc clears input.',
    ].join('\n'),
    how: 'Type `dvc ` then Tab repeatedly to see subcommand words cycle.',
  },
];

export function formatUiHelpText(): string {
  return [
    'Page map — what each UI region does',
    '',
    ...UI_ELEMENTS.map((e, i) => `${i + 1}. ${e.title}\n   ${e.what.replace(/\n/g, '\n   ')}`),
    '',
    'Commands: `help ui` · `help` · `curriculum` · `concepts` · `levels`',
  ].join('\n');
}

export function uiHelpModalHtml(): string {
  const sections = UI_ELEMENTS.map(
    (e) => `
      <section class="ui-help-item" data-help-id="${e.id}">
        <h3>${e.title}</h3>
        <div class="ui-help-what">${formatInline(e.what)}</div>
        <div class="ui-help-how"><strong>Use it:</strong> ${formatInline(e.how)}</div>
      </section>
    `,
  ).join('');
  return `<div class="ui-help">${sections}</div>`;
}

function formatInline(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

/** Outline live regions briefly so learners connect docs to pixels. */
export function startUiTour(root: ParentNode): () => void {
  root.querySelectorAll('.ui-tour-on').forEach((el) => el.classList.remove('ui-tour-on'));
  const nodes = UI_ELEMENTS.map((e) => root.querySelector(e.selector)).filter(Boolean) as Element[];
  nodes.forEach((n) => n.classList.add('ui-tour-on'));
  const stop = () => {
    nodes.forEach((n) => n.classList.remove('ui-tour-on'));
  };
  window.setTimeout(stop, 6000);
  return stop;
}
