import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { shuffle } from '../../../core/rng';
import {
  MAGNET_ITEMS, MAGNET_RULE, magnetExplanation, magnetItem, magnetVerdict, type MagnetItem,
} from '../../../content/science/magnets';
import { BTN, button, h } from '../../../ui/dom';
import { createChoiceCards } from '../../../ui/kit/choiceCards';

export type MagnetQuestion = Question & { item: string; magnetic: boolean };
export type MagnetAnswer = 'yes' | 'no' | null;
type Outcome = 'ready' | 'stuck' | 'fell';

const say = (ctx: ToyContext, text: string) => { void ctx.speech.speak(text).catch(() => {}); };
const outcomeOf = (i: MagnetItem): Outcome => (i.magnetic ? 'stuck' : 'fell');
const DRAG_THRESHOLD = 6;

/**
 * The magnet with one object below it. The object's move is a CSS animation chosen by data-state
 * (no timers; reduced motion shows the end picture straight away, see styles.css).
 */
function createScene() {
  const object = h('span', { class: 'mag-obj text-5xl', role: 'object', attrs: { 'data-state': 'ready', 'aria-hidden': 'true' } });
  const root = h('div', {
    class: 'mag-scene relative w-full h-36 rounded-3xl bg-white border-4 border-sky-100 toy-card overflow-hidden', role: 'magnet',
    attrs: { 'aria-label': 'Magnet' },
  },
    h('span', { class: 'absolute top-1 left-1/2 -translate-x-1/2 text-6xl leading-none', attrs: { 'aria-hidden': 'true' }, text: '🧲' }),
    object);
  return {
    root,
    object,
    /** Shows the thing at rest below the magnet. */
    show(emoji: string) { object.textContent = emoji; object.dataset.state = 'ready'; },
    /** Plays the result: the thing flies up, then sticks, or slips off and drops. Replays each time. */
    play(emoji: string, outcome: Outcome) {
      object.textContent = emoji;
      object.dataset.state = 'ready';
      void object.offsetWidth;
      object.dataset.state = outcome;
    },
    clear() { object.textContent = ''; object.dataset.state = 'ready'; },
  };
}

