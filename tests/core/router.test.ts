import { describe, it, expect } from 'vitest';
import { parseHash, toHash, type Route } from '../../src/core/router';

describe('router', () => {
  const routes: Route[] = [
    { name: 'profiles' },
    { name: 'subjects', profile: 'adik', stage: 1 },
    { name: 'toys', profile: 'kakak', stage: 3, subject: 'math' },
    { name: 'toy', profile: 'adik', stage: 1, subject: 'math', toy: 'clock', mode: 'explore' },
    { name: 'toy', profile: 'kakak', stage: 3, subject: 'gp', toy: 'x', mode: 'challenge' },
  ];
  it('round-trips every variant', () => {
    for (const r of routes) expect(parseHash(toHash(r))).toEqual(r);
  });
  it('formats hashes', () => {
    expect(toHash(routes[0])).toBe('#/');
    expect(toHash(routes[1])).toBe('#/p/adik/1');
    expect(toHash(routes[2])).toBe('#/p/kakak/3/math');
    expect(toHash(routes[3])).toBe('#/p/adik/1/math/clock/explore');
  });
  it('falls back to profiles for garbage', () => {
    for (const h of ['', '#', '#/garbage', '#/p/nobody/1', '#/p', '#/p/', '%%%']) {
      expect(parseHash(h)).toEqual({ name: 'profiles' });
    }
  });
  it('invalid stage becomes profile stage', () => {
    expect(parseHash('#/p/adik/7')).toEqual({ name: 'subjects', profile: 'adik', stage: 1 });
    expect(parseHash('#/p/kakak/abc')).toEqual({ name: 'subjects', profile: 'kakak', stage: 3 });
    expect(parseHash('#/p/adik/2/math')).toEqual({ name: 'toys', profile: 'adik', stage: 1, subject: 'math' });
  });
  it('unknown subject falls back to subjects', () => {
    expect(parseHash('#/p/kakak/3/history')).toEqual({ name: 'subjects', profile: 'kakak', stage: 3 });
  });
  it('bad mode becomes profile default', () => {
    expect(parseHash('#/p/kakak/3/math/clock/dance')).toEqual({ name: 'toy', profile: 'kakak', stage: 3, subject: 'math', toy: 'clock', mode: 'challenge' });
    expect(parseHash('#/p/adik/1/math/clock')).toEqual({ name: 'toy', profile: 'adik', stage: 1, subject: 'math', toy: 'clock', mode: 'explore' });
  });
  it('never throws on bad encoding / nullish', () => {
    expect(() => parseHash('#/p/adik/1/math/%E0%A4%A/explore')).not.toThrow();
    expect(() => parseHash(undefined as unknown as string)).not.toThrow();
    expect(parseHash('#/p/adik/1/math/%E0%A4%A/explore')).toEqual({ name: 'toys', profile: 'adik', stage: 1, subject: 'math' });
  });
});
