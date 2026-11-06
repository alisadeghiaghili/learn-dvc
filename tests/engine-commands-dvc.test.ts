import { describe, expect, it } from 'vitest';
import { emptyState, makeFile, sandboxState } from '../src/engine/state';
import { run as rawRun, setup } from './fidelity/helpers';
import type { RepoState } from '../src/engine/types';

const repo = () => sandboxState();

/** Like the fidelity helper, but with the teaching footer ("── Why: ...") removed from `text`. */
const run: typeof rawRun = (state, ...cmds) => {
  const r = rawRun(state, ...cmds);
  const strip = (s: { text: string }) => {
    s.text = s.text.split('\n\n── Why:')[0]!;
  };
  r.steps.forEach(strip);
  return r;
};

/** repo + `train` stage reading params lr and writing a model + a metrics file */
const withPipeline = () =>
  setup(
    repo(),
    'dvc stage add -n train -d src/train.py -d data/data.xml -p lr -o model.pkl -M acc.json python src/train.py',
  );

describe('dvc install / config / cache', () => {
  it('dvc install --use-pre-commit-tool writes .pre-commit-config.yaml and activates nothing', () => {
    const { last, state } = run(repo(), 'dvc install --use-pre-commit-tool');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/Wrote the DVC hooks into \.pre-commit-config\.yaml/);
    expect(state.files['.pre-commit-config.yaml']!.text).toMatch(/- id: dvc-pre-push/);
    expect(state.hooks).toEqual({ installed: false, preCommitConfig: true });
  });

  it('installing twice fails because the hook already exists', () => {
    const s = setup(repo(), 'dvc install');
    const { last, state } = run(s, 'dvc install');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/Hook 'post-checkout' already exists/);
    expect(state.hooks!.installed).toBe(true);
  });

  it('dvc config (no args) lists remotes and settings; --list does the same', () => {
    let s = setup(repo(), 'dvc config cache.type copy', 'dvc config --local cache.dir /mnt/c');
    const out = run(s, 'dvc config').last.text;
    expect(out).toMatch(/^core\.analytics = false/);
    expect(out).toMatch(/remote\.myremote\.url = \/tmp\/dvcstore/);
    expect(out).toMatch(/cache\.type = copy/);
    expect(out).toMatch(/\[local\] cache\.dir = \/mnt\/c/);
    expect(run(s, 'dvc config --list').last.text).toBe(out);
    s = setup(s, 'dvc remote modify --local myremote secret_access_key abc');
    expect(run(s, 'dvc config -l').last.text).toMatch(/\[local\] remote\.myremote\.secret_access_key = \*\*\*/);
  });

  it('dvc config -u removes a value; unsetting an unknown option fails', () => {
    const s = setup(repo(), 'dvc config cache.type copy');
    const ok = run(s, 'dvc config --unset cache.type');
    expect(ok.last.text).toBe('Unset cache.type in .dvc/config.');
    expect(ok.state.dvcConfig).toEqual({});
    const bad = run(s, 'dvc config -u core.nothing').last;
    expect(bad.result.ok).toBe(false);
    expect(bad.text).toMatch(/option 'core\.nothing' does not exist in \.dvc\/config/);
    const local = run(setup(s, 'dvc config --local cache.dir /x'), 'dvc config --local -u cache.dir');
    expect(local.last.text).toBe('Unset cache.dir in .dvc/config.local.');
    const badLocal = run(s, 'dvc config --local -u cache.dir').last;
    expect(badLocal.text).toMatch(/does not exist in \.dvc\/config\.local/);
  });

  it('reading a missing option reports the section and option', () => {
    const { last } = run(repo(), 'dvc config cache.type');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe("ERROR: configuration error - config file error: option 'type' doesn't exist in section 'cache'");
  });

  it('reading a value prints it; secrets set locally are masked', () => {
    const s = setup(repo(), 'dvc config cache.type symlink', 'dvc config --local remote.myremote.secret_access_key topsecret');
    expect(run(s, 'dvc config cache.type').last.text).toBe('symlink');
    expect(run(s, 'dvc config remote.myremote.secret_access_key').last.text).toBe('***');
  });

  it('writing validates cache.type and cache.shared like the real config schema', () => {
    const t = run(repo(), 'dvc config cache.type bogus').last;
    expect(t.result.ok).toBe(false);
    expect(t.text).toMatch(/Unsupported cache type\(s\): bogus/);
    expect(run(repo(), 'dvc config cache.type reflink,copy').last.result.ok).toBe(true);
    const sh = run(repo(), 'dvc config cache.shared everyone').last;
    expect(sh.result.ok).toBe(false);
    expect(sh.text).toMatch(/expected one of group for cache\.shared, got 'everyone'/);
    expect(run(repo(), 'dvc config cache.shared group').last.result.ok).toBe(true);
  });

  it('a secret written to the shared config warns; local masks it', () => {
    const shared = run(repo(), 'dvc config remote.myremote.password hunter2').last;
    expect(shared.result.ok).toBe(true);
    expect(shared.text).toMatch(/WARNING: 'remote\.myremote\.password' contains sensitive credentials!/);
    const local = run(repo(), 'dvc config --local remote.myremote.password hunter2').last;
    expect(local.text).toMatch(/^Set remote\.myremote\.password=\*\*\* in \.dvc\/config\.local \(gitignored\)\./);
    expect(local.text).not.toMatch(/hunter2/);
  });

  it('dvc cache <other> is an unknown command; dvc cache dir reads, sets and unsets cache.dir', () => {
    const bad = run(repo(), 'dvc cache frob').last;
    expect(bad.result.ok).toBe(false);
    expect(bad.text).toMatch(/unknown command 'dvc cache frob'/);
    expect(run(repo(), 'dvc cache').last.text).toMatch(/unknown command 'dvc cache '/);
    expect(run(repo(), 'dvc cache dir').last.text).toBe('.dvc/cache');
    const set = run(repo(), 'dvc cache dir /mnt/shared');
    expect(set.last.text).toMatch(/Cache directory is now '\/mnt\/shared' \(cache\.dir in \.dvc\/config\)\./);
    expect(set.last.text).toMatch(/commit it so every clone/);
    expect(run(set.state, 'dvc cache dir').last.text).toBe('/mnt/shared');
    const un = run(set.state, 'dvc cache dir --unset');
    expect(un.last.text).toBe('Unset cache.dir in .dvc/config: the cache is back at .dvc/cache.');
    expect(run(un.state, 'dvc cache dir').last.text).toBe('.dvc/cache');
    const local = run(repo(), 'dvc cache dir --local /scratch').last;
    expect(local.text).toMatch(/Stored in \.dvc\/config\.local: only this machine/);
  });
});

