import type { ChallengeView, CheckResult, Explanation, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { pick, randInt } from '../../../core/rng';
import { button, h } from '../../../ui/dom';

export type MultiplyQuestion = Question & { a: number; b: number; answer: number; target: number };

const TABLES = [2, 3, 4, 5, 8, 10] as const;
const MAX_DIGITS = 3;
const MAX_DOT_PX = 36;
const DEMO_ROW_MS = 500;
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Count in b's, a times: (4, 3) -> 3, 6, 9, 12. */
export function skipCount(a: number, b: number): number[] {
  return Array.from({ length: a }, (_, i) => b * (i + 1));
}

function generateQuestions(_stage: Stage, count: number, rng: Rng): MultiplyQuestion[] {
  const out: MultiplyQuestion[] = [];
  let prev = '';
  for (let i = 0; i < count; i++) {
    let a: number, b: number;
    do {
      a = randInt(rng, 1, 10);
      b = pick(rng, TABLES);
    } while (`${a}x${b}` === prev);
    prev = `${a}x${b}`;
    out.push({ id: `q${i + 1}`, prompt: `${a} × ${b} = ?`, spoken: `${a} times ${b}`, a, b, answer: a * b, target: a * b });
  }
  return out;
}

function say(ctx: ToyContext, text: string): void {
  void ctx.speech.speak(text).catch(() => {});
}

interface DotGrid {
  root: HTMLElement;
  addRow(row: number): void;
}

/** Rows of dots in a CSS grid whose width is capped so a 10 x 10 array always fits (dots shrink with the column). */
function createDotGrid(cols: number): DotGrid {
  const root = h('div', {
    class: 'grid gap-1 mx-auto',
    role: 'dot-grid',
    style: { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, width: `min(100%, ${cols * MAX_DOT_PX}px)` },
  });
  return {
    root,
    addRow(row) {
      const colour = row % 2 === 0 ? 'bg-coral' : 'bg-ocean';
      for (let c = 0; c < cols; c++) {
        root.append(h('span', { class: `block aspect-square rounded-full ${colour}`, role: 'dot', attrs: { 'data-row': String(row) } }));
      }
    },
  };
}

function dotArray(rows: number, cols: number): HTMLElement {
  const g = createDotGrid(cols);
  for (let r = 0; r < rows; r++) g.addRow(r);
  return g.root;
}

const equation = (a: number, b: number) => `${a} × ${b} = ${a * b}`;
const spokenProduct = (a: number, b: number) => `${a} times ${b} is ${a * b}`;

function explore(el: HTMLElement, ctx: ToyContext): View {
  let rows = 3;
  let cols = 4;

  const equationEl = h('div', { class: 'font-display text-4xl sm:text-5xl font-bold text-slate-800 leading-tight', role: 'equation' });
  equationEl.setAttribute('aria-live', 'polite');
  const skipEl = h('div', { class: 'font-display text-xl sm:text-2xl font-bold text-ocean break-words', role: 'skip' });
  const dotsBox = h('div', { class: 'bg-white rounded-3xl border-4 border-amber-100 toy-card p-3 sm:p-4 w-full min-w-0' });
  const speakBtn = button('🔊', () => say(ctx, spokenProduct(rows, cols)), 'bg-amber-toy text-white text-2xl', 'speak');
  speakBtn.setAttribute('aria-label', 'Say the multiplication');

  const update = () => {
    equationEl.textContent = equation(rows, cols);
    skipEl.textContent = skipCount(rows, cols).join(', ');
    dotsBox.replaceChildren(dotArray(rows, cols));
    for (const [k, v] of Object.entries({ rows, cols })) valueEls[k]!.textContent = String(v);
  };
  const change = (which: 'rows' | 'cols', delta: number) => {
    const cur = which === 'rows' ? rows : cols;
    const next = Math.min(10, Math.max(1, cur + delta));
    if (next === cur) return;
    if (which === 'rows') rows = next; else cols = next;
    ctx.sfx.tick();
    update();
    if (ctx.autoRead) say(ctx, spokenProduct(rows, cols));
  };

  const valueEls: Record<string, HTMLElement> = {};
  const stepper = (which: 'rows' | 'cols', label: string) => {
    const value = h('span', { class: 'font-display text-3xl font-bold text-slate-800 min-w-9 text-center', role: `${which}-value` });
    valueEls[which] = value;
    const down = button('−', () => change(which, -1), 'bg-sky-100 text-sky-900 border-2 border-sky-200 text-2xl !px-0', `${which}-down`);
    const up = button('+', () => change(which, 1), 'bg-sky-100 text-sky-900 border-2 border-sky-200 text-2xl !px-0', `${which}-up`);
    down.setAttribute('aria-label', `Fewer ${label}`);
    up.setAttribute('aria-label', `More ${label}`);
    return h('div', { class: 'flex flex-col items-center gap-1 min-w-0' },
      h('span', { class: 'text-xs font-extrabold uppercase tracking-wider text-slate-400', text: label }),
      h('div', { class: 'flex items-center gap-1' }, down, value, up));
  };

  const steppers = h('div', { class: 'bg-white rounded-3xl p-3 border-4 border-sky-100 toy-card grid grid-cols-2 gap-2' },
    stepper('rows', 'Rows (groups)'), stepper('cols', 'Columns (in each)'));
  const sayCard = h('div', { class: 'bg-white rounded-3xl p-4 border-4 border-emerald-100 toy-card text-center flex flex-col items-center gap-2' },
    h('div', { class: 'flex items-center justify-center gap-4' }, equationEl, speakBtn),
    h('div', { class: 'text-xs font-extrabold uppercase tracking-wider text-slate-400', text: 'Counting in steps' }), skipEl);

  const root = h('div', { class: 'flex flex-col gap-4 w-full min-w-0 max-w-[640px] mx-auto' }, steppers, dotsBox, sayCard);
  el.append(root);
  update();
  return { destroy: () => root.remove() };
}

function renderChallenge(el: HTMLElement, q: MultiplyQuestion, ctx: ToyContext): ChallengeView<number | null> {
  let digits = '';
  let showDots = false;

  const answerEl = h('div', { class: 'font-display text-5xl font-bold text-coral leading-none min-w-24 text-center', role: 'answer' });
  const dotsBox = h('div', { class: 'w-full min-w-0' });
  const paint = () => {
    answerEl.textContent = digits === '' ? '?' : digits;
    answerEl.classList.toggle('text-slate-300', digits === '');
  };
  const press = (k: string) => {
    if (k === 'back') digits = digits.slice(0, -1);
    else if (digits.length < MAX_DIGITS) digits = digits === '0' ? k : digits + k;
    ctx.sfx.tick();
    paint();
  };

  const dotsToggle = button('🔍 Show dots', () => {
    showDots = !showDots;
    dotsBox.replaceChildren(...(showDots ? [h('div', { class: 'bg-white rounded-2xl border-4 border-amber-100 p-3' }, dotArray(q.a, q.b))] : []));
    dotsToggle.textContent = showDots ? '🙈 Hide dots' : '🔍 Show dots';
    dotsToggle.setAttribute('aria-pressed', String(showDots));
  }, 'bg-white border-2 border-slate-300 text-slate-600 text-sm', 'dots-toggle');
  dotsToggle.setAttribute('aria-pressed', 'false');

  const padKey = (k: string, label: string, extra = '') => {
    const b = button(label, () => press(k), `bg-sky-100 text-sky-900 border-2 border-sky-200 text-2xl w-full ${extra}`, 'pad-key');
    b.dataset.key = k;
    if (k === 'back') b.setAttribute('aria-label', 'Delete last digit');
    return b;
  };
  const pad = h('div', { class: 'grid grid-cols-3 gap-2 w-full max-w-[280px]' },
    ...['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(k => padKey(k, k)),
    padKey('0', '0', 'col-span-2'), padKey('back', '⌫'));

  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('back');
  };
  document.addEventListener('keydown', onKey);

  const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' },
    h('div', { class: 'bg-white rounded-2xl px-6 py-2 border-4 border-sky-100 toy-card' }, answerEl),
    pad, dotsToggle, dotsBox);
  el.append(root);
  paint();

  return {
    getAnswer: () => (digits === '' ? null : Number(digits)),
    reset: () => { digits = ''; paint(); },
    destroy: () => { document.removeEventListener('keydown', onKey); root.remove(); },
  };
}

