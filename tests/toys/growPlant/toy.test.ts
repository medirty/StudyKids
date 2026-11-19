import { describe, it, expect, vi, afterEach } from 'vitest';
import { growPlantToy, type PlantQuestion } from '../../../src/toys/science/growPlant';
import { HOTSPOTS, VIEW_W, VIEW_H, MIN_HOTSPOT } from '../../../src/toys/science/growPlant/plantFigure';
import {
  PLANT_PARTS, PART_IDS, NEEDS, LEVELS, plantHealth, plantReport, type Level, type PartId,
} from '../../../src/content/science/plants';
import { toysFor, findToy } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';

const mkCtx = (autoRead = false): ToyContext & { spoken: string[] } => {
  const c = {
    stage: 3 as const, autoRead, spoken: [] as string[],
    speech: { speak: async (t: string) => { c.spoken.push(t); }, stop() {}, available: true },
    sfx: { tick() {}, success() {}, tryAgain() {} },
    celebrate() {},
  };
  return c;
};
const tapQ = (part: PartId): PlantQuestion => ({ id: 'q1', prompt: `Tap the ${part}.`, spoken: `Tap the ${part}.`, kind: 'tap', part });
const fnQ = (part: PartId): PlantQuestion => ({ id: 'q1', prompt: `What does the ${part} do?`, spoken: `What does the ${part} do?`, kind: 'function', part });
const $ = (el: HTMLElement, role: string) => el.querySelector<HTMLElement>(`[data-role="${role}"]`)!;
const need = (el: HTMLElement, n: string, lvl: string) =>
  el.querySelector<HTMLElement>(`[data-role="level"][data-need="${n}"][data-level="${lvl}"]`)!;
const choice = (el: HTMLElement, id: string) =>
  [...el.querySelectorAll<HTMLElement>('[data-role="choice"]')].find(b => b.dataset.id === id)!;
const plantPart = (el: HTMLElement, id: string) => el.querySelector<HTMLElement>(`[data-role="plant-part"][data-part="${id}"]`)!;

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('content and meta', () => {
  it('has the four parts with the exact functions', () => {
    expect([...PART_IDS]).toEqual(['root', 'stem', 'leaf', 'flower']);
    expect(PLANT_PARTS.root.fn).toBe('takes in water and holds the plant in the soil');
    expect(PLANT_PARTS.stem.fn).toBe('carries water up and holds the plant up');
    expect(PLANT_PARTS.leaf.fn).toBe('makes food using sunlight');
    expect(PLANT_PARTS.flower.fn).toBe('makes seeds');
    expect(new Set(PART_IDS.map(p => PLANT_PARTS[p].fn)).size).toBe(4);
  });
  it('has three needs and three levels', () => {
    expect(NEEDS.map(n => n.id)).toEqual(['water', 'light', 'warmth']);
    expect([...LEVELS]).toEqual(['none', 'some', 'lots']);
  });
  it('is registered for grade 3 science only', () => {
    const m = growPlantToy.meta;
    expect([m.id, m.subject, m.stages, m.title, m.icon]).toEqual(['growPlant', 'science', [3], 'Grow a Plant', '🌻']);
    expect(toysFor('science', 3).map(t => t.meta.id)).toContain('growPlant');
    expect(toysFor('science', 1).map(t => t.meta.id)).not.toContain('growPlant');
    expect(findToy('growPlant')).toBe(growPlantToy);
  });
});

