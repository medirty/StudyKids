import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { shuffle } from '../../../core/rng';
import { RULE_CAPTIONS, VERBS, captionOf, entryOf, pastOf, type VerbEntry } from '../../../content/english/verbs';
import { button, h } from '../../../ui/dom';
import { createChoiceCards } from '../../../ui/kit/choiceCards';
import { createTiles } from '../../../ui/kit/tiles';

export type PastQuestion = Question & {
  verb: string; past: string; kind: 'regular' | 'irregular';
  /** Irregular only: the three choices, already shuffled. */
  options?: string[];
};
export type PastAnswer = string;

const MACHINE_MS = 1200;
const STEP_MS = 650;
const ENDINGS = ['ed', 'd', 'ied'];
const say = (ctx: ToyContext, text: string) => { void ctx.speech.speak(text).catch(() => {}); };
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const verbFor = (q: PastQuestion) => (q.kind === 'irregular' ? 'chose' : 'made');
const dot = (caption: string) => (caption.endsWith('!') ? caption : `${caption}.`);

function pop(el: HTMLElement) {
  el.classList.remove('kit-pop');
  void el.offsetWidth;
  el.classList.add('kit-pop');
}

/** The tile sequences that build the past form, one step at a time (used by "Show me"). */
export function buildSteps(verb: string): string[][] {
  const e = entryOf(verb);
  const root = [...verb];
  const last = root[root.length - 1];
  switch (e.rule) {
    case 'ed': return [[...root, 'ed']];
    case 'd': return [[...root, 'd']];
    case 'double': return [[...root, last], [...root, last, 'ed']];
    case 'ied': return [root.slice(0, -1), [...root.slice(0, -1), 'ied']];
    default: return [];
  }
}

function irregularOptions(e: VerbEntry, rng: Rng): string[] {
  return shuffle(rng, [e.past, ...e.wrong!]);
}

function makeQuestion(e: VerbEntry, id: string, rng: Rng): PastQuestion {
  const irregular = e.rule === 'irregular';
  return {
    id, verb: e.verb, past: e.past, kind: irregular ? 'irregular' : 'regular',
    prompt: `Yesterday I … (${e.verb})`,
    spoken: `Yesterday I, ${e.verb}. What is the past tense of ${e.verb}?`,
    ...(irregular ? { options: irregularOptions(e, rng) } : {}),
  };
}

function generateQuestions(_stage: Stage, count: number, rng: Rng): PastQuestion[] {
  const out: PastQuestion[] = [];
  let bag: VerbEntry[] = [];
  let prev = '';
  for (let i = 0; i < count; i++) {
    if (bag.length === 0) {
      bag = shuffle(rng, VERBS);
      if (bag[bag.length - 1].verb === prev) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    const e = bag.pop()!;
    prev = e.verb;
    out.push(makeQuestion(e, `q${i + 1}`, rng));
  }
  return out;
}

function gearsEl() {
  const spin = (cls: string) => h('span', { class: `inline-block ${cls}`, attrs: { 'aria-hidden': 'true' }, text: '⚙️' });
  return h('div', {
    class: 'flex items-center justify-center gap-1 min-h-16', role: 'gears', attrs: { 'data-running': 'false' },
  }, spin('text-5xl'), spin('text-3xl'), spin('text-5xl'));
}
function setGears(g: HTMLElement, on: boolean) {
  g.dataset.running = String(on);
  for (const s of g.children) s.classList.toggle('motion-safe:animate-spin', on);
}

function explore(el: HTMLElement, ctx: ToyContext): View {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const gears = gearsEl();
  const verbEl = h('div', { class: 'font-display font-bold text-3xl text-slate-700 min-h-10', role: 'machine-verb' });
  const pastEl = h('div', { class: 'font-display font-bold text-4xl text-coral min-h-12', role: 'past', attrs: { 'aria-live': 'polite' } });
  const captionEl = h('div', { class: 'text-lg font-bold text-slate-600 min-h-14', role: 'caption' });
  const machine = h('div', { class: 'sticky top-1 z-10 bg-white rounded-3xl p-3 border-4 border-sky-100 toy-card flex flex-col items-center gap-1 w-full text-center' },
    verbEl, gears, pastEl, captionEl);
  verbEl.textContent = 'Pick a verb';

  const run = (verb: string) => {
    clearTimeout(timer);
    const past = pastOf(verb);
    verbEl.textContent = verb;
    pastEl.textContent = '';
    captionEl.textContent = '';
    setGears(gears, true);
    ctx.sfx.tick();
    say(ctx, verb); // inside the tap gesture, so iPad Safari allows it
    timer = setTimeout(() => {
      timer = undefined;
      setGears(gears, false);
      pastEl.textContent = past;
      captionEl.textContent = captionOf(verb);
      pop(pastEl);
      ctx.sfx.tick(true);
      if (root.isConnected) say(ctx, `Yesterday I ${past}.`);
    }, MACHINE_MS);
  };

  const grid = h('div', { class: 'grid grid-cols-3 gap-2 w-full' },
    ...VERBS.map(v => button(v.verb, () => run(v.verb), 'bg-white border-4 border-sand text-xl min-h-12', 'verb')));
  const root = h('div', { class: 'flex flex-col items-center gap-4 w-full min-w-0 max-w-[640px] mx-auto' },
    machine,
    h('p', { class: 'text-center text-sm font-bold text-slate-500', text: 'Tap a verb to put it in the machine.' }),
    grid);
  el.append(root);
  return { destroy: () => { clearTimeout(timer); timer = undefined; root.remove(); } };
}

/** Regular verbs: the root letters start in the slots; the child adds (or swaps) tiles to make the past form. */
function regularStage(q: PastQuestion, ctx: ToyContext, interactive: boolean) {
  const root = [...q.verb];
  const last = root[root.length - 1];
  const preview = h('div', { class: 'font-display font-bold text-3xl text-slate-700 text-center min-h-12', role: 'preview', attrs: { 'aria-live': 'polite' } });
  const host = h('div');
  const showPreview = () => { preview.textContent = `Yesterday I ${tiles.value().join('')}.`; };
  const tiles = createTiles(host, {
    tiles: [...root, last, ...ENDINGS], slots: root.length + 2,
    onTileTap: () => { ctx.sfx.tick(); showPreview(); },
  });
  const start = () => { tiles.reset(); tiles.fill(root); showPreview(); };
  start();
  if (!interactive) tiles.setLocked(true);
  const wrap = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto', attrs: { 'data-verb': q.verb } },
    h('div', { class: 'bg-white rounded-3xl p-3 border-4 border-sky-100 toy-card w-full flex flex-col items-center gap-2' },
      h('div', { class: 'text-5xl', attrs: { 'aria-hidden': 'true' }, text: '⚙️' }), preview),
    host,
    interactive ? h('p', { class: 'text-center text-sm font-bold text-slate-500', text: 'Tap tiles to build the past form. Tap a letter to take it away.' }) : null);
  return {
    root: wrap, tiles, start,
    show(values: string[]) { tiles.fill(values); showPreview(); },
    destroy: () => { tiles.destroy(); wrap.remove(); },
  };
}

