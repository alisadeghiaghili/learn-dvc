import { describe, expect, it } from 'vitest';
import { buildShareTargets, LIVE_URL, shareMessage } from '../src/ui/share';

describe('share payloads', () => {
  it('builds LinkedIn, X, and Facebook targets with level details', () => {
    const share = buildShareTargets({
      levelName: 'Initialize DVC',
      levelId: 'basics-1',
      commands: 3,
      par: 3,
    });
    expect(share.text).toContain('Initialize DVC');
    expect(share.text).toContain('basics-1');
    expect(share.text).toContain('3 command');
    expect(share.linkedin).toContain('linkedin.com/sharing');
    expect(share.linkedin).toContain(encodeURIComponent(LIVE_URL));
    expect(share.x).toContain('twitter.com/intent/tweet');
    expect(share.x).toContain(encodeURIComponent(share.text));
    expect(share.facebook).toContain('facebook.com/sharer');
    expect(share.facebook).toContain(encodeURIComponent(LIVE_URL));
  });

  it('handles last-level message without command count', () => {
    const text = shareMessage({
      levelName: 'Apply',
      levelId: 'exp-3',
      commands: null,
      par: 4,
    });
    expect(text).toContain('par 4');
    expect(text).not.toContain('null');
  });
});
