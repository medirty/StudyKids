import { describe, it, expect } from 'vitest';
import { mulberry32, randInt, pick, shuffle } from '../../src/core/rng';

describe('rng', () => {
  it('mulberry32 is deterministic for a seed', () => {
    const a = mulberry32(42), b = mulberry32(42);
    const sa = Array.from({ length: 20 }, () => a());
    const sb = Array.from({ length: 20 }, () => b());
    expect(sa).toEqual(sb);
    sa.forEach(v => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); });
  });
  it('randInt stays within inclusive bounds', () => {
    const r = mulberry32(7);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = randInt(r, 3, 6);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect(seen.size).toBe(4);
  });
  it('pick returns an element of the list', () => {
    const items = ['a', 'b', 'c'];
    expect(items).toContain(pick(mulberry32(1), items));
  });
  it('shuffle returns a permutation and does not mutate input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = [...input];
    const out = shuffle(mulberry32(5), input);
    expect(input).toEqual(copy);
    expect([...out].sort((x, y) => x - y)).toEqual(copy);
  });
});