describe('plantHealth: all 27 combinations', () => {
  // Documented table. Any 'none' -> not growing (it is missing a need).
  // Otherwise water 'lots' or warmth 'lots' -> wilting. Light 'some' or 'lots' is fine.
  const expected = (w: Level, l: Level, t: Level) =>
    [w, l, t].includes('none') ? 'not growing' : w === 'lots' || t === 'lots' ? 'wilting' : 'thriving';
  it('matches the table for every combination', () => {
    let n = 0;
    for (const water of LEVELS) for (const light of LEVELS) for (const warmth of LEVELS) {
      expect(`${water}/${light}/${warmth}: ${plantHealth({ water, light, warmth })}`).toBe(`${water}/${light}/${warmth}: ${expected(water, light, warmth)}`);
      n++;
    }
    expect(n).toBe(27);
  });
  it('thrives only with some water, some warmth and some or lots of light (exactly two combinations)', () => {
    const found: string[] = [];
    for (const water of LEVELS) for (const light of LEVELS) for (const warmth of LEVELS) {
      if (plantHealth({ water, light, warmth }) === 'thriving') found.push(`${water}/${light}/${warmth}`);
    }
    expect(found.sort()).toEqual(['some/lots/some', 'some/some/some']);
  });
  it('some water, some light, lots of warmth is wilting (too hot)', () => {
    expect(plantHealth({ water: 'some', light: 'some', warmth: 'lots' })).toBe('wilting');
  });
});

describe('plantReport notes', () => {
  const r = (water: Level, light: Level, warmth: Level) => plantReport({ water, light, warmth });
  it('thriving has a happy note, also with lots of light', () => {
    for (const light of ['some', 'lots'] as const) {
      const x = r('some', light, 'some');
      expect(x.health).toBe('thriving');
      expect(x.note).toBe('The plant is thriving! It has everything it needs to grow.');
    }
  });
  it('lots of water: wilting with the soggy-roots note', () => {
    const x = r('lots', 'some', 'some');
    expect(x.health).toBe('wilting');
    expect(x.note).toContain('Too much water can make the roots go soggy.');
  });
  it('lots of warmth: wilting, too hot', () => {
    expect(r('some', 'some', 'lots').note).toMatch(/too hot/i);
  });
  it('lots of water and lots of light: wilting with the water note only', () => {
    const x = r('lots', 'lots', 'some');
    expect(x.health).toBe('wilting');
    expect(x.note).toBe('The plant is wilting. Too much water can make the roots go soggy.');
  });
  it('wilting with several causes names them in order water, warmth; light is never blamed', () => {
    const x = r('lots', 'lots', 'lots').note;
    expect(x.indexOf('water')).toBeGreaterThanOrEqual(0);
    expect(x.indexOf('water')).toBeLessThan(x.indexOf('hot'));
    expect(x).not.toMatch(/sun|light/i);
  });
  it('not growing names the missing need', () => {
    expect(r('none', 'some', 'some').note).toMatch(/needs water\./);
    expect(r('some', 'none', 'some').note).toMatch(/needs light\./);
    expect(r('some', 'some', 'none').note).toMatch(/needs warmth\./);
  });
  it('not growing names several missing needs in order water, light, warmth', () => {
    expect(r('none', 'none', 'some').note).toMatch(/needs water and light\./);
    expect(r('none', 'some', 'none').note).toMatch(/needs water and warmth\./);
    expect(r('some', 'none', 'none').note).toMatch(/needs light and warmth\./);
    expect(r('none', 'none', 'none').note).toMatch(/needs water, light and warmth\./);
  });
  it('a missing need beats too-much notes', () => {
    const x = r('lots', 'none', 'some');
    expect(x.health).toBe('not growing');
    expect(x.note).toMatch(/needs light\./);
    expect(x.note).not.toMatch(/soggy/);
  });
  it('is gentle, never says Wrong', () => {
    for (const w of LEVELS) for (const l of LEVELS) for (const t of LEVELS) expect(r(w, l, t).note).not.toMatch(/wrong/i);
  });
});

