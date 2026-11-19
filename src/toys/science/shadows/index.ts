import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { pick, shuffle } from '../../../core/rng';
import {
  DARK_HINT, distanceLine, EXPLORE_START, LIGHT_OBJECTS, MAX_DISTANCE, MIN_DISTANCE, SHADOW_DARKNESS, SIZE_HINT,
  closeness, exploreLine, lightObject, objectLine, shadowScale, sizeWhy, type LightObject,
} from '../../../content/science/light';
import { BTN, button, h } from '../../../ui/dom';
import { createChoiceCards } from '../../../ui/kit/choiceCards';

export type ShadowQuestion = Question & {
  mode: 'size' | 'dark';
  /** Size questions: which way the torch moves. */
  direction: 'closer' | 'farther' | null;
  /** The object in the scene (size questions) or the answer's object (dark questions). */
  object: string;
  /** Torch distance at the start (1 close .. 5 far). */
  start: number;
  /** Size: ['bigger', 'smaller']. Dark: three object ids. */
  options: string[];
  answer: string;
};
export type ShadowAnswer = string | null;

const say = (ctx: ToyContext, text: string) => { void ctx.speech.speak(text).catch(() => {}); };
const OPAQUE = LIGHT_OBJECTS.filter(o => o.kind === 'opaque');
const NOT_OPAQUE = LIGHT_OBJECTS.filter(o => o.kind !== 'opaque');
const SIZE_LABEL: Record<string, { label: string; emoji: string }> = {
  bigger: { label: 'Bigger', emoji: '⬆️' }, smaller: { label: 'Smaller', emoji: '⬇️' },
};

/**
 * The torch on the left, the object in the middle and the wall on the right. The shadow falls on the
 * wall, on the side of the object away from the torch. Sizes and the torch move by CSS transition
 * only (no timers; reduced motion shows the end picture, see styles.css).
 */
function createScene() {
  const beam = h('div', { class: 'sh-beam absolute top-1/2 -translate-y-1/2 h-16 rounded-full', attrs: { 'aria-hidden': 'true' } });
  const torch = h('span', {
    class: 'sh-torch absolute top-1/2 -translate-y-1/2 text-5xl leading-none', role: 'torch', attrs: { 'aria-hidden': 'true' }, text: '🔦',
  });
  const object = h('span', {
    class: 'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl leading-none', role: 'object', attrs: { 'aria-hidden': 'true' },
  });
  object.style.left = '54%';
  const shadow = h('div', {
    class: 'sh-shadow absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-slate-800', role: 'shadow', attrs: { 'aria-hidden': 'true' },
  });
  shadow.style.left = '84%';
  shadow.style.top = '50%';
  const wall = h('div', { class: 'absolute right-0 top-0 bottom-0 w-[33%] bg-amber-100 border-l-4 border-amber-200', attrs: { 'aria-hidden': 'true' } });
  const root = h('div', {
    class: 'relative w-full h-40 rounded-3xl bg-slate-100 border-4 border-sky-100 toy-card overflow-hidden', role: 'scene',
    attrs: { 'aria-label': 'A torch shining on an object, with its shadow on the wall' },
  }, wall, beam, torch, object, shadow);

  function place(distance: number) {
    const left = 2 + (closeness(distance) - MIN_DISTANCE) * 6;
    torch.style.left = `${left}%`;
    beam.style.left = `${left + 12}%`;
    beam.style.width = `${46 - left - 12}%`;
    root.dataset.distance = String(distance);
  }
  function paintShadow(o: LightObject | null, distance: number) {
    shadow.hidden = !o;
    if (!o) return;
    const scale = shadowScale(distance);
    shadow.dataset.scale = String(scale);
    shadow.dataset.kind = o.kind;
    shadow.style.setProperty('--sh', String(scale));
    shadow.style.opacity = String(SHADOW_DARKNESS[o.kind]);
  }
  return {
    root, object, shadow, torch,
    show(o: LightObject | null, distance: number) {
      object.textContent = o ? o.emoji : '';
      place(distance);
      paintShadow(o, distance);
    },
    /** Moves the torch (and so resizes the shadow). */
    move(o: LightObject | null, distance: number) { place(distance); paintShadow(o, distance); },
  };
}

