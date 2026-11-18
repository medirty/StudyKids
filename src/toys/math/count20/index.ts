import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { randInt, shuffle } from '../../../core/rng';
import { button, h } from '../../../ui/dom';

export type Count20Question = Question & { target: number };

const FRAME_SIZE = 10;
const TOTAL = FRAME_SIZE * 2;
const DEMO_STEP_MS = 400;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const plural = (n: number) => `${n} apple${n === 1 ? '' : 's'}`;

interface Board {
  root: HTMLElement;
  count(): number;
  fillTo(n: number): void;
  clear(): void;
  setCell(i: number, on: boolean): void;
}

/** Two ten-frames of tappable cells. onToggle fires only for taps made by the child. */
function createBoard(onToggle: (count: number) => void, interactive: boolean): Board {
  const state: boolean[] = new Array(TOTAL).fill(false);
  const nodes: HTMLButtonElement[] = [];
  const count = () => state.filter(Boolean).length;

  const paint = (i: number) => {
    const c = nodes[i];
    c.dataset.filled = String(state[i]);
    c.textContent = state[i] ? '🍎' : '';
    c.setAttribute('aria-label', state[i] ? `Apple ${i + 1}, tap to take away` : `Empty spot ${i + 1}, tap to add an apple`);
    c.className = `w-full min-h-12 aspect-square rounded-xl border-2 text-2xl sm:text-3xl flex items-center justify-center select-none ${
      state[i] ? 'bg-red-50 border-coral' : 'bg-white border-slate-300 border-dashed'} ${interactive ? 'cursor-pointer toy-btn' : ''}`;
  };
  const setCell = (i: number, on: boolean) => { state[i] = on; paint(i); };

  const frames = [0, 1].map(f => {
    const grid = h('div', { class: 'grid grid-cols-5 gap-1.5 sm:gap-2' });
    for (let k = 0; k < FRAME_SIZE; k++) {
      const i = f * FRAME_SIZE + k;
      const c = h('button', { attrs: { 'data-index': String(i) }, role: 'cell' });
      c.type = 'button';
      if (interactive) {
        c.addEventListener('click', () => { setCell(i, !state[i]); onToggle(count()); });
      } else {
        c.tabIndex = -1;
      }
      nodes.push(c);
      paint(i);
      grid.append(c);
    }
    return h('div', { class: 'bg-amber-50 rounded-2xl border-4 border-amber-200 p-2 sm:p-3 min-w-0' }, grid);
  });
  const root = h('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0' }, ...frames);

  return {
    root,
    count,
    fillTo(n) { for (let i = 0; i < TOTAL; i++) setCell(i, i < n); },
    clear() { for (let i = 0; i < TOTAL; i++) setCell(i, false); },
    setCell,
  };
}

function say(ctx: ToyContext, text: string): void {
  void ctx.speech.speak(text).catch(() => {});
}

function explore(el: HTMLElement, ctx: ToyContext): View {
  const countEl = h('div', { class: 'font-display text-7xl sm:text-8xl font-bold text-coral leading-none', role: 'count', text: '0' });
  countEl.setAttribute('aria-live', 'polite');
  const speakBtn = button('🔊', () => say(ctx, String(board.count())), 'bg-amber-toy text-white text-2xl', 'speak');
  speakBtn.setAttribute('aria-label', 'Say the number');

  const board = createBoard(n => {
    countEl.textContent = String(n);
    ctx.sfx.tick();
    if (ctx.autoRead) say(ctx, String(n));
  }, true);

  const clearBtn = button('🧺 Start again', () => { board.clear(); countEl.textContent = '0'; ctx.sfx.tick(); }, 'bg-white border-2 border-slate-300 text-slate-600 text-sm', 'clear');
  const numberCard = h('div', { class: 'bg-white rounded-3xl p-4 border-4 border-sky-100 toy-card flex items-center justify-center gap-5' },
    countEl, speakBtn);
  const hint = h('p', { class: 'text-center text-sm font-bold text-slate-500', text: 'Tap a spot to add an apple. Tap an apple to take it away.' });

  const root = h('div', { class: 'flex flex-col gap-4 w-full min-w-0 max-w-[640px] mx-auto' },
    numberCard, board.root, hint, h('div', { class: 'flex justify-center' }, clearBtn));
  el.append(root);
  return { destroy: () => root.remove() };
}

function renderChallenge(el: HTMLElement, _q: Count20Question, ctx: ToyContext): ChallengeView<number> {
  const countEl = h('div', { class: 'font-display text-5xl font-bold text-coral leading-none', role: 'count', text: '0' });
  const board = createBoard(n => { countEl.textContent = String(n); ctx.sfx.tick(); }, true);
  const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' },
    h('div', { class: 'bg-white rounded-2xl px-5 py-2 border-4 border-sky-100 toy-card' }, countEl), board.root);
  el.append(root);
  return {
    getAnswer: () => board.count(),
    reset: () => { board.clear(); countEl.textContent = '0'; },
    destroy: () => root.remove(),
  };
}

function generateQuestions(_stage: Stage, count: number, rng: Rng): Count20Question[] {
  const out: Count20Question[] = [];
  let bag: number[] = [];
  let prev = -1;
  for (let i = 0; i < count; i++) {
    if (bag.length === 0) {
      bag = shuffle(rng, Array.from({ length: 20 }, (_, k) => k + 1));
      if (bag[bag.length - 1] === prev && bag.length > 1) {
        const j = randInt(rng, 0, bag.length - 2);
        [bag[j], bag[bag.length - 1]] = [bag[bag.length - 1], bag[j]];
      }
    }
    const target = bag.pop()!;
    prev = target;
    out.push({ id: `q${i + 1}`, prompt: `Show me ${target}`, target });
  }
  return out;
}

export const count20Toy: Toy<Count20Question, number> = {
  meta: {
    id: 'count20', subject: 'math', stages: [1], title: 'Count to 20', icon: '🍎',
    objective: 'Count up to 20 objects, and see a number as one full ten plus some more.',
  },
  explore,
  generateQuestions,
  renderChallenge,
  check(q, answer) {
    if (answer === q.target) return { correct: true };
    const diff = Math.abs(q.target - answer);
    return { correct: false, hint: `That's ${answer}. You need ${diff} ${answer < q.target ? 'more' : 'fewer'} — count again!` };
  },
  describeAnswer: (_q, answer) => plural(answer),
  explain(q, answer) {
    const t = q.target;
    const diff = Math.abs(t - answer);
    return {
      why: `You put ${answer}. We needed ${t}, that is ${diff} ${answer < t ? 'more' : 'fewer'}.`,
      how: t > 10
        ? `Fill one ten-frame to make 10, then add ${t - 10} more.`
        : `Put ${t} apples, counting 1, 2, 3… up to ${t}.`,
    };
  },
  async demonstrate(el, q, ctx) {
    const countEl = h('div', { class: 'font-display text-5xl font-bold text-coral leading-none', role: 'count', text: '0' });
    const board = createBoard(() => {}, false);
    const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' },
      h('div', { class: 'bg-white rounded-2xl px-5 py-2 border-4 border-sky-100 toy-card' }, countEl), board.root);
    el.append(root);
    const view: View = { destroy: () => root.remove() };
    for (let i = 0; i < q.target; i++) {
      await sleep(DEMO_STEP_MS);
      if (!root.isConnected) return view; // removed (self or any ancestor) mid-way: stop cleanly
      board.setCell(i, true);
      countEl.textContent = String(i + 1);
      ctx.sfx.tick();
      if (ctx.autoRead) say(ctx, String(i + 1));
    }
    return view;
  },
};
