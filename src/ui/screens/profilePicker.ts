import type { View } from '../../core/types';
import { PROFILES, type ProfileId } from '../../core/profiles';
import { h } from '../dom';

export function renderProfilePicker(el: HTMLElement, props: { onPick(id: ProfileId): void }): View {
  const grid = h('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl mx-auto' });
  const colours: Record<ProfileId, string> = { adik: 'bg-coral', kakak: 'bg-ocean' };
  for (const p of Object.values(PROFILES)) {
    const b = h(
      'button',
      { class: `toy-btn toy-card ${colours[p.id]} text-white rounded-3xl p-6 sm:p-10 flex flex-col items-center gap-3 cursor-pointer min-h-48`, role: 'profile', attrs: { type: 'button' } },
      h('span', { class: 'text-7xl sm:text-8xl', text: p.emoji }),
      h('span', { class: 'font-display font-bold text-4xl', text: p.name }),
    );
    b.addEventListener('click', () => props.onPick(p.id));
    grid.append(b);
  }
  const wrap = h('section', { class: 'flex flex-col items-center gap-6 pt-4' },
    h('h1', { class: 'font-display font-bold text-3xl sm:text-4xl text-slate-700 text-center', text: "Who's playing? 👋" }),
    grid);
  el.append(wrap);
  return { destroy: () => wrap.remove() };
}