describe('figure', () => {
  const contains = (o: (typeof HOTSPOTS)[number], x: number, y: number) =>
    Math.abs(x - o.cx) <= o.w / 2 && Math.abs(y - o.cy) <= o.h / 2;
  const owner = (x: number, y: number) => [...HOTSPOTS].reverse().find(o => contains(o, x, y))?.part;
  it('has a hotspot for every part, each at least 52 units and inside the drawing', () => {
    expect(new Set(HOTSPOTS.map(x => x.part))).toEqual(new Set(PART_IDS));
    for (const hs of HOTSPOTS) {
      expect(hs.w).toBeGreaterThanOrEqual(MIN_HOTSPOT);
      expect(hs.h).toBeGreaterThanOrEqual(MIN_HOTSPOT);
      expect(hs.cx - hs.w / 2).toBeGreaterThanOrEqual(0);
      expect(hs.cx + hs.w / 2).toBeLessThanOrEqual(VIEW_W);
      expect(hs.cy - hs.h / 2).toBeGreaterThanOrEqual(0);
      expect(hs.cy + hs.h / 2).toBeLessThanOrEqual(VIEW_H);
    }
    expect(MIN_HOTSPOT * 0.925).toBeGreaterThanOrEqual(48);
  });
  it('the visible centre of every hotspot resolves to its own part', () => {
    for (const hs of HOTSPOTS) expect(`${hs.part}@${hs.ax},${hs.ay} -> ${owner(hs.ax, hs.ay)}`).toBe(`${hs.part}@${hs.ax},${hs.ay} -> ${hs.part}`);
  });
  it('visible regions: stem along the stem, roots below the ground line, flower head, both leaves', () => {
    for (const y of [120, 150, 180, 198]) expect(`120,${y} -> ${owner(120, y)}`).toBe(`120,${y} -> stem`);
    for (const [x, y] of [[120, 215], [120, 260], [90, 250], [150, 250], [120, 290]]) expect(`${x},${y} -> ${owner(x, y)}`).toBe(`${x},${y} -> root`);
    for (const [x, y] of [[120, 60], [120, 85], [100, 70], [140, 70]]) expect(`${x},${y} -> ${owner(x, y)}`).toBe(`${x},${y} -> flower`);
    for (const [x, y] of [[80, 140], [60, 138], [160, 140], [180, 138], [105, 142], [135, 142]]) expect(`${x},${y} -> ${owner(x, y)}`).toBe(`${x},${y} -> leaf`);
  });
  it('draws an SVG with all four parts tagged', () => {
    const el = document.createElement('div');
    const v = growPlantToy.explore(el, mkCtx());
    expect(el.querySelector('svg')).not.toBeNull();
    for (const p of PART_IDS) expect(el.querySelector(`svg [data-part="${p}"]`), p).not.toBeNull();
    v.destroy();
  });
});

describe('generateQuestions', () => {
  const qs = growPlantToy.generateQuestions(3, 200, mulberry32(11));
  it('returns the requested count, spoken prompts, valid parts and kinds', () => {
    expect(qs.length).toBe(200);
    for (const q of qs) {
      expect(PART_IDS).toContain(q.part);
      expect(['tap', 'function']).toContain(q.kind);
      expect(q.spoken).toBe(q.prompt);
      expect(q.prompt).toBe(q.kind === 'tap' ? `Tap the ${q.part}.` : `What does the ${q.part} do?`);
    }
    expect(growPlantToy.generateQuestions(3, 7, mulberry32(1)).length).toBe(7);
    expect(growPlantToy.generateQuestions(3, 0, mulberry32(1)).length).toBe(0);
  });
  it('never repeats the same part twice in a row (so never the same item)', () => {
    for (let i = 1; i < qs.length; i++) expect(qs[i].part).not.toBe(qs[i - 1].part);
  });
  it('covers both kinds and every part, five of each kind per ten', () => {
    expect(new Set(qs.map(q => q.kind)).size).toBe(2);
    expect(new Set(qs.map(q => q.part)).size).toBe(4);
    for (let b = 0; b < 20; b++) expect(qs.slice(b * 10, b * 10 + 10).filter(q => q.kind === 'tap').length).toBe(5);
  });
  it('is deterministic for a seed and ids are unique', () => {
    expect(growPlantToy.generateQuestions(3, 30, mulberry32(5))).toEqual(growPlantToy.generateQuestions(3, 30, mulberry32(5)));
    expect(new Set(qs.map(q => q.id)).size).toBe(200);
  });
});

