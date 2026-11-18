import { describe, it, expect } from 'vitest';
import { numberToWords } from '../../../src/toys/math/placeValue/words';

describe('numberToWords', () => {
  it.each([
    [0, 'zero'], [7, 'seven'], [15, 'fifteen'], [40, 'forty'], [56, 'fifty-six'],
    [100, 'one hundred'], [305, 'three hundred and five'], [356, 'three hundred and fifty-six'],
    [1000, 'one thousand'],
  ])('%i -> %s', (n, w) => { expect(numberToWords(n)).toBe(w); });
  it('teens, tens and hundreds boundaries', () => {
    expect(numberToWords(10)).toBe('ten');
    expect(numberToWords(11)).toBe('eleven');
    expect(numberToWords(19)).toBe('nineteen');
    expect(numberToWords(20)).toBe('twenty');
    expect(numberToWords(21)).toBe('twenty-one');
    expect(numberToWords(99)).toBe('ninety-nine');
    expect(numberToWords(110)).toBe('one hundred and ten');
    expect(numberToWords(200)).toBe('two hundred');
    expect(numberToWords(999)).toBe('nine hundred and ninety-nine');
  });
  it('is defined for every number 0..1000, all distinct', () => {
    const all = Array.from({ length: 1001 }, (_, n) => numberToWords(n));
    expect(new Set(all).size).toBe(1001);
    for (const w of all) expect(w).toMatch(/^[a-z]+([ -][a-z]+)*$/);
  });
  it('rejects out of range and non-integers', () => {
    expect(() => numberToWords(-1)).toThrow(RangeError);
    expect(() => numberToWords(1001)).toThrow(RangeError);
    expect(() => numberToWords(2.5)).toThrow(RangeError);
  });
});
