import { describe, it, expect } from 'vitest';
import { parseHash, toHash, type Route } from '../../src/core/router';

describe('router', () => {
  const routes: Route[] = [
    { name: 'grades' },
    { name: 'subjects', grade: 1 },
    { name: 'subjects', grade: 6 },
    { name: 'toys', grade: 3, subject: 'math' },
    { name: 'toy', grade: 1, subject: 'math', toy: 'clock', mode: 'explore' },
    { name: 'toy', grade: 3, subject: 'gp', toy: 'x', mode: 'challenge' },
    { name: 'toy', grade: 5, subject: 'english', toy: 'a b/c', mode: 'explore' },
  ];
  it('round-trips every variant', () => {
    for (const r of routes) expect(parseHash(toHash(r))).toEqual(r);
  });
  it('formats hashes', () => {
    expect(toHash(routes[0])).toBe('#/');
    expect(toHash(routes[1])).toBe('#/k/1');
    expect(toHash(routes[3])).toBe('#/k/3/math');
    expect(toHash(routes[4])).toBe('#/k/1/math/clock/explore');
  });
  it('falls back to grades for garbage and old routes', () => {
    for (const h of ['', '#', '#/', '#/garbage', '#/k', '#/k/', '#/k/0', '#/k/7', '#/k/x', '#/k/9/math', '#/k/01', '#/p/adik/1', '#/p/adik/1/math/clock/explore', '%%%']) {
      expect(parseHash(h)).toEqual({ name: 'grades' });
    }
  });
  it('unknown subject falls back to subjects', () => {
    expect(parseHash('#/k/3/history')).toEqual({ name: 'subjects', grade: 3 });
  });
  it('bad or missing mode becomes the grade default', () => {
    expect(parseHash('#/k/1/math/clock/dance')).toEqual({ name: 'toy', grade: 1, subject: 'math', toy: 'clock', mode: 'explore' });
    expect(parseHash('#/k/4/math/clock/x')).toEqual({ name: 'toy', grade: 4, subject: 'math', toy: 'clock', mode: 'challenge' });
    expect(parseHash('#/k/2/math/clock')).toEqual({ name: 'toy', grade: 2, subject: 'math', toy: 'clock', mode: 'explore' });
  });
  it('never throws on bad encoding / nullish', () => {
    expect(() => parseHash('#/k/1/math/%E0%A4%A/explore')).not.toThrow();
    expect(() => parseHash(undefined as unknown as string)).not.toThrow();
    expect(parseHash('#/k/1/math/%E0%A4%A/explore')).toEqual({ name: 'toys', grade: 1, subject: 'math' });
    expect(parseHash(undefined as unknown as string)).toEqual({ name: 'grades' });
  });
});