describe('check / describe / explain', () => {
  it('tap and function questions share one answer type: the part', () => {
    for (const p of PART_IDS) {
      expect(growPlantToy.check(tapQ(p), p)).toEqual({ correct: true });
      expect(growPlantToy.check(fnQ(p), p)).toEqual({ correct: true });
    }
  });
  it('wrong tap hint uses the function text without naming the part', () => {
    const c = growPlantToy.check(tapQ('leaf'), 'root');
    expect(c.correct).toBe(false);
    expect(c.hint).toBe('Look for the part that makes food using sunlight.');
  });
  it('wrong function hint gives a where-clue', () => {
    const c = growPlantToy.check(fnQ('root'), 'leaf');
    expect(c.correct).toBe(false);
    expect(c.hint).toBe(PLANT_PARTS.root.where);
    expect(PLANT_PARTS.root.where).not.toMatch(/water/i);
  });
  it('nothing chosen asks gently', () => {
    expect(growPlantToy.check(tapQ('stem'), null)).toEqual({ correct: false, hint: 'Tap a part of the plant first!' });
    expect(growPlantToy.check(fnQ('stem'), null)).toEqual({ correct: false, hint: 'Choose what it does first!' });
  });
  it('describeAnswer', () => {
    expect(growPlantToy.describeAnswer(tapQ('leaf'), 'root')).toBe('You tapped the root');
    expect(growPlantToy.describeAnswer(fnQ('leaf'), 'root')).toBe('You chose "takes in water and holds the plant in the soil"');
    expect(growPlantToy.describeAnswer(tapQ('leaf'), null)).toBe('You did not choose yet');
  });
  it('explain states the function of the correct part', () => {
    expect(growPlantToy.explain(tapQ('leaf'), 'root').how).toBe('This is the leaf. The leaf makes food using sunlight.');
    expect(growPlantToy.explain(fnQ('flower'), 'leaf').how).toBe('The flower makes seeds.');
    expect(growPlantToy.explain(fnQ('flower'), null).why).toBe('You did not choose yet.');
    expect(growPlantToy.explain(tapQ('stem'), 'root').why).toBe('You tapped the root.');
  });
});

