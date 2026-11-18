import { describe, it, expect, vi } from 'vitest';
import { multiplyToy, skipCount, type MultiplyQuestion } from '../../../src/toys/math/multiply';
import { toysFor } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';

const q = (a: number, b: number): MultiplyQuestion => ({ id: 'q1', prompt: `${a} × ${b} = ?`, a, b, answer: a * b, target: a * b });
const mkCtx = (autoRead = false): ToyContext & { spoken: string[]; ticks: number } => {
  const c = {
    stage: 3 as const, autoRead, spoken: [] as string[], ticks: 0,
    speech: { speak: async (t: string) => { c.spoken.push(t); }, stop() {}, available: true },
    sfx: { tick: () => { c.ticks++; }, success() {}, tryAgain() {} },
    celebrate() {},
  };
  return c;
};
const $ = (el: HTMLElement, role: string) => el.querySelector<HTMLElement>(`[data-role="${role}"]`)!;
const dots = (el: HTMLElement) => el.querySelectorAll('[data-role="dot"]').length;
const key = (el: HTMLElement, k: string) => el.querySelector<HTMLElement>(`[data-role="pad-key"][data-key="${k}"]`)!.click();
const text = (el: HTMLElement, role: string) => $(el, role).textContent;

describe('meta and registry', () => {
  it('has meta', () => {
    expect(multiplyToy.meta.id).toBe('multiply');
    expect(multiplyToy.meta.subject).toBe('math');
    expect(multiplyToy.meta.stages).toEqual([3]);
    expect(multiplyToy.meta.title).toBe('Times Tables');
    expect(multiplyToy.meta.icon).toBe('✖️');
    expect(toysFor('math', 3).map(t => t.meta.id)).toContain('multiply');
    expect(toysFor('math', 1).map(t => t.meta.id)).not.toContain('multiply');
  });
});

describe('skipCount', () => {
  it('counts in b, a times', () => {
    expect(skipCount(4, 3)).toEqual([3, 6, 9, 12]);
    expect(skipCount(1, 10)).toEqual([10]);
    expect(skipCount(3, 4)).toEqual([4, 8, 12]);
  });
});

describe('generateQuestions', () => {
  const qs = multiplyToy.generateQuestions(3, 300, mulberry32(5));
  it('has a spoken form without symbols', () => {
    for (const x of qs) expect(x.spoken).toBe(`${x.a} times ${x.b}`);
  });
  it('a in 1..10, b from the set, answer = a*b', () => {
    expect(qs.length).toBe(300);
    for (const x of qs) {
      expect(x.a).toBeGreaterThanOrEqual(1);
      expect(x.a).toBeLessThanOrEqual(10);
      expect([2, 3, 4, 5, 8, 10]).toContain(x.b);
      expect(x.answer).toBe(x.a * x.b);
      expect(x.target).toBe(x.answer);
      expect(x.prompt).toBe(`${x.a} × ${x.b} = ?`);
    }
    expect(new Set(qs.map(x => x.b))).toEqual(new Set([2, 3, 4, 5, 8, 10]));
    expect(new Set(qs.map(x => x.id)).size).toBe(300);
  });
  it('no immediate duplicates', () => {
    for (let i = 1; i < qs.length; i++) expect(`${qs[i].a}x${qs[i].b}`).not.toBe(`${qs[i - 1].a}x${qs[i - 1].b}`);
  });
  it('deterministic', () => {
    expect(multiplyToy.generateQuestions(3, 20, mulberry32(9))).toEqual(multiplyToy.generateQuestions(3, 20, mulberry32(9)));
  });
});

