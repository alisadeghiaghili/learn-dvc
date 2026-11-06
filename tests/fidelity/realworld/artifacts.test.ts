import { describe, expect, it } from 'vitest';
import { run, setup } from '../helpers';
import { REGISTRY_URL, artifactsRepo } from './fixtures';
import { PROD_LEVELS, findLevel, levelContract } from './level-contract';

const tagsOf = (s: ReturnType<typeof artifactsRepo>, ...cmds: string[]) => run(s, ...cmds, 'git tag').last.text;
const registered = () => setup(artifactsRepo(), 'gto register model --version v1.0.0');
const assigned = () => setup(registered(), 'gto assign model --version v1.0.0 --stage prod');

// https://doc.dvc.org/user-guide/project-structure/dvcyaml-files#artifacts
describe('artifacts section in dvc.yaml', () => {
  it('`cat dvc.yaml` shows the artifacts section with path and type', () => {
    const { last } = run(artifactsRepo(), 'cat dvc.yaml');
    expect(last.text).toMatch(/^artifacts:/m);
    expect(last.text).toMatch(/model:/);
    expect(last.text).toContain('path: models/model.pkl');
    expect(last.text).toContain('type: model');
  });
});

// https://doc.dvc.org/command-reference/artifacts/get
describe('dvc artifacts get', () => {
  it('is rejected for the local repo while no version is registered', () => {
    const { last } = run(artifactsRepo(), 'dvc artifacts get . model');
    expect(last.result.ok).toBe(false);
    expect(last.text).not.toMatch(/unknown command/i);
    expect(last.text).toMatch(/version|gto register/i);
  });

  it('works for a registered version via --rev and writes to -o', () => {
    const { state, last } = run(registered(), `dvc artifacts get ${REGISTRY_URL} model --rev v1.0.0 -o out/model.pkl`);
    expect(last.result.ok).toBe(true);
    expect(last.text).toContain('out/model.pkl');
    expect(state.files['out/model.pkl']?.present).toBe(true);
  });

  it('works for a stage via --stage prod once it is assigned', () => {
    const { state, last } = run(assigned(), `dvc artifacts get ${REGISTRY_URL} model --stage prod -o out/model.pkl`);
    expect(last.result.ok).toBe(true);
    expect(state.files['out/model.pkl']?.present).toBe(true);
  });

  it('--stage prod fails when nothing is assigned to prod', () => {
    const { last } = run(registered(), `dvc artifacts get ${REGISTRY_URL} model --stage prod -o out/model.pkl`);
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/prod|stage/i);
  });

  it('an unknown version fails', () => {
    const { last } = run(registered(), `dvc artifacts get ${REGISTRY_URL} model --rev v9.9.9`);
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/v9\.9\.9/);
  });

  it('an unknown artifact name fails', () => {
    const { last } = run(registered(), `dvc artifacts get ${REGISTRY_URL} nope --rev v1.0.0`);
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/nope/);
  });
});

describe('wrong spellings are rejected with a guiding message', () => {
  it('`dvc artifact` (singular) points at `dvc artifacts get`', () => {
    const { last } = run(artifactsRepo(), 'dvc artifact get . model');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/dvc artifacts get/);
  });

  it('`dvc register` is not a DVC command; it points at GTO (`gto register`)', () => {
    const { last } = run(artifactsRepo(), 'dvc register model --version v1.0.0');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/gto register/);
  });
});

// https://dvc.org/doc/gto (GTO is a separate CLI, like CML)
// tag formats: https://dvc.org/doc/gto/user-guide#git-tags-format  (name@vX.Y.Z, name#stage#N)
describe('gto (separate CLI)', () => {
  it('`gto register model --version v1.0.0` creates the Git tag model@v1.0.0', () => {
    const { steps } = run(artifactsRepo(), 'gto register model --version v1.0.0', 'git tag');
    expect(steps[0]!.result.ok).toBe(true);
    expect(steps[1]!.text.split(/\s+/)).toContain('model@v1.0.0');
  });

  it('`gto assign model --version v1.0.0 --stage prod` creates the tag model#prod#1', () => {
    const text = tagsOf(registered(), 'gto assign model --version v1.0.0 --stage prod');
    expect(text.split(/\s+/)).toEqual(expect.arrayContaining(['model@v1.0.0', 'model#prod#1']));
  });

  it('assigning the same stage again increments the counter (model#prod#2)', () => {
    const text = tagsOf(assigned(), 'gto register model --version v1.1.0', 'gto assign model --version v1.1.0 --stage prod');
    expect(text.split(/\s+/)).toEqual(expect.arrayContaining(['model#prod#1', 'model#prod#2']));
  });

  it('registering an artifact that dvc.yaml does not declare fails and creates no tag', () => {
    const { steps } = run(artifactsRepo(), 'gto register ghost --version v1.0.0', 'git tag');
    expect(steps[0]!.result.ok).toBe(false);
    expect(steps[0]!.text).toMatch(/ghost/);
    expect(steps[1]!.text).not.toMatch(/ghost/);
  });

  it('assigning a version that was never registered fails', () => {
    const { last } = run(artifactsRepo(), 'gto assign model --version v1.0.0 --stage prod');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/v1\.0\.0/);
  });

  it('registering the same version twice fails', () => {
    const { last } = run(registered(), 'gto register model --version v1.0.0');
    expect(last.result.ok).toBe(false);
  });

  it('is not a `dvc` subcommand', () => {
    const { last } = run(artifactsRepo(), 'dvc gto register model --version v1.0.0');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/separate/i);
  });

  it('`git tag` on a repo without tags is empty', () => {
    const { last } = run(artifactsRepo(), 'git tag');
    expect(last.result.ok).toBe(true);
    expect(last.text.trim()).toBe('');
  });
});

describe('prod series: level for artifacts and the model registry', () => {
  const { id, key } = PROD_LEVELS[5]!;
  levelContract(id, key);

  it('start state declares an artifacts section in dvc.yaml', () => {
    expect(findLevel(id).startState.dvcYaml).toMatch(/^artifacts:/m);
  });

  it('after the solution both tags exist', () => {
    const level = findLevel(id);
    let s = structuredClone(level.startState);
    const r = run(s, ...level.solution, 'git tag');
    expect(r.last.text).toContain('model@v1.0.0');
    expect(r.last.text).toContain('model#prod#1');
  });
});
