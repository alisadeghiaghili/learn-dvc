import { describe, expect, it } from 'vitest';
import { getLevel } from '../../../src/levels';
import { run } from '../helpers';
import { MATRIX_STAGES, matrixRepo } from './fixtures';
import { PROD_LEVELS, findLevel, levelContract } from './level-contract';

const upToDate = (s: ReturnType<typeof matrixRepo>) =>
  Object.fromEntries(s.pipeline.map((p) => [p.name, p.upToDate]));

// https://doc.dvc.org/user-guide/project-structure/dvcyaml-files#matrix-stages  (and #vars)
describe('vars + matrix in dvc.yaml', () => {
  it('`cat dvc.yaml` shows vars, matrix and ${item.*} interpolation', () => {
    const { last } = run(matrixRepo(), 'cat dvc.yaml');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/^vars:/m);
    expect(last.text).toMatch(/matrix:/);
    expect(last.text).toContain('${item.model}');
    expect(last.text).toContain('${item.feature}');
  });

  it('`dvc dag` lists the four generated stages', () => {
    const { last } = run(matrixRepo(), 'dvc dag');
    for (const name of MATRIX_STAGES) expect(last.text).toContain(name);
  });

  it('`dvc status` reports the four generated stages as changed', () => {
    const { last } = run(matrixRepo(), 'dvc status');
    for (const name of MATRIX_STAGES) expect(last.text).toContain(name);
  });

  it('`dvc repro train@cnn-a` runs only that stage', () => {
    const { state, last } = run(matrixRepo(), 'dvc repro train@cnn-a');
    expect(last.result.ok).toBe(true);
    expect(last.text).toContain('train@cnn-a');
    for (const other of MATRIX_STAGES.slice(1)) expect(last.text).not.toContain(other);
    expect(upToDate(state)).toEqual({
      'train@cnn-a': true,
      'train@cnn-b': false,
      'train@xgb-a': false,
      'train@xgb-b': false,
    });
  });

  it('`dvc repro train` (the group name) runs all four generated stages', () => {
    const { state, last } = run(matrixRepo(), 'dvc repro train');
    expect(last.result.ok).toBe(true);
    for (const name of MATRIX_STAGES) expect(last.text).toContain(name);
    expect(Object.values(upToDate(state))).toEqual([true, true, true, true]);
  });

  it('an unknown matrix combination is not a stage', () => {
    const { last } = run(matrixRepo(), 'dvc repro train@cnn-z');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/train@cnn-z/);
  });

  it('`dvc stage add --matrix` is rejected like --foreach: matrix exists only in dvc.yaml', () => {
    const { state, last } = run(
      matrixRepo(),
      'dvc stage add -n m --matrix model=cnn,xgb -d data/data.xml -o out.pkl cmd',
    );
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/dvc\.yaml/);
    expect(last.text).toMatch(/matrix/i);
    expect(state.pipeline.some((p) => p.name === 'm' || p.name.startsWith('m@'))).toBe(false);
  });
});

describe('prod series: level for vars + matrix', () => {
  const { id, key } = PROD_LEVELS[2]!;
  levelContract(id, key);

  it('start state ships a dvc.yaml with vars, a two-key matrix and ${item.*}, expanded into the four stages', () => {
    const level = findLevel(id);
    const s = level.startState;
    expect(s.dvcYaml, 'startState.dvcYaml').toMatch(/^vars:/m);
    expect(s.dvcYaml).toMatch(/matrix:/);
    expect(s.dvcYaml).toContain('${item.model}');
    expect(s.pipeline.map((p) => p.name).sort()).toEqual([...MATRIX_STAGES].sort());
    expect(getLevel(id)).toBeDefined();
  });
});
