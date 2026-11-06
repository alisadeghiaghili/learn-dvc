import { describe, expect, it } from 'vitest';
import { run, setup, startOf } from '../helpers';
import { PROD_LEVELS, levelContract } from './level-contract';

const NOT_UNKNOWN = /unknown command|usage: dvc exp/i;

/** exp-3 start: a pipeline with params; the workspace is edited but nothing is run. */
const edited = () => setup(startOf('exp-3'), 'edit params.yaml lr=0.05');

// https://doc.dvc.org/command-reference/exp/save
describe('dvc exp save', () => {
  it('-n records the workspace params and metrics as a named experiment without running the pipeline', () => {
    const before = edited();
    const { state, last } = run(before, 'dvc exp save -n tweak-lr');
    expect(last.result.ok).toBe(true);
    expect(last.text).not.toMatch(NOT_UNKNOWN);
    expect(last.text).not.toMatch(/running stage/i);
    expect(state.experiments.length).toBe(before.experiments.length + 1);
    const exp = state.experiments[state.experiments.length - 1]!;
    expect(exp.name).toBe('tweak-lr');
    expect(exp.params.lr).toBe(0.05);
    expect(exp.metrics).toEqual(before.metrics);
    expect(state.runCache).toEqual(before.runCache);
  });

  it('does not re-run or invalidate stages: stages stale from the edit stay stale', () => {
    const before = edited();
    const { state, last } = run(before, 'dvc exp save -n tweak-lr');
    expect(last.result.ok).toBe(true);
    expect(state.pipeline.map((p) => p.upToDate)).toEqual(before.pipeline.map((p) => p.upToDate));
  });

  it('shows up in `dvc exp show` and `dvc exp list`', () => {
    const { steps } = run(edited(), 'dvc exp save -n tweak-lr', 'dvc exp show', 'dvc exp list');
    expect(steps[1]!.text).toMatch(/tweak-lr/);
    expect(steps[2]!.text).toMatch(/tweak-lr/);
  });

  it('without -n it gets an auto-generated name (and prints it)', () => {
    const before = edited();
    const { state, last } = run(before, 'dvc exp save');
    expect(last.result.ok).toBe(true);
    expect(state.experiments.length).toBe(before.experiments.length + 1);
    const exp = state.experiments[state.experiments.length - 1]!;
    expect(exp.name).toMatch(/^[a-z]+(-[a-z]+)+$/);
    expect(last.text).toContain(exp.name!);
  });

  it('saving a duplicate name fails unless -f is given', () => {
    const s = setup(edited(), 'dvc exp save -n tweak-lr');
    const dup = run(s, 'dvc exp save -n tweak-lr');
    expect(dup.last.result.ok).toBe(false);
    expect(dup.last.text).toMatch(/exist/i);
    expect(dup.state.experiments.length).toBe(s.experiments.length);

    const forced = run(s, 'dvc exp save -f -n tweak-lr');
    expect(forced.last.result.ok).toBe(true);
    expect(forced.state.experiments.filter((e) => e.name === 'tweak-lr')).toHaveLength(1);
  });
});

// https://doc.dvc.org/command-reference/exp/remove
describe('dvc exp remove', () => {
  const two = () => setup(edited(), 'dvc exp save -n first', 'edit params.yaml lr=0.2', 'dvc exp save -n second');

  it('deletes only the named experiment', () => {
    const before = two();
    const { state, last } = run(before, 'dvc exp remove first');
    expect(last.result.ok).toBe(true);
    expect(last.text).not.toMatch(NOT_UNKNOWN);
    expect(state.experiments.map((e) => e.name)).not.toContain('first');
    expect(state.experiments.map((e) => e.name)).toContain('second');
    expect(state.experiments.length).toBe(before.experiments.length - 1);
  });

  it('is gone from `dvc exp list` afterwards', () => {
    const { last } = run(two(), 'dvc exp remove first', 'dvc exp list');
    expect(last.text).not.toMatch(/first/);
  });

  it('an unknown name fails and removes nothing', () => {
    const before = two();
    const { state, last } = run(before, 'dvc exp remove nope');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/nope/);
    expect(last.text).not.toMatch(NOT_UNKNOWN);
    expect(state.experiments.length).toBe(before.experiments.length);
  });

  // docs: -A / --all
  it.each(['-A', '--all'])('%s removes every experiment', (flag) => {
    const { state, last } = run(two(), `dvc exp remove ${flag}`);
    expect(last.result.ok).toBe(true);
    expect(state.experiments).toEqual([]);
  });

  it('with no name and no scope flag it fails (nothing to remove)', () => {
    const before = two();
    const { state, last } = run(before, 'dvc exp remove');
    expect(last.result.ok).toBe(false);
    expect(state.experiments.length).toBe(before.experiments.length);
  });

  // docs: -g/--git-remote removes from the Git remote (a Git remote, not a DVC remote)
  describe('-g <git remote>', () => {
    it('after an `exp push` it removes the experiment from the Git remote', () => {
      const { last } = run(two(), 'dvc exp push origin', 'dvc exp remove -g origin first');
      expect(last.result.ok).toBe(true);
      expect(last.text).toMatch(/origin/);
      expect(last.text).toMatch(/first/);
    });

    it('doing it twice fails the second time: it is no longer on the remote', () => {
      const { last } = run(two(), 'dvc exp push origin', 'dvc exp remove -g origin first', 'dvc exp remove -g origin first');
      expect(last.result.ok).toBe(false);
      expect(last.text).toMatch(/first/);
    });

    it('fails when the experiment was never pushed', () => {
      const { last } = run(two(), 'dvc exp remove -g origin first');
      expect(last.result.ok).toBe(false);
      expect(last.text).toMatch(/first/);
    });

    it('rejects a DVC remote name (needs a Git remote)', () => {
      const { last } = run(two(), 'dvc exp push origin', 'dvc exp remove -g myremote first');
      expect(last.result.ok).toBe(false);
      expect(last.text).toMatch(/git remote/i);
    });
  });
});

// DVC 3.0 removed `dvc exp gc` in favour of `dvc exp remove`
// (https://doc.dvc.org/command-reference/exp/remove lists no gc; removal itself is from the 3.0 release notes)
describe('dvc exp gc', () => {
  it('is rejected, says it was removed in DVC 3 and points at `dvc exp remove`', () => {
    const { last } = run(edited(), 'dvc exp gc -w');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/removed/i);
    expect(last.text).toMatch(/DVC 3/);
    expect(last.text).toMatch(/dvc exp remove/);
  });
});

describe('prod series: level for exp save / remove', () => {
  const { id, key } = PROD_LEVELS[1]!;
  levelContract(id, key);
});
