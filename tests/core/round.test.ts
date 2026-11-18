import { describe, it, expect } from 'vitest';
import { createRound } from '../../src/core/round';

describe('round', () => {
  it('counts first answer only', () => {
    const r = createRound<string, string>(['a', 'b']);
    expect(r.current()).toBe('a');
    expect(r.submit('x', false)).toBe('retry');
    expect(r.submit('y', true)).toBe('correct');
    r.advance();
    expect(r.index).toBe(1);
    expect(r.submit('z', true)).toBe('correct');
    r.advance();
    expect(r.results()).toEqual({ correct: 1, wrong: 1, mistakes: [{ question: 'a', firstAnswer: 'x' }] });
    expect(r.done).toBe(true);
    expect(r.current()).toBeNull();
  });
  it('second wrong reveals', () => {
    const r = createRound<string, string>(['a', 'b']);
    expect(r.submit('x', false)).toBe('retry');
    expect(r.submit('y', false)).toBe('reveal');
    expect(r.results()).toEqual({ correct: 0, wrong: 1, mistakes: [{ question: 'a', firstAnswer: 'x' }] });
  });
  it('submit after reveal without advance is ignored', () => {
    const r = createRound<string, string>(['a']);
    r.submit('x', false); r.submit('y', false);
    expect(r.submit('z', true)).toBe('reveal');
    expect(r.results().correct).toBe(0);
    expect(r.results().wrong).toBe(1);
  });
  it('submit after correct without advance is ignored', () => {
    const r = createRound<string, string>(['a', 'b']);
    expect(r.submit('x', true)).toBe('correct');
    expect(r.submit('x', true)).toBe('correct');
    expect(r.results()).toEqual({ correct: 1, wrong: 0, mistakes: [] });
  });
  it("advance before answering throws 'not answered'", () => {
    const r = createRound<string, string>(['a']);
    expect(() => r.advance()).toThrow('not answered');
    r.submit('x', false);
    expect(() => r.advance()).toThrow('not answered');
  });
  it("submit when done throws 'round done'", () => {
    const r = createRound<string, string>(['a']);
    r.submit('x', true); r.advance();
    expect(() => r.submit('y', true)).toThrow('round done');
  });
  it('empty round is done immediately', () => {
    const r = createRound<string, string>([]);
    expect(r.done).toBe(true);
    expect(r.current()).toBeNull();
    expect(r.results()).toEqual({ correct: 0, wrong: 0, mistakes: [] });
  });
});
