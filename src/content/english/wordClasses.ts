export type WordClass = 'noun' | 'verb' | 'adjective';
export interface WordToken { text: string; cls: WordClass | null }
export interface WordSentence { text: string; tokens: WordToken[] }

export const CLASSES: readonly WordClass[] = ['noun', 'verb', 'adjective'];

/**
 * Words for the Explore sorter. Each is clearly one class on its own:
 * no word here is also commonly used as another class ("run", "paint", "rain" and friends are left out).
 */
export const WORDS: Record<WordClass, readonly string[]> = {
  noun: [
    'dog', 'teacher', 'river', 'table', 'meadow', 'farmer', 'window', 'castle',
    'banana', 'pencil', 'mountain', 'doctor', 'bicycle', 'kitchen', 'butterfly', 'pirate',
  ],
  verb: [
    'write', 'sing', 'eat', 'think', 'carry', 'build', 'gallop', 'wriggle',
    'slither', 'nibble', 'tiptoe', 'stir', 'squeeze', 'chew', 'hop', 'scribble',
  ],
  adjective: [
    'tiny', 'shiny', 'happy', 'enormous', 'soft', 'sticky', 'brave', 'noisy',
    'golden', 'gentle', 'hungry', 'sleepy', 'rough', 'cheerful', 'spotty', 'fluffy',
  ],
};

export const DEFINITIONS: Record<WordClass, string> = {
  noun: 'A noun is a person, place or thing.',
  verb: 'A verb is a doing word.',
  adjective: 'An adjective describes a noun.',
};

// Authoring shorthand: "n:word" noun, "v:word" verb, "a:word" adjective, plain word = not one of the three.
const CODES = { n: 'noun', v: 'verb', a: 'adjective' } as const;
function sentence(src: string): WordSentence {
  const tokens = src.split(' ').map((raw): WordToken => {
    const m = /^([nva]):(.+)$/.exec(raw);
    return m ? { text: m[2], cls: CODES[m[1] as keyof typeof CODES] } : { text: raw, cls: null };
  });
  return { text: tokens.map(t => t.text).join(' '), tokens };
}

/** Original sentences; every token is tagged, and each has at least one noun, verb and adjective. */
export const WORD_SENTENCES: readonly WordSentence[] = [
  'The a:tiny n:mouse v:nibbled the a:sticky n:cheese.',
  'A a:brave n:pirate v:climbed the a:enormous n:mountain.',
  'The a:hungry n:farmer v:ate a a:soft n:banana.',
  'Our a:cheerful n:teacher v:wrote a a:long n:story.',
  'The a:sleepy n:dog v:lay in the n:garden.',
  'The a:noisy n:children v:laughed in the n:kitchen.',
  'A a:shiny n:butterfly v:landed on the n:window.',
  'The a:frozen n:river v:sparkled in the a:bright n:sun.',
  'The a:kind n:doctor v:carried a a:heavy n:bag.',
  'A a:fluffy n:rabbit v:wriggled under the a:rough n:fence.',
  'The a:ancient n:castle v:stood on a a:green n:hill.',
  'The n:pirates v:sang a a:silly n:song.',
  'The a:happy n:girl v:read a a:funny n:book.',
  'A a:cold n:wind v:blew through the a:quiet n:village.',
  'The a:spotty n:snake v:slithered across the a:warm n:rock.',
].map(sentence);
