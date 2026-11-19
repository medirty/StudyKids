import type { View } from '../../core/types';
import { BTN, h } from '../dom';

export interface SortItem { id: string; label: string; emoji?: string }
export interface SortBin { id: string; label: string; emoji?: string }
export interface DragSortOptions {
  items: SortItem[];
  bins: SortBin[];
  onDrop(itemId: string, binId: string): void;
  tick?: () => void;
}
export interface DragSortView extends View {
  placed(): Record<string, string>;
  reset(): void;
  setLocked(b: boolean): void;
}

/** Pointer movement (px) before a press turns into a drag; below it the gesture stays a tap. */
const DRAG_THRESHOLD = 6;

interface Drag {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  offX: number;
  offY: number;
  active: boolean;
  ghost: HTMLElement | null;
  over: string | null;
}

/**
 * Sort items into bins. Two ways in, both always available:
 *  - drag: pointer events with a floating ghost (the real item never leaves the DOM, so a
 *    cancelled drag simply drops the ghost and the item stays where it was);
 *  - tap: tap an item to pick it up (aria-pressed), then tap a bin.
 * touch-action:none is set on the items only, so the page can still scroll from anywhere else.
 */
export function createDragSort(el: HTMLElement, o: DragSortOptions): DragSortView {
  const itemEls = new Map<string, HTMLButtonElement>();
  const binEls = new Map<string, HTMLElement>();
  const zones = new Map<string, HTMLElement>();
  const placedMap = new Map<string, string>();
  let selected: string | null = null;
  let locked = false;
  let drag: Drag | null = null;
  let suppressClick = false;
  let destroyed = false;
  let suppressTimer: ReturnType<typeof setTimeout> | null = null;

  const tray = h('div', { class: 'kit-tray flex flex-wrap justify-center gap-2 p-2 rounded-2xl bg-sand min-h-16', role: 'sort-tray' });
  const binsWrap = h('div', { class: 'grid grid-cols-2 gap-3' });
  const status = h('div', { class: 'sr-only', role: 'sort-status', attrs: { 'aria-live': 'polite' } });
  const root = h('div', { class: 'kit-dragsort flex flex-col gap-4 w-full' }, tray, binsWrap, status);

  for (const b of o.bins) {
    const zone = h('div', { class: 'flex flex-wrap justify-center content-start gap-2 min-h-16 w-full' });
    const bin = h(
      'div',
      {
        class: 'kit-bin toy-card flex flex-col items-center gap-2 p-2 rounded-2xl bg-white border-4 border-dashed border-sand min-h-24',
        role: 'sort-bin',
        attrs: { 'data-id': b.id, tabindex: '0', 'aria-label': b.label },
      },
      h('div', { class: 'font-display font-bold text-lg text-center' }, b.emoji ? `${b.emoji} ${b.label}` : b.label),
      zone,
    );
    bin.addEventListener('click', () => {
      if (!locked && selected) place(selected, b.id);
    });
    bin.addEventListener('keydown', (e) => {
      if (e.target !== bin || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      if (!locked && selected) place(selected, b.id);
    });
    binEls.set(b.id, bin);
    zones.set(b.id, zone);
    binsWrap.append(bin);
  }

  for (const it of o.items) {
    const item = h(
      'button',
      {
        class: `${BTN} kit-item bg-white border-4 border-sand text-lg`,
        role: 'sort-item',
        attrs: { 'data-id': it.id, 'aria-pressed': 'false' },
        style: { touchAction: 'none' },
      },
      it.emoji ? h('span', { class: 'text-2xl', attrs: { 'aria-hidden': 'true' } }, it.emoji) : null,
      h('span', { text: it.label }),
    );
    item.type = 'button';
    item.addEventListener('pointerdown', (e) => onPointerDown(e, it.id, item));
    item.addEventListener('contextmenu', (e) => e.preventDefault());
    item.addEventListener('lostpointercapture', (e) => {
      if (drag && drag.id === it.id && e.pointerId === drag.pointerId) onCancel(e);
    });
    item.addEventListener('click', (e) => {
      e.stopPropagation(); // a tap on a placed item must not count as a tap on its bin
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      if (locked) return;
      select(selected === it.id ? null : it.id);
    });
    itemEls.set(it.id, item);
    tray.append(item);
  }

  el.append(root);

  function clearSuppress() {
    suppressClick = false;
    if (suppressTimer) clearTimeout(suppressTimer);
    suppressTimer = null;
  }

  // Swallow the click that follows a drag, but only briefly: on touch no click may follow at all.
  function armSuppress() {
    clearSuppress();
    suppressClick = true;
    suppressTimer = setTimeout(clearSuppress, 0);
  }

  function select(id: string | null) {
    if (selected) itemEls.get(selected)?.setAttribute('aria-pressed', 'false');
    itemEls.get(selected ?? '')?.classList.remove('is-selected');
    selected = id;
    if (id) {
      const item = itemEls.get(id);
      item?.setAttribute('aria-pressed', 'true');
      item?.classList.add('is-selected');
      o.tick?.();
    }
  }

  function place(itemId: string, binId: string) {
    const item = itemEls.get(itemId);
    const zone = zones.get(binId);
    if (!item || !zone) return;
    const changed = placedMap.get(itemId) !== binId;
    select(null);
    if (!changed) return;
    placedMap.set(itemId, binId);
    zone.append(item);
    o.tick?.();
    const binDef = o.bins.find((b) => b.id === binId);
    const itemDef = o.items.find((i) => i.id === itemId);
    status.textContent = `${itemDef?.label ?? ''} → ${binDef?.label ?? ''}`;
    o.onDrop(itemId, binId);
  }

  function binAt(x: number, y: number): string | null {
    for (const [id, bin] of binEls) {
      const r = bin.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id;
    }
    return null;
  }

  function setOver(id: string | null) {
    if (!drag || drag.over === id) return;
    if (drag.over) binEls.get(drag.over)?.classList.remove('is-over');
    drag.over = id;
    if (id) binEls.get(id)?.classList.add('is-over');
  }

  function onPointerDown(e: PointerEvent, id: string, item: HTMLButtonElement) {
    if (locked || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    endDrag(); // a new primary press means any earlier drag is stale (its up/cancel never arrived)
    clearSuppress();
    const r = item.getBoundingClientRect();
    drag = { id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, offX: e.clientX - r.left, offY: e.clientY - r.top, active: false, ghost: null, over: null };
    try {
      item.setPointerCapture(e.pointerId);
    } catch {
      /* not supported (or pointer already gone): window listeners still cover us */
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  }

  function startDrag(d: Drag) {
    const item = itemEls.get(d.id)!;
    const r = item.getBoundingClientRect();
    const ghost = item.cloneNode(true) as HTMLElement;
    ghost.removeAttribute('data-id');
    ghost.removeAttribute('aria-pressed');
    ghost.classList.remove('is-selected');
    ghost.setAttribute('tabindex', '-1');
    ghost.dataset.role = 'sort-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      width: `${r.width}px`,
      pointerEvents: 'none',
      zIndex: '1000',
      opacity: '0.9',
      touchAction: 'none',
    });
    document.body.append(ghost);
    d.ghost = ghost;
    d.active = true;
    select(null);
    item.classList.add('is-dragging');
    o.tick?.();
  }

  function onMove(e: PointerEvent) {
    const d = drag;
    if (!d || e.pointerId !== d.pointerId) return;
    if (!d.active) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD) return;
      startDrag(d);
    }
    d.ghost!.style.transform = `translate(${e.clientX - d.offX}px, ${e.clientY - d.offY}px)`;
    setOver(binAt(e.clientX, e.clientY));
  }

  function endDrag(): Drag | null {
    const d = drag;
    drag = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    if (!d) return null;
    d.ghost?.remove();
    if (d.over) binEls.get(d.over)?.classList.remove('is-over');
    const item = itemEls.get(d.id);
    item?.classList.remove('is-dragging');
    try {
      item?.releasePointerCapture(d.pointerId);
    } catch {
      /* already released */
    }
    return d;
  }

  function onUp(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = endDrag()!;
    if (!d.active) return; // a tap: the click handler takes it from here
    armSuppress();
    const binId = binAt(e.clientX, e.clientY);
    if (binId) place(d.id, binId);
  }

  function onCancel(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (endDrag()!.active) armSuppress();
    // the real item never moved, so it is already back where it started
  }

  return {
    placed: () => Object.fromEntries(placedMap),
    reset() {
      endDrag();
      select(null);
      placedMap.clear();
      for (const item of itemEls.values()) tray.append(item);
    },
    setLocked(b) {
      locked = b;
      if (b) {
        endDrag();
        select(null);
      }
      root.classList.toggle('is-locked', b);
      for (const item of itemEls.values()) item.disabled = b;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      endDrag();
      clearSuppress();
      root.remove();
    },
  };
}