function irregularStage(q: PastQuestion, ctx: ToyContext, interactive: boolean) {
  const host = h('div');
  const options = q.options ?? irregularOptions(entryOf(q.verb), () => 0.5);
  const cards = createChoiceCards(host, {
    options: options.map(o => ({ id: o, label: o })),
    onSelect: () => ctx.sfx.tick(),
  });
  if (!interactive) cards.setLocked(true);
  const wrap = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto', attrs: { 'data-verb': q.verb } },
    h('div', { class: 'bg-white rounded-3xl p-3 border-4 border-sky-100 toy-card w-full text-center flex flex-col items-center gap-1' },
      h('div', { class: 'text-5xl', attrs: { 'aria-hidden': 'true' }, text: '⚙️' }),
      h('div', { class: 'text-sm font-bold text-slate-500', text: 'Which one is the past form?' })),
    host);
  return { root: wrap, cards, destroy: () => { cards.destroy(); wrap.remove(); } };
}

function renderChallenge(el: HTMLElement, q: PastQuestion, ctx: ToyContext): ChallengeView<PastAnswer> {
  if (q.kind === 'irregular') {
    const s = irregularStage(q, ctx, true);
    el.append(s.root);
    return { getAnswer: () => s.cards.selected() ?? '', reset: () => s.cards.reset(), destroy: s.destroy };
  }
  const s = regularStage(q, ctx, true);
  el.append(s.root);
  return { getAnswer: () => s.tiles.value().join(''), reset: s.start, destroy: s.destroy };
}

export const pastTenseToy: Toy<PastQuestion, PastAnswer> = {
  meta: {
    id: 'pastTense', subject: 'english', stages: [3], title: 'Past Tense Machine', icon: '⚙️',
    objective: 'Change verbs into the past tense: add -ed, double the last letter, add -d, change y to i, and learn the irregular ones.',
  },
  explore,
  generateQuestions,
  renderChallenge,
  check(q, answer) {
    if (answer.trim().toLowerCase() === q.past) return { correct: true };
    return { correct: false, hint: RULE_CAPTIONS[entryOf(q.verb).rule] };
  },
  describeAnswer: (q, answer) => (answer ? `You ${verbFor(q)} "${answer}"` : 'You have not answered yet'),
  explain(q, answer) {
    return {
      why: answer ? `You ${verbFor(q)} "${answer}"` : 'You have not answered yet',
      how: `${q.verb} becomes ${q.past}. ${dot(captionOf(q.verb))}`,
    };
  },
  async demonstrate(el, q, ctx) {
    const finish = () => { if (ctx.autoRead) say(ctx, `Yesterday I ${q.past}.`); };
    if (q.kind === 'irregular') {
      const s = irregularStage(q, ctx, false);
      el.append(s.root);
      const view: View = { destroy: s.destroy };
      await sleep(STEP_MS);
      if (!s.root.isConnected) return view;
      s.cards.highlight(q.past, 'correct');
      ctx.sfx.tick();
      finish();
      return view;
    }
    const s = regularStage(q, ctx, false);
    el.append(s.root);
    const view: View = { destroy: s.destroy };
    for (const step of buildSteps(q.verb)) {
      await sleep(STEP_MS);
      if (!s.root.isConnected) return view;
      s.show(step);
      ctx.sfx.tick();
    }
    finish();
    return view;
  },
};

