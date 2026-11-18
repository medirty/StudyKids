import type { Stage, Toy, View } from '../../core/types';
import type { Speech } from '../../core/types';
import { SUBJECTS } from '../../content/subjects';
import { h } from '../dom';
import { speakButton } from '../speakButton';

export interface SubjectMapProps {
  stage: Stage;
  toys: Toy<any, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  speech: Speech;
  hrefFor(subject: string): string;
  onOpen(subject: string): void;
  onStage(stage: Stage): void;
  /** Shown once when a profile is opened; `speak` only when that profile has autoRead on. */
  greeting?: { name: string; speak: boolean };
}

export function renderSubjectMap(el: HTMLElement, props: SubjectMapProps): View {
  const pill = h('div', { class: 'inline-flex rounded-full bg-sand p-1 border-2 border-amber-200', role: 'stage-toggle' });
  for (const s of [1, 3] as Stage[]) {
    const on = s === props.stage;
    const b = h('button', {
      class: `font-display font-bold rounded-full min-h-12 px-5 cursor-pointer ${on ? 'bg-amber-toy text-white shadow' : 'text-slate-600'}`,
      text: `Stage ${s}`,
      role: 'stage',
      attrs: { type: 'button', 'aria-pressed': String(on) },
    });
    b.addEventListener('click', () => { if (!on) props.onStage(s); });
    pill.append(b);
  }

  const grid = h('div', { class: 'grid grid-cols-2 md:grid-cols-4 gap-4 w-full' });
  for (const s of SUBJECTS) {
    const count = props.toys.filter(t => t.meta.subject === s.id && t.meta.stages.includes(props.stage)).length;
    const inner = [
      h('span', { class: 'text-6xl', text: s.icon }),
      h('span', { class: 'font-display font-bold text-xl leading-tight text-center', text: s.title }),
    ];
    let card: HTMLElement;
    if (count > 0) {
      const a = h('a', {
        class: 'toy-btn toy-card rounded-3xl px-3 pb-4 pt-12 flex flex-col items-center justify-center gap-2 text-white min-h-48 h-full no-underline cursor-pointer',
        style: { backgroundColor: s.color },
        role: 'subject',
        attrs: { href: props.hrefFor(s.id) },
      }, ...inner);
      a.addEventListener('click', e => { e.preventDefault(); props.onOpen(s.id); });
      card = a;
    } else {
      card = h('div', {
        class: 'rounded-3xl px-3 pb-4 pt-12 flex flex-col items-center justify-center gap-2 text-slate-500 min-h-48 h-full opacity-60 border-4 border-dashed',
        style: { borderColor: s.color, backgroundColor: '#F5EFE0' },
        role: 'subject-locked',
        attrs: { 'aria-disabled': 'true' },
      }, ...inner, h('span', { class: 'font-display font-semibold text-sm', text: '🔒 Soon' }));
    }
    const cell = h('div', { class: 'relative' }, card, speakButton(s.title, props.speech, 'absolute top-2 right-2 !w-12 !h-12'));
    grid.append(cell);
  }

  let fadeTimer: ReturnType<typeof setTimeout> | null = null;
  let greetingEl: HTMLElement | null = null;
  if (props.greeting) {
    const { name, speak } = props.greeting;
    const g = greetingEl = h('p', {
      class: 'font-display font-bold text-2xl sm:text-3xl text-slate-700 text-center max-w-full [overflow-wrap:anywhere] transition-opacity duration-700',
      role: 'greeting',
      text: `Hi, ${name}! 👋`,
      attrs: { 'aria-live': 'polite' },
    });
    fadeTimer = setTimeout(() => { fadeTimer = null; g.classList.add('opacity-0'); }, 4000);
    if (speak) void props.speech.speak(`Hi, ${name}!`).catch(() => {});
  }

  const wrap = h('section', { class: 'flex flex-col items-center gap-5 w-full' }, greetingEl, pill, grid);
  el.append(wrap);
  return { destroy: () => { if (fadeTimer !== null) clearTimeout(fadeTimer); wrap.remove(); } };
}
