import type { View } from '../../core/types';
import { BTN, h } from '../dom';

export interface TilesOptions {
  tiles: string[];
  slots: number;
  onTileTap?(t: string): void;
}
export interface TilesView extends View {
  value(): string[];
  reset(): void;
  fill(values: string[]): void;
  setLocked(b: boolean): void;
}

/**
 * Tap-to-build tiles. Tapping a tile in the pool drops it into the left-most empty slot; tapping
 * a tile (or its slot) in the row sends it back to the pool. Filled slots always stay packed to
 * the left, so value() is simply the filled slots in order. Tiles are distinct objects, so
 * duplicate strings ('a', 'a') behave.
 */
export function createTiles(el: HTMLElement, o: TilesOptions): TilesView {
  interface Tile { text: string; el: HTMLButtonElement; home: number }
  const tiles: Tile[] = o.tiles.map((text, home) => {
    const b = h('button', { class: `${BTN} kit-tile bg-white border-4 border-sand text-2xl`, role: 'tile', text });
    b.type = 'button';
    return { text, el: b, home };
  });
  let locked = false;
  const filled: Tile[] = []; // slot i holds filled[i]

  const pool = h('div', { class: 'kit-tile-pool flex flex-wrap justify-center gap-2 p-2 rounded-2xl bg-sand min-h-16' });
  const slotEls = Array.from({ length: o.slots }, (_, i) =>
    h('div', {
      class: 'kit-slot flex items-center justify-center min-w-12 min-h-12 rounded-2xl border-4 border-dashed border-sand bg-white',
      role: 'slot',
      attrs: { 'data-index': String(i) },
    }),
  );
  const row = h('div', { class: 'kit-slots flex flex-wrap justify-center gap-2' }, ...slotEls);
  const root = h('div', { class: 'kit-tiles flex flex-col gap-4 w-full' }, row, pool);

  function render() {
    pool.replaceChildren();
    for (const t of tiles) if (!filled.includes(t)) pool.append(t.el); // tiles[] is already in home order
    slotEls.forEach((s, i) => {
      s.replaceChildren();
      const t = filled[i];
      if (t) s.append(t.el);
      s.classList.toggle('is-filled', !!t);
    });
  }

  for (const t of tiles) {
    t.el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (locked) return;
      if (filled.includes(t)) filled.splice(filled.indexOf(t), 1);
      else if (filled.length < o.slots) filled.push(t);
      else return;
      render();
      o.onTileTap?.(t.text);
    });
  }
  slotEls.forEach((s, i) =>
    s.addEventListener('click', () => {
      if (locked || !filled[i]) return;
      const t = filled[i]!;
      filled.splice(i, 1);
      render();
      o.onTileTap?.(t.text);
    }),
  );

  render();
  el.append(root);

  return {
    value: () => filled.map((t) => t.text),
    reset() {
      filled.length = 0;
      render();
    },
    fill(values) {
      filled.length = 0;
      for (const v of values) {
        if (filled.length >= o.slots) break;
        const t = tiles.find((x) => x.text === v && !filled.includes(x));
        if (t) filled.push(t);
      }
      render();
    },
    setLocked(b) {
      locked = b;
      root.classList.toggle('is-locked', b);
      for (const t of tiles) t.el.setAttribute('aria-disabled', String(b));
    },
    destroy() {
      root.remove();
    },
  };
}
