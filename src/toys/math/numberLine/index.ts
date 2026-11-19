import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { randInt } from '../../../core/rng';
import { button, h } from '../../../ui/dom';

export type NumberLineQuestion = Question & { a: number; op: '+' | '−'; b: number; answer: number; target: number };

const MAX = 20;
const ROW_BREAK = 10; // row 1 holds 0..10, row 2 holds 11..20
const DEMO_STEP_MS = 450;
const HOPS = [-5, -1, 1, 5] as const;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const clamp = (n: number) => Math.max(0, Math.min(MAX, n));
const hopLabel = (d: number) => `${d < 0 ? '−' : '+'}${Math.abs(d)}`;
const dirWord = (op: '+' | '−') => (op === '+' ? 'forward' : 'back');

function say(ctx: ToyContext, text: string): void {
  void ctx.speech.speak(text).catch(() => {});
}

interface Line {
  root: HTMLElement;
  position(): number;
  setPosition(n: number): void;
}

/** A 0–20 number line in two rows with one frog that sits on the current number. */
function createLine(start: number): Line {
  let pos = start;
  const frog = h('div', { class: 'frog-hop text-2xl sm:text-3xl leading-none select-none', role: 'frog', text: '🐸' });
  frog.setAttribute('aria-hidden', 'true');
  const slots: HTMLElement[] = [];

  const makeRow = (from: number, to: number) => {
    const row = h('div', { class: 'flex w-full min-w-0 gap-0.5' });
    for (let n = from; n <= to; n++) {
      const slot = h('div', { class: 'h-8 sm:h-10 flex items-end justify-center' });
      slots[n] = slot;
      const tick = h('div', {
        class: `flex-1 min-w-0 flex flex-col items-center rounded-lg pt-1 ${n % 5 === 0 ? 'bg-sky-50' : ''}`,
        role: 'tick', attrs: { 'data-n': String(n) },
      }, slot,
        h('div', { class: 'w-0.5 h-2 bg-slate-400' }),
        h('div', { class: `font-display text-xs sm:text-sm font-bold ${n % 5 === 0 ? 'text-ocean' : 'text-slate-500'}`, text: String(n) }));
      row.append(tick);
    }
    return row;
  };
  const root = h('div', { class: 'bg-white rounded-3xl p-2 sm:p-3 border-4 border-sky-100 toy-card flex flex-col gap-2 w-full min-w-0' },
    makeRow(0, ROW_BREAK), makeRow(ROW_BREAK + 1, MAX));

  const setPosition = (n: number) => {
    pos = clamp(n);
    slots[pos].append(frog);
    frog.dataset.position = String(pos);
    // restart the little hop animation
    frog.classList.remove('frog-hop');
    void frog.offsetWidth;
    frog.classList.add('frog-hop');
  };
  setPosition(start);
  return { root, position: () => pos, setPosition };
}

function hopButtons(onHop: (delta: number) => void): HTMLElement {
  const btns = HOPS.map(d => {
    const b = button(hopLabel(d), () => onHop(d),
      `text-2xl ${d > 0 ? 'bg-mint text-white' : 'bg-amber-toy text-white'} flex-1 min-h-14`, 'hop');
    b.dataset.delta = String(d);
    b.setAttribute('aria-label', d > 0 ? `Hop forward ${d}` : `Hop back ${-d}`);
    return b;
  });
  return h('div', { class: 'flex gap-2 w-full min-w-0' }, ...btns);
}

function explore(el: HTMLElement, ctx: ToyContext): View {
  const line = createLine(0);
  const countEl = h('div', { class: 'font-display text-7xl font-bold text-coral leading-none', role: 'count', text: '0' });
  countEl.setAttribute('aria-live', 'polite');
  const speakBtn = button('🔊', () => say(ctx, String(line.position())), 'bg-amber-toy text-white text-2xl', 'speak');
  speakBtn.setAttribute('aria-label', 'Say the number');
  const hop = (d: number) => {
    line.setPosition(line.position() + d);
    countEl.textContent = String(line.position());
    ctx.sfx.tick();
    if (ctx.autoRead) say(ctx, String(line.position()));
  };
  const root = h('div', { class: 'flex flex-col gap-4 w-full min-w-0 max-w-[640px] mx-auto' },
    h('div', { class: 'bg-white rounded-3xl p-3 border-4 border-sky-100 toy-card flex items-center justify-center gap-5' }, countEl, speakBtn),
    line.root,
    hopButtons(hop),
    h('p', { class: 'text-center text-sm font-bold text-slate-500', text: 'Tap a button to make the frog hop!' }));
  el.append(root);
  // With auto-read on, the starting number is spoken too.
  if (ctx.autoRead) say(ctx, '0');
  return { destroy: () => root.remove() };
}

