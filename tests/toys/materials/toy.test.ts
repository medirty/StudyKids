import { describe, it, expect, vi } from 'vitest';
import { materialsToy } from '../../../src/toys/science/materials';
import { MATERIALS, MATERIAL_ITEMS, materialById } from '../../../src/content/science/materials';
import { toysFor, findToy } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';
import { sortHelpers as H } from '../sortHelpers';

const mkCtx = (autoRead = false): ToyContext & { spoken: string[] } => {
  const c = {
    stage: 1 as const, autoRead, spoken: [] as string[],
    speech: { speak: async (t: string) => { c.spoken.push(t); }, stop() {}, available: true },
    sfx: { tick() {}, success() {}, tryAgain() {} },
    celebrate: vi.fn(),
  };
  return c;
};
const matOf = (n: string) => MATERIAL_ITEMS.find(i => i.name === n)!.material;
const q = (item = 'chair') => ({ id: 'q1', prompt: `What is the ${item} made of?`, item, target: matOf(item) });

describe('content and meta', () => {
  it('has six materials, each with at least 3 items; every item has exactly one material', () => {
    expect(MATERIALS.map(m => m.id)).toEqual(['wood', 'plastic', 'metal', 'glass', 'fabric', 'paper']);
    for (const m of MATERIALS) expect(MATERIAL_ITEMS.filter(i => i.material === m.id).length, m.id).toBeGreaterThanOrEqual(3);
    expect(new Set(MATERIAL_ITEMS.map(i => i.name)).size).toBe(MATERIAL_ITEMS.length); // a name never maps to two materials
    expect(new Set(MATERIAL_ITEMS.map(i => i.emoji)).size).toBe(MATERIAL_ITEMS.length);
    for (const i of MATERIAL_ITEMS) expect(MATERIALS.map(m => m.id)).toContain(i.material);
  });
  it('bin pictures never reuse an item picture', () => {
    const emoji = new Set(MATERIAL_ITEMS.map(i => i.emoji));
    for (const m of MATERIALS) expect(emoji.has(m.emoji), m.id).toBe(false);
  });
  it('item names do not give the material away', () => {
    for (const i of MATERIAL_ITEMS.filter(i => i.name !== 'newspaper')) for (const m of MATERIALS) expect(i.name.toLowerCase()).not.toContain(m.id);
  });
  it('lists the brief items under the right material', () => {
    const expected: Record<string, string[]> = {
      wood: ['chair', 'pencil'], plastic: ['squeezy bottle', 'beach bucket'], metal: ['key', 'coin', 'fork'],
      glass: ['window', 'jar'], fabric: ['T-shirt', 'sock', 'scarf'], paper: ['book', 'newspaper', 'envelope'],
    };
    for (const [m, names] of Object.entries(expected)) for (const n of names) expect(matOf(n), n).toBe(m);
  });
  it('properties are right: only glass is see-through; wood/metal/glass hard and not bendy; fabric/paper soft and bendy', () => {
    expect(MATERIALS.filter(m => m.seeThrough).map(m => m.id)).toEqual(['glass']);
    for (const id of ['wood', 'metal', 'glass'] as const) {
      expect([materialById(id).hard, materialById(id).bendy]).toEqual([true, false]);
    }
    for (const id of ['fabric', 'paper'] as const) {
      expect([materialById(id).hard, materialById(id).bendy]).toEqual([false, true]);
    }
    expect(materialById('plastic').bendy).toBe(true);
  });
  it('each fact agrees with its properties', () => {
    for (const m of MATERIALS) {
      expect(/see through it/.test(m.fact) && !/cannot see through/.test(m.fact), m.id).toBe(m.seeThrough);
      expect(/\bhard\b/.test(m.fact), m.id).toBe(m.hard);
      expect(/\bsoft\b/.test(m.fact), m.id).toBe(!m.hard && m.id !== 'paper'); // paper is described as thin, light and bendy
      expect(/\bbend/.test(m.fact), m.id).toBe(true);
    }
    expect(materialById('wood').fact).toMatch(/does not bend/);
    expect(materialById('metal').fact).toMatch(/does not bend/);
    expect(materialById('fabric').fact).toMatch(/soft and bendy/);
  });
  it('is registered for grade 1 science only', () => {
    const m = materialsToy.meta;
    expect([m.id, m.subject, m.stages, m.title, m.icon]).toEqual(['materials', 'science', [1], 'Material Sorter', '🧱']);
    expect(toysFor('science', 1).map(t => t.meta.id)).toContain('materials');
    expect(toysFor('science', 3).map(t => t.meta.id)).not.toContain('materials');
    expect(findToy('materials')).toBe(materialsToy);
  });
});

describe('generateQuestions', () => {
  it('200 questions: prompt, target, no back-to-back repeat, every material used', () => {
    const qs = materialsToy.generateQuestions(1, 200, mulberry32(5));
    expect(qs.length).toBe(200);
    qs.forEach((x, i) => {
      expect(x.prompt).toBe(`What is the ${x.item} made of?`);
      expect(x.target).toBe(matOf(x.item));
      if (i > 0) expect(x.item).not.toBe(qs[i - 1].item);
    });
    expect(new Set(qs.map(x => x.id)).size).toBe(200);
    expect(new Set(qs.map(x => x.target)).size).toBe(6);
  });
  it('returns the requested count for 0 and 1', () => {
    expect(materialsToy.generateQuestions(1, 0, mulberry32(1)).length).toBe(0);
    expect(materialsToy.generateQuestions(1, 1, mulberry32(1)).length).toBe(1);
  });
});

