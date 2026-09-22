export function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderInline(raw: string): string {
  let t = escapeHtml(raw);
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return t;
}

function isTableRow(line: string): boolean {
  const s = line.trim();
  return s.startsWith('|') && s.endsWith('|') && s.length >= 3;
}

function isTableSeparator(line: string): boolean {
  const s = line.trim();
  return /^\|[\s:|-]+\|$/.test(s) && s.includes('-');
}

function splitTableRow(line: string): string[] {
  const s = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return s.split('|').map((c) => c.trim());
}

function renderTable(rows: string[]): string {
  if (rows.length < 2) return '';
  const header = splitTableRow(rows[0]!);
  const body = rows.slice(2);
  const headHtml = header.map((h) => `<th>${renderInline(h)}</th>`).join('');
  const bodyHtml = body
    .map((r) => `<tr>${splitTableRow(r).map((c) => `<td>${renderInline(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<div class="md-table-wrap"><table class="md-table"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
}

function renderProse(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let para: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    out.push(`<p>${para.map(renderInline).join('<br/>')}</p>`);
    para = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1]!)) {
      flushPara();
      const rows = [line, lines[i + 1]!];
      i += 2;
      while (i < lines.length && isTableRow(lines[i]!) && !isTableSeparator(lines[i]!)) {
        rows.push(lines[i]!);
        i += 1;
      }
      out.push(renderTable(rows));
      continue;
    }
    if (!line.trim()) {
      flushPara();
      i += 1;
      continue;
    }
    para.push(line);
    i += 1;
  }
  flushPara();
  return out.join('');
}

/**
 * Markdown subset used in dialogs: fenced code, tables, bold, inline code, paragraphs.
 */
export function renderMarkdown(md: string): string {
  const blocks = md.split(/```/);
  let html = '';
  blocks.forEach((block, i) => {
    if (i % 2 === 1) {
      html += `<pre>${escapeHtml(block.replace(/^\w*\n/, ''))}</pre>`;
      return;
    }
    html += renderProse(block);
  });
  return html;
}

export interface ModalAction {
  label: string;
  className?: string;
  onClick: () => void;
}

export function showModal(opts: {
  title: string;
  bodyHtml: string;
  actions?: ModalAction[];
  onClose?: () => void;
  variant?: 'default' | 'celebrate';
}): { close: () => void; el: HTMLElement } {
  const overlay = document.createElement('div');
  overlay.className = `overlay${opts.variant === 'celebrate' ? ' overlay-celebrate' : ''}`;
  const titleClass = opts.variant === 'celebrate' ? ' class="visually-hidden"' : '';
  overlay.innerHTML = `
    <div class="modal${opts.variant === 'celebrate' ? ' modal-celebrate' : ''}" role="dialog" aria-modal="true" aria-label="${escapeHtml(opts.title)}">
      <h2${titleClass}>${escapeHtml(opts.title)}</h2>
      <div class="markdown">${opts.bodyHtml}</div>
      <div class="modal-actions"></div>
    </div>
  `;
  const actionsEl = overlay.querySelector('.modal-actions') as HTMLElement;
  const close = () => {
    overlay.remove();
    opts.onClose?.();
  };

  const actions = opts.actions?.length
    ? opts.actions
    : [{ label: 'Close', onClick: () => close() }];

  for (const action of actions) {
    const btn = document.createElement('button');
    btn.className = action.className ?? '';
    btn.textContent = action.label;
    btn.addEventListener('click', () => {
      action.onClick();
      // actions may close themselves via showModal handle; always remove overlay after
      if (document.body.contains(overlay)) overlay.remove();
    });
    actionsEl.appendChild(btn);
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.body.appendChild(overlay);
  // Focus the dialog shell, not an action button: a trailing Enter from the
  // terminal would otherwise activate "Stay here" and dismiss the celebration.
  const modalEl = overlay.querySelector<HTMLElement>('.modal');
  if (modalEl) {
    modalEl.tabIndex = -1;
    requestAnimationFrame(() => modalEl.focus());
  }
  return { close, el: overlay };
}
