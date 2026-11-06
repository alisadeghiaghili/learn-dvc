// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { launchConfetti, playFanfare } from '../src/ui/confetti';

interface FakeCtx {
  setTransform: ReturnType<typeof vi.fn>;
  clearRect: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
  rotate: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  closePath: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  fillStyle: string;
  globalAlpha: number;
}

function fakeCtx(): FakeCtx {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
  };
}

let ctx: FakeCtx;
let frames: ((now: number) => void)[];
let cancelled: number[];

function matchMedia(reduce: boolean): void {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduce && q.includes('reduce'), media: q }));
  window.matchMedia = ((q: string) => ({ matches: reduce && q.includes('reduce'), media: q })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  document.body.innerHTML = '';
  ctx = fakeCtx();
  frames = [];
  cancelled = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  vi.stubGlobal('requestAnimationFrame', (cb: (n: number) => void) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => cancelled.push(id));
  vi.spyOn(performance, 'now').mockReturnValue(1000);
  matchMedia(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('launchConfetti with motion', () => {
  it('adds a decorative full-screen canvas sized to the viewport and pixel ratio', () => {
    window.innerWidth = 800;
    window.innerHeight = 600;
    window.devicePixelRatio = 3;
    const handle = launchConfetti(1000);
    const canvas = document.querySelector('canvas.confetti-canvas') as HTMLCanvasElement;
    expect(handle).not.toBeNull();
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
    expect(canvas.width).toBe(1600); // device pixel ratio is capped at 2
    expect(canvas.height).toBe(1200);
    expect(canvas.style.width).toBe('800px');
    expect(canvas.style.height).toBe('600px');
    expect(ctx.setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0);
    handle!.stop();
  });

  it('resizes with the window', () => {
    window.innerWidth = 800;
    window.innerHeight = 600;
    window.devicePixelRatio = 1;
    const handle = launchConfetti(1000)!;
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    window.innerWidth = 400;
    window.innerHeight = 300;
    window.dispatchEvent(new Event('resize'));
    expect(canvas.width).toBe(400);
    expect(canvas.style.height).toBe('300px');
    handle.stop();
  });

  it('draws an opening burst of 110 pieces on the first frame, clearing the canvas first', () => {
    const handle = launchConfetti(4200)!;
    expect(frames).toHaveLength(1);
    frames[0]!(1016);
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
    expect(ctx.save).toHaveBeenCalledTimes(110);
    expect(ctx.restore).toHaveBeenCalledTimes(110);
    // every piece is a rectangle, a ribbon (also a rect) or a triangle path
    expect(ctx.fillRect.mock.calls.length + ctx.fill.mock.calls.length).toBe(110);
    expect(ctx.globalAlpha).toBe(1);
    // the next frame is requested so the animation keeps going
    expect(frames).toHaveLength(2);
    handle.stop();
  });

  it('fades the pieces out during the last 600ms', () => {
    const handle = launchConfetti(4200)!;
    frames[0]!(1000 + 4200 - 300);
    expect(ctx.globalAlpha).toBeCloseTo(0.5, 5);
    handle.stop();
  });

  it('removes itself once the duration has elapsed', () => {
    launchConfetti(4200);
    expect(document.querySelector('canvas')).not.toBeNull();
    frames[0]!(1000 + 4300);
    expect(document.querySelector('canvas')).toBeNull();
    expect(cancelled.length).toBeGreaterThan(0);
  });

  it('stop() removes the canvas, cancels the animation and the resize listener', () => {
    window.innerWidth = 800;
    const handle = launchConfetti(4200)!;
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    handle.stop();
    expect(document.querySelector('canvas')).toBeNull();
    expect(cancelled).toContain(1);
    window.innerWidth = 123;
    window.dispatchEvent(new Event('resize'));
    expect(canvas.style.width).not.toBe('123px');
  });

  it('keeps raining new pieces for a while and then stops spawning', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
    const handle = launchConfetti(4200)!;
    vi.advanceTimersByTime(300);
    frames[0]!(Date.now());
    expect(ctx.save).toHaveBeenCalledTimes(128); // 110 + one rain drop of 18
    ctx.save.mockClear();
    vi.advanceTimersByTime(3000);
    frames[frames.length - 1]!(Date.now());
    const late = ctx.save.mock.calls.length;
    ctx.save.mockClear();
    vi.advanceTimersByTime(1000);
    frames[frames.length - 1]!(Date.now());
    expect(ctx.save.mock.calls.length).toBe(late); // rain stopped at duration - 1200ms
    handle.stop();
  });

  it('auto-stops shortly after the duration even if animation frames stop arriving', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    launchConfetti(1000);
    expect(document.querySelector('canvas')).not.toBeNull();
    vi.advanceTimersByTime(1500);
    expect(document.querySelector('canvas')).toBeNull();
  });

  it('gives up quietly when the browser has no 2d canvas', () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    expect(launchConfetti()).toBeNull();
    expect(document.querySelector('canvas')).toBeNull();
  });
});

describe('launchConfetti with reduced motion', () => {
  it('shows a static decorative layer instead of animating', () => {
    matchMedia(true);
    const handle = launchConfetti()!;
    const layer = document.querySelector('.confetti-static')!;
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('canvas')).toBeNull();
    expect(frames).toHaveLength(0);
    handle.stop();
    expect(document.querySelector('.confetti-static')).toBeNull();
  });
});

describe('playFanfare', () => {
  interface Osc {
    type: string;
    frequency: { value: number };
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }

  function installAudio(): { oscillators: Osc[]; close: ReturnType<typeof vi.fn>; created: number } {
    const state = { oscillators: [] as Osc[], close: vi.fn().mockResolvedValue(undefined), created: 0 };
    class FakeAudioContext {
      currentTime = 2;
      destination = {};
      constructor() {
        state.created++;
      }
      createOscillator(): Osc {
        const osc: Osc = { type: '', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
        state.oscillators.push(osc);
        return osc;
      }
      createGain() {
        return {
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
        };
      }
      close = state.close;
    }
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
    return state;
  }

  afterEach(() => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  });

  it('plays a rising four-note arpeggio, each note 90ms after the previous one', () => {
    const audio = installAudio();
    playFanfare();
    expect(audio.oscillators.map((o) => o.frequency.value)).toEqual([523.25, 659.25, 783.99, 1046.5]);
    expect(audio.oscillators.every((o) => o.type === 'triangle')).toBe(true);
    const starts = audio.oscillators.map((o) => o.start.mock.calls[0]![0] as number);
    expect(starts[0]).toBeCloseTo(2, 5);
    expect(starts[1]! - starts[0]!).toBeCloseTo(0.09, 5);
    expect(starts[3]! - starts[0]!).toBeCloseTo(0.27, 5);
    expect(audio.oscillators[0]!.stop.mock.calls[0]![0]).toBeCloseTo(2.25, 5);
  });

  it('releases the audio context after the notes finished', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    const audio = installAudio();
    playFanfare();
    expect(audio.close).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1300);
    expect(audio.close).toHaveBeenCalledTimes(1);
  });

  it('does nothing when Web Audio is not available', () => {
    expect(() => playFanfare()).not.toThrow();
  });

  it('swallows errors from blocked audio', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = class {
      constructor() {
        throw new Error('autoplay blocked');
      }
    };
    expect(() => playFanfare()).not.toThrow();
  });
});
