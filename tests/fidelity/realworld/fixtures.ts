import { makeFile } from '../../../src/engine/state';
import { fakeMd5 } from '../../../src/engine/hash';
import type { RepoState } from '../../../src/engine/types';
import { setup, startOf } from '../helpers';

/** Initialized Git + DVC repo with data/data.xml tracked and committed (no DVC remote). */
export const trackedRepo = (): RepoState => startOf('basics-3');

/** Tracked repo plus a default DVC remote. */
export function trackedRepoWithRemote(): RepoState {
  return setup(trackedRepo(), 'dvc remote add -d myremote /tmp/dvcstore');
}

/** dvc.yaml with top-level vars and a 2x2 matrix, expanded into four stages (not yet run). */
export const MATRIX_STAGES = ['train@cnn-a', 'train@cnn-b', 'train@xgb-a', 'train@xgb-b'];

export const MATRIX_YAML = [
  'vars:',
  '  - data: data/data.xml',
  'stages:',
  '  train:',
  '    matrix:',
  '      model: [cnn, xgb]',
  '      feature: [a, b]',
  '    cmd: python src/train.py --model ${item.model} --feature ${item.feature}',
  '    deps:',
  '      - ${data}',
  '      - src/train.py',
  '    outs:',
  '      - models/${item.model}-${item.feature}.pkl',
].join('\n');

export function matrixRepo(): RepoState {
  const s = trackedRepo();
  s.files['src/train.py'] = makeFile('src/train.py', 'code');
  s.files['dvc.yaml'] = makeFile('dvc.yaml', 'yaml');
  for (const model of ['cnn', 'xgb']) {
    for (const feature of ['a', 'b']) {
      s.pipeline.push({
        name: `train@${model}-${feature}`,
        deps: ['data/data.xml', 'src/train.py'],
        outs: [`models/${model}-${feature}.pkl`],
        cmd: `python src/train.py --model ${model} --feature ${feature}`,
        params: [],
        metrics: [],
        frozen: false,
        upToDate: false,
      });
    }
  }
  s.dvcYaml = MATRIX_YAML;
  return s;
}

/**
 * Fresh-clone scenario: pipe-3 (prepare -> train, remote `myremote`) whose cached stage
 * outputs were pushed to the remote and then removed from the local cache and the workspace.
 * dvc.lock is committed, so every stage is recorded as locked and up to date.
 */
export function freshCloneRepo(opts: { onRemote?: boolean } = {}): { state: RepoState; outs: string[]; ids: string[] } {
  const s = startOf('pipe-3');
  const outs = s.pipeline.flatMap((p) => p.outs).filter((o) => !s.pipeline.some((p) => p.metrics.includes(o)));
  const ids = outs.map((o) => s.files[o]?.contentId ?? fakeMd5(`out:${o}`));
  outs.forEach((o, i) => {
    s.files[o] = makeFile(o, 'data', { contentId: ids[i]!, present: false });
  });
  s.cache = s.cache.filter((m) => !ids.includes(m));
  s.remoteObjects = opts.onRemote === false ? [] : [...new Set([...s.remoteObjects, ...ids])];
  s.generated = s.generated.filter((g) => !outs.includes(g));
  for (const p of s.pipeline) {
    p.upToDate = true;
    p.locked = true;
  }
  return { state: s, outs, ids };
}

/** dvc.yaml that declares a model artifact. */
export const ARTIFACTS_YAML = [
  'stages:',
  '  train:',
  '    cmd: python src/train.py',
  '    outs:',
  '      - models/model.pkl',
  'artifacts:',
  '  model:',
  '    path: models/model.pkl',
  '    type: model',
].join('\n');

export function artifactsRepo(): RepoState {
  const s = trackedRepoWithRemote();
  s.files['dvc.yaml'] = makeFile('dvc.yaml', 'yaml');
  s.files['models/model.pkl'] = makeFile('models/model.pkl', 'data');
  s.dvcYaml = ARTIFACTS_YAML;
  return s;
}

export const REGISTRY_URL = 'https://github.com/acme/model-registry.git';
