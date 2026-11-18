import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../../core/types';
import { pick, randInt } from '../../../core/rng';
import { button, h } from '../../../ui/dom';
import { createClockFace, type ClockFace } from './face';
import { digitalTime, hourMinute, sameTime, spokenTime } from './time';

export type ClockQuestion = Question & { target: number };

const STAGE3_MINUTES = [0, 0, 15, 15, 15, 30, 30, 30, 45, 45, 45, 5, 10, 20, 25, 35, 40, 50, 55];
// Large on wide screens so the hand hit lines (56 viewBox units) stay ≥ 48 CSS px.
const FACE_BOX = 'w-full max-w-[520px] aspect-square mx-auto';

function phraseOf(total: number): string {
  return spokenTime(total, false).phrase;
}

function minuteMatches(a: number, b: number): boolean {
  const d = Math.abs(hourMinute(a).minute - hourMinute(b).minute);
  return d <= 1 || d === 59;
}

// In the side-by-side challenge layout, keep the whole face + legend within the viewport height.
const FACE_BOX_FIT = 'wide:max-w-[min(520px,calc(100dvh-280px))]';

function mountFace(el: HTMLElement, opts: { minutes: number; snap: number; zones: boolean; interactive: boolean; fit?: boolean; onChange?: (t: number, major: boolean) => void }) {
  const box = h('div', { class: opts.fit ? `${FACE_BOX} ${FACE_BOX_FIT}` : FACE_BOX });
  el.append(box);
  const face = createClockFace(box, opts);
  return { box, face };
}

function legend(): HTMLElement {
  const pill = (bar: string, colours: string, a: string, b: string) =>
    h('div', { class: `flex items-center gap-2 px-3 py-1 rounded-full border ${colours}` },
      h('span', { class: `${bar} rounded-full inline-block` }),
      h('span', {}, a, h('strong', { text: b })));
  return h('div', { class: 'flex flex-wrap items-center justify-center gap-3 mt-3 text-xs sm:text-sm font-bold' },
    pill('w-4 h-2.5 bg-coral', 'bg-red-50 border-red-200 text-red-700', 'Short hand = ', 'Hour'),
    pill('w-5 h-2 bg-ocean', 'bg-blue-50 border-blue-200 text-blue-700', 'Long hand = ', 'Minutes'));
}

