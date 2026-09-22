import type { CurriculumSummary } from './progress';

export const LIVE_URL = 'https://alisadeghiaghili.github.io/learn-dvc/';
export const SHARE_URL = `${LIVE_URL}?NODEMO`;
export const REPO_URL = 'https://github.com/alisadeghiaghili/learn-dvc';
export const COFFEE_URL = 'https://www.buymeacoffee.com/alisadeghil';
export const PUBLISHER = 'Ali Sadeghi Aghili';
export const COFFEE_BUTTON_HTML = `<a href="${COFFEE_URL}" target="_blank" rel="noopener noreferrer"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=alisadeghil&button_colour=2a3a4a&font_colour=ffffff&font_family=Cookie&outline_colour=ffffff&coffee_colour=FFDD00" alt="Buy me a coffee" /></a>`;

export interface ShareContext {
  levelName: string;
  levelId: string;
  commands: number | null;
  par: number;
  curriculum: CurriculumSummary;
}

function bulletList(items: { name: string; id: string; seriesTitle: string }[], limit?: number): string[] {
  const list = limit ? items.slice(0, limit) : items;
  const lines = list.map((l) => `• ${l.seriesTitle}: ${l.name}`);
  if (limit && items.length > limit) {
    lines.push(`• …and ${items.length - limit} more`);
  }
  return lines;
}

export function shareMessageLinkedIn(ctx: ShareContext): string {
  const { curriculum: c, levelName, levelId } = ctx;
  const headline =
    c.solvedCount === 0
      ? 'I just started learning Data Version Control with LearnDVC.'
      : 'I am learning Data Version Control (DVC) with LearnDVC — an interactive sandbox and tutorial.';

  const just =
    c.solvedCount > 0
      ? `Latest: “${levelName}” (${levelId})${
          ctx.commands !== null
            ? ` — solved in ${ctx.commands} command${ctx.commands === 1 ? '' : 's'} (ideal ${ctx.par})`
            : ''
        }.`
      : `Working through ${c.total} hands-on levels.`;

  const learned = c.learned.length
    ? ['', `What I've learned so far (${c.solvedCount}/${c.total} levels):`, ...bulletList(c.learned)].join('\n')
    : '';

  const next = c.next ? `\n\nUp next: ${c.next.name} (${c.next.id})` : '';

  return [
    headline,
    '',
    just,
    learned,
    next,
    '',
    `Try it yourself (free, no login): ${SHARE_URL}`,
  ]
    .filter((part) => part !== undefined)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

export function shareMessageX(ctx: ShareContext): string {
  const { curriculum: c } = ctx;
  const head =
    c.solvedCount > 0
      ? `Learning DVC with LearnDVC — ${c.solvedCount}/${c.total} levels done.`
      : 'Starting DVC with LearnDVC.';
  const body = c.learned.length
    ? bulletList(c.learned, 3).join('\n')
    : 'Interactive Data Version Control tutorial.';
  const url = LIVE_URL;
  let text = `${head}\n${body}\n${url}`;
  if (text.length > 279) {
    const first = c.learned[0] ? `• ${c.learned[0].seriesTitle}: ${c.learned[0].name}` : '';
    text = `${head}\n${first}\n${url}`.slice(0, 279);
  }
  return text;
}

export interface ShareTargets {
  linkedin: string;
  x: string;
  facebook: string;
  text: string;
  shortText: string;
  url: string;
  learnedLines: string[];
}

export function buildShareTargets(ctx: ShareContext): ShareTargets {
  const longText = shareMessageLinkedIn(ctx);
  const shortText = shareMessageX(ctx);
  const url = SHARE_URL;
  return {
    // LinkedIn/Facebook often drop query text — we copy the post then open composer.
    linkedin: `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(longText)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shortText)}&url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(longText)}`,
    text: longText,
    shortText,
    url,
    learnedLines: bulletList(ctx.curriculum.learned),
  };
}

export function openShareWindow(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer,width=720,height=640');
}

export async function copySharePayload(text: string, url: string): Promise<boolean> {
  const payload = `${text}\n${url}`;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload);
      return true;
    }
  } catch {
    // fall through
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = payload;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Copy the full post first (LinkedIn/Facebook ignore prefilled text),
 * then open the network composer so the user can paste.
 */
export async function shareWithClipboard(
  kind: 'linkedin' | 'facebook' | 'x' | 'copy',
  targets: ShareTargets,
): Promise<{ opened: boolean; copied: boolean }> {
  if (kind === 'copy') {
    const copied = await copySharePayload(targets.text, targets.url);
    return { opened: false, copied };
  }
  const payload =
    kind === 'x' ? `${targets.shortText}\n${targets.url}` : `${targets.text}\n${targets.url}`;
  const copied = await copySharePayload(payload, targets.url);
  const href =
    kind === 'linkedin' ? targets.linkedin : kind === 'facebook' ? targets.facebook : targets.x;
  openShareWindow(href);
  return { opened: true, copied };
}
