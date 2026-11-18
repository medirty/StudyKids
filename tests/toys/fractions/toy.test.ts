import { describe, it, expect, vi } from 'vitest';
import { fractionsToy, fractionWords, type FractionQuestion } from '../../../src/toys/math/fractions';
import { toysFor } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';

const q = (num: number, den: number): FractionQuestion => ({ id: 'q1', prompt: `Colour ${num}/${den} of the pizza`, num, den, target: num });
const mkCtx = (autoRead = false): ToyContext & { spoken: string[]; ticks: number } => {
  const c = {
    stage: 3 as const, autoRead, spoken: [] as string[], ticks: 0,
    speech: { speak: async (t: string) => { c.spoken.push(t); }, stop() {}, available: true },
    sfx: { tick: () => { c.ticks++; }, success() {}, tryAgain() {} },
    celebrate() {},
  };
  return c;
};
const slices = (el: HTMLElement) => [...el.querySelectorAll<SVGElement>('[data-role="slice"]')];
const coloured = (el: HTMLElement) => slices(el).filter(s => s.dataset.on === 'true').length;
const role = (el: HTMLElement, r: string) => el.querySelector<HTMLElement>(`[data-role="${r}"]`)!;

describe('meta and registry', () => {
  it('has meta', () => {
    expect(fractionsToy.meta.id).toBe('fractions');
    expect(fractionsToy.meta.subject).toBe('math');
    expect(fractionsToy.meta.stages).toEqual([3]);
    expect(fractionsToy.meta.title).toBe('Fraction Pizza');
    expect(fractionsToy.meta.icon).toBe('🍕');
    expect(toysFor('math', 3).map(t => t.meta.id)).toContain('fractions');
    expect(toysFor('math', 1).map(t => t.meta.id)).not.toContain('fractions');
  });
});

describe('fractionWords', () => {
  it('brief examples', () => {
    expect(fractionWords(1, 2)).toBe('one half');
    expect(fractionWords(3, 4)).toBe('three quarters');
    expect(fractionWords(2, 3)).toBe('two thirds');
    expect(fractionWords(5, 8)).toBe('five eighths');
    expect(fractionWords(1, 10)).toBe('one tenth');
  });
  it('plurals', () => {
    expect(fractionWords(2, 2)).toBe('two halves');
    expect(fractionWords(3, 5)).toBe('three fifths');
    expect(fractionWords(5, 6)).toBe('five sixths');
    expect(fractionWords(9, 10)).toBe('nine tenths');
    expect(fractionWords(1, 4)).toBe('one quarter');
    expect(fractionWords(1, 8)).toBe('one eighth');
  });
});

describe('generateQuestions', () => {
  it('valid fractions, prompt, target = num, no repeats back to back', () => {
    const qs = fractionsToy.generateQuestions(3, 200, mulberry32(5));
    expect(qs.length).toBe(200);
    for (const x of qs) {
      expect([2, 3, 4, 5, 6, 8, 10]).toContain(x.den);
      expect(x.num).toBeGreaterThanOrEqual(1);
      expect(x.num).toBeLessThan(x.den);
      expect(x.target).toBe(x.num);
      expect(x.spoken).toBe(`Colour ${fractionWords(x.num, x.den)} of the pizza`);
      expect(x.prompt).toBe(`Colour ${x.num}/${x.den} of the pizza`);
    }
    for (let i = 1; i < qs.length; i++) expect(`${qs[i].num}/${qs[i].den}`).not.toBe(`${qs[i - 1].num}/${qs[i - 1].den}`);
    expect(new Set(qs.map(x => x.id)).size).toBe(200);
    expect(new Set(qs.map(x => x.den)).size).toBe(7);
  });
});

describe('check / describe / explain', () => {
  it('equality', () => { expect(fractionsToy.check(q(3, 4), 3)).toEqual({ correct: true }); });
  it('hint', () => {
    expect(fractionsToy.check(q(3, 4), 2)).toEqual({ correct: false, hint: 'The pizza has 4 equal parts. Colour 3 of them.' });
  });
  it('describe and explain', () => {
    expect(fractionsToy.describeAnswer(q(3, 4), 1)).toBe('1 out of 4 slices coloured');
    expect(fractionsToy.explain(q(3, 4), 2)).toEqual({ why: 'You coloured 2 out of 4.', how: '3/4 means 3 of 4 equal parts.' });
  });
});

