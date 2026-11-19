import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDragSort } from '../../../src/ui/kit/dragSort';

let host: HTMLElement;
beforeEach(() => { host = document.createElement('div'); document.body.append(host); });
afterEach(() => { host.remove(); document.querySelectorAll('[data-role="sort-ghost"]').forEach((g) => g.remove()); });

const items = [{ id: 'a', label: 'Apple', emoji: '🍎' }, { id: 'b', label: 'Bus' }];
const bins = [{ id: 'x', label: 'Food' }, { id: 'y', label: 'Vehicles' }];
const rect = (l: number, t: number, w: number, h: number) =>
  ({ left: l, top: t, right: l + w, bottom: t + h, width: w, height: h, x: l, y: t, toJSON() {} }) as DOMRect;

function setup() {
  const onDrop = vi.fn();
  const tick = vi.fn();
  const view = createDragSort(host, { items, bins, onDrop, tick });
  const q = (sel: string) => host.querySelector<HTMLElement>(sel)!;
  const item = (id: string) => q(`[data-role="sort-item"][data-id="${id}"]`);
  const bin = (id: string) => q(`[data-role="sort-bin"][data-id="${id}"]`);
  bin('x').getBoundingClientRect = () => rect(0, 200, 150, 100);
  bin('y').getBoundingClientRect = () => rect(160, 200, 150, 100);
  item('a').getBoundingClientRect = () => rect(10, 10, 80, 48);
  return { view, onDrop, tick, item, bin, q };
}
function ptr(type: string, x: number, y: number, target: EventTarget = window, id = 1) {
  const e = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true, button: 0 });
  Object.assign(e, { pointerId: id, isPrimary: true, pointerType: 'touch' });
  target.dispatchEvent(e);
}
const binOf = (el: HTMLElement) => el.closest<HTMLElement>('[data-role="sort-bin"]')?.dataset.id ?? null;