describe('explore', () => {
  it('shows controls for water, light and warmth, three levels each, 48px-class buttons, and mentions air', () => {
    const el = document.createElement('div');
    const v = growPlantToy.explore(el, mkCtx());
    for (const n of ['water', 'light', 'warmth']) for (const l of ['none', 'some', 'lots']) expect(need(el, n, l), `${n}/${l}`).toBeTruthy();
    expect(el.textContent).toMatch(/air/i);
    expect(need(el, 'water', 'some').className).toMatch(/min-h-12/);
    v.destroy();
  });
  it('starts thriving with some of each', () => {
    const el = document.createElement('div');
    const v = growPlantToy.explore(el, mkCtx());
    expect($(el, 'plant').dataset.health).toBe('thriving');
    for (const n of ['water', 'light', 'warmth']) expect(need(el, n, 'some').getAttribute('aria-pressed')).toBe('true');
    v.destroy();
  });
  it('choosing levels updates health, status text and the pressed button', () => {
    const el = document.createElement('div');
    const v = growPlantToy.explore(el, mkCtx());
    need(el, 'water', 'lots').click();
    expect($(el, 'plant').dataset.health).toBe('wilting');
    expect($(el, 'status').textContent).toContain('Too much water can make the roots go soggy.');
    expect(need(el, 'water', 'lots').getAttribute('aria-pressed')).toBe('true');
    expect(need(el, 'water', 'some').getAttribute('aria-pressed')).toBe('false');
    need(el, 'water', 'none').click();
    need(el, 'light', 'none').click();
    expect($(el, 'plant').dataset.health).toBe('not growing');
    expect($(el, 'status').textContent).toMatch(/needs water and light\./);
    need(el, 'water', 'some').click();
    need(el, 'light', 'some').click();
    expect($(el, 'plant').dataset.health).toBe('thriving');
    v.destroy();
  });
  it('every combination of clicks agrees with plantHealth', () => {
    const el = document.createElement('div');
    const v = growPlantToy.explore(el, mkCtx());
    for (const water of LEVELS) for (const light of LEVELS) for (const warmth of LEVELS) {
      need(el, 'water', water).click(); need(el, 'light', light).click(); need(el, 'warmth', warmth).click();
      expect($(el, 'plant').dataset.health).toBe(plantHealth({ water, light, warmth }));
    }
    v.destroy();
  });
  it('the plant is smaller and not in flower when not growing', () => {
    const el = document.createElement('div');
    const v = growPlantToy.explore(el, mkCtx());
    const g = () => Number($(el, 'plant').dataset.growth);
    const full = g();
    need(el, 'water', 'lots').click();
    const wilt = g();
    need(el, 'light', 'none').click();
    const none = g();
    expect(full).toBe(1);
    expect(wilt).toBeLessThan(full);
    expect(none).toBeLessThan(wilt);
    expect(none).toBeGreaterThan(0);
    v.destroy();
  });
  it('part buttons show and speak the function on tap, even without autoRead', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = growPlantToy.explore(el, ctx);
    const btn = el.querySelector<HTMLElement>('[data-role="part"][data-part="leaf"]')!;
    expect(btn.className).toMatch(/min-h-12/);
    btn.click();
    expect($(el, 'part-info').textContent).toBe('The leaf makes food using sunlight.');
    expect(ctx.spoken).toEqual(['The leaf makes food using sunlight.']);
    v.destroy();
  });
  it('changing a control speaks the status only with autoRead; the 🔊 replays it', () => {
    const el = document.createElement('div');
    const quiet = mkCtx(false);
    const v = growPlantToy.explore(el, quiet);
    need(el, 'water', 'none').click();
    expect(quiet.spoken).toEqual([]);
    $(el, 'speak').click();
    expect(quiet.spoken).toEqual([$(el, 'status').textContent]);
    v.destroy();
    const loud = mkCtx(true);
    const el2 = document.createElement('div');
    const v2 = growPlantToy.explore(el2, loud);
    need(el2, 'water', 'lots').click();
    expect(loud.spoken).toEqual([$(el2, 'status').textContent]);
    v2.destroy();
  });
  it('grows over about 3s with a transition, or jumps with reduced motion; no timers', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }));
    const el = document.createElement('div');
    const v = growPlantToy.explore(el, mkCtx(true));
    need(el, 'water', 'none').click();
    expect($(el, 'plant-top').style.transition).toMatch(/3000ms/);
    expect(vi.getTimerCount()).toBe(0);
    v.destroy();
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: /reduce/.test(query), media: query }));
    const el2 = document.createElement('div');
    const v2 = growPlantToy.explore(el2, mkCtx());
    need(el2, 'water', 'none').click();
    expect($(el2, 'plant-top').style.transition).toBe('none');
    v2.destroy();
  });
});

