import { describe, expect, it } from 'vitest';
import { emptyState, makeFile, sandboxState } from '../src/engine/state';
import { run as rawRun, setup } from './fidelity/helpers';

const repo = () => sandboxState();

/** Like the fidelity helper, but with the teaching footer ("── Why: ...") removed from `text`. */
const run: typeof rawRun = (state, ...cmds) => {
  const r = rawRun(state, ...cmds);
  r.steps.forEach((s) => {
    s.text = s.text.split('\n\n── Why:')[0]!;
  });
  return r;
};

describe('python: dvc.api one-liners', () => {
  const py = (code: string) => `python -c "${code}"`;

  it('dvc.api.read of a workspace file prints the sample bytes when wrapped in print()', () => {
    const { last } = run(repo(), py("import dvc.api; print(dvc.api.read('data/data.xml'))"));
    expect(last.result.ok).toBe(true);
    expect(last.text).toBe('<xml><sample id="1" feature="0.82"/><sample id="2" feature="0.91"/></xml>');
  });

  it('without print() it explains the workspace was not touched', () => {
    const { last, state } = run(repo(), py("import dvc.api; dvc.api.open('data/data.xml')"));
    expect(last.text).toBe("# dvc.api.open('data/data.xml') streamed 1,024 bytes from the cache/remote; the workspace was not touched.");
    expect(state.files['data/data.xml']!.present).toBe(true);
  });

  it('csv files and other files get matching sample content; directories are streamed as a directory', () => {
    const s = repo();
    s.files['t.csv'] = makeFile('t.csv', 'data');
    s.files['blob.bin'] = makeFile('blob.bin', 'data');
    s.files.images = makeFile('images', 'data', { isDir: true });
    expect(run(s, py("import dvc.api; print(dvc.api.read('t.csv'))")).last.text).toBe('id,feature,label\n1,0.82,0\n2,0.91,1');
    expect(run(s, py("import dvc.api; print(dvc.api.read('blob.bin'))")).last.text).toBe('<blob.bin: 1,024 bytes>');
    expect(run(s, py("import dvc.api; dvc.api.open('images')")).last.text).toMatch(/streamed a directory from the cache\/remote/);
  });

  it('reads a tracked file that was deleted from the workspace as long as the cache or remote has it', () => {
    const s = setup(repo(), 'dvc add data/data.xml', 'rm data/data.xml');
    expect(run(s, py("import dvc.api; print(dvc.api.read('data/data.xml'))")).last.result.ok).toBe(true);
    const onlyRemote = structuredClone(s);
    onlyRemote.remoteObjects = [onlyRemote.files['data/data.xml']!.pointerMd5!];
    onlyRemote.cache = [];
    expect(run(onlyRemote, py("import dvc.api; print(dvc.api.read('data/data.xml'))")).last.result.ok).toBe(true);
    const nowhere = structuredClone(s);
    nowhere.cache = [];
    const bad = run(nowhere, py("import dvc.api; print(dvc.api.read('data/data.xml'))")).last;
    expect(bad.result.ok).toBe(false);
    expect(bad.text).toMatch(/^dvc\.exceptions\.PathMissingError: The path 'data\/data\.xml' does not exist/);
  });

  it('a path that is not in the repo raises PathMissingError', () => {
    const { last } = run(repo(), py("import dvc.api; print(dvc.api.read('nope.csv'))"));
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/PathMissingError: The path 'nope\.csv' does not exist in the target repository/);
  });

  it('dvc.api.read() with no path argument also raises PathMissingError', () => {
    const { last } = run(repo(), py('import dvc.api; dvc.api.read()'));
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/PathMissingError: The path '' does not exist/);
  });

  it('get_url returns the remote object URL for tracked files and raises for untracked ones', () => {
    const s = setup(repo(), 'dvc add data/data.xml');
    const md5 = s.files['data/data.xml']!.pointerMd5!;
    const url = `/tmp/dvcstore/files/md5/${md5.slice(0, 2)}/${md5.slice(2)}`;
    expect(run(s, py("import dvc.api; print(dvc.api.get_url('data/data.xml'))")).last.text).toBe(url);
    expect(run(s, py("import dvc.api; dvc.api.get_url('data/data.xml')")).last.text).toBe(`# dvc.api.get_url('data/data.xml') returned ${url}`);
    const untracked = run(repo(), py("import dvc.api; print(dvc.api.get_url('data/data.xml'))")).last;
    expect(untracked.result.ok).toBe(false);
    expect(untracked.text).toBe("dvc.exceptions.OutputNotFoundError: Unable to find DVC file with output 'data/data.xml'");
  });

  it('get_url falls back to the example bucket when no remote is configured', () => {
    const s = setup(repo(), 'dvc add data/data.xml');
    s.remotes = [];
    const md5 = s.files['data/data.xml']!.pointerMd5!;
    expect(run(s, py("import dvc.api; print(dvc.api.get_url('data/data.xml'))")).last.text).toBe(
      `s3://ml-team/dvcstore/files/md5/${md5.slice(0, 2)}/${md5.slice(2)}`,
    );
  });

  it('params_show returns the params dict as JSON (when printed)', () => {
    const printed = run(repo(), py('import dvc.api; print(dvc.api.params_show())')).last.text;
    expect(JSON.parse(printed)).toEqual({ lr: 0.1, n_estimators: 10 });
    expect(run(repo(), py('import dvc.api; dvc.api.params_show()')).last.text).toMatch(/^# dvc\.api\.params_show\(\) returned the params dict/);
  });

  it('an unknown dvc.api function is an AttributeError listing the real ones', () => {
    const { last } = run(repo(), py('import dvc.api; dvc.api.frobnicate()'));
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/AttributeError: module 'dvc\.api' has no such function\. Real ones: read, open, get_url, params_show/);
  });

  it('python -c that does not use dvc runs silently', () => {
    const { last } = run(repo(), py('x = 1'));
    expect(last.result.ok).toBe(true);
    expect(last.text).toBe('(python -c ran; nothing printed)');
  });
});

