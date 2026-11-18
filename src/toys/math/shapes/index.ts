import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { shuffle } from '../../../core/rng';
import { button, h } from '../../../ui/dom';
import { SIDES, clearSides, drawShape, setSideLit } from './draw';

export type ShapeId = 'circle' | 'triangle' | 'square' | 'rectangle' | 'cube' | 'cuboid' | 'sphere' | 'cylinder' | 'cone' | 'pyramid';
export interface ShapeInfo { name: string; dim: 2 | 3; fact: string }
export type ShapeQuestion = Question & { target: ShapeId; options: ShapeId[] };

export const SHAPES: Record<ShapeId, ShapeInfo> = {
  circle: { name: 'circle', dim: 2, fact: 'A circle is round. It has no corners.' },
  triangle: { name: 'triangle', dim: 2, fact: 'A triangle has 3 sides and 3 corners.' },
  square: { name: 'square', dim: 2, fact: 'A square has 4 equal sides and 4 corners.' },
  rectangle: { name: 'rectangle', dim: 2, fact: 'A rectangle has 4 sides and 4 corners. Opposite sides are the same length.' },
  cube: { name: 'cube', dim: 3, fact: 'A cube has 6 square faces.' },
  cuboid: { name: 'cuboid', dim: 3, fact: 'A cuboid has 6 flat faces. They are rectangles, like a box.' },
  sphere: { name: 'sphere', dim: 3, fact: 'A sphere is round like a ball. It can roll.' },
  cylinder: { name: 'cylinder', dim: 3, fact: 'A cylinder has 2 flat circle faces and a curved side. It can roll.' },
  cone: { name: 'cone', dim: 3, fact: 'A cone has 1 flat circle face and 1 point at the top.' },
  pyramid: { name: 'pyramid', dim: 3, fact: 'A pyramid has a flat bottom and triangle sides that meet at a point.' },
};

const IDS = Object.keys(SHAPES) as ShapeId[];
const TWO_D = IDS.filter(i => SHAPES[i].dim === 2);
const THREE_D = IDS.filter(i => SHAPES[i].dim === 3);
const STEP_MS = 650;
const DEMO_STEP_MS = 400;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const spokenFor = (id: ShapeId) => `${cap(SHAPES[id].name)}. ${SHAPES[id].fact}`;
const countText = (n: number, total: number) =>
  Array.from({ length: n }, (_, i) => i + 1).join(', ') + (n === total ? ' sides' : '');

function say(ctx: ToyContext, text: string): void {
  void ctx.speech.speak(text).catch(() => {});
}

/** Sleep helper whose pending timers can all be cancelled (promises then resolve early). */
function createTimers() {
  const pending = new Map<ReturnType<typeof setTimeout>, () => void>();
  return {
    sleep: (ms: number) => new Promise<void>(resolve => {
      const t = setTimeout(() => { pending.delete(t); resolve(); }, ms);
      pending.set(t, resolve);
    }),
    cancelAll() {
      for (const [t, resolve] of pending) { clearTimeout(t); resolve(); }
      pending.clear();
    },
  };
}

function makeTile(id: ShapeId, onTap: ((id: ShapeId) => void) | null): HTMLButtonElement {
  const b = h('button', {
    class: 'toy-btn bg-white border-4 border-slate-200 rounded-2xl min-h-16 min-w-16 p-2 flex items-center justify-center select-none cursor-pointer aspect-square w-full',
    role: 'shape',
    attrs: { type: 'button', 'data-shape': id, 'data-selected': 'false', 'data-highlight': 'false', 'aria-label': SHAPES[id].name },
  }, drawShape(id));
  if (onTap) b.addEventListener('click', () => onTap(id));
  else { b.tabIndex = -1; b.setAttribute('aria-disabled', 'true'); }
  return b;
}

