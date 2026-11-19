import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { shuffle } from '../../../core/rng';
import { FORCE_HINT, FORCE_SCENES, type ForceKind } from '../../../content/science/forces';
import { BTN, button, h } from '../../../ui/dom';
import { createChoiceCards } from '../../../ui/kit/choiceCards';

export type PushPullQuestion = Question & { scene: string; target: ForceKind };
export type PushPullAnswer = ForceKind | null;

const MIN_STRENGTH = 1;
const MAX_STRENGTH = 5;

/**
 * How far along the track (0 to 1) the car travels for a push or pull of this strength.
 * Strictly increasing from 1 to 5 and flat outside that range.
 */
export function rollDistance(strength: number): number {
  const s = Math.min(MAX_STRENGTH, Math.max(MIN_STRENGTH, strength));
  return 0.15 + 0.17 * (s - MIN_STRENGTH);
}

const SIZE = ['tiny', 'small', 'medium', 'big', 'huge'];
const FAR = ['just a little bit', 'a little way', 'quite far', 'far', 'very far'];
const idx = (strength: number) => Math.round(Math.min(MAX_STRENGTH, Math.max(MIN_STRENGTH, strength))) - MIN_STRENGTH;

/** The sentence shown, and read aloud, after the car moves. */
export function resultLine(mode: ForceKind, strength: number): string {
  const i = idx(strength);
  const comma = i === 0 ? ',' : ''; // "rolls just a little bit, away from you"
  return mode === 'push'
    ? `A ${SIZE[i]} push: the car rolls ${FAR[i]}${comma} away from you.`
    : `A ${SIZE[i]} pull: the car comes ${FAR[i]}${comma} towards you.`;
}

const RULE_SENTENCE: Record<ForceKind, string> = {
  push: 'A push moves something away from you.',
  pull: 'A pull moves it towards you.',
};
const LABEL: Record<ForceKind, string> = { push: 'Push', pull: 'Pull' };
const EMOJI: Record<ForceKind, string> = { push: '👐', pull: '🪢' };

const say = (ctx: ToyContext, text: string) => { void ctx.speech.speak(text).catch(() => {}); };
const sceneOf = (id: string) => FORCE_SCENES.find(s => s.id === id)!;
const reducedMotion = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const CAR_W = '3rem';

