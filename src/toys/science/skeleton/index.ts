import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { shuffle } from '../../../core/rng';
import {
  BONES, BONE_IDS, JOB_QUESTIONS, MOVE_NOTE, SHOULDER_BLADE_NOTE, displayName, introSentence, type BoneId,
} from '../../../content/science/skeleton';
import { h } from '../../../ui/dom';
import { createFigure } from './figure';

export type SkeletonQuestion = Question & {
  kind: 'name' | 'job';
  /** The bone the question is about (its job is the hint). */
  target: BoneId;
  /** Bones that count as right. */
  accepts: BoneId[];
};
export type SkeletonAnswer = BoneId | null;

const say = (ctx: ToyContext, text: string) => { void ctx.speech.speak(text).catch(() => {}); };
const nameOf = (b: BoneId) => BONES[b].name;
/** "This is the skull. The skull protects our brain." */
const explainText = (b: BoneId) => `${introSentence(b)} ${BONES[b].job}`;

function explore(el: HTMLElement, ctx: ToyContext): View {
  const name = h('p', { class: 'font-display font-bold text-3xl text-slate-800 text-center min-h-10', role: 'bone-name', attrs: { 'aria-live': 'polite' } });
  const intro = h('p', { class: 'text-center text-lg font-bold text-slate-600 min-h-7', role: 'bone-intro' });
  const job = h('p', { class: 'text-center text-lg font-bold text-ocean min-h-14', role: 'bone-job', attrs: { 'aria-live': 'polite' } });
  const prompt = h('p', { class: 'text-center text-sm font-bold text-slate-500', text: 'Tap a bone to find out what it does.' });
  const figure = createFigure({
    interactive: true, labels: true,
    onTap: (bone, node) => {
      figure.select(bone);
      node.blur?.();
      name.textContent = displayName(bone);
      intro.textContent = introSentence(bone);
      job.textContent = BONES[bone].job;
      ctx.sfx.tick();
      // A tap is an explicit action, so it speaks whatever the auto-read setting is.
      say(ctx, explainText(bone));
    },
  });
  const notes = h('div', { class: 'toy-card bg-white rounded-2xl p-3 text-center text-sm font-bold text-slate-600 flex flex-col gap-1 w-full' },
    h('p', { text: MOVE_NOTE }),
    h('p', { text: SHOULDER_BLADE_NOTE }));
  const root = h('div', { class: 'flex flex-col items-center gap-2 w-full min-w-0 max-w-[640px] mx-auto' },
    prompt, name, intro, job, figure.root, notes);
  el.append(root);
  return { destroy: () => { figure.destroy(); root.remove(); } };
}

function renderChallenge(el: HTMLElement, _q: SkeletonQuestion, ctx: ToyContext): ChallengeView<SkeletonAnswer> {
  let chosen: SkeletonAnswer = null;
  // No bone names anywhere and no speech on a tap: the tap only picks, so nothing can leak the answer.
  // (The shell's own 🔊 beside the prompt replays the question.)
  const figure = createFigure({
    interactive: true, labels: false,
    onTap: bone => { chosen = bone; figure.select(bone); ctx.sfx.tick(); },
  });
  const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' }, figure.root);
  el.append(root);
  return {
    getAnswer: () => chosen,
    reset: () => { chosen = null; figure.select(null); },
    destroy: () => { figure.destroy(); root.remove(); },
  };
}

/**
 * Each block of 10 has 3 or 4 job questions at random places, the rest are "Tap the ...".
 * One bag holds every bone and is dealt in shuffled order, so a bone only comes back after all the
 * others: the first 12 questions (so a round of 10) never repeat a bone. Two questions in a row never
 * share a bone, even where the bag is refilled.
 */
function generateQuestions(_stage: Stage, count: number, rng: Rng): SkeletonQuestion[] {
  let bag: BoneId[] = [];
  const draw = (avoid: BoneId | undefined): BoneId => {
    if (bag.length === 0) {
      bag = shuffle(rng, BONE_IDS);
      const last = bag.length - 1;
      if (bag[last] === avoid) [bag[0], bag[last]] = [bag[last], bag[0]];
    }
    return bag.pop()!;
  };
  const out: SkeletonQuestion[] = [];
  let prev: BoneId | undefined;
  let jobSlots = new Set<number>();
  for (let i = 0; i < count; i++) {
    if (i % 10 === 0) {
      const len = Math.min(10, count - i);
      const n = Math.round(len * (rng() < 0.5 ? 3 : 4) / 10);
      jobSlots = new Set(shuffle(rng, Array.from({ length: len }, (_, k) => k)).slice(0, n));
    }
    const kind = jobSlots.has(i % 10) ? 'job' : 'name';
    const target = draw(prev);
    prev = target;
    const text = kind === 'job' ? JOB_QUESTIONS[target].prompt : `Tap the ${nameOf(target)}`;
    out.push({
      id: `q${i + 1}`, prompt: text, spoken: text, kind, target,
      accepts: kind === 'job' ? [...JOB_QUESTIONS[target].accepts] : [target],
    });
  }
  return out;
}

export const skeletonToy: Toy<SkeletonQuestion, SkeletonAnswer> = {
  meta: {
    id: 'skeleton', subject: 'science', stages: [3], title: 'Skeleton Builder', icon: '💀',
    objective: 'Name the main bones of the skeleton and say how they protect, support and help us move.',
  },
  explore,
  generateQuestions,
  renderChallenge,
  check(q, answer) {
    if (answer === null) return { correct: false, hint: 'Tap a bone first!' };
    if (q.accepts.includes(answer)) return { correct: true };
    return { correct: false, hint: q.kind === 'job' ? JOB_QUESTIONS[q.target].hint : BONES[q.target].job };
  },
  describeAnswer: (_q, answer) => (answer === null ? 'nothing yet' : `You tapped the ${nameOf(answer)}`),
  explain: (q, answer) => ({
    why: answer === null ? 'You did not tap a bone yet.' : `You tapped the ${nameOf(answer)}.`,
    how: explainText(q.target),
  }),
  async demonstrate(el, q, ctx) {
    const figure = createFigure({ interactive: false, labels: false });
    el.append(figure.root);
    const view: View = { destroy: () => figure.destroy() };
    if (!figure.root.isConnected) return view;
    figure.glow(q.accepts);
    ctx.sfx.tick();
    if (ctx.autoRead) say(ctx, `${BONES[q.target].isPlural ? 'These are the' : 'This is the'} ${nameOf(q.target)}.`);
    return view;
  },
};
