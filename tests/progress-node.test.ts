import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, loadProgress, saveProgress } from '../src/ui/progress';

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('progress persistence without a document', () => {
  it('saves to and loads from localStorage alone, skipping the cookie mirror', () => {
    const storage = fakeStorage();
    vi.stubGlobal('localStorage', storage);
    expect(typeof document).toBe('undefined');
    saveProgress({ 'basics-1': { solved: true, bestCommands: 2 } });
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!).progress).toEqual({ 'basics-1': { solved: true, bestCommands: 2 } });
    expect(loadProgress()).toEqual({ 'basics-1': { solved: true, bestCommands: 2 } });
  });

  it('returns an empty map when no storage exists at all', () => {
    expect(loadProgress()).toEqual({});
  });
});