function explore(el: HTMLElement, ctx: ToyContext): View {
  const stage1 = ctx.stage === 1;
  let useQuarter = false;
  let showDigital = true;
  let zones = true;
  let snapOn = false;
  let dragged = false;
  let destroyed = false;

  const phraseEl = h('div', { class: 'font-display text-3xl sm:text-5xl font-bold text-slate-800 my-3 leading-tight break-words', role: 'phrase' });
  const hintEl = h('p', { class: 'text-sm sm:text-base font-bold text-emerald-700 bg-emerald-50 inline-block px-4 py-1.5 rounded-2xl mb-4', role: 'hint' });
  const digitalEl = h('span', { class: 'font-display text-xl sm:text-2xl font-bold text-slate-700 tracking-wider transition', role: 'digital' });

  const { face, box } = mountFace(h('div', { class: 'bg-white rounded-3xl border-4 border-amber-100 toy-card p-4 sm:p-6 w-full overflow-hidden' }), {
    minutes: 195, snap: 1, zones: true, interactive: true,
    onChange: (_t, major) => { dragged = true; ctx.sfx.tick(major); update(); },
  });
  const faceCard = box.parentElement!;
  faceCard.append(legend());

  const current = () => face.getMinutes();
  function update() {
    const t = current();
    const s = spokenTime(t, useQuarter);
    phraseEl.textContent = s.phrase;
    hintEl.textContent = s.hint;
    hintEl.className = `text-sm sm:text-base font-bold inline-block px-4 py-1.5 rounded-2xl mb-4 ${
      s.zone === 'to' ? 'text-violet-700 bg-violet-50' : s.zone === 'past' ? 'text-emerald-700 bg-emerald-50' : 'text-sky-700 bg-sky-50'}`;
    digitalEl.textContent = digitalTime(t);
    quickLabels.forEach(([span, minute]) => { span.textContent = quickLabel(minute); });
  }
  const say = () => { void ctx.speech.speak(`It's ${spokenTime(current(), useQuarter).phrase}!`).catch(() => {}); };
  const setTo = (total: number) => { ctx.sfx.tick(true); void face.setMinutes(total, 250); update(); };

  // phrase card
  const speakBtn = button('🔊 Read Aloud', say, 'bg-amber-toy text-white text-base sm:text-lg', 'speak');
  speakBtn.setAttribute('aria-label', 'Read the time aloud');
  const digitalToggle = button('👁️ Hide', () => {
    showDigital = !showDigital;
    digitalEl.classList.toggle('blur-md', !showDigital);
    digitalToggle.textContent = showDigital ? '👁️ Hide' : '🙈 Show';
  }, 'bg-white border border-slate-300 text-slate-600 text-sm', 'digital-toggle');
  const phraseHead = h('div', { class: 'flex items-center justify-between gap-2 flex-wrap mb-2' },
    h('span', { class: 'text-xs font-extrabold uppercase tracking-wider text-slate-400', text: 'How we say it' }));
  if (!stage1) {
    const pt = button('', () => { useQuarter = !useQuarter; ptLabel(); update(); }, 'bg-amber-100 text-amber-800 text-xs', 'phrase-toggle');
    const ptLabel = () => { pt.textContent = `Style: ${useQuarter ? 'quarter past / to' : '15 past / 15 to'} 🔄`; };
    ptLabel();
    phraseHead.append(pt);
  }
  const phraseCard = h('div', { class: 'bg-white rounded-3xl p-5 sm:p-6 border-4 border-sky-100 toy-card text-center' },
    phraseHead, phraseEl, hintEl,
    h('div', { class: 'flex flex-wrap items-center justify-center gap-3 pt-3 border-t-2 border-slate-100' },
      speakBtn,
      h('div', { class: 'flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-2xl border-2 border-slate-200' }, digitalEl, digitalToggle)));

  // quick jump
  const quickLabels: [HTMLElement, number][] = [];
  const quickLabel = (m: number) => m === 0 ? "O'clock" : m === 30 ? 'Half past' : m === 15 ? (useQuarter ? 'Quarter past' : '15 past') : (useQuarter ? 'Quarter to' : '15 to');
  const jumpTo = (minute: number) => {
    const block = Math.floor(hourMinute(current()).normalized / 60);
    setTo(block * 60 + minute);
  };
  const jumpStyles: Record<number, string> = {
    0: 'bg-slate-100 text-slate-800 border-slate-200',
    15: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    30: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    45: 'bg-violet-100 text-violet-900 border-violet-300',
  };
  const jumpGrid = h('div', { class: `grid gap-2.5 mb-3 grid-cols-2` });
  for (const m of stage1 ? [0, 30] : [0, 15, 30, 45]) {
    const label = h('span', { text: quickLabel(m) });
    quickLabels.push([label, m]);
    const b = button('', () => jumpTo(m), `${jumpStyles[m]} border-2 text-sm sm:text-base`, 'jump');
    b.append(label, ` (:${String(m).padStart(2, '0')})`);
    jumpGrid.append(b);
  }
  const stepRow = h('div', { class: 'grid grid-cols-3 gap-2.5' },
    button('⏪ -5', () => setTo(current() - 5), 'bg-sky-100 text-sky-900 border-2 border-sky-200 text-sm sm:text-base', 'minus5'),
    button('+5 ⏩', () => setTo(current() + 5), 'bg-sky-100 text-sky-900 border-2 border-sky-200 text-sm sm:text-base', 'plus5'),
    button('🎲 Random', () => setTo(Math.floor(Math.random() * 12) * 60 + (stage1 ? Math.floor(Math.random() * 2) * 30 : Math.floor(Math.random() * 12) * 5)), 'bg-coral text-white text-sm sm:text-base !px-2 whitespace-nowrap', 'random'));
  const quickCard = h('div', { class: 'bg-white rounded-3xl p-5 border-4 border-emerald-100 toy-card' },
    h('h3', { class: 'font-display text-lg font-bold text-slate-700 mb-3', text: '🎯 Quick Jump (Try These!)' }),
    jumpGrid, stepRow);

  const controls: HTMLElement[] = [];
  if (!stage1) {
    const zt = button('', () => { zones = !zones; face.setZones(zones); label(); }, 'bg-white border-2 border-slate-200 text-sm', 'zone-toggle');
    const st = button('', () => { snapOn = !snapOn; face.setSnap(snapOn ? 5 : 1); label(); }, 'bg-white border-2 border-slate-200 text-sm', 'snap-toggle');
    const label = () => {
      zt.textContent = `🎨 Past / To zones: ${zones ? 'ON' : 'OFF'}`;
      st.textContent = `🧲 Snap to 5: ${snapOn ? 'ON' : 'OFF'}`;
    };
    label();
    controls.push(h('div', { class: 'flex flex-wrap justify-center gap-2 mt-3' }, zt, st));
  }
  faceCard.append(...controls);

  const root = h('div', { class: 'grid grid-cols-1 lg:grid-cols-2 gap-4 w-full items-start min-w-0' },
    faceCard,
    h('div', { class: 'flex flex-col gap-4 min-w-0' }, phraseCard, quickCard));
  el.append(root);

  // Speak the phrase once a drag finishes, in auto-read profiles only.
  const onUp = () => {
    if (!dragged) return;
    dragged = false;
    if (ctx.autoRead && !destroyed) say();
  };
  window.addEventListener('pointerup', onUp);
  update();

  return {
    destroy() {
      destroyed = true;
      window.removeEventListener('pointerup', onUp);
      face.destroy();
      root.remove();
    },
  };
}