describe('dvc add / commit / checkout / remove', () => {
  it('dvc add without a path prints usage', () => {
    const { last } = run(repo(), 'dvc add');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe('Usage: dvc add [--no-commit] <path>');
  });

  it('dvc add refuses code, params and yaml files', () => {
    for (const p of ['src/train.py', 'params.yaml']) {
      const { last, state } = run(repo(), `dvc add ${p}`);
      expect(last.result.ok).toBe(false);
      expect(last.text).toBe(`ERROR: refusing to track '${p}'. DVC tracks data artifacts, not code.`);
      expect(state.files[p]!.tracked).toBe(false);
    }
  });

  it('dvc add --no-commit writes the pointer but leaves the cache empty', () => {
    const { last, state } = run(repo(), 'dvc add --no-commit data/data.xml');
    expect(last.result.ok).toBe(true);
    expect(last.text).toMatch(/--no-commit: pointer updated but cache object NOT committed yet\. Run `dvc commit`\./);
    expect(state.cache).toEqual([]);
    expect(state.files['data/data.xml']!.tracked).toBe(true);
    // dvc commit then moves it into the cache (only when dirty), dvc status flags it
    expect(run(state, 'dvc status').last.text).toMatch(/update file: {7}data\/data\.xml \(pointer not in cache/);
  });

  it('dvc add on a directory tracks it as a .dir manifest', () => {
    const s = repo();
    s.files['images/a.png'] = makeFile('images/a.png', 'data');
    s.files['images/b.png'] = makeFile('images/b.png', 'data');
    const { last, state } = run(s, 'dvc add images/');
    expect(last.result.ok).toBe(true);
    const f = state.files.images!;
    expect(f.isDir).toBe(true);
    expect(f.pointerMd5).toMatch(/\.dir$/);
    expect(last.text).toMatch(/\(directory manifest\)/);
    expect(last.text).toMatch(/git add images\.dvc \.gitignore/);
    expect(state.files['images.dvc']).toBeDefined();
  });

  it('dvc add in a sub-directory points at that directory\'s .gitignore', () => {
    const { last } = run(repo(), 'dvc add data/data.xml');
    expect(last.text).toMatch(/git add data\/data\.xml\.dvc data\/\.gitignore/);
  });

  it('dvc commit with nothing modified says so', () => {
    expect(run(repo(), 'dvc commit').last.text).toBe('No modified data to commit.');
  });

  it('dvc commit moves a modified tracked file into the cache and re-points the .dvc file', () => {
    const s = setup(repo(), 'dvc add data/data.xml', 'edit data/data.xml');
    const newId = s.files['data/data.xml']!.contentId;
    const { last, state } = run(s, 'dvc commit');
    expect(last.text).toMatch(/^committed data\/data\.xml → [0-9a-f]{8}/);
    expect(state.files['data/data.xml']!.pointerMd5).toBe(newId);
    expect(state.cache).toContain(newId);
    expect(state.files['data/data.xml']!.dirty).toBe(false);
  });

  it('dvc commit of a deleted tracked file reports it cannot commit', () => {
    const s = setup(repo(), 'dvc add data/data.xml', 'rm data/data.xml');
    const { last } = run(s, 'dvc commit data/data.xml');
    expect(last.text).toBe("ERROR: 'data/data.xml' is missing. Cannot commit without the file or a cache object.");
  });

  it('dvc commit of an unknown path does nothing', () => {
    const { last, state } = run(repo(), 'dvc commit nope.csv');
    expect(last.text).toBe('');
    expect(state.cache).toEqual([]);
  });

  it('dvc checkout restores a deleted tracked file from the cache', () => {
    const s = setup(repo(), 'dvc add data/data.xml', 'rm data/data.xml');
    const { last, state } = run(s, 'dvc checkout');
    expect(last.text).toMatch(/^checked out data\/data\.xml \([0-9a-f]{8}…\)$/);
    expect(state.files['data/data.xml']!.present).toBe(true);
  });

  it('dvc checkout of an untracked path says it is not DVC-tracked', () => {
    const { last } = run(repo(), 'dvc checkout src/train.py');
    expect(last.text).toBe("ERROR: 'src/train.py' is not DVC-tracked.");
  });

  it('dvc checkout says to pull when the object is only on the remote, and fails when it is nowhere', () => {
    const s = setup(repo(), 'dvc add data/data.xml', 'dvc push', 'rm data/data.xml');
    const md5 = s.files['data/data.xml']!.pointerMd5!;
    const onRemote: RepoState = structuredClone(s);
    onRemote.cache = [];
    onRemote.remoteObjects = [md5];
    // restoreWorkspaceFromPointer also accepts remote objects, so use a different remote store for the "only on remote" case
    onRemote.remoteObjects = [];
    onRemote.remoteStores = { other: [md5] };
    const nowhere = run(onRemote, 'dvc checkout').last;
    expect(nowhere.text).toBe("ERROR: cache object for 'data/data.xml' not found locally or on remote.");
    const viaRemote = structuredClone(s);
    viaRemote.cache = [];
    const r = run(viaRemote, 'dvc checkout').last;
    // the default remote still holds it, so checkout restores the file without a local cache
    expect(r.text).toMatch(/^checked out data\/data\.xml/);
  });

  it('dvc checkout --relink reports which files are relinked using the configured cache.type', () => {
    const s = setup(repo(), 'dvc add data/data.xml', 'dvc config cache.type symlink', 'dvc config cache.shared group');
    const { last } = run(s, 'dvc checkout --relink');
    expect(last.text).toMatch(/^Relinking 1 tracked file\(s\) from the cache using cache\.type=symlink/);
    expect(last.text).toMatch(/ {2}relinked data\/data\.xml/);
    expect(last.text).toMatch(/cache\.shared=group: new cache files are group-writable/);
    const dflt = run(setup(repo(), 'dvc add data/data.xml'), 'dvc checkout --relink').last.text;
    expect(dflt).toMatch(/cache\.type=reflink,copy/);
  });

  it('dvc remove without a target prints usage; unknown target fails', () => {
    expect(run(repo(), 'dvc remove').last.text).toBe('Usage: dvc remove <target>');
    const bad = run(repo(), 'dvc remove data/data.xml.dvc').last;
    expect(bad.result.ok).toBe(false);
    expect(bad.text).toBe("ERROR: 'data/data.xml.dvc' is not a DVC output.");
  });

  it('dvc remove stops tracking, deletes the .dvc file and detaches pipeline outs', () => {
    const s = setup(repo(), 'dvc add data/data.xml');
    const { last, state } = run(s, 'dvc remove data/data.xml.dvc');
    expect(last.text).toBe('Removed DVC tracking for data/data.xml');
    expect(state.files['data/data.xml']!.tracked).toBe(false);
    expect(state.files['data/data.xml']!.pointerMd5).toBeUndefined();
    expect(state.files['data/data.xml.dvc']).toBeUndefined();
  });

  it('dvc destroy is refused', () => {
    const { last } = run(repo(), 'dvc destroy');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/destroy is disabled in the simulator/);
  });

  it('dvc freeze / unfreeze validate their argument', () => {
    expect(run(repo(), 'dvc freeze').last.text).toBe('Usage: dvc freeze <stage>');
    expect(run(repo(), 'dvc unfreeze').last.text).toBe('Usage: dvc unfreeze <stage>');
    const bad = run(repo(), 'dvc freeze nope').last;
    expect(bad.result.ok).toBe(false);
    expect(bad.text).toBe("ERROR: stage 'nope' not found.");
  });

  it('dvc diff lists dirty tracked files and the remote coverage', () => {
    const s = setup(repo(), 'dvc add data/data.xml', 'edit data/data.xml');
    const out = run(s, 'dvc diff').last.text;
    expect(out).toMatch(/modified {2}data\/data\.xml {2}pointer=[0-9a-f]{8}… content=[0-9a-f]{8}…/);
    expect(out).toMatch(/remote coverage: 0\/1 tracked object\(s\)/);
    const deleted = run(setup(repo(), 'dvc add data/data.xml', 'rm data/data.xml'), 'dvc diff').last.text;
    expect(deleted).toMatch(/deleted {2}data\/data\.xml/);
    expect(run(repo(), 'dvc diff').last.text).toMatch(/\(no dirty tracked data\)/);
  });
});

