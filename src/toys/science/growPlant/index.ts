import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { shuffle } from '../../../core/rng';
import {
  EXPLORE_INTRO, LEVELS, LEVEL_LABEL, NEEDS, PART_IDS, PLANT_PARTS, cap, partSentence, plantReport,
  type Conditions, type Level, type NeedId, type PartId,
} from '../../../content/science/plants';
import { BTN, button, h } from '../../../ui/dom';
import { createChoiceCards } from '../../../ui/kit/choiceCards';
import { createPlantFigure } from './plantFigure';

export type PlantQuestion = Question & { kind: 'tap' | 'function'; part: PartId };
/** Both kinds answer with a part: the part tapped, or the part whose job the chosen card describes. */
export type PlantAnswer = PartId | null;

const say = (ctx: ToyContext, text: string) => { void ctx.speech.speak(text).catch(() => {}); };
const nameOf = (p: PartId) => PLANT_PARTS[p].name;

function explore(el: HTMLElement, ctx: ToyContext): View {
  const cond: Conditions = { water: 'some', light: 'some', warmth: 'some' };
  const figure = createPlantFigure({ interactive: false, labels: false, noHotspots: true, maxWidth: 170 });

  const status = h('p', {
    class: 'text-center text-base font-bold flex-1 min-w-0 min-h-[4.5rem] flex items-center justify-center', role: 'status',
    attrs: { 'aria-live': 'polite' },
  });
  const speakBtn = button('🔊', () => say(ctx, status.textContent ?? ''), 'bg-amber-toy text-white text-2xl rounded-full', 'speak');
  speakBtn.setAttribute('aria-label', 'Hear it again');

  const levelBtns = new Map<string, HTMLButtonElement>();
  const paintLevels = () => {
    for (const [key, b] of levelBtns) {
      const [n, l] = key.split('/') as [NeedId, Level];
      const on = cond[n] === l;
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('is-selected', on);
      b.classList.toggle('bg-blue-50', on);
      b.classList.toggle('border-ocean', on);
      b.classList.toggle('border-sand', !on);
    }
  };
  function update(speak: boolean) {
    const r = plantReport(cond);
    status.textContent = r.note;
    figure.setHealth(r.health);
    paintLevels();
    if (speak && ctx.autoRead) say(ctx, r.note);
  }

  const rows = NEEDS.map(n => {
    const row = h('div', { class: 'flex items-center gap-2 w-full', attrs: { role: 'group', 'aria-label': n.label } },
      h('span', { class: 'font-display font-bold text-base w-[5.5rem] shrink-0', text: `${n.emoji} ${n.label}` }));
    for (const l of LEVELS) {
      const b = h('button', {
        class: `${BTN} flex-1 min-w-0 border-4 text-base px-1 bg-white`, role: 'level', text: LEVEL_LABEL[l],
        attrs: { type: 'button', 'data-need': n.id, 'data-level': l, 'aria-pressed': 'false' },
      });
      b.addEventListener('click', () => {
        if (cond[n.id] === l) return;
        cond[n.id] = l;
        ctx.sfx.tick();
        update(true);
      });
      levelBtns.set(`${n.id}/${l}`, b);
      row.append(b);
    }
    return row;
  });

  const info = h('p', {
    class: 'text-center text-sm font-bold text-slate-600 min-h-10 w-full', role: 'part-info', attrs: { 'aria-live': 'polite' },
    text: 'Tap a part to find out what it does.',
  });
  const partBtns = PART_IDS.map(p => {
    const b = h('button', {
      class: `${BTN} flex-1 min-w-0 px-1 text-base border-4 border-sand bg-white`, role: 'part',
      attrs: { type: 'button', 'data-part': p, 'aria-label': cap(nameOf(p)) },
    }, h('span', { attrs: { 'aria-hidden': 'true' }, text: PLANT_PARTS[p].emoji }), h('span', { text: cap(nameOf(p)) }));
    b.addEventListener('click', () => {
      for (const o of partBtns) o.classList.toggle('border-ocean', o === b);
      for (const o of partBtns) o.classList.toggle('border-sand', o !== b);
      figure.emphasise(p);
      info.textContent = partSentence(p);
      ctx.sfx.tick();
      // an explicit tap, so it may speak whatever the auto-read setting is
      say(ctx, partSentence(p));
    });
    return b;
  });

  const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' },
    h('p', { class: 'text-center text-sm font-bold text-slate-500', text: EXPLORE_INTRO }),
    figure.root,
    h('div', { class: 'flex items-center gap-2 w-full' }, status, speakBtn),
    h('div', { class: 'flex flex-col gap-2 w-full' }, ...rows),
    h('div', { class: 'flex gap-2 w-full' }, ...partBtns),
    info);
  update(false);
  el.append(root);
  return { destroy: () => { figure.destroy(); root.remove(); } };
}