function explore(el: HTMLElement, ctx: ToyContext): View {
  const scene = createScene();
  const feedback = h('p', {
    class: 'text-center text-base font-bold flex-1 min-w-0 min-h-[4.5rem] flex items-center justify-center', role: 'feedback',
    attrs: { 'aria-live': 'polite' }, text: 'Drag a thing to the magnet, or tap it, and see what happens!',
  });
  const speakBtn = button('🔊', () => say(ctx, feedback.textContent ?? ''), 'bg-amber-toy text-white text-2xl rounded-full', 'speak');
  speakBtn.setAttribute('aria-label', 'Hear it again');
  const tray = h('div', { class: 'grid grid-cols-3 gap-2 w-full' });
  const again = button('New things 🔄', () => deal(), 'bg-white border-4 border-sand text-lg', 'again');

  let tested = new Set<string>();
  let celebrated = false;
  let total = 0;
  let ghost: HTMLElement | null = null;
  let suppressClick = false;

  const dropGhost = () => { ghost?.remove(); ghost = null; scene.root.classList.remove('is-over'); };

  function test(item: MagnetItem, node: HTMLElement) {
    const outcome = outcomeOf(item);
    scene.play(item.emoji, outcome);
    node.dataset.result = outcome;
    node.classList.remove('border-sand');
    node.classList.add(item.magnetic ? 'border-mint' : 'border-amber-toy');
    const badge = node.querySelector<HTMLElement>('[data-role="badge"]')!;
    badge.textContent = item.magnetic ? '🧲' : '💨';
    tested.add(item.id);
    const all = tested.size === total;
    feedback.textContent = all ? `${magnetVerdict(item)} You tested them all!` : magnetVerdict(item);
    ctx.sfx.tick(true);
    if (all && !celebrated) {
      celebrated = true;
      ctx.sfx.success();
      ctx.celebrate();
    }
    if (ctx.autoRead) say(ctx, feedback.textContent);
  }

  function makeTile(item: MagnetItem): HTMLElement {
    const node = h('button', {
      class: `${BTN} relative flex-col gap-0 border-4 border-sand bg-white px-1 py-2 leading-tight touch-manipulation select-none`, role: 'thing',
      attrs: { type: 'button', 'data-id': item.id, 'aria-label': item.name },
    },
      h('span', { class: 'text-4xl leading-none', attrs: { 'aria-hidden': 'true' }, text: item.emoji }),
      h('span', { class: 'text-sm text-center', attrs: { 'aria-hidden': 'true' }, text: item.name }),
      h('span', { class: 'absolute top-0 right-1 text-base', role: 'badge', attrs: { 'aria-hidden': 'true' } }));
    node.addEventListener('click', () => {
      if (suppressClick) { suppressClick = false; return; }
      test(item, node);
    });

    // Drag: pointer events with a floating copy. Moving less than the threshold stays a tap.
    let start: { id: number; x: number; y: number } | null = null;
    const over = (x: number, y: number) => {
      const r = scene.root.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    // Tap is the main touch path: with touch-action manipulation a finger drag scrolls the page, so
    // dragging is for mouse and pen only and touch pointers are left alone.
    node.addEventListener('pointerdown', e => {
      suppressClick = false;
      if (e.pointerType === 'touch') return;
      start = { id: e.pointerId, x: e.clientX, y: e.clientY };
      try { node.setPointerCapture?.(e.pointerId); } catch { /* no capture support */ }
    });
    node.addEventListener('pointermove', e => {
      if (!start) return;
      if (!ghost) {
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < DRAG_THRESHOLD) return;
        ghost = h('div', {
          class: 'fixed z-50 text-5xl leading-none pointer-events-none', role: 'drag-ghost', text: item.emoji,
          attrs: { 'aria-hidden': 'true' },
        });
        document.body.append(ghost);
      }
      ghost.style.left = `${e.clientX - 24}px`;
      ghost.style.top = `${e.clientY - 24}px`;
      scene.root.classList.toggle('is-over', over(e.clientX, e.clientY));
    });
    const finish = (e: PointerEvent, cancelled: boolean) => {
      if (!start) return;
      const dragged = !!ghost;
      start = null;
      dropGhost();
      if (!dragged) return; // a tap: the click handler does the work
      suppressClick = true;
      if (!cancelled && over(e.clientX, e.clientY)) test(item, node);
    };
    node.addEventListener('pointerup', e => finish(e, false));
    node.addEventListener('pointercancel', e => finish(e, true));
    return node;
  }

  function deal() {
    dropGhost();
    const magnetic = shuffle(Math.random, MAGNET_ITEMS.filter(i => i.magnetic)).slice(0, 3);
    const not = shuffle(Math.random, MAGNET_ITEMS.filter(i => !i.magnetic)).slice(0, 3);
    const things = shuffle(Math.random, [...magnetic, ...not]);
    total = things.length;
    tested = new Set();
    celebrated = false;
    scene.clear();
    feedback.textContent = 'Drag a thing to the magnet, or tap it, and see what happens!';
    tray.replaceChildren(...things.map(makeTile));
  }

  const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' },
    h('div', { class: 'sticky top-0 z-10 flex flex-col gap-2 w-full bg-[#FFFDF7] pb-2', role: 'sticky' },
      scene.root,
      h('div', { class: 'flex items-center gap-2 w-full' }, feedback, speakBtn)),
    tray,
    again);
  deal();
  el.append(root);
  return { destroy: () => { dropGhost(); root.remove(); } };
}