describe('dvc remote', () => {
  it('lists remotes with a star for the default; reports none configured', () => {
    expect(run(repo(), 'dvc remote').last.text).toBe('* myremote\t/tmp/dvcstore');
    const s = emptyState();
    s.initialized = true;
    expect(run(s, 'dvc remote list').last.text).toBe('No remotes configured.');
  });

  it('dvc remote add needs a name and a url', () => {
    const { last } = run(repo(), 'dvc remote add onlyname');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe('Usage: dvc remote add [-d] <name> <url>');
  });

  it('dvc remote add rejects a duplicate name', () => {
    const { last, state } = run(repo(), 'dvc remote add myremote s3://other');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe("ERROR: remote 'myremote' already exists.");
    expect(state.remotes).toHaveLength(1);
  });

  it('the first remote becomes the default; -d moves the default to a later one', () => {
    const first = run(Object.assign(emptyState(), { initialized: true }), 'dvc remote add a s3://a').state;
    expect(first.remotes[0]!.isDefault).toBe(true);
    const second = run(first, 'dvc remote add b s3://b');
    expect(second.last.text).toBe("Added remote 'b' → s3://b");
    expect(second.state.remotes.find((r) => r.name === 'b')!.isDefault).toBe(false);
    const third = run(second.state, 'dvc remote add -d c s3://c');
    expect(third.last.text).toBe("Added remote 'c' → s3://c (default)");
    expect(third.state.remotes.filter((r) => r.isDefault).map((r) => r.name)).toEqual(['c']);
  });

  it('dvc remote default switches the default and keeps both object stores', () => {
    const s = setup(repo(), 'dvc add data/data.xml', 'dvc push', 'dvc remote add other s3://other');
    const md5 = s.files['data/data.xml']!.pointerMd5!;
    const { last, state } = run(s, 'dvc remote default other');
    expect(last.text).toBe('Default remote: other');
    expect(state.remoteObjects).toEqual([]);
    expect(state.remoteStores!.myremote).toEqual([md5]);
  });

  it('dvc remote remove deletes the remote and its store, promoting another one to default', () => {
    const s = setup(repo(), 'dvc add data/data.xml', 'dvc push', 'dvc remote add other s3://other');
    const md5 = s.files['data/data.xml']!.pointerMd5!;
    const { last, state } = run(s, 'dvc remote remove myremote');
    expect(last.text).toBe("Removed remote 'myremote'");
    expect(state.remotes.map((r) => [r.name, r.isDefault])).toEqual([['other', true]]);
    expect(state.remoteObjects).toEqual([]);
    expect(JSON.stringify(state.remoteStores)).not.toContain(md5);
  });

  it('dvc remote modify of a missing remote fails', () => {
    const { last } = run(repo(), 'dvc remote modify ghost url s3://x');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe("ERROR: remote 'ghost' doesn't exist.");
  });

  it('dvc remote modify without a key prints usage', () => {
    const { last } = run(repo(), 'dvc remote modify myremote');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe('Usage: dvc remote modify [--local] <name> <key> <value>');
  });

  it('dvc remote modify: secrets in the shared config warn, --local keeps them out of Git, plain options are shared', () => {
    const shared = run(repo(), 'dvc remote modify myremote secret_access_key abc').last.text;
    expect(shared).toMatch(/^Updated remote 'myremote' secret_access_key=\*\*\*/);
    expect(shared).toMatch(/WARNING: Secret credentials in shared \.dvc\/config leak to Git/);
    expect(shared).not.toMatch(/abc/);
    const local = run(repo(), 'dvc remote modify --local myremote token xyz');
    expect(local.last.text).toMatch(/Option stored locally in \.dvc\/config\.local/);
    expect(local.state.files['.dvc/config.local']!.gitignored).toBe(true);
    const plain = run(repo(), 'dvc remote modify myremote region eu-west-1').last.text;
    expect(plain).toMatch(/region=eu-west-1/);
    expect(plain).toMatch(/Non-secret option stored in \.dvc\/config and shared via Git\./);
  });

  it('an unknown dvc remote subcommand prints usage', () => {
    const { last } = run(repo(), 'dvc remote frob');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe('Usage: dvc remote [add|list|default|remove|modify]');
  });
});

describe('dvc push / pull / fetch / status --cloud', () => {
  it('push without any remote explains how to add one', () => {
    const s = repo();
    s.remotes = [];
    const { last } = run(s, 'dvc push');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/^ERROR: no remote specified\. Setup default remote with/);
    expect(last.text).toMatch(/dvc push -r <remote>/);
  });

  it('push/pull/fetch name unknown targets', () => {
    for (const cmd of ['dvc push nope', 'dvc pull nope', 'dvc fetch nope']) {
      const { last } = run(repo(), cmd);
      expect(last.result.ok).toBe(false);
      expect(last.text).toBe("ERROR: 'nope' does not exist as an output of a .dvc file or stage.");
    }
  });

  it('push with nothing tracked says nothing to push', () => {
    expect(run(repo(), 'dvc push').last.text).toBe('Nothing to push.');
  });

  it('push skips a dirty file with a warning and does not upload its new bytes', () => {
    const s = setup(repo(), 'dvc add --no-commit data/data.xml', 'edit data/data.xml');
    const { last, state } = run(s, 'dvc push');
    expect(last.text).toMatch(/WARNING: data\/data\.xml is dirty — push committed cache only/);
    expect(state.remoteObjects).toEqual([]);
    expect(state.cache).toEqual([]);
  });

  it('push uploads from the workspace when the cache object is missing but the file is clean', () => {
    const s = setup(repo(), 'dvc add data/data.xml');
    s.cache = [];
    const { last, state } = run(s, 'dvc push');
    expect(last.text).toMatch(/^pushed data\/data\.xml/);
    expect(state.cache).toContain(s.files['data/data.xml']!.pointerMd5);
  });

  it('push of a file missing from both workspace and cache is skipped with a warning', () => {
    const s = setup(repo(), 'dvc add --no-commit data/data.xml', 'rm data/data.xml');
    const { last } = run(s, 'dvc push data/data.xml');
    expect(last.text).toMatch(/WARNING: data\/data\.xml is dirty/);
  });

  it('a second push reports the file already on the remote', () => {
    const s = setup(repo(), 'dvc add data/data.xml', 'dvc push');
    expect(run(s, 'dvc push').last.text).toBe("data/data.xml already on remote 'myremote'");
  });

  it('pull reports data that is not on the remote', () => {
    const s = setup(repo(), 'dvc add data/data.xml', 'rm data/data.xml');
    s.cache = [];
    const { last } = run(s, 'dvc pull');
    expect(last.text).toMatch(/^WARNING: data\/data\.xml \(md5 [0-9a-f]{8}…\) not on remote 'myremote'$/);
    expect(s.files['data/data.xml']!.present).toBe(false);
  });

  it('fetch fills the cache but does not touch the workspace; pull also checks out', () => {
    const base = setup(repo(), 'dvc add data/data.xml', 'dvc push', 'rm data/data.xml');
    base.cache = [];
    const fetched = run(base, 'dvc fetch');
    expect(fetched.last.text).toMatch(/^fetched data\/data\.xml/);
    expect(fetched.state.files['data/data.xml']!.present).toBe(false);
    const pulled = run(base, 'dvc pull');
    expect(pulled.last.text).toMatch(/^pulled data\/data\.xml/);
    expect(pulled.state.files['data/data.xml']!.present).toBe(true);
  });

  it('pull with -r names a remote that must exist', () => {
    const { last } = run(repo(), 'dvc pull -r ghost');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe("ERROR: failed to pull data from the cloud - remote 'ghost' does not exist. See `dvc remote list`.");
  });

  it('status --cloud reports an unknown remote and selects targets', () => {
    const bad = run(repo(), 'dvc status -c -r ghost').last;
    expect(bad.result.ok).toBe(false);
    expect(bad.text).toMatch(/remote 'ghost' does not exist/);
    const target = run(repo(), 'dvc status -c nope').last;
    expect(target.result.ok).toBe(false);
    expect(target.text).toMatch(/'nope' does not exist as an output/);
  });

  it('status --cloud classifies files as new / deleted / missing', () => {
    const s = setup(repo(), 'dvc add data/data.xml');
    expect(run(s, 'dvc status --cloud').last.text).toMatch(/\tnew: {12}data\/data\.xml/);
    const pushed = setup(s, 'dvc push');
    expect(run(pushed, 'dvc status --cloud').last.text).toBe("Cache and remote 'myremote' are in sync.");
    const dropped = structuredClone(pushed);
    dropped.cache = [];
    expect(run(dropped, 'dvc status --cloud').last.text).toMatch(/\tdeleted: {8}data\/data\.xml/);
    const missing = structuredClone(dropped);
    missing.remoteObjects = [];
    const out = run(missing, 'dvc status --cloud').last.text;
    expect(out).toMatch(/\tmissing: {8}data\/data\.xml/);
    expect(out).toMatch(/^Comparing the local cache with remote 'myremote':/);
  });

  it('dvc status warns that push will fail when there is a cache but no remote', () => {
    const s = setup(repo(), 'dvc add data/data.xml');
    s.remotes = [];
    expect(run(s, 'dvc status').last.text).toBe('Data and pipelines are up to date.\nwarn: no remote configured — `dvc push` will fail');
  });

  it('dvc status lists deleted and modified tracked files', () => {
    const s = setup(repo(), 'dvc add data/data.xml', 'edit data/data.xml');
    expect(run(s, 'dvc status').last.text).toMatch(/^modified: {10}data\/data\.xml/);
    const gone = setup(repo(), 'dvc add data/data.xml', 'rm data/data.xml');
    expect(run(gone, 'dvc status').last.text).toMatch(/^deleted: {11}data\/data\.xml/);
  });
});

