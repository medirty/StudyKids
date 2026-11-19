import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { shuffle } from '../../../core/rng';
import { PARTS, PART_IDS, SENSES, senseById, type PartId, type Sense, type SenseId } from '../../../content/science/body';
import { BTN, h } from '../../../ui/dom';
import { createFigure } from './figure';

export type BodyQuestion = Question & {
  /** Parts that are right. One for "name" questions; a sense's organs for "sense" questions. */
  targetParts: PartId[];
  kind: 'name' | 'sense';
  senseId?: SenseId;
};
export type BodyAnswer = PartId | null;

const say = (ctx: ToyContext, text: string) => { void ctx.speech.speak(text).catch(() => {}); };
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const nameOf = (p: PartId) => PARTS[p].name;

/** The sense a question is about (falls back to matching its organs, for hand-made questions). */
function senseOf(q: BodyQuestion): Sense | undefined {
  if (q.kind !== 'sense') return undefined;
  if (q.senseId) return senseById(q.senseId);
  return SENSES.find(s => s.parts.length === q.targetParts.length && s.parts.every(p => q.targetParts.includes(p)));
}

const TAB_ON = 'bg-ocean text-white border-ocean';
const TAB_OFF = 'bg-white text-slate-600 border-sand';

function explore(el: HTMLElement, ctx: ToyContext): View {
  const tabs = h('div', { class: 'flex gap-2 w-full' });
  const panel = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0' });
  const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' }, tabs, panel);
  let current: View | null = null;
  const tabButtons = new Map<string, HTMLButtonElement>();

  function bodyPanel(): View {
    const name = h('p', { class: 'font-display font-bold text-3xl text-slate-800 min-h-10 text-center', role: 'part-name', attrs: { 'aria-live': 'polite' } });
    const figure = createFigure({
      interactive: true, labels: true,
      onTap: (part, node) => {
        figure.select(part);
        node.blur?.();
        name.textContent = cap(nameOf(part));
        ctx.sfx.tick();
        // A tap is an explicit action, so it speaks whatever the auto-read setting is.
        say(ctx, cap(nameOf(part)));
      },
    });
    const hint = h('p', { class: 'text-center text-sm font-bold text-slate-500', text: 'Tap a part of the body to hear its name.' });
    const box = h('div', { class: 'flex flex-col items-center gap-2 w-full min-w-0' }, hint, name, figure.root);
    panel.append(box);
    return { destroy: () => { figure.destroy(); box.remove(); } };
  }

  function sensesPanel(): View {
    const sentence = h('p', {
      class: 'font-display font-bold text-xl text-slate-800 text-center min-h-14 flex items-center justify-center px-2',
      role: 'sentence', attrs: { 'aria-live': 'polite' },
    });
    const figure = createFigure({
      interactive: false, labels: false, crop: true, maxWidth: 220,
      only: [...new Set(SENSES.flatMap(s => s.parts))],
    });
    const row = h('div', { class: 'grid grid-cols-5 gap-2 w-full' });
    const buttons = SENSES.map(sense => {
      const b = h('button', {
        class: `${BTN} flex-col gap-0 bg-white border-4 border-sand toy-card min-h-20 px-1 py-2 min-w-0`,
        role: 'sense',
        attrs: { type: 'button', 'data-sense': sense.id, 'aria-label': sense.label },
      },
      h('span', { class: 'text-4xl leading-none', role: 'sense-icon', text: sense.icon, attrs: { 'aria-hidden': 'true' } }),
      h('span', { class: 'text-xs font-bold text-slate-600 mt-1', text: sense.label }));
      b.addEventListener('click', () => {
        for (const o of buttons) o.classList.toggle('border-ocean', o === b);
        for (const o of buttons) o.classList.toggle('border-sand', o !== b);
        sentence.textContent = sense.sentence;
        figure.glow(sense.parts);
        ctx.sfx.tick();
        say(ctx, sense.spoken);
      });
      return b;
    });
    row.append(...buttons);
    const hint = h('p', { class: 'text-center text-sm font-bold text-slate-500', text: 'Tap a sense to see which part we use.' });
    const box = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0' }, hint, row, sentence, figure.root);
    panel.append(box);
    return { destroy: () => { figure.destroy(); box.remove(); } };
  }

  function show(tab: 'body' | 'senses') {
    current?.destroy();
    current = tab === 'body' ? bodyPanel() : sensesPanel();
    for (const [id, b] of tabButtons) {
      const on = id === tab;
      b.setAttribute('aria-pressed', String(on));
      for (const c of TAB_ON.split(' ')) b.classList.toggle(c, on);
      for (const c of TAB_OFF.split(' ')) b.classList.toggle(c, !on);
    }
  }

  for (const [id, label] of [['body', '🧍 Body'], ['senses', '👀 Senses']] as const) {
    const b = h('button', {
      class: `${BTN} flex-1 border-4 text-lg min-h-14 ${TAB_OFF}`,
      role: 'tab', text: label, attrs: { type: 'button', 'data-tab': id, 'aria-pressed': 'false' },
    });
    b.addEventListener('click', () => { ctx.sfx.tick(); show(id); });
    tabButtons.set(id, b);
    tabs.append(b);
  }
  show('body');
  el.append(root);
  return { destroy: () => { current?.destroy(); current = null; root.remove(); } };
}

