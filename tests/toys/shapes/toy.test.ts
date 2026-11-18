import { describe, it, expect, vi } from 'vitest';
import { shapesToy, SHAPES, type ShapeId, type ShapeQuestion } from '../../../src/toys/math/shapes';
import { toysFor } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';

const IDS = Object.keys(SHAPES) as ShapeId[];
const q = (target: ShapeId, options: ShapeId[] = ['circle', 'triangle', 'square', 'rectangle']): ShapeQuestion =>
  ({ id: 'q1', prompt: `Find the ${SHAPES[target].name}`, target, options });
const mkCtx = (autoRead = false): ToyContext & { spoken: string[]; ticks: number } => {
  const c = {
    stage: 1 as const, autoRead, spoken: [] as string[], ticks: 0,
    speech: { speak: async (t: string) => { c.spoken.push(t); }, stop() {}, available: true },
    sfx: { tick: () => { c.ticks++; }, success() {}, tryAgain() {} },
    celebrate() {},
  };
  return c;
};
const tiles = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-role="shape"]')];
const tile = (el: HTMLElement, id: string) => el.querySelector<HTMLElement>(`[data-role="shape"][data-shape="${id}"]`)!;
const text = (el: HTMLElement, role: string) => el.querySelector(`[data-role="${role}"]`)!.textContent;
const litSides = (el: HTMLElement) => el.querySelectorAll('[data-role="side"][data-lit="true"]').length;

describe('meta, registry, table', () => {
  it('has meta', () => {
    expect(shapesToy.meta.id).toBe('shapes');
    expect(shapesToy.meta.subject).toBe('math');
    expect(shapesToy.meta.stages).toEqual([1]);
    expect(shapesToy.meta.title).toBe('Shape Spotter');
    expect(shapesToy.meta.icon).toBe('🔺');
    expect(toysFor('math', 1).map(t => t.meta.id)).toContain('shapes');
    expect(toysFor('math', 3).map(t => t.meta.id)).not.toContain('shapes');
  });
  it('defines all ten shapes with a fact', () => {
    expect(IDS.sort()).toEqual(['circle', 'cone', 'cube', 'cuboid', 'cylinder', 'pyramid', 'rectangle', 'sphere', 'square', 'triangle']);
    for (const id of IDS) {
      expect(SHAPES[id].fact.length).toBeGreaterThan(8);
      expect(SHAPES[id].name.length).toBeGreaterThan(2);
      expect(SHAPES[id].dim).toBe(['circle', 'triangle', 'square', 'rectangle'].includes(id) ? 2 : 3);
    }
    expect(SHAPES.triangle.fact).toBe('A triangle has 3 sides and 3 corners.');
    expect(SHAPES.square.fact).toBe('A square has 4 equal sides and 4 corners.');
    expect(SHAPES.sphere.fact).toBe('A sphere is round like a ball. It can roll.');
  });
});

describe('generateQuestions', () => {
  it('options contain target, 4 unique ids, same dimension; prompt', () => {
    const qs = shapesToy.generateQuestions(1, 200, mulberry32(5));
    expect(qs.length).toBe(200);
    for (const x of qs) {
      expect(x.options.length).toBe(4);
      expect(new Set(x.options).size).toBe(4);
      expect(x.options).toContain(x.target);
      expect(new Set(x.options.map(o => SHAPES[o].dim)).size).toBe(1);
      expect(x.prompt).toBe(`Find the ${SHAPES[x.target].name}`);
    }
    expect(new Set(qs.map(x => x.id)).size).toBe(200);
    expect(new Set(qs.map(x => x.target)).size).toBe(10);
  });
  it('is deterministic', () => {
    expect(shapesToy.generateQuestions(1, 10, mulberry32(9))).toEqual(shapesToy.generateQuestions(1, 10, mulberry32(9)));
  });
});

describe('check / describe / explain', () => {
  it('equality', () => { expect(shapesToy.check(q('square'), 'square')).toEqual({ correct: true }); });
  it('wrong gives target fact', () => {
    expect(shapesToy.check(q('triangle'), 'square')).toEqual({ correct: false, hint: 'A triangle has 3 sides and 3 corners.' });
  });
  it('null answer', () => {
    expect(shapesToy.check(q('triangle'), null)).toEqual({ correct: false, hint: 'Tap a shape first!' });
    expect(shapesToy.describeAnswer(q('triangle'), null)).toBe('nothing yet');
    const e = shapesToy.explain(q('triangle'), null);
    expect(e.how).toBe('A triangle has 3 sides and 3 corners.');
    expect(e.why.length).toBeGreaterThan(0);
  });
  it('describe and explain', () => {
    expect(shapesToy.describeAnswer(q('triangle'), 'square')).toBe('a square');
    expect(shapesToy.explain(q('triangle'), 'square').why).toBe('That is a square.');
    expect(shapesToy.explain(q('triangle'), 'square').how).toBe('A triangle has 3 sides and 3 corners.');
  });
});