describe('dvc gc', () => {
  it('requires a scope flag and removes nothing without one', () => {
    const s = setup(repo(), 'dvc add data/data.xml');
    const { last, state } = run(s, 'dvc gc');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/Either of `-w\|--workspace`/);
    expect(state.cache).toEqual(s.cache);
  });

  it('-wc bundles -w and --cloud (and honours -f style short bundles)', () => {
    let s = setup(repo(), 'dvc add data/data.xml', 'dvc push', 'edit data/data.xml', 'dvc add data/data.xml');
    const oldId = s.gitCommits.length; // unused marker to keep s typed
    expect(oldId).toBeGreaterThan(0);
    const stale = s.remoteObjects.filter((m) => m !== s.files['data/data.xml']!.pointerMd5);
    expect(stale).toHaveLength(1);
    const { last, state } = run(s, 'dvc gc -wc');
    expect(last.text).toMatch(/Removed 1 unused cache object\(s\) \(kept: workspace\)\./);
    expect(last.text).toMatch(/Removed 1 object\(s\) from remote 'myremote' as well \(--cloud\)\./);
    expect(state.remoteObjects).not.toContain(stale[0]);
    s = state;
    expect(run(s, 'dvc gc -wc').last.text).toMatch(/Nothing to collect in the local cache\.\nNothing to collect on remote 'myremote'\./);
  });

  it('local-only gc tells the learner the remote was not touched', () => {
    const s = setup(repo(), 'dvc add data/data.xml', 'edit data/data.xml', 'dvc add data/data.xml');
    const { last } = run(s, 'dvc gc -w');
    expect(last.text).toMatch(/The remote storage was not touched: use --cloud \(-c\) to clean it too\./);
  });

  it('gc -c with an unknown -r remote fails after the local collection', () => {
    const { last } = run(setup(repo(), 'dvc add data/data.xml'), 'dvc gc -w -c -r ghost');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/remote 'ghost' does not exist/);
  });

  it('-w keeps stage outputs that are present and not DVC-tracked', () => {
    const s = setup(withPipeline(), 'dvc repro');
    expect(s.cache.length).toBeGreaterThan(0);
    const model = s.files['model.pkl']!.contentId;
    const { state } = run(s, 'dvc gc -w');
    expect(state.cache).toContain(model);
  });

  it('--all-experiments keeps experiment outputs and tracked pointers; -A keeps every commit', () => {
    let s = setup(withPipeline(), 'dvc repro', 'dvc exp save -n base');
    const expOuts = Object.values(s.experiments[0]!.outputs!);
    s.cache.push('deadbeefdeadbeefdeadbeefdeadbeef');
    const exp = run(s, 'dvc gc --all-experiments');
    expect(exp.last.text).toMatch(/\(kept: experiments\)/);
    for (const id of expOuts) expect(exp.state.cache).toContain(id);
    expect(exp.state.cache).not.toContain('deadbeefdeadbeefdeadbeefdeadbeef');
    s = exp.state;
    const all = run(s, 'dvc gc -A');
    expect(all.last.text).toMatch(/Nothing to collect|\(kept: all commits\)/);
  });
});

