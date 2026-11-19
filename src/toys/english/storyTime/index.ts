import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { shuffle } from '../../../core/rng';
import { STORIES, storyOf, type Story, type StoryQuestionData, type StoryQuestionKind } from '../../../content/english/stories';
import { BTN, button, h } from '../../../ui/dom';
import { createChoiceCards } from '../../../ui/kit/choiceCards';
import { readAloud } from '../../../ui/readAloud';

export type StoryQuestion = Question & {
  storyId: string;
  title: string;
  /** The three choices, already shuffled. */
  options: string[];
  answer: string;
  kind: StoryQuestionKind;
  evidence: string;
  /** First question of its story in the round: the story starts open, even on phones. */
  storyFirst: boolean;
};
export type StoryAnswer = string | null;

const ROUND = 10;
const FIRST_TAKE = 6;
const STEP_MS = 650;
const PARA_CLASS = 'text-lg sm:text-xl leading-relaxed text-slate-800';
const EVIDENCE = ['bg-emerald-200', 'rounded'];
const OTHER_VOICES = '[data-role="speak"], [data-role="check"], [data-role="next"]';
const say = (ctx: ToyContext, text: string) => { void ctx.speech.speak(text).catch(() => {}); };
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
let panelSeq = 0;
/** 1-based number of the paragraph that holds the question's evidence. */
const paragraphOf = (q: StoryQuestion) => storyOf(q.storyId).paragraphs.findIndex(p => p.includes(q.evidence)) + 1;

function makeQuestion(s: Story, d: StoryQuestionData, id: string, storyFirst: boolean, rng: Rng): StoryQuestion {
  return {
    id, prompt: d.q, storyId: s.id, title: s.title, options: shuffle(rng, d.options),
    answer: d.answer, kind: d.kind, evidence: d.evidence, storyFirst,
  };
}

/**
 * Rounds of 10: two different stories, 6 questions from one and 4 from the other (which gets 6 is
 * chosen by rng). Each story's questions stay together, in story order, so the child reads once.
 * Longer requests repeat the block; a block never starts with the story the previous one ended on.
 */
function generateQuestions(_stage: Stage, count: number, rng: Rng): StoryQuestion[] {
  const out: StoryQuestion[] = [];
  let prevStory = '';
  while (out.length < count) {
    const [a, b] = shuffle(rng, STORIES);
    const pickFrom = (s: Story, n: number) => {
      const chosen = new Set(shuffle(rng, s.questions).slice(0, n));
      return { s, qs: s.questions.filter(x => chosen.has(x)) };
    };
    let parts = [pickFrom(a, FIRST_TAKE), pickFrom(b, ROUND - FIRST_TAKE)];
    if (rng() < 0.5) parts.reverse();
    if (parts[0].s.id === prevStory) parts = [parts[1], parts[0]];
    for (const { s, qs } of parts) {
      qs.forEach((d, i) => {
        if (out.length < count) out.push(makeQuestion(s, d, `q${out.length + 1}`, i === 0, rng));
      });
    }
    prevStory = out[out.length - 1].storyId;
  }
  return out;
}

/** Plays paragraphs one after another with per-word highlight. toggle() = play / pause. */
function createReader(paras: { play(): Promise<void> }[], ctx: ToyContext, onChange: (playing: boolean) => void) {
  let token = 0;
  let playing = false;
  let next = 0;
  const set = (on: boolean) => { playing = on; onChange(on); };
  const run = async (my: number) => {
    for (let i = next; i < paras.length; i++) {
      next = i;
      await paras[i].play(); // the first speak() happens synchronously, inside the tap gesture
      if (my !== token) return;
    }
    next = 0;
    set(false);
  };
  return {
    toggle() {
      if (playing) {
        token++;
        set(false);
        ctx.speech.stop();
        return;
      }
      set(true);
      void run(++token);
    },
    stop() {
      if (!playing) return;
      token++;
      set(false);
      ctx.speech.stop();
    },
  };
}

/** Marks the word spans of `evidence` inside a readAloud paragraph. */
function markEvidence(p: HTMLElement, text: string, evidence: string) {
  const at = text.indexOf(evidence);
  if (at < 0) return;
  const end = at + evidence.length;
  const spans = [...p.children] as HTMLElement[];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    const span = spans[i++];
    if (span && m.index >= at && m.index < end) {
      span.classList.add(...EVIDENCE);
      span.dataset.evidence = 'true';
    }
  }
}

