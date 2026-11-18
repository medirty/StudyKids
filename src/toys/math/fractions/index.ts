import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { pick, randInt } from '../../../core/rng';
import { button, h } from '../../../ui/dom';

export type FractionQuestion = Question & { num: number; den: number; target: number };

const DENOMINATORS = [2, 3, 4, 5, 6, 8, 10];
const DEMO_STEP_MS = 500;
const SVG_NS = 'http://www.w3.org/2000/svg';

const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const PART_NAMES: Record<number, [string, string]> = {
  2: ['half', 'halves'], 3: ['third', 'thirds'], 4: ['quarter', 'quarters'], 5: ['fifth', 'fifths'],
  6: ['sixth', 'sixths'], 8: ['eighth', 'eighths'], 10: ['tenth', 'tenths'],
};

const partName = (den: number, n: number) => PART_NAMES[den][n === 1 ? 0 : 1];

/** 3/4 -> "three quarters". */
export function fractionWords(num: number, den: number): string {
  return `${NUM_WORDS[num]} ${partName(den, num)}`;
}

const say = (ctx: ToyContext, text: string): void => { void ctx.speech.speak(text).catch(() => {}); };
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const CX = 100, CY = 100, R = 94;
const point = (deg: number) => {
  const a = (deg - 90) * Math.PI / 180;
  return `${(CX + R * Math.cos(a)).toFixed(2)} ${(CY + R * Math.sin(a)).toFixed(2)}`;
};
const sectorPath = (i: number, den: number) => {
  const step = 360 / den;
  return `M ${CX} ${CY} L ${point(i * step)} A ${R} ${R} 0 0 1 ${point((i + 1) * step)} Z`;
};

interface Pizza {
  root: HTMLElement;
  count(): number;
  setSlice(i: number, on: boolean): void;
  clear(): void;
}

/** A pizza cut into `den` equal sectors. onToggle fires only for taps made by the child. */
function createPizza(den: number, onToggle: ((count: number) => void) | null): Pizza {
  const state: boolean[] = new Array(den).fill(false);
  const nodes: SVGPathElement[] = [];
  const count = () => state.filter(Boolean).length;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.setAttribute('class', 'w-full h-full block');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', `A pizza cut into ${den} equal slices`);

  const crust = document.createElementNS(SVG_NS, 'circle');
  crust.setAttribute('cx', String(CX)); crust.setAttribute('cy', String(CY)); crust.setAttribute('r', '99');
  crust.setAttribute('fill', '#E8B866');
  svg.append(crust);

  const paint = (i: number) => {
    const p = nodes[i];
    p.dataset.on = String(state[i]);
    p.setAttribute('fill', state[i] ? '#FF6B6B' : '#FFE9A8');
    p.setAttribute('aria-label', `Slice ${i + 1} of ${den}, ${state[i] ? 'coloured, tap to uncolour' : 'tap to colour'}`);
    p.setAttribute('aria-pressed', String(state[i]));
  };
  const setSlice = (i: number, on: boolean) => { state[i] = on; paint(i); };
  const toggle = (i: number) => { setSlice(i, !state[i]); onToggle?.(count()); };

  for (let i = 0; i < den; i++) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', sectorPath(i, den));
    p.setAttribute('stroke', '#FFFDF7');
    p.setAttribute('stroke-width', '3');
    p.setAttribute('stroke-linejoin', 'round');
    p.dataset.role = 'slice';
    p.dataset.index = String(i);
    nodes.push(p);
    if (onToggle) {
      p.setAttribute('role', 'button');
      p.setAttribute('tabindex', '0');
      p.style.cursor = 'pointer';
      p.style.outline = 'none'; // the default box outline is ugly on a wedge; show a keyboard-only ring instead
      const ring = (on: boolean) => { p.setAttribute('stroke', on ? '#3B82F6' : '#FFFDF7'); };
      p.addEventListener('focus', () => { try { ring(p.matches(':focus-visible')); } catch { /* old engine */ } });
      p.addEventListener('blur', () => ring(false));
      p.addEventListener('click', () => toggle(i));
      p.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(i); }
      });
    }
    paint(i);
    svg.append(p);
  }

  const root = h('div', { class: 'w-full max-w-[320px] aspect-square mx-auto select-none', attrs: { style: 'touch-action: manipulation' } }, svg as unknown as Node);
  return {
    root,
    count,
    setSlice,
    clear() { for (let i = 0; i < den; i++) setSlice(i, false); },
  };
}