function renderChallenge(el: HTMLElement, _q: ClockQuestion, ctx: ToyContext): ChallengeView<number> {
  const snap = ctx.stage === 1 ? 30 : 5;
  const { box, face } = mountFace(el, {
    minutes: 0, snap, zones: false, interactive: true, fit: true,
    onChange: (_t, major) => ctx.sfx.tick(major),
  });
  const leg = legend();
  el.append(leg);
  return {
    getAnswer: () => face.getMinutes(),
    reset: () => { void face.setMinutes(0, 250); },
    destroy: () => { face.destroy(); box.remove(); leg.remove(); },
  };
}

function generateQuestions(stage: Stage, count: number, rng: Rng): ClockQuestion[] {
  const out: ClockQuestion[] = [];
  let prev = -1;
  for (let i = 0; i < count; i++) {
    let target: number;
    do {
      const hour = randInt(rng, 0, 11);
      const minute = stage === 1 ? pick(rng, [0, 30]) : pick(rng, STAGE3_MINUTES);
      target = hour * 60 + minute;
    } while (target === prev);
    prev = target;
    out.push({ id: `q${i + 1}`, prompt: `Show me ${phraseOf(target)}`, target });
  }
  return out;
}

export const clockToy: Toy<ClockQuestion, number> = {
  meta: {
    id: 'clock', subject: 'math', stages: [1, 3], title: 'Tick-Tock Time', icon: '🕒',
    objective: "Read and show time on an analogue clock (Stage 1: o'clock and half past; Stage 3: to 5 minutes, past and to).",
  },
  explore,
  generateQuestions,
  renderChallenge,
  check(q, answer) {
    if (sameTime(q.target, answer)) return { correct: true };
    const cur = hourMinute(answer);
    const tgt = hourMinute(q.target);
    let hint = `You set ${phraseOf(answer)}. `;
    if (!minuteMatches(q.target, answer)) {
      if (tgt.minute > 30 && cur.minute <= 30) hint += 'Hint: look at the long blue hand. "To" means the left (purple) side of the clock!';
      else if (tgt.minute > 0 && tgt.minute <= 30 && (cur.minute > 30 || cur.minute === 0)) hint += 'Hint: look at the long blue hand. "Past" means the right (green) side of the clock!';
      else hint += 'Check where the long blue hand is pointing!';
    } else if (tgt.minute > 30) {
      hint += `Your long blue hand is right! Now check the short red hand. It should be almost at ${tgt.nextHour12}!`;
    } else {
      hint += `Your long blue hand is right! Now point the short red hand toward ${tgt.hour12}!`;
    }
    return { correct: false, hint };
  },
  describeAnswer: (_q, answer) => `${digitalTime(answer)} (${phraseOf(answer)})`,
  explain(q, answer) {
    const tgt = hourMinute(q.target);
    const { zone } = spokenTime(q.target, false);
    let why: string;
    if (!minuteMatches(q.target, answer)) {
      why = zone === 'to' ? '"to" means BEFORE the next hour, so the long hand goes on the left side.'
        : zone === 'past' ? '"past" means AFTER the hour, so the long hand goes on the right side.'
        : "At o'clock the long hand points straight up to 12.";
    } else {
      why = 'The long hand was right, but the short hand shows the hour.';
      if (zone === 'to') why += ` For "to" times the short hand is almost at ${tgt.nextHour12}.`;
    }
    const how = `Put the long blue hand on ${tgt.minute === 0 ? 12 : tgt.minute / 5} and the short red hand ${tgt.minute !== 0 ? 'near' : 'on'} ${tgt.hour12}.`;
    return { why, how };
  },
  async demonstrate(el, q, ctx) {
    const { box, face } = mountFace(el, { minutes: 0, snap: 1, zones: true, interactive: false, fit: true });
    const view: View = { destroy: () => { face.destroy(); box.remove(); } };
    await face.setMinutes(q.target, 1500);
    if (!box.isConnected) return view; // removed (self or any ancestor) mid-way: stay silent
    if (ctx.autoRead) void ctx.speech.speak(`It's ${phraseOf(q.target)}!`).catch(() => {});
    return view;
  },
};