describe('python: scripts', () => {
  it('no arguments prints the simulator hint; a missing script is Errno 2', () => {
    const none = run(repo(), 'python').last;
    expect(none.result.ok).toBe(false);
    expect(none.text).toMatch(/use `python -c "\.\.\."` or `python src\/train\.py`/);
    const missing = run(repo(), 'python3 nope.py').last;
    expect(missing.result.ok).toBe(false);
    expect(missing.text).toBe("python: can't open file 'nope.py': [Errno 2] No such file or directory");
    const removed = setup(repo(), 'rm src/train.py');
    expect(run(removed, 'python src/train.py').last.text).toMatch(/Errno 2/);
  });

  it('python src/train.py without DVCLive prints the params and the no-logging note', () => {
    const { last, state } = run(repo(), 'python src/train.py');
    expect(last.result.ok).toBe(true);
    expect(last.text).toBe(
      'Training with params {"lr":0.1,"n_estimators":10}\nTraining finished. This src/train.py has no DVCLive calls, so nothing was logged to dvclive/.',
    );
    expect(state.live.active).toBe(false);
  });

  it('python src/train.py with an instrumented script writes dvclive files and plots', () => {
    const s = repo();
    s.live.instrumented = true;
    const { last, state } = run(s, 'python src/train.py');
    expect(last.text).toMatch(/DVCLive: Live\(dir='dvclive'\) writing metrics and plots \(5 steps via live\.next_step\(\)\)/);
    expect(state.live.active).toBe(true);
    expect(state.live.step).toBe(5);
    expect(state.files['dvclive/metrics.json']).toBeDefined();
    expect(state.files['dvclive/plots/metrics/loss.tsv']).toBeDefined();
    expect(state.plots.acc).toHaveLength(5);
    expect(state.metrics.acc).toBe(state.plots.acc![4]);
    expect(state.live.plotData).toEqual(['dvclive/plots/metrics/acc.tsv']);
    // a second run does not duplicate the plot-data entry
    expect(run(state, 'python src/train.py').state.live.plotData).toEqual(['dvclive/plots/metrics/acc.tsv']);
    // cat shows the instrumented source
    expect(run(s, 'cat src/train.py').last.text).toMatch(/with Live\(\) as live:/);
  });

  it('any other script just runs', () => {
    const s = repo();
    s.files['tools/prep.py'] = makeFile('tools/prep.py', 'code');
    expect(run(s, 'python tools/prep.py').last.text).toBe('Ran tools/prep.py');
  });
});