function explore(el: HTMLElement, ctx: ToyContext): View {
  let mode: ForceKind = 'push';
  let strength = 3;
  let lastLine = '';

  const car = h('span', {
    class: 'pp-car absolute top-1/2 text-4xl leading-none',
    role: 'car', text: '🚗',
    attrs: { 'aria-label': 'Toy car', 'data-pos': '0', 'data-mode': 'push' },
    style: { width: CAR_W, textAlign: 'center' },
  });
  const string = h('div', {
    class: 'pp-string absolute top-1/2 h-0 border-t-4 border-dashed border-amber-toy', role: 'string',
    attrs: { 'aria-hidden': 'true' },
  });
  string.hidden = true;
  const track = h('div', { class: 'relative flex-1 min-w-0 h-20 rounded-2xl bg-sand border-4 border-sand overflow-hidden' },
    h('div', { class: 'absolute left-0 right-0 top-1/2 mt-5 border-t-4 border-slate-300' }), string, car);
  const stage = h('div', { class: 'flex items-center gap-2 w-full' },
    h('span', { class: 'text-4xl', attrs: { 'aria-hidden': 'true' }, text: '🧒' }), track);

  const place = (pos: number) => {
    // the car sits at (track width minus its own width) * pos, so 1 is the far end
    car.style.left = `calc((100% - ${CAR_W}) * ${pos})`;
    string.style.left = '0';
    string.style.width = `calc((100% - ${CAR_W}) * ${pos} + 0.75rem)`;
    car.dataset.pos = String(pos);
  };
  place(0);

  const modeBtns = {} as Record<ForceKind, HTMLButtonElement>;
  const result = h('p', {
    class: 'text-center text-base font-bold min-h-14 flex-1 min-w-0', role: 'result', attrs: { 'aria-live': 'polite' },
    text: 'Choose how hard, then push the car!',
  });
  const speakBtn = button('🔊', () => say(ctx, lastLine || result.textContent || ''), 'bg-amber-toy text-white text-2xl rounded-full', 'speak');
  speakBtn.setAttribute('aria-label', 'Hear it again');

  const strengthLabel = h('label', { class: 'font-display font-bold text-lg', attrs: { for: 'pp-strength' } });
  const slider = h('input', { class: 'w-full h-12 accent-violet-toy', role: 'strength', attrs: {
    id: 'pp-strength', type: 'range', min: String(MIN_STRENGTH), max: String(MAX_STRENGTH), step: '1', value: String(strength),
  } });
  const go = button('', () => release(), 'bg-coral text-white text-2xl w-full', 'go');

  function paintMode() {
    for (const k of ['push', 'pull'] as const) {
      const on = k === mode;
      modeBtns[k].setAttribute('aria-pressed', String(on));
      modeBtns[k].classList.toggle('is-selected', on);
      modeBtns[k].classList.toggle('bg-blue-50', on);
      modeBtns[k].classList.toggle('border-ocean', on);
      modeBtns[k].classList.toggle('border-sand', !on);
    }
    strengthLabel.textContent = `${LABEL[mode]} strength`;
    go.textContent = `${LABEL[mode]}! ${EMOJI[mode]}`;
    string.hidden = mode !== 'pull';
    car.dataset.mode = mode;
    // the emoji car faces left: flip it when it is driving away to the right
    car.style.transform = `translateY(-50%) scaleX(${mode === 'push' ? -1 : 1})`;
  }

  function setMode(next: ForceKind) {
    mode = next;
    paintMode();
    place(mode === 'push' ? 0 : 1);
    result.textContent = mode === 'push' ? 'Push the car away from you.' : 'Pull the car towards you with the string.';
    lastLine = '';
    ctx.sfx.tick();
    // an explicit tap, so it may speak whatever the auto-read setting is
    say(ctx, `${LABEL[mode]}. ${RULE_SENTENCE[mode]}`);
  }

  for (const k of ['push', 'pull'] as const) {
    const b = h('button', {
      class: `${BTN} flex-1 flex-col border-4 text-lg bg-white`, role: 'mode',
      attrs: { type: 'button', 'data-mode': k, 'aria-pressed': 'false' },
    }, h('span', { class: 'text-3xl', attrs: { 'aria-hidden': 'true' }, text: EMOJI[k] }), h('span', { text: LABEL[k] }));
    b.addEventListener('click', () => setMode(k));
    modeBtns[k] = b;
  }

  slider.addEventListener('input', () => { strength = Number(slider.value); ctx.sfx.tick(); });

  function release() {
    const d = rollDistance(strength);
    const start = mode === 'push' ? 0 : 1;
    const end = mode === 'push' ? d : 1 - d;
    // jump back to the start, then roll (or just jump, for people who prefer no motion)
    car.style.transition = 'none';
    string.style.transition = 'none';
    place(start);
    void car.offsetWidth;
    if (reducedMotion()) {
      place(end);
    } else {
      const t = `left ${Math.round(500 + 900 * d)}ms ease-out, width ${Math.round(500 + 900 * d)}ms ease-out`;
      car.style.transition = t;
      string.style.transition = t;
      place(end);
    }
    lastLine = resultLine(mode, strength);
    result.textContent = lastLine;
    ctx.sfx.tick(true);
    if (ctx.autoRead) say(ctx, lastLine);
  }

  const strengthRow = h('div', { class: 'flex flex-col gap-1 w-full' },
    strengthLabel,
    slider,
    h('div', { class: 'flex justify-between font-bold text-slate-500 text-sm' },
      h('span', { text: '🐜 Small' }), h('span', { text: '💪 Big' })));
  const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' },
    h('div', { class: 'flex gap-3 w-full' }, modeBtns.push, modeBtns.pull),
    stage,
    h('div', { class: 'flex items-center gap-2 w-full' }, result, speakBtn),
    strengthRow,
    go);
  paintMode();
  el.append(root);
  return { destroy: () => root.remove() };
}

