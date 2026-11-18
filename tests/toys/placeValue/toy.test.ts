import { describe, it, expect, vi } from 'vitest';
import { placeValueToy, type PlaceValueQuestion } from '../../../src/toys/math/placeValue';
import { toysFor } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';

const q = (target: number): PlaceValueQuestion => ({ id: 'q1', prompt: `Make ${target}`, target });
const mkCtx = (autoRead = false): ToyContext & { spoken: string[]; ticks: number } => {
  const c = {
    stage: 3 as const, autoRead, spoken: [] as string[], ticks: 0,
    speech: { speak: async (t: string) => { c.spoken.push(t); }, stop() {}, available: true },
    sfx: { tick: () => { c.ticks++; }, success() {}, tryAgain() {} },
    celebrate() {},
  };
  return c;
};
const btn = (el: HTMLElement, r: 'pv-plus' | 'pv-minus', col: string) =>
  el.querySelector<HTMLButtonElement>(`[data-role="${r}"][data-col="${col}"]`)!;
const plus = (el: HTMLElement, col: string, n = 1) => { for (let i = 0; i < n; i++) btn(el, 'pv-plus', col).click(); };
const blocks = (el: HTMLElement, col: string) => el.querySelectorAll(`[data-role="pv-block"][data-col="${col}"]`).length;
const role = (el: HTMLElement, r: string) => el.querySelector<HTMLElement>(`[data-role="${r}"]`)!;

describe('meta and registry', () => {
  it('has meta', () => {
    expect(placeValueToy.meta.id).toBe('placeValue');
    expect(placeValueToy.meta.subject).toBe('math');
    expect(placeValueToy.meta.stages).toEqual([3]);
    expect(placeValueToy.meta.title).toBe('Place Value Blocks');
    expect(placeValueToy.meta.icon).toBe('🧱');
    expect(toysFor('math', 3).map(t => t.meta.id)).toContain('placeValue');
    expect(toysFor('math', 1).map(t => t.meta.id)).not.toContain('placeValue');
  });
});

describe('generateQuestions', () => {
  it('targets 100..999, prompt, unique ids, no back-to-back repeats', () => {
    const qs = placeValueToy.generateQuestions(3, 300, mulberry32(9));
    expect(qs.length).toBe(300);
    for (const x of qs) {
      expect(Number.isInteger(x.target)).toBe(true);
      expect(x.target).toBeGreaterThanOrEqual(100);
      expect(x.target).toBeLessThanOrEqual(999);
      expect(x.prompt).toBe(`Make ${x.target}`);
    }
    for (let i = 1; i < qs.length; i++) expect(qs[i].target).not.toBe(qs[i - 1].target);
    expect(new Set(qs.map(x => x.id)).size).toBe(300);
  });
});

describe('check / describe / explain', () => {
  it('compares value', () => {
    expect(placeValueToy.check(q(356), { h: 3, t: 5, o: 6 })).toEqual({ correct: true });
  });
  it('hint names first wrong column, hundreds then tens then ones', () => {
    expect(placeValueToy.check(q(356), { h: 2, t: 5, o: 6 }).hint).toBe('Check your hundreds.');
    expect(placeValueToy.check(q(356), { h: 2, t: 0, o: 0 }).hint).toBe('Check your hundreds.');
    expect(placeValueToy.check(q(356), { h: 3, t: 4, o: 6 }).hint).toBe('Check your tens.');
    expect(placeValueToy.check(q(356), { h: 3, t: 5, o: 9 }).hint).toBe('Check your ones.');
    expect(placeValueToy.check(q(305), { h: 3, t: 5, o: 5 })).toEqual({ correct: false, hint: 'Check your tens.' });
  });
  it('describe and explain', () => {
    expect(placeValueToy.describeAnswer(q(356), { h: 2, t: 5, o: 6 })).toBe('256');
    expect(placeValueToy.explain(q(356), { h: 2, t: 5, o: 6 })).toEqual({
      why: 'You made 256.', how: '356 = 3 hundreds, 5 tens and 6 ones.',
    });
    expect(placeValueToy.explain(q(111), { h: 0, t: 0, o: 0 }).how).toBe('111 = 1 hundred, 1 ten and 1 one.');
    expect(placeValueToy.explain(q(305), { h: 0, t: 0, o: 0 }).how).toBe('305 = 3 hundreds, 0 tens and 5 ones.');
  });
});