describe('explore', () => {
  it('chooser, slices toggle, fraction + words shown', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = fractionsToy.explore(el, ctx);
    expect(slices(el).length).toBe(4);
    const choosers = [...el.querySelectorAll<HTMLElement>('[data-role="parts"]')];
    expect(choosers.map(c => c.dataset.parts)).toEqual(['2', '3', '4', '5', '6', '8', '10']);
    slices(el)[0].dispatchEvent(new Event('click', { bubbles: true }));
    slices(el)[1].dispatchEvent(new Event('click', { bubbles: true }));
    slices(el)[2].dispatchEvent(new Event('click', { bubbles: true }));
    expect(role(el, 'fraction').textContent).toBe('3/4');
    expect(role(el, 'words').textContent).toBe('three quarters');
    slices(el)[2].dispatchEvent(new Event('click', { bubbles: true }));
    expect(role(el, 'fraction').textContent).toBe('2/4');
    expect(ctx.spoken).toEqual([]);
    choosers[5].click();
    expect(slices(el).length).toBe(8);
    expect(coloured(el)).toBe(0);
    expect(role(el, 'fraction').textContent).toBe('0/8');
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('autoRead speaks words; speak button speaks words', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const v = fractionsToy.explore(el, ctx);
    slices(el)[0].dispatchEvent(new Event('click', { bubbles: true }));
    slices(el)[1].dispatchEvent(new Event('click', { bubbles: true }));
    expect(ctx.spoken).toEqual(['one quarter', 'two quarters']);
    role(el, 'speak').click();
    expect(ctx.spoken[2]).toBe('two quarters');
    v.destroy();
  });
});

describe('challenge', () => {
  it('pre-cut, answer = coloured count, reset clears', () => {
    const el = document.createElement('div');
    const v = fractionsToy.renderChallenge(el, q(5, 8), mkCtx());
    expect(slices(el).length).toBe(8);
    expect(v.getAnswer()).toBe(0);
    slices(el)[0].dispatchEvent(new Event('click', { bubbles: true }));
    slices(el)[7].dispatchEvent(new Event('click', { bubbles: true }));
    expect(v.getAnswer()).toBe(2);
    v.reset();
    expect(v.getAnswer()).toBe(0);
    expect(coloured(el)).toBe(0);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('slices are keyboard reachable', () => {
    const el = document.createElement('div');
    const v = fractionsToy.renderChallenge(el, q(1, 2), mkCtx());
    const s = slices(el)[0];
    expect(s.getAttribute('tabindex')).toBe('0');
    s.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(v.getAnswer()).toBe(1);
    v.destroy();
  });
});

describe('demonstrate', () => {
  it('colours slices one by one counting aloud, then says the fraction', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(true);
    const p = fractionsToy.demonstrate!(el, q(3, 4), ctx);
    await vi.advanceTimersByTimeAsync(5000);
    const v = await p;
    expect(coloured(el)).toBe(3);
    expect(ctx.spoken).toEqual(['one quarter', 'two quarters', 'three quarters']);
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
    const p = fractionsToy.demonstrate!(el, q(7, 8), ctx);
    await vi.advanceTimersByTimeAsync(900);
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
    const p = fractionsToy.demonstrate!(el, q(3, 4), ctx);
    await vi.advanceTimersByTimeAsync(20000);
    const v = await p;
    expect(ctx.ticks).toBeGreaterThan(0);
    expect(ctx.spoken).toEqual([]);
    v.destroy();
    el.remove();
    vi.useRealTimers();
  });
});

describe('demonstrate speech for one part', () => {
  it('says "one half" once for 1/2', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(true);
    const p = fractionsToy.demonstrate!(el, q(1, 2), ctx);
    await vi.advanceTimersByTimeAsync(5000);
    const v = await p;
    expect(ctx.spoken).toEqual(['one half']);
    v.destroy();
    el.remove();
    vi.useRealTimers();
  });
});