describe('explore', () => {
  it('shows all ten tiles, each at least 64px class, with svg', () => {
    const el = document.createElement('div');
    const v = shapesToy.explore(el, mkCtx());
    expect(tiles(el).map(t => t.dataset.shape!).sort()).toEqual([...IDS].sort());
    for (const t of tiles(el)) {
      expect(t.className).toContain('min-h-16');
      expect(t.className).toContain('min-w-16');
      expect(t.querySelector('svg')).not.toBeNull();
    }
    v.destroy();
  });
  it('tap shows name and fact; speaks only with autoRead', () => {
    const el = document.createElement('div');
    const quiet = mkCtx(false);
    const v = shapesToy.explore(el, quiet);
    tile(el, 'cube').click();
    expect(text(el, 'name')).toBe('Cube');
    expect(text(el, 'fact')).toBe('A cube has 6 square faces.');
    expect(tile(el, 'cube').dataset.selected).toBe('true');
    expect(quiet.spoken).toEqual([]);
    v.destroy();
    const loud = mkCtx(true);
    const el2 = document.createElement('div');
    const v2 = shapesToy.explore(el2, loud);
    tile(el2, 'sphere').click();
    expect(loud.spoken).toEqual(['Sphere. A sphere is round like a ball. It can roll.']);
    v2.destroy();
  });
  it('speak button speaks the current shape', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = shapesToy.explore(el, ctx);
    tile(el, 'cone').click();
    (el.querySelector('[data-role="speak"]') as HTMLElement).click();
    expect(ctx.spoken).toEqual([`Cone. ${SHAPES.cone.fact}`]);
    v.destroy();
  });
  it('2D shape traces sides with a counting highlight', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const v = shapesToy.explore(el, mkCtx());
    tile(el, 'triangle').click();
    await vi.advanceTimersByTimeAsync(10);
    expect(text(el, 'count')).toBe('1');
    await vi.advanceTimersByTimeAsync(5000);
    expect(tile(el, 'triangle').querySelectorAll('[data-role="side"]').length).toBe(3);
    expect(litSides(tile(el, 'triangle'))).toBe(3);
    expect(text(el, 'count')).toBe('1, 2, 3 sides');
    v.destroy();
    expect(vi.getTimerCount()).toBe(0);
    el.remove();
    vi.useRealTimers();
  });
  it('circle says it has no straight sides', () => {
    const el = document.createElement('div');
    document.body.append(el);
    const v = shapesToy.explore(el, mkCtx());
    tile(el, 'circle').click();
    expect(text(el, 'count')).toBe('No straight sides. It is round!');
    v.destroy();
    el.remove();
  });
  it('3D shape shows the fact with no side count', () => {
    const el = document.createElement('div');
    const v = shapesToy.explore(el, mkCtx());
    tile(el, 'cylinder').click();
    expect(text(el, 'count')).toBe('');
    expect(tile(el, 'cylinder').querySelectorAll('[data-role="side"]').length).toBe(0);
    v.destroy();
  });
  it('destroy removes dom', () => {
    const el = document.createElement('div');
    shapesToy.explore(el, mkCtx()).destroy();
    expect(el.children.length).toBe(0);
  });
});

describe('challenge', () => {
  it('renders the 4 options; tap selects, one at a time; reset clears; null when untouched', () => {
    const el = document.createElement('div');
    const question = q('square');
    const v = shapesToy.renderChallenge(el, question, mkCtx());
    expect(tiles(el).map(t => t.dataset.shape)).toEqual(question.options);
    expect(v.getAnswer()).toBeNull();
    tile(el, 'circle').click();
    expect(v.getAnswer()).toBe('circle');
    expect(tile(el, 'circle').dataset.selected).toBe('true');
    tile(el, 'square').click();
    expect(v.getAnswer()).toBe('square');
    expect(tile(el, 'circle').dataset.selected).toBe('false');
    v.reset();
    expect(v.getAnswer()).toBeNull();
    expect(tiles(el).every(t => t.dataset.selected === 'false')).toBe(true);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
});

describe('demonstrate', () => {
  it('2D: shows options, highlights target, traces sides, speaks the fact', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(true);
    const p = shapesToy.demonstrate!(el, q('rectangle'), ctx);
    await vi.advanceTimersByTimeAsync(10000);
    const v = await p;
    expect(tiles(el).length).toBe(4);
    expect(tile(el, 'rectangle').dataset.highlight).toBe('true');
    expect(tile(el, 'circle').dataset.highlight).toBe('false');
    expect(litSides(tile(el, 'rectangle'))).toBe(4);
    expect(ctx.spoken).toContain(SHAPES.rectangle.fact);
    v.destroy();
    el.remove();
    vi.useRealTimers();
  });
  it('3D: pulses target and speaks the fact', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(true);
    const p = shapesToy.demonstrate!(el, q('cone', ['cube', 'cone', 'sphere', 'pyramid']), ctx);
    await vi.advanceTimersByTimeAsync(10000);
    const v = await p;
    expect(tile(el, 'cone').dataset.highlight).toBe('true');
    expect(tile(el, 'cone').dataset.pulsing).toBe('true');
    expect(ctx.spoken).toContain(SHAPES.cone.fact);
    v.destroy();
    el.remove();
    vi.useRealTimers();
  });
  it.each(['wrapper.remove', 'body.replaceChildren'])('stops speaking and ticking when an ancestor is detached (%s)', async how => {
    vi.useFakeTimers();
    const wrapper = document.createElement('div');
    const el = document.createElement('div');
    wrapper.append(el);
    document.body.append(wrapper);
    const ctx = mkCtx(true);
    const p = shapesToy.demonstrate!(el, q('square'), ctx);
    await vi.advanceTimersByTimeAsync(1200);
    const spoken = ctx.spoken.length;
    const ticks = ctx.ticks;
    expect(ticks).toBeGreaterThan(0);
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
    const p = shapesToy.demonstrate!(el, q('rectangle'), ctx);
    await vi.advanceTimersByTimeAsync(20000);
    const v = await p;
    expect(ctx.ticks).toBeGreaterThan(0);
    expect(ctx.spoken).toEqual([]);
    v.destroy();
    el.remove();
    vi.useRealTimers();
  });
});
