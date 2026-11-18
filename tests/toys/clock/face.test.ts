import { describe, it, expect, vi, afterEach } from 'vitest';
import { createClockFace } from '../../../src/toys/math/clock/face';

const base = { minutes: 195, snap: 1, zones: true, interactive: true };
const hands = (el: HTMLElement) => ({
  minute: el.querySelector('[data-role="minute-hand"]')!.getAttribute('transform'),
  hour: el.querySelector('[data-role="hour-hand"]')!.getAttribute('transform'),
});
const fire = (target: EventTarget, type: string, x = 0, y = 0) =>
  target.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true }));

afterEach(() => vi.restoreAllMocks());

describe('createClockFace', () => {
  it('sets root attributes and renders hands', async () => {
    const el = document.createElement('div');
    const f = createClockFace(el, base);
    const root = el.firstElementChild!;
    expect(root.getAttribute('data-role')).toBe('clock-face');
    expect(root.getAttribute('data-minutes')).toBe('195');
    await f.setMinutes(225);
    expect(hands(el)).toEqual({ minute: 'rotate(270 200 200)', hour: 'rotate(112.5 200 200)' });
    expect(root.getAttribute('data-minutes')).toBe('225');
    expect(f.getMinutes()).toBe(225);
    expect(el.querySelectorAll('line[stroke-width="56"]').length).toBe(2);
    f.destroy();
  });

  it('interactive:false attaches no pointer listeners', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const f = createClockFace(document.createElement('div'), { ...base, interactive: false });
    expect(add.mock.calls.filter(c => String(c[0]).startsWith('pointer'))).toHaveLength(0);
    f.destroy();
  });

  it('destroy removes window listeners', () => {
    const rm = vi.spyOn(window, 'removeEventListener');
    const f = createClockFace(document.createElement('div'), base);
    f.destroy();
    const types = rm.mock.calls.map(c => c[0]);
    expect(types).toContain('pointermove');
    expect(types).toContain('pointerup');
    expect(types).toContain('pointercancel');
  });

  it('minute drag changes time and flags major ticks; setMinutes does not call onChange', async () => {
    const el = document.createElement('div');
    const onChange = vi.fn();
    const f = createClockFace(el, { ...base, minutes: 190, onChange });
    await f.setMinutes(200);
    expect(onChange).not.toHaveBeenCalled();
    const svg = el.querySelector('svg')!;
    fire(svg, 'pointerdown', 100, 0); // minute 15
    expect(onChange).toHaveBeenLastCalledWith(195, true);
    fire(window, 'pointermove', 100, 100); // 135deg -> minute 23
    expect(onChange).toHaveBeenLastCalledWith(203, false);
    fire(window, 'pointerup');
    fire(window, 'pointermove', 0, -100);
    expect(onChange).toHaveBeenCalledTimes(2);
    f.destroy();
  });

  it('pointercancel ends a drag like pointerup', () => {
    const el = document.createElement('div');
    const onChange = vi.fn();
    const f = createClockFace(el, { ...base, minutes: 190, onChange });
    fire(el.querySelector('svg')!, 'pointerdown', 100, 0); // minute 15
    expect(onChange).toHaveBeenCalledTimes(1);
    fire(window, 'pointercancel');
    fire(window, 'pointermove', 0, 100);
    expect(onChange).toHaveBeenCalledTimes(1);
    f.destroy();
  });

  it('setMinutes animates and resolves; destroy mid-animation resolves', async () => {
    const el = document.createElement('div');
    const f = createClockFace(el, base);
    const p = f.setMinutes(300, 10_000);
    f.destroy();
    await expect(p).resolves.toBeUndefined();
    const g = createClockFace(document.createElement('div'), base);
    await expect(g.setMinutes(240, 30)).resolves.toBeUndefined();
    expect(g.getMinutes()).toBe(240);
    g.destroy();
  });

  it('a drag during a setMinutes animation keeps hands in sync with getMinutes', async () => {
    const queue: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { queue.push(cb); return queue.length; });
    vi.stubGlobal('cancelAnimationFrame', () => { queue.length = 0; });
    const el = document.createElement('div');
    const f = createClockFace(el, base);
    const p = f.setMinutes(225, 1000);
    fire(el.querySelector('svg')!, 'pointerdown', 0, 100); // 180deg -> minute 30
    fire(window, 'pointerup');
    const now = performance.now() + 5000;
    while (queue.length) queue.shift()!(now);
    await p;
    const m = f.getMinutes();
    expect(m).not.toBe(225);
    expect(hands(el)).toEqual({ minute: `rotate(${(m % 60) * 6} 200 200)`, hour: `rotate(${m * 0.5} 200 200)` });
    expect(el.firstElementChild!.getAttribute('data-minutes')).toBe(String(m));
    f.destroy();
    vi.unstubAllGlobals();
  });

  it('zones toggle', () => {
    const el = document.createElement('div');
    const f = createClockFace(el, base);
    f.setZones(false);
    expect((el.querySelector('[data-role="zones"]') as SVGElement).style.opacity).toBe('0');
    f.destroy();
  });
});