describe('challenge', () => {
  it('tap: hotspots are buttons without part names; tapping selects one; no speech; reset clears', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const v = growPlantToy.renderChallenge(el, tapQ('leaf'), ctx);
    const spots = [...el.querySelectorAll<HTMLElement>('[data-role="plant-part"]')];
    expect(spots.length).toBe(HOTSPOTS.length);
    for (const s of spots) {
      expect(s.tagName).toBe('BUTTON');
      expect(s.getAttribute('aria-label')).toBe('Plant part');
      expect(s.style.width).toMatch(/max\(48px/);
    }
    expect(v.getAnswer()).toBeNull();
    plantPart(el, 'root').click();
    expect(v.getAnswer()).toBe('root');
    plantPart(el, 'leaf').click();
    expect(v.getAnswer()).toBe('leaf');
    expect(el.querySelectorAll('.is-selected').length).toBe(HOTSPOTS.filter(x => x.part === 'leaf').length);
    v.reset();
    expect(v.getAnswer()).toBeNull();
    expect(el.querySelectorAll('.is-selected').length).toBe(0);
    expect(ctx.spoken).toEqual([]);
    expect(el.querySelector('[data-role="choice"]')).toBeNull();
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('tap: the plant drawing shows no text that names a part', () => {
    const el = document.createElement('div');
    const v = growPlantToy.renderChallenge(el, tapQ('leaf'), mkCtx());
    expect(el.textContent).toBe('');
    v.destroy();
  });
  it('function: four cards with the four functions, selection is the answer, no speech', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const v = growPlantToy.renderChallenge(el, fnQ('stem'), ctx);
    const ids = [...el.querySelectorAll<HTMLElement>('[data-role="choice"]')].map(b => b.dataset.id);
    expect(new Set(ids)).toEqual(new Set(PART_IDS));
    expect(ids.length).toBe(4);
    for (const p of PART_IDS) expect(choice(el, p).textContent).toContain(PLANT_PARTS[p].fn.charAt(0).toUpperCase() + PLANT_PARTS[p].fn.slice(1));
    expect(v.getAnswer()).toBeNull();
    choice(el, 'leaf').click();
    expect(v.getAnswer()).toBe('leaf');
    v.reset();
    expect(v.getAnswer()).toBeNull();
    expect(ctx.spoken).toEqual([]);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('function: the cards are shuffled by question order only through the generator, not by rendering', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    growPlantToy.renderChallenge(a, fnQ('stem'), mkCtx());
    growPlantToy.renderChallenge(b, fnQ('stem'), mkCtx());
    const order = (e: HTMLElement) => [...e.querySelectorAll<HTMLElement>('[data-role="choice"]')].map(x => x.dataset.id);
    expect(order(a)).toEqual(order(b));
  });
});

describe('demonstrate', () => {
  it('tap: glows the right part; speaks the explanation only with autoRead', async () => {
    const el = document.createElement('div');
    document.body.append(el);
    const quiet = mkCtx(false);
    const v1 = await growPlantToy.demonstrate!(el, tapQ('flower'), quiet);
    expect(plantPart(el, 'flower').classList.contains('is-glow')).toBe(true);
    expect(plantPart(el, 'leaf').classList.contains('is-glow')).toBe(false);
    expect(plantPart(el, 'flower').tagName).toBe('SPAN');
    expect(quiet.spoken).toEqual([]);
    v1.destroy();
    const loud = mkCtx(true);
    const v2 = await growPlantToy.demonstrate!(el, tapQ('flower'), loud);
    expect(loud.spoken).toEqual(['This is the flower.']);
    v2.destroy();
    el.remove();
  });
  it('function: highlights the right card, locked', async () => {
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(true);
    const v = await growPlantToy.demonstrate!(el, fnQ('leaf'), ctx);
    expect(choice(el, 'leaf').dataset.highlight).toBe('correct');
    expect(choice(el, 'root').dataset.highlight).toBeUndefined();
    choice(el, 'root').click();
    expect(choice(el, 'root').getAttribute('aria-pressed')).toBe('false');
    expect(ctx.spoken).toEqual(['It is the leaf!']);
    v.destroy();
    el.remove();
  });
  it('does not speak when detached, and leaves no timers', async () => {
    vi.useFakeTimers();
    for (const q of [tapQ('leaf'), fnQ('leaf')]) {
      const el = document.createElement('div'); // never attached
      const ctx = mkCtx(true);
      const view = await growPlantToy.demonstrate!(el, q, ctx);
      expect(ctx.spoken).toEqual([]);
      expect(vi.getTimerCount()).toBe(0);
      view.destroy();
    }
  });
});