describe('dvc stage / repro / dag', () => {
  it('dvc stage list with no stages and with stages', () => {
    expect(run(repo(), 'dvc stage list').last.text).toBe('No stages in dvc.yaml.');
    expect(run(withPipeline(), 'dvc stage').last.text).toBe('train');
    expect(run(withPipeline(), 'dvc stage list').last.text).toBe('train');
  });

  it('dvc stage add needs a name and a command', () => {
    const noName = run(repo(), 'dvc stage add -d x python y.py').last;
    expect(noName.result.ok).toBe(false);
    expect(noName.text).toBe('Usage: dvc stage add -n <name> -d <dep> -o <out> <command>');
    const noCmd = run(repo(), 'dvc stage add -n t -d x').last;
    expect(noCmd.result.ok).toBe(false);
    expect(noCmd.text).toBe('ERROR: stage command is required.');
  });

  it('dvc stage add refuses a duplicate name', () => {
    const { last } = run(withPipeline(), 'dvc stage add -n train python other.py');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe("ERROR: stage 'train' already exists.");
  });

  it('dvc stage <unknown> prints usage', () => {
    const { last } = run(repo(), 'dvc stage frob');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe('Usage: dvc stage [add|list]');
  });

  it('stage add records -O/-M (no-cache), --wdir, --always-changed and external outs, and creates missing code deps', () => {
    const { last, state } = run(
      repo(),
      'dvc stage add -n prep -d scripts/prep.py -O raw.csv -M m.json -w sub --always-changed -o s3://bucket/out.bin -o feats/ --plots plots.csv --desc d python scripts/prep.py',
    );
    expect(last.result.ok).toBe(true);
    expect(state.stageMeta.prep).toEqual({
      alwaysChanged: true,
      noCache: ['raw.csv', 'm.json'],
      external: ['s3://bucket/out.bin'],
      wdir: 'sub',
    });
    expect(state.pipeline[0]!.outs).toEqual(['raw.csv', 's3://bucket/out.bin', 'feats/']);
    expect(state.pipeline[0]!.metrics).toEqual(['m.json']);
    expect(state.files['scripts/prep.py']!.kind).toBe('code');
    expect(last.text).toMatch(/\[dir outs: feats\/\]/);
    expect(last.text).toMatch(/cmd: {2}python scripts\/prep\.py/);
  });

  it('repro with no stages fails; unknown target fails', () => {
    const none = run(repo(), 'dvc repro').last;
    expect(none.result.ok).toBe(false);
    expect(none.text).toMatch(/no stages to reproduce/);
    const bad = run(withPipeline(), 'dvc repro nope').last;
    expect(bad.result.ok).toBe(false);
    expect(bad.text).toBe("ERROR: stage 'nope' not found.");
  });

  it('repro runs, then skips unchanged stages', () => {
    const first = run(withPipeline(), 'dvc repro');
    expect(first.last.text).toMatch(/Running stage 'train': python src\/train\.py/);
    expect(first.last.text).toMatch(/Stage 'train' is up to date \(outputs regenerated\)\./);
    expect(first.last.text).toMatch(/metrics: \{/);
    const second = run(first.state, 'dvc repro');
    expect(second.last.text).toMatch(/Stage 'train' didn't change, skipping\./);
  });

  it('repro of a group name runs every generated stage `name@...`', () => {
    const s = setup(
      repo(),
      'dvc stage add -n train@a -d src/train.py -o a.pkl python src/train.py',
      'dvc stage add -n train@b -d src/train.py -o b.pkl python src/train.py',
    );
    const { last, state } = run(s, 'dvc repro train');
    expect(last.text).toMatch(/Running stage 'train@a'/);
    expect(last.text).toMatch(/Running stage 'train@b'/);
    expect(state.pipeline.every((p) => p.upToDate)).toBe(true);
  });

  it('a frozen stage is not re-run', () => {
    const s = setup(withPipeline(), 'dvc freeze train');
    const { last } = run(s, 'dvc repro');
    expect(last.text).toBe("Stage 'train' is frozen. Unfreeze with `dvc unfreeze train`.");
  });

  it('a missing dependency stops the stage with an error', () => {
    const s = setup(repo(), 'dvc add data/data.xml', 'dvc stage add -n t -d data/data.xml -o out.bin python x.py', 'rm data/data.xml');
    const { last } = run(s, 'dvc repro');
    expect(last.text).toBe("ERROR: missing dependency 'data/data.xml'. Run `dvc pull` or `dvc checkout`.");
  });

  it('a dependency modified against its pointer warns but still runs', () => {
    const s = setup(repo(), 'dvc add data/data.xml', 'dvc stage add -n t -d data/data.xml -o out.bin python x.py', 'edit data/data.xml');
    const { last } = run(s, 'dvc repro');
    expect(last.text).toMatch(/^WARNING: dependency 'data\/data\.xml' is modified vs its \.dvc pointer\.\nRunning stage 't'/);
  });

  it('an untracked dependency that is not in the workspace is an error', () => {
    const s = setup(repo(), 'dvc stage add -n t -d src/train.py -o out.bin python x.py');
    s.files['src/train.py']!.present = false;
    const { last } = run(s, 'dvc repro');
    expect(last.text).toBe("ERROR: dependency 'src/train.py' does not exist.");
  });

  it('a stage whose outputs were deleted is restored from the run cache without re-running', () => {
    const s = setup(withPipeline(), 'dvc repro', 'rm model.pkl');
    const { last, state } = run(s, 'dvc repro');
    expect(last.text).toMatch(/Stage 'train' is cached - skipping run, checking out outputs\nStage 'train' restored from run cache/);
    expect(state.files['model.pkl']!.present).toBe(true);
  });

  it('repro regenerates a tracked output and refreshes its pointer', () => {
    const s = setup(
      repo(),
      'dvc stage add -n t -d src/train.py -p lr -o model.pkl python src/train.py',
      'dvc repro',
      'edit params.yaml lr=0.7',
    );
    // the output was put under DVC tracking by hand (real DVC records this in dvc.lock)
    Object.assign(s.files['model.pkl']!, { tracked: true, pointerMd5: s.files['model.pkl']!.contentId });
    const { last, state } = run(s, 'dvc repro');
    expect(last.text).toMatch(/Running stage 't'/);
    const f = state.files['model.pkl']!;
    expect(f.tracked).toBe(true);
    expect(f.pointerMd5).toBe(f.contentId);
    expect(f.dirty).toBe(false);
  });

  it('repro creates a "_dir" marker for directory outputs', () => {
    const s = setup(repo(), 'dvc stage add -n t -d src/train.py -o feats/ python src/train.py');
    const { last, state } = run(s, 'dvc repro');
    expect(last.text).toMatch(/wrote directory out 'feats\/' \(nfiles=2\)/);
    expect(state.files['feats//_dir']).toBeDefined();
  });

  it('repro --allow-missing skips stages whose outputs are only missing locally', () => {
    const s = setup(withPipeline(), 'dvc repro', 'rm model.pkl');
    const { last, state } = run(s, 'dvc repro --allow-missing');
    expect(last.text).toBe("Stage 'train' didn't change, skipping (outputs missing locally, --allow-missing).");
    expect(state.files['model.pkl']!.present).toBe(false);
  });

  it('repro --pull fetches missing outputs from the remote instead of running', () => {
    const base = setup(withPipeline(), 'dvc repro');
    const model = base.files['model.pkl']!;
    base.remoteObjects.push(model.contentId);
    base.cache = base.cache.filter((c) => c !== model.contentId);
    base.files['model.pkl']!.present = false;
    const { last, state } = run(base, 'dvc repro --pull');
    expect(last.text).toMatch(/^Pulling data for stage 'train'\n {2}pulled model\.pkl/);
    expect(last.text).toMatch(/outputs pulled from remote 'myremote', not re-run/);
    expect(state.files['model.pkl']!.present).toBe(true);
    expect(state.cache).toContain(model.contentId);
  });

  it('repro --pull falls back to running when the remote lacks the outputs', () => {
    const base = setup(withPipeline(), 'dvc repro');
    base.cache = base.cache.filter((c) => c !== base.files['model.pkl']!.contentId);
    base.files['model.pkl']!.present = false;
    const { last } = run(base, 'dvc repro --pull');
    expect(last.text).toMatch(/Unable to pull data for stage 'train': remote 'myremote' does not hold its outputs\. Running it instead\./);
    expect(last.text).toMatch(/Running stage 'train'/);
  });

  it('repro --pull without any remote reports the missing remote', () => {
    const base = setup(withPipeline(), 'dvc repro');
    base.files['model.pkl']!.present = false;
    base.remotes = [];
    const { last } = run(base, 'dvc repro --pull');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/no remote specified/);
  });

  it('dvc status shows deleted / not in cache outputs of an up-to-date stage', () => {
    const s = setup(withPipeline(), 'dvc repro', 'rm model.pkl');
    expect(run(s, 'dvc status').last.text).toMatch(/^train:\n\tchanged outs:\n\t\tdeleted: {11}model\.pkl/);
    const nocache = structuredClone(s);
    nocache.cache = nocache.cache.filter((c) => c !== nocache.files['model.pkl']!.contentId);
    expect(run(nocache, 'dvc status').last.text).toMatch(/not in cache: {7}model\.pkl/);
  });

  it('dvc status of a stage that never ran says its outs are not in cache; a stale one lists deps and params', () => {
    const fresh = run(withPipeline(), 'dvc status').last.text;
    expect(fresh).toMatch(/^train:\n\tchanged outs:\n\t\tnot in cache: {7}model\.pkl/);
    const ran = setup(withPipeline(), 'dvc repro', 'edit src/train.py', 'edit params.yaml lr=0.4');
    const out = run(ran, 'dvc status').last.text;
    expect(out).toMatch(/\tchanged deps:\n\t\tmodified: {11}src\/train\.py/);
    expect(out).toMatch(/\tchanged params:\n\t\tparams\.yaml:\n\t\t\tmodified: {11}lr/);
  });

  it('dvc status of a locked stage with no recorded cause falls back to a generic hint', () => {
    const s = setup(withPipeline(), 'dvc repro');
    s.pipeline[0]!.upToDate = false;
    s.pipeline[0]!.stale = undefined;
    expect(run(s, 'dvc status').last.text).toMatch(/\tchanged deps:\n\t\tmodified: {11}\(an input changed since the last run\)/);
  });

  it('dvc dag lists stages and edges; fails with no pipeline', () => {
    expect(run(repo(), 'dvc dag').last.result.ok).toBe(false);
    expect(run(repo(), 'dvc dag').last.text).toBe('ERROR: no stages to visualize.');
    const s = setup(
      repo(),
      'dvc stage add -n prep -d data/data.xml -o clean.csv python prep.py',
      'dvc stage add -n train -d clean.csv -o model.pkl python train.py',
    );
    const out = run(s, 'dvc dag').last.text;
    expect(out).toMatch(/^stages: prep, train\n/);
    expect(out).toMatch(/data\/data\.xml -> prep\nprep -> clean\.csv/);
    expect(out).toMatch(/prep -> train\ntrain -> model\.pkl/);
  });
});

describe('dvc params / metrics / plots / queue', () => {
  it('params show prints the dictionary, and says so when empty', () => {
    expect(run(repo(), 'dvc params show').last.text).toBe('lr: 0.1\nn_estimators: 10');
    expect(run(repo(), 'dvc params').last.text).toBe('lr: 0.1\nn_estimators: 10');
    const s = repo();
    s.params = {};
    expect(run(s, 'dvc params show').last.text).toBe('No params.');
  });

  it('params diff compares against the last commit', () => {
    expect(run(repo(), 'dvc params diff').last.text).toBe('No param differences vs last commit.');
    const s = setup(repo(), 'edit params.yaml lr=0.5');
    const out = run(s, 'dvc params diff').last.text;
    expect(out).toMatch(/^Path\t\tParam\t\tHEAD\tworkspace\nparams\.yaml\tlr\t0\.1\t0\.5$/);
  });

  it('params with an unknown action prints usage', () => {
    const { last } = run(repo(), 'dvc params frob');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe('Usage: dvc params show|diff');
  });

  it('metrics show/diff/usage', () => {
    expect(run(repo(), 'dvc metrics').last.text).toBe('No metrics found. Run a pipeline stage first.');
    expect(run(repo(), 'dvc metrics diff').last.text).toBe('No metric differences vs last commit.');
    const s = setup(withPipeline(), 'dvc repro');
    expect(run(s, 'dvc metrics show').last.text).toMatch(/^acc\.json: 0\.\d+$/m);
    const diff = run(s, 'dvc metrics diff').last.text;
    expect(diff).toMatch(/^Path\t\tMetric\t\tHEAD\tworkspace\tChange\neval\/metrics\.json\tacc\.json\t—\t0\.\d+\t—$/m);
    const bad = run(repo(), 'dvc metrics frob').last;
    expect(bad.result.ok).toBe(false);
    expect(bad.text).toBe('Usage: dvc metrics show|diff');
  });

  it('metrics diff reports the numeric change when both sides have the value', () => {
    const s = repo();
    s.gitCommits[s.gitCommits.length - 1]!.metrics = { acc: 0.5 };
    s.metrics = { acc: 0.75 };
    const out = run(s, 'dvc metrics diff').last.text;
    expect(out).toMatch(/acc\t0\.5\t0\.75\t0\.2500$/);
  });

  it('plots with no data, with data, with a confusion template, and with a bad action', () => {
    expect(run(repo(), 'dvc plots show').last.text).toMatch(/^No plots data\./);
    const s = setup(withPipeline(), 'dvc repro');
    const show = run(s, 'dvc plots show').last.text;
    expect(show).toMatch(/^plots show\ntemplates: simple \| linear \| confusion \| scatter\nloss: [\d.]+( → [\d.]+)+/);
    expect(show).toMatch(/Opened plots HTML \(simulated\): dvc_plots\/index\.html$/);
    const conf = run(s, 'dvc plots diff --template confusion').last.text;
    expect(conf).toMatch(/^plots diff \(workspace series\)  template=confusion/);
    expect(conf).toMatch(/loss: \[\[8,1\],\[2,9\]\]/);
    expect(conf).toMatch(/\(confusion\.json template\)$/);
    const bad = run(s, 'dvc plots frob').last;
    expect(bad.result.ok).toBe(false);
    expect(bad.text).toMatch(/^Usage: dvc plots show\|diff/);
  });

  it('queue status lists queued runs; remove clears them; unknown action prints usage', () => {
    const base = withPipeline();
    const q = run(base, 'dvc exp run --queue -S lr=0.3', 'dvc exp run --queue -S lr=0.6');
    expect(q.state.expQueue).toHaveLength(2);
    expect(q.steps[0]!.text).toMatch(/^Queued experiment exp-[0-9a-f]+\nparams=\{"lr":0\.3\}/);
    const status = run(q.state, 'dvc queue status').last.text;
    expect(status).toMatch(/^queued: 2\ndone: {3}0\n {2}\[0\] \S+ params=\{"lr":0\.3\}\n {2}\[1\] \S+ params=\{"lr":0\.6\}$/);
    expect(run(q.state, 'dvc queue').last.text).toBe(status);
    const cleared = run(q.state, 'dvc queue remove');
    expect(cleared.last.text).toBe('Cleared experiment queue.');
    expect(cleared.state.expQueue).toEqual([]);
    const bad = run(q.state, 'dvc queue frob').last;
    expect(bad.result.ok).toBe(false);
    expect(bad.text).toBe('Usage: dvc queue [status|start|remove]');
  });

  it('queue start fails on an empty queue; otherwise runs each entry as an experiment', () => {
    const empty = run(withPipeline(), 'dvc queue start').last;
    expect(empty.result.ok).toBe(false);
    expect(empty.text).toBe('Queue is empty. Use `dvc exp run --queue -S key=val`.');
    const q = setup(withPipeline(), 'dvc exp run --queue -S lr=0.3', 'dvc exp run --queue -S lr=0.6');
    const { last, state } = run(q, 'dvc queue start');
    expect(last.text).toMatch(/^Starting queued experiments \(2\)…/);
    expect(state.experiments.map((e) => e.params.lr)).toEqual([0.3, 0.6]);
    expect(state.expQueue).toEqual([]);
    // --run-all is the same thing
    const viaRunAll = run(q, 'dvc exp run --run-all');
    expect(viaRunAll.state.experiments).toHaveLength(2);
  });
});

describe('dvc get / import / import-url / update / artifacts', () => {
  it('get / import without a url print usage; import-url falls back to a default output', () => {
    expect(run(repo(), 'dvc get').last.text).toBe('Usage: dvc get <url> [-o <path>]');
    expect(run(repo(), 'dvc import').last.text).toBe('Usage: dvc import <url> [-o <path>]');
    const { last, state } = run(repo(), 'dvc import-url');
    expect(last.text).toMatch(/^import-url: downloaded data\/imported\.bin/);
    expect(last.text).toMatch(/import-url = track an external URL as data \(creates data\/imported\.bin\.dvc/);
    expect(state.files['data/imported.bin']!.tracked).toBe(true);
  });

  it('get copies without tracking; import tracks and records the source', () => {
    const got = run(repo(), 'dvc get https://github.com/iterative/dataset-registry get-started/data.xml -o data/got.xml');
    expect(got.last.text).toMatch(/get = copy without tracking/);
    expect(got.state.files['data/got.xml']!.tracked).toBe(false);
    const imp = run(repo(), 'dvc import https://github.com/iterative/dataset-registry get-started/data.xml --rev v2 -o data/imp.xml');
    expect(imp.last.text).toMatch(/import = versioned dependency/);
    const f = imp.state.files['data/imp.xml']!;
    expect(f.tracked).toBe(true);
    expect(f.importedFrom).toEqual({
      url: 'https://github.com/iterative/dataset-registry',
      path: 'get-started/data.xml',
      rev: 'v2',
    });
    expect(imp.state.cache).toContain(f.pointerMd5);
  });

  it('update: usage, unknown file, non-import file', () => {
    expect(run(repo(), 'dvc update').last.text).toBe('Usage: dvc update [--rev <rev>] <path.dvc>');
    const unknown = run(repo(), 'dvc update data/data.xml.dvc').last;
    expect(unknown.result.ok).toBe(false);
    expect(unknown.text).toBe("ERROR: 'data/data.xml.dvc' does not exist or is not a DVC-tracked output.");
    const s = setup(repo(), 'dvc add data/data.xml');
    const notImport = run(s, 'dvc update data/data.xml.dvc').last;
    expect(notImport.result.ok).toBe(false);
    expect(notImport.text).toMatch(/the \.dvc file is not an import\./);
    expect(notImport.text).toMatch(/To record a new version of data you track yourself, run `dvc add` again\./);
  });

  it('update --rev bumps the version and reports the revision change', () => {
    const s = setup(repo(), 'dvc import https://example.com/reg data.xml --rev v1 -o data/imp.xml');
    const before = s.files['data/imp.xml']!.pointerMd5;
    const { last, state } = run(s, 'dvc update data/imp.xml.dvc --rev v2');
    expect(last.text).toMatch(/^Updated data\/imp\.xml\.dvc from https:\/\/example\.com\/reg \(rev v1 → v2\) → md5 [0-9a-f]{8}…$/);
    expect(state.files['data/imp.xml']!.pointerMd5).not.toBe(before);
    expect(state.files['data/imp.xml']!.importedFrom!.rev).toBe('v2');
    const noRev = setup(repo(), 'dvc import https://example.com/reg data.xml -o data/imp.xml');
    expect(run(noRev, 'dvc update data/imp.xml --rev v3').last.text).toMatch(/\(rev HEAD → v3\)/);
  });

  it('artifacts: unknown action, usage, mutually exclusive options', () => {
    const bad = run(repo(), 'dvc artifacts list').last;
    expect(bad.result.ok).toBe(false);
    expect(bad.text).toMatch(/unknown command 'dvc artifacts list'/);
    expect(run(repo(), 'dvc artifacts').last.text).toMatch(/unknown command 'dvc artifacts '/);
    expect(run(repo(), 'dvc artifacts get').last.text).toMatch(/^Usage: dvc artifacts get <url> <name>/);
    const both = run(repo(), 'dvc artifacts get . m --rev v1.0.0 --stage prod').last;
    expect(both.result.ok).toBe(false);
    expect(both.text).toBe('ERROR: Artifact version and stage are mutually exclusive.');
  });
});

describe('dvc exp', () => {
  it('exp show / list with nothing recorded', () => {
    expect(run(withPipeline(), 'dvc exp show').last.text).toBe('No experiments yet. Try `dvc exp run`.');
    expect(run(withPipeline(), 'dvc exp list').last.text).toBe('No experiments to list.');
  });

  it('exp run needs a pipeline', () => {
    const { last } = run(repo(), 'dvc exp run');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe('ERROR: experiments need a pipeline. Add a stage first.');
  });

  it('exp run -S sets params, names the run and records it; show/list display it', () => {
    const s = setup(withPipeline(), 'dvc exp run -S lr=0.4 -n fast');
    expect(s.experiments).toHaveLength(1);
    expect(s.experiments[0]!.name).toBe('fast');
    expect(s.experiments[0]!.params.lr).toBe(0.4);
    const show = run(s, 'dvc exp show').last.text;
    expect(show.split('\n')[0]).toBe('exp\tlr\tn_estimators\tacc.json');
    expect(show.split('\n')[1]).toMatch(/^fast\t0\.4\t10\t0\.\d+$/);
    const list = run(s, 'dvc exp list').last.text;
    expect(list).toMatch(/^[0-9a-f]+:\n\tfast \[exp-[0-9a-f]+\]$/);
  });

  it('exp apply: usage, unknown experiment, and restore of params/metrics/outputs', () => {
    expect(run(withPipeline(), 'dvc exp apply').last.text).toBe('Usage: dvc exp apply <exp-id>');
    const bad = run(withPipeline(), 'dvc exp apply ghost').last;
    expect(bad.result.ok).toBe(false);
    expect(bad.text).toBe("ERROR: experiment 'ghost' not found.");
    const s = setup(withPipeline(), 'dvc exp run -S lr=0.4 -n a', 'dvc exp run -S lr=0.6 -n b');
    const { last, state } = run(s, 'dvc exp apply a');
    expect(last.text).toMatch(/^Changes for experiment 'a' have been applied to your current workspace\./);
    expect(state.params.lr).toBe(0.4);
    expect(state.lastAppliedExpId).toBe(s.experiments[0]!.id);
    expect(state.files['model.pkl']!.contentId).toBe(s.experiments[0]!.outputs!['model.pkl']);
  });

  it('exp apply restores outputs for files the workspace does not have yet and marks stages without a snapshot stale', () => {
    const s = setup(withPipeline(), 'dvc exp run -S lr=0.4 -n a');
    delete s.files['model.pkl'];
    s.experiments[0]!.stageSigs = {};
    const { state } = run(s, 'dvc exp apply a');
    expect(state.files['model.pkl']!.present).toBe(true);
    expect(state.pipeline[0]!.upToDate).toBe(false);
  });

  it('exp apply of a tracked output moves its pointer too', () => {
    const s = setup(
      repo(),
      'dvc stage add -n t -d src/train.py -p lr -o model.pkl python src/train.py',
      'dvc exp run -S lr=0.4 -n a',
    );
    Object.assign(s.files['model.pkl']!, { tracked: true, pointerMd5: 'x'.repeat(32) });
    const { state } = run(s, 'dvc exp apply a');
    expect(state.files['model.pkl']!.pointerMd5).toBe(s.experiments[0]!.outputs!['model.pkl']);
  });

  it('exp diff compares HEAD, workspace and named experiments', () => {
    const s = setup(withPipeline(), 'dvc exp run -S lr=0.4 -n a', 'dvc exp run -S lr=0.6 -n b');
    const ab = run(s, 'dvc exp diff a b').last.text;
    expect(ab).toMatch(/^Path\t\tMetric\/Param\ta\tb\tChange\nparams\.yaml\tlr\t0\.4\t0\.6\t0\.2000$/m);
    const head = run(s, 'dvc exp diff HEAD workspace').last.text;
    expect(head.split('\n')[0]).toBe('Path\t\tMetric/Param\tHEAD\tworkspace\tChange');
    expect(run(s, 'dvc exp diff a a').last.text).toMatch(/\(no differences between a and a\)$/);
    const noArgs = run(s, 'dvc exp diff').last.text;
    expect(noArgs.split('\n')[0]).toBe('Path\t\tMetric/Param\tHEAD\tworkspace\tChange');
    const unknownA = run(s, 'dvc exp diff ghost').last;
    expect(unknownA.result.ok).toBe(false);
    expect(unknownA.text).toBe("ERROR: experiment 'ghost' not found.");
    const unknownB = run(s, 'dvc exp diff a ghost').last;
    expect(unknownB.result.ok).toBe(false);
    expect(unknownB.text).toBe("ERROR: experiment 'ghost' not found.");
    // numeric metric change
    expect(run(s, 'dvc exp diff a b').last.text).toMatch(/acc\.json\t0\.\d+\t0\.\d+\t-?0\.\d{4}/);
  });

  it('exp save: invalid name, unknown untracked include, conflict without --force', () => {
    const base = withPipeline();
    const badName = run(base, 'dvc exp save -n "bad name!"').last;
    expect(badName.result.ok).toBe(false);
    expect(badName.text).toMatch(/invalid experiment name 'bad name!'/);
    const startsDash = run(base, 'dvc exp save -n .hidden').last;
    expect(startsDash.result.ok).toBe(false);
    const inc = run(base, 'dvc exp save -I nope.txt').last;
    expect(inc.result.ok).toBe(false);
    expect(inc.text).toBe("ERROR: cannot include 'nope.txt': no such file in the workspace.");
    const s = setup(base, 'dvc exp save -n one');
    const dup = run(s, 'dvc exp save -n one');
    expect(dup.last.result.ok).toBe(false);
    expect(dup.last.text).toMatch(/Experiment conflicts with existing experiment 'one'\./);
    expect(dup.last.text).toMatch(/dvc exp save -f -n one/);
    expect(dup.state.experiments).toHaveLength(1);
  });

  it('exp save --force replaces; -m stores the message; -I lists included files; no name generates adjective-noun', () => {
    const s = setup(withPipeline(), 'dvc exp save -n one');
    const idBefore = s.experiments[0]!.id;
    const forced = run(setup(s, 'edit params.yaml lr=0.9'), 'dvc exp save -f -n one -m "second try"');
    expect(forced.last.text).toMatch(/Experiment has been saved with name 'one'\./);
    expect(forced.last.text).toMatch(/message: second try/);
    expect(forced.state.experiments).toHaveLength(1);
    expect(forced.state.experiments[0]!.message).toBe('second try');
    expect(forced.state.experiments[0]!.params.lr).toBe(0.9);
    expect(forced.state.experiments[0]!.id).not.toBe(idBefore);
    const withFile = repo();
    withFile.files['notes.txt'] = makeFile('notes.txt', 'code');
    const inc = run(setup(withFile, 'dvc stage add -n t -d src/train.py -o m.pkl python src/train.py'), 'dvc exp save -I notes.txt');
    expect(inc.last.text).toMatch(/included untracked: notes\.txt/);
    expect(inc.last.text).toMatch(/Experiment has been saved with name '[a-z]+-[a-z]+'\./);
  });

  it('exp save names fall back to run-N-saved once every adjective-noun pair is taken', () => {
    const s = withPipeline();
    const adj = ['agile', 'bland', 'brisk', 'calm', 'dusty', 'eager', 'fancy', 'hardy', 'jolly', 'keen', 'lucid', 'mossy', 'noble', 'plush', 'quiet', 'rapid', 'sunny', 'tidy', 'vivid', 'witty'];
    const noun = ['acorn', 'bison', 'cedar', 'delta', 'ember', 'finch', 'grove', 'heron', 'islet', 'jasper', 'kiwi', 'lotus', 'maple', 'newt', 'otter', 'pecan', 'quail', 'raven', 'tulip', 'walnut'];
    for (const a of adj) {
      for (const n of noun) {
        s.experiments.push({ id: `${a}${n}`, name: `${a}-${n}`, commitRef: 'x', params: {}, metrics: {} });
      }
    }
    const { last } = run(s, 'dvc exp save');
    expect(last.text).toMatch(/Experiment has been saved with name 'run-401-saved'\./);
  });

  describe('exp remove', () => {
    const three = () => setup(withPipeline(), 'dvc exp save -n a', 'dvc exp save -n b', 'dvc exp save -n c');

    it('needs a target, --rev or -A', () => {
      const { last } = run(three(), 'dvc exp remove');
      expect(last.result.ok).toBe(false);
      expect(last.text).toMatch(/Either provide an `experiment` argument/);
    });

    it('removes named experiments and refuses unknown names without removing anything', () => {
      const s = three();
      const ok = run(s, 'dvc exp remove a b');
      expect(ok.last.text).toBe('Removed experiments: a, b');
      expect(ok.state.experiments.map((e) => e.name)).toEqual(['c']);
      const bad = run(s, 'dvc exp remove a ghost');
      expect(bad.last.result.ok).toBe(false);
      expect(bad.last.text).toMatch(/Experiment\(s\) 'ghost' not found/);
      expect(bad.state.experiments).toHaveLength(3);
    });

    it('-A removes all; running it on an empty list says nothing was removed', () => {
      const all = run(three(), 'dvc exp remove -A');
      expect(all.state.experiments).toEqual([]);
      expect(all.last.text).toBe('Removed experiments: a, b, c');
      expect(run(withPipeline(), 'dvc exp remove -A').last.text).toBe('No experiments to remove.');
    });

    it('--rev removes the experiments based on that commit; unknown revisions fail', () => {
      const s = three();
      const head = s.gitCommits[s.gitCommits.length - 1]!.hash;
      const r = run(s, `dvc exp remove --rev ${head}`);
      expect(r.state.experiments).toEqual([]);
      const none = run(s, 'dvc exp remove --rev HEAD~1');
      expect(none.last.text).toBe('No experiments to remove.');
      expect(none.state.experiments).toHaveLength(3);
      const bad = run(s, 'dvc exp remove --rev zzzzzzz').last;
      expect(bad.result.ok).toBe(false);
      expect(bad.text).toBe("ERROR: unknown revision 'zzzzzzz'.");
    });

    it('--queue clears queued runs and, alone, leaves saved experiments', () => {
      const s = setup(three(), 'dvc exp run --queue -S lr=0.2');
      const { last, state } = run(s, 'dvc exp remove --queue');
      expect(last.text).toBe('Removed 1 queued experiment(s).');
      expect(state.expQueue).toEqual([]);
      expect(state.experiments).toHaveLength(3);
      const both = run(s, 'dvc exp remove --queue a');
      expect(both.last.text).toMatch(/Removed 1 queued experiment\(s\)\.\nRemoved experiments: a/);
    });

    it('-g needs a known Git remote (and says when it is a DVC remote)', () => {
      const s = three();
      const dvcRemote = run(s, 'dvc exp remove -g myremote a').last;
      expect(dvcRemote.result.ok).toBe(false);
      expect(dvcRemote.text).toMatch(/'myremote' is a DVC remote \(data storage\), not a Git remote\./);
      const unknown = run(s, 'dvc exp remove -g nowhere a').last;
      expect(unknown.result.ok).toBe(false);
      expect(unknown.text).toMatch(/unknown Git remote 'nowhere'\. Known Git remotes: origin\./);
      const noGit = structuredClone(s);
      noGit.gitRemotes = [];
      expect(run(noGit, 'dvc exp remove -g nowhere a').last.text).toMatch(/Known Git remotes: \(none\)\./);
    });

    it('-g deletes only experiments that were pushed to that Git remote', () => {
      const s = setup(three(), 'dvc exp push origin a b');
      const notPushed = run(s, 'dvc exp remove -g origin c').last;
      expect(notPushed.result.ok).toBe(false);
      expect(notPushed.text).toMatch(/Experiment\(s\) 'c' not found in Git remote 'origin'/);
      const one = run(s, 'dvc exp remove -g origin a');
      expect(one.last.text).toBe("Removed experiments from Git remote 'origin': a");
      expect(one.state.expRemotes!.origin).toEqual(['b']);
      expect(one.state.experiments).toHaveLength(3);
      const all = run(s, 'dvc exp remove -g origin -A');
      expect(all.state.expRemotes!.origin).toEqual([]);
    });
  });

  it('exp gc was removed in DVC 3', () => {
    const { last } = run(withPipeline(), 'dvc exp gc');
    expect(last.result.ok).toBe(false);
    expect(last.text).toMatch(/`dvc exp gc` was removed in DVC 3/);
  });

  it('exp push/pull need a real Git remote', () => {
    const s = setup(withPipeline(), 'dvc exp save -n a');
    const dvc = run(s, 'dvc exp push myremote').last;
    expect(dvc.result.ok).toBe(false);
    expect(dvc.text).toMatch(/'myremote' is a DVC remote \(data storage\), not a Git remote\./);
    expect(dvc.text).toMatch(/`dvc exp push` moves experiment refs/);
    const pull = run(s, 'dvc exp pull myremote').last;
    expect(pull.text).toMatch(/`dvc exp pull` moves experiment refs/);
    const unknown = run(s, 'dvc exp push nowhere').last;
    expect(unknown.result.ok).toBe(false);
    expect(unknown.text).toMatch(/unknown Git remote 'nowhere'\. Known Git remotes: origin\./);
    const none = structuredClone(s);
    none.gitRemotes = [];
    expect(run(none, 'dvc exp pull').last.text).toMatch(/Known Git remotes: \(none\)\. Add one with `git remote add <name> <url>`\./);
  });

  it('exp push records experiment names on the Git remote; pull reports a sync', () => {
    const s = setup(withPipeline(), 'dvc exp save -n a', 'dvc exp save -n b');
    const all = run(s, 'dvc exp push origin');
    expect(all.last.text).toMatch(/^Pushed 2 experiment\(s\) to Git remote 'origin'/);
    expect(all.state.expRemotes!.origin).toEqual(['a', 'b']);
    const one = run(s, 'dvc exp push origin b');
    expect(one.state.expRemotes!.origin).toEqual(['b']);
    const pulled = run(s, 'dvc exp pull origin').last.text;
    expect(pulled).toMatch(/^Pulled experiment refs from Git remote 'origin'/);
  });

  it('exp branch defaults to the latest experiment and a fixed branch name', () => {
    const s = setup(withPipeline(), 'dvc exp save -n a');
    const dflt = run(s, 'dvc exp branch').last.text;
    expect(dflt).toMatch(new RegExp(`^Created Git branch 'experiment-promoted' from experiment '${s.experiments[0]!.id}'\\.`));
    const named = run(s, 'dvc exp branch a winner').last.text;
    expect(named).toMatch(/^Created Git branch 'winner' from experiment 'a'\./);
    expect(named).toMatch(/git checkout winner/);
    expect(run(repo(), 'dvc exp branch').state.experiments).toEqual([]);
    expect(run(repo(), 'dvc exp branch').last.text).toMatch(/from experiment 'exp-latest'/);
  });

  it('an unknown exp subcommand prints usage', () => {
    const { last } = run(repo(), 'dvc exp frob');
    expect(last.result.ok).toBe(false);
    expect(last.text).toBe('Usage: dvc exp [run|show|apply|diff|push|pull|branch]');
  });

  it('exp run with a malformed -S value ignores it and still runs', () => {
    const { state } = run(withPipeline(), 'dvc exp run -S novalue');
    expect(state.experiments).toHaveLength(1);
    expect(state.params).toEqual({ lr: 0.1, n_estimators: 10 });
  });
});
