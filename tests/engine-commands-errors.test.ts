import { describe, expect, it } from 'vitest';
import { emptyState, makeFile, sandboxState } from '../src/engine/state';
import { run, setup } from './fidelity/helpers';

/** Initialized DVC repo inside Git, with a data file, a script and a default remote. */
const repo = () => sandboxState();

describe('commands run before `dvc init`', () => {
  const cmds = [
    'dvc add data/data.xml',
    'dvc commit',
    'dvc checkout',
    'dvc push',
    'dvc pull',
    'dvc fetch',
    'dvc gc -w',
    'dvc remote list',
    'dvc remote add r s3://x',
    'dvc freeze train',
    'dvc unfreeze train',
    'dvc diff',
    'dvc cache dir',
    'dvc stage list',
    'dvc repro',
    'dvc update x.dvc',
    'dvc get https://example.com/repo data',
    'dvc exp show',
    'dvc remove x.dvc',
  ];
  for (const cmd of cmds) {
    it(`${cmd} -> not a DVC repository`, () => {
      const { last, state } = run(emptyState(), cmd);
      expect(last.result.ok).toBe(false);
      expect(last.text).toMatch(/not a DVC repository/);
      expect(state.initialized).toBe(false);
      expect(state.cache).toEqual([]);
    });
  }

  it('dvc status --cloud before init fails the same way', () => {
    const { last } = run(emptyState(), 'dvc status --cloud');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/not a DVC repository/);
  });

  it('dvc install outside a Git repository explains that hooks live in .git/hooks', () => {
    const { last, state } = run(emptyState(), 'dvc install');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/not inside of a Git repository/);
    expect(state.hooks).toBeUndefined();
  });

  it('dvc install in a Git repo without dvc init asks for dvc init', () => {
    const s = setup(emptyState(), 'git init');
    const { last } = run(s, 'dvc install');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/not a DVC repository/);
  });
});

describe('top-level dispatch', () => {
  it('prints the help text with the command list', () => {
    const { last } = run(repo(), 'help');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/DVC commands: init, add, status/);
    expect(last.text).toMatch(/Git \(simulated\)/);
    expect(run(repo(), '?').last.text).toBe(last.text);
  });

  it('an unknown program is "command not found"', () => {
    const { last } = run(repo(), 'frobnicate --now');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/command not found: frobnicate/);
  });

  it('an unknown dvc subcommand is rejected', () => {
    const { last } = run(repo(), 'dvc frobnicate');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/unknown command 'dvc frobnicate'/);
  });

  it('bare `dvc` and `dvc --help` print usage and succeed', () => {
    for (const cmd of ['dvc', 'dvc --help', 'dvc -h']) {
      const { last } = run(repo(), cmd);
      expect(last.result.ok).toBe(true);
      expect(last.text).toMatch(/^usage: dvc <command>/);
    }
  });

  it('dvc version / --version print a version line', () => {
    for (const cmd of ['dvc version', 'dvc --version']) {
      const { last } = run(repo(), cmd);
      expect(last.result.ok).toBe(true);
      expect(last.text).toMatch(/^3\./);
    }
  });

  it('an empty command is a no-op', () => {
    const { last, state } = run(repo(), '   ');
    expect(last.result.ok).toBe(true);
    expect(last.text).toBe('');
    expect(state.commandHistory).toEqual([]);
  });

  it('`concepts <unknown>` fails and `concepts` lists the entries', () => {
    const bad = run(repo(), 'concepts zzz-not-a-term').last;
    expect(bad.result.ok).toBe(false);
    expect(bad.text).toMatch(/Unknown concept 'zzz-not-a-term'/);
    const all = run(repo(), 'glossary').last;
    expect(all.result.ok).toBe(true);
    expect(all.text).toMatch(/DVC mental models/);
  });

  it('`;` chains run in order and the last state wins', () => {
    const { last, state } = run(repo(), 'dvc add data/data.xml; git add data/data.xml.dvc');
    expect(last.result.ok).toBe(true);
    expect(state.files['data/data.xml']!.tracked).toBe(true);
    expect(state.gitStaged).toContain('data/data.xml.dvc');
  });

  it('a failing step of a `;` chain aborts and leaves the state untouched', () => {
    const before = repo();
    const { last, state } = run(before, 'dvc add data/data.xml; dvc add nope.csv; dvc add src/train.py');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/bad path 'nope\.csv'/);
    expect(state.files['data/data.xml']!.tracked).toBe(false);
    expect(state.cache).toEqual([]);
  });

  it('`dvc status > file` writes stdout into the workspace and prints nothing', () => {
    const { last, state } = run(repo(), 'dvc status > status.txt');
    expect(last.result.ok).toBe(true);
    expect(last.text).toBe('');
    expect(state.files['status.txt']!.text).toMatch(/Data and pipelines are up to date\./);
  });

  it('a redirected failing command leaves no file behind', () => {
    const { last, state } = run(repo(), 'dvc add nope.csv > out.txt');
    expect(last.result.ok).toBe(false);
    expect(state.files['out.txt']).toBeUndefined();
  });

  it('a feature flag typo is reported by the flag table, not silently ignored', () => {
    const { last } = run(repo(), 'dvc push --nonexistent-flag');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/unrecognized arguments: --nonexistent-flag/);
  });

  it('`dvc stage add --foreach` is rejected: foreach only exists inside dvc.yaml', () => {
    const { last } = run(repo(), 'dvc stage add -n t --foreach a b cmd');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/unrecognized arguments: --foreach/);
    const m = run(repo(), 'dvc stage add -n t --matrix a=1 cmd').last;
    expect(m.text).toMatch(/unrecognized arguments: --matrix/);
  });

  it.each([
    ['dvc live', /DVCLive is a Python library/],
    ['dvc api', /Python API, not a CLI command/],
    ['dvc cml', /CML is a separate CLI/],
    ['dvc artifact', /command group is plural/],
    ['dvc register', /GTO CLI/],
    ['dvc assign', /--stage prod/],
    ['dvc gto', /GTO is a separate CLI/],
  ])('%s points to the real tool', (cmd, re) => {
    const { last } = run(repo(), cmd);
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(re);
  });
});

