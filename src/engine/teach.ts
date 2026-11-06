import type { RepoState } from './types';
import { teachEntry } from '../i18n';
import { ui } from '../i18n';

/**
 * Short "why this command matters" blocks appended to simulator output.
 * Goal: learners leave with mental models, not only muscle memory.
 * Command names stay English; explanation lines are localized.
 */

export function teachBlock(title: string, lines: string[]): string {
  return ['', `── Why: ${title} ──`, ...lines.map((l) => `  ${l}`)].join('\n');
}

function teachFromKey(key: string): string | null {
  const entry = teachEntry(key);
  if (!entry) return null;
  return teachBlock(entry.title, entry.lines);
}

export function teachAfterCommand(raw: string, state: RepoState): string | null {
  const cmd = raw.trim();
  if (!cmd) return null;

  if (/^git\s+checkout\b/.test(cmd)) return teachFromKey('git-checkout-data');
  if (/^dvc\s+init\b/.test(cmd)) return teachFromKey('dvc-init');
  if (/^dvc\s+add\b/.test(cmd)) return teachFromKey('dvc-add');
  if (/^dvc\s+status\b/.test(cmd)) return teachFromKey('dvc-status');
  if (/^dvc\s+commit\b/.test(cmd)) return teachFromKey('dvc-commit');
  if (/^dvc\s+remote\s+add\b/.test(cmd)) return teachFromKey('dvc-remote-add');
  if (/^dvc\s+push\b/.test(cmd)) return teachFromKey('dvc-push');
  if (/^dvc\s+pull\b/.test(cmd)) return teachFromKey('dvc-pull');
  if (/^dvc\s+fetch\b/.test(cmd)) return teachFromKey('dvc-fetch');
  if (/^dvc\s+checkout\b/.test(cmd)) return teachFromKey('dvc-checkout');
  if (/^dvc\s+stage\s+add\b/.test(cmd)) return teachFromKey('dvc-stage-add');
  if (/^dvc\s+repro\b/.test(cmd)) return teachFromKey('dvc-repro');
  if (/^dvc\s+install\b/.test(cmd)) return teachFromKey('dvc-install');
  if (/^dvc\s+exp\s+(save|remove)\b/.test(cmd)) return teachFromKey('dvc-exp-save');
  if (/^dvc\s+cache\s+dir\b/.test(cmd)) return teachFromKey('dvc-cache-dir');
  if (/^dvc\s+artifacts\b/.test(cmd) || /^gto\b/.test(cmd)) return teachFromKey('dvc-artifacts');
  if (/^dvc\s+exp\s+run\b/.test(cmd)) return teachFromKey('dvc-exp-run');
  if (/^dvc\s+exp\s+apply\b/.test(cmd)) return teachFromKey('dvc-exp-apply');
  if (/^edit\b/.test(cmd)) return teachFromKey('edit');
  if (/^git\s+add\b/.test(cmd) && /\.dvc|\.gitignore|dvc\.yaml|params\.yaml/.test(cmd)) {
    return teachFromKey('git-add-dvc');
  }
  if (/^git\s+commit\b/.test(cmd)) return teachFromKey('git-commit');
  if (/^dvc\s+queue\b/.test(cmd) || /exp\s+run\s+--queue/.test(cmd)) return teachFromKey('exp-queue');
  if (/^dvc\s+update\b/.test(cmd)) return teachFromKey('dvc-update');
  if (/^dvc\s+config\b/.test(cmd)) return teachFromKey('dvc-config');
  if (/^cml\s+runner\b/.test(cmd)) return teachFromKey('cml-runner');
  if (/^cml\b/.test(cmd)) return teachFromKey('cml');
  if (/^dvc\s+freeze\b/.test(cmd)) return teachFromKey('dvc-freeze');
  if (/^dvc\s+unfreeze\b/.test(cmd)) return teachFromKey('dvc-unfreeze');
  if (/^dvc\s+diff\b/.test(cmd)) return teachFromKey('dvc-diff');
  if (/^dvc\s+exp\s+(push|pull|branch)\b/.test(cmd)) return teachFromKey('dvc-exp-share');
  if (/^dvc\s+exp\s+show\b/.test(cmd)) return teachFromKey('dvc-exp-show');
  if (/^dvc\s+gc\b/.test(cmd)) return teachFromKey('dvc-gc');
  if (/^dvc\s+plots\b/.test(cmd)) return teachFromKey('dvc-plots');
  if (/^dvc\s+params\s+diff|^dvc\s+metrics\s+diff/.test(cmd)) return teachFromKey('dvc-diffs');
  if (/^python3?\b/.test(cmd)) {
    if (/dvc\.api/.test(cmd)) return teachFromKey('python-dvc-api');
    return state.live.active ? teachFromKey('dvc-live') : null;
  }

  void ui;
  return null;
}
