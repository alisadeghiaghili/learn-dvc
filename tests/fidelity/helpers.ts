import { executeCommand } from '../../src/engine/commands';
import { getLevel } from '../../src/levels';
import type { CommandResult, RepoState } from '../../src/engine/types';

export interface Step {
  cmd: string;
  result: CommandResult;
  /** output + error joined, for regex assertions */
  text: string;
}

export interface RunResult {
  state: RepoState;
  steps: Step[];
  /** the last step (most tests assert on this one) */
  last: Step;
}

export function textOf(r: CommandResult): string {
  return [r.output, r.error].filter(Boolean).join('\n');
}

/** Chain commands, returning the final state and every step's result. */
export function run(state: RepoState, ...cmds: string[]): RunResult {
  let s = state;
  const steps: Step[] = [];
  for (const cmd of cmds) {
    const out = executeCommand(s, cmd);
    s = out.state;
    steps.push({ cmd, result: out.result, text: textOf(out.result) });
  }
  return { state: s, steps, last: steps[steps.length - 1]! };
}

/** Like run(), but every command must succeed - used for fixture setup. */
export function setup(state: RepoState, ...cmds: string[]): RepoState {
  const r = run(state, ...cmds);
  const bad = r.steps.find((st) => !st.result.ok);
  if (bad) throw new Error(`fixture setup failed at "${bad.cmd}": ${bad.text}`);
  return r.state;
}

/** Deep-cloned start state of a level. */
export function startOf(id: string): RepoState {
  const level = getLevel(id);
  if (!level) throw new Error(`unknown level ${id}`);
  return structuredClone(level.startState);
}

export function solutionOf(id: string): string[] {
  const level = getLevel(id);
  if (!level) throw new Error(`unknown level ${id}`);
  return level.solution;
}
