import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { shuffle } from '../../../core/rng';
import { CLASSES, DEFINITIONS, WORDS, WORD_SENTENCES, type WordClass } from '../../../content/english/wordClasses';
import { BTN, button, h } from '../../../ui/dom';
import { createDragSort } from '../../../ui/kit/dragSort';

export type WordQuestion = Question & { cls: WordClass; sentence: string[]; targetIndices: number[] };
export type WordAnswer = number | null;

const BEAT_MS = 600;
const BINS = [
  { id: 'noun', label: 'Noun', emoji: '🏷️' },
  { id: 'verb', label: 'Verb', emoji: '🏃' },
  { id: 'adjective', label: 'Adjective', emoji: '🎨' },
];

const say = (ctx: ToyContext, text: string) => { void ctx.speech.speak(text).catch(() => {}); };
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
/** The word without punctuation, as it is spoken. */
const bare = (w: string) => w.replace(/[^A-Za-z']/g, '');
const withArticle = (c: WordClass) => `${c === 'adjective' ? 'an' : 'a'} ${c}`;
const classOf = (w: string) => CLASSES.find(c => WORDS[c].includes(w))!;
const sentenceText = (q: WordQuestion) => q.sentence.join(' ');

function pop(el: HTMLElement) {
  el.classList.remove('kit-pop');
  void el.offsetWidth;
  el.classList.add('kit-pop');
}

/** Three random words from each class, shuffled together. */
function dealWords(rng: Rng): string[] {
  return shuffle(rng, CLASSES.flatMap(c => shuffle(rng, WORDS[c]).slice(0, 3)));
}

function explore(el: HTMLElement, ctx: ToyContext): View {
  const holder = h('div', { class: 'w-full min-w-0' });
  const feedback = h('p', {
    class: 'text-center text-lg font-bold min-h-14 w-full', role: 'feedback', attrs: { 'aria-live': 'polite' },
    text: 'Drag each word into the right basket. Or tap a word, then tap a basket.',
  });
  const again = button('New words 🔄', () => deal(), 'bg-white border-4 border-sand text-lg', 'again');
  let sorter: ReturnType<typeof createDragSort> | null = null;
  let right = new Set<string>();

  function deal() {
    sorter?.destroy();
    right = new Set();
    feedback.textContent = 'Drag each word into the right basket. Or tap a word, then tap a basket.';
    const words = dealWords(Math.random);
    sorter = createDragSort(holder, {
      items: words.map(w => ({ id: w, label: w })),
      bins: BINS,
      tick: () => ctx.sfx.tick(),
      onDrop(word, bin) {
        const item = holder.querySelector<HTMLElement>(`[data-role="sort-item"][data-id="${word}"]`);
        const cls = classOf(word);
        const ok = bin === cls;
        if (ok) right.add(word); else right.delete(word);
        if (item) {
          item.dataset.state = ok ? 'right' : 'try';
          item.classList.remove('border-sand');
          item.classList.toggle('border-mint', ok);
          item.classList.toggle('border-amber-toy', !ok);
          pop(item);
        }
        if (right.size === words.length) {
          feedback.textContent = 'All sorted! Brilliant work! 🎉';
          ctx.sfx.success();
          ctx.celebrate();
        } else if (ok) {
          feedback.textContent = `Yes! "${word}" is ${withArticle(cls)}. ${DEFINITIONS[cls]}`;
        } else {
          feedback.textContent = `Hmm, "${word}" does not go in that basket. Try another one!`;
          ctx.sfx.tryAgain();
        }
      },
    });
  }

  // Tapping a word is an explicit action, so it may speak whatever the auto-read setting is.
  holder.addEventListener('click', e => {
    const item = (e.target as HTMLElement).closest<HTMLElement>('[data-role="sort-item"]');
    if (item?.dataset.id) say(ctx, item.dataset.id);
  }, true); // capture: the kit stops propagation of item clicks

  const root = h('div', { class: 'flex flex-col items-center gap-4 w-full min-w-0 max-w-[640px] mx-auto' }, holder, feedback, again);
  deal();
  el.append(root);
  return { destroy: () => { sorter?.destroy(); root.remove(); } };
}

function tokenButtons(q: WordQuestion, ctx: ToyContext, onTap: ((i: number) => void) | null) {
  const btns = q.sentence.map((w, i) => {
    const b = h('button', {
      class: `${BTN} bg-white border-4 border-sand text-2xl min-h-14 min-w-14 toy-card`,
      role: 'token', text: w, attrs: { type: 'button', 'aria-pressed': 'false', 'data-index': String(i) },
    });
    b.addEventListener('click', () => {
      pop(b);
      ctx.sfx.tick();
      say(ctx, bare(w));
      onTap?.(i);
    });
    return b;
  });
  const row = h('div', { class: 'flex flex-wrap items-center justify-center gap-2 w-full min-w-0', attrs: { 'aria-label': 'Sentence' } }, ...btns);
  return { btns, row };
}

function renderChallenge(el: HTMLElement, q: WordQuestion, ctx: ToyContext): ChallengeView<WordAnswer> {
  let picked: number | null = null;
  const { btns, row } = tokenButtons(q, ctx, i => select(picked === i ? null : i));
  const select = (i: number | null) => {
    picked = i;
    btns.forEach((b, k) => {
      const on = k === i;
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('bg-sky-100', on);
      b.classList.toggle('border-ocean', on);
      b.classList.toggle('border-sand', !on);
    });
  };
  const listen = button('🔊', () => say(ctx, sentenceText(q)), 'bg-amber-toy text-white text-2xl rounded-full', 'speak');
  listen.setAttribute('aria-label', 'Hear the sentence');
  const root = h('div', { class: 'flex flex-col items-center gap-4 w-full min-w-0 max-w-[640px] mx-auto' },
    listen,
    h('div', { class: 'bg-white rounded-3xl p-4 border-4 border-sky-100 toy-card w-full' }, row),
    h('p', { class: 'text-center text-sm font-bold text-slate-500', text: 'Tap a word. Tap it again to change your mind.' }));
  el.append(root);
  return { getAnswer: () => picked, reset: () => select(null), destroy: () => root.remove() };
}

function generateQuestions(_stage: Stage, count: number, rng: Rng): WordQuestion[] {
  const out: WordQuestion[] = [];
  let bag: typeof WORD_SENTENCES[number][] = [];
  let classBag: WordClass[] = [];
  let prev: typeof WORD_SENTENCES[number] | null = null;
  for (let i = 0; i < count; i++) {
    if (bag.length === 0) {
      bag = shuffle(rng, WORD_SENTENCES);
      // pop() takes from the end, so make sure the next sentence is not the previous one
      if (bag[bag.length - 1] === prev) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    if (classBag.length === 0) classBag = shuffle(rng, CLASSES);
    const s = bag.pop()!;
    const cls = classBag.pop()!;
    prev = s;
    out.push({
      id: `q${i + 1}`, prompt: `Tap the ${cls}`, cls,
      sentence: s.tokens.map(t => t.text),
      targetIndices: s.tokens.flatMap((t, k) => (t.cls === cls ? [k] : [])),
    });
  }
  return out;
}

export const wordSorterToy: Toy<WordQuestion, WordAnswer> = {
  meta: {
    id: 'wordSorter', subject: 'english', stages: [3], title: 'Word Sorter', icon: '🧺',
    objective: 'Sort words into nouns, verbs and adjectives, and spot each one in a sentence.',
  },
  explore,
  generateQuestions,
  renderChallenge,
  check(q, a) {
    if (a === null) return { correct: false, hint: 'Tap a word first!' };
    if (q.targetIndices.includes(a)) return { correct: true };
    return { correct: false, hint: DEFINITIONS[q.cls] };
  },
  describeAnswer: (q, a) => (a === null ? 'You did not tap a word yet' : `You tapped "${bare(q.sentence[a])}"`),
  explain(q, a) {
    const ok = a !== null && q.targetIndices.includes(a);
    const word = bare(q.sentence[ok ? a : q.targetIndices[0]]);
    return {
      why: a === null ? 'You did not tap a word yet.' : `You tapped "${bare(q.sentence[a])}".`,
      how: `"${word}" is ${withArticle(q.cls)}: ${DEFINITIONS[q.cls]}`,
    };
  },
  async demonstrate(el, q, ctx) {
    const { btns, row } = tokenButtons(q, ctx, null);
    const root = h('div', { class: 'flex flex-col items-center gap-4 w-full min-w-0 max-w-[640px] mx-auto' },
      h('div', { class: 'bg-white rounded-3xl p-4 border-4 border-sky-100 toy-card w-full' }, row));
    el.append(root);
    const view: View = { destroy: () => root.remove() };
    await sleep(BEAT_MS);
    if (!root.isConnected) return view;
    for (const i of q.targetIndices) {
      btns[i].dataset.target = 'true';
      btns[i].classList.remove('border-sand');
      btns[i].classList.add('border-mint', 'bg-emerald-50');
      pop(btns[i]);
    }
    ctx.sfx.tick();
    if (ctx.autoRead) say(ctx, sentenceText(q));
    return view;
  },
};
