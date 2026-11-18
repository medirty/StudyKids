import type { Speech } from '../core/types';
import { h } from './dom';

export function speakButton(text: string, speech: Speech, cls = ''): HTMLButtonElement {
  const b = h('button', {
    class: `toy-btn bg-white text-xl rounded-full w-12 h-12 flex items-center justify-center border-2 border-slate-200 cursor-pointer ${cls}`,
    text: '🔊',
    role: 'speak',
    attrs: { 'aria-label': `Read aloud: ${text}`, type: 'button' },
  });
  b.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    void speech.speak(text).catch(() => {});
  });
  return b;
}
