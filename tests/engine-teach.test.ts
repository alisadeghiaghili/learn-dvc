import { afterEach, describe, expect, it } from 'vitest';
import { teachAfterCommand, teachBlock } from '../src/engine/teach';
import { emptyState } from '../src/engine/state';
import { en } from '../src/i18n/en';
import { de } from '../src/i18n/de';
import { setLocale } from '../src/i18n';

const CASES: Array<[string, string]> = [
  ['git checkout main', 'git-checkout-data'],
  ['dvc init', 'dvc-init'],
  ['dvc add data/data.xml', 'dvc-add'],
  ['dvc status', 'dvc-status'],
  ['dvc commit', 'dvc-commit'],
  ['dvc remote add -d store /tmp/s', 'dvc-remote-add'],
  ['dvc push', 'dvc-push'],
  ['dvc pull', 'dvc-pull'],
  ['dvc fetch', 'dvc-fetch'],
  ['dvc checkout', 'dvc-checkout'],
  ['dvc stage add -n train python train.py', 'dvc-stage-add'],
  ['dvc repro', 'dvc-repro'],
  ['dvc install', 'dvc-install'],
  ['dvc exp save', 'dvc-exp-save'],
  ['dvc exp remove exp-1', 'dvc-exp-save'],
  ['dvc cache dir /tmp/c', 'dvc-cache-dir'],
  ['dvc artifacts get x model', 'dvc-artifacts'],
  ['gto show', 'dvc-artifacts'],
  ['dvc exp run', 'dvc-exp-run'],
  ['dvc exp apply exp-1', 'dvc-exp-apply'],
  ['edit params.yaml lr=0.5', 'edit'],
  ['git add data/data.xml.dvc .gitignore', 'git-add-dvc'],
  ['git add dvc.yaml', 'git-add-dvc'],
  ['git add params.yaml', 'git-add-dvc'],
  ['git commit -m "x"', 'git-commit'],
  ['dvc queue start', 'exp-queue'],
  ['dvc exp run --queue', 'dvc-exp-run'],
  ['dvc update data/data.xml.dvc', 'dvc-update'],
  ['dvc config cache.type symlink', 'dvc-config'],
  ['cml runner launch', 'cml-runner'],
  ['cml comment create report.md', 'cml'],
  ['dvc freeze train', 'dvc-freeze'],
  ['dvc unfreeze train', 'dvc-unfreeze'],
  ['dvc diff', 'dvc-diff'],
  ['dvc exp push origin exp-1', 'dvc-exp-share'],
  ['dvc exp pull origin exp-1', 'dvc-exp-share'],
  ['dvc exp branch exp-1 b', 'dvc-exp-share'],
  ['dvc exp show', 'dvc-exp-show'],
  ['dvc gc -w', 'dvc-gc'],
  ['dvc plots show', 'dvc-plots'],
  ['dvc params diff', 'dvc-diffs'],
  ['dvc metrics diff', 'dvc-diffs'],
  ['python -c "import dvc.api; print(1)"', 'python-dvc-api'],
];

afterEach(() => setLocale('en'));

describe('teachBlock', () => {
  it('renders a titled block with indented lines after a blank line', () => {
    expect(teachBlock('T', ['a', 'b'])).toBe('\n── Why: T ──\n  a\n  b');
  });

  it('renders just the heading when there are no lines', () => {
    expect(teachBlock('T', [])).toBe('\n── Why: T ──');
  });
});

describe('teachAfterCommand', () => {
  for (const [cmd, key] of CASES) {
    it(`${cmd} -> ${key}`, () => {
      const entry = en.teach[key];
      expect(entry, `catalog has ${key}`).toBeTruthy();
      expect(teachAfterCommand(cmd, emptyState())).toBe(teachBlock(entry!.title, entry!.lines));
    });
  }

  it('ignores surrounding whitespace', () => {
    expect(teachAfterCommand('  dvc push  ', emptyState())).toBe(
      teachBlock(en.teach['dvc-push']!.title, en.teach['dvc-push']!.lines),
    );
  });

  it('says nothing for empty input and for commands without a lesson', () => {
    expect(teachAfterCommand('', emptyState())).toBeNull();
    expect(teachAfterCommand('   ', emptyState())).toBeNull();
    expect(teachAfterCommand('ls', emptyState())).toBeNull();
    expect(teachAfterCommand('git status', emptyState())).toBeNull();
    expect(teachAfterCommand('git add notes.txt', emptyState())).toBeNull();
    expect(teachAfterCommand('dvc nonsense', emptyState())).toBeNull();
  });

  it('only teaches the DVCLive logging lesson for python once a live run is active', () => {
    const s = emptyState();
    expect(teachAfterCommand('python train.py', s)).toBeNull();
    s.live.active = true;
    expect(teachAfterCommand('python train.py', s)).toBe(
      teachBlock(en.teach['dvc-live']!.title, en.teach['dvc-live']!.lines),
    );
    expect(teachAfterCommand('python3 train.py', s)).toBe(
      teachBlock(en.teach['dvc-live']!.title, en.teach['dvc-live']!.lines),
    );
  });

  it('prefers the dvc.api lesson for python commands that use dvc.api, live or not', () => {
    const s = emptyState();
    s.live.active = true;
    expect(teachAfterCommand('python -c "import dvc.api"', s)).toBe(
      teachBlock(en.teach['python-dvc-api']!.title, en.teach['python-dvc-api']!.lines),
    );
  });

  it('uses the active language for the explanation', () => {
    setLocale('de');
    expect(teachAfterCommand('dvc push', emptyState())).toBe(
      teachBlock(de.teach['dvc-push']!.title, de.teach['dvc-push']!.lines),
    );
  });
});
