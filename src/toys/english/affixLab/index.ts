import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { shuffle } from '../../../core/rng';
import { AFFIXES, AFFIX_ENTRIES, ROOTS, affixInfo, combine, entryFor, entryOfWord, isAvoidedWord, type AffixEntry } from '../../../content/english/affixes';
import { button, h } from '../../../ui/dom';
import { createChoiceCards } from '../../../ui/kit/choiceCards';

export type AffixQuestion = Question & { root: string; affix: string; word: string; options: string[] };
export type AffixAnswer = { affix: string; word: string };

const STEP_MS = 650;
const NOT_REAL = "Hmm, that one isn't in our word lab — try another!";
const NO_ANSWER: AffixAnswer = { affix: '', word: '' };
const say = (ctx: ToyContext, text: string) => { void ctx.speech.speak(text).catch(() => {}); };
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function pop(el: HTMLElement) {
  el.classList.remove('kit-pop');
  void el.offsetWidth;
  el.classList.add('kit-pop');
}

function meaningOf(q: AffixQuestion): string {
  return (entryOfWord(q.word) ?? { meaning: '' }).meaning;
}

/** Three affixes that do not make a real word with this root, plus the right one, shuffled. */
function optionsFor(e: AffixEntry, rng: Rng): string[] {
  const wrong = shuffle(rng, AFFIXES.filter(a => a.id !== e.affix && !entryFor(e.root, a.id) && !isAvoidedWord(combine(e.root, a.id))).map(a => a.id)).slice(0, 3);
  return shuffle(rng, [e.affix, ...wrong]);
}

function makeQuestion(e: AffixEntry, id: string, rng: Rng): AffixQuestion {
  return {
    id, prompt: `Make a word that means "${e.meaning}"`,
    root: e.root, affix: e.affix, word: e.word, options: optionsFor(e, rng),
  };
}

function generateQuestions(_stage: Stage, count: number, rng: Rng): AffixQuestion[] {
  const out: AffixQuestion[] = [];
  let bag: AffixEntry[] = [];
  let prev = '';
  for (let i = 0; i < count; i++) {
    if (bag.length === 0) {
      bag = shuffle(rng, AFFIX_ENTRIES);
      if (bag[bag.length - 1].word === prev) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    const e = bag.pop()!;
    prev = e.word;
    out.push(makeQuestion(e, `q${i + 1}`, rng));
  }
  return out;
}

const cardClass = 'bg-white border-4 border-sand text-xl min-h-12';

function explore(el: HTMLElement, ctx: ToyContext): View {
  let root: string | null = null;
  let affix: string | null = null;
  const rootBtns = new Map<string, HTMLButtonElement>();
  const affixBtns = new Map<string, HTMLButtonElement>();

  const sumEl = h('div', { class: 'text-xl font-bold text-slate-500 min-h-8', role: 'sum', text: 'Pick a root and an affix' });
  const wordEl = h('div', { class: 'font-display font-bold text-4xl text-coral min-h-12 break-words max-w-full', role: 'word', attrs: { 'aria-live': 'polite' } });
  const meaningEl = h('div', { class: 'text-lg font-bold text-slate-600 min-h-14', role: 'meaning' });
  const result = h('div', {
    class: 'sticky top-1 z-10 bg-white rounded-3xl p-3 border-4 border-sky-100 toy-card flex flex-col items-center gap-1 w-full text-center',
    role: 'result', attrs: { 'data-valid': 'false' },
  }, sumEl, wordEl, meaningEl);

  const paintSelection = () => {
    for (const [r, b] of rootBtns) { b.setAttribute('aria-pressed', String(r === root)); b.classList.toggle('is-selected', r === root); }
    for (const [a, b] of affixBtns) { b.setAttribute('aria-pressed', String(a === affix)); b.classList.toggle('is-selected', a === affix); }
  };

  /** Shows the result for the current pair and returns what to say. */
  const update = (): string => {
    paintSelection();
    if (root && affix) {
      const label = affixInfo(affix).label;
      sumEl.textContent = affixInfo(affix).kind === 'prefix' ? `${label} + ${root}` : `${root} + ${label}`;
      const found = entryFor(root, affix);
      result.dataset.valid = String(!!found);
      wordEl.textContent = found ? found.word : '';
      meaningEl.textContent = found ? found.meaning : NOT_REAL;
      pop(found ? wordEl : meaningEl);
      ctx.sfx.tick(!!found);
      return found ? `${found.word}. ${found.meaning}.` : NOT_REAL;
    }
    result.dataset.valid = 'false';
    wordEl.textContent = '';
    meaningEl.textContent = root ? 'Now pick an affix.' : affix ? affixInfo(affix).hint : 'Now pick a root word.';
    sumEl.textContent = root ?? (affix ? affixInfo(affix).label : 'Pick a root and an affix');
    ctx.sfx.tick();
    return root && !affix ? root : affixInfo(affix!).hint;
  };

  const rootGrid = h('div', { class: 'grid grid-cols-3 gap-2 w-full' });
  for (const r of ROOTS) {
    const b = button(r, () => { root = r; say(ctx, update()); }, cardClass, 'root');
    b.setAttribute('aria-pressed', 'false');
    rootBtns.set(r, b);
    rootGrid.append(b);
  }
  const affixGrid = h('div', { class: 'grid grid-cols-3 gap-2 w-full' });
  for (const a of AFFIXES) {
    const b = button(a.label, () => { affix = a.id; say(ctx, update()); }, 'bg-white border-4 border-violet-200 text-xl min-h-12', 'affix');
    b.setAttribute('aria-pressed', 'false');
    affixBtns.set(a.id, b);
    affixGrid.append(b);
  }
  const wrap = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' },
    result,
    h('p', { class: 'text-center text-sm font-bold text-slate-500', text: 'Tap a root word, then an affix, to make a new word.' }),
    rootGrid,
    h('div', { class: 'font-display font-bold text-slate-500', text: 'Affixes' }),
    affixGrid);
  el.append(wrap);
  return { destroy: () => wrap.remove() };
}

