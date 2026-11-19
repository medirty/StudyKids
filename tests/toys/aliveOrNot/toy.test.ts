import { describe, it, expect, vi } from 'vitest';
import { aliveOrNotToy } from '../../../src/toys/science/aliveOrNot';
import { LIVING_ITEMS, LIVING_FACTS, livingTarget } from '../../../src/content/science/living';
import { toysFor, findToy } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';
import { sortHelpers } from '../sortHelpers';

const mkCtx = (autoRead = false): ToyContext & { spoken: string[] } => {
  const c = {
    stage: 1 as const, autoRead, spoken: [] as string[],
    speech: { speak: async (t: string) => { c.spoken.push(t); }, stop() {}, available: true },
    sfx: { tick() {}, success() {}, tryAgain() {} },
    celebrate: vi.fn(),
  };
  return c;
};
const q = (item = 'dog') => ({ id: 'q1', prompt: `Where does the ${item} go?`, item, target: livingTarget(LIVING_ITEMS.find(i => i.name === item)!) });

describe('content and meta', () => {
  it('has 12 living and 12 non-living items, with unique names and emoji', () => {
    expect(LIVING_ITEMS.filter(i => i.living).length).toBe(12);
    expect(LIVING_ITEMS.filter(i => !i.living).length).toBe(12);
    expect(new Set(LIVING_ITEMS.map(i => i.name)).size).toBe(24);
    expect(new Set(LIVING_ITEMS.map(i => i.emoji)).size).toBe(24);
    for (const i of LIVING_ITEMS) expect(i.emoji.length).toBeGreaterThan(0);
  });
  it('classes the unambiguous cases correctly', () => {
    const t = (n: string) => livingTarget(LIVING_ITEMS.find(i => i.name === n)!);
    for (const n of ['dog', 'tree', 'flower', 'fish', 'bird', 'person', 'mushroom', 'cat', 'bee', 'frog', 'cactus', 'butterfly']) expect(t(n), n).toBe('living');
    for (const n of ['rock', 'car', 'chair', 'cup', 'ball', 'phone', 'book', 'shoe', 'water', 'cloud', 'sun', 'toy robot']) expect(t(n), n).toBe('nonliving');
  });
  it('states the living fact verbatim', () => {
    expect(LIVING_FACTS.living).toBe('Living things grow, need food and water, and can have babies.');
  });
  it('is registered for grade 1 science only', () => {
    const m = aliveOrNotToy.meta;
    expect([m.id, m.subject, m.stages, m.title, m.icon]).toEqual(['aliveOrNot', 'science', [1], 'Alive or Not?', '🌱']);
    expect(toysFor('science', 1).map(t => t.meta.id)).toContain('aliveOrNot');
    expect(toysFor('science', 3).map(t => t.meta.id)).not.toContain('aliveOrNot');
    expect(findToy('aliveOrNot')).toBe(aliveOrNotToy);
  });
});

describe('generateQuestions', () => {
  it('200 questions: prompt, target, no back-to-back repeat, unique ids, both bins used', () => {
    const qs = aliveOrNotToy.generateQuestions(1, 200, mulberry32(3));
    expect(qs.length).toBe(200);
    qs.forEach((x, i) => {
      const item = LIVING_ITEMS.find(m => m.name === x.item)!;
      expect(item).toBeTruthy();
      expect(x.prompt).toBe(`Where does the ${x.item} go?`);
      expect(x.target).toBe(livingTarget(item));
      if (i > 0) expect(x.item).not.toBe(qs[i - 1].item);
    });
    expect(new Set(qs.map(x => x.id)).size).toBe(200);
    expect(new Set(qs.map(x => x.target))).toEqual(new Set(['living', 'nonliving']));
  });
  it('returns the requested count for 0 and 1', () => {
    expect(aliveOrNotToy.generateQuestions(1, 0, mulberry32(1)).length).toBe(0);
    expect(aliveOrNotToy.generateQuestions(1, 1, mulberry32(1)).length).toBe(1);
  });
});

