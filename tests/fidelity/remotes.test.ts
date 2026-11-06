import { describe, expect, it } from 'vitest';
import { makeFile } from '../../src/engine/state';
import { run, setup, startOf } from './helpers';

/** cache-1 start (default remote `myremote` already holds v0) + a new, un-pushed v1 in cache. */
function withUnpushedV1() {
  return setup(startOf('cache-1'), 'edit data/data.xml', 'dvc add data/data.xml');
}

// https://doc.dvc.org/command-reference/push#-r
describe('dvc push -r <remote>', () => {
  it('dvc push -r nonexistent fails (unknown remote) and uploads nothing', () => {
    const s = withUnpushedV1();
    const { last, state } = run(s, 'dvc push -r nonexistent');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/nonexistent|does not exist|unknown/i);
    expect(state.remoteObjects).toEqual(s.remoteObjects);
  });

  // MODEL GAP: RepoState.remoteObjects is ONE flat set shared by every remote.
  // The engine must become per-remote (e.g. Record<remoteName, string[]>) for this to be
  // fully assertable; until then we only require that the output names the chosen remote.
  it('dvc push -r second reports pushing to `second` (not the default `myremote`)', () => {
    const s = setup(withUnpushedV1(), 'dvc remote add second /tmp/second');
    const { last } = run(s, 'dvc push -r second');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/second/);
    expect(last.text).not.toMatch(/myremote/);
  });
});

// https://doc.dvc.org/command-reference/status#-c
describe('dvc status --cloud', () => {
  it('dvc status -c after edit+add but before push lists the path as new/missing on the remote', () => {
    const { last } = run(withUnpushedV1(), 'dvc status -c');
    expect(last.text).toMatch(/new|missing/i);
    expect(last.text).toMatch(/data\/data\.xml/);
  });

  it('(regression) dvc status -c after dvc push reports up to date / in sync', () => {
    const { last } = run(withUnpushedV1(), 'dvc push', 'dvc status -c');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/up to date|in sync/i);
  });
});

// https://doc.dvc.org/command-reference/pull#options  (targets limit what is downloaded)
describe('dvc pull <target>', () => {
  it('restores only the requested target and leaves other tracked files missing', () => {
    const base = startOf('basics-2');
    base.files['data/other.csv'] = makeFile('data/other.csv', 'data');
    base.remotes.push({ name: 'myremote', url: '/tmp/dvcstore', isDefault: true });
    const s = setup(
      base,
      'dvc add data/data.xml',
      'dvc add data/other.csv',
      'dvc push',
      'rm data/data.xml',
      'rm data/other.csv',
    );
    expect(s.files['data/data.xml']!.present).toBe(false);
    expect(s.files['data/other.csv']!.present).toBe(false);
    const { last, state } = run(s, 'dvc pull data/data.xml');
    expect(last.result.ok).toBe(true);
    expect(state.files['data/data.xml']!.present).toBe(true);
    expect(state.files['data/other.csv']!.present).toBe(false);
  });
});