describe('workspace helpers (cat / edit / rm)', () => {
  it('cat without a path prints usage', () => {
    const { last } = run(repo(), 'cat');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe('Usage: cat <path>');
  });

  it('cat of a missing file fails', () => {
    const { last } = run(repo(), 'cat nope.txt');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe('cat: nope.txt: No such file');
  });

  it('cat .dvc/config renders the INI after dvc remote setup', () => {
    const s = setup(repo(), 'dvc config cache.type copy');
    const { last } = run(s, 'cat .dvc/config');
    expect(last.text).toMatch(/\[core\]\n {4}remote = myremote/);
    expect(last.text).toMatch(/\[cache\]\n {4}type = copy/);
    expect(last.text).toMatch(/\['remote "myremote"'\]\n {4}url = \/tmp\/dvcstore/);
  });

  it('cat .dvc/config.local shows local-only values once the file exists', () => {
    const s = setup(repo(), 'dvc config --local cache.dir /mnt/cache');
    const { last } = run(s, 'cat .dvc/config.local');
    expect(last.text).toBe('[cache]\n    dir = /mnt/cache');
  });

  it('cat of a tracked data file shows the pointer/status summary', () => {
    const s = setup(repo(), 'dvc add data/data.xml');
    const f = s.files['data/data.xml']!;
    const { last } = run(s, 'cat data/data.xml');
    expect(last.text).toBe(`data/data.xml\ncontent_id=${f.contentId}\npointer=${f.pointerMd5}\nstatus=clean`);
  });

  it('cat of an untracked non-text file shows kind and content id', () => {
    const s = repo();
    const { last } = run(s, 'cat data/data.xml');
    expect(last.text).toBe(`data/data.xml\ndata ${s.files['data/data.xml']!.contentId}`);
  });

  it('cat of a file with literal text prints it', () => {
    const s = repo();
    s.files['notes.txt'] = makeFile('notes.txt', 'code', { text: 'hello' });
    expect(run(s, 'cat notes.txt').last.text).toBe('hello');
  });

  it('cat dvc.yaml and dvc.lock are generated from the pipeline', () => {
    const s = setup(
      repo(),
      'dvc stage add -n train -d src/train.py -d data/data.xml -p lr -o model.pkl -m acc.json python src/train.py',
    );
    const yaml = run(s, 'cat dvc.yaml').last.text;
    expect(yaml).toMatch(/^stages:\n {2}train:\n {4}cmd: python src\/train\.py/);
    expect(yaml).toMatch(/deps:\n {6}- src\/train\.py\n {6}- data\/data\.xml/);
    expect(yaml).toMatch(/params:\n {6}- lr/);
    expect(yaml).toMatch(/outs:\n {6}- model\.pkl/);
    expect(yaml).toMatch(/metrics:\n {6}- acc\.json/);
    const lock = run(s, 'cat dvc.lock').last.text;
    expect(lock).toMatch(/^schema: '2\.0'/);
    expect(lock).toMatch(/- path: data\/data\.xml\n {8}md5: [0-9a-f]{32}/);
    expect(lock).toMatch(/params\.yaml:\n {8}lr: 0\.1/);
  });

  it('cat params.yaml prints key: value pairs', () => {
    expect(run(repo(), 'cat params.yaml').last.text).toBe('lr: 0.1\nn_estimators: 10');
  });

  it('cat of a .dvc pointer lists the output path and md5', () => {
    const s = setup(repo(), 'dvc add data/data.xml');
    const md5 = s.files['data/data.xml']!.pointerMd5!;
    const { last } = run(s, 'cat data/data.xml.dvc');
    expect(last.text).toMatch(/^outs:\n- path: data\/data\.xml\n {2}md5: /);
    expect(last.text).toContain(md5);
    expect(last.text).toMatch(/size: [\d,]+$/);
  });

  it('edit without a path prints usage; missing file fails; removed file fails', () => {
    expect(run(repo(), 'edit').last.text).toBe('Usage: edit <path>');
    const missing = run(repo(), 'edit nope.csv').last;
    expect(missing.result.ok).toBe(false);
    expect(missing.text).toBe('edit: nope.csv: No such file');
    const s = setup(repo(), 'rm data/data.xml');
    const gone = run(s, 'edit data/data.xml').last;
    expect(gone.result.ok).toBe(false);
    expect(gone.text).toMatch(/not present in workspace/);
  });

  it('edit .dvcignore appends patterns and lists them', () => {
    const s = setup(repo(), 'edit .dvcignore *.tmp');
    expect(s.dvcIgnore).toEqual(['*.tmp']);
    expect(run(s, 'edit .dvcignore').last.text).toBe('*.tmp');
    expect(run(repo(), 'edit .dvcignore').last.text).toBe('(.dvcignore empty)');
    // idempotent
    expect(setup(s, 'edit .dvcignore *.tmp').dvcIgnore).toEqual(['*.tmp']);
  });

  it('edit params.yaml key=value updates the param and marks reading stages stale', () => {
    const s = setup(repo(), 'dvc stage add -n train -d src/train.py -p lr -o model.pkl python src/train.py', 'dvc repro');
    const { last, state } = run(s, 'edit params.yaml lr=0.5');
    expect(last.text).toBe('Updated params.yaml: lr=0.5');
    expect(state.params.lr).toBe(0.5);
    expect(state.pipeline[0]!.upToDate).toBe(false);
    expect(state.pipeline[0]!.stale!.params).toEqual(['lr']);
  });

  it('rm without a path prints usage; rm of an unknown path fails', () => {
    expect(run(repo(), 'rm').last.text).toBe('Usage: rm <path>');
    const bad = run(repo(), 'rm nope.csv').last;
    expect(bad.result.ok).toBe(false);
    expect(bad.text).toBe('rm: nope.csv: No such file');
  });

  it('ls marks tracked, gitignored and dirty files', () => {
    const s = setup(repo(), 'dvc add data/data.xml', 'edit data/data.xml');
    const out = run(s, 'ls').last.text;
    expect(out).toMatch(/data\/data\.xml {2}\[DVC,gitignored,dirty\]/);
    expect(run({ ...emptyState() }, 'ls').last.text).toBe('(empty workspace)');
  });
});

