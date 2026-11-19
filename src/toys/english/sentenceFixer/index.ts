import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { shuffle } from '../../../core/rng';
import { SENTENCES } from '../../../content/english/sentences';
import { BTN, button, h } from '../../../ui/dom';

export type SentenceQuestion = Question & { words: string[]; answerWords: string[] };
export type SentenceAnswer = { capitalised: number[]; stop: boolean };

const STEP_MS = 700;
const say = (ctx: ToyContext, text: string) => { void ctx.speech.speak(text).catch(() => {}); };
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/** Indexes that must start with a capital: the first word and every standalone "i". */
export function requiredCapitals(words: readonly string[]): number[] {
  return words.map((w, i) => (i === 0 || w === 'i' ? i : -1)).filter(i => i >= 0);
}

export function questionFromSentence(sentence: string, id: string): SentenceQuestion {
  const answerWords = sentence.replace(/\.$/, '').split(' ');
  const words = answerWords.map(w => w.toLowerCase());
  return { id, prompt: 'Fix the sentence', spoken: `Fix the sentence. ${words.join(' ')}`, words, answerWords };
}

const written = (q: SentenceQuestion, a: SentenceAnswer) => {
  const caps = new Set(a.capitalised);
  return q.words.map((w, i) => (caps.has(i) ? cap(w) : w)).join(' ') + (a.stop ? '.' : '');
};

/** Words row plus the full-stop gap. With `toggles`, each word gets an "Aa" button that changes its capital. */
function createBoard(q: SentenceQuestion, ctx: ToyContext, toggles: boolean) {
  const caps = new Set<number>();
  let stopOn = false;
  const wordEls = q.words.map((w, i) => {
    const b = h('button', {
      class: `${BTN} bg-white border-4 border-sand text-2xl min-h-14 toy-card`,
      role: 'word', text: w, attrs: { type: 'button' },
    });
    b.addEventListener('click', () => {
      pop(b);
      ctx.sfx.tick();
      say(ctx, q.answerWords[i]); // explicit tap: speaks only, never changes the answer
    });
    return b;
  });
  const capEls = toggles ? q.words.map((w, i) => {
    const b = h('button', {
      class: `${BTN} bg-white border-4 border-sky-100 text-lg min-h-12 min-w-12 px-2 py-1`,
      role: 'cap-toggle', text: 'Aa', attrs: { type: 'button', 'aria-label': `Capital letter for ${w}`, 'aria-pressed': 'false' },
    });
    b.addEventListener('click', () => { pop(wordEls[i]); ctx.sfx.tick(); api.toggleCap(i); });
    return b;
  }) : [];
  const stopEl = h('button', {
    class: `${BTN} border-4 border-dashed border-sky-300 text-4xl min-h-14 min-w-14 bg-white/60`,
    role: 'stop', attrs: { type: 'button', 'aria-label': 'Full stop gap', 'data-on': 'false' },
  });
  const cols = wordEls.map((w, i) => h('div', { class: 'flex flex-col items-center gap-1' }, w, capEls[i]));
  const root = h('div', { class: 'flex flex-wrap items-start justify-center gap-2 w-full min-w-0', attrs: { 'aria-label': 'Sentence' } }, ...cols,
    toggles ? h('div', { class: 'flex flex-col items-center' }, stopEl) : stopEl);
  const draw = () => {
    wordEls.forEach((b, i) => {
      b.textContent = caps.has(i) ? cap(q.words[i]) : q.words[i];
      b.setAttribute('aria-label', `Word ${b.textContent}`);
      capEls[i]?.setAttribute('aria-pressed', String(caps.has(i)));
      capEls[i]?.classList.toggle('bg-sky-100', caps.has(i));
    });
    stopEl.textContent = stopOn ? '.' : '';
    stopEl.dataset.on = String(stopOn);
    stopEl.classList.toggle('border-dashed', !stopOn);
    stopEl.classList.toggle('border-solid', stopOn);
    stopEl.classList.toggle('border-sky-300', !stopOn);
    stopEl.classList.toggle('border-mint', stopOn);
  };
  const api = {
    root, wordEls, capEls, stopEl,
    setCap(i: number, on: boolean) { if (on) caps.add(i); else caps.delete(i); draw(); },
    toggleCap(i: number) { api.setCap(i, !caps.has(i)); },
    setStop(on: boolean) { stopOn = on; draw(); },
    toggleStop() { api.setStop(!stopOn); },
    answer: (): SentenceAnswer => ({ capitalised: [...caps].sort((a, b) => a - b), stop: stopOn }),
    reset() { caps.clear(); stopOn = false; draw(); },
  };
  draw();
  return api;
}

function pop(el: HTMLElement) {
  el.classList.remove('kit-pop');
  void el.offsetWidth;
  el.classList.add('kit-pop');
}

