import type { View } from '../../core/types';
import { BTN, h } from '../dom';

export interface ChoiceOption { id: string; label: string; emoji?: string }
export interface ChoiceCardsOptions {
  options: ChoiceOption[];
  style?: 'cards' | 'balloons';
  onSelect?(id: string): void;
  /** Tapping the selected card again clears it. Default false: it stays selected. */
  allowDeselect?: boolean;
}
export interface ChoiceCardsView extends View {
  selected(): string | null;
  reset(): void;
  highlight(id: string, kind: 'correct' | 'hint'): void;
  setLocked(b: boolean): void;
}

/**
 * Single-select choice buttons, shown as cards or as balloons. Tapping the chosen one again
 * keeps it chosen unless allowDeselect (onSelect only fires for a new selection). highlight() is purely visual and
 * never changes the selection; reset() clears both.
 */
export function createChoiceCards(el: HTMLElement, o: ChoiceCardsOptions): ChoiceCardsView {
  const balloons = o.style === 'balloons';
  const btns = new Map<string, HTMLButtonElement>();
  let current: string | null = null;
  let locked = false;

  const root = h('div', {
    class: balloons ? 'kit-choices kit-balloons flex flex-wrap justify-center items-end gap-4' : 'kit-choices flex flex-wrap justify-center gap-3',
  });

  const paint = () => {
    for (const [id, b] of btns) {
      const on = id === current;
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('is-selected', on);
    }
  };

  for (const opt of o.options) {
    const b = h(
      'button',
      {
        class: balloons
          ? `${BTN} kit-choice kit-balloon flex-col rounded-full min-w-24 min-h-24 bg-white border-4 border-sand text-lg`
          : `${BTN} kit-choice flex-col bg-white border-4 border-sand text-lg min-w-24`,
        role: 'choice',
        attrs: { 'data-id': opt.id, 'aria-pressed': 'false' },
      },
      opt.emoji ? h('span', { class: 'text-3xl', attrs: { 'aria-hidden': 'true' } }, opt.emoji) : null,
      h('span', { text: opt.label }),
    );
    b.type = 'button';
    b.addEventListener('click', () => {
      if (locked) return;
      if (current === opt.id) {
        if (!o.allowDeselect) return;
        current = null;
      } else current = opt.id;
      paint();
      if (current) {
        // restart the pop animation (class removal + reflow) so repeated taps animate again
        b.classList.remove('kit-pop');
        void b.offsetWidth;
        b.classList.add('kit-pop');
        o.onSelect?.(opt.id);
      }
    });
    btns.set(opt.id, b);
    root.append(b);
  }
  el.append(root);

  const clearHighlights = () => {
    for (const b of btns.values()) {
      b.classList.remove('is-correct', 'is-hint', 'kit-pop');
      delete b.dataset.highlight;
    }
  };

  return {
    selected: () => current,
    reset() {
      current = null;
      clearHighlights();
      paint();
    },
    highlight(id, kind) {
      const b = btns.get(id);
      if (!b) return;
      b.dataset.highlight = kind;
      b.classList.toggle('is-correct', kind === 'correct');
      b.classList.toggle('is-hint', kind === 'hint');
      if (kind === 'correct') {
        b.classList.remove('kit-pop');
        void b.offsetWidth;
        b.classList.add('kit-pop');
      }
    },
    setLocked(b) {
      locked = b;
      root.classList.toggle('is-locked', b);
      for (const btn of btns.values()) btn.setAttribute('aria-disabled', String(b));
    },
    destroy() {
      root.remove();
    },
  };
}