/** The four functions as full-width cards, one per part, in a fixed order. */
function functionStage(ctx: ToyContext, interactive: boolean) {
  const host = h('div', { class: 'w-full [&_.kit-choices]:flex-col [&_.kit-choices]:flex-nowrap [&_.kit-choice]:w-full [&_.kit-choice]:flex-row [&_.kit-choice]:justify-start [&_.kit-choice]:text-left [&_.kit-choice]:min-h-14 [&_.kit-choices]:gap-2 [&_.kit-choice]:py-1 [&_.kit-choice]:text-base [&_.kit-choice]:gap-3' });
  const cards = createChoiceCards(host, {
    options: PART_IDS.map(p => ({ id: p, label: cap(PLANT_PARTS[p].fn), emoji: PLANT_PARTS[p].emoji })),
    onSelect: () => ctx.sfx.tick(),
  });
  if (!interactive) cards.setLocked(true);
  const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' }, host);
  return { root, cards };
}

function renderChallenge(el: HTMLElement, q: PlantQuestion, ctx: ToyContext): ChallengeView<PlantAnswer> {
  if (q.kind === 'function') {
    const { root, cards } = functionStage(ctx, true);
    el.append(root);
    return {
      getAnswer: () => cards.selected() as PlantAnswer,
      reset: () => cards.reset(),
      destroy: () => { cards.destroy(); root.remove(); },
    };
  }
  let chosen: PlantAnswer = null;
  // No part names anywhere and no speech on a tap: the tap only picks, so nothing can leak the answer.
  const figure = createPlantFigure({
    interactive: true, labels: false, maxWidth: 190,
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

function generateQuestions(_stage: Stage, count: number, rng: Rng): PlantQuestion[] {
  const out: PlantQuestion[] = [];
  let parts: PartId[] = [];
  let kinds: PlantQuestion['kind'][] = [];
  let prev: PartId | undefined;
  for (let i = 0; i < count; i++) {
    // five of each kind in every ten
    if (i % 10 === 0) kinds = shuffle(rng, [...Array(5).fill('tap'), ...Array(5).fill('function')] as PlantQuestion['kind'][]);
    if (parts.length === 0) {
      parts = shuffle(rng, PART_IDS);
      // pop() takes from the end, so make sure the next part is not the previous one
      if (parts[parts.length - 1] === prev) [parts[0], parts[parts.length - 1]] = [parts[parts.length - 1], parts[0]];
    }
    const part = parts.pop()!;
    prev = part;
    const kind = kinds[i % 10];
    const text = kind === 'tap' ? `Tap the ${nameOf(part)}.` : `What does the ${nameOf(part)} do?`;
    out.push({ id: `q${i + 1}`, prompt: text, spoken: text, kind, part });
  }
  return out;
}

export const growPlantToy: Toy<PlantQuestion, PlantAnswer> = {
  meta: {
    id: 'growPlant', subject: 'science', stages: [3], title: 'Grow a Plant', icon: '🌻',
    objective: 'Say what the root, stem, leaf and flower do, and what a plant needs to grow well: water, light, warmth and air.',
  },
  explore,
  generateQuestions,
  renderChallenge,
  check(q, a) {
    if (a === null) return { correct: false, hint: q.kind === 'tap' ? 'Tap a part of the plant first!' : 'Choose what it does first!' };
    if (a === q.part) return { correct: true };
    return { correct: false, hint: q.kind === 'tap' ? `Look for the part that ${PLANT_PARTS[q.part].fn}.` : PLANT_PARTS[q.part].where };
  },
  describeAnswer(q, a) {
    if (a === null) return 'You did not choose yet';
    return q.kind === 'tap' ? `You tapped the ${nameOf(a)}` : `You chose "${PLANT_PARTS[a].fn}"`;
  },
  explain(q, a) {
    return {
      why: a === null ? 'You did not choose yet.' : q.kind === 'tap' ? `You tapped the ${nameOf(a)}.` : `You chose "${PLANT_PARTS[a].fn}".`,
      how: q.kind === 'tap' ? `This is the ${nameOf(q.part)}. ${partSentence(q.part)}` : partSentence(q.part),
    };
  },
  async demonstrate(el, q, ctx) {
    if (q.kind === 'function') {
      const { root, cards } = functionStage(ctx, false);
      el.append(root);
      const view: View = { destroy: () => { cards.destroy(); root.remove(); } };
      if (!root.isConnected) return view;
      cards.highlight(q.part, 'correct');
      ctx.sfx.tick();
      if (ctx.autoRead) say(ctx, `It is the ${nameOf(q.part)}!`);
      return view;
    }
    const figure = createPlantFigure({ interactive: false, labels: false, maxWidth: 190 });
    el.append(figure.root);
    const view: View = { destroy: () => figure.destroy() };
    if (!figure.root.isConnected) return view;
    figure.glow([q.part]);
    figure.emphasise(q.part);
    ctx.sfx.tick();
    if (ctx.autoRead) say(ctx, `This is the ${nameOf(q.part)}.`);
    return view;
  },
};