describe('explore', () => {
  it('+/- per column draw blocks, clamp 0..9, show number and words', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = placeValueToy.explore(el, ctx);
    expect(role(el, 'pv-value').textContent).toBe('0');
    plus(el, 'h', 3); plus(el, 't', 5); plus(el, 'o', 6);
    expect(blocks(el, 'h')).toBe(3);
    expect(blocks(el, 't')).toBe(5);
    expect(blocks(el, 'o')).toBe(6);
    expect(role(el, 'pv-value').textContent).toBe('356');
    expect(role(el, 'pv-words').textContent).toBe('three hundred and fifty-six');
    btn(el, 'pv-minus', 'o').click();
    expect(role(el, 'pv-value').textContent).toBe('355');
    plus(el, 'h', 20);
    expect(blocks(el, 'h')).toBe(9);
    expect(role(el, 'pv-value').textContent).toBe('955');
    btn(el, 'pv-minus', 'h').click(); btn(el, 'pv-minus', 'h').click();
    for (let i = 0; i < 12; i++) btn(el, 'pv-minus', 't').click();
    expect(blocks(el, 't')).toBe(0);
    expect(ctx.spoken).toEqual([]);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('autoRead speaks the words after each change; speak button too', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const v = placeValueToy.explore(el, ctx);
    plus(el, 'h', 1); plus(el, 'o', 1);
    expect(ctx.spoken).toEqual(['one hundred', 'one hundred and one']);
    role(el, 'speak').click();
    expect(ctx.spoken[2]).toBe('one hundred and one');
    v.destroy();
  });
  it('buttons are at least 48px by class', () => {
    const el = document.createElement('div');
    const v = placeValueToy.explore(el, mkCtx());
    for (const col of ['h', 't', 'o']) {
      expect(btn(el, 'pv-plus', col).className).toContain('min-h-12');
      expect(btn(el, 'pv-minus', col).className).toContain('min-w-12');
    }
    v.destroy();
  });
});

describe('challenge', () => {
  it('answer is {h,t,o}, reset clears', () => {
    const el = document.createElement('div');
    const v = placeValueToy.renderChallenge(el, q(356), mkCtx());
    expect(v.getAnswer()).toEqual({ h: 0, t: 0, o: 0 });
    plus(el, 'h', 2); plus(el, 'o', 4);
    expect(v.getAnswer()).toEqual({ h: 2, t: 0, o: 4 });
    expect(role(el, 'pv-value').textContent).toBe('204');
    v.reset();
    expect(v.getAnswer()).toEqual({ h: 0, t: 0, o: 0 });
    expect(blocks(el, 'h')).toBe(0);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
});

describe('demonstrate', () => {
  it('adds hundreds, then tens, then ones, speaking the running value', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(true);
    const p = placeValueToy.demonstrate!(el, q(203), ctx);
    await vi.advanceTimersByTimeAsync(10000);
    const v = await p;
    expect(blocks(el, 'h')).toBe(2);
    expect(blocks(el, 't')).toBe(0);
    expect(blocks(el, 'o')).toBe(3);
    expect(ctx.spoken).toEqual(['one hundred', 'two hundred', 'two hundred and one', 'two hundred and two', 'two hundred and three']);
    v.destroy();
    el.remove();
    vi.useRealTimers();
  });
  it.each(['wrapper.remove', 'body.replaceChildren'])('stops when an ancestor is detached (%s)', async how => {
    vi.useFakeTimers();
    const wrapper = document.createElement('div');
    const el = document.createElement('div');
    wrapper.append(el);
    document.body.append(wrapper);
    const ctx = mkCtx(true);
    const p = placeValueToy.demonstrate!(el, q(999), ctx);
    await vi.advanceTimersByTimeAsync(1500);
    const spoken = ctx.spoken.length;
    const ticks = ctx.ticks;
    expect(spoken).toBeGreaterThan(0);
    if (how === 'wrapper.remove') wrapper.remove(); else document.body.replaceChildren();
    await vi.advanceTimersByTimeAsync(20000);
    const view = await p;
    expect(ctx.spoken.length).toBe(spoken);
    expect(ctx.ticks).toBe(ticks);
    expect(vi.getTimerCount()).toBe(0);
    view.destroy();
    vi.useRealTimers();
  });
});

describe('demonstrate without autoRead (R13)', () => {
  it('animates silently when autoRead is off', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(false);
    const p = placeValueToy.demonstrate!(el, q(203), ctx);
    await vi.advanceTimersByTimeAsync(20000);
    const v = await p;
    expect(ctx.ticks).toBeGreaterThan(0);
    expect(ctx.spoken).toEqual([]);
    v.destroy();
    el.remove();
    vi.useRealTimers();
  });
});