function explore(el: HTMLElement, ctx: ToyContext): View {
  let den = 4;
  let pizza: Pizza;
  const stage = h('div', { class: 'w-full' });
  const fractionEl = h('div', { class: 'font-display text-5xl font-bold text-coral leading-none', role: 'fraction' });
  fractionEl.setAttribute('aria-live', 'polite');
  const wordsEl = h('div', { class: 'font-display text-xl font-bold text-slate-600 min-h-7 text-center', role: 'words' });

  const words = () => {
    const n = pizza.count();
    if (n === 0) return '';
    return n === den ? 'one whole pizza' : fractionWords(n, den);
  };
  const refresh = () => {
    fractionEl.textContent = `${pizza.count()}/${den}`;
    wordsEl.textContent = pizza.count() === 0 ? 'Tap slices to colour them' : words();
  };
  const build = (d: number) => {
    den = d;
    pizza = createPizza(den, () => {
      refresh();
      ctx.sfx.tick();
      if (ctx.autoRead && pizza.count() > 0) say(ctx, words());
    });
    stage.replaceChildren(pizza.root);
    refresh();
    for (const b of choosers) {
      const on = Number(b.dataset.parts) === den;
      b.dataset.selected = String(on);
      b.setAttribute('aria-pressed', String(on));
      b.className = `${b.className.replace(/ (bg-ocean text-white|bg-white text-slate-700)/g, '')} ${on ? 'bg-ocean text-white' : 'bg-white text-slate-700'}`;
    }
  };

  const choosers = DENOMINATORS.map(d => {
    const b = button(String(d), () => { build(d); ctx.sfx.tick(); }, 'border-2 border-slate-300 text-lg', 'parts');
    b.dataset.parts = String(d);
    b.setAttribute('aria-label', `Cut into ${d} equal parts`);
    return b;
  });
  const speakBtn = button('🔊', () => { if (pizza.count() > 0) say(ctx, words()); }, 'bg-amber-toy text-white text-2xl', 'speak');
  speakBtn.setAttribute('aria-label', 'Say the fraction');
  const clearBtn = button('🧺 Start again', () => { pizza.clear(); refresh(); ctx.sfx.tick(); }, 'bg-white border-2 border-slate-300 text-slate-600 text-sm', 'clear');

  const root = h('div', { class: 'flex flex-col gap-3 w-full min-w-0 max-w-[640px] mx-auto' },
    h('p', { class: 'text-center text-sm font-bold text-slate-500', text: 'How many equal parts?' }),
    h('div', { class: 'grid grid-cols-4 gap-1.5' }, ...choosers),
    stage,
    h('div', { class: 'bg-white rounded-3xl p-3 border-4 border-sky-100 toy-card flex items-center justify-center gap-4' },
      fractionEl, speakBtn),
    wordsEl,
    h('div', { class: 'flex justify-center' }, clearBtn));
  el.append(root);
  build(den);
  return { destroy: () => root.remove() };
}

function renderChallenge(el: HTMLElement, q: FractionQuestion, ctx: ToyContext): ChallengeView<number> {
  const countEl = h('div', { class: 'font-display text-4xl font-bold text-coral leading-none', role: 'count', text: `0/${q.den}` });
  const pizza = createPizza(q.den, n => { countEl.textContent = `${n}/${q.den}`; ctx.sfx.tick(); });
  const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' },
    pizza.root,
    h('div', { class: 'bg-white rounded-2xl px-5 py-2 border-4 border-sky-100 toy-card' }, countEl));
  el.append(root);
  return {
    getAnswer: () => pizza.count(),
    reset: () => { pizza.clear(); countEl.textContent = `0/${q.den}`; },
    destroy: () => root.remove(),
  };
}

function generateQuestions(_stage: Stage, count: number, rng: Rng): FractionQuestion[] {
  const out: FractionQuestion[] = [];
  let prev = '';
  for (let i = 0; i < count; i++) {
    let den: number, num: number;
    do {
      den = pick(rng, DENOMINATORS);
      num = randInt(rng, 1, den - 1);
    } while (`${num}/${den}` === prev);
    prev = `${num}/${den}`;
    out.push({ id: `q${i + 1}`, prompt: `Colour ${num}/${den} of the pizza`, spoken: `Colour ${fractionWords(num, den)} of the pizza`, num, den, target: num });
  }
  return out;
}

export const fractionsToy: Toy<FractionQuestion, number> = {
  meta: {
    id: 'fractions', subject: 'math', stages: [3], title: 'Fraction Pizza', icon: '🍕',
    objective: 'Recognise and make halves, thirds, quarters, fifths, sixths, eighths and tenths of a shape, including fractions like three quarters.',
  },
  explore,
  generateQuestions,
  renderChallenge,
  check(q, answer) {
    if (answer === q.num) return { correct: true };
    return { correct: false, hint: `The pizza has ${q.den} equal parts. Colour ${q.num} of them.` };
  },
  describeAnswer: (q, answer) => `${answer} out of ${q.den} slices coloured`,
  explain: (q, answer) => ({
    why: `You coloured ${answer} out of ${q.den}.`,
    how: `${q.num}/${q.den} means ${q.num} of ${q.den} equal parts.`,
  }),
  async demonstrate(el, q, ctx) {
    const countEl = h('div', { class: 'font-display text-4xl font-bold text-coral leading-none', role: 'count', text: `0/${q.den}` });
    const pizza = createPizza(q.den, null);
    const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' },
      pizza.root,
      h('div', { class: 'bg-white rounded-2xl px-5 py-2 border-4 border-sky-100 toy-card' }, countEl));
    el.append(root);
    const view: View = { destroy: () => root.remove() };
    for (let i = 0; i < q.num; i++) {
      await sleep(DEMO_STEP_MS);
      if (!root.isConnected) return view; // removed (self or any ancestor) mid-way: stop cleanly
      pizza.setSlice(i, true);
      countEl.textContent = `${i + 1}/${q.den}`;
      ctx.sfx.tick();
      if (ctx.autoRead) say(ctx, fractionWords(i + 1, q.den)); // "one quarter", "two quarters", ...
    }
    return view;
  },
};
