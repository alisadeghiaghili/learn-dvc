import { describe, expect, it } from 'vitest';
import { emptyState } from '../src/engine/state';
import { executeCommand } from '../src/engine/commands';
import { solutionComplete } from '../src/engine/solution';
import { getLevel } from '../src/levels';

function run(state = emptyState(), cmds: string[]) {
  let s = state;
  const outputs: string[] = [];
  for (const c of cmds) {
    const r = executeCommand(s, c);
    s = r.state;
    outputs.push(r.result.output || r.result.error || '');
  }
  return { state: s, outputs };
}

describe('practical gap pack', () => {
  it('meta-1 writes yaml/lock and directory outs', () => {
    const level = getLevel('meta-1')!;
    const { state, outputs } = run(structuredClone(level.startState), level.solution);
    expect(solutionComplete(state, level.solution)).toBe(true);
    expect(outputs.join('\n')).toMatch(/stages:/);
    expect(outputs.join('\n')).toMatch(/dvc\.lock|schema/);
    expect(state.files['data/prepared']?.present).toBe(true);
  });

  it('meta-2 hits run cache after param round-trip', () => {
    const level = getLevel('meta-2')!;
    const { state, outputs } = run(structuredClone(level.startState), level.solution);
    const all = outputs.join('\n');
    expect(all).toMatch(/run cache/i);
    expect(state.params['train.n_est']).toBe(50);
    expect(solutionComplete(state, level.solution)).toBe(true);
  });

  it('meta-3 nested param keys invalidate', () => {
    const level = getLevel('meta-3')!;
    const { state } = run(structuredClone(level.startState), level.solution);
    expect(state.params['prepare.split']).toBe(0.3);
    expect(solutionComplete(state, level.solution)).toBe(true);
  });

  it('cmp-1 params/metrics/plots commands work', () => {
    const level = getLevel('cmp-1')!;
    const { outputs } = run(structuredClone(level.startState), level.solution);
    const all = outputs.join('\n');
    expect(all).toMatch(/params|No param/i);
    expect(all).toMatch(/metrics|No metric/i);
    expect(all).toMatch(/plots|loss/i);
  });

  it('cmp-2 exp diff after two nested param runs', () => {
    const level = getLevel('cmp-2')!;
    const { state, outputs } = run(structuredClone(level.startState), level.solution);
    expect(state.experiments.length).toBeGreaterThanOrEqual(2);
    expect(outputs.join('\n')).toMatch(/n_est|exp/i);
    expect(solutionComplete(state, level.solution)).toBe(true);
  });

  it('reg-1 get downloads without tracking', () => {
    const level = getLevel('reg-1')!;
    const { state } = run(structuredClone(level.startState), level.solution);
    expect(state.files['data/from_registry.xml']?.present).toBe(true);
    expect(state.files['data/from_registry.xml']?.tracked).toBe(false);
  });

  it('reg-2 import tracks and caches', () => {
    const level = getLevel('reg-2')!;
    const { state } = run(structuredClone(level.startState), level.solution);
    expect(state.files['data/imported.xml']?.tracked).toBe(true);
    expect(solutionComplete(state, level.solution)).toBe(true);
  });
});
