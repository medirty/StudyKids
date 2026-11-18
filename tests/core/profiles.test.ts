import { describe, it, expect } from 'vitest';
import { PROFILES, getLastProfile, setLastProfile } from '../../src/core/profiles';

function fake(init: Record<string, string> = {}): Storage {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() { return m.size; },
  } as Storage;
}
const throwing = {
  getItem() { throw new Error('denied'); },
  setItem() { throw new Error('denied'); },
} as unknown as Storage;

describe('profiles', () => {
  it('defines adik and kakak', () => {
    expect(PROFILES.adik).toEqual({ id: 'adik', name: 'Adik', emoji: '👧', stage: 1, defaultMode: 'explore', autoRead: true });
    expect(PROFILES.kakak).toEqual({ id: 'kakak', name: 'Kakak', emoji: '👦', stage: 3, defaultMode: 'challenge', autoRead: false });
  });
  it('set then get', () => {
    const s = fake();
    setLastProfile('kakak', s);
    expect(s.getItem('studykids.lastProfile')).toBe('kakak');
    expect(getLastProfile(s)).toBe('kakak');
  });
  it('swallows storage errors', () => {
    expect(getLastProfile(throwing)).toBeNull();
    expect(() => setLastProfile('adik', throwing)).not.toThrow();
  });
  it('rejects invalid stored value', () => {
    expect(getLastProfile(fake({ 'studykids.lastProfile': 'hacker' }))).toBeNull();
    expect(getLastProfile(fake({ 'studykids.lastProfile': 'toString' }))).toBeNull();
  });
  it('survives a throwing localStorage getter', () => {
    const d = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
    try {
      expect(getLastProfile()).toBeNull();
      expect(() => setLastProfile('adik')).not.toThrow();
    } finally {
      if (d) Object.defineProperty(globalThis, 'localStorage', d); else delete (globalThis as any).localStorage;
    }
  });
});