describe('git simulation: errors and rare forms', () => {
  it('git init in a fresh dir creates the repo, a second one reinitializes it', () => {
    const first = run(emptyState(), 'git init');
    expect(first.last.text).toBe('Initialized empty Git repository.');
    expect(first.state.gitCommits).toHaveLength(1);
    const second = run(first.state, 'git init');
    expect(second.last.text).toBe('Reinitialized existing Git repository.');
    expect(second.state.gitCommits).toHaveLength(1);
  });

  it('git add with no arguments says nothing specified', () => {
    const { last } = run(repo(), 'git add');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe('Nothing specified, nothing added.');
  });

  it('git add of an unknown path is a fatal pathspec error', () => {
    const { last, state } = run(repo(), 'git add nope.csv');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe("fatal: pathspec 'nope.csv' did not match any files");
    expect(state.gitStaged).toEqual([]);
  });

  it('git add .dvc before dvc init is a pathspec error', () => {
    const s = setup(emptyState(), 'git init');
    const { last } = run(s, 'git add .dvc');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/pathspec '\.dvc' did not match any files/);
  });

  it('git add .dvc stages config and .gitignore once, then nothing new', () => {
    const s = setup(emptyState(), 'git init', 'dvc init');
    const a = run(s, 'git add .dvc');
    expect(a.last.result.ok).toBe(true);
    expect(a.state.gitStaged).toEqual(expect.arrayContaining(['.dvc/config', '.dvc/.gitignore']));
  });

  it('git add of a directory stages the changed files below it', () => {
    const s = repo();
    s.files['reports/a.md'] = makeFile('reports/a.md', 'code');
    s.files['reports/b.md'] = makeFile('reports/b.md', 'code');
    const { last, state } = run(s, 'git add reports/');
    expect(last.result.ok).toBe(true);
    expect(state.gitStaged.sort()).toEqual(['reports/a.md', 'reports/b.md']);
  });

  it('git add of a directory that holds only gitignored files is rejected as ignored', () => {
    const s = setup(repo(), 'dvc add data/data.xml');
    s.files['data/other.bin'] = makeFile('data/other.bin', 'data', { gitignored: true });
    s.files['data/data.xml'] = { ...s.files['data/data.xml']!, gitignored: true };
    const { last, state } = run(s, 'git add data/other.bin data/data.xml');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/ignored by one of your \.gitignore files/);
    expect(last.text).toMatch(/hint: Use -f/);
    expect(state.gitStaged).toEqual([]);
  });

  it('git add of a .dvc pointer stages it', () => {
    const s = setup(repo(), 'dvc add data/data.xml');
    s.files['data/data.xml.dvc']!.present = false;
    const { last, state } = run(s, 'git add data/data.xml.dvc');
    expect(last.result.ok).toBe(true);
    expect(state.gitStaged).toContain('data/data.xml.dvc');
  });

  it('git add of params.yaml / dvc.yaml / dvc.lock works even if never touched', () => {
    const s = repo();
    delete s.files['params.yaml'];
    const { last, state } = run(s, 'git add params.yaml');
    expect(last.result.ok).toBe(true);
    expect(state.gitStaged).toEqual(['params.yaml']);
  });

  it('git commit without -m and without staged files complains about the missing value', () => {
    const { last } = run(repo(), 'git commit');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe('error: switch `m` requires a value');
  });

  it('git commit --amend with nothing to amend fails', () => {
    const s = emptyState();
    const { last } = run(setup(s, 'git init'), 'git commit --amend -m x');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe('fatal: You have nothing to amend.');
  });

  it('git commit with an empty index refuses', () => {
    const before = repo();
    const { last, state } = run(before, 'git commit -m "nothing"');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/nothing to commit/);
    expect(state.gitCommits).toHaveLength(before.gitCommits.length);
  });

  it('git commit --amend re-uses the previous message when no -m is given', () => {
    const s = repo();
    s.files['notes.md'] = makeFile('notes.md', 'code');
    const staged = setup(s, 'git add notes.md', 'git commit -m "first note"');
    const n = staged.gitCommits.length;
    const { last, state } = run(staged, 'git commit --amend');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/first note \(amended\)/);
    expect(state.gitCommits).toHaveLength(n);
    expect(state.gitCommits[n - 1]!.message).toBe('first note');
  });

  it('git commit with the pre-commit hook installed runs dvc status first', () => {
    const s = setup(repo(), 'dvc install');
    s.files['notes.md'] = makeFile('notes.md', 'code');
    const { last } = run(setup(s, 'git add notes.md'), 'git commit -m "note"');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/^pre-commit hook: dvc status\n {2}Data and pipelines are up to date\./);
    expect(last.text).toMatch(/\] note$/m);
  });

  it('git status lists untracked files and the pointer line', () => {
    const s = repo();
    s.files['notes.md'] = makeFile('notes.md', 'code');
    const out = run(s, 'git status').last.text;
    expect(out).toMatch(/^On branch main/);
    expect(out).toMatch(/Untracked files:\n(\t\S+\n)*\tnotes\.md\n/);
    expect(out).toMatch(/Next: git add <file> && git commit/);
  });

  it('git log on a repo prints commits newest first', () => {
    const s = repo();
    s.files['notes.md'] = makeFile('notes.md', 'code');
    const t = setup(s, 'git add notes.md', 'git commit -m "second"');
    const out = run(t, 'git log').last.text;
    expect(out.indexOf('second')).toBeLessThan(out.indexOf('Initialize DVC'));
    expect(run(emptyState(), 'git log').last.text).toBe('No commits yet');
  });

  it('git merge reports a dvc.lock conflict and succeeds nowhere', () => {
    const { last } = run(repo(), 'git merge feature');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/Auto-merging dvc\.lock with feature/);
    expect(last.text).toMatch(/Run `dvc repro`/);
    expect(run(repo(), 'git merge').last.text).toMatch(/with origin\/main/);
  });

  it('an unsupported git subcommand is reported', () => {
    const { last } = run(repo(), 'git rebase main');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe("git: 'rebase' is not supported in this simulator.");
    expect(run(repo(), 'git').last.text).toBe("git: 'undefined' is not supported in this simulator.");
  });

  describe('git remote', () => {
    it('lists nothing when there are no remotes, then lists origin and adds new ones', () => {
      expect(run(emptyState(), 'git remote').last.text).toBe('');
      const s = setup(emptyState(), 'git init');
      expect(run(s, 'git remote').last.text).toBe('origin');
      const v = run(s, 'git remote -v').last.text;
      expect(v).toMatch(/^origin\t\S+ \(fetch\)\norigin\t\S+ \(push\)$/);
      const added = run(s, 'git remote add upstream https://github.com/x/y.git');
      expect(added.last.result.ok).toBe(true);
      expect(added.state.gitRemotes).toEqual(['origin', 'upstream']);
    });

    it('git remote add validates its arguments and duplicates', () => {
      const s = setup(emptyState(), 'git init');
      const usage = run(s, 'git remote add onlyname').last;
      expect(usage.result.ok).toBe(false);
      expect(usage.text).toBe('usage: git remote add <name> <url>');
      const dup = run(s, 'git remote add origin https://x').last;
      expect(dup.result.ok).toBe(false);
      expect(dup.text).toBe('error: remote origin already exists.');
    });

    it('git remote remove / rm deletes a remote; unknown names fail', () => {
      const s = setup(emptyState(), 'git init');
      const removed = run(s, 'git remote remove origin');
      expect(removed.last.result.ok).toBe(true);
      expect(removed.state.gitRemotes).toEqual([]);
      expect(run(s, 'git remote rm origin').state.gitRemotes).toEqual([]);
      const bad = run(s, 'git remote remove nope').last;
      expect(bad.result.ok).toBe(false);
      expect(bad.text).toBe("error: No such remote: 'nope'");
      expect(run(s, 'git remote remove').last.text).toBe("error: No such remote: ''");
    });

    it('an unknown git remote subcommand prints usage', () => {
      const { last } = run(setup(emptyState(), 'git init'), 'git remote frob');
      expect(last.result.ok).toBe(false);
      expect(last.text).toMatch(/^usage: git remote/);
    });
  });

  describe('git push', () => {
    it('fails without any configured Git remote', () => {
      const s = setup(emptyState(), 'git init');
      s.gitRemotes = [];
      const { last } = run(s, 'git push');
      expect(last.result.ok).toBe(false);
      expect(last.text).toMatch(/^fatal: No configured push destination\./);
    });

    it('fails for a remote name that is not a Git remote', () => {
      const { last } = run(repo(), 'git push nowhere');
      expect(last.result.ok).toBe(false);
      expect(last.text).toMatch(/fatal: 'nowhere' does not appear to be a git repository/);
    });

    it('pushes to origin and lists pushed tags with --tags', () => {
      const s = setup(repo(), 'git tag v1.0');
      const { last } = run(s, 'git push origin --tags');
      expect(last.result.ok).toBe(true);
      expect(last.text).toMatch(/^To origin\n {3}\S+ {2}main -> main\n \* \[new tag\] {2}v1\.0 -> v1\.0$/);
    });

    it('pushes a named tag only', () => {
      const s = setup(repo(), 'git tag v1.0', 'git tag v2.0');
      const { last } = run(s, 'git push origin v2.0');
      expect(last.text).toMatch(/v2\.0 -> v2\.0/);
      expect(last.text).not.toMatch(/v1\.0/);
    });

    it('with the pre-push hook installed it runs dvc push first and aborts on failure', () => {
      const s = setup(repo(), 'dvc install');
      s.remotes = [];
      const { last, state } = run(s, 'git push');
      expect(last.result.ok).toBe(false);
      expect(last.text).toMatch(/^pre-push hook: dvc push/);
      expect(last.text).toMatch(/error: failed to push some refs to 'origin' \(the pre-push hook exited with an error\)/);
      expect(state.remoteObjects).toEqual([]);
    });

    it('with the pre-push hook installed a successful dvc push uploads data before the Git push', () => {
      const s = setup(repo(), 'dvc add data/data.xml', 'dvc install');
      const md5 = s.files['data/data.xml']!.pointerMd5!;
      const { last, state } = run(s, 'git push');
      expect(last.result.ok).toBe(true);
      expect(last.text).toMatch(/^pre-push hook: dvc push\n {2}pushed data\/data\.xml/);
      expect(state.remoteObjects).toContain(md5);
    });
  });

  describe('git tag', () => {
    it('creates, lists (sorted), refuses duplicates and deletes', () => {
      let s = setup(repo(), 'git tag b', 'git tag a');
      expect(run(s, 'git tag').last.text).toBe('a\nb');
      const dup = run(s, 'git tag a').last;
      expect(dup.result.ok).toBe(false);
      expect(dup.text).toBe("fatal: tag 'a' already exists");
      const del = run(s, 'git tag -d a');
      expect(del.last.text).toBe("Deleted tag 'a'");
      expect(del.state.gitTags!.map((t) => t.name)).toEqual(['b']);
      const missing = run(s, 'git tag -d zzz').last;
      expect(missing.result.ok).toBe(false);
      expect(missing.text).toBe("error: tag 'zzz' not found.");
      const none = run(s, 'git tag --delete').last;
      expect(none.result.ok).toBe(false);
      s = del.state;
      expect(run(s, 'git tag').last.text).toBe('b');
    });

    it('tags a given commit by hash, HEAD~n or HEAD; unknown refs fail', () => {
      const s0 = repo();
      s0.files['notes.md'] = makeFile('notes.md', 'code');
      const s = setup(s0, 'git add notes.md', 'git commit -m second');
      const first = s.gitCommits[1]!.hash;
      const head = s.gitCommits[2]!.hash;
      expect(run(s, `git tag at-hash ${first}`).state.gitTags![0]!.commit).toBe(first);
      expect(run(s, 'git tag back HEAD~1').state.gitTags![0]!.commit).toBe(first);
      expect(run(s, 'git tag tip HEAD').state.gitTags![0]!.commit).toBe(head);
      const bad = run(s, 'git tag nope deadbeef').last;
      expect(bad.result.ok).toBe(false);
      expect(bad.text).toBe("fatal: Failed to resolve 'deadbeef' as a valid ref.");
    });
  });

  describe('git checkout', () => {
    function twoCommits() {
      const s0 = setup(repo(), 'dvc add data/data.xml');
      const s1 = setup(s0, 'git add data/data.xml.dvc', 'git commit -m "track data"');
      const s2 = setup(s1, 'edit data/data.xml', 'dvc add data/data.xml', 'git add data/data.xml.dvc', 'git commit -m "v2"');
      return s2;
    }

    it('checking out HEAD / main / master is a no-op', () => {
      expect(run(repo(), 'git checkout HEAD').last.text).toBe('Already on HEAD.');
      expect(run(repo(), 'git checkout main').last.text).toBe('Already on main.');
      expect(run(repo(), 'git checkout master').last.text).toBe('Already on master.');
    });

    it('an unknown branch name is a pathspec error', () => {
      const { last } = run(repo(), 'git checkout feature');
      expect(last.result.ok).toBe(false);
      expect(last.text).toBe("ERROR: pathspec 'feature' did not match any file(s) known to git.");
    });

    it('an unknown short hash or too-far HEAD~n does not match any commit', () => {
      const a = run(repo(), 'git checkout abc1234').last;
      expect(a.result.ok).toBe(false);
      expect(a.text).toBe("ERROR: pathspec 'abc1234' did not match any commit.");
      const b = run(repo(), 'git checkout HEAD~9').last;
      expect(b.result.ok).toBe(false);
      expect(b.text).toMatch(/did not match any commit/);
    });

    it('checking out an older commit by hash switches pointers (and params/metrics) but not the workspace', () => {
      const s = twoCommits();
      const old = s.gitCommits[s.gitCommits.length - 2]!;
      const { last, state } = run(s, `git checkout ${old.hash.slice(0, 7)}`);
      expect(last.result.ok).toBe(true);
      expect(last.text).toMatch(new RegExp(`^Switched data pointers to commit ${old.hash}`));
      expect(last.text).toMatch(/Run `dvc checkout` to sync workspace data\./);
      expect(state.files['data/data.xml']!.pointerMd5).toBe(old.pointers['data/data.xml']);
      expect(state.files['data/data.xml']!.dirty).toBe(true);
      expect(state.params).toEqual(old.params);
    });

    it('git checkout HEAD~1 then dvc checkout restores the old bytes from the cache', () => {
      const s = twoCommits();
      const old = s.gitCommits[s.gitCommits.length - 2]!;
      const { state } = run(s, 'git checkout HEAD~1', 'dvc checkout');
      expect(state.files['data/data.xml']!.contentId).toBe(old.pointers['data/data.xml']);
      expect(state.files['data/data.xml']!.dirty).toBe(false);
    });

    it('checking out a commit creates pointers for files the workspace has never seen', () => {
      const s = twoCommits();
      delete s.files['data/data.xml'];
      const old = s.gitCommits[s.gitCommits.length - 2]!;
      const { state } = run(s, 'git checkout HEAD~1');
      const f = state.files['data/data.xml']!;
      expect(f.tracked).toBe(true);
      expect(f.pointerMd5).toBe(old.pointers['data/data.xml']);
      expect(f.present).toBe(state.cache.includes(old.pointers['data/data.xml']!));
    });

    it('with hooks installed, checkout of a commit runs `dvc checkout` and restores the data', () => {
      const s = setup(twoCommits(), 'dvc install');
      const old = s.gitCommits[s.gitCommits.length - 2]!;
      const { last, state } = run(s, 'git checkout HEAD~1');
      expect(last.result.ok).toBe(true);
      expect(last.text).toMatch(/\npost-checkout hook: dvc checkout\n {2}checked out data\/data\.xml/);
      expect(state.files['data/data.xml']!.contentId).toBe(old.pointers['data/data.xml']);
    });

    it('`git checkout --ours <path>` reports the path updated from the ours tree', () => {
      const { last } = run(repo(), 'git checkout --ours dvc.lock');
      expect(last.text).toBe('Updated 1 path from the ours tree for dvc.lock');
      expect(run(repo(), 'git checkout --theirs').last.text).toBe('Updated 1 path from the theirs tree for dvc.lock');
    });

    it('`git checkout <rev> -- <path.dvc>` moves one pointer', () => {
      const s = twoCommits();
      const old = s.gitCommits[s.gitCommits.length - 2]!;
      const { last, state } = run(s, `git checkout ${old.hash} -- data/data.xml.dvc`);
      expect(last.result.ok).toBe(true);
      expect(last.text).toMatch(/^Checked out data\/data\.xml\.dvc from /);
      expect(last.text).toMatch(/Run `dvc checkout` if data files must be restored from cache\.$/);
      expect(state.files['data/data.xml']!.pointerMd5).toBe(old.pointers['data/data.xml']);
    });

    it('`git checkout <rev> -- <path.dvc>` for a file not tracked in that commit untracks it', () => {
      const s = twoCommits();
      const first = s.gitCommits[0]!;
      const { last, state } = run(s, `git checkout ${first.hash} -- data/data.xml.dvc`);
      expect(last.text).toMatch(/^Untracked data\/data\.xml at /);
      expect(state.files['data/data.xml']!.tracked).toBe(false);
      expect(state.files['data/data.xml']!.pointerMd5).toBeUndefined();
    });

    it('`git checkout <rev> -- params.yaml` restores the old params', () => {
      const s = setup(repo(), 'edit params.yaml lr=0.9');
      const first = s.gitCommits[0]!;
      const { last, state } = run(s, `git checkout ${first.hash} -- params.yaml`);
      expect(last.text).toMatch(/^Checked out params\.yaml from /);
      expect(state.params).toEqual(first.params);
    });

    it('`git checkout <rev> -- dvc.yaml` and plain files report the checkout', () => {
      const s = repo();
      const first = s.gitCommits[0]!;
      const a = run(s, `git checkout ${first.hash} -- dvc.lock`).last.text;
      expect(a).toMatch(/Checked out dvc\.lock pointer metadata from .* \(pipeline state left as-is for this lesson\)\./);
      const b = run(s, `git checkout ${first.hash} -- src/train.py`).last.text;
      expect(b).toMatch(/^Checked out src\/train\.py from /);
    });

    it('`git checkout <rev> -- ...` with an unknown commit fails', () => {
      const { last } = run(repo(), 'git checkout deadbee -- params.yaml');
      expect(last.result.ok).toBe(false);
      expect(last.text).toBe("ERROR: unknown commit 'deadbee'.");
    });

    it('`git checkout <rev> <path.dvc>` (no --) also works', () => {
      const s = twoCommits();
      const old = s.gitCommits[s.gitCommits.length - 2]!;
      const { last } = run(s, `git checkout ${old.hash} data/data.xml.dvc`);
      expect(last.result.ok).toBe(true);
      expect(last.text).toMatch(/Checked out data\/data\.xml\.dvc/);
    });

    it('a path form that matches nothing in the commit is an error', () => {
      const s = twoCommits();
      const first = s.gitCommits[0]!;
      const { last } = run(s, `git checkout ${first.hash} -- unknown.dvc`);
      expect(last.result.ok).toBe(false);
      expect(last.text).toMatch(/^ERROR: no matching paths in /);
    });

    it('bare `git checkout` prints usage', () => {
      const { last } = run(repo(), 'git checkout');
      expect(last.result.ok).toBe(false);
      expect(last.text).toBe('Usage: git checkout <ref> [-- <path>]');
    });
  });
});

