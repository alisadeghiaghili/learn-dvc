import { describe, expect, it } from 'vitest';
import { allLevels, getLevel } from '../../src/levels';
import { run, setup, solutionOf, startOf } from './helpers';

// https://doc.dvc.org/command-reference/exp/run
describe('dvc exp run -S (runs immediately, not queued)', () => {
  it('output does not claim the run was "queued"', () => {
    const { last } = run(startOf('exp-3'), 'dvc exp run -S lr=0.05');
    expect(last.result.ok).toBe(true);
    expect(last.text).not.toMatch(/queued/i);
  });

  it('(regression) records one new experiment', () => {
    const before = startOf('exp-3');
    const { state } = run(before, 'dvc exp run -S lr=0.05');
    expect(state.experiments.length).toBe(before.experiments.length + 1);
  });

  it('(regression) leaves the workspace params.yaml modified (lr=0.05) afterwards', () => {
    const { state } = run(startOf('exp-3'), 'dvc exp run -S lr=0.05');
    expect(state.params.lr).toBe(0.05);
  });
});

// https://doc.dvc.org/command-reference/exp/run#--queue
describe('dvc exp run --queue', () => {
  it('(regression) queues the run: says "queued", +1 expQueue, no experiment run, workspace params untouched', () => {
    const before = startOf('exp-3');
    const { last, state } = run(before, 'dvc exp run --queue -S lr=0.2');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/queued/i);
    expect(state.expQueue.length).toBe(before.expQueue.length + 1);
    expect(state.experiments.length).toBe(before.experiments.length);
    expect(state.params).toEqual(before.params);
  });
});

// https://doc.dvc.org/command-reference/exp/apply  (restores params AND outputs of the experiment)
describe('dvc exp apply', () => {
  /** two experiments so the workspace holds the LAST one; then delete the model and apply the FIRST. */
  function applyFirstAfterDeletingModel() {
    const s = setup(
      startOf('exp-3'),
      'dvc exp run -S lr=0.05',
      'dvc exp run -S lr=0.2',
      'rm model.pkl',
    );
    const first = s.experiments[0]!;
    return { ...run(s, `dvc exp apply ${first.id}`), first };
  }

  it('restores the experiment outputs: a deleted model.pkl is present again', () => {
    const { state, last } = applyFirstAfterDeletingModel();
    expect(last.result.ok).toBe(true);
    expect(state.files['model.pkl']?.present).toBe(true);
  });

  it('leaves every pipeline stage up to date (no `dvc repro` needed afterwards)', () => {
    const { state } = applyFirstAfterDeletingModel();
    expect(state.pipeline.length).toBeGreaterThan(0);
    expect(state.pipeline.map((p) => `${p.name}:${p.upToDate}`)).toEqual(
      state.pipeline.map((p) => `${p.name}:true`),
    );
  });

  it('(regression) workspace params and metrics equal the applied experiment\'s', () => {
    const { state, first } = applyFirstAfterDeletingModel();
    expect(state.params).toEqual(first.params);
    expect(state.metrics).toEqual(first.metrics);
  });
});

// https://doc.dvc.org/command-reference/exp/push  (<git_remote> is a GIT remote, not a DVC remote)
describe('dvc exp push', () => {
  // MODEL GAP: RepoState.remotes only holds DVC remotes. The engine needs a notion of
  // Git remotes (at least `origin`) to tell them apart.
  it('rejects a name that is only a DVC remote (needs a Git remote)', () => {
    const { last } = run(startOf('exp-3'), 'dvc exp run -S lr=0.05', 'dvc exp push myremote');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/git remote/i);
  });

  it('(regression) accepts the Git remote `origin`', () => {
    const { last } = run(startOf('exp-3'), 'dvc exp run -S lr=0.05', 'dvc exp push origin');
    expect(last.result.ok).toBe(true);
  });
});

// https://doc.dvc.org/command-reference/exp/diff  ("By default compares the workspace to HEAD")
describe('dvc exp diff', () => {
  it('(fidelity) with no arguments compares the workspace against the HEAD baseline', () => {
    const { last } = run(startOf('exp-3'), 'dvc exp run -S lr=0.05', 'dvc exp diff');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/HEAD|workspace/i);
  });
});

// Curriculum guards
describe('experiment curriculum', () => {
  it('no solution has `dvc exp apply` immediately followed by `dvc repro` (apply already restores outputs)', () => {
    const offenders = allLevels.flatMap((l) =>
      l.solution.flatMap((c, i) =>
        /^dvc exp apply\b/.test(c.trim()) && /^dvc repro\b/.test((l.solution[i + 1] ?? '').trim())
          ? [l.id]
          : [],
      ),
    );
    expect(offenders).toEqual([]);
  });

  it.each(['field-3', 'mastery-4'])(
    '%s promotes the winner by committing straight after `dvc exp apply` (no `dvc repro` in between)',
    (id) => {
      const sol = solutionOf(id);
      const applyAt = sol.findIndex((c) => /^dvc exp apply\b/.test(c.trim()));
      expect(applyAt).toBeGreaterThanOrEqual(0);
      const commitAt = sol.findIndex((c, i) => i > applyAt && /^git commit\b/.test(c.trim()));
      expect(commitAt, 'a git commit must follow the apply').toBeGreaterThan(applyAt);
      expect(sol.slice(applyAt + 1, commitAt).some((c) => /^dvc repro\b/.test(c.trim()))).toBe(false);
    },
  );

  it('exp-2 dialog does not teach the simulator-specific "-S keeps workspace params" claim', () => {
    const md = getLevel('exp-2')!.startDialog.map((d) => d.markdown).join('\n');
    expect(md).not.toContain('In real DVC, `-S` applies to that experiment run');
  });
});