describe('check / describe / explain', () => {
  it('accepts the right bin, hints with the rule otherwise', () => {
    expect(aliveOrNotToy.check(q('dog'), 'living')).toEqual({ correct: true });
    expect(aliveOrNotToy.check(q('dog'), 'nonliving')).toEqual({ correct: false, hint: LIVING_FACTS.living });
    expect(aliveOrNotToy.check(q('sun'), 'living')).toEqual({ correct: false, hint: LIVING_FACTS.nonliving });
    expect(aliveOrNotToy.check(q('sun'), null).correct).toBe(false);
    expect(aliveOrNotToy.check(q('sun'), null).hint).toMatch(/bin first/);
  });
  it('describeAnswer', () => {
    expect(aliveOrNotToy.describeAnswer(q('dog'), 'nonliving')).toBe('You put the dog in Not living');
    expect(aliveOrNotToy.describeAnswer(q('dog'), null)).toBe('You did not choose a bin yet');
  });
  it('explain says the verdict and the fact', () => {
    expect(aliveOrNotToy.explain(q('dog'), 'nonliving')).toEqual({
      why: 'You put the dog in Not living.',
      how: 'The dog is living: Living things grow, need food and water, and can have babies.',
    });
    expect(aliveOrNotToy.explain(q('toy robot'), null).how).toBe(`The toy robot is not living: ${LIVING_FACTS.nonliving}`);
  });
});

describe('explore', () => {
  const H = sortHelpers;
  it('shows 4 living + 4 non-living items and two bins', () => {
    const el = document.createElement('div');
    const v = aliveOrNotToy.explore(el, mkCtx());
    const names = H.items(el).map(i => i.dataset.id!);
    expect(names.length).toBe(8);
    expect(names.filter(n => LIVING_ITEMS.find(i => i.name === n)!.living).length).toBe(4);
    expect(H.bins(el).map(b => b.textContent)).toEqual(['🌱 Living', '⚙️ Not living']);
    v.destroy();
  });
  it('gives the fact on a right drop and a gentle nudge on a wrong one', () => {
    const el = document.createElement('div');
    const v = aliveOrNotToy.explore(el, mkCtx());
    const name = H.items(el)[0].dataset.id!;
    const item = LIVING_ITEMS.find(i => i.name === name)!;
    const right = livingTarget(item);
    const other = right === 'living' ? 'nonliving' : 'living';
    H.drop(el, name, other);
    expect(H.feedback(el)).toMatch(/try/i);
    expect(H.feedback(el)).not.toMatch(/wrong/i);
    H.drop(el, name, right);
    expect(H.feedback(el)).toContain(`The ${name} is ${item.living ? 'living' : 'not living'}`);
    expect(H.feedback(el)).toContain(LIVING_FACTS[right]);
    v.destroy();
  });
  it('celebrates once when all are right; "New things" deals again', () => {
    const el = document.createElement('div');
    const ctx = mkCtx();
    const v = aliveOrNotToy.explore(el, ctx);
    for (const i of H.items(el)) H.drop(el, i.dataset.id!, livingTarget(LIVING_ITEMS.find(m => m.name === i.dataset.id)!));
    expect(ctx.celebrate).toHaveBeenCalledTimes(1);
    expect(H.feedback(el)).toMatch(/sorted/i);
    el.querySelector<HTMLElement>('[data-role="again"]')!.click();
    expect(H.items(el).length).toBe(8);
    expect(H.feedback(el)).not.toMatch(/sorted/i);
    v.destroy();
  });
  it('tapping an item speaks its name; nothing speaks by itself', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = aliveOrNotToy.explore(el, ctx);
    expect(ctx.spoken).toEqual([]);
    const n = H.items(el)[0].dataset.id!;
    H.items(el)[0].click();
    expect(ctx.spoken).toEqual([n]);
    v.destroy();
  });
});

const rightOf = (n: string): string => livingTarget(LIVING_ITEMS.find(m => m.name === n)!);
const otherOf = (n: string): string => (rightOf(n) === 'living' ? 'nonliving' : 'living');
const H = sortHelpers;