function check(q: MultiplyQuestion, answer: number | null): CheckResult {
  if (answer === null) return { correct: false, hint: 'Type your answer with the number pad.' };
  if (answer === q.answer) return { correct: true };
  return { correct: false, hint: `Count in ${q.b}s, ${q.a} times.` };
}

function explain(q: MultiplyQuestion, answer: number | null): Explanation {
  return {
    why: answer === null ? `${q.a} × ${q.b} needs a number answer.` : `${q.a} × ${q.b} is not ${answer}.`,
    how: `${q.a} groups of ${q.b}: ${skipCount(q.a, q.b).join(', ')} → ${q.answer}.`,
  };
}

export const multiplyToy: Toy<MultiplyQuestion, number | null> = {
  meta: {
    id: 'multiply', subject: 'math', stages: [3], title: 'Times Tables', icon: '✖️',
    objective: 'Know the 2, 3, 4, 5, 8 and 10 times tables, and see multiplication as equal groups in an array.',
  },
  explore,
  generateQuestions,
  renderChallenge,
  check,
  describeAnswer: (_q, answer) => (answer === null ? 'nothing yet' : String(answer)),
  explain,
  async demonstrate(el, q, ctx) {
    const grid = createDotGrid(q.b);
    const equationEl = h('div', { class: 'font-display text-4xl font-bold text-slate-800 leading-tight min-h-12', role: 'equation' });
    const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' },
      h('div', { class: 'bg-white rounded-3xl border-4 border-amber-100 toy-card p-3 sm:p-4 w-full min-w-0' }, grid.root), equationEl);
    el.append(root);
    const view: View = { destroy: () => root.remove() };
    const counts = skipCount(q.a, q.b);
    for (let r = 0; r < q.a; r++) {
      await sleep(DEMO_ROW_MS);
      if (!root.isConnected) return view; // removed (self or any ancestor) mid-way: stop cleanly
      grid.addRow(r);
      equationEl.textContent = counts.slice(0, r + 1).join(', ');
      ctx.sfx.tick();
      if (ctx.autoRead) say(ctx, String(counts[r]));
    }
    equationEl.textContent = equation(q.a, q.b);
    if (ctx.autoRead) say(ctx, spokenProduct(q.a, q.b));
    return view;
  },
};