function labStage(q: AffixQuestion, ctx: ToyContext, interactive: boolean) {
  const builtEl = h('div', { class: 'font-display font-bold text-4xl text-coral min-h-12 break-words max-w-full', role: 'built', attrs: { 'aria-live': 'polite' }, text: '?' });
  const sumEl = h('div', { class: 'text-lg font-bold text-slate-500 min-h-7', role: 'sum' });
  const choiceHost = h('div');
  let current: AffixAnswer = NO_ANSWER;
  const show = (affix: string) => {
    if (!affix) {
      current = NO_ANSWER;
      builtEl.textContent = '?';
      sumEl.textContent = '';
      return;
    }
    const info = affixInfo(affix);
    current = { affix, word: combine(q.root, affix) };
    builtEl.textContent = current.word;
    sumEl.textContent = info.kind === 'prefix' ? `${info.label} + ${q.root}` : `${q.root} + ${info.label}`;
    pop(builtEl);
  };
  const cards = createChoiceCards(choiceHost, {
    options: q.options.map(id => ({ id, label: affixInfo(id).label })),
    onSelect: id => {
      ctx.sfx.tick();
      show(id);
      if (ctx.autoRead) say(ctx, current.word);
    },
  });
  if (!interactive) cards.setLocked(true);
  const wrap = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto', attrs: { 'data-root': q.root } },
    h('div', { class: 'bg-white rounded-3xl p-3 border-4 border-sky-100 toy-card w-full text-center flex flex-col items-center gap-1' },
      h('div', { class: 'flex items-center justify-center gap-3' },
        h('span', { class: 'font-display font-bold text-3xl text-slate-700 bg-sand rounded-2xl px-4 py-2', role: 'root', text: q.root }),
        h('span', { class: 'font-display font-bold text-3xl text-slate-400', attrs: { 'aria-hidden': 'true' }, text: '+ ? =' })),
      builtEl, sumEl),
    interactive ? h('p', { class: 'text-center text-sm font-bold text-slate-500', text: 'Tap the affix that makes the word.' }) : null,
    choiceHost);
  return {
    root: wrap, cards, show,
    answer: () => current,
    reset() { cards.reset(); show(''); },
    destroy: () => { cards.destroy(); wrap.remove(); },
  };
}

function renderChallenge(el: HTMLElement, q: AffixQuestion, ctx: ToyContext): ChallengeView<AffixAnswer> {
  const s = labStage(q, ctx, true);
  el.append(s.root);
  return { getAnswer: () => ({ ...s.answer() }), reset: s.reset, destroy: s.destroy };
}

const describe_ = (answer: AffixAnswer) => (answer.word ? `You made "${answer.word}"` : 'You have not answered yet');

export const affixLabToy: Toy<AffixQuestion, AffixAnswer> = {
  meta: {
    id: 'affixLab', subject: 'english', stages: [3], title: 'Prefix & Suffix Lab', icon: '🧪',
    objective: 'Add prefixes (un-, re-, dis-, pre-) and suffixes (-ful, -less, -ly, -ness, -er) to root words, and see what the new word means.',
  },
  explore,
  generateQuestions,
  renderChallenge,
  check(q, answer) {
    if (answer.affix === q.affix) return { correct: true };
    return { correct: false, hint: affixInfo(q.affix).hint };
  },
  describeAnswer: (_q, answer) => describe_(answer),
  explain(q, answer) {
    return {
      why: describe_(answer),
      how: `${q.root} + ${affixInfo(q.affix).label} = ${q.word}: ${meaningOf(q)}.`,
    };
  },
  async demonstrate(el, q, ctx) {
    const s = labStage(q, ctx, false);
    el.append(s.root);
    const view: View = { destroy: s.destroy };
    await sleep(STEP_MS);
    if (!s.root.isConnected) return view;
    s.cards.highlight(q.affix, 'correct');
    s.show(q.affix);
    ctx.sfx.tick();
    if (ctx.autoRead) say(ctx, `${q.word}!`);
    return view;
  },
};