describe('check / describe / explain', () => {
  it('accepts the right bin, hints with the material fact otherwise', () => {
    expect(materialsToy.check(q('key'), 'metal')).toEqual({ correct: true });
    expect(materialsToy.check(q('key'), 'wood')).toEqual({ correct: false, hint: materialById('metal').fact });
    expect(materialsToy.check(q('key'), null).hint).toMatch(/bin first/);
  });
  it('describeAnswer and explain', () => {
    expect(materialsToy.describeAnswer(q('sock'), 'paper')).toBe('You put the sock in Paper');
    expect(materialsToy.explain(q('sock'), 'paper')).toEqual({
      why: 'You put the sock in Paper.',
      how: `The sock is made of fabric: ${materialById('fabric').fact}`,
    });
    expect(materialsToy.explain(q('jar'), null).how).toBe(`The jar is made of glass: ${materialById('glass').fact}`);
  });
});

describe('explore', () => {
  it('shows 12 items (2 per material) and six bins', () => {
    const el = document.createElement('div');
    const v = materialsToy.explore(el, mkCtx());
    const names = H.items(el).map(i => i.dataset.id!);
    expect(names.length).toBe(12);
    for (const m of MATERIALS) expect(names.filter(n => matOf(n) === m.id).length).toBe(2);
    expect(H.bins(el).map(b => b.dataset.id)).toEqual(MATERIALS.map(m => m.id));
    v.destroy();
  });
  it('gives the property fact on a right drop, a gentle nudge otherwise; celebrates when all sorted', () => {
    const el = document.createElement('div');
    const ctx = mkCtx();
    const v = materialsToy.explore(el, ctx);
    const name = H.items(el)[0].dataset.id!;
    const right = matOf(name);
    H.drop(el, name, MATERIALS.find(m => m.id !== right)!.id);
    expect(H.feedback(el)).toMatch(/try/i);
    expect(H.feedback(el)).not.toMatch(/wrong/i);
    H.drop(el, name, right);
    expect(H.feedback(el)).toContain(`The ${name} is made of ${right}`);
    expect(H.feedback(el)).toContain(materialById(right).fact);
    for (const i of H.items(el)) H.drop(el, i.dataset.id!, matOf(i.dataset.id!));
    expect(ctx.celebrate).toHaveBeenCalledTimes(1);
    expect(H.feedback(el)).toMatch(/sorted/i);
    v.destroy();
  });
  it('tapping an item speaks its name; nothing speaks by itself', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = materialsToy.explore(el, ctx);
    expect(ctx.spoken).toEqual([]);
    const n = H.items(el)[0].dataset.id!;
    H.items(el)[0].click();
    expect(ctx.spoken).toEqual([n]);
    v.destroy();
  });
});

const rightOf = (n: string): string => matOf(n);
const otherOf = (n: string): string => MATERIALS.find(m => m.id !== rightOf(n))!.id;

describe('explore speech and celebration', () => {
  it('autoRead speaks the verdict and fact after a drop; off stays silent except taps', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const v = materialsToy.explore(el, ctx);
    const name = H.items(el)[0].dataset.id!;
        H.drop(el, name, rightOf(name));
    expect(ctx.spoken.at(-1)).toMatch(new RegExp(`^Yes! The ${name} is `));
    expect(ctx.spoken.at(-1)).toContain('.');
    H.drop(el, name, otherOf(name));
    expect(ctx.spoken.at(-1)).toMatch(/Try another bin/);
    v.destroy();
    const quiet = mkCtx(false);
    const el2 = document.createElement('div');
    const v2 = materialsToy.explore(el2, quiet);
    const n2 = H.items(el2)[0].dataset.id!;
    H.drop(el2, n2, rightOf(n2));
    expect(quiet.spoken).toEqual([n2]); // only the explicit item tap
    v2.destroy();
  });
  it('tapping a bin header speaks its name, places nothing without a selection, and keeps tap-then-bin working', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = materialsToy.explore(el, ctx);
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
    const v = materialsToy.explore(el, ctx);
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
  it('one item and six bins; tap then tap answers; reset clears', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = materialsToy.renderChallenge(el, q('scarf'), ctx);
    expect(H.items(el).map(i => i.dataset.id)).toEqual(['scarf']);
    expect(H.bins(el).length).toBe(6);
    expect(v.getAnswer()).toBeNull();
    H.drop(el, 'scarf', 'fabric');
    expect(v.getAnswer()).toBe('fabric');
    v.reset();
    expect(v.getAnswer()).toBeNull();
    v.destroy();
    expect(el.children.length).toBe(0);
  });
});

describe('demonstrate', () => {
  it('highlights the right bin after a beat; speaks only with autoRead; no timers after detach', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const quiet = mkCtx(false);
    const p1 = materialsToy.demonstrate!(el, q('window'), quiet);
    await vi.advanceTimersByTimeAsync(5000);
    const v1 = await p1;
    expect(el.querySelector<HTMLElement>('[data-target="true"]')!.dataset.id).toBe('glass');
    expect(quiet.spoken).toEqual([]);
    v1.destroy();
    const loud = mkCtx(true);
    const p2 = materialsToy.demonstrate!(el, q('window'), loud);
    await vi.advanceTimersByTimeAsync(5000);
    (await p2).destroy();
    expect(loud.spoken).toEqual(['It goes in Glass.']);
    el.remove();

    const wrapper = document.createElement('div');
    const inner = document.createElement('div');
    wrapper.append(inner);
    document.body.append(wrapper);
    const ctx = mkCtx(true);
    const p3 = materialsToy.demonstrate!(inner, q('window'), ctx);
    wrapper.remove();
    await vi.advanceTimersByTimeAsync(10000);
    (await p3).destroy();
    expect(ctx.spoken).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});
