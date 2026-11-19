import { describe, it, expect, vi } from 'vitest';
import { LETTER_EXAMPLES, letterPhrase, sayLetter } from '../../src/content/phonics';
import type { Speech } from '../../src/core/types';

const mkSpeech = (available = true) => {
  const speak = vi.fn<Speech['speak']>(() => Promise.resolve());
  return { speech: { available, speak, stop: () => {} } as Speech, speak };
};

describe('phonics letter helper', () => {
  it('has an example word for all 26 letters', () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    expect(Object.keys(LETTER_EXAMPLES).sort()).toEqual(letters);
    for (const l of letters) expect(LETTER_EXAMPLES[l]![0]).toBeTruthy();
    expect(LETTER_EXAMPLES.x).toBe('box');
    expect(LETTER_EXAMPLES.u).toBe('umbrella');
  });
  it('builds the phrase', () => {
    expect(letterPhrase('c')).toBe('c … like cat');
    expect(letterPhrase('C')).toBe('c … like cat');
  });
  it('speaks the phrase', async () => {
    const { speech, speak } = mkSpeech();
    await sayLetter('c', speech);
    expect(speak).toHaveBeenCalledWith('c … like cat');
  });
  it('resolves when speech is unavailable', async () => {
    const { speech } = mkSpeech(false);
    await expect(sayLetter('c', speech)).resolves.toBeUndefined();
  });
  it('speaks nothing for unknown input', async () => {
    const { speech, speak } = mkSpeech();
    await expect(sayLetter('1', speech)).resolves.toBeUndefined();
    await expect(sayLetter('', speech)).resolves.toBeUndefined();
    await expect(sayLetter('ab', speech)).resolves.toBeUndefined();
    expect(speak).not.toHaveBeenCalled();
    expect(letterPhrase('1')).toBe('');
  });
});
