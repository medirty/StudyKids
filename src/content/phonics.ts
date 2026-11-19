import type { Speech } from '../core/types';

/** One example word per letter, used by the device-voice letter helper. */
export const LETTER_EXAMPLES: Readonly<Record<string, string>> = {
  a: 'apple', b: 'bus', c: 'cat', d: 'dog', e: 'egg', f: 'fish', g: 'goat', h: 'hat', i: 'ink',
  j: 'jam', k: 'kite', l: 'leg', m: 'map', n: 'net', o: 'orange', p: 'pan', q: 'queen', r: 'red',
  s: 'sun', t: 'tap', u: 'umbrella', v: 'van', w: 'web', x: 'box', y: 'yellow', z: 'zip',
};

/** 'c' → 'c … like cat'. Empty string for anything that is not a single a–z letter. */
export function letterPhrase(letter: string): string {
  const l = letter.toLowerCase();
  const word = Object.prototype.hasOwnProperty.call(LETTER_EXAMPLES, l) ? LETTER_EXAMPLES[l] : undefined;
  return word ? `${l} … like ${word}` : '';
}

/** Speaks the letter phrase; resolves even when speech is unavailable or the input is unknown. */
export async function sayLetter(letter: string, speech: Speech): Promise<void> {
  const phrase = letterPhrase(letter);
  if (!phrase) return;
  try {
    await speech.speak(phrase);
  } catch {
    /* speech is best-effort */
  }
}