describe('explore speech and celebration', () => {
  it('autoRead speaks the verdict and fact after a drop; off stays silent except taps', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const v = aliveOrNotToy.explore(el, ctx);
    const name = H.items(el)[0].dataset.id!;
        H.drop(el, name, rightOf(name));
    expect(ctx.spoken.at(-1)).toMatch(new RegExp(`^Yes! The ${name} is `));
    expect(ctx.spoken.at(-1)).toContain('.');
    H.drop(el, name, otherOf(name));
    expect(ctx.spoken.at(-1)).toMatch(/Try another bin/);
    v.destroy();
    const quiet = mkCtx(false);
    const el2 = document.createElement('div');
    const v2 = aliveOrNotToy.explore(el2, quiet);
    const n2 = H.items(el2)[0].dataset.id!;
    H.drop(el2, n2, rightOf(n2));
    expect(quiet.spoken).toEqual([n2]); // only the explicit item tap
    v2.destroy();
  });
  it('tapping a bin header speaks its name, places nothing without a selection, and keeps tap-then-bin working', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = aliveOrNotToy.explore(el, ctx);
    const bin = H.bins(el)[0];
    const label = bin.getAttribute('aria-label')!;
    (bin.firstElementChild as HTMLElement).click();
    expect(ctx.spoken).toEqual([label]);
    expect(el.querySelectorAll('[data-state]').length).toBe(0);
    expect(H.items(el).length).toBe(H.items(el).filter(i => !bin.contains(i)).length);
    const name = H.items(el)[0].dataset.id!;
    H.items(el)[0].click();
    (bin.firstElementChild as HTMLElement).click(); // header tap with a selection places it
    expect(bin.contains(H.items(el).find(i => i.dataset.id === name)!)).toBe(true);
    expect(ctx.spoken).toEqual([label, name, label]);
    v.destroy();
  });
  it('celebrates only once per deal, even if a sorted item is moved and re-dropped', () => {
    const el = document.createElement('div');
    const ctx = mkCtx();
    const v = aliveOrNotToy.explore(el, ctx);
    const items = H.items(el).map(i => i.dataset.id!);
    for (const name of items) H.drop(el, name, rightOf(name));
    expect(ctx.celebrate).toHaveBeenCalledTimes(1);
    const last = items[0];
    H.drop(el, last, otherOf(last));
    H.drop(el, last, rightOf(last));
    expect(ctx.celebrate).toHaveBeenCalledTimes(1);
    el.querySelector<HTMLElement>('[data-role="again"]')!.click();
    for (const i of H.items(el)) H.drop(el, i.dataset.id!, rightOf(i.dataset.id!));
    expect(ctx.celebrate).toHaveBeenCalledTimes(2);
    v.destroy();
  });
});

describe('challenge UI', () => {
  const H = sortHelpers;
  it('one item, two bins; tap then tap answers; reset clears; tapping speaks the name', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = aliveOrNotToy.renderChallenge(el, q('sun'), ctx);
    expect(ctx.spoken).toEqual([]);
    expect(H.items(el).map(i => i.dataset.id)).toEqual(['sun']);
    expect(H.bins(el).length).toBe(2);
    expect(v.getAnswer()).toBeNull();
    H.drop(el, 'sun', 'nonliving');
    expect(v.getAnswer()).toBe('nonliving');
    expect(ctx.spoken).toEqual(['sun']);
    H.drop(el, 'sun', 'living'); // change of mind
    expect(v.getAnswer()).toBe('living');
    v.reset();
    expect(v.getAnswer()).toBeNull();
    v.destroy();
    expect(el.children.length).toBe(0);
  });
});

describe('demonstrate', () => {
  it('highlights the right bin after a beat; speaks only with autoRead', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const quiet = mkCtx(false);
    const p1 = aliveOrNotToy.demonstrate!(el, q('dog'), quiet);
    expect(el.querySelector('[data-target="true"]')).toBeNull();
    await vi.advanceTimersByTimeAsync(5000);
    const v1 = await p1;
    expect(el.querySelector<HTMLElement>('[data-target="true"]')!.dataset.id).toBe('living');
    expect(quiet.spoken).toEqual([]);
    v1.destroy();
    const loud = mkCtx(true);
    const p2 = aliveOrNotToy.demonstrate!(el, q('dog'), loud);
    await vi.advanceTimersByTimeAsync(5000);
    (await p2).destroy();
    expect(loud.spoken).toEqual(['It goes in Living.']); // the shell has just said the explanation
    el.remove();
    vi.useRealTimers();
  });
  it('does not speak when an ancestor was detached, and leaves no timers', async () => {
    vi.useFakeTimers();
    const wrapper = document.createElement('div');
    const el = document.createElement('div');
    wrapper.append(el);
    document.body.append(wrapper);
    const ctx = mkCtx(true);
    const p = aliveOrNotToy.demonstrate!(el, q('dog'), ctx);
    wrapper.remove();
    await vi.advanceTimersByTimeAsync(10000);
    const view = await p;
    expect(ctx.spoken).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    view.destroy();
    vi.useRealTimers();
  });
});
