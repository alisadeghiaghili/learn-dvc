// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderBoardHtml } from '../src/ui/board';
import { emptyState, makeFile, sandboxState } from '../src/engine/state';
import { executeCommand } from '../src/engine/commands';
import { setLocale, ui } from '../src/i18n';
import type { RepoState } from '../src/engine/types';

let host: HTMLElement;

function render(state: RepoState): HTMLElement {
  host.innerHTML = renderBoardHtml(state);
  return host;
}

function pills(): string[] {
  return [...host.querySelectorAll('.status-bar .pill')].map((p) => p.textContent!.replace(/\s+/g, ' ').trim());
}

function zone(name: 'workspace' | 'cache' | 'remote'): HTMLElement {
  return host.querySelector(`.zone.${name}`) as HTMLElement;
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
});
afterEach(() => {
  setLocale('en');
  document.body.innerHTML = '';
});

describe('status bar', () => {
  it('flags an uninitialised project and shows zero counts', () => {
    render(emptyState());
    expect(pills()).toEqual([
      'dvc not initialized',
      'remotes 0',
      'cache 0',
      'remote objects 0',
      'experiments 0',
    ]);
    expect(host.querySelector('.pill.err')).not.toBeNull();
  });

  it('counts remotes, cache objects, remote objects and experiments', () => {
    const s = sandboxState();
    s.cache = ['aa11', 'bb22'];
    s.remoteObjects = ['cc33'];
    s.experiments = [{ id: 'e1', commitRef: 'h', params: {}, metrics: {} }];
    render(s);
    expect(pills()).toEqual(['dvc init', 'remotes 1', 'cache 2', 'remote objects 1', 'experiments 1']);
    expect(host.querySelector('.pill.ok')).not.toBeNull();
  });
});

describe('workspace zone', () => {
  it('shows the empty note for an empty workspace', () => {
    render(emptyState());
    expect(zone('workspace').querySelector('.empty-note')!.textContent).toBe(ui().workspaceEmpty.replaceAll('`', ''));
    expect(zone('workspace').querySelector('.empty-note code')!.textContent).toBe('dvc init');
  });

  it('lists every file with its kind and state chips', () => {
    const s = sandboxState();
    s.files['data/data.xml'] = makeFile('data/data.xml', 'data', { tracked: true, gitignored: true, dirty: true, pointerMd5: 'x' });
    s.files['raw.csv'] = makeFile('raw.csv', 'data', { present: false });
    s.gitStaged = ['src/train.py'];
    render(s);
    const cards = [...zone('workspace').querySelectorAll('.card')];
    const byPath = Object.fromEntries(
      cards.map((c) => [c.querySelector('.path')!.textContent, [...c.querySelectorAll('.chip')].map((x) => x.textContent)]),
    );
    expect(byPath['data/data.xml']).toEqual(['data', '.dvc pointer', 'gitignored', 'dirty']);
    expect(byPath['raw.csv']).toEqual(['data', 'missing']);
    expect(byPath['src/train.py']).toEqual(['code', 'git staged']);
    expect(byPath['params.yaml']).toEqual(['params']);
  });

  it('escapes file names', () => {
    const s = emptyState();
    s.files['<b>x</b>.txt'] = makeFile('<b>x</b>.txt', 'data');
    render(s);
    expect(zone('workspace').querySelector('.card b')).toBeNull();
    expect(zone('workspace').querySelector('.card .path')!.textContent).toBe('<b>x</b>.txt');
  });
});

describe('cache zone', () => {
  it('explains an empty cache', () => {
    render(emptyState());
    expect(zone('cache').querySelector('.empty-note')!.textContent).toContain('Cache empty');
  });

  it('shows objects in the content-addressed layout and whether a file still references them', () => {
    const s = emptyState();
    s.files['d'] = makeFile('d', 'data', { tracked: true, pointerMd5: 'abcdef0123456789' });
    s.cache = ['abcdef0123456789', '9988776655443322'];
    render(s);
    const cards = [...zone('cache').querySelectorAll('.card')].map((c) => [
      c.querySelector('.path')!.textContent,
      c.querySelector('.meta')!.textContent,
    ]);
    expect(cards).toEqual([
      ['files/md5/ab/cdef0123…', 'cachereferenced'],
      ['files/md5/99/88776655…', 'cacheunreferenced'],
    ]);
  });
});