const setSelected = (t: HTMLElement, on: boolean) => {
  t.dataset.selected = String(on);
  t.classList.toggle('border-ocean', on);
  t.classList.toggle('bg-sky-50', on);
  t.classList.toggle('border-slate-200', !on);
  t.classList.toggle('ring-4', on);
  t.classList.toggle('ring-ocean/30', on);
};
const setHighlight = (t: HTMLElement, on: boolean) => {
  t.dataset.highlight = String(on);
  t.classList.toggle('border-amber-toy', on);
  t.classList.toggle('bg-amber-50', on);
  t.classList.toggle('border-slate-200', !on);
};
const setPulsing = (t: HTMLElement, on: boolean) => {
  t.dataset.pulsing = String(on);
  t.classList.toggle('animate-pulse', on);
};

/** Lights the sides one by one, calling onStep(n, total). Stops when alive() turns false. */
async function traceSides(
  tile: HTMLElement, id: ShapeId, sleep: (ms: number) => Promise<void>, alive: () => boolean,
  onStep: (n: number, total: number) => void, stepMs: number,
): Promise<boolean> {
  const total = SIDES[id]?.length ?? 0;
  const svg = tile.querySelector('svg')!;
  clearSides(svg);
  for (let i = 0; i < total; i++) {
    if (!alive()) return false;
    setSideLit(svg, i, true);
    onStep(i + 1, total);
    await sleep(stepMs);
  }
  return alive();
}

function explore(el: HTMLElement, ctx: ToyContext): View {
  const timers = createTimers();
  let gen = 0;
  let current: ShapeId | null = null;
  const tilesById = new Map<ShapeId, HTMLButtonElement>();

  const nameEl = h('div', { class: 'font-display text-3xl font-bold text-coral leading-tight', role: 'name', text: 'Tap a shape!' });
  const factEl = h('p', { class: 'text-base font-bold text-slate-600', role: 'fact' });
  const countEl = h('div', { class: 'font-display text-2xl font-bold text-ocean min-h-8', role: 'count' });
  countEl.setAttribute('aria-live', 'polite');
  const speakBtn = button('🔊', () => { if (current) say(ctx, spokenFor(current)); }, 'bg-amber-toy text-white text-2xl shrink-0', 'speak');
  speakBtn.setAttribute('aria-label', 'Say it');
  const info = h('div', { class: 'bg-white rounded-3xl p-4 border-4 border-sky-100 toy-card flex items-center gap-3 min-w-0 sticky top-2 z-10' },
    h('div', { class: 'flex-1 min-w-0 flex flex-col gap-1' }, nameEl, factEl, countEl), speakBtn);

  const select = (id: ShapeId) => {
    const myGen = ++gen;
    timers.cancelAll();
    if (current) { setSelected(tilesById.get(current)!, false); clearSides(tilesById.get(current)!); }
    current = id;
    const tile = tilesById.get(id)!;
    setSelected(tile, true);
    nameEl.textContent = cap(SHAPES[id].name);
    factEl.textContent = SHAPES[id].fact;
    countEl.textContent = '';
    ctx.sfx.tick();
    if (ctx.autoRead) say(ctx, spokenFor(id));
    if (SHAPES[id].dim === 2) {
      if (!SIDES[id]) { countEl.textContent = 'No straight sides. It is round!'; return; }
      void traceSides(tile, id, timers.sleep, () => myGen === gen && root.isConnected, (n, total) => {
        countEl.textContent = countText(n, total);
        ctx.sfx.tick();
      }, STEP_MS);
    }
  };

  const section = (title: string, ids: ShapeId[]) => {
    const grid = h('div', { class: 'grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 gap-3' });
    for (const id of ids) { const t = makeTile(id, select); tilesById.set(id, t); grid.append(t); }
    return h('div', { class: 'flex flex-col gap-2' }, h('h3', { class: 'font-display text-lg font-bold text-slate-500', text: title }), grid);
  };

  const root = h('div', { class: 'flex flex-col gap-4 w-full min-w-0 max-w-[640px] mx-auto' },
    info, section('Flat shapes', TWO_D), section('Solid shapes', THREE_D));
  el.append(root);
  return { destroy: () => { gen++; timers.cancelAll(); root.remove(); } };
}

