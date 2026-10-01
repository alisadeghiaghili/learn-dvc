/**
 * Visitor counter client with local deduplication.
 * Fetches page visitor count and renders it cleanly in the toolbar.
 */

const STORAGE_KEY = 'learn-dvc:visitor-counted';
const BADGE_URL = 'https://komarev.com/ghpvc/?username=alisadeghiaghili-learn-dvc&label=Visitors';

export interface VisitorStats {
  count: number;
}

/**
 * Extracts the numeric visitor count from the SVG payload.
 */
export function parseVisitorSvg(svg: string): number | null {
  // Matches text elements in the SVG: e.g. <text ...>123</text> or 1.2k
  const matches = [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/gi)];
  if (matches.length === 0) return null;

  for (let i = matches.length - 1; i >= 0; i--) {
    const raw = matches[i][1].trim().replace(/,/g, '');
    if (!raw || raw.toLowerCase() === 'visitors') continue;

    const suffix = raw.slice(-1).toUpperCase();
    const scale = suffix === 'K' ? 1e3 : suffix === 'M' ? 1e6 : suffix === 'B' ? 1e9 : 1;
    const numPart = scale > 1 ? raw.slice(0, -1) : raw;
    const val = Number.parseFloat(numPart) * scale;
    if (Number.isFinite(val) && val >= 0) {
      return Math.round(val);
    }
  }

  return null;
}

/**
 * Retrieves the visitor count, incrementing on the first visit per browser,
 * while respecting privacy and preventing double-counting within a session.
 */
export async function getVisitorCount(): Promise<number | null> {
  try {
    const isCounted = localStorage.getItem(STORAGE_KEY);
    const targetUrl = `${BADGE_URL}&_t=${isCounted ? 'cached' : Date.now()}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

    let svg: string | null = null;

    try {
      const res = await fetch(proxyUrl, {
        headers: { Accept: 'image/svg+xml, text/plain, */*' },
      });
      if (res.ok) {
        svg = await res.text();
      }
    } catch {
      svg = null;
    }

    if (!svg) {
      try {
        const directRes = await fetch(BADGE_URL, {
          mode: 'cors',
          headers: { Accept: 'image/svg+xml' },
        });
        if (directRes.ok) {
          svg = await directRes.text();
        }
      } catch {
        svg = null;
      }
    }

    if (!svg) return null;

    const count = parseVisitorSvg(svg);

    if (count !== null && !isCounted) {
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        // LocalStorage may be unavailable in private browsing mode
      }
    }

    return count;
  } catch {
    return null;
  }
}
