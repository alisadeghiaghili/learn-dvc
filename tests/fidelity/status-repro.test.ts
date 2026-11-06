import { describe, expect, it } from 'vitest';
import { run, setup, startOf } from './helpers';

const stage = (s: ReturnType<typeof startOf>, name: string) => s.pipeline.find((p) => p.name === name)!;

// https://doc.dvc.org/command-reference/status  (pipeline stages with changed deps/params are reported)
describe('dvc status reports changed pipeline stages (pipe-3 start: all stages up to date)', () => {
  it('(regression) editing src/train.py marks stage `train` as not up to date in state', () => {
    const { state } = run(startOf('pipe-3'), 'edit src/train.py');
    expect(stage(state, 'train').upToDate).toBe(false);
  });

  it('after `edit src/train.py`, dvc status names stage `train` as changed and is NOT "up to date"', () => {
    const { last } = run(startOf('pipe-3'), 'edit src/train.py', 'dvc status');
    expect(last.text).toMatch(/train/);
    expect(last.text).toMatch(/changed|modified/i);
    expect(last.text).not.toMatch(/up to date/i);
  });

  it('after `edit params.yaml lr=0.05`, dvc status reports stage `train` changed because of params', () => {
    const { last } = run(startOf('pipe-3'), 'edit params.yaml lr=0.05', 'dvc status');
    expect(last.text).toMatch(/train/);
    expect(last.text).toMatch(/changed|modified/i);
    expect(last.text).toMatch(/param/i);
    expect(last.text).not.toMatch(/up to date/i);
  });
});

// https://doc.dvc.org/command-reference/repro  ("Stage '...' didn't change, skipping")
describe('dvc repro is idempotent', () => {
  it('(regression) a second `dvc repro` skips every stage and re-runs nothing', () => {
    const s = setup(startOf('pipe-3'), 'edit params.yaml lr=0.05', 'dvc repro');
    const { last, state } = run(s, 'dvc repro');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/didn't change|skipping|up to date/i);
    expect(last.text).not.toMatch(/running stage/i);
    expect(state.pipeline.every((p) => p.upToDate)).toBe(true);
  });
});

// argparse behaviour shared by every dvc command
describe('unknown flags are rejected like argparse does', () => {
  it('dvc repro --bogus fails with "unrecognized arguments"', () => {
    const { last } = run(startOf('pipe-3'), 'dvc repro --bogus');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/unrecognized arguments/i);
  });

  it('dvc add --bogus data/data.xml fails with "unrecognized arguments" and tracks nothing', () => {
    const { last, state } = run(startOf('basics-2'), 'dvc add --bogus data/data.xml');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/unrecognized arguments/i);
    expect(state.files['data/data.xml']!.tracked).toBe(false);
  });
});
