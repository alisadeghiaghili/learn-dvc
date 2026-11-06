import { describe, expect, it } from 'vitest';
import { solutionProgress } from '../src/engine/solution';
import { emptyState, makeFile } from '../src/engine/state';
import type { RepoState } from '../src/engine/types';

/** A state where the live effect of every step is absent, so only the command history can credit a step. */
function ran(...history: string[]): RepoState {
  const s = emptyState();
  s.initialized = true;
  s.commandHistory = history;
  return s;
}

function done(state: RepoState, solutionCmd: string): boolean {
  return solutionProgress(state, [solutionCmd])[0]!.done;
}

describe('history credit: a command that ran earlier satisfies an equivalent solution step', () => {
  it('ignores spacing differences', () => {
    expect(done(ran('dvc   pull   '), 'dvc pull')).toBe(true);
    expect(done(ran(), 'dvc pull')).toBe(false);
  });
});

describe('history credit: git add', () => {
  it('is credited when the learner staged the required path among others', () => {
    const s = ran('git add data/data.xml.dvc .gitignore');
    expect(done(s, 'git add data/data.xml.dvc')).toBe(true);
  });

  it('is credited when the learner staged a parent directory of the required path', () => {
    expect(done(ran('git add data'), 'git add data/data.xml.dvc')).toBe(false);
    expect(done(ran('git add data/data.xml.dvc'), 'git add data')).toBe(true);
  });

  it('is not credited when only unrelated paths were staged', () => {
    expect(done(ran('git add notes.txt'), 'git add data/data.xml.dvc')).toBe(false);
  });

  it('ignores option flags when comparing paths', () => {
    expect(done(ran('git add -f data/data.xml.dvc'), 'git add data/data.xml.dvc')).toBe(true);
  });

  it('crediting `git add .dvc` accepts any .dvc/ path the learner staged', () => {
    expect(done(ran('git add .dvc/config'), 'git add .dvc')).toBe(true);
  });

  it('a trailing-slash directory in the solution matches paths under it', () => {
    expect(done(ran('git add models/model.pkl.dvc'), 'git add models/')).toBe(true);
    expect(done(ran('git add models/'), 'git add models/')).toBe(true);
    expect(done(ran('git add data/x.dvc'), 'git add models/')).toBe(false);
  });
});

describe('history credit: git commit', () => {
  it('is credited by a commit whose message contains the expected text, or vice versa', () => {
    expect(done(ran('git commit -m "Track data and model"'), 'git commit -m "Track data"')).toBe(true);
    expect(done(ran('git commit -m "Track"'), 'git commit -m "Track data"')).toBe(true);
    expect(done(ran("git commit -m 'Track data'"), 'git commit -m "Track data"')).toBe(true);
    expect(done(ran('git commit -m Track'), 'git commit -m "Track data"')).toBe(true);
  });

  it('is not credited by a commit with a different message', () => {
    expect(done(ran('git commit -m "Something else"'), 'git commit -m "Track data"')).toBe(false);
  });

  it('is checked by the live Git log when the message is there', () => {
    const s = ran();
    s.gitCommits.push({ hash: 'abc1234', message: 'Track data v2', pointers: {}, pipelineSig: '', params: {}, metrics: {}, files: [] });
    const step = solutionProgress(s, ['git commit -m "Track data"'])[0]!;
    expect(step.done).toBe(true);
    expect(step.note).toBe('committed (abc1234)');
  });
});

describe('history credit: dvc add / remote add / stage add', () => {
  it('dvc add is credited for the same path (flags ignored) but not another one', () => {
    expect(done(ran('dvc add --no-commit data/data.xml'), 'dvc add data/data.xml')).toBe(true);
    expect(done(ran('dvc add other.csv'), 'dvc add data/data.xml')).toBe(false);
  });

  it('dvc add that ran is not credited once the file is known but untracked', () => {
    const s = ran('dvc add data/data.xml');
    s.files['data/data.xml'] = makeFile('data/data.xml', 'data');
    expect(done(s, 'dvc add data/data.xml')).toBe(false);
  });

  it('dvc remote add is credited by the same remote name, whatever its URL', () => {
    expect(done(ran('dvc remote add -d storage s3://other'), 'dvc remote add -d storage /tmp/s')).toBe(true);
    expect(done(ran('dvc remote add backup /tmp/b'), 'dvc remote add -d storage /tmp/s')).toBe(false);
  });

  it('dvc stage add is credited by the same -n name', () => {
    expect(done(ran('dvc stage add -n train -d a python x.py'), 'dvc stage add -n train python train.py')).toBe(true);
    expect(done(ran('dvc stage add -n prep python x.py'), 'dvc stage add -n train python train.py')).toBe(false);
  });
});

