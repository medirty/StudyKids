import { describe, it, expect, vi } from 'vitest';
import { count20Toy, type Count20Question } from '../../../src/toys/math/count20';
import { toysFor } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';

const q = (target: number): Count20Question => ({ id: 'q1', prompt: `Show me ${target}`, target });
const mkCtx = (autoRead = false): ToyContext & { spoken: string[]; ticks: number } => {
  const c = {
    stage: 1 as const, autoRead, spoken: [] as string[], ticks: 0,
    speech: { speak: async (t: string) => { c.spoken.push(t); }, stop() {}, available: true },
    sfx: { tick: () => { c.ticks++; }, success() {}, tryAgain() {} },
    celebrate() {},
  };
  return c;
};
const cells = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-role="cell"]')];
const filled = (el: HTMLElement) => cells(el).filter(c => c.dataset.filled === 'true').length;
const big = (el: HTMLElement) => el.querySelector('[data-role="count"]')!.textContent;

describe('meta and registry', () => {
  it('has meta', () => {
    expect(count20Toy.meta.id).toBe('count20');
    expect(count20Toy.meta.subject).toBe('math');
    expect(count20Toy.meta.stages).toEqual([1]);
    expect(count20Toy.meta.title).toBe('Count to 20');
    expect(count20Toy.meta.icon).toBe('🍎');
    expect(toysFor('math', 1).map(t => t.meta.id)).toContain('count20');
    expect(toysFor('math', 3).map(t => t.meta.id)).not.toContain('count20');
  });
});

describe('generateQuestions', () => {
  it('gives targets 1..20 only with prompt', () => {
    const qs = count20Toy.generateQuestions(1, 200, mulberry32(3));
    expect(qs.length).toBe(200);
    for (const x of qs) {
      expect(Number.isInteger(x.target)).toBe(true);
      expect(x.target).toBeGreaterThanOrEqual(1);
      expect(x.target).toBeLessThanOrEqual(20);
      expect(x.prompt).toBe(`Show me ${x.target}`);
    }
    expect(new Set(qs.map(x => x.id)).size).toBe(200);
    expect(new Set(qs.map(x => x.target)).size).toBe(20);
  });
});

describe('check / describe / explain', () => {
  it('equality', () => { expect(count20Toy.check(q(7), 7)).toEqual({ correct: true }); });
  it('hints', () => {
    expect(count20Toy.check(q(7), 5).hint).toBe("That's 5. You need 2 more — count again!");
    expect(count20Toy.check(q(7), 9).hint).toBe("That's 9. You need 2 fewer — count again!");
    expect(count20Toy.check(q(7), 0).hint).toBe("That's 0. You need 7 more — count again!");
  });
  it('describeAnswer', () => {
    expect(count20Toy.describeAnswer(q(7), 5)).toBe('5 apples');
    expect(count20Toy.describeAnswer(q(7), 1)).toBe('1 apple');
  });
  it('explain', () => {
    expect(count20Toy.explain(q(14), 12).why).toBe('You put 12. We needed 14, that is 2 more.');
    expect(count20Toy.explain(q(14), 12).how).toBe('Fill one ten-frame to make 10, then add 4 more.');
    expect(count20Toy.explain(q(5), 8).why).toBe('You put 8. We needed 5, that is 3 fewer.');
    expect(count20Toy.explain(q(5), 8).how).toBe('Put 5 apples, counting 1, 2, 3… up to 5.');
    expect(count20Toy.explain(q(10), 0).how).toBe('Put 10 apples, counting 1, 2, 3… up to 10.');
  });
});

describe('explore', () => {
  it('two frames of 10 cells, tap adds/removes, big number', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = count20Toy.explore(el, ctx);
    expect(cells(el).length).toBe(20);
    expect(big(el)).toBe('0');
    cells(el)[3].click();
    expect(filled(el)).toBe(1);
    expect(big(el)).toBe('1');
    cells(el)[15].click();
    expect(big(el)).toBe('2');
    cells(el)[3].click();
    expect(big(el)).toBe('1');
    expect(ctx.ticks).toBe(3);
    expect(ctx.spoken).toEqual([]);
    v.destroy();
  });
  it('autoRead speaks the count after each tap', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const v = count20Toy.explore(el, ctx);
    cells(el)[0].click();
    cells(el)[1].click();
    cells(el)[0].click();
    expect(ctx.spoken).toEqual(['1', '2', '1']);
    v.destroy();
  });
  it('speak button speaks current count', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = count20Toy.explore(el, ctx);
    cells(el)[0].click();
    (el.querySelector('[data-role="speak"]') as HTMLElement).click();
    expect(ctx.spoken).toEqual(['1']);
    v.destroy();
  });
  it('destroy removes dom', () => {
    const el = document.createElement('div');
    count20Toy.explore(el, mkCtx()).destroy();
    expect(el.children.length).toBe(0);
  });
});

describe('challenge', () => {
  it('starts empty, answer = apples, reset clears', () => {
    const el = document.createElement('div');
    const v = count20Toy.renderChallenge(el, q(6), mkCtx());
    expect(v.getAnswer()).toBe(0);
    cells(el)[0].click(); cells(el)[1].click(); cells(el)[12].click();
    expect(v.getAnswer()).toBe(3);
    v.reset();
    expect(v.getAnswer()).toBe(0);
    expect(filled(el)).toBe(0);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
});

describe('demonstrate', () => {
  it('fills apples one by one speaking each count', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(true);
    const p = count20Toy.demonstrate!(el, q(3), ctx);
    await vi.advanceTimersByTimeAsync(2000);
    const v = await p;
    expect(filled(el)).toBe(3);
    expect(ctx.spoken).toEqual(['1', '2', '3']);
    v.destroy();
    el.remove();
    vi.useRealTimers();
  });
  it('stops cleanly if destroyed midway', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(true);
    const p = count20Toy.demonstrate!(el, q(12), ctx);
    await vi.advanceTimersByTimeAsync(900);
    const spokenSoFar = ctx.spoken.length;
    expect(spokenSoFar).toBeGreaterThan(0);
    expect(spokenSoFar).toBeLessThan(12);
    el.replaceChildren(); // shell clears the stage
    const view = await Promise.race([p, vi.advanceTimersByTimeAsync(10000).then(() => null)]);
    expect(view === null || typeof view.destroy === 'function').toBe(true);
    await vi.advanceTimersByTimeAsync(10000);
    expect(ctx.spoken.length).toBeLessThan(12);
    vi.useRealTimers();
  });
  it.each(['wrapper.remove', 'body.replaceChildren'])('stops speaking and ticking when an ancestor is detached (%s)', async how => {
    vi.useFakeTimers();
    const wrapper = document.createElement('div');
    const el = document.createElement('div');
    wrapper.append(el);
    document.body.append(wrapper);
    const ctx = mkCtx(true);
    const p = count20Toy.demonstrate!(el, q(15), ctx);
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
    const p = count20Toy.demonstrate!(el, q(3), ctx);
    await vi.advanceTimersByTimeAsync(20000);
    const v = await p;
    expect(ctx.ticks).toBeGreaterThan(0);
    expect(ctx.spoken).toEqual([]);
    v.destroy();
    el.remove();
    vi.useRealTimers();
  });
});
