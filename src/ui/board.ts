import type { RepoState } from '../engine/types';
import { getLocale, ui } from '../i18n';

function esc(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** Translated zone name plus the English term so learners keep the DVC vocabulary. */
function zoneTitle(translated: string, english: string): string {
  if (getLocale() === 'en' || translated === english) return translated;
  return `${translated} (${english})`;
}

/** Simple inline markdown for board notes (code + bold only). */
function note(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function renderWorkspace(state: RepoState): string {
  const u = ui();
  const files = Object.values(state.files);
  if (!files.length) {
    return `<div class="empty-note">${note(u.workspaceEmpty)}</div>`;
  }
  const cards = files
    .map((f) => {
      const chips: string[] = [];
      if (f.tracked) chips.push('<span class="chip dvc">.dvc pointer</span>');
      if (f.gitignored) chips.push('<span class="chip">gitignored</span>');
      if (f.dirty) chips.push('<span class="chip warn">dirty</span>');
      if (state.gitStaged.includes(f.path)) chips.push('<span class="chip">git staged</span>');
      if (!f.present) chips.push('<span class="chip err">missing</span>');
      return `<div class="card">
        <div class="path">${esc(f.path)}</div>
        <div class="meta"><span class="chip ${f.kind}">${esc(f.kind)}</span>${chips.join('')}</div>
      </div>`;
    })
    .join('');
  return `<div class="cards">${cards}</div>`;
}

function renderCache(state: RepoState): string {
  const u = ui();
  if (!state.cache.length) {
    return `<div class="empty-note">${note(u.cacheEmpty)}</div>`;
  }
  const cards = state.cache
    .map((md5) => {
      const used = Object.values(state.files).some((f) => f.pointerMd5 === md5);
      return `<div class="card">
        <div class="path">files/md5/${esc(md5.slice(0, 2))}/${esc(md5.slice(2, 10))}…</div>
        <div class="meta"><span class="chip cache">cache</span><span>${used ? 'referenced' : 'unreferenced'}</span></div>
      </div>`;
    })
    .join('');
  return `<div class="cards">${cards}</div>`;
}

function renderRemote(state: RepoState): string {
  const u = ui();
  if (!state.remotes.length) {
    return `<div class="empty-note">${note(u.remoteEmpty)}</div>`;
  }
  const remoteCards = state.remotes
    .map(
      (r) => `<div class="card">
        <div class="path">${esc(r.name)}${r.isDefault ? ' (default)' : ''}</div>
        <div class="meta"><span class="chip remote">remote</span><span>${esc(r.url)}</span></div>
      </div>`,
    )
    .join('');

  const objects = state.remoteObjects.length
    ? state.remoteObjects
        .map(
          (md5) => `<div class="card">
            <div class="path">${esc(md5.slice(0, 12))}…</div>
            <div class="meta"><span class="chip remote">object</span></div>
          </div>`,
        )
        .join('')
    : `<div class="empty-note">${note(u.remoteNoObjects)}</div>`;

  return `<div class="cards">${remoteCards}${objects}</div>`;
}

function renderDag(state: RepoState): string {
  const u = ui();
  if (!state.pipeline.length) return '';
  const nodes = state.pipeline
    .map((s, i) => {
      const sep = i ? '<span class="arrow">→</span>' : '';
      return `${sep}<div class="stage-node ${s.upToDate ? 'up' : 'stale'}">
        <div><strong>${esc(s.name)}</strong>${s.frozen ? ' [frozen]' : ''}</div>
        <div class="cmd">${esc(s.cmd)}</div>
        <div class="cmd">outs: ${esc(s.outs.join(', ') || '—')}</div>
      </div>`;
    })
    .join('');
  return `<div class="dag" data-help-id="dag"><h2>${esc(u.pipelineTitle)}</h2><div class="stages">${nodes}</div>
    ${
      Object.keys(state.metrics).length
        ? `<div class="flow-arrow">metrics: ${esc(
            Object.entries(state.metrics)
              .map(([k, v]) => `${k}=${v}`)
              .join(' · '),
          )}</div>`
        : ''
    }
  </div>`;
}

export function renderBoardHtml(state: RepoState): string {
  const u = ui();
  return `
    <div class="status-bar" data-help-id="status-pills">
      <div class="pill ${state.initialized ? 'ok' : 'err'}">dvc <strong>${state.initialized ? 'init' : 'not initialized'}</strong></div>
      <div class="pill">remotes <strong>${state.remotes.length}</strong></div>
      <div class="pill">cache <strong>${state.cache.length}</strong></div>
      <div class="pill">remote objects <strong>${state.remoteObjects.length}</strong></div>
      <div class="pill">experiments <strong>${state.experiments.length}</strong></div>
    </div>
    <div class="board">
      <section class="zone workspace" data-help-id="workspace-zone" aria-label="${esc(zoneTitle(u.workspace, 'Workspace'))}">
        <h2><span class="dot" style="color:var(--text)"></span> ${esc(zoneTitle(u.workspace, 'Workspace'))}</h2>
        <p class="zone-hint">${esc(u.workspaceHint)}</p>
        <p class="zone-why">${note(u.workspaceWhy)}</p>
        ${renderWorkspace(state)}
      </section>
      <section class="zone cache" data-help-id="cache-zone" aria-label="${esc(zoneTitle(u.cache, 'Cache'))}">
        <h2><span class="dot"></span> ${esc(zoneTitle(u.cache, 'Cache'))}</h2>
        <p class="zone-hint">${esc(u.cacheHint)}</p>
        <p class="zone-why">${note(u.cacheWhy)}</p>
        ${renderCache(state)}
      </section>
      <section class="zone remote" data-help-id="remote-zone" aria-label="${esc(zoneTitle(u.remote, 'Remote'))}">
        <h2><span class="dot"></span> ${esc(zoneTitle(u.remote, 'Remote'))}</h2>
        <p class="zone-hint">${esc(u.remoteHint)}</p>
        <p class="zone-why">${note(u.remoteWhy)}</p>
        ${renderRemote(state)}
      </section>
    </div>
    <div class="flow-arrow" data-help-id="flow-arrow">${note(u.flowArrow)}</div>
    ${renderDag(state)}
  `;
}
