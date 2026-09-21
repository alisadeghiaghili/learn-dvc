import { describe, expect, it } from 'vitest';
import { buildShareTargets, shareMessageLinkedIn, shareMessageX } from '../src/ui/share';
import { summarizeCurriculum } from '../src/ui/progress';
import { allLevels } from '../src/levels';

function fakeProgress(ids: string[]): Record<string, { solved: boolean; bestCommands?: number }> {
  const p: Record<string, { solved: boolean; bestCommands?: number }> = {};
  for (const id of ids) p[id] = { solved: true, bestCommands: 3 };
  return p;
}

describe('curriculum share messages', () => {
  it('lists learned levels in the LinkedIn post', () => {
    const curriculum = summarizeCurriculum(fakeProgress(['basics-1', 'basics-2']));
    const text = shareMessageLinkedIn({
      levelName: 'Track a dataset',
      levelId: 'basics-2',
      commands: 3,
      par: 3,
      curriculum,
    });
    expect(text).toContain('I\'m learning Data Version Control');
    expect(curriculum.solvedCount).toBe(2);
    expect(curriculum.learned).toHaveLength(2);
    expect(text).toContain('Basics: Initialize DVC');
    expect(text).toContain('Basics: Track a dataset');
    expect(text).toContain('What I\'ve learned so far (2/');
    expect(text).toContain('learn-dvc');
  });

  it('X text stays short and mentions progress', () => {
    const ids = allLevels.map((l) => l.id);
    const curriculum = summarizeCurriculum(fakeProgress(ids.slice(0, 5)));
    const short = shareMessageX({
      levelName: 'x',
      levelId: 'basics-3',
      commands: 2,
      par: 5,
      curriculum,
    });
    expect(short).toContain('5/');
    expect(short.length).toBeLessThanOrEqual(280);
  });

  it('share targets include curriculum in LinkedIn text param', () => {
    const curriculum = summarizeCurriculum(fakeProgress(['basics-1']));
    const targets = buildShareTargets({
      levelName: 'Initialize DVC',
      levelId: 'basics-1',
      commands: 3,
      par: 3,
      curriculum,
    });
    expect(targets.linkedin).toContain('linkedin.com');
    expect(decodeURIComponent(targets.linkedin)).toContain('Initialize DVC');
    expect(targets.learnedLines.join(' ')).toContain('Initialize DVC');
  });
});