function renderChallenge(el: HTMLElement, q: ShapeQuestion, ctx: ToyContext): ChallengeView<ShapeId | null> {
  let selected: ShapeId | null = null;
  const tilesById = new Map<ShapeId, HTMLButtonElement>();
  const grid = h('div', { class: 'grid grid-cols-2 gap-3 w-full max-w-[420px]' });
  const choose = (id: ShapeId) => {
    selected = id;
    for (const [k, t] of tilesById) setSelected(t, k === id);
    ctx.sfx.tick();
  };
  for (const id of q.options) { const t = makeTile(id, choose); tilesById.set(id, t); grid.append(t); }
  const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 mx-auto' }, grid);
  el.append(root);
  return {
    getAnswer: () => selected,
    reset: () => { selected = null; for (const t of tilesById.values()) setSelected(t, false); },
    destroy: () => root.remove(),
  };
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function generateQuestions(_stage: Stage, count: number, rng: Rng): ShapeQuestion[] {
  const out: ShapeQuestion[] = [];
  let bag: ShapeId[] = [];
  let prev: ShapeId | null = null;
  for (let i = 0; i < count; i++) {
    if (bag.length === 0) {
      bag = shuffle(rng, IDS);
      if (bag[bag.length - 1] === prev) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    const target = bag.pop()!;
    prev = target;
    const pool = SHAPES[target].dim === 2 ? TWO_D : THREE_D;
    const others = shuffle(rng, pool.filter(s => s !== target)).slice(0, 3);
    out.push({ id: `q${i + 1}`, prompt: `Find the ${SHAPES[target].name}`, target, options: shuffle(rng, [target, ...others]) });
  }
  return out;
}

export const shapesToy: Toy<ShapeQuestion, ShapeId | null> = {
  meta: {
    id: 'shapes', subject: 'math', stages: [1], title: 'Shape Spotter', icon: '🔺',
    objective: 'Recognise and name flat and solid shapes, and say simple things about their sides, corners and faces.',
  },
  explore,
  generateQuestions,
  renderChallenge,
  check(q, answer) {
    if (answer === null) return { correct: false, hint: 'Tap a shape first!' };
    if (answer === q.target) return { correct: true };
    return { correct: false, hint: SHAPES[q.target].fact };
  },
  describeAnswer: (_q, answer) => (answer === null ? 'nothing yet' : `a ${SHAPES[answer].name}`),
  explain(q, answer) {
    return {
      why: answer === null ? 'No shape was picked yet.' : `That is a ${SHAPES[answer].name}.`,
      how: SHAPES[q.target].fact,
    };
  },
  async demonstrate(el, q, ctx) {
    const countEl = h('div', { class: 'font-display text-2xl font-bold text-ocean min-h-8 text-center', role: 'count' });
    const grid = h('div', { class: 'grid grid-cols-2 gap-3 w-full max-w-[420px]' });
    const tilesById = new Map<ShapeId, HTMLButtonElement>();
    for (const id of q.options) { const t = makeTile(id, null); tilesById.set(id, t); grid.append(t); }
    const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 mx-auto' }, grid, countEl);
    el.append(root);
    const view: View = { destroy: () => root.remove() };
    const alive = () => root.isConnected; // false if self or any ancestor was removed

    await sleep(DEMO_STEP_MS);
    if (!alive()) return view;
    const tile = tilesById.get(q.target)!;
    setHighlight(tile, true);
    ctx.sfx.tick();
    if (ctx.autoRead) say(ctx, `Here is the ${SHAPES[q.target].name}.`);
    await sleep(DEMO_STEP_MS * 2);
    if (!alive()) return view;

    if (ctx.autoRead) say(ctx, SHAPES[q.target].fact);
    if (SHAPES[q.target].dim === 2) {
      if (!SIDES[q.target]) { setPulsing(tile, true); countEl.textContent = 'No straight sides. It is round!'; return view; }
      await traceSides(tile, q.target, sleep, alive, (n, total) => {
        countEl.textContent = countText(n, total);
        ctx.sfx.tick();
      }, STEP_MS);
    } else {
      setPulsing(tile, true);
      ctx.sfx.tick();
      await sleep(DEMO_STEP_MS * 3);
    }
    return view;
  },
};