function renderChallenge(el: HTMLElement, q: NumberLineQuestion, ctx: ToyContext): ChallengeView<number> {
  const line = createLine(q.a);
  const countEl = h('div', { class: 'font-display text-5xl font-bold text-coral leading-none', role: 'count', text: String(q.a) });
  const hop = (d: number) => {
    line.setPosition(line.position() + d);
    countEl.textContent = String(line.position());
    ctx.sfx.tick();
  };
  const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' },
    h('div', { class: 'bg-white rounded-2xl px-5 py-2 border-4 border-sky-100 toy-card' }, countEl),
    line.root, hopButtons(hop));
  el.append(root);
  return {
    getAnswer: () => line.position(),
    reset: () => { line.setPosition(q.a); countEl.textContent = String(q.a); },
    destroy: () => root.remove(),
  };
}

function generateQuestions(_stage: Stage, count: number, rng: Rng): NumberLineQuestion[] {
  const out: NumberLineQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const op: '+' | '−' = rng() < 0.5 ? '+' : '−';
    let a: number, b: number, answer: number;
    if (op === '+') {
      a = randInt(rng, 0, MAX - 1);
      b = randInt(rng, 1, MAX - a);
      answer = a + b;
    } else {
      a = randInt(rng, 1, MAX);
      b = randInt(rng, 1, a);
      answer = a - b;
    }
    out.push({ id: `q${i + 1}`, prompt: `${a} ${op} ${b} = ?`, spoken: `${a} ${op === '+' ? 'plus' : 'take away'} ${b}`, a, op, b, answer, target: answer });
  }
  return out;
}

/** Every number the frog visits after leaving `a`, in order. */
function path(q: NumberLineQuestion): number[] {
  const step = q.op === '+' ? 1 : -1;
  return Array.from({ length: q.b }, (_, i) => q.a + step * (i + 1));
}

export const numberLineToy: Toy<NumberLineQuestion, number> = {
  meta: {
    id: 'numberLine', subject: 'math', stages: [1], title: 'Number Line Hops', icon: '🐸',
    objective: 'Add and subtract small numbers by hopping forwards and backwards along a number line up to 20.',
  },
  explore,
  generateQuestions,
  renderChallenge,
  check(q, answer) {
    if (answer === q.answer) return { correct: true };
    return { correct: false, hint: `Start at ${q.a} and hop ${q.b} ${dirWord(q.op)}.` };
  },
  describeAnswer: (_q, answer) => String(answer),
  explain(q, answer) {
    return {
      why: `You landed on ${answer}.`,
      how: `Start at ${q.a}, hop ${q.b} ${dirWord(q.op)}: ${path(q).join(', ')}… you land on ${q.answer}.`,
    };
  },
  async demonstrate(el, q, ctx) {
    const line = createLine(q.a);
    const countEl = h('div', { class: 'font-display text-5xl font-bold text-coral leading-none', role: 'count', text: String(q.a) });
    const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' },
      h('div', { class: 'bg-white rounded-2xl px-5 py-2 border-4 border-sky-100 toy-card' }, countEl), line.root);
    el.append(root);
    const view: View = { destroy: () => root.remove() };
    if (ctx.autoRead) say(ctx, String(q.a));
    for (const n of path(q)) {
      await sleep(DEMO_STEP_MS);
      if (!root.isConnected) return view; // removed (self or any ancestor) mid-way: stop cleanly
      line.setPosition(n);
      countEl.textContent = String(n);
      ctx.sfx.tick();
      if (ctx.autoRead) say(ctx, String(n));
    }
    return view;
  },
};