describe('check / describe / explain', () => {
  it('equality', () => { expect(multiplyToy.check(q(4, 3), 12)).toEqual({ correct: true }); });
  it('wrong gives hint', () => {
    expect(multiplyToy.check(q(4, 3), 11)).toEqual({ correct: false, hint: 'Count in 3s, 4 times.' });
  });
  it('null', () => {
    expect(multiplyToy.check(q(4, 3), null)).toEqual({ correct: false, hint: 'Type your answer with the number pad.' });
    expect(multiplyToy.describeAnswer(q(4, 3), null)).toBe('nothing yet');
    expect(multiplyToy.describeAnswer(q(4, 3), 11)).toBe('11');
  });
  it('explain', () => {
    expect(multiplyToy.explain(q(4, 3), 11).why).toBe('4 × 3 is not 11.');
    expect(multiplyToy.explain(q(4, 3), 11).how).toBe('4 groups of 3: 3, 6, 9, 12 → 12.');
    expect(multiplyToy.explain(q(4, 3), null).how).toBe('4 groups of 3: 3, 6, 9, 12 → 12.');
    expect(multiplyToy.explain(q(4, 3), null).why).not.toContain('null');
  });
});

describe('explore', () => {
  it('shows 3 × 4 = 12, dots, skip count; steppers change it', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = multiplyToy.explore(el, ctx);
    expect(text(el, 'equation')).toBe('3 × 4 = 12');
    expect(text(el, 'skip')).toBe('4, 8, 12');
    expect(dots(el)).toBe(12);
    $(el, 'rows-up').click();
    expect(text(el, 'equation')).toBe('4 × 4 = 16');
    expect(text(el, 'skip')).toBe('4, 8, 12, 16');
    expect(dots(el)).toBe(16);
    $(el, 'cols-down').click();
    expect(text(el, 'equation')).toBe('4 × 3 = 12');
    expect(text(el, 'skip')).toBe('3, 6, 9, 12');
    expect(ctx.spoken).toEqual([]);
    expect(ctx.ticks).toBe(2);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('steppers clamp at 1..10', () => {
    const el = document.createElement('div');
    const v = multiplyToy.explore(el, mkCtx());
    for (let i = 0; i < 20; i++) { $(el, 'rows-up').click(); $(el, 'cols-up').click(); }
    expect(text(el, 'equation')).toBe('10 × 10 = 100');
    expect(dots(el)).toBe(100);
    for (let i = 0; i < 20; i++) { $(el, 'rows-down').click(); $(el, 'cols-down').click(); }
    expect(text(el, 'equation')).toBe('1 × 1 = 1');
    expect(dots(el)).toBe(1);
    v.destroy();
  });
  it('speak button says it; autoRead speaks on change only', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = multiplyToy.explore(el, ctx);
    $(el, 'speak').click();
    expect(ctx.spoken).toEqual(['3 times 4 is 12']);
    v.destroy();
    const el2 = document.createElement('div');
    const ctx2 = mkCtx(true);
    const v2 = multiplyToy.explore(el2, ctx2);
    $(el2, 'rows-up').click();
    expect(ctx2.spoken).toEqual(['4 times 4 is 16']);
    v2.destroy();
  });
  it('controls are at least 48px (min-h-12 min-w-12)', () => {
    const el = document.createElement('div');
    const v = multiplyToy.explore(el, mkCtx());
    for (const r of ['rows-up', 'rows-down', 'cols-up', 'cols-down', 'speak']) {
      expect($(el, r).className).toMatch(/min-h-12/);
      expect($(el, r).className).toMatch(/min-w-12/);
    }
    v.destroy();
  });
});

describe('challenge', () => {
  it('number pad builds answer, max 3 digits, backspace, null when empty', () => {
    const el = document.createElement('div');
    const ctx = mkCtx();
    const v = multiplyToy.renderChallenge(el, q(4, 3), ctx);
    expect(el.querySelectorAll('[data-role="pad-key"]').length).toBe(11);
    expect(v.getAnswer()).toBeNull();
    key(el, '1'); key(el, '2');
    expect(v.getAnswer()).toBe(12);
    expect(text(el, 'answer')).toBe('12');
    key(el, '3'); key(el, '4');
    expect(v.getAnswer()).toBe(123);
    key(el, 'back');
    expect(v.getAnswer()).toBe(12);
    key(el, 'back'); key(el, 'back'); key(el, 'back');
    expect(v.getAnswer()).toBeNull();
    key(el, '5');
    v.reset();
    expect(v.getAnswer()).toBeNull();
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('pad keys are >= 48px', () => {
    const el = document.createElement('div');
    const v = multiplyToy.renderChallenge(el, q(4, 3), mkCtx());
    for (const k of el.querySelectorAll<HTMLElement>('[data-role="pad-key"]')) {
      expect(k.className).toMatch(/min-h-12/);
      expect(k.className).toMatch(/min-w-12/);
    }
    v.destroy();
  });
  it('physical keyboard digits/backspace work and listener is removed on destroy', () => {
    const el = document.createElement('div');
    document.body.append(el);
    const v = multiplyToy.renderChallenge(el, q(4, 3), mkCtx());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '7' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    expect(v.getAnswer()).toBe(72);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(v.getAnswer()).toBe(7);
    v.destroy();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '9' }));
    expect(v.getAnswer()).toBe(7);
    el.remove();
  });
  it('show dots toggle is off by default and draws a rows of b', () => {
    const el = document.createElement('div');
    const v = multiplyToy.renderChallenge(el, q(4, 3), mkCtx());
    expect(dots(el)).toBe(0);
    $(el, 'dots-toggle').click();
    expect(dots(el)).toBe(12);
    $(el, 'dots-toggle').click();
    expect(dots(el)).toBe(0);
    v.destroy();
  });
});

