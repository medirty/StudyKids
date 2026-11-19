import { describe, it, expect } from 'vitest';
import { GRADES, isGrade, gradeDefaults, getAutoRead, setAutoRead, getLastGrade, setLastGrade, clearLegacyStorage } from '../../src/core/grades';

function mem(init: Record<string, string> = {}): Storage {
  const m = new Map(Object.entries(init));
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: k => (m.has(k) ? m.get(k)! : null),
    key: i => Array.from(m.keys())[i] ?? null,
    removeItem: k => { m.delete(k); },
    setItem: (k, v) => { m.set(k, String(v)); },
  };
}
const throwing = (): Storage => {
  const boom = () => { throw new Error('denied'); };
  return { length: 0, clear: boom, getItem: boom, key: boom, removeItem: boom, setItem: boom };
};

describe('grades', () => {
  it('lists grades 1-6 and validates', () => {
    expect(GRADES).toEqual([1, 2, 3, 4, 5, 6]);
    for (const g of GRADES) expect(isGrade(g)).toBe(true);
    for (const v of [0, 7, '1', 1.5, null, undefined, NaN]) expect(isGrade(v)).toBe(false);
  });
  it('defaults per grade', () => {
    for (const g of [1, 2] as const) expect(gradeDefaults(g)).toEqual({ autoRead: true, defaultMode: 'explore' });
    for (const g of [3, 4, 5, 6] as const) expect(gradeDefaults(g)).toEqual({ autoRead: false, defaultMode: 'challenge' });
  });
  it('autoRead defaults when unset', () => {
    const s = mem();
    for (const g of GRADES) expect(getAutoRead(g, s)).toBe(gradeDefaults(g).autoRead);
  });
  it('autoRead round-trips per grade', () => {
    const s = mem();
    for (const g of GRADES) {
      const flipped = !gradeDefaults(g).autoRead;
      setAutoRead(g, flipped, s);
      expect(getAutoRead(g, s)).toBe(flipped);
    }
    setAutoRead(1, false, s);
    expect(getAutoRead(1, s)).toBe(false);
    expect(getAutoRead(2, s)).toBe(false); // flipped earlier from true
    expect(JSON.parse(s.getItem('studykids.autoRead')!)).toMatchObject({ '1': false });
  });
  it('autoRead survives garbage and throwing storage', () => {
    for (const bad of ['{nope', '[]', 'null', '5', '{"1":"yes"}']) {
      const s = mem({ 'studykids.autoRead': bad });
      expect(getAutoRead(1, s)).toBe(true);
      expect(getAutoRead(3, s)).toBe(false);
    }
    const t = throwing();
    expect(getAutoRead(1, t)).toBe(true);
    expect(() => setAutoRead(1, false, t)).not.toThrow();
  });
  it('setAutoRead repairs garbage stored value', () => {
    const s = mem({ 'studykids.autoRead': '[1,2]' });
    setAutoRead(3, true, s);
    expect(getAutoRead(3, s)).toBe(true);
  });
  it('lastGrade round-trips and rejects invalid', () => {
    const s = mem();
    expect(getLastGrade(s)).toBeNull();
    setLastGrade(4, s);
    expect(s.getItem('studykids.lastGrade')).toBe('4');
    expect(getLastGrade(s)).toBe(4);
    for (const v of ['7', 'x', '0', '', '1.5', '3abc']) expect(getLastGrade(mem({ 'studykids.lastGrade': v }))).toBeNull();
    expect(getLastGrade(throwing())).toBeNull();
    expect(() => setLastGrade(2, throwing())).not.toThrow();
  });
  it('clearLegacyStorage removes only the old keys', () => {
    const s = mem({ 'studykids.lastProfile': 'adik', 'studykids.profileCustom': '{}', 'studykids.lastGrade': '1', 'studykids.autoRead': '{}' });
    clearLegacyStorage(s);
    expect(s.getItem('studykids.lastProfile')).toBeNull();
    expect(s.getItem('studykids.profileCustom')).toBeNull();
    expect(s.getItem('studykids.lastGrade')).toBe('1');
    expect(s.getItem('studykids.autoRead')).toBe('{}');
    expect(() => clearLegacyStorage(throwing())).not.toThrow();
  });
});

describe('storage that throws on access', () => {
  it('never throws when globalThis.localStorage is a throwing getter', () => {
    const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('denied'); } });
    try {
      expect(() => getLastGrade()).not.toThrow();
      expect(getLastGrade()).toBeNull();
      expect(() => getAutoRead(1)).not.toThrow();
      expect(getAutoRead(1)).toBe(true);
      expect(getAutoRead(3)).toBe(false);
      expect(() => clearLegacyStorage()).not.toThrow();
      expect(() => setAutoRead(1, false)).not.toThrow();
      expect(() => setLastGrade(1)).not.toThrow();
    } finally {
      if (desc) Object.defineProperty(globalThis, 'localStorage', desc); else delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });
});
