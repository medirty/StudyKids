import { describe, it, expect, vi } from 'vitest';
import { createTiles } from '../../../src/ui/kit/tiles';

function setup(tiles = ['c', 'a', 't'], slots = 3) {
  const host = document.createElement('div');
  document.body.append(host);
  const onTileTap = vi.fn();
  const view = createTiles(host, { tiles, slots, onTileTap });
  const pool = () => Array.from(host.querySelectorAll<HTMLElement>('.kit-tile-pool [data-role="tile"]'));
  const slot = (i: number) => host.querySelectorAll<HTMLElement>('[data-role="slot"]')[i]!;
  const poolTile = (t: string) => pool().find((e) => e.textContent === t)!;
  return { host, view, onTileTap, pool, slot, poolTile };
}

describe('createTiles', () => {
  it('renders tiles and slots', () => {
    const { host, view } = setup();
    expect(host.querySelectorAll('[data-role="tile"]')).toHaveLength(3);
    expect(host.querySelectorAll('[data-role="slot"]')).toHaveLength(3);
    expect(view.value()).toEqual([]);
  });
  it('fills slots left to right and value() keeps that order', () => {
    const { view, poolTile, slot, pool } = setup();
    poolTile('t').click(); poolTile('c').click();
    expect(view.value()).toEqual(['t', 'c']);
    expect(slot(0).textContent).toBe('t');
    expect(slot(1).textContent).toBe('c');
    expect(slot(2).textContent).toBe('');
    expect(pool().map((e) => e.textContent)).toEqual(['a']);
  });
  it('tapping a filled slot returns the tile to the pool in its original place and packs the row', () => {
    const { view, poolTile, slot, pool } = setup();
    poolTile('c').click(); poolTile('a').click(); poolTile('t').click();
    slot(0).click();
    expect(view.value()).toEqual(['a', 't']);
    expect(pool().map((e) => e.textContent)).toEqual(['c']);
    // tapping the tile itself inside a slot works too
    slot(0).querySelector<HTMLElement>('[data-role="tile"]')!.click();
    expect(view.value()).toEqual(['t']);
    expect(pool().map((e) => e.textContent)).toEqual(['c', 'a']);
  });
  it('ignores taps on empty slots and stops filling when full', () => {
    const { view, poolTile, slot } = setup(['a', 'b', 'c'], 2);
    slot(0).click();
    poolTile('a').click(); poolTile('b').click(); poolTile('c').click();
    expect(view.value()).toEqual(['a', 'b']);
  });
  it('handles duplicate tile strings', () => {
    const { view, pool } = setup(['a', 'a', 'b'], 3);
    pool()[0]!.click(); pool()[0]!.click();
    expect(view.value()).toEqual(['a', 'a']);
  });
  it('fill() sets values in order, ignores extras and unknowns; reset() clears', () => {
    const { view, pool } = setup();
    view.fill(['t', 'a', 'c', 'x']);
    expect(view.value()).toEqual(['t', 'a', 'c']);
    expect(pool()).toHaveLength(0);
    view.fill(['zzz', 'a']);
    expect(view.value()).toEqual(['a']);
    view.reset();
    expect(view.value()).toEqual([]);
    expect(pool().map((e) => e.textContent)).toEqual(['c', 'a', 't']);
  });
  it('calls onTileTap for user taps (both directions) but not for fill()', () => {
    const { view, poolTile, slot, onTileTap } = setup();
    view.fill(['c']);
    expect(onTileTap).not.toHaveBeenCalled();
    poolTile('a').click();
    slot(0).click();
    expect(onTileTap.mock.calls).toEqual([['a'], ['c']]);
  });
  it('setLocked ignores taps on tiles and slots until unlocked', () => {
    const { view, poolTile, slot, onTileTap } = setup();
    view.fill(['c']);
    view.setLocked(true);
    poolTile('a').click();
    slot(0).click();
    slot(0).querySelector<HTMLElement>('[data-role="tile"]')!.click();
    expect(view.value()).toEqual(['c']);
    expect(onTileTap).not.toHaveBeenCalled();
    view.setLocked(false);
    poolTile('a').click();
    expect(view.value()).toEqual(['c', 'a']);
  });
  it('tiles and slots are >=48px by class; destroy removes everything', () => {
    const { host, view, poolTile, slot } = setup();
    expect(poolTile('c').className).toContain('min-h-12');
    expect(poolTile('c').className).toContain('min-w-12');
    expect(slot(0).className).toContain('min-h-12');
    expect(slot(0).className).toContain('min-w-12');
    view.destroy();
    expect(host.childElementCount).toBe(0);
  });
});
