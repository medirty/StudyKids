import type { Speech } from '../core/types';
import { h } from './dom';

const HIGHLIGHT = ['bg-amber-200', 'rounded'];

/**
 * Shows `text` word by word. Speaks `opts.spoken` instead when given (symbol-heavy prompts such as
 * "4 × 3 = ?" → "4 times 3"); then the whole prompt is highlighted while speaking, because the
 * engine's char indices refer to the spoken text, not the displayed words.
 */
export function readAloud(text: string, speech: Speech, opts: { auto: boolean; spoken?: string }): { el: HTMLElement; play(): Promise<void> } {
  const el = h('p', { class: 'font-display font-semibold text-2xl sm:text-3xl text-slate-800 leading-snug' });
  const words: { span: HTMLElement; start: number; end: number }[] = [];
  const re = /\S+/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) el.append(document.createTextNode(text.slice(last, m.index)));
    const span = h('span', { text: m[0], class: 'px-0.5' });
    el.append(span);
    words.push({ span, start: m.index, end: m.index + m[0].length });
    last = m.index + m[0].length;
  }
  if (last < text.length) el.append(document.createTextNode(text.slice(last)));

  const clear = () => words.forEach(w => w.span.classList.remove(...HIGHLIGHT));
  const spoken = opts.spoken;
  const play = async () => {
    if (spoken !== undefined) {
      el.classList.add(...HIGHLIGHT);
      try { await speech.speak(spoken); } catch { /* speech is best-effort */ }
      el.classList.remove(...HIGHLIGHT);
      return;
    }
    try {
      await speech.speak(text, {
        onWord: i => {
          clear();
          const w = words.find(x => i >= x.start && i < x.end) ?? words.find(x => x.start >= i);
          w?.span.classList.add(...HIGHLIGHT);
        },
      });
    } catch { /* speech is best-effort */ }
    clear();
  };
  if (opts.auto) void play();
  return { el, play };
}
