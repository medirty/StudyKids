import { describe, it, expect } from 'vitest';
import { PROFILES } from '../../src/core/profiles';
import { AVATARS, getCustom, setCustom, resetCustom, displayProfile, sanitiseName } from '../../src/core/profileCustom';

const KEY = 'studykids.profileCustom';
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
  removeItem() { throw new Error('denied'); },
} as unknown as Storage;

describe('profileCustom', () => {
  it('offers eight avatars', () => {
    expect([...AVATARS]).toEqual(['👧', '👦', '🧒', '👶', '🐱', '🐶', '🦊', '🐼']);
  });
  it('defaults when nothing is stored', () => {
    const s = fake();
    expect(getCustom(s)).toEqual({});
    expect(displayProfile('adik', s)).toEqual({ name: 'Adik', emoji: '👧' });
    expect(displayProfile('kakak', s)).toEqual({ name: 'Kakak', emoji: '👦' });
  });
  it('set then display returns custom', () => {
    const s = fake();
    setCustom('adik', { name: 'Nadia', emoji: '🐱' }, s);
    expect(displayProfile('adik', s)).toEqual({ name: 'Nadia', emoji: '🐱' });
    expect(displayProfile('kakak', s)).toEqual({ name: 'Kakak', emoji: '👦' });
    expect(JSON.parse(s.getItem(KEY)!)).toEqual({ adik: { name: 'Nadia', emoji: '🐱' } });
  });
  it('sanitiseName trims, collapses whitespace and cuts to 12 code points', () => {
    expect(sanitiseName('  Nadia   Putri  ')).toBe('Nadia Putri');
    expect(sanitiseName('x'.repeat(200))).toBe('x'.repeat(12));
    expect(sanitiseName('🐱'.repeat(20))).toBe('🐱'.repeat(12));
  });
  it('sanitises on save: long name, empty name, unknown emoji', () => {
    const s = fake();
    setCustom('adik', { name: 'y'.repeat(200), emoji: '💩' }, s);
    expect(displayProfile('adik', s)).toEqual({ name: 'y'.repeat(12), emoji: '👧' });
    setCustom('kakak', { name: '   ', emoji: '🦊' }, s);
    expect(displayProfile('kakak', s)).toEqual({ name: 'Kakak', emoji: '🦊' });
  });
  it('ignores malformed or tampered storage', () => {
    for (const raw of ['{bad', 'null', '[]', '42', '"x"', JSON.stringify({ adik: 5, kakak: { name: 7, emoji: {} } }),
      JSON.stringify({ adik: { name: 'z'.repeat(200), emoji: 'nope' }, other: { name: 'Q', emoji: '🐱' } })]) {
      const s = fake({ [KEY]: raw });
      expect(() => getCustom(s)).not.toThrow();
      expect(displayProfile('kakak', s)).toEqual({ name: 'Kakak', emoji: '👦' });
    }
    const s = fake({ [KEY]: JSON.stringify({ adik: { name: 'z'.repeat(200), emoji: 'nope' } }) });
    expect(displayProfile('adik', s)).toEqual({ name: 'z'.repeat(12), emoji: '👧' });
    expect(Object.keys(getCustom(fake({ [KEY]: JSON.stringify({ other: { name: 'Q', emoji: '🐱' } }) })))).toEqual([]);
  });
  it('never throws when storage throws', () => {
    expect(() => setCustom('adik', { name: 'A', emoji: '🐱' }, throwing)).not.toThrow();
    expect(() => resetCustom('adik', throwing)).not.toThrow();
    expect(getCustom(throwing)).toEqual({});
    expect(displayProfile('adik', throwing)).toEqual({ name: 'Adik', emoji: '👧' });
  });
  it('reset removes only that profile', () => {
    const s = fake();
    setCustom('adik', { name: 'Nadia', emoji: '🐱' }, s);
    setCustom('kakak', { name: 'Raka', emoji: '🐶' }, s);
    resetCustom('adik', s);
    expect(displayProfile('adik', s)).toEqual({ name: 'Adik', emoji: '👧' });
    expect(displayProfile('kakak', s)).toEqual({ name: 'Raka', emoji: '🐶' });
  });
  it('leaves fixed profile data untouched', () => {
    const s = fake();
    setCustom('adik', { name: 'Nadia', emoji: '🐱' }, s);
    expect(PROFILES.adik).toEqual({ id: 'adik', name: 'Adik', emoji: '👧', stage: 1, defaultMode: 'explore', autoRead: true });
  });
});
