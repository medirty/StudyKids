import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { randInt } from '../../../core/rng';
import { button, h } from '../../../ui/dom';
import { numberToWords } from './words';

export type PlaceValueQuestion = Question & { target: number };
export interface PlaceValueAnswer { h: number; t: number; o: number }
type Col = 'h' | 't' | 'o';

const COLS: Col[] = ['h', 't', 'o'];
const COL_NAME: Record<Col, string> = { h: 'hundreds', t: 'tens', o: 'ones' };
const COL_SINGULAR: Record<Col, string> = { h: 'hundred', t: 'ten', o: 'one' };
const COL_VALUE: Record<Col, number> = { h: 100, t: 10, o: 1 };
const COL_LABEL: Record<Col, string> = { h: 'Hundreds', t: 'Tens', o: 'Ones' };
const DEMO_STEP_MS = 450;

const valueOf = (a: PlaceValueAnswer) => a.h * 100 + a.t * 10 + a.o;
const say = (ctx: ToyContext, text: string): void => { void ctx.speech.speak(text).catch(() => {}); };
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const countText = (col: Col, n: number) => `${n} ${n === 1 ? COL_SINGULAR[col] : COL_NAME[col]}`;

const GRID = 'rgba(255,255,255,0.75)';
const lines = (dir: 'to right' | 'to bottom', step: number) =>
  `repeating-linear-gradient(${dir}, ${GRID} 0 1px, transparent 1px ${step}px)`;

/** One block: a flat is a 10x10 grid, a rod is 10 cells in a line, a cube is a single cell. */
function makeBlock(col: Col): HTMLElement {
  const b = h('div', { role: 'pv-block', attrs: { 'data-col': col, 'aria-hidden': 'true' } });
  if (col === 'h') {
    b.className = 'rounded-sm border border-ocean bg-sky-300';
    Object.assign(b.style, { width: '28px', height: '28px', backgroundImage: `${lines('to right', 2.8)}, ${lines('to bottom', 2.8)}` });
  } else if (col === 't') {
    b.className = 'rounded-sm border border-amber-toy bg-amber-300';
    Object.assign(b.style, { width: '9px', height: '64px', backgroundImage: lines('to bottom', 6.4) });
  } else {
    b.className = 'rounded-sm border border-mint bg-emerald-300';
    Object.assign(b.style, { width: '16px', height: '16px' });
  }
  return b;
}
const AREA_CLASS: Record<Col, string> = {
  h: 'grid grid-cols-3 gap-1 content-end justify-center',
  t: 'flex items-end justify-center gap-0.5',
  o: 'grid grid-cols-3 gap-1 content-end justify-center',
};

interface Board {
  root: HTMLElement;
  get(): PlaceValueAnswer;
  setCol(col: Col, n: number): void;
  clear(): void;
}

/** Three columns of blocks. With onChange the +/- buttons are shown; onChange fires only for the child's taps. */
function createBoard(onChange: (() => void) | null): Board {
  const state: PlaceValueAnswer = { h: 0, t: 0, o: 0 };
  const areas = {} as Record<Col, HTMLElement>;
  const digits = {} as Record<Col, HTMLElement>;
  const pluses = {} as Record<Col, HTMLButtonElement>;
  const minuses = {} as Record<Col, HTMLButtonElement>;

  const paint = (col: Col) => {
    const n = state[col];
    areas[col].replaceChildren(...Array.from({ length: n }, () => makeBlock(col)));
    digits[col].textContent = String(n);
    areas[col].setAttribute('aria-label', countText(col, n));
    if (onChange) {
      pluses[col].disabled = n >= 9;
      minuses[col].disabled = n <= 0;
    }
  };
  const setCol = (col: Col, n: number) => { state[col] = Math.max(0, Math.min(9, n)); paint(col); };

  const columns = COLS.map(col => {
    areas[col] = h('div', { class: `${AREA_CLASS[col]} min-h-24 w-full`, role: 'pv-area', attrs: { 'data-col': col, role: 'img' } });
    digits[col] = h('div', { class: 'font-display text-4xl font-bold text-slate-700 leading-none', role: 'pv-digit', attrs: { 'data-col': col } });
    const card = h('div', { class: 'bg-white rounded-2xl border-4 border-slate-200 p-1.5 flex flex-col items-center gap-1.5 min-w-0' },
      h('div', { class: 'font-display text-sm font-bold text-slate-500', text: COL_LABEL[col] }),
      areas[col], digits[col]);
    if (onChange) {
      const step = (d: number) => { setCol(col, state[col] + d); onChange(); };
      pluses[col] = button('+', () => step(1), 'bg-mint text-white text-2xl w-full', 'pv-plus');
      minuses[col] = button('−', () => step(-1), 'bg-white border-2 border-slate-300 text-slate-600 text-2xl w-full', 'pv-minus');
      for (const [b, label] of [[pluses[col], 'Add a'], [minuses[col], 'Take away a']] as const) {
        b.dataset.col = col;
        b.setAttribute('aria-label', `${label} ${COL_SINGULAR[col]}`);
        b.className += ' disabled:opacity-40 disabled:cursor-default';
      }
      card.append(pluses[col], minuses[col]);
    }
    paint(col);
    return card;
  });

  return {
    root: h('div', { class: 'grid grid-cols-3 gap-2 w-full min-w-0' }, ...columns),
    get: () => ({ ...state }),
    setCol,
    clear() { for (const c of COLS) setCol(c, 0); },
  };
}