function explore(el: HTMLElement, ctx: ToyContext): View {
  let n = 0;
  let board: ReturnType<typeof createBoard>;
  let fixed = true;
  const holder = h('div', { class: 'w-full min-w-0' });
  const toggle = button('', () => { fixed = !fixed; apply(true); }, 'bg-coral text-white text-xl', 'toggle');
  const next = button('Next sentence ➡️', () => { n = (n + 1) % SENTENCES.length; fixed = true; build(); }, 'bg-white border-4 border-sand text-lg', 'next');
  const apply = (animate: boolean) => {
    for (const i of requiredCapitals(curQ.words)) board.setCap(i, fixed);
    board.setStop(fixed);
    toggle.textContent = fixed ? 'Make it wrong' : 'Fix it';
    if (animate) { pop(board.wordEls[0]); pop(board.stopEl); ctx.sfx.tick(); }
  };
  let curQ: SentenceQuestion;
  const build = () => {
    curQ = questionFromSentence(SENTENCES[n], `e${n}`);
    board = createBoard(curQ, ctx, false);
    holder.replaceChildren(board.root);
    apply(false);
  };
  const root = h('div', { class: 'flex flex-col items-center gap-4 w-full min-w-0 max-w-[640px] mx-auto' },
    h('p', { class: 'text-center text-sm font-bold text-slate-500', text: 'Tap a word to hear it.' }),
    h('div', { class: 'bg-white rounded-3xl p-4 border-4 border-sky-100 toy-card w-full' }, holder),
    toggle, next);
  build();
  el.append(root);
  return { destroy: () => root.remove() };
}

function renderChallenge(el: HTMLElement, q: SentenceQuestion, ctx: ToyContext): ChallengeView<SentenceAnswer> {
  const board = createBoard(q, ctx, true);
  board.stopEl.addEventListener('click', () => { pop(board.stopEl); ctx.sfx.tick(); board.toggleStop(); });
  const root = h('div', { class: 'flex flex-col items-center gap-4 w-full min-w-0 max-w-[640px] mx-auto' },
    h('div', { class: 'bg-white rounded-3xl p-4 border-4 border-sky-100 toy-card w-full' }, board.root),
    h('p', { class: 'text-center text-sm font-bold text-slate-500', text: 'Tap a word to hear it. Tap Aa for a capital letter. Tap the gap for a full stop.' }));
  el.append(root);
  return { getAnswer: board.answer, reset: () => board.reset(), destroy: () => root.remove() };
}

function generateQuestions(_stage: Stage, count: number, rng: Rng): SentenceQuestion[] {
  const out: SentenceQuestion[] = [];
  let bag: string[] = [];
  let prev = '';
  for (let i = 0; i < count; i++) {
    if (bag.length === 0) {
      bag = shuffle(rng, SENTENCES);
      if (bag[bag.length - 1] === prev) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    const s = bag.pop()!;
    prev = s;
    out.push(questionFromSentence(s, `q${i + 1}`));
  }
  return out;
}

const correctSentence = (q: SentenceQuestion) => `${q.answerWords.join(' ')}.`;

export const sentenceFixerToy: Toy<SentenceQuestion, SentenceAnswer> = {
  meta: {
    id: 'sentenceFixer', subject: 'english', stages: [1], title: 'Sentence Fixer', icon: '✏️',
    objective: 'Fix a sentence by adding a capital letter at the start and a full stop at the end.',
  },
  explore,
  generateQuestions,
  renderChallenge,
  check(q, a) {
    const need = requiredCapitals(q.words);
    const have = [...new Set(a.capitalised)].sort((x, y) => x - y);
    if (!have.includes(0)) return { correct: false, hint: 'A sentence starts with a capital letter.' };
    if (have.some(i => !need.includes(i))) {
      return { correct: false, hint: 'Only the first word (and "I") needs a capital letter.' };
    }
    if (have.length !== need.length) return { correct: false, hint: 'The word "I" always needs a capital letter.' };
    if (!a.stop) return { correct: false, hint: 'A sentence ends with a full stop.' };
    return { correct: true };
  },
  describeAnswer: (q, a) => `You wrote "${written(q, a)}"`,
  explain(q, a) {
    return {
      why: `You wrote "${written(q, a)}"`,
      how: `"${correctSentence(q)}" starts with a capital letter and ends with a full stop.`,
    };
  },
  async demonstrate(el, q, ctx) {
    const board = createBoard(q, ctx, false);
    const root = h('div', { class: 'flex flex-col items-center gap-4 w-full min-w-0 max-w-[640px] mx-auto' },
      h('div', { class: 'bg-white rounded-3xl p-4 border-4 border-sky-100 toy-card w-full' }, board.root));
    el.append(root);
    const view: View = { destroy: () => root.remove() };
    await sleep(STEP_MS);
    if (!root.isConnected) return view;
    for (const i of requiredCapitals(q.words)) board.setCap(i, true);
    pop(board.wordEls[0]);
    ctx.sfx.tick();
    await sleep(STEP_MS);
    if (!root.isConnected) return view;
    board.setStop(true);
    pop(board.stopEl);
    ctx.sfx.tick();
    if (ctx.autoRead) say(ctx, 'Now it is a proper sentence.');
    return view;
  },
};
