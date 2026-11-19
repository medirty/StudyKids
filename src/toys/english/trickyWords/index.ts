import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { shuffle } from '../../../core/rng';
import { TRICKY_WORDS } from '../../../content/english/tricky';
import { BTN, button, h } from '../../../ui/dom';
import { createChoiceCards } from '../../../ui/kit/choiceCards';

export type TrickyQuestion = Question & { target: string; options: string[] };

const say = (ctx: ToyContext, text: string) => { void ctx.speech.speak(text).catch(() => {}); };

function explore(el: HTMLElement, ctx: ToyContext): View {
  const grid = h('div', { class: 'grid grid-cols-3 gap-3 w-full' });
  for (const w of TRICKY_WORDS) {
    const b = h('button', {
      class: `${BTN} bg-white border-4 border-sand text-3xl min-h-16 min-w-16 toy-card`,
      role: 'word', text: w, attrs: { type: 'button', 'aria-label': `Word ${w}` },
    });
    b.addEventListener('click', () => {
      b.classList.remove('kit-pop');
      void b.offsetWidth;
      b.classList.add('kit-pop');
      ctx.sfx.tick();
      // Taps are explicit actions, so they speak whatever the auto-read setting is.
      say(ctx, w);
    });
    grid.append(b);
  }
  const root = h('div', { class: 'flex flex-col items-center gap-4 w-full min-w-0 max-w-[640px] mx-auto' },
    h('p', { class: 'text-center text-sm font-bold text-slate-500', text: 'Tap a word to hear it.' }), grid);
  el.append(root);
  return { destroy: () => root.remove() };
}

function stage(q: TrickyQuestion, ctx: ToyContext, interactive: boolean) {
  const host = h('div', { class: 'tricky-balloons w-full' });
  const cards = createChoiceCards(host, {
    style: 'balloons',
    options: q.options.map(w => ({ id: w, label: w })),
    onSelect: () => ctx.sfx.tick(),
  });
  if (!interactive) cards.setLocked(true);
  const listen = button('🔊', () => say(ctx, q.target), 'bg-amber-toy text-white text-2xl rounded-full', 'speak');
  listen.setAttribute('aria-label', 'Hear the word');
  const root = h('div', { class: 'flex flex-col items-center gap-4 w-full min-w-0 max-w-[640px] mx-auto', attrs: { 'data-word': q.target } },
    interactive ? listen : null, host);
  return { root, cards };
}

function renderChallenge(el: HTMLElement, q: TrickyQuestion, ctx: ToyContext): ChallengeView<string | null> {
  const { root, cards } = stage(q, ctx, true);
  el.append(root);
  return {
    getAnswer: () => cards.selected(),
    reset: () => cards.reset(),
    destroy: () => { cards.destroy(); root.remove(); },
  };
}

function generateQuestions(_stage: Stage, count: number, rng: Rng): TrickyQuestion[] {
  const out: TrickyQuestion[] = [];
  let bag: string[] = [];
  let prev = '';
  for (let i = 0; i < count; i++) {
    if (bag.length === 0) {
      bag = shuffle(rng, TRICKY_WORDS);
      // pop() takes from the end, so make sure the next word is not the previous target
      if (bag[bag.length - 1] === prev) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    const target = bag.pop()!;
    prev = target;
    const others = shuffle(rng, TRICKY_WORDS.filter(w => w !== target)).slice(0, 3);
    out.push({
      id: `q${i + 1}`, prompt: 'Pop the word', spoken: `Pop the word ${target}`,
      target, options: shuffle(rng, [target, ...others]),
    });
  }
  return out;
}

export const trickyWordsToy: Toy<TrickyQuestion, string | null> = {
  meta: {
    id: 'trickyWords', subject: 'english', stages: [1], title: 'Tricky Word Pop', icon: '🎈',
    objective: 'Listen to a common tricky word and pick it out from other words.',
  },
  explore,
  generateQuestions,
  renderChallenge,
  check(q, answer) {
    if (answer === null) return { correct: false, hint: 'Tap a balloon first!' };
    if (answer === q.target) return { correct: true };
    return { correct: false, hint: `Listen again and look at the first letter: "${q.target[0]}".` };
  },
  describeAnswer: (_q, answer) => answer ?? 'nothing yet',
  explain(q, answer) {
    return {
      why: answer === null ? 'You did not pop a balloon yet.' : `You popped "${answer}".`,
      how: `This word is "${q.target}". Say it and spell it: ${[...q.target].join(', ')}.`,
    };
  },
  async demonstrate(el, q, ctx) {
    const { root, cards } = stage(q, ctx, false);
    el.append(root);
    const view: View = { destroy: () => { cards.destroy(); root.remove(); } };
    if (!root.isConnected) return view;
    cards.highlight(q.target, 'correct');
    ctx.sfx.tick();
    if (ctx.autoRead) say(ctx, q.target);
    return view;
  },
};
