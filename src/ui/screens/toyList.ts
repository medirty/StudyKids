import type { Speech, Stage, SubjectId, Toy, View } from '../../core/types';
import { SUBJECTS } from '../../content/subjects';
import { button, h } from '../dom';
import { speakButton } from '../speakButton';

export interface ToyListProps {
  subject: SubjectId;
  stage: Stage;
  toys: Toy<any, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  speech: Speech;
  hrefFor(toyId: string): string;
  onOpen(toyId: string): void;
  onBack(): void;
}

export function renderToyList(el: HTMLElement, props: ToyListProps): View {
  const subject = SUBJECTS.find(s => s.id === props.subject)!;
  const list = h('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-4 w-full' });
  for (const t of props.toys.filter(x => x.meta.subject === props.subject && x.meta.stages.includes(props.stage))) {
    const a = h('a', {
      class: 'toy-btn toy-card bg-white rounded-3xl border-4 p-4 pr-16 flex items-center gap-4 min-h-24 no-underline text-slate-800 cursor-pointer',
      style: { borderColor: subject.color },
      role: 'toy-card',
      attrs: { href: props.hrefFor(t.meta.id) },
    },
      h('span', { class: 'text-5xl', text: t.meta.icon }),
      h('span', { class: 'font-display font-bold text-xl', text: t.meta.title }));
    a.addEventListener('click', e => { e.preventDefault(); props.onOpen(t.meta.id); });
    list.append(h('div', { class: 'relative' }, a, speakButton(t.meta.title, props.speech, 'absolute top-1/2 -translate-y-1/2 right-3')));
  }
  const wrap = h('section', { class: 'flex flex-col gap-5 w-full' },
    h('div', { class: 'flex items-center gap-3' },
      button('←', props.onBack, 'bg-white border-2 border-slate-200 text-slate-700 text-2xl', 'back'),
      h('h2', { class: 'font-display font-bold text-2xl', text: `${subject.icon} ${subject.title}` })),
    list);
  el.append(wrap);
  return { destroy: () => wrap.remove() };
}