describe('history credit: dvc exp run / exp apply', () => {
  it('exp run -S is credited when the learner set at least the same params', () => {
    expect(done(ran('dvc exp run -S lr=0.5 -S n=3'), 'dvc exp run -S lr=0.5')).toBe(true);
    expect(done(ran('dvc exp run --set-param lr=0.5'), 'dvc exp run -S lr=0.5')).toBe(true);
    expect(done(ran('dvc exp run -S lr=0.9'), 'dvc exp run -S lr=0.5')).toBe(false);
  });

  it('exp run compares text parameters too', () => {
    expect(done(ran('dvc exp run -S model=rf'), 'dvc exp run -S model=rf')).toBe(true);
    expect(done(ran('dvc exp run -S model=svm'), 'dvc exp run -S model=rf')).toBe(false);
  });

  it('any exp apply counts toward an exp apply step until params contradict it', () => {
    expect(done(ran('dvc exp apply exp-b'), 'dvc exp apply exp-a')).toBe(true);
    expect(done(ran('dvc exp run'), 'dvc exp apply exp-a')).toBe(false);
  });
});

describe('history credit: edit', () => {
  it('needs the same path', () => {
    expect(done(ran('edit src/other.py'), 'edit src/train.py')).toBe(false);
    // the file is not in the workspace model, so only the history can credit it
    expect(done(ran('edit src/train.py'), 'edit src/train.py')).toBe(true);
  });

  it('with key=value, the learner must have set that exact assignment', () => {
    const s = ran('edit params.yaml lr=0.9');
    s.files['params.yaml'] = makeFile('params.yaml', 'params');
    s.params = { lr: 0.9 };
    expect(done(s, 'edit params.yaml lr=0.5')).toBe(false);
  });
});

describe('history credit: git checkout', () => {
  it('requires the same ref', () => {
    expect(done(ran('git checkout v1'), 'git checkout v1')).toBe(true);
    expect(done(ran('git checkout v2'), 'git checkout v1')).toBe(false);
  });

  it('a more specific checkout of the same ref counts', () => {
    expect(done(ran('git checkout v1 -- data/data.xml.dvc'), 'git checkout v1')).toBe(true);
  });
});

describe('contradiction by live state', () => {
  it('dvc fetch that ran is unchecked when the object is no longer cached', () => {
    const s = ran('dvc fetch');
    s.files['d'] = makeFile('d', 'data', { tracked: true, pointerMd5: 'p1', contentId: 'p1' });
    expect(done(s, 'dvc fetch')).toBe(false);
    s.cache.push('p1');
    expect(done(s, 'dvc fetch')).toBe(true);
  });

  it('dvc fetch does not require the workspace copy, dvc pull does', () => {
    const s = ran('dvc fetch', 'dvc pull');
    s.files['d'] = makeFile('d', 'data', { tracked: true, pointerMd5: 'p1', contentId: 'p1', present: false });
    s.cache.push('p1');
    expect(done(s, 'dvc fetch')).toBe(true);
    expect(done(s, 'dvc pull')).toBe(false);
  });

  it('git commit that ran is never un-done by later work', () => {
    const s = ran('git commit -m "Track data"');
    expect(done(s, 'git commit -m "Track data"')).toBe(true);
  });
});

describe('solution steps that only inspect', () => {
  it('git merge needs a merge in the history', () => {
    expect(done(ran(), 'git merge feature')).toBe(false);
    expect(done(ran('git merge feature'), 'git merge feature')).toBe(true);
  });

  it('queue start and run-all are done when the queue drained into experiments', () => {
    const s = ran();
    expect(done(s, 'dvc queue start')).toBe(false);
    s.experiments.push({ id: 'e', name: 'e', params: {}, metrics: {} } as RepoState['experiments'][number]);
    expect(done(s, 'dvc queue start')).toBe(true);
    s.expQueue = [{ id: 'q' } as RepoState['expQueue'][number]];
    expect(done(s, 'dvc queue start')).toBe(false);
  });
});

describe('notes explain what is missing', () => {
  it('names the missing piece for unfinished steps', () => {
    const s = ran();
    s.files['d'] = makeFile('d', 'data');
    const notes = solutionProgress(s, ['dvc push', 'dvc add d', 'dvc remote add -d store /x']).map((x) => x.note);
    expect(notes).toEqual(['nothing tracked to push', 'track `d`', 'configure remote `store`']);
  });
});