describe('createDragSort', () => {
  it('renders items in the tray and bins with the required roles', () => {
    const s = setup();
    expect(host.querySelectorAll('[data-role="sort-item"]')).toHaveLength(2);
    expect(host.querySelectorAll('[data-role="sort-bin"]')).toHaveLength(2);
    expect(s.view.placed()).toEqual({});
  });

  it('drags an item into a bin with pointer events and calls onDrop', () => {
    const { item, view, onDrop } = setup();
    ptr('pointerdown', 20, 20, item('a'));
    ptr('pointermove', 30, 60);
    const ghost = document.querySelector<HTMLElement>('[data-role="sort-ghost"]');
    expect(ghost).not.toBeNull();
    expect(ghost!.style.pointerEvents).toBe('none');
    ptr('pointermove', 50, 250);
    ptr('pointerup', 50, 250);
    expect(document.querySelector('[data-role="sort-ghost"]')).toBeNull();
    expect(binOf(item('a'))).toBe('x');
    expect(view.placed()).toEqual({ a: 'x' });
    expect(onDrop).toHaveBeenCalledExactlyOnceWith('a', 'x');
  });

  it('marks the bin under the ghost while dragging', () => {
    const { item, bin } = setup();
    ptr('pointerdown', 20, 20, item('a'));
    ptr('pointermove', 200, 250);
    expect(bin('y').classList.contains('is-over')).toBe(true);
    ptr('pointermove', 20, 20);
    expect(bin('y').classList.contains('is-over')).toBe(false);
    ptr('pointerup', 20, 20);
  });

  it('dropping outside every bin leaves the item in the tray and does not call onDrop', () => {
    const { item, onDrop, view } = setup();
    ptr('pointerdown', 20, 20, item('a'));
    ptr('pointermove', 20, 120);
    ptr('pointerup', 20, 120);
    expect(binOf(item('a'))).toBeNull();
    expect(onDrop).not.toHaveBeenCalled();
    expect(view.placed()).toEqual({});
  });

  it('tap item then tap bin does the same', () => {
    const { item, bin, view, onDrop } = setup();
    item('a').click();
    expect(item('a').getAttribute('aria-pressed')).toBe('true');
    bin('y').click();
    expect(binOf(item('a'))).toBe('y');
    expect(item('a').getAttribute('aria-pressed')).toBe('false');
    expect(view.placed()).toEqual({ a: 'y' });
    expect(onDrop).toHaveBeenCalledExactlyOnceWith('a', 'y');
  });

  it('a pointer tap (press and release without moving) still selects via click', () => {
    const { item, bin, onDrop } = setup();
    ptr('pointerdown', 20, 20, item('a'));
    ptr('pointerup', 20, 20);
    item('a').click();
    expect(item('a').getAttribute('aria-pressed')).toBe('true');
    bin('x').click();
    expect(onDrop).toHaveBeenCalledWith('a', 'x');
  });

  it('the click that follows a drag does not select the item', () => {
    const { item } = setup();
    ptr('pointerdown', 20, 20, item('a'));
    ptr('pointermove', 20, 120);
    ptr('pointerup', 20, 120);
    item('a').click();
    expect(item('a').getAttribute('aria-pressed')).toBe('false');
  });

  it('tapping the selected item again deselects; tapping a bin with nothing selected does nothing', () => {
    const { item, bin, onDrop } = setup();
    bin('x').click();
    item('a').click();
    item('a').click();
    expect(item('a').getAttribute('aria-pressed')).toBe('false');
    bin('x').click();
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('a placed item can be tapped and moved to another bin without re-placing in its own bin', () => {
    const { item, bin, onDrop } = setup();
    item('a').click(); bin('x').click();
    item('a').click(); // bubbles must not hit bin x
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(item('a').getAttribute('aria-pressed')).toBe('true');
    bin('y').click();
    expect(binOf(item('a'))).toBe('y');
    expect(onDrop).toHaveBeenLastCalledWith('a', 'y');
  });

  it('pointercancel mid-drag removes the ghost, keeps the item in the tray and does not drop', () => {
    const { item, onDrop, view } = setup();
    ptr('pointerdown', 20, 20, item('a'));
    ptr('pointermove', 50, 250);
    expect(document.querySelector('[data-role="sort-ghost"]')).not.toBeNull();
    ptr('pointercancel', 50, 250);
    expect(document.querySelector('[data-role="sort-ghost"]')).toBeNull();
    expect(binOf(item('a'))).toBeNull();
    expect(item('a').classList.contains('is-dragging')).toBe(false);
    expect(onDrop).not.toHaveBeenCalled();
    expect(view.placed()).toEqual({});
    // and a later pointerup does nothing
    ptr('pointerup', 50, 250);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('ignores a second pointer while one is dragging', () => {
    const { item, onDrop } = setup();
    ptr('pointerdown', 20, 20, item('a'), 1);
    ptr('pointermove', 20, 120, window, 1);
    ptr('pointerup', 50, 250, window, 2);
    expect(document.querySelector('[data-role="sort-ghost"]')).not.toBeNull();
    expect(onDrop).not.toHaveBeenCalled();
    ptr('pointerup', 50, 250, window, 1);
    expect(onDrop).toHaveBeenCalledWith('a', 'x');
  });

  it('sets touch-action:none on items only', () => {
    const { item, bin, q } = setup();
    expect(item('a').style.touchAction).toBe('none');
    expect(item('b').style.touchAction).toBe('none');
    expect(bin('x').style.touchAction).toBe('');
    expect(q('[data-role="sort-tray"]').style.touchAction).toBe('');
    expect(host.firstElementChild!.getAttribute('style') ?? '').not.toContain('touch-action');
  });

  it('destroy mid-drag removes the ghost and the window listeners', () => {
    const { item, view, onDrop } = setup();
    const remove = vi.spyOn(window, 'removeEventListener');
    ptr('pointerdown', 20, 20, item('a'));
    ptr('pointermove', 50, 250);
    view.destroy();
    expect(document.querySelector('[data-role="sort-ghost"]')).toBeNull();
    expect(host.childElementCount).toBe(0);
    expect(remove.mock.calls.map((c) => c[0])).toEqual(expect.arrayContaining(['pointermove', 'pointerup', 'pointercancel']));
    ptr('pointerup', 50, 250);
    expect(onDrop).not.toHaveBeenCalled();
    remove.mockRestore();
  });

  it('reset returns everything to the tray; setLocked blocks interaction and cancels a drag', () => {
    const { item, bin, view, onDrop } = setup();
    item('a').click(); bin('x').click();
    view.reset();
    expect(view.placed()).toEqual({});
    expect(binOf(item('a'))).toBeNull();
    view.setLocked(true);
    item('b').click();
    expect(item('b').getAttribute('aria-pressed')).toBe('false');
    ptr('pointerdown', 20, 20, item('a'));
    ptr('pointermove', 20, 120);
    expect(document.querySelector('[data-role="sort-ghost"]')).toBeNull();
    view.setLocked(false);
    item('b').click(); bin('y').click();
    expect(onDrop).toHaveBeenLastCalledWith('b', 'y');
  });

  it('locking mid-drag drops the ghost', () => {
    const { item, view, onDrop } = setup();
    ptr('pointerdown', 20, 20, item('a'));
    ptr('pointermove', 20, 120);
    view.setLocked(true);
    expect(document.querySelector('[data-role="sort-ghost"]')).toBeNull();
    ptr('pointerup', 50, 250);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('a stale drag (no up/cancel) is ended by lostpointercapture', () => {
    const { item, onDrop } = setup();
    ptr('pointerdown', 20, 20, item('a'));
    ptr('pointermove', 20, 120);
    expect(document.querySelector('[data-role="sort-ghost"]')).not.toBeNull();
    ptr('lostpointercapture', 20, 120, item('a'));
    expect(document.querySelector('[data-role="sort-ghost"]')).toBeNull();
    expect(onDrop).not.toHaveBeenCalled();
    ptr('pointerdown', 20, 20, item('a'), 2);
    ptr('pointermove', 50, 250, window, 2);
    ptr('pointerup', 50, 250, window, 2);
    expect(onDrop).toHaveBeenCalledWith('a', 'x');
  });

  it('a new primary pointerdown cancels a stale drag', () => {
    const { item, onDrop } = setup();
    ptr('pointerdown', 20, 20, item('a'), 1);
    ptr('pointermove', 20, 120, window, 1);
    ptr('pointerdown', 20, 20, item('b'), 5);
    expect(document.querySelectorAll('[data-role="sort-ghost"]')).toHaveLength(0);
    ptr('pointermove', 50, 250, window, 5);
    expect(document.querySelectorAll('[data-role="sort-ghost"]')).toHaveLength(1);
    ptr('pointerup', 50, 250, window, 5);
    expect(onDrop).toHaveBeenCalledExactlyOnceWith('b', 'x');
  });

  it('click suppression after a drag expires on a timeout so a later keyboard Enter works', () => {
    vi.useFakeTimers();
    try {
      const { item } = setup();
      ptr('pointerdown', 20, 20, item('a'));
      ptr('pointermove', 20, 120);
      ptr('pointerup', 20, 120); // touch: no click follows
      vi.advanceTimersByTime(1);
      item('a').click();
      expect(item('a').getAttribute('aria-pressed')).toBe('true');
    } finally {
      vi.useRealTimers();
    }
  });

  it('announces placements in an aria-live=polite status', () => {
    const { item, bin, q } = setup();
    const live = q('[aria-live="polite"]');
    expect(live).not.toBeNull();
    item('a').click(); bin('x').click();
    expect(live.textContent).toBe('Apple → Food');
  });

  it('the ghost is not focusable and does not carry is-selected', () => {
    const { item } = setup();
    item('a').click();
    expect(item('a').classList.contains('is-selected')).toBe(true);
    ptr('pointerdown', 20, 20, item('a'));
    ptr('pointermove', 20, 120);
    const ghost = document.querySelector<HTMLElement>('[data-role="sort-ghost"]')!;
    expect(ghost.getAttribute('tabindex')).toBe('-1');
    expect(ghost.classList.contains('is-selected')).toBe(false);
    ptr('pointerup', 20, 120);
  });

  it('items are at least 48px by class and calls tick', () => {
    const { item, tick } = setup();
    expect(item('a').className).toContain('min-h-12');
    expect(item('a').className).toContain('min-w-12');
    item('a').click();
    expect(tick).toHaveBeenCalled();
  });
});
