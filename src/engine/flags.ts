/**
 * Allowed-flag tables for `dvc <command>`.
 * Real DVC uses argparse: an option it does not know is reported as
 * "unrecognized arguments" and nothing runs. The table lists every option the
 * lessons use plus the commonly used real ones; `val` options consume the next token.
 */

interface FlagSpec {
  /** options without a value */
  bool: string[];
  /** options that take a value */
  val: string[];
  /** stop checking at the first positional token (a trailing shell command, as in `dvc stage add`) */
  remainder?: boolean;
}

const COMMON = ['-h', '--help', '-q', '--quiet', '-v', '--verbose'];

function spec(bool: string[], val: string[] = [], remainder = false): FlagSpec {
  return { bool: [...COMMON, ...bool], val, remainder };
}

const REVS = ['-a', '--all-branches', '-T', '--all-tags', '-A', '--all-commits'];
const TRANSFER = [...REVS, '-d', '--with-deps', '-R', '--recursive', '--glob', '--run-cache'];

const SHOW_TABLE = ['--json', '--md', '-R', '--recursive'];

const REPRO_FLAGS = [
  '-f', '--force', '-s', '--single-item', '-p', '--pipeline', '-P', '--all-pipelines',
  '-R', '--recursive', '-i', '--interactive', '--downstream', '--force-downstream',
  '--no-commit', '--no-run-cache', '--dry', '-k', '--keep-going', '--glob', '--pull',
  '--allow-missing',
];

const TABLE: Record<string, FlagSpec> = {
  init: spec(['--no-scm', '-f', '--force', '--subdir']),
  add: spec(
    ['--no-commit', '-R', '--recursive', '--to-remote', '-f', '--force', '--glob', '--external', '--no-relink'],
    ['--file', '-o', '--out', '-r', '--remote', '-j', '--remote-jobs', '--desc', '--type', '--label', '--meta'],
  ),
  commit: spec(['-f', '--force', '-d', '--with-deps', '-R', '--recursive', '--relink']),
  checkout: spec(['-d', '--with-deps', '-R', '--recursive', '-f', '--force', '--relink', '--summary']),
  status: spec([...TRANSFER, '-c', '--cloud', '--json', '--no-updates'], ['-r', '--remote', '-j', '--jobs']),
  push: spec([...TRANSFER], ['-r', '--remote', '-j', '--jobs']),
  fetch: spec([...TRANSFER], ['-r', '--remote', '-j', '--jobs']),
  pull: spec([...TRANSFER, '-f', '--force'], ['-r', '--remote', '-j', '--jobs']),
  gc: spec(
    ['-w', '--workspace', ...REVS, '--all-experiments', '-c', '--cloud', '-f', '--force', '--not-in-remote', '--skip-failed'],
    ['-r', '--remote', '-j', '--jobs', '-p', '--projects', '--rev', '-n', '--num'],
  ),
  diff: spec(['--json', '--show-hash', '--md', '--hide-missing', '-R', '--recursive'], ['--targets']),
  remove: spec(['--outs', '--force']),
  freeze: spec([]),
  unfreeze: spec([]),
  dag: spec(['--dot', '--full', '--md', '--outs', '-o']),
  repro: spec(REPRO_FLAGS),
  'stage add': spec(
    ['--always-changed', '-f', '--force', '--run', '--external'],
    ['-n', '--name', '-d', '--deps', '-o', '--outs', '-O', '--outs-no-cache', '-p', '--params', '-m', '--metrics',
      '-M', '--metrics-no-cache', '--plots', '--plots-no-cache', '-w', '--wdir', '--desc'],
    true,
  ),
  'stage list': spec(['--all', '-R', '--recursive', '--name-only']),
  'metrics show': spec([...REVS, ...SHOW_TABLE], ['--precision', '--round-digits']),
  'metrics diff': spec([...SHOW_TABLE, '--all'], ['--targets', '--precision', '--round-digits']),
  'params show': spec([...REVS, ...SHOW_TABLE, '--deps'], []),
  'params diff': spec([...SHOW_TABLE, '--all', '--deps'], ['--targets']),
  'plots show': spec(['--show-vega', '--json', '--split', '--open', '--no-header', '-R', '--recursive'],
    ['-t', '--template', '--targets', '-o', '--out', '-x', '-y', '--title', '--x-label', '--y-label']),
  'plots diff': spec(['--show-vega', '--json', '--split', '--open', '--no-header', '-R', '--recursive'],
    ['-t', '--template', '--targets', '-o', '--out', '-x', '-y', '--title', '--x-label', '--y-label']),
  'exp run': spec(
    [...REPRO_FLAGS.filter((f) => f !== '-s' && f !== '--single-item'), '-s', '--single-item', '--queue', '--run-all', '--temp', '--copy-paths'],
    ['-S', '--set-param', '-n', '--name', '-j', '--jobs', '-m', '--message', '-r', '--rev'],
  ),
  'exp show': spec(
    [...REVS, '--no-pager', '--json', '--csv', '--md', '--only-changed', '--hide-queued', '--hide-failed', '-f', '--force', '--pcp', '--param-deps'],
    ['--num', '-n', '--rev', '--sort-by', '--sort-order', '--drop', '--keep'],
  ),
  'exp diff': spec(['--all', '--json', '--md', '--only-changed'], ['--precision', '--round-digits']),
  'exp apply': spec([]),
  'exp branch': spec([]),
  'exp push': spec(['-f', '--force', '--no-cache', '--pack-refs', '-A', '--all-commits'], ['-r', '--remote', '-j', '--jobs', '--rev', '-n', '--num']),
  'exp pull': spec(['-f', '--force', '--no-cache', '-A', '--all-commits'], ['-r', '--remote', '-j', '--jobs', '--rev', '-n', '--num']),
  'exp list': spec(['--all-commits', '-A', '--all-branches', '-a', '--name-only', '--sha-only']),
  'exp remove': spec(['--queue', '-A', '--all-commits', '-g', '--git-remote']),
  get: spec(['-f', '--force'], ['-o', '--out', '--rev', '-j', '--jobs']),
  import: spec(['--no-exec', '--no-download', '-f', '--force'], ['-o', '--out', '--rev', '-j', '--jobs']),
  'import-url': spec(['--no-exec', '--no-download', '--to-remote', '--version-aware', '-f', '--force'], ['-o', '--out', '-j', '--jobs', '-r', '--remote']),
  update: spec(['--no-download', '--to-remote', '-R', '--recursive'], ['--rev', '-j', '--jobs', '-r', '--remote']),
  config: spec(['--local', '--global', '--system', '--project', '-u', '--unset', '-l', '--list']),
  queue: spec(['--all', '--success', '--failed', '-f', '--follow'], ['-j', '--jobs']),
  'remote add': spec(['-d', '--default', '-f', '--force', '--local', '--global', '--system', '--project']),
  'remote modify': spec(['-u', '--unset', '--local', '--global', '--system', '--project']),
  'remote list': spec(['--local', '--global', '--system', '--project']),
  'remote default': spec(['--unset', '-u', '--local', '--global', '--system', '--project']),
  'remote remove': spec(['--local', '--global', '--system', '--project']),
  'remote rename': spec(['--local', '--global', '--system', '--project']),
};