interface PanelOpts { collapsible: boolean; open: boolean }
/** Title, 🔊 read-along and paragraphs. Collapsible panels fold on phones and are always open on wide screens. */
function storyPanel(s: Story, ctx: ToyContext, o: PanelOpts) {
  const paraEls: HTMLElement[] = [];
  const paras = s.paragraphs.map(text => {
    const r = readAloud(text, ctx.speech, { auto: false });
    r.el.className = PARA_CLASS;
    r.el.dataset.role = 'paragraph';
    for (const w of r.el.children) w.classList.remove('px-0.5'); // natural word spacing for running text
    paraEls.push(r.el);
    return r;
  });
  const body = h('div', { class: 'flex-col gap-3', role: 'story-body' }, ...paraEls);
  const read = h('button', {
    class: `${BTN} bg-white border-2 border-slate-200 text-lg shrink-0`, role: 'read',
    attrs: { type: 'button', 'aria-pressed': 'false', 'aria-label': 'Read the story aloud' },
  });
  const paintRead = (on: boolean) => {
    read.textContent = on ? '⏸️ Pause' : '🔊 Read';
    read.setAttribute('aria-pressed', String(on));
    read.setAttribute('aria-label', on ? 'Pause reading' : 'Read the story aloud');
  };
  paintRead(false);

  let toggle: HTMLButtonElement | null = null;
  const setOpen = (open: boolean) => {
    body.dataset.open = String(open);
    body.classList.toggle('flex', open || !o.collapsible);
    body.classList.toggle('hidden', !open && o.collapsible);
    if (!o.collapsible) return;
    toggle!.textContent = open ? '🔼 Hide story' : '📖 Show story';
    toggle!.setAttribute('aria-expanded', String(open));
  };
  if (o.collapsible) {
    body.classList.add('wide:flex');
    body.id = `story-body-${++panelSeq}`;
    toggle = button('', () => setOpen(body.dataset.open !== 'true'), 'bg-sand border-2 border-amber-200 text-lg w-full wide:hidden', 'story-toggle');
    toggle.setAttribute('aria-controls', body.id);
  }
  setOpen(o.open);

  const reader = createReader(paras, ctx, paintRead);
  // Another voice starting (the question's 🔊, or feedback after Check) would be cut off when the reader
  // moves on to its next paragraph, so the read-along steps aside first (capture runs before their handlers).
  const yieldVoice = (e: Event) => {
    if ((e.target as Element | null)?.closest?.(OTHER_VOICES)) reader.stop();
  };
  document.addEventListener('click', yieldVoice, true);
  read.addEventListener('click', () => {
    if (read.getAttribute('aria-pressed') !== 'true') setOpen(true);
    reader.toggle();
  });

  const root = h('div', { class: 'flex flex-col gap-3 w-full min-w-0', attrs: { 'data-story': s.id } },
    h('div', { class: 'flex items-center gap-2' },
      h('h3', { class: 'font-display font-bold text-xl sm:text-2xl text-slate-700 flex-1 min-w-0', role: 'story-title', text: `${s.emoji} ${s.title}` }),
      read),
    toggle,
    body);
  return {
    root,
    play: () => { setOpen(true); reader.toggle(); },
    stopReading: () => reader.stop(),
    highlight(evidence: string) {
      setOpen(true);
      s.paragraphs.forEach((text, i) => markEvidence(paraEls[i], text, evidence));
    },
    destroy() { document.removeEventListener('click', yieldVoice, true); reader.stop(); root.remove(); },
  };
}

