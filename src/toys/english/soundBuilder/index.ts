import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { pick, randInt, shuffle } from '../../../core/rng';
import { CVC_WORDS } from '../../../content/english/cvc';
import { letterPhrase, sayLetter } from '../../../content/phonics';
import { button, h } from '../../../ui/dom';
import { createTiles } from '../../../ui/kit/tiles';

export type SoundBuilderQuestion = Question & { word: string; letters: string[]; emoji: string };

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const DEMO_STEP_MS = 600;
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const emojiFor = (word: string) => CVC_WORDS.find(w => w.word === word)?.emoji ?? '';
const say = (ctx: ToyContext, text: string) => { void ctx.speech.speak(text).catch(() => {}); };
const spell = (letters: string[]) => letters.join('');
/** "c … like cat, a … like apple, t … like tap": a lone letter such as "a" is read as a word by the voice. */
const soundsOf = (word: string) => [...word].map(l => letterPhrase(l) || l).join(', ');

function explore(el: HTMLElement, ctx: ToyContext): View {
  let letters: string[] = [];
  const emojiEl = h('div', { class: 'text-6xl leading-none min-h-16 flex items-center justify-center', role: 'emoji' });
  emojiEl.setAttribute('aria-live', 'polite');
  const slotEls = [0, 1, 2].map(i => {
    const s = h('button', {
      class: 'kit-slot font-display font-bold text-4xl text-coral flex items-center justify-center min-w-16 min-h-16 rounded-2xl border-4 border-dashed border-sand bg-white cursor-pointer',
      role: 'slot', attrs: { 'data-index': String(i), type: 'button' },
    });
    s.addEventListener('click', () => {
      if (!letters[i]) return;
      letters.splice(i, 1);
      render();
    });
    return s;
  });

  function render() {
    slotEls.forEach((s, i) => {
      s.textContent = letters[i] ?? '';
      s.classList.toggle('is-filled', !!letters[i]);
      s.setAttribute('aria-label', letters[i] ? `${letters[i]}, tap to take away` : 'Empty spot');
    });
    emojiEl.textContent = letters.length === 3 ? emojiFor(spell(letters)) : '';
  }

  function tap(letter: string) {
    if (letters.length >= 3) letters = [];
    letters.push(letter);
    render();
    ctx.sfx.tick();
    // Taps are explicit actions, so they speak whatever the auto-read setting is.
    const word = spell(letters);
    const isWord = letters.length === 3 && emojiFor(word) !== '';
    void sayLetter(letter, ctx.speech).then(() => { if (isWord && root.isConnected && spell(letters) === word) say(ctx, word); });
  }

  const board = h('div', { class: 'flex flex-wrap justify-center gap-1.5' });
  for (const l of ALPHABET) {
    const b = button(l, () => tap(l), 'bg-white border-4 border-sand text-2xl', 'letter');
    b.setAttribute('aria-label', `Letter ${l}`);
    board.append(b);
  }
  const clearBtn = button('🧺 Start again', () => { letters = []; render(); ctx.sfx.tick(); }, 'bg-white border-2 border-slate-300 text-slate-600 text-sm', 'clear');
  const hint = h('p', { class: 'text-center text-sm font-bold text-slate-500', text: 'Tap letters to hear them. Make a word with three sounds!' });

  const root = h('div', { class: 'flex flex-col items-center gap-4 w-full min-w-0 max-w-[640px] mx-auto' },
    h('div', { class: 'bg-white rounded-3xl p-4 border-4 border-sky-100 toy-card flex flex-col items-center gap-2 w-full' },
      emojiEl, h('div', { class: 'flex justify-center gap-2' }, ...slotEls)),
    board, hint, clearBtn);
  render();
  el.append(root);
  return { destroy: () => root.remove() };
}

function stage(q: SoundBuilderQuestion, ctx: ToyContext, interactive: boolean) {
  const host = h('div');
  const tiles = createTiles(host, {
    tiles: q.letters, slots: 3,
    onTileTap: l => { ctx.sfx.tick(); if (ctx.autoRead) void sayLetter(l, ctx.speech); },
  });
  if (!interactive) tiles.setLocked(true);
  const listen = button('🔊', () => say(ctx, q.word), 'bg-amber-toy text-white text-2xl rounded-full', 'speak');
  listen.setAttribute('aria-label', 'Hear the word');
  const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto', attrs: { 'data-word': q.word } },
    h('div', { class: 'flex items-center justify-center gap-4' },
      h('div', { class: 'text-7xl leading-none', role: 'emoji', text: q.emoji }), interactive ? listen : null),
    host);
  return { root, tiles };
}

function renderChallenge(el: HTMLElement, q: SoundBuilderQuestion, ctx: ToyContext): ChallengeView<string[]> {
  const { root, tiles } = stage(q, ctx, true);
  el.append(root);
  return {
    getAnswer: () => tiles.value(),
    reset: () => tiles.reset(),
    destroy: () => { tiles.destroy(); root.remove(); },
  };
}

function generateQuestions(_stage: Stage, count: number, rng: Rng): SoundBuilderQuestion[] {
  const out: SoundBuilderQuestion[] = [];
  let bag: typeof CVC_WORDS[number][] = [];
  let prev = '';
  for (let i = 0; i < count; i++) {
    if (bag.length === 0) {
      bag = shuffle(rng, CVC_WORDS);
      if (bag[bag.length - 1].word === prev) {
        const j = randInt(rng, 0, bag.length - 2);
        [bag[j], bag[bag.length - 1]] = [bag[bag.length - 1], bag[j]];
      }
    }
    const { word, emoji } = bag.pop()!;
    prev = word;
    const spare = ALPHABET.filter(l => !word.includes(l));
    const distractors: string[] = [];
    const n = randInt(rng, 2, 3);
    while (distractors.length < n) {
      const l = pick(rng, spare);
      if (!distractors.includes(l)) distractors.push(l);
    }
    out.push({
      id: `q${i + 1}`, prompt: 'Build the word', spoken: `Build the word ${word}`,
      word, emoji, letters: shuffle(rng, [...word, ...distractors]),
    });
  }
  return out;
}

export const soundBuilderToy: Toy<SoundBuilderQuestion, string[]> = {
  meta: {
    id: 'soundBuilder', subject: 'english', stages: [1], title: 'Sound Builder', icon: '🔤',
    objective: 'Hear the sounds in a short word and join letters together to build it.',
  },
  explore,
  generateQuestions,
  renderChallenge,
  check(q, answer) {
    if (spell(answer) === q.word) return { correct: true };
    return { correct: false, hint: `Listen to each sound: ${soundsOf(q.word)}` };
  },
  describeAnswer: (_q, answer) => (answer.length ? spell(answer) : 'nothing yet'),
  explain(q, answer) {
    return {
      why: `You made "${answer.length ? spell(answer) : 'nothing yet'}".`,
      how: `${q.word} has three sounds: ${soundsOf(q.word)}.`,
    };
  },
  async demonstrate(el, q, ctx) {
    const { root, tiles } = stage(q, ctx, false);
    el.append(root);
    const view: View = { destroy: () => { tiles.destroy(); root.remove(); } };
    const placed: string[] = [];
    for (const letter of q.word) {
      await sleep(DEMO_STEP_MS);
      if (!root.isConnected) return view;
      placed.push(letter);
      tiles.fill(placed);
      ctx.sfx.tick();
      if (ctx.autoRead) {
        await sayLetter(letter, ctx.speech);
        if (!root.isConnected) return view;
      }
    }
    if (ctx.autoRead) say(ctx, q.word);
    return view;
  },
};
