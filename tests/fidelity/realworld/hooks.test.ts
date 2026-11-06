import { describe, expect, it } from 'vitest';
import { emptyState } from '../../../src/engine/state';
import { run, setup } from '../helpers';
import { trackedRepo, trackedRepoWithRemote } from './fixtures';
import { PROD_LEVELS, levelContract } from './level-contract';

const NOT_UNKNOWN = /unknown command/i;

/** repo with data v0 committed, then v1 committed on top (HEAD). */
function twoVersions(base = trackedRepo()) {
  return setup(
    base,
    'edit data/data.xml',
    'dvc add data/data.xml',
    'git add data/data.xml.dvc',
    'git commit -m "data v1"',
  );
}

// https://doc.dvc.org/command-reference/install
describe('dvc install', () => {
  it('fails outside a Git repository, naming Git as the reason', () => {
    const { last } = run(emptyState(), 'dvc install');
    expect(last.result.ok).toBe(false);
    expect(last.text).not.toMatch(NOT_UNKNOWN);
    expect(last.text).toMatch(/git/i);
  });

  it('inside a Git repo it succeeds and reports the three hooks and what each runs', () => {
    const { last } = run(trackedRepo(), 'dvc install');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/pre-commit[^\n]*dvc status/i);
    expect(last.text).toMatch(/post-checkout[^\n]*dvc checkout/i);
    expect(last.text).toMatch(/pre-push[^\n]*dvc push/i);
  });

  it('a second `dvc install` fails because the hook files already exist', () => {
    const { last } = run(trackedRepo(), 'dvc install', 'dvc install');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/already exist/i);
  });

  it('accepts --use-pre-commit-tool and says it wrote .pre-commit-config.yaml', () => {
    const { last } = run(trackedRepo(), 'dvc install --use-pre-commit-tool');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/\.pre-commit-config\.yaml/);
  });

  it('rejects unknown options like argparse', () => {
    const { last } = run(trackedRepo(), 'dvc install --bogus');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/unrecognized arguments/i);
  });
});

// post-checkout hook runs `dvc checkout`
describe('post-checkout hook', () => {
  const v0 = () => trackedRepo().files['data/data.xml']!.pointerMd5!;

  it('with the hook, `git checkout HEAD~1` restores the v0 data in the workspace by itself', () => {
    const s = setup(twoVersions(), 'dvc install');
    const { state, last } = run(s, 'git checkout HEAD~1', 'dvc status');
    expect(state.files['data/data.xml']!.contentId).toBe(v0());
    expect(last.text).toMatch(/up to date/i);
    expect(last.text).not.toMatch(/modified/i);
  });

  it('(regression) without the hook the workspace keeps v1 and `dvc status` reports a mismatch', () => {
    const { state, last } = run(twoVersions(), 'git checkout HEAD~1', 'dvc status');
    expect(state.files['data/data.xml']!.contentId).not.toBe(v0());
    expect(last.text).toMatch(/modified/i);
    expect(last.text).toMatch(/data\/data\.xml/);
  });

  it('with only the pre-commit-tool config (hooks not activated) checkout does not sync', () => {
    const s = setup(twoVersions(), 'dvc install --use-pre-commit-tool');
    const { last } = run(s, 'git checkout HEAD~1', 'dvc status');
    expect(last.text).toMatch(/modified/i);
  });
});

// pre-push hook runs `dvc push`
describe('pre-push hook', () => {
  const v1Md5 = (s: ReturnType<typeof twoVersions>) => s.files['data/data.xml']!.pointerMd5!;

  it('with the hook, `git push` also uploads the DVC data to the default remote', () => {
    const s = setup(twoVersions(trackedRepoWithRemote()), 'dvc install');
    const md5 = v1Md5(s);
    expect(s.remoteObjects).not.toContain(md5);
    const { state, last } = run(s, 'git push');
    expect(last.result.ok).toBe(true);
    expect(state.remoteObjects).toContain(md5);
  });

  it('without the hook, `git push` leaves the DVC remote without the new data', () => {
    const s = twoVersions(trackedRepoWithRemote());
    const { state } = run(s, 'git push');
    expect(state.remoteObjects).not.toContain(v1Md5(s));
  });

  it('a plain `git push` is a supported Git command in the simulator', () => {
    const { last } = run(twoVersions(), 'git push');
    expect(last.text).not.toMatch(/not supported/i);
  });
});

describe('prod series: level for git hooks', () => {
  const { id, key } = PROD_LEVELS[0]!;
  levelContract(id, key);
});
