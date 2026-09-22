import { describe, expect, it } from 'vitest';
import { emptyState } from '../src/engine/state';
import { executeCommand } from '../src/engine/commands';
import { solutionComplete } from '../src/engine/solution';
import { getLevel, allLevels, curriculumOutcomes } from '../src/levels';
import { CONCEPTS } from '../src/engine/glossary';

function run(state = emptyState(), cmds: string[]) {
  let s = state;
  const out: string[] = [];
  for (const c of cmds) {
    const r = executeCommand(s, c);
    s = r.state;
    out.push(r.result.output || r.result.error || '');
  }
  return { state: s, out };
}

describe('camp packs → ≥80% curriculum surface', () => {
  it('camp-1 DVCLive API surface', () => {
    const level = getLevel('camp-1')!;
    const { state, out } = run(structuredClone(level.startState), level.solution);
    expect(out.join('\n')).toMatch(/log_metric|Live/i);
    expect(state.live.metrics['acc']?.length).toBeGreaterThan(0);
    expect(solutionComplete(state, level.solution)).toBe(true);
  });

  it('camp-2 plots templates', () => {
    const level = getLevel('camp-2')!;
    const { out } = run(structuredClone(level.startState), level.solution);
    const all = out.join('\n');
    expect(all).toMatch(/template=linear|template=confusion/);
    expect(all).toMatch(/confusion matrix|plots diff/i);
  });

  it('camp-3 queue sweep', () => {
    const level = getLevel('camp-3')!;
    const { state, out } = run(structuredClone(level.startState), level.solution);
    expect(state.experiments.length).toBeGreaterThanOrEqual(2);
    expect(out.join('\n')).toMatch(/Queued|queue/i);
    expect(solutionComplete(state, level.solution)).toBe(true);
  });

  it('camp-4 foreach expands stages', () => {
    const level = getLevel('camp-4')!;
    const { state, out } = run(structuredClone(level.startState), level.solution);
    expect(state.pipeline.some((p) => p.name.includes('featurize'))).toBe(true);
    expect(out.join('\n')).toMatch(/foreach|featurize/i);
    expect(solutionComplete(state, level.solution)).toBe(true);
  });

  it('camp-5 dvcignore + update + cml + api', () => {
    const level = getLevel('camp-5')!;
    const { state, out } = run(structuredClone(level.startState), level.solution);
    expect(state.dvcIgnore).toContain('scratch/*');
    expect(state.dataVersions['data/data.xml']).toBeGreaterThan(0);
    expect(out.join('\n')).toMatch(/CML/i);
    expect(out.join('\n')).toMatch(/dvc\.api/i);
    expect(solutionComplete(state, level.solution)).toBe(true);
  });

  it('glossary covers camp surface', () => {
    const ids = CONCEPTS.map((c) => c.id).join(' ');
    for (const id of ['dvclive', 'plots-templates', 'queue', 'cml', 'lfs', 'foreach', 'api']) {
      expect(ids).toContain(id);
    }
  });

  it('every camp level has ≥2 dialog slides and learning bullets', () => {
    for (const l of allLevels.filter((x) => x.series === 'camp')) {
      expect(l.learning.length).toBeGreaterThan(0);
      expect(l.startDialog.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('curriculum outcomes name camp skills', () => {
    const t = curriculumOutcomes().join('\n');
    for (const kw of ['DVCLive', 'queue', 'foreach', 'Git-LFS', 'CML', 'dvc.api', 'template']) {
      expect(t).toContain(kw);
    }
  });
});
