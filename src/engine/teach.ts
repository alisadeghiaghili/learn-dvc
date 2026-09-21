import type { RepoState } from './types';

/**
 * Short "why this command matters" blocks appended to simulator output.
 * Goal: learners leave with mental models, not only muscle memory.
 */

export function teachBlock(title: string, lines: string[]): string {
  return ['', `── Why: ${title} ──`, ...lines.map((l) => `  ${l}`)].join('\n');
}

export function teachAfterCommand(raw: string, state: RepoState): string | null {
  const cmd = raw.trim();
  if (!cmd) return null;

  if (/^dvc\s+init\b/.test(cmd)) {
    return teachBlock('dvc init', [
      'DVC is a Git extension for data, not a replacement for Git.',
      'Init only creates local metadata under .dvc/ (config, ignore rules).',
      'No dataset is versioned yet — you just enabled the workflow.',
      'Those tiny files must be committed with Git so teammates get the same DVC setup.',
    ]);
  }

  if (/^dvc\s+add\b/.test(cmd)) {
    return teachBlock('dvc add', [
      '1. Content of the data file is hashed (md5) — identity of that exact bytes.',
      '2. Bytes are stored once in the local cache (.dvc/cache), content-addressed.',
      '3. A small .dvc pointer file records path → md5 (human-readable YAML).',
      '4. The raw data path is added to .gitignore so Git never bloats with GB files.',
      'Git versions the pointer; DVC versions the bytes. Split responsibilities.',
    ]);
  }

  if (/^dvc\s+status\b/.test(cmd)) {
    return teachBlock('dvc status', [
      'Compares workspace data vs pointers vs cache vs remote.',
      '"modified" means the file on disk no longer matches the md5 in its .dvc file.',
      'You have not lost data — you have an uncommitted data change, like Git status.',
    ]);
  }

  if (/^dvc\s+commit\b/.test(cmd)) {
    return teachBlock('dvc commit', [
      'Updates the .dvc pointer to the current file hash and ensures cache has the object.',
      'This is the data-side commit. You still git commit the pointer afterward.',
      'Without dvc commit, Git would record a pointer that no longer matches the data.',
    ]);
  }

  if (/^dvc\s+remote\s+add\b/.test(cmd)) {
    return teachBlock('dvc remote add', [
      'A DVC remote is object storage for cache artifacts (S3, GCS, SSH, local path…).',
      'It is NOT the Git remote. Git remote = code + pointers. DVC remote = heavy data.',
      '-d marks the default remote used by push/pull/fetch.',
    ]);
  }

  if (/^dvc\s+push\b/.test(cmd)) {
    return teachBlock('dvc push', [
      'Uploads cache objects the remote does not have yet.',
      'Teammates with the same Git commit can dvc pull to get the exact data bytes.',
      'CI can also pull data without baking datasets into the Git repo.',
    ]);
  }

  if (/^dvc\s+(pull|fetch)\b/.test(cmd)) {
    return teachBlock(cmd.startsWith('dvc pull') ? 'dvc pull' : 'dvc fetch', [
      'fetch: copy objects remote → local cache only.',
      'pull: fetch + checkout so workspace files match current pointers.',
      'This is why clones stay small: Git clone brings pointers; DVC pull brings data.',
    ]);
  }

  if (/^dvc\s+checkout\b/.test(cmd)) {
    return teachBlock('dvc checkout', [
      'Reads each .dvc pointer and restores that exact hash into the workspace from cache.',
      'After git checkout of an older commit, dvc checkout brings data back in sync.',
      'Data version switches are pointer switches — cheap, not full downloads when cached.',
    ]);
  }

  if (/^dvc\s+stage\s+add\b/.test(cmd)) {
    return teachBlock('dvc stage add', [
      'Pipeline stages live in dvc.yaml (deps, outs, cmd, params, metrics).',
      'Dependencies declare what invalidates the stage when it changes.',
      'Outputs declare what DVC should track/cache after a successful run.',
      'Code stays in Git; data I/O is mediated by DVC — reproducibility by contract.',
    ]);
  }

  if (/^dvc\s+repro\b/.test(cmd)) {
    return teachBlock('dvc repro', [
      'Build-system semantics for ML: run only stages whose inputs/params changed.',
      'Successful runs write dvc.lock — an execution receipt of hashes used.',
      'Same lock + same cache ⇒ same outputs without re-training from scratch.',
    ]);
  }

  if (/^dvc\s+exp\s+run\b/.test(cmd)) {
    return teachBlock('dvc exp run', [
      'Runs the pipeline in an experiment context without branch spam.',
      'Params from -S / params.yaml are recorded with metrics for comparison.',
      'Experiments are first-class: list, diff, apply winners back to the workspace.',
    ]);
  }

  if (/^dvc\s+exp\s+apply\b/.test(cmd)) {
    return teachBlock('dvc exp apply', [
      'Promotes a chosen experiment’s params/metrics into the workspace.',
      'That is how a “winning run” becomes the new baseline without retyping values.',
    ]);
  }

  if (/^edit\b/.test(cmd)) {
    return teachBlock('edit (simulated)', [
      'Real projects modify data/params with tools or code, not this helper.',
      'Here `edit` stands in for “the dataset/hyperparams changed”.',
      'Next question DVC forces you to answer: is that change versioned yet?',
    ]);
  }

  if (/^git\s+add\b/.test(cmd) && /\.dvc|\.gitignore|dvc\.yaml|params\.yaml/.test(cmd)) {
    return teachBlock('git add (DVC files)', [
      'You are staging metadata Git should keep: pointers, ignore rules, pipeline YAML.',
      'Large data files should never appear here — .gitignore keeps them out.',
      'Review with `git status` before commit: you want pointer diffs, not data blobs.',
    ]);
  }

  if (/^git\s+commit\b/.test(cmd)) {
    return teachBlock('git commit', [
      'This records pointer/pipeline state in Git history for code review + repro.',
      'A clone of this commit knows WHICH data version belongs, not the data itself.',
      'Pair every Git release with a DVC remote that still holds those cache objects.',
    ]);
  }

  if (state.experiments.length && /^dvc\s+exp\s+show\b/.test(cmd)) {
    return teachBlock('dvc exp show', [
      'Tabular comparison of experiments: params vs metrics side by side.',
      'You are choosing baselines with evidence, not memory.',
    ]);
  }

  return null;
}
