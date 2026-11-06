import { describe, expect, it } from 'vitest';
import { allLevels } from '../../src/levels';
import { run, startOf } from './helpers';

// Real DVC 3.x has no `dvc live`, `dvc api` or `dvc cml` subcommands.
// DVCLive: https://dvc.org/doc/dvclive  (Python library)
describe('dvc live is not a CLI command (DVCLive is a Python library)', () => {
  it.each(['dvc live start', 'dvc live log metric acc=0.9'])(
    '"%s" is rejected and the error points at the DVCLive Python library',
    (cmd) => {
      const { last } = run(startOf('basics-2'), cmd);
      expect(last.result.ok).toBe(false);
      expect(last.text).toMatch(/python|dvclive/i);
    },
  );
});

// https://doc.dvc.org/api-reference  (dvc.api is a Python module)
describe('dvc api is not a CLI command (dvc.api is a Python module)', () => {
  it.each(['dvc api', 'dvc api read data/data.xml'])(
    '"%s" is rejected and the error points at the dvc.api Python API',
    (cmd) => {
      const { last } = run(startOf('basics-2'), cmd);
      expect(last.result.ok).toBe(false);
      expect(last.text).toMatch(/dvc\.api/i);
      expect(last.text).toMatch(/python/i);
    },
  );
});

// https://cml.dev/doc  (CML is a separate CLI: `cml comment create`)
describe('dvc cml is not a DVC subcommand (CML is a separate CLI)', () => {
  it('"dvc cml" is rejected and the error points at the separate `cml` CLI (cml comment create)', () => {
    const { last } = run(startOf('basics-2'), 'dvc cml "x"');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/cml comment create|separate[^.]*cml|cml cli/i);
  });
});

// https://doc.dvc.org/command-reference/stage/add  (foreach/matrix exist only in dvc.yaml)
describe('dvc stage add has no --foreach flag', () => {
  it('"dvc stage add --foreach" is rejected (foreach/matrix are dvc.yaml-only) and creates no stage', () => {
    const { state, last } = run(
      startOf('basics-2'),
      'dvc stage add -n f --foreach a,b -d x -o y cmd',
    );
    expect(last.result.ok).toBe(false);
    expect(state.pipeline.filter((s) => s.name === 'f' || s.name.startsWith('f['))).toEqual([]);
  });
});

// Curriculum guard: no level may teach the non-existent subcommands.
describe('level solutions only use real DVC CLI commands', () => {
  it('no solution step is `dvc live|api|cml ...` or uses `--foreach`', () => {
    const offenders = allLevels.flatMap((l) =>
      l.solution
        .filter((c) => /^dvc (live|api|cml)\b/.test(c.trim()) || c.includes('--foreach'))
        .map((c) => `${l.id}: ${c}`),
    );
    expect(offenders).toEqual([]);
  });
});