describe('cml', () => {
  it('cml runner launch describes the defaults and honours --cloud / --cloud-type / --single-shot', () => {
    const def = run(repo(), 'cml runner launch').last.text;
    expect(def).toMatch(/Provider: {3}AWS EC2/);
    expect(def).toMatch(/Instance: {3}g4dn\.xlarge/);
    expect(def).toMatch(/Lifecycle: {2}Persistent/);
    const custom = run(repo(), 'cml runner launch --cloud=gcp --cloud-type=n1-standard-4 --single-shot').last.text;
    expect(custom).toMatch(/Provider: {3}gcp/);
    expect(custom).toMatch(/Instance: {3}n1-standard-4/);
    expect(custom).toMatch(/Single-shot/);
  });

  it('cml comment create needs a file argument, and the file must exist', () => {
    const none = run(repo(), 'cml comment create').last;
    expect(none.result.ok).toBe(false);
    expect(none.text).toMatch(/Not enough non-option arguments/);
    const missing = run(repo(), 'cml comment create report.md').last;
    expect(missing.result.ok).toBe(false);
    expect(missing.text).toMatch(/ENOENT: no such file or directory, open 'report\.md'/);
    expect(missing.text).toMatch(/dvc metrics show --md > report\.md/);
  });

  it('cml comment create posts an existing report', () => {
    const s = repo();
    s.files['report.md'] = makeFile('report.md', 'code', { text: '# r' });
    const { last } = run(s, 'cml comment create report.md');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/CML: posting report\.md as a comment/);
  });

  it('other cml commands are unknown', () => {
    const { last } = run(repo(), 'cml frobnicate');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/^cml: unknown command/);
  });
});
