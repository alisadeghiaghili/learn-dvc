export const LIVE_URL = 'https://alisadeghiaghili.github.io/learn-dvc/';

export function shareMessage(opts: {
  levelName: string;
  levelId: string;
  commands: number | null;
  par: number;
}): string {
  const golf =
    opts.commands !== null && opts.commands > 0
      ? `${opts.commands} command${opts.commands === 1 ? '' : 's'} (par ${opts.par})`
      : `par ${opts.par}`;
  return `I just solved LearnDVC «${opts.levelName}» (${opts.levelId}) — ${golf}. Practicing Data Version Control interactively.`;
}

export interface ShareTargets {
  linkedin: string;
  x: string;
  facebook: string;
  text: string;
  url: string;
}

export function buildShareTargets(opts: {
  levelName: string;
  levelId: string;
  commands: number | null;
  par: number;
}): ShareTargets {
  const text = shareMessage(opts);
  const url = `${LIVE_URL}?NODEMO`;
  return {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
    text,
    url,
  };
}

export function openShareWindow(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer,width=640,height=560');
}

export async function copySharePayload(text: string, url: string): Promise<boolean> {
  const payload = `${text}\n${url}`;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload);
      return true;
    }
  } catch {
    // fall through to legacy path
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
