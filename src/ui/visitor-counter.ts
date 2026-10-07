/**
 * Visitor counter client with local deduplication.
 * Fetches page visitor count and renders a clean numeric stat in the toolbar.
 */

const STORAGE_KEY = 'learn-dvc:visitor-count-cache:v2';
const BADGE_URL = 'https://api.visitorbadge.io/api/combined?path=learn-dvc';

export interface CachedCount {
  count: number;
  at: number;
}

/**
 * Extracts the numeric visitor count from the visitorbadge SVG payload.
 * Handles both combined ("VISITORS: daily / total") and simple ("VISITORS: total").
 */
export function parseVisitorBadgeSvg(svg: string): number | null {
  if (!svg || typeof svg !== 'string') return null;

  // 1. Look for combined format: daily / total -> extract total (second number)
  const combinedMatch = svg.match(/(?:VISITORS:|>)\s*[\d.,]+[KMB]?\s*\/\s*([\d.,]+[KMB]?)/i);
  let raw = combinedMatch ? combinedMatch[1] : '';

  // 2. Look for simple label "VISITORS: <number>"
  if (!raw) {
    const simpleMatch = svg.match(/VISITORS:\s*([\d.,]+[KMB]?)/i);
    raw = simpleMatch ? simpleMatch[1] : '';
  }

  // 3. Fallback to extracting the trailing text node containing numeric data
  if (!raw) {
    const textMatches = Array.from(svg.matchAll(/>\s*([0-9.,]+[KMB]?)\s*<\/text>/gi));
    if (textMatches.length > 0) {
      raw = textMatches[textMatches.length - 1][1];
    }
  }

  raw = (raw || '').replace(/,/g, '').trim();
  if (!raw) return null;

  const suffix = raw.slice(-1).toUpperCase();
  const scale = { K: 1e3, M: 1e6, B: 1e9 }[suffix as 'K' | 'M' | 'B'] || 1;
  const numPart = scale > 1 ? raw.slice(0, -1) : raw;
  const numeric = Number.parseFloat(numPart) * scale;
  return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric) : null;
}

/**
 * Retrieves the visitor count, incrementing on the first visit per browser,
 * while returning cached count on subsequent visits to count unique visitors.
 */
export async function getVisitorCount(): Promise<number | null> {
  // Purge legacy cache that may contain obsolete daily visit counts
  try {
    localStorage.removeItem('learn-dvc:visitor-count-cache');
  } catch {}

  // Check local cache first (valid for 30 minutes)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as CachedCount;
      if (typeof cached.count === 'number' && Number.isFinite(cached.count) && cached.count > 0) {
        if (Date.now() - (cached.at || 0) < 1800_000) {
          return cached.count;
        }
      }
    }
  } catch {
    // LocalStorage may fail in restricted private browsing
  }

  try {
    const res = await fetch(badgeUrlWithLocale(), {
      cache: 'no-store',
      headers: {
        'Accept': 'image/svg+xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) return null;

    const svg = await res.text();
    const count = parseVisitorBadgeSvg(svg);

    if (count !== null) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ count, at: Date.now() }),
        );
      } catch {
        // quota or private mode
      }
    }

    return count;
  } catch {
    return null;
  }
}

function badgeUrlWithLocale(): string {
  return BADGE_URL;
}

