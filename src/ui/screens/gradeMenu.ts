import type { Speech, Stage, View } from '../../core/types';
import { GRADES } from '../../core/grades';
import { h } from '../dom';
import { speakButton } from '../speakButton';

export interface GradeMenuProps {
  openGrades: Stage[];
  onPick(grade: Stage): void;
  speech: Speech;
}

// One friendly colour per grade (white text on each stays readable at large sizes).
const GRADE_COLORS: Record<Stage, string> = {
  1: '#F59E0B', 2: '#FF6B6B', 3: '#10B981', 4: '#3B82F6', 5: '#8B5CF6', 6: '#EC4899',
};

export function renderGradeMenu(el: HTMLElement, props: GradeMenuProps): View {
  const grid = h('div', { class: 'grid grid-cols-2 md:grid-cols-3 gap-4 w-full' });
  for (const g of GRADES) {
    const open = props.openGrades.includes(g);
    const color = GRADE_COLORS[g];
    const inner = [
      h('span', { class: 'font-display font-bold text-3xl sm:text-5xl leading-none whitespace-nowrap', text: `Grade ${g}` }),
      h('span', { class: 'font-sans font-semibold text-base sm:text-lg opacity-90', text: `Kelas ${g}` }),
    ];
    let card: HTMLElement;
    if (open) {
      card = h('a', {
        class: 'toy-btn toy-card rounded-3xl px-3 pb-5 pt-12 flex flex-col items-center justify-center gap-2 text-white min-h-44 h-full no-underline cursor-pointer',
        style: { backgroundColor: color },
        role: 'grade-card',
        attrs: { href: `#/k/${g}`, 'data-grade': String(g) },
      }, ...inner);
      card.addEventListener('click', e => { e.preventDefault(); props.onPick(g); });
    } else {
      card = h('div', {
        class: 'rounded-3xl px-3 pb-5 pt-12 flex flex-col items-center justify-center gap-2 text-slate-500 min-h-44 h-full opacity-60 border-4 border-dashed',
        style: { borderColor: color, backgroundColor: '#F5EFE0' },
        role: 'grade-card',
        attrs: { 'aria-disabled': 'true', 'data-grade': String(g) },
      }, ...inner, h('span', { class: 'font-display font-semibold text-sm', text: '🔒 Soon' }));
    }
    grid.append(h('div', { class: 'relative' }, card, open && speakButton(`Grade ${g}`, props.speech, 'absolute top-2 right-2 !w-12 !h-12')));
  }
  const wrap = h('section', { class: 'flex flex-col items-center gap-5 w-full' },
    h('h1', { class: 'font-display font-bold text-3xl sm:text-4xl text-slate-700 text-center', text: 'Choose your grade' }),
    grid);
  el.append(wrap);
  return { destroy: () => wrap.remove() };
}