function lookup(sub: string, args: string[]): FlagSpec | undefined {
  const second = args.find((a) => !a.startsWith('-'));
  return (second ? TABLE[`${sub} ${second}`] : undefined) ?? TABLE[sub];
}

/**
 * Returns the unrecognized option (first one) or null when every option is known.
 * `args` are the tokens after the dvc command name (including subcommands).
 */
export function findUnknownFlag(sub: string, args: string[]): string | null {
  const s = lookup(sub, args);
  if (!s) return null;
  if (s.remainder) args = args.slice(0, stageCommandStart(args));
  const bool = new Set(s.bool);
  const val = new Set(s.val);
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (!a.startsWith('-') || a === '-' || /^-\d/.test(a)) continue;
    if (a === '--') return null;
    const name = a.includes('=') && a.startsWith('--') ? a.slice(0, a.indexOf('=')) : a;
    if (val.has(name)) {
      if (!a.includes('=')) i++;
      continue;
    }
    if (bool.has(name)) continue;
    // combined short flags such as -wc or -Sx=1
    if (/^-[A-Za-z]{2,}/.test(a) && !a.startsWith('--')) {
      const chars = a.slice(1).split('');
      const allKnown = chars.every((c) => bool.has(`-${c}`) || val.has(`-${c}`));
      if (allKnown) continue;
      if (val.has(`-${chars[0]}`)) continue; // -Slr=0.1 style
    }
    return a;
  }
  return null;
}

/** Index of the first token that starts the trailing command of `dvc stage add`. */
export function stageCommandStart(args: string[]): number {
  const s = TABLE['stage add']!;
  const val = new Set(s.val);
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith('-')) {
      if (val.has(a)) i++;
      continue;
    }
    // args[0] is "add"
    if (i === 0) continue;
    return i;
  }
  return args.length;
}