describe('gto', () => {
  const g = () => setup(repo());

  it('prints usage for no arguments and --help', () => {
    for (const cmd of ['gto', 'gto --help', 'gto -h']) {
      const { last } = run(g(), cmd);
      expect(last.result.ok).toBe(true);
      expect(last.text).toMatch(/^usage: gto <register\|assign\|show>/);
    }
  });

  it('needs a Git repository', () => {
    const { last } = run(emptyState(), 'gto show');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/gto works on Git tags: this directory is not a Git repository/);
  });

  it('an unknown subcommand lists the supported ones', () => {
    const { last } = run(g(), 'gto frob');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe("gto: unknown command 'frob'. This simulator supports: register, assign, show.");
  });

  describe('register', () => {
    it('rejects missing or malformed names', () => {
      for (const cmd of ['gto register', 'gto register bad@name', 'gto register bad#name']) {
        const { last } = run(g(), cmd);
        expect(last.result.ok).toBe(false);
        expect(last.text).toMatch(/^Usage: gto register NAME \[REF\]/);
      }
    });

    it('creates name@v0.0.1 on HEAD by default and bumps the patch version after that', () => {
      const first = run(g(), 'gto register model');
      expect(first.last.text).toBe("Created git tag 'model@v0.0.1' that registers a version\nTo push the changes upstream, run:\n    git push origin model@v0.0.1");
      const head = first.state.gitCommits[first.state.gitCommits.length - 1]!;
      expect(first.state.gitTags).toEqual([{ name: 'model@v0.0.1', commit: head.hash }]);
      // a second version needs a new commit (one version per commit)
      const withCommit = repo();
      withCommit.files['n.md'] = makeFile('n.md', 'code');
      const s1 = setup(withCommit, 'gto register model', 'git add n.md', 'git commit -m next');
      const second = run(s1, 'gto register model');
      expect(second.last.text).toMatch(/Created git tag 'model@v0\.0\.2'/);
    });

    it('refuses to register a second version at the same commit', () => {
      const s = setup(g(), 'gto register model --version v1.0.0');
      const { last } = run(s, 'gto register model --version v1.0.1');
      expect(last.result.ok).toBe(false);
      expect(last.text).toMatch(/^ERROR: model already has version v1\.0\.0 registered at commit /);
      expect(last.text).toMatch(/one version per commit \(VersionExistsForCommit\)/);
    });

    it('validates --version and adds the v prefix', () => {
      const bad = run(g(), 'gto register model --version one').last;
      expect(bad.result.ok).toBe(false);
      expect(bad.text).toBe("ERROR: Version 'one' is not valid. Example of valid version: 'v1.0.0'");
      const bare = run(g(), 'gto register model --version 2.1.0');
      expect(bare.last.text).toMatch(/Created git tag 'model@v2\.1\.0'/);
    });

    it('refuses an already registered version at another commit', () => {
      const s0 = repo();
      s0.files['n.md'] = makeFile('n.md', 'code');
      const s = setup(s0, 'gto register model --version v1.0.0', 'git add n.md', 'git commit -m next');
      const { last } = run(s, 'gto register model --version v1.0.0');
      expect(last.result.ok).toBe(false);
      expect(last.text).toBe("ERROR: Version 'v1.0.0' of model is already registered (VersionAlreadyRegistered).");
    });

    it('registers a specific ref and rejects unknown refs', () => {
      const s0 = repo();
      s0.files['n.md'] = makeFile('n.md', 'code');
      const s = setup(s0, 'git add n.md', 'git commit -m next');
      const first = s.gitCommits[1]!.hash;
      const { state } = run(s, `gto register model ${first} --version v1.0.0`);
      expect(state.gitTags![0]!.commit).toBe(first);
      const bad = run(s, 'gto register model deadbeef').last;
      expect(bad.result.ok).toBe(false);
      expect(bad.text).toBe("fatal: Failed to resolve 'deadbeef' as a valid ref.");
    });

    it('sorts versions numerically, not as strings, when picking the next one', () => {
      const s = repo();
      s.files['n.md'] = makeFile('n.md', 'code');
      const base = setup(s, 'gto register model --version v1.9.0', 'git add n.md', 'git commit -m a');
      const second = setup(base, 'gto register model --version v1.10.0');
      s.files['m.md'] = makeFile('m.md', 'code');
      second.files['m.md'] = makeFile('m.md', 'code');
      const third = setup(second, 'git add m.md', 'git commit -m b');
      expect(run(third, 'gto register model').last.text).toMatch(/model@v1\.10\.1/);
    });
  });

  describe('assign', () => {
    const registered = () => setup(g(), 'gto register model --version v1.0.0');

    it('needs a name, a version and a stage', () => {
      for (const cmd of ['gto assign', 'gto assign model --version v1.0.0', 'gto assign model --stage prod']) {
        const { last } = run(registered(), cmd);
        expect(last.result.ok).toBe(false);
        expect(last.text).toBe('Usage: gto assign NAME --version vX.Y.Z --stage STAGE');
      }
    });

    it('validates the version string and requires it to be registered', () => {
      const bad = run(registered(), 'gto assign model --version nope --stage prod').last;
      expect(bad.text).toBe("ERROR: Version 'nope' is not valid. Example of valid version: 'v1.0.0'");
      const unreg = run(registered(), 'gto assign model --version v9.0.0 --stage prod').last;
      expect(unreg.result.ok).toBe(false);
      expect(unreg.text).toBe("ERROR: Version 'v9.0.0' is not registered. Register it first: gto register model --version v9.0.0");
    });

    it('creates model#prod#1, refuses a repeat unless --force, then counts up', () => {
      const first = run(registered(), 'gto assign model --version 1.0.0 --stage prod');
      expect(first.last.text).toBe("Created git tag 'model#prod#1' that assigns stage to version 'v1.0.0'\nTo push the changes upstream, run:\n    git push origin model#prod#1");
      const dup = run(first.state, 'gto assign model --version v1.0.0 --stage prod').last;
      expect(dup.result.ok).toBe(false);
      expect(dup.text).toMatch(/already in stage 'prod'\. Use the '--force' flag/);
      const forced = run(first.state, 'gto assign model --version v1.0.0 --stage prod --force');
      expect(forced.last.text).toMatch(/model#prod#2/);
    });
  });

  describe('show', () => {
    it('says nothing is registered', () => {
      expect(run(g(), 'gto show').last.text).toBe('Nothing registered yet. Try `gto register <name> --version v1.0.0`.');
      expect(run(g(), 'gto show model').last.text).toBe("No versions of 'model' registered.");
    });

    it('prints a table of latest versions and stage assignments', () => {
      const s = setup(g(), 'gto register model --version v1.0.0', 'gto assign model --version v1.0.0 --stage prod');
      const out = run(s, 'gto show').last.text;
      expect(out.split('\n')).toEqual(['artifact  latest  #prod', 'model     v1.0.0  v1.0.0']);
      expect(run(s, 'gto show model').last.text).toBe(out);
      expect(run(s, 'gto show other').last.text).toBe("No versions of 'other' registered.");
    });

    it('shows - for stages a model has not been assigned to', () => {
      const s0 = repo();
      s0.files['n.md'] = makeFile('n.md', 'code');
      const s = setup(
        s0,
        'gto register model --version v1.0.0',
        'git add n.md',
        'git commit -m x',
        'gto register other --version v0.1.0',
        'gto assign model --version v1.0.0 --stage prod',
      );
      const rows = run(s, 'gto show').last.text.split('\n');
      expect(rows).toEqual(['artifact  latest  #prod', 'model     v1.0.0  v1.0.0', 'other     v0.1.0  -']);
    });
  });
});