function stageFor(q: MagnetQuestion, ctx: ToyContext, interactive: boolean) {
  const item = magnetItem(q.item);
  const scene = createScene();
  scene.show(item.emoji);
  const host = h('div', { class: 'w-full [&_.kit-choices]:flex-nowrap [&_.kit-choice]:flex-1 [&_.kit-choice]:flex-row [&_.kit-choice]:min-h-16' });
  const cards = createChoiceCards(host, {
    options: [{ id: 'yes', label: 'Yes', emoji: '🧲' }, { id: 'no', label: 'No', emoji: '✋' }],
    onSelect: () => ctx.sfx.tick(),
  });
  if (!interactive) cards.setLocked(true);
  const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto', attrs: { 'data-item': item.id } },
    scene.root, host);
  return { root, cards, scene, item };
}

function renderChallenge(el: HTMLElement, q: MagnetQuestion, ctx: ToyContext): ChallengeView<MagnetAnswer> {
  const item = magnetItem(q.item);
  // The object stays at rest: showing the result here would give the answer away before Check.
  // The result animation is played only by demonstrate.
  const s = stageFor(q, ctx, true);
  const scene = s.scene;
  el.append(s.root);
  return {
    getAnswer: () => s.cards.selected() as MagnetAnswer,
    reset: () => { s.cards.reset(); scene.show(item.emoji); },
    destroy: () => { s.cards.destroy(); s.root.remove(); },
  };
}

function generateQuestions(_stage: Stage, count: number, rng: Rng): MagnetQuestion[] {
  const yes = MAGNET_ITEMS.filter(i => i.magnetic);
  const no = MAGNET_ITEMS.filter(i => !i.magnetic);
  const out: MagnetQuestion[] = [];
  let bag: MagnetItem[] = [];
  let prev = '';
  for (let i = 0; i < count; i++) {
    if (bag.length === 0) {
      // five of each kind per ten, so every round has both
      bag = shuffle(rng, [...shuffle(rng, yes).slice(0, 5), ...shuffle(rng, no).slice(0, 5)]);
      // pop() takes from the end, so make sure the next item is not the previous one
      if (bag[bag.length - 1].id === prev) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    const item = bag.pop()!;
    prev = item.id;
    out.push({ id: `q${i + 1}`, prompt: `Will the ${item.name} stick to the magnet?`, item: item.id, magnetic: item.magnetic });
  }
  return out;
}

const SAID: Record<'yes' | 'no', string> = { yes: 'You said Yes, it will stick', no: 'You said No, it will not stick' };

export const magnetsToy: Toy<MagnetQuestion, MagnetAnswer> = {
  meta: {
    id: 'magnets', subject: 'science', stages: [3], title: 'Magnet Test', icon: '🧲',
    objective: 'Test everyday things with a magnet and find that magnets pull things made of iron or steel, but not wood, plastic, glass, paper, rubber, copper, gold or aluminium.',
  },
  explore,
  generateQuestions,
  renderChallenge,
  check(q, a) {
    if (a === null) return { correct: false, hint: 'Tap Yes or No first!' };
    if (a === (q.magnetic ? 'yes' : 'no')) return { correct: true };
    return { correct: false, hint: MAGNET_RULE };
  },
  describeAnswer: (_q, a) => (a === null ? 'You did not choose yet' : SAID[a]),
  explain: (q, a) => ({
    why: a === null ? 'You did not choose yet.' : `${SAID[a]}.`,
    how: magnetExplanation(magnetItem(q.item)),
  }),
  async demonstrate(el, q, ctx) {
    const { root, cards, scene, item } = stageFor(q, ctx, false);
    el.append(root);
    const view: View = { destroy: () => { cards.destroy(); root.remove(); } };
    if (!root.isConnected) return view;
    cards.highlight(item.magnetic ? 'yes' : 'no', 'correct');
    scene.play(item.emoji, outcomeOf(item));
    ctx.sfx.tick();
    if (ctx.autoRead) say(ctx, item.magnetic ? 'It sticks!' : 'It does not stick.');
    return view;
  },
};
