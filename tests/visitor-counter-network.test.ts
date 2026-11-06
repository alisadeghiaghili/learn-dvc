// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BASELINE_FALLBACK,
  HISTORICAL_OFFSET,
  getCachedVisitorCount,
  getVisitorCount,
  parseVisitorBadgeSvg,
} from '../src/ui/visitor-counter';

const CACHE_KEY = 'learn-dvc:visitor-count-cache:v3';
const LAST_VISIT_KEY = 'learn-dvc:last-visit-date';
const today = () => new Date().toISOString().slice(0, 10);

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body, text: async () => JSON.stringify(body) } as unknown as Response;
}
function textResponse(body: string, ok = true) {
  return { ok, text: async () => body, json: async () => JSON.parse(body) } as unknown as Response;
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('getCachedVisitorCount', () => {
  it('is null with no cache', () => {
    expect(getCachedVisitorCount()).toBeNull();
  });

  it('returns the cached number, never below the baseline', () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ count: 777, at: 1 }));
    expect(getCachedVisitorCount()).toBe(777);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ count: 12, at: 1 }));
    expect(getCachedVisitorCount()).toBe(BASELINE_FALLBACK);
  });

  it.each([
    ['zero', JSON.stringify({ count: 0 })],
    ['a string', JSON.stringify({ count: '500' })],
    ['negative', JSON.stringify({ count: -5 })],
    ['garbage', 'not json'],
  ])('ignores an unusable cache entry: %s', (_name, raw) => {
    localStorage.setItem(CACHE_KEY, raw);
    expect(getCachedVisitorCount()).toBeNull();
  });

  it('is null when storage access throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(getCachedVisitorCount()).toBeNull();
  });
});

describe('getVisitorCount', () => {
  it('serves the cache without touching the network', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ count: 900, at: 1 }));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await getVisitorCount()).toBe(900);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('counts a first visit of the day with a hit, adds the historical offset and caches it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ value: 50 }));
    vi.stubGlobal('fetch', fetchMock);
    const total = await getVisitorCount();
    expect(total).toBe(50 + HISTORICAL_OFFSET);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe('https://countapi.mileshilliard.com/api/v1/hit/alisadeghiaghili-learn-dvc');
    expect(localStorage.getItem(LAST_VISIT_KEY)).toBe(today());
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)!).count).toBe(253);
    expect(await getVisitorCount()).toBe(253);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('only reads (get) when the visitor was already counted today, so reloads never inflate the number', async () => {
    localStorage.setItem(LAST_VISIT_KEY, today());
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ value: 10 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await getVisitorCount()).toBe(10 + HISTORICAL_OFFSET);
    expect(fetchMock.mock.calls[0]![0]).toContain('/get/');
  });

  it('falls back to the badge image on a new visit when the counter API fails', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('blocked by adblock'))
      .mockResolvedValueOnce(textResponse('<svg><title>VISITORS: 3 / 1,200</title></svg>'));
    vi.stubGlobal('fetch', fetchMock);
    expect(await getVisitorCount()).toBe(1200);
    expect(fetchMock.mock.calls[1]![0]).toBe('https://api.visitorbadge.io/api/combined?path=learn-dvc');
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)!).count).toBe(1200);
  });

  it('never goes below the baseline when the badge reports a small number', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ value: 0 }))
      .mockResolvedValueOnce(textResponse('<svg><title>VISITORS: 40</title></svg>'));
    vi.stubGlobal('fetch', fetchMock);
    expect(await getVisitorCount()).toBe(BASELINE_FALLBACK);
  });

  it('does not use the badge on a repeat visit; it shows the baseline instead', async () => {
    localStorage.setItem(LAST_VISIT_KEY, today());
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false));
    vi.stubGlobal('fetch', fetchMock);
    expect(await getVisitorCount()).toBe(BASELINE_FALLBACK);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it('shows the baseline when both providers fail or answer nonsense', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ value: 'many' }))
      .mockResolvedValueOnce(textResponse('<svg>no digits</svg>'));
    vi.stubGlobal('fetch', fetchMock);
    expect(await getVisitorCount()).toBe(BASELINE_FALLBACK);

    localStorage.clear();
    const failing = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', failing);
    expect(await getVisitorCount()).toBe(BASELINE_FALLBACK);
    expect(failing).toHaveBeenCalledTimes(2);
  });

  it('gives up on a slow counter API after the timeout and tries the fallback', async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    const fetchMock = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      if (url.includes('countapi')) {
        signals.push(init.signal!);
        return new Promise((_resolve, reject) => {
          init.signal!.addEventListener('abort', () => reject(new Error('aborted')));
        });
      }
      return Promise.resolve(textResponse('<svg><title>VISITORS: 5 / 321</title></svg>'));
    });
    vi.stubGlobal('fetch', fetchMock);
    const pending = getVisitorCount();
    await vi.advanceTimersByTimeAsync(3500);
    expect(signals[0]!.aborted).toBe(true);
    expect(await pending).toBe(321);
  });

  it('treats unreadable storage as "not a new visit" and still returns the baseline', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false)));
    expect(await getVisitorCount()).toBe(BASELINE_FALLBACK);
  });

  it('keeps working when the cache cannot be written', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ value: 100 })));
    expect(await getVisitorCount()).toBe(100 + HISTORICAL_OFFSET);
  });
});

describe('parseVisitorBadgeSvg edge cases', () => {
  it('rejects empty input', () => {
    expect(parseVisitorBadgeSvg('')).toBeNull();
  });

  it('falls back to the last numeric text node', () => {
    expect(parseVisitorBadgeSvg('<svg><text>label</text><text> 12 </text><text>3,456</text></svg>')).toBe(3456);
  });

  it('understands the B suffix', () => {
    expect(parseVisitorBadgeSvg('<svg><title>VISITORS: 1.5B</title></svg>')).toBe(1.5e9);
  });
});
