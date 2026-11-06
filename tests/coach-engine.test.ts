import { afterEach, describe, expect, it } from 'vitest';
import { coachLine, formatNextSteps, nextSteps } from '../src/engine/coach';
import { executeCommand } from '../src/engine/commands';
import { emptyState, makeFile } from '../src/engine/state';
import type { GoalCheck, LevelDef } from '../src/engine/types';
import { getLevel } from '../src/levels';
import { setLocale } from '../src/i18n';
import { de } from '../src/i18n/de';
import { en } from '../src/i18n/en';

afterEach(() => setLocale('en'));

function goalOnlyLevel(goal: GoalCheck): LevelDef {
  const base = getLevel('basics-1')!;
  return { ...base, id: 'synthetic', solution: [], goal, startState: emptyState() };
}

describe('nextSteps', () => {
  it('lists every unfinished solution step of a level, with the command to type', () => {
    const level = getLevel('basics-1')!;
    const steps = nextSteps(structuredClone(level.startState), level.goal, level);
    expect(steps.map((s) => s.command)).toEqual(['dvc init', 'git commit -m "Initialize DVC"']);
  });

  it('drops steps as the learner completes them', () => {
    const level = getLevel('basics-1')!;
    const state = executeCommand(structuredClone(level.startState), 'dvc init').state;
    const steps = nextSteps(state, level.goal, level);
    expect(steps.map((s) => s.command)).toEqual(['git commit -m "Initialize DVC"']);
  });

  it('falls back to unmet goal checks when the level has no solution list, suggesting a command only for the first', () => {
    const goal: GoalCheck = {
      kind: 'allOf',
      checks: [{ kind: 'initialized' }, { kind: 'tracked', paths: ['data/data.xml'] }],
    };
    const steps = nextSteps(emptyState(), goal, goalOnlyLevel(goal));
    expect(steps).toEqual([
      { label: 'DVC initialized', command: 'dvc init' },
      { label: 'Tracked: data/data.xml', command: null },
    ]);
  });

  it('works without any level and skips goal checks that are already met', () => {
    const state = emptyState();
    state.initialized = true;
    state.files['a'] = makeFile('a', 'data');
    const goal: GoalCheck = {
      kind: 'allOf',
      checks: [{ kind: 'initialized' }, { kind: 'tracked', paths: ['a'] }],
    };
    expect(nextSteps(state, goal)).toEqual([{ label: 'Tracked: a', command: null }]);
    expect(nextSteps(state, { kind: 'initialized' })).toEqual([]);
  });
});

describe('formatNextSteps', () => {
  it('says the goal is met when nothing remains', () => {
    expect(formatNextSteps([], null)).toBe(
      'All goal steps are met — you should be done. Type `show goal` to confirm.',
    );
  });

  it('renders a numbered checklist with indented commands, the level id and a footer', () => {
    const level = getLevel('basics-1')!;
    const text = formatNextSteps(
      [
        { label: 'Initialise', command: 'dvc init' },
        { label: 'Commit', command: null },
      ],
      level,
    );
    expect(text.split('\n')).toEqual([
      'Next steps (2 remaining) for basics-1:',
      '  1. [ ] Initialise',
      '      dvc init',
      '  2. [ ] Commit',
      'Type `steps` to repeat this list · `hint` · `show goal`',
    ]);
  });

  it('omits the level id when no level is active', () => {
    expect(formatNextSteps([{ label: 'x', command: null }], null).split('\n')[0]).toBe(
      'Next steps (1 remaining):',
    );
  });

  it('is localised', () => {
    setLocale('de');
    expect(formatNextSteps([], null)).toBe(de.ui.coachAllDone);
    expect(de.ui.coachAllDone).not.toBe(en.ui.coachAllDone);
  });
});

describe('coachLine', () => {
  it('is silent outside a level', () => {
    expect(coachLine(emptyState(), null)).toBeNull();
  });

  it('prints the remaining steps after a command while the level is unfinished', () => {
    const level = getLevel('basics-1')!;
    const state = executeCommand(structuredClone(level.startState), 'dvc init').state;
    const line = coachLine(state, level);
    expect(line).toContain('Next steps (1 remaining) for basics-1:');
    expect(line).toContain('git commit -m "Initialize DVC"');
    expect(line).not.toContain('dvc init');
  });

  it('goes quiet once the whole solution checklist is done', () => {
    const level = getLevel('basics-1')!;
    let state = structuredClone(level.startState);
    for (const cmd of level.solution) state = executeCommand(state, cmd).state;
    expect(coachLine(state, level)).toBeNull();
  });

  it('for goal-only levels, is silent when solved and coaches otherwise', () => {
    const level = goalOnlyLevel({ kind: 'initialized' });
    expect(coachLine(emptyState(), level)).toContain('DVC initialized');
    const solved = emptyState();
    solved.initialized = true;
    expect(coachLine(solved, level)).toBeNull();
  });
});