describe('remote zone', () => {
  it('prompts to add a remote when none exists', () => {
    render(emptyState());
    expect(zone('remote').querySelector('.empty-note')!.textContent).toBe(ui().remoteEmpty.replaceAll('`', ''));
  });

  it('lists remotes (marking the default) and tells you when nothing has been pushed', () => {
    const s = emptyState();
    s.remotes = [
      { name: 'origin', url: 's3://bucket', isDefault: true },
      { name: 'backup', url: '/mnt/backup', isDefault: false },
    ];
    render(s);
    const cards = [...zone('remote').querySelectorAll('.card')].map((c) => [
      c.querySelector('.path')!.textContent,
      c.querySelector('.meta span:last-child')!.textContent,
    ]);
    expect(cards).toEqual([
      ['origin (default)', 's3://bucket'],
      ['backup', '/mnt/backup'],
    ]);
    expect(zone('remote').querySelector('.empty-note')!.textContent).toContain('No objects uploaded yet');
  });

  it('lists pushed objects by shortened md5', () => {
    const s = sandboxState();
    s.remoteObjects = ['0123456789abcdef0123'];
    render(s);
    const paths = [...zone('remote').querySelectorAll('.card .path')].map((p) => p.textContent);
    expect(paths).toContain('0123456789ab…');
    expect(zone('remote').querySelector('.empty-note')).toBeNull();
  });
});

describe('pipeline strip', () => {
  it('is absent without stages', () => {
    render(sandboxState());
    expect(host.querySelector('.dag')).toBeNull();
  });

  it('draws stages in order with up-to-date / stale styling, frozen tags and outputs', () => {
    const s = sandboxState();
    s.pipeline = [
      { name: 'prepare', deps: [], outs: ['data/prepared.csv'], cmd: 'python prepare.py', params: [], metrics: [], frozen: false, upToDate: true },
      { name: 'train', deps: [], outs: [], cmd: 'python train.py', params: [], metrics: [], frozen: true, upToDate: false },
    ];
    render(s);
    const nodes = [...host.querySelectorAll('.stage-node')];
    expect(nodes.map((n) => n.className)).toEqual(['stage-node up', 'stage-node stale']);
    expect(nodes[0]!.textContent).toContain('prepare');
    expect(nodes[0]!.textContent).toContain('outs: data/prepared.csv');
    expect(nodes[1]!.textContent).toContain('[frozen]');
    expect(nodes[1]!.textContent).toContain('outs: —');
    expect(host.querySelectorAll('.stages .arrow')).toHaveLength(1);
    expect(host.querySelector('.dag h2')!.textContent).toBe(ui().pipelineTitle);
    expect(host.querySelector('.dag .flow-arrow')).toBeNull();
  });

  it('summarises metrics under the strip once they exist', () => {
    const s = sandboxState();
    s.pipeline = [
      { name: 'train', deps: [], outs: [], cmd: 'python train.py', params: [], metrics: [], frozen: false, upToDate: true },
    ];
    s.metrics = { acc: 0.9, loss: 0.1 };
    render(s);
    expect(host.querySelector('.dag .flow-arrow')!.textContent).toBe('metrics: acc=0.9 · loss=0.1');
  });
});

describe('board driven by real commands', () => {
  it('shows a tracked file, its cache object and the remote copy after add and push', () => {
    let s = sandboxState();
    s = executeCommand(s, 'dvc add data/data.xml').state;
    s = executeCommand(s, 'dvc push').state;
    render(s);
    const dataCard = [...zone('workspace').querySelectorAll('.card')].find(
      (c) => c.querySelector('.path')!.textContent === 'data/data.xml',
    )!;
    expect([...dataCard.querySelectorAll('.chip')].map((c) => c.textContent)).toEqual(
      expect.arrayContaining(['.dvc pointer', 'gitignored']),
    );
    expect(zone('cache').querySelectorAll('.card')).toHaveLength(1);
    expect(zone('cache').textContent).toContain('referenced');
    expect(zone('remote').querySelectorAll('.card .chip.remote')).toHaveLength(2);
  });
});

describe('localisation', () => {
  it('shows the translated zone name followed by the English DVC term', () => {
    setLocale('fa');
    render(emptyState());
    expect(zone('workspace').querySelector('h2')!.textContent!.trim()).toBe('فضای کاری (Workspace)');
    expect(zone('workspace').getAttribute('aria-label')).toBe('فضای کاری (Workspace)');
    expect(zone('cache').querySelector('h2')!.textContent!.trim()).toBe('کش (Cache)');
  });

  it('does not repeat a term that is identical in the other language', () => {
    setLocale('de');
    render(emptyState());
    expect(zone('workspace').querySelector('h2')!.textContent!.trim()).toBe('Workspace');
  });

  it('does not repeat the English term in English', () => {
    render(emptyState());
    expect(zone('cache').querySelector('h2')!.textContent!.trim()).toBe('Cache');
  });
});

describe('help anchors', () => {
  it('tags the regions the guided tour points at', () => {
    const s = sandboxState();
    s.pipeline = [
      { name: 'a', deps: [], outs: [], cmd: 'x', params: [], metrics: [], frozen: false, upToDate: true },
    ];
    render(s);
    const ids = [...host.querySelectorAll('[data-help-id]')].map((e) => e.getAttribute('data-help-id'));
    expect(ids).toEqual(['status-pills', 'workspace-zone', 'cache-zone', 'remote-zone', 'flow-arrow', 'dag']);
  });
});
