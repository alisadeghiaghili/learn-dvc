import { describe, expect, it } from 'vitest';
import { allLevels, curriculumOutcomes, getLevel } from '../src/levels';
import { emptyState } from '../src/engine/state';
import { executeCommand } from '../src/engine/commands';
import { solutionComplete } from '../src/engine/solution';
import { formatConcepts } from '../src/engine/glossary';

function runLevel(levelId: string, cmds?: string[]) {
  const level = getLevel(levelId)!;
  let state = structuredClone(level.startState);
  const commands = cmds ?? level.solution;
  for (const c of commands) state = executeCommand(state, c).state;
  return state;
}

describe('field practice levels', () => {
  it('field-5 freeze then unfreeze then repro', () => {
    const level = getLevel('field-5')!;
    let s = structuredClone(level.startState);
    for (const c of level.solution) {
      const step = executeCommand(s, c);
      s = step.state;
    }
    expect(solutionComplete(s, level.solution)).toBe(true);
    expect(s.params.lr).toBe(0.2);
    expect(s.pipeline.find((p) => p.name === 'train')?.frozen).toBe(false);
  });

  it('field-6 status/diff/commit path completes', () => {
    const s = runLevel('field-6');
    expect(solutionComplete(s, getLevel('field-6')!.solution)).toBe(true);
  });

  it('capstone solution completes', () => {
    const s = runLevel('capstone-1');
    expect(solutionComplete(s, getLevel('capstone-1')!.solution)).toBe(true);
  });

  it('concepts glossary is dense and non-empty', () => {
    const text = formatConcepts();
    expect(text.length).toBeGreaterThan(400);
    expect(text).toContain('Pointer file');
    expect(text).toContain('Experiments');
  });

  it('curriculum outcomes cover field skills', () => {
    const outcomes = curriculumOutcomes().join('\n');
    expect(outcomes).toMatch(/freeze/i);
    expect(outcomes).toMatch(/dvc diff/i);
    expect(outcomes).toMatch(/concepts/i);
  });

  it('every level has learning bullets and at least 2 dialog slides', () => {
    for (const level of allLevels) {
      expect(level.learning.length, level.id).toBeGreaterThan(0);
      expect(level.startDialog.length, level.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('concepts command responds', () => {
    const result = executeCommand(emptyState(), 'concepts pointer').result;
    expect(result.ok || result.error).toBeTruthy();
    const out = result.output || result.error || '';
    expect(out.toLowerCase()).toContain('pointer');
  });
});