function explore(el: HTMLElement, ctx: ToyContext): View {
  const valueEl = h('div', { class: 'font-display text-6xl font-bold text-coral leading-none', role: 'pv-value', text: '0' });
  valueEl.setAttribute('aria-live', 'polite');
  const wordsEl = h('div', { class: 'font-display text-lg font-bold text-slate-600 text-center min-h-7', role: 'pv-words', text: 'zero' });
  const words = () => numberToWords(valueOf(board.get()));
  const refresh = () => {
    valueEl.textContent = String(valueOf(board.get()));
    wordsEl.textContent = words();
  };
  const board = createBoard(() => {
    refresh();
    ctx.sfx.tick();
    if (ctx.autoRead) say(ctx, words());
  });
  const speakBtn = button('🔊', () => say(ctx, words()), 'bg-amber-toy text-white text-2xl', 'speak');
  speakBtn.setAttribute('aria-label', 'Say the number');
  const clearBtn = button('🧺 Start again', () => { board.clear(); refresh(); ctx.sfx.tick(); }, 'bg-white border-2 border-slate-300 text-slate-600 text-sm', 'clear');

  const root = h('div', { class: 'flex flex-col gap-3 w-full min-w-0 max-w-[640px] mx-auto' },
    h('div', { class: 'bg-white rounded-3xl p-3 border-4 border-sky-100 toy-card flex items-center justify-center gap-4' }, valueEl, speakBtn),
    wordsEl,
    board.root,
    h('p', { class: 'text-center text-sm font-bold text-slate-500', text: 'A flat is 100, a rod is 10, a cube is 1. Tap + to add blocks.' }),
    h('div', { class: 'flex justify-center' }, clearBtn));
  el.append(root);
  return { destroy: () => root.remove() };
}

function renderChallenge(el: HTMLElement, _q: PlaceValueQuestion, ctx: ToyContext): ChallengeView<PlaceValueAnswer> {
  const valueEl = h('div', { class: 'font-display text-5xl font-bold text-coral leading-none', role: 'pv-value', text: '0' });
  const board = createBoard(() => { valueEl.textContent = String(valueOf(board.get())); ctx.sfx.tick(); });
  const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' },
    h('div', { class: 'bg-white rounded-2xl px-5 py-2 border-4 border-sky-100 toy-card' }, valueEl),
    board.root);
  el.append(root);
  return {
    getAnswer: () => board.get(),
    reset: () => { board.clear(); valueEl.textContent = '0'; },
    destroy: () => root.remove(),
  };
}

function generateQuestions(_stage: Stage, count: number, rng: Rng): PlaceValueQuestion[] {
  const out: PlaceValueQuestion[] = [];
  let prev = -1;
  for (let i = 0; i < count; i++) {
    let target: number;
    do { target = randInt(rng, 100, 999); } while (target === prev);
    prev = target;
    out.push({ id: `q${i + 1}`, prompt: `Make ${target}`, target });
  }
  return out;
}

const digitsOf = (n: number): PlaceValueAnswer => ({ h: Math.floor(n / 100), t: Math.floor(n / 10) % 10, o: n % 10 });

export const placeValueToy: Toy<PlaceValueQuestion, PlaceValueAnswer> = {
  meta: {
    id: 'placeValue', subject: 'math', stages: [3], title: 'Place Value Blocks', icon: '🧱',
    objective: 'Understand hundreds, tens and ones in numbers up to 1000 by building them from blocks.',
  },
  explore,
  generateQuestions,
  renderChallenge,
  check(q, answer) {
    if (valueOf(answer) === q.target) return { correct: true };
    const want = digitsOf(q.target);
    const wrong = COLS.find(c => answer[c] !== want[c]) ?? 'o';
    return { correct: false, hint: `Check your ${COL_NAME[wrong]}.` };
  },
  describeAnswer: (_q, answer) => String(valueOf(answer)),
  explain(q, answer) {
    const d = digitsOf(q.target);
    return {
      why: `You made ${valueOf(answer)}.`,
      how: `${q.target} = ${countText('h', d.h)}, ${countText('t', d.t)} and ${countText('o', d.o)}.`,
    };
  },
  async demonstrate(el, q, ctx) {
    const valueEl = h('div', { class: 'font-display text-5xl font-bold text-coral leading-none', role: 'pv-value', text: '0' });
    const board = createBoard(null);
    const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' },
      h('div', { class: 'bg-white rounded-2xl px-5 py-2 border-4 border-sky-100 toy-card' }, valueEl),
      board.root);
    el.append(root);
    const view: View = { destroy: () => root.remove() };
    const want = digitsOf(q.target);
    let running = 0;
    for (const col of COLS) {
      for (let i = 1; i <= want[col]; i++) {
        await sleep(DEMO_STEP_MS);
        if (!root.isConnected) return view; // removed (self or any ancestor) mid-way: stop cleanly
        board.setCol(col, i);
        running += COL_VALUE[col];
        valueEl.textContent = String(running);
        ctx.sfx.tick();
        if (ctx.autoRead) say(ctx, numberToWords(running));
      }
    }
    return view;
  },
};
