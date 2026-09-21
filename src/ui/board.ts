import type { RepoState } from '../engine/types';
import { computeDirtyPaths } from '../engine/state';
import { shortMd5 } from '../engine/hash';

function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderWorkspace(state: RepoState): string {
  const dirty = new Set(computeDirtyPaths(state));
  const staged = new Set(state.gitStaged);
  const files = Object.values(state.files)
    .filter((f) => f.present || f.tracked)
    .sort((a, b) => a.path.localeCompare(b.path));

  if (!files.length) {
    return `<div class="empty-note">Workspace empty — run <code>dvc init</code> or load a level.</div>`;
  }

  const cards = files
    .map((f) => {
      const chips: string[] = [];
      if (f.path.startsWith('.dvc/')) chips.push('<span class="chip dvc">dvc meta</span>');
      if (f.tracked) chips.push('<span class="chip dvc">.dvc pointer</span>');
      if (f.gitignored) chips.push('<span class="chip">gitignored</span>');
      if (f.kind === 'code') chips.push('<span class="chip code">code</span>');
      if (f.kind === 'params') chips.push('<span class="chip code">params</span>');
      if (f.kind === 'yaml') chips.push('<span class="chip code">dvc.yaml</span>');
      if (f.kind === 'dvc') chips.push('<span class="chip dvc">pointer file</span>');
      if (staged.has(f.path) || (f.tracked && staged.has(`${f.path}.dvc`))) {
        chips.push('<span class="chip ok">git staged</span>');
      } else if (
        state.initialized &&
        (f.path === '.dvc/config' || f.path === '.dvc/.gitignore') &&
        !state.gitCommits.some((c) => c.message.includes('Initialize DVC'))
      ) {
        chips.push('<span class="chip warn">needs git commit</span>');
      } else if (f.tracked && f.pointerMd5 && state.gitCommits.some((c) => c.pointers[f.path])) {
        chips.push('<span class="chip ok">in git history</span>');
      }
      if (dirty.has(f.path)) chips.push('<span class="chip warn">dirty</span>');
      if (f.tracked && f.pointerMd5 && !dirty.has(f.path) && f.present) {
        chips.push('<span class="chip ok">clean</span>');
      }
      const meta = f.pointerMd5
        ? `pointer ${esc(shortMd5(f.pointerMd5))}… · content ${esc(shortMd5(f.contentId))}…`
        : esc(f.kind);
      return `<div class="card ${f.present ? '' : 'missing'}" data-path="${esc(f.path)}">
        <div class="path">${esc(f.path)}${f.present ? '' : ' (missing)'}</div>
        <div class="meta">${chips.join('')}<span>${meta}</span></div>
      </div>`;
    })
    .join('');

  return `<div class="cards">${cards}</div>`;
}

function renderCache(state: RepoState): string {
  if (!state.cache.length) {
    return `<div class="empty-note">Cache empty. <code>dvc add</code> stores objects here.</div>`;
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
  if (!state.remotes.length) {
    return `<div class="empty-note">No remote. <code>dvc remote add -d &lt;name&gt; &lt;url&gt;</code></div>`;
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
    : `<div class="empty-note">No objects uploaded yet — <code>dvc push</code>.</div>`;

  return `<div class="cards">${remoteCards}${objects}</div>`;
}

function renderDag(state: RepoState): string {
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
  return `<div class="dag" data-help-id="dag"><h2>Pipeline · dvc.yaml</h2><div class="stages">${nodes}</div>
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
  return `
    <div class="status-bar" data-help-id="status-pills">
      <div class="pill ${state.initialized ? 'ok' : 'err'}">dvc <strong>${state.initialized ? 'init' : 'not initialized'}</strong></div>
      <div class="pill">remotes <strong>${state.remotes.length}</strong></div>
      <div class="pill">cache <strong>${state.cache.length}</strong></div>
      <div class="pill">remote objects <strong>${state.remoteObjects.length}</strong></div>
      <div class="pill">experiments <strong>${state.experiments.length}</strong></div>
    </div>
    <div class="board">
      <section class="zone workspace" data-help-id="workspace-zone" aria-label="Workspace">
        <h2><span class="dot" style="color:var(--text)"></span> Workspace</h2>
        <p class="zone-hint">Working tree · pointers · code</p>
        ${renderWorkspace(state)}
      </section>
      <section class="zone cache" data-help-id="cache-zone" aria-label="Cache">
        <h2><span class="dot"></span> Cache</h2>
        <p class="zone-hint">.dvc/cache — content-addressed objects</p>
        ${renderCache(state)}
      </section>
      <section class="zone remote" data-help-id="remote-zone" aria-label="Remote">
        <h2><span class="dot"></span> Remote</h2>
        <p class="zone-hint">Shared storage for heavy data</p>
        ${renderRemote(state)}
      </section>
    </div>
    <div class="flow-arrow" data-help-id="flow-arrow">material flow: workspace ⇄ cache ⇄ remote</div>
    ${renderDag(state)}
  `;
}