function sceneCard(q: PushPullQuestion): HTMLElement {
  const s = sceneOf(q.scene);
  return h('div', {
    class: 'flex items-center gap-3 bg-white rounded-3xl p-3 border-4 border-sky-100 toy-card w-full', role: 'scene',
  },
    h('span', { class: 'text-6xl', attrs: { 'aria-hidden': 'true' }, text: s.emoji }),
    h('span', { class: 'font-display font-bold text-xl flex-1 min-w-0', text: s.text }));
}

function stageFor(q: PushPullQuestion, ctx: ToyContext, interactive: boolean) {
  const host = h('div', { class: 'w-full [&_.kit-choices]:flex-nowrap [&_.kit-choice]:flex-1 [&_.kit-choice]:flex-row [&_.kit-choice]:min-h-16' });
  const cards = createChoiceCards(host, {
    options: (['push', 'pull'] as const).map(k => ({ id: k, label: LABEL[k], emoji: EMOJI[k] })),
    onSelect: () => ctx.sfx.tick(),
  });
  if (!interactive) cards.setLocked(true);
  // the shell's prompt bar has the 🔊 that reads the scene (via `spoken`)
  const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto', attrs: { 'data-scene': q.scene } },
    sceneCard(q), host);
  return { root, cards };
}

function renderChallenge(el: HTMLElement, q: PushPullQuestion, ctx: ToyContext): ChallengeView<PushPullAnswer> {
  const { root, cards } = stageFor(q, ctx, true);
  el.append(root);
  return {
    getAnswer: () => cards.selected() as PushPullAnswer,
    reset: () => cards.reset(),
    destroy: () => { cards.destroy(); root.remove(); },
  };
}

function generateQuestions(_stage: Stage, count: number, rng: Rng): PushPullQuestion[] {
  const pushes = FORCE_SCENES.filter(s => s.answer === 'push');
  const pulls = FORCE_SCENES.filter(s => s.answer === 'pull');
  const out: PushPullQuestion[] = [];
  let bag: typeof FORCE_SCENES[number][] = [];
  let prev = '';
  for (let i = 0; i < count; i++) {
    if (bag.length === 0) {
      // five of each kind per ten, so every round has both
      bag = shuffle(rng, [...shuffle(rng, pushes).slice(0, 5), ...shuffle(rng, pulls).slice(0, 5)]);
      // pop() takes from the end, so make sure the next scene is not the previous one
      if (bag[bag.length - 1].id === prev) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    const s = bag.pop()!;
    prev = s.id;
    out.push({ id: `q${i + 1}`, prompt: 'Push or pull?', spoken: `Push or pull? ${s.text}`, scene: s.id, target: s.answer });
  }
  return out;
}

const how = (q: PushPullQuestion) => `"${sceneOf(q.scene).text}" is a ${q.target}. ${FORCE_HINT}`;

export const pushPullToy: Toy<PushPullQuestion, PushPullAnswer> = {
  meta: {
    id: 'pushPull', subject: 'science', stages: [1], title: 'Push or Pull?', icon: '🛒',
    objective: 'Tell pushes from pulls: a push moves something away, a pull brings it towards you, and a bigger force moves it further.',
  },
  explore,
  generateQuestions,
  renderChallenge,
  check(q, a) {
    if (a === null) return { correct: false, hint: 'Tap Push or Pull first!' };
    if (a === q.target) return { correct: true };
    return { correct: false, hint: FORCE_HINT };
  },
  describeAnswer: (_q, a) => (a === null ? 'You did not choose yet' : `You chose ${LABEL[a]}`),
  explain: (q, a) => ({
    why: a === null ? 'You did not choose yet.' : `You chose ${LABEL[a]}.`,
    how: how(q),
  }),
  async demonstrate(el, q, ctx) {
    const { root, cards } = stageFor(q, ctx, false);
    el.append(root);
    const view: View = { destroy: () => { cards.destroy(); root.remove(); } };
    if (!root.isConnected) return view;
    cards.highlight(q.target, 'correct');
    ctx.sfx.tick();
    if (ctx.autoRead) say(ctx, `That is a ${LABEL[q.target].toLowerCase()}!`);
    return view;
  },
};