function explore(el: HTMLElement, ctx: ToyContext): View {
  const scene = createScene();
  let current = lightObject('book');
  let distance = 3;
  let lastLine = EXPLORE_START;
  const feedback = h('p', {
    class: 'text-center text-base font-bold flex-1 min-w-0 min-h-[5.5rem] flex items-center justify-center', role: 'feedback',
    attrs: { 'aria-live': 'polite' }, text: EXPLORE_START,
  });
  const speakBtn = button('🔊', () => say(ctx, feedback.textContent ?? ''), 'bg-amber-toy text-white text-2xl rounded-full', 'speak');
  speakBtn.setAttribute('aria-label', 'Hear it again');

  const slider = h('input', {
    class: 'w-full h-12 accent-amber-toy touch-pan-y', role: 'slider',
    attrs: { id: 'sh-torch', type: 'range', min: String(MIN_DISTANCE), max: String(MAX_DISTANCE), step: '1', value: String(closeness(distance)) },
  });
  const label = h('label', { class: 'font-display font-bold text-lg', attrs: { for: 'sh-torch' }, text: 'Move the torch' });
  const ends = h('div', { class: 'flex justify-between w-full text-sm font-bold text-slate-600' }, h('span', { text: 'Far away' }), h('span', { text: 'Close' }));

  const tiles = new Map<string, HTMLElement>();
  const tray = h('div', { class: 'grid grid-cols-4 gap-2 w-full' });

  function paintTiles() {
    for (const [id, t] of tiles) {
      const on = id === current.id;
      t.setAttribute('aria-pressed', String(on));
      t.classList.toggle('border-ocean', on);
      t.classList.toggle('bg-blue-50', on);
      t.classList.toggle('border-sand', !on);
    }
  }
  function refresh() {
    slider.setAttribute('aria-valuetext', distanceLine(distance));
    scene.move(current, distance);
    lastLine = exploreLine(current, distance);
    feedback.textContent = lastLine;
  }
  for (const o of LIGHT_OBJECTS) {
    const t = h('button', {
      class: `${BTN} flex-col gap-0 border-4 border-sand bg-white px-1 py-2 leading-tight touch-manipulation select-none`, role: 'thing',
      attrs: { type: 'button', 'data-id': o.id, 'aria-label': o.name, 'aria-pressed': 'false' },
    },
      h('span', { class: 'text-3xl leading-none', attrs: { 'aria-hidden': 'true' }, text: o.emoji }),
      h('span', { class: 'text-xs text-center', attrs: { 'aria-hidden': 'true' }, text: o.name }));
    t.addEventListener('click', () => {
      current = o;
      scene.show(o, distance);
      refresh();
      paintTiles();
      ctx.sfx.tick();
      if (ctx.autoRead) say(ctx, lastLine);
    });
    tiles.set(o.id, t);
    tray.append(t);
  }
  slider.addEventListener('input', () => {
    distance = MAX_DISTANCE + MIN_DISTANCE - Number(slider.value);
    refresh();
    ctx.sfx.tick();
  });
  slider.addEventListener('change', () => { if (ctx.autoRead) say(ctx, lastLine); });

  const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' },
    h('div', { class: 'sticky top-0 z-10 flex flex-col gap-2 w-full bg-[#FFFDF7] pb-2', role: 'sticky' },
      scene.root,
      h('div', { class: 'flex items-center gap-2 w-full' }, feedback, speakBtn)),
    h('div', { class: 'flex flex-col gap-1 w-full' }, label, slider, ends),
    tray);
  slider.setAttribute('aria-valuetext', distanceLine(distance));
  scene.show(current, distance);
  paintTiles();
  el.append(root);
  return { destroy: () => root.remove() };
}

function stageFor(q: ShadowQuestion, ctx: ToyContext, interactive: boolean, reveal: boolean) {
  const scene = createScene();
  const host = h('div', { class: 'w-full [&_.kit-choices]:flex-nowrap [&_.kit-choice]:flex-1 [&_.kit-choice]:min-w-0 [&_.kit-choice]:px-1' });
  const options = q.mode === 'size'
    ? q.options.map(id => ({ id, ...SIZE_LABEL[id] }))
    : q.options.map(id => ({ id, label: lightObject(id).name, emoji: lightObject(id).emoji }));
  const cards = createChoiceCards(host, { options, onSelect: () => ctx.sfx.tick() });
  if (!interactive) cards.setLocked(true);
  // A "darkest shadow" question must not show any shadow before Check: the scene is just the torch and wall.
  if (q.mode === 'size') scene.show(lightObject(q.object), q.start);
  else scene.show(reveal ? lightObject(q.answer) : null, q.start);
  const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto', attrs: { 'data-mode': q.mode } },
    scene.root, host);
  return { root, cards, scene };
}