function renderChallenge(el: HTMLElement, _q: BodyQuestion, ctx: ToyContext): ChallengeView<BodyAnswer> {
  let chosen: BodyAnswer = null;
  // No part names anywhere and no speech on a tap: the tap only picks, so nothing can leak the answer.
  // (The shell's own 🔊 beside the prompt replays the question.)
  const figure = createFigure({
    interactive: true, labels: false,
    onTap: part => { chosen = part; figure.select(part); ctx.sfx.tick(); },
  });
  const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' }, figure.root);
  el.append(root);
  return {
    getAnswer: () => chosen,
    reset: () => { chosen = null; figure.select(null); },
    destroy: () => { figure.destroy(); root.remove(); },
  };
}

/** A bag of items dealt in shuffled order; a refill never starts with the item just dealt. */
function dealer<T>(rng: Rng, items: readonly T[]) {
  let bag: T[] = [];
  return (avoid: T | undefined): T => {
    if (bag.length === 0) {
      bag = shuffle(rng, items);
      const last = bag.length - 1;
      if (last > 0 && bag[last] === avoid) [bag[0], bag[last]] = [bag[last], bag[0]];
    }
    return bag.pop()!;
  };
}

/** Each block of 10 has 3 or 4 sense questions (the rest name a part), at random places. */
function senseSlots(rng: Rng, blockLen: number): Set<number> {
  const senses = Math.round(blockLen * (rng() < 0.5 ? 3 : 4) / 10);
  return new Set(shuffle(rng, Array.from({ length: blockLen }, (_, i) => i)).slice(0, senses));
}

function generateQuestions(_stage: Stage, count: number, rng: Rng): BodyQuestion[] {
  const nextPart = dealer<PartId>(rng, PART_IDS);
  const nextSense = dealer<SenseId>(rng, SENSES.map(s => s.id));
  const out: BodyQuestion[] = [];
  let prevPart: PartId | undefined;
  let prevSense: SenseId | undefined;
  let slots = new Set<number>();
  for (let i = 0; i < count; i++) {
    if (i % 10 === 0) slots = senseSlots(rng, Math.min(10, count - i));
    // A same-kind neighbour never repeats an item; the bags only refill once every item has been dealt.
    if (slots.has(i % 10)) {
      const id = nextSense(prevSense);
      prevSense = id;
      prevPart = undefined;
      const s = senseById(id);
      const text = `Which part do we use to ${s.askVerb}?`;
      out.push({ id: `q${i + 1}`, prompt: text, spoken: text, targetParts: [...s.parts], kind: 'sense', senseId: id });
    } else {
      const part = nextPart(prevPart);
      prevPart = part;
      prevSense = undefined;
      const text = `Tap the ${nameOf(part)}`;
      out.push({ id: `q${i + 1}`, prompt: text, spoken: text, targetParts: [part], kind: 'name' });
    }
  }
  return out;
}

export const bodySensesToy: Toy<BodyQuestion, BodyAnswer> = {
  meta: {
    id: 'bodySenses', subject: 'science', stages: [1], title: 'My Body & Senses', icon: '🧍',
    objective: 'Name the main parts of the body and say which part we use for each of the five senses.',
  },
  explore,
  generateQuestions,
  renderChallenge,
  check(q, answer) {
    if (answer === null) return { correct: false, hint: 'Tap a part of the body first!' };
    if (q.targetParts.includes(answer)) return { correct: true };
    const sense = senseOf(q);
    return { correct: false, hint: sense ? sense.hint : PARTS[q.targetParts[0]].clue };
  },
  describeAnswer: (_q, answer) => (answer === null ? 'nothing yet' : `You tapped the ${nameOf(answer)}`),
  explain(q, answer) {
    const sense = senseOf(q);
    return {
      why: answer === null ? 'You did not tap a part yet.' : `You tapped the ${nameOf(answer)}.`,
      how: sense ? sense.hint : `${PARTS[q.targetParts[0]].isPlural ? 'These are' : 'This is'} the ${nameOf(q.targetParts[0])}. ${PARTS[q.targetParts[0]].clue}`,
    };
  },
  async demonstrate(el, q, ctx) {
    const figure = createFigure({ interactive: false, labels: false });
    el.append(figure.root);
    const view: View = { destroy: () => figure.destroy() };
    if (!figure.root.isConnected) return view;
    figure.glow(q.targetParts);
    ctx.sfx.tick();
    if (ctx.autoRead) say(ctx, senseOf(q) ? `That is our ${nameOf(q.targetParts[0])}.` : cap(nameOf(q.targetParts[0])));
    return view;
  },
};
