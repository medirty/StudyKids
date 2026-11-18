import { describe, it, expect, vi } from 'vitest';
import { numberLineToy, type NumberLineQuestion } from '../../../src/toys/math/numberLine';
import { toysFor } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';

const q = (a: number, op: '+' | '−', b: number): NumberLineQuestion => {
  const answer = op === '+' ? a + b : a - b;
  return { id: 'q1', prompt: `${a} ${op} ${b} = ?`, a, op, b, answer, target: answer };
};
const mkCtx = (autoRead = false): ToyContext & { spoken: string[]; ticks: number } => {
  const c = {
    stage: 1 as const, autoRead, spoken: [] as string[], ticks: 0,
    speech: { speak: async (t: string) => { c.spoken.push(t); }, stop() {}, available: true },
    sfx: { tick: () => { c.ticks++; }, success() {}, tryAgain() {} },
    celebrate() {},
  };
  return c;
};
const frog = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-role="frog"]')!;
const pos = (el: HTMLElement) => frog(el).dataset.position;
const hop = (el: HTMLElement, label: string) =>
  [...el.querySelectorAll<HTMLElement>('[data-role="hop"]')].find(b => b.textContent === label)!.click();

describe('meta and registry', () => {
  it('has meta', () => {
    expect(numberLineToy.meta.id).toBe('numberLine');
    expect(numberLineToy.meta.subject).toBe('math');
    expect(numberLineToy.meta.stages).toEqual([1]);
    expect(numberLineToy.meta.title).toBe('Number Line Hops');
    expect(numberLineToy.meta.icon).toBe('🐸');
    expect(toysFor('math', 1).map(t => t.meta.id)).toContain('numberLine');
    expect(toysFor('math', 3).map(t => t.meta.id)).not.toContain('numberLine');
  });
});

describe('generateQuestions', () => {
  it('200 questions within bounds', () => {
    const qs = numberLineToy.generateQuestions(1, 200, mulberry32(9));
    expect(qs.length).toBe(200);
    for (const x of qs) {
      for (const n of [x.a, x.b, x.answer]) {
        expect(Number.isInteger(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(20);
      }
      expect(x.b).toBeGreaterThanOrEqual(1);
      expect(x.answer).toBe(x.op === '+' ? x.a + x.b : x.a - x.b);
      expect(x.target).toBe(x.answer);
      expect(x.prompt).toBe(`${x.a} ${x.op} ${x.b} = ?`);
      expect(x.spoken).toBe(`${x.a} ${x.op === '+' ? 'plus' : 'take away'} ${x.b}`);
    }
    expect(new Set(qs.map(x => x.id)).size).toBe(200);
    expect(new Set(qs.map(x => x.op))).toEqual(new Set(['+', '−']));
  });
  it('is deterministic', () => {
    expect(numberLineToy.generateQuestions(1, 20, mulberry32(4))).toEqual(numberLineToy.generateQuestions(1, 20, mulberry32(4)));
  });
});

describe('check / describe / explain', () => {
  it('equality and hints', () => {
    expect(numberLineToy.check(q(7, '+', 5), 12)).toEqual({ correct: true });
    expect(numberLineToy.check(q(7, '+', 5), 11).hint).toBe('Start at 7 and hop 5 forward.');
    expect(numberLineToy.check(q(12, '−', 3), 0).hint).toBe('Start at 12 and hop 3 back.');
  });
  it('describeAnswer', () => { expect(numberLineToy.describeAnswer(q(7, '+', 5), 11)).toBe('11'); });
  it('explain lists every number', () => {
    const e = numberLineToy.explain(q(7, '+', 5), 11);
    expect(e.why).toBe('You landed on 11.');
    expect(e.how).toBe('Start at 7, hop 5 forward: 8, 9, 10, 11, 12… you land on 12.');
    expect(e.how).toContain('8, 9, 10, 11, 12');
    expect(numberLineToy.explain(q(12, '−', 3), 12).how).toBe('Start at 12, hop 3 back: 11, 10, 9… you land on 9.');
  });
});

describe('explore', () => {
  it('frog hops with clamping, speaks when autoRead', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const v = numberLineToy.explore(el, ctx);
    expect(pos(el)).toBe('0');
    hop(el, '−1');
    expect(pos(el)).toBe('0');
    hop(el, '+5'); hop(el, '+1');
    expect(pos(el)).toBe('6');
    for (let i = 0; i < 5; i++) hop(el, '+5');
    expect(pos(el)).toBe('20');
    hop(el, '−5');
    expect(pos(el)).toBe('15');
    expect(el.querySelector('[data-role="count"]')!.textContent).toBe('15');
    expect(ctx.spoken.slice(0, 4)).toEqual(['0', '0', '5', '6']); // start, clamped −1, +5, +1
    expect(ctx.ticks).toBeGreaterThan(0);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('silent without autoRead; speak button speaks', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = numberLineToy.explore(el, ctx);
    hop(el, '+5');
    expect(ctx.spoken).toEqual([]);
    (el.querySelector('[data-role="speak"]') as HTMLElement).click();
    expect(ctx.spoken).toEqual(['5']);
    v.destroy();
  });
  it('renders ticks 0..20 and hop buttons', () => {
    const el = document.createElement('div');
    numberLineToy.explore(el, mkCtx());
    expect(el.querySelectorAll('[data-role="tick"]').length).toBe(21);
    expect(el.querySelectorAll('[data-role="hop"]').length).toBe(4);
  });
});

describe('challenge', () => {
  it('frog starts on a, answer = position, clamps, reset returns to a', () => {
    const el = document.createElement('div');
    const v = numberLineToy.renderChallenge(el, q(7, '+', 5), mkCtx());
    expect(pos(el)).toBe('7');
    expect(v.getAnswer()).toBe(7);
    hop(el, '+5'); hop(el, '+5');
    expect(v.getAnswer()).toBe(17);
    for (let i = 0; i < 4; i++) hop(el, '+5');
    expect(v.getAnswer()).toBe(20);
    v.reset();
    expect(v.getAnswer()).toBe(7);
    expect(pos(el)).toBe('7');
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('never speaks on its own', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    numberLineToy.renderChallenge(el, q(7, '+', 5), ctx);
    hop(el, '+1');
    expect(ctx.spoken).toEqual([]);
  });
});

describe('demonstrate', () => {
  it('hops one by one to the answer speaking each number', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(true);
    const p = numberLineToy.demonstrate!(el, q(7, '+', 3), ctx);
    await vi.advanceTimersByTimeAsync(5000);
    const v = await p;
    expect(pos(el)).toBe('10');
    expect(ctx.spoken).toEqual(['7', '8', '9', '10']);
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
    const p = numberLineToy.demonstrate!(el, q(2, '+', 15), ctx);
    await vi.advanceTimersByTimeAsync(1500);
    const spoken = ctx.spoken.length;
    const ticks = ctx.ticks;
    expect(spoken).toBeGreaterThan(0);
    expect(spoken).toBeLessThan(16);
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
    const p = numberLineToy.demonstrate!(el, q(7, '+', 3), ctx);
    await vi.advanceTimersByTimeAsync(20000);
    const v = await p;
    expect(ctx.ticks).toBeGreaterThan(0);
    expect(ctx.spoken).toEqual([]);
    v.destroy();
    el.remove();
    vi.useRealTimers();
  });
});