function explore(el: HTMLElement, ctx: ToyContext): View {
  let panel: ReturnType<typeof storyPanel> | null = null;
  const root = h('div', { class: 'flex flex-col gap-4 w-full min-w-0 max-w-[720px] mx-auto' });
  const closePanel = () => { panel?.destroy(); panel = null; };

  const showList = () => {
    closePanel();
    root.replaceChildren(
      h('p', { class: 'text-center font-bold text-slate-500', text: 'Pick a story to read.' }),
      h('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-3 w-full' },
        ...STORIES.map(s => {
          const b = h('button', {
            class: `${BTN} bg-white border-4 border-sand text-xl py-4 justify-start text-left toy-card`, role: 'story',
            attrs: { type: 'button', 'data-id': s.id },
          }, h('span', { class: 'text-4xl', attrs: { 'aria-hidden': 'true' }, text: s.emoji }), h('span', { text: s.title }));
          b.addEventListener('click', () => showStory(s));
          return b;
        })));
  };
  const showStory = (s: Story) => {
    closePanel();
    ctx.sfx.tick();
    panel = storyPanel(s, ctx, { collapsible: false, open: true });
    root.replaceChildren(
      button('📚 All stories', showList, 'bg-white border-2 border-slate-200 text-lg self-start', 'stories'),
      h('div', { class: 'bg-white rounded-3xl p-4 border-4 border-sky-100 toy-card w-full' }, panel.root),
      h('p', { class: 'text-center text-sm font-bold text-slate-500', text: 'Tap 🔊 Read to hear the story. Tap ⏸️ Pause to stop.' }));
    if (ctx.autoRead) panel.play(); // inside the tap gesture
  };
  showList();
  el.append(root);
  return { destroy: () => { closePanel(); root.remove(); } };
}

function questionStage(q: StoryQuestion, ctx: ToyContext, o: { interactive: boolean; open: boolean }) {
  const panel = storyPanel(storyOf(q.storyId), ctx, { collapsible: true, open: o.open });
  const host = h('div', { class: 'w-full' });
  const cards = createChoiceCards(host, {
    options: q.options.map(x => ({ id: x, label: x })),
    onSelect: id => { panel.stopReading(); ctx.sfx.tick(); if (ctx.autoRead) say(ctx, id); },
  });
  const list = host.firstElementChild as HTMLElement;
  list.className = 'kit-choices flex flex-col gap-3 w-full';
  for (const b of list.children) (b as HTMLElement).classList.add('w-full');
  if (!o.interactive) cards.setLocked(true);
  const wrap = h('div', { class: 'flex flex-col gap-4 w-full min-w-0 max-w-[720px] mx-auto', attrs: { 'data-question-story': q.storyId } },
    h('div', { class: 'bg-sky-50 rounded-2xl p-2 sm:p-3 border-2 border-sky-100' }, panel.root),
    h('p', { class: 'text-center text-sm font-bold text-slate-500', text: 'Choose the answer.' }),
    host);
  return { root: wrap, panel, cards, destroy: () => { panel.destroy(); cards.destroy(); wrap.remove(); } };
}

function renderChallenge(el: HTMLElement, q: StoryQuestion, ctx: ToyContext): ChallengeView<StoryAnswer> {
  const s = questionStage(q, ctx, { interactive: true, open: q.storyFirst });
  el.append(s.root);
  return { getAnswer: () => s.cards.selected(), reset: () => s.cards.reset(), destroy: s.destroy };
}

export const storyTimeToy: Toy<StoryQuestion, StoryAnswer> = {
  meta: {
    id: 'storyTime', subject: 'english', stages: [3], title: 'Story Time', icon: '📖',
    objective: 'Read short stories and answer who, what, why and order questions, finding the sentence in the story that proves the answer.',
  },
  explore,
  generateQuestions,
  renderChallenge,
  check(q, answer) {
    if (answer === q.answer) return { correct: true };
    if (!answer) return { correct: false, hint: 'Tap an answer first!' };
    return { correct: false, hint: `Look again at paragraph ${paragraphOf(q)}. Which sentence tells you?` };
  },
  describeAnswer: (_q, answer) => (answer ? `You chose "${answer}"` : 'You have not answered yet'),
  explain(q) {
    return { why: `The story says: "${q.evidence}"`, how: `So the answer is "${q.answer}".` };
  },
  async demonstrate(el, q, ctx) {
    const s = questionStage(q, ctx, { interactive: false, open: true });
    el.append(s.root);
    const view: View = { destroy: s.destroy };
    await sleep(STEP_MS);
    if (!s.root.isConnected) return view;
    s.panel.highlight(q.evidence);
    s.cards.highlight(q.answer, 'correct');
    ctx.sfx.tick();
    if (ctx.autoRead) say(ctx, `The story says: ${q.evidence}`);
    return view;
  },
};