describe('dvc artifacts get', () => {
  const withArtifact = () => {
    const s = repo();
    s.dvcYaml = ['stages: {}', 'artifacts:', '  model:', '    path: models/model.pkl', '    type: model', ''].join('\n');
    s.files['models/model.pkl'] = makeFile('models/model.pkl', 'data');
    return s;
  };

  it('fails when nothing is registered, naming the GTO command to run', () => {
    const { last } = run(withArtifact(), 'dvc artifacts get . model');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/no version of it is registered in this repository\./);
    expect(last.text).toMatch(/gto register model --version v1\.0\.0/);
  });

  it('--rev must name a registered version and lists the known ones', () => {
    const none = run(withArtifact(), 'dvc artifacts get . model --rev v1.0.0').last;
    expect(none.text).toBe("ERROR: Unable to find artifact 'model' with version 'v1.0.0'. No version is registered yet.");
    const s = setup(withArtifact(), 'gto register model --version v1.0.0');
    const wrong = run(s, 'dvc artifacts get . model --rev v2.0.0').last;
    expect(wrong.text).toBe("ERROR: Unable to find artifact 'model' with version 'v2.0.0'. Registered versions: v1.0.0.");
  });

  it('--stage needs an assignment', () => {
    const s = setup(withArtifact(), 'gto register model --version v1.0.0');
    const { last } = run(s, 'dvc artifacts get . model --stage prod');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/Unable to find artifact 'model' in stage 'prod'\. Assign one first: gto assign model --version <vX\.Y\.Z> --stage prod/);
  });

  it('the artifact must be declared in dvc.yaml', () => {
    const s = setup(withArtifact(), 'gto register other --version v1.0.0');
    const { last } = run(s, 'dvc artifacts get . other');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe(
      "ERROR: Unable to find artifact 'other' in the artifacts: section of dvc.yaml at other@v1.0.0. Declared: model.",
    );
    const noYaml = setup(repo(), 'gto register other --version v1.0.0');
    expect(run(noYaml, 'dvc artifacts get . other').last.text).toMatch(/Declared: \(none\)\./);
  });

  it('downloads the latest version to the file name from dvc.yaml, or to -o', () => {
    const s = setup(withArtifact(), 'gto register model --version v1.0.0');
    const first = run(s, 'dvc artifacts get . model');
    expect(first.last.text).toBe("Downloaded artifact 'model' version v1.0.0 from .\n  models/model.pkl -> model.pkl");
    expect(first.state.files['model.pkl']!.contentId).toBe(s.files['models/model.pkl']!.contentId);
    const out = run(s, 'dvc artifacts get . model -o prod/model.pkl --rev 1.0.0');
    expect(out.last.text).toMatch(/models\/model\.pkl -> prod\/model\.pkl/);
    expect(out.state.files['prod/model.pkl']!.present).toBe(true);
  });

  it('--stage downloads the version currently assigned to that stage', () => {
    const s = setup(withArtifact(), 'gto register model --version v1.0.0', 'gto assign model --version v1.0.0 --stage prod');
    const { last } = run(s, 'dvc artifacts get . model --stage prod');
    expect(last.text).toMatch(/^Downloaded artifact 'model' version v1\.0\.0 \(stage prod\) from \./);
  });

  it('a declared artifact whose file is not in the workspace still downloads a deterministic placeholder', () => {
    const s = setup(withArtifact(), 'gto register model --version v1.0.0');
    delete s.files['models/model.pkl'];
    const a = run(s, 'dvc artifacts get . model').state.files['model.pkl']!.contentId;
    const b = run(s, 'dvc artifacts get . model').state.files['model.pkl']!.contentId;
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).toBe(b);
  });
});