function renderChallenge(el: HTMLElement, q: ShadowQuestion, ctx: ToyContext): ChallengeView<ShadowAnswer> {
  const s = stageFor(q, ctx, true, false);
  el.append(s.root);
  return {
    getAnswer: () => s.cards.selected(),
    reset: () => s.cards.reset(),
    destroy: () => { s.cards.destroy(); s.root.remove(); },
  };
}

function generateQuestions(_stage: Stage, count: number, rng: Rng): ShadowQuestion[] {
  const out: ShadowQuestion[] = [];
  let kinds: ('size' | 'dark')[] = [];
  const same = (a: ShadowQuestion, b: ShadowQuestion) => a.prompt === b.prompt && a.object === b.object && a.options.join() === b.options.join();
  for (let i = 0; i < count; i++) {
    if (kinds.length === 0) kinds = shuffle(rng, [...Array<'size'>(5).fill('size'), ...Array<'dark'>(5).fill('dark')]);
    // each bag of ten holds five of each kind, so every round of ten has both
    const mode = kinds.pop()!;
    let q: ShadowQuestion;
    do {
      if (mode === 'size') {
        const direction = pick(rng, ['closer', 'farther'] as const);
        const start = direction === 'closer' ? MIN_DISTANCE + 1 + Math.floor(rng() * (MAX_DISTANCE - MIN_DISTANCE)) : MIN_DISTANCE + Math.floor(rng() * (MAX_DISTANCE - MIN_DISTANCE));
        const o = pick(rng, OPAQUE);
        q = {
          id: `q${i + 1}`, mode, direction, object: o.id, start, options: ['bigger', 'smaller'],
          answer: direction === 'closer' ? 'bigger' : 'smaller', prompt: `Move the torch ${direction}. Will the shadow get bigger or smaller?`,
        };
      } else {
        const dark = pick(rng, OPAQUE);
        const options = shuffle(rng, [dark, ...shuffle(rng, NOT_OPAQUE).slice(0, 2)]).map(o => o.id);
        q = { id: `q${i + 1}`, mode, direction: null, object: dark.id, start: 3, options, answer: dark.id, prompt: 'Which object makes the darkest shadow?' };
      }
    } while (i > 0 && same(q, out[i - 1]));
    out.push(q);
  }
  return out;
}

const nameOf = (id: string) => lightObject(id).name;

export const shadowsToy: Toy<ShadowQuestion, ShadowAnswer> = {
  meta: {
    id: 'shadows', subject: 'science', stages: [3], title: 'Light & Shadows', icon: '🔦',
    objective: 'Explore how shadows form when an object blocks light, how moving the torch changes the size of a shadow, and why opaque, translucent and transparent things make dark, faint or hardly any shadows.',
  },
  explore,
  generateQuestions,
  renderChallenge,
  check(q, a) {
    if (a === null) return { correct: false, hint: 'Choose an answer first!' };
    if (a === q.answer) return { correct: true };
    return { correct: false, hint: q.mode === 'size' ? SIZE_HINT : DARK_HINT };
  },
  describeAnswer: (q, a) => (a === null ? 'You did not choose yet' : q.mode === 'size' ? `You said ${a}` : `You said the ${nameOf(a)}`),
  explain: (q, a) => ({
    why: a === null ? 'You did not choose yet.' : q.mode === 'size' ? `You said ${a}.` : `You said the ${nameOf(a)}.`,
    how: q.mode === 'size' ? sizeWhy(q.direction ?? 'closer') : objectLine(lightObject(q.answer)),
  }),
  async demonstrate(el, q, ctx) {
    const { root, cards, scene } = stageFor(q, ctx, false, true);
    el.append(root);
    const view: View = { destroy: () => { cards.destroy(); root.remove(); } };
    if (!root.isConnected) return view;
    cards.highlight(q.answer, 'correct');
    if (q.mode === 'size') {
      void root.offsetWidth;
      scene.move(lightObject(q.object), q.direction === 'closer' ? q.start - 1 : q.start + 1);
    }
    ctx.sfx.tick();
    if (ctx.autoRead) {
      const o = lightObject(q.answer);
      say(ctx, q.mode === 'size'
        ? `The shadow gets ${q.direction === 'farther' ? 'smaller' : 'bigger'}.`
        : `The ${o.name} is ${o.kind}.`);
    }
    return view;
  },
};