describe('dot array fits narrow screens', () => {
  it('10 x 10 grid is width-capped, not fixed pixel wider than 360', () => {
    const el = document.createElement('div');
    const v = multiplyToy.explore(el, mkCtx());
    for (let i = 0; i < 10; i++) { $(el, 'rows-up').click(); $(el, 'cols-up').click(); }
    const grid = $(el, 'dot-grid');
    expect(grid.style.gridTemplateColumns).toMatch(/^repeat\(10, minmax\(0(px)?, 1fr\)\)$/);
    expect(grid.style.width).toContain('min(100%');
    v.destroy();
  });
});

describe('demonstrate', () => {
  it('draws row by row speaking the running skip count, then the answer', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(true);
    const p = multiplyToy.demonstrate!(el, q(4, 3), ctx);
    await vi.advanceTimersByTimeAsync(600);
    expect(dots(el)).toBe(3);
    await vi.advanceTimersByTimeAsync(5000);
    const v = await p;
    expect(dots(el)).toBe(12);
    expect(ctx.spoken.slice(0, 4)).toEqual(['3', '6', '9', '12']);
    expect(ctx.spoken[ctx.spoken.length - 1]).toBe('4 times 3 is 12');
    expect(text(el, 'equation')).toBe('4 × 3 = 12');
    expect(vi.getTimerCount()).toBe(0);
    v.destroy();
    el.remove();
    vi.useRealTimers();
  });
  it('stops cleanly if destroyed midway', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(true);
    const p = multiplyToy.demonstrate!(el, q(10, 8), ctx);
    await vi.advanceTimersByTimeAsync(1200);
    expect(ctx.spoken.length).toBeGreaterThan(0);
    el.replaceChildren();
    await vi.advanceTimersByTimeAsync(10000);
    const view = await p;
    expect(ctx.spoken.length).toBeLessThan(5);
    expect(vi.getTimerCount()).toBe(0);
    view.destroy();
    vi.useRealTimers();
  });
  it.each(['wrapper.remove', 'body.replaceChildren'])('stops speaking and ticking when an ancestor is detached (%s)', async how => {
    vi.useFakeTimers();
    const wrapper = document.createElement('div');
    const el = document.createElement('div');
    wrapper.append(el);
    document.body.append(wrapper);
    const ctx = mkCtx(true);
    const p = multiplyToy.demonstrate!(el, q(10, 5), ctx);
    await vi.advanceTimersByTimeAsync(1200);
    const spoken = ctx.spoken.length;
    const ticks = ctx.ticks;
    expect(spoken).toBeGreaterThan(0);
    if (how === 'wrapper.remove') wrapper.remove(); else document.body.replaceChildren();
    await vi.advanceTimersByTimeAsync(10000);
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
    const p = multiplyToy.demonstrate!(el, q(4, 3), ctx);
    await vi.advanceTimersByTimeAsync(20000);
    const v = await p;
    expect(ctx.ticks).toBeGreaterThan(0);
    expect(ctx.spoken).toEqual([]);
    v.destroy();
    el.remove();
    vi.useRealTimers();
  });
});
