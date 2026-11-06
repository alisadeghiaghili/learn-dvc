import { describe, expect, it } from 'vitest';
import { run } from '../helpers';
import { freshCloneRepo } from './fixtures';
import { PROD_LEVELS, levelContract } from './level-contract';

// https://doc.dvc.org/command-reference/repro#--pull
// "--pull: try automatically pulling missing cache for outputs restored from the run-cache / unchanged stages"
describe('dvc repro --pull on a fresh clone (outputs on the remote, not local)', () => {
  it('fixture sanity: outputs are missing locally and present on the remote', () => {
    const { state, outs, ids } = freshCloneRepo();
    expect(outs.length).toBeGreaterThan(0);
    for (const o of outs) expect(state.files[o]!.present).toBe(false);
    for (const id of ids) {
      expect(state.cache).not.toContain(id);
      expect(state.remoteObjects).toContain(id);
    }
  });

  it('downloads the missing outputs and does NOT re-run the stages', () => {
    const { state: before, outs, ids } = freshCloneRepo();
    const { state, last } = run(before, 'dvc repro --pull');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/pulled|skipp|didn't change/i);
    expect(last.text).not.toMatch(/running stage/i);
    for (const o of outs) expect(state.files[o]!.present).toBe(true);
    for (const id of ids) expect(state.cache).toContain(id);
    expect(state.pipeline.every((p) => p.upToDate)).toBe(true);
  });

  it('(contrast) plain `dvc repro` re-runs the stages because their outputs are missing', () => {
    const { last } = run(freshCloneRepo().state, 'dvc repro');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/running stage/i);
  });

  it('when the remote lacks the outputs, --pull falls back to running the stage', () => {
    const { last } = run(freshCloneRepo({ onRemote: false }).state, 'dvc repro --pull');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/running stage/i);
  });

  it('--pull needs a configured remote', () => {
    const { state } = freshCloneRepo();
    state.remotes = [];
    const { last } = run(state, 'dvc repro --pull');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/remote/i);
  });

  // https://doc.dvc.org/command-reference/repro#--allow-missing
  it('--pull --allow-missing is accepted and also leaves the stages un-run', () => {
    const { last } = run(freshCloneRepo().state, 'dvc repro --pull --allow-missing');
    expect(last.result.ok).toBe(true);
    expect(last.text).not.toMatch(/unrecognized arguments/i);
    expect(last.text).not.toMatch(/running stage/i);
  });
});

describe('prod series: level for dvc repro --pull', () => {
  const { id, key } = PROD_LEVELS[3]!;
  levelContract(id, key);
});
