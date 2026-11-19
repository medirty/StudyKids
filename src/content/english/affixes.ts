export type AffixId = 'un' | 're' | 'dis' | 'pre' | 'ful' | 'less' | 'ly' | 'ness' | 'er';

export interface AffixInfo {
  id: AffixId;
  kind: 'prefix' | 'suffix';
  /** As shown to children, with its hyphen: "un-" or "-ful". */
  label: string;
  affixMeaning: string;
  /** The hint, written to be read aloud exactly as it is printed. */
  hint: string;
}

const means = (label: string, meaning: string) => `"${label}" means "${meaning}".`;

export const AFFIXES: AffixInfo[] = [
  { id: 'un', kind: 'prefix', label: 'un-', affixMeaning: 'not, or undo', hint: means('un-', 'not, or undo') },
  { id: 're', kind: 'prefix', label: 're-', affixMeaning: 'again', hint: means('re-', 'again') },
  { id: 'dis', kind: 'prefix', label: 'dis-', affixMeaning: 'not, or the opposite of', hint: means('dis-', 'not, or the opposite of') },
  { id: 'pre', kind: 'prefix', label: 'pre-', affixMeaning: 'before', hint: means('pre-', 'before') },
  { id: 'ful', kind: 'suffix', label: '-ful', affixMeaning: 'full of', hint: means('-ful', 'full of') },
  { id: 'less', kind: 'suffix', label: '-less', affixMeaning: 'without', hint: means('-less', 'without') },
  { id: 'ly', kind: 'suffix', label: '-ly', affixMeaning: 'how something is done', hint: '"-ly" makes a word that tells how something is done.' },
  { id: 'ness', kind: 'suffix', label: '-ness', affixMeaning: 'being something', hint: '"-ness" makes a word for being something.' },
  { id: 'er', kind: 'suffix', label: '-er', affixMeaning: 'someone who does something', hint: '"-er" means someone who does something.' },
];

export interface AffixEntry { root: string; affix: AffixId; word: string; meaning: string }

const e = (affix: AffixId, rows: [string, string, string][]): AffixEntry[] =>
  rows.map(([root, word, meaning]) => ({ root, affix, word, meaning }));

/** The words used in challenge questions. */
export const AFFIX_ENTRIES: AffixEntry[] = [
  ...e('un', [['happy', 'unhappy', 'not happy'], ['kind', 'unkind', 'not kind'], ['lock', 'unlock', 'open a lock'], ['tidy', 'untidy', 'not tidy']]),
  ...e('re', [['play', 'replay', 'play again'], ['read', 'reread', 'read again'], ['write', 'rewrite', 'write again'], ['build', 'rebuild', 'build again']]),
  ...e('dis', [['agree', 'disagree', 'not agree'], ['like', 'dislike', 'not like'], ['appear', 'disappear', 'go out of sight'], ['obey', 'disobey', 'not do as you are told']]),
  ...e('pre', [['heat', 'preheat', 'heat an oven before cooking'], ['view', 'preview', 'see before'], ['school', 'preschool', 'before school']]),
  ...e('ful', [['help', 'helpful', 'full of help'], ['care', 'careful', 'full of care'], ['play', 'playful', 'full of play'], ['colour', 'colourful', 'full of colour']]),
  ...e('less', [['care', 'careless', 'without care'], ['help', 'helpless', 'without help'], ['home', 'homeless', 'without a home'], ['fear', 'fearless', 'without fear']]),
  ...e('ly', [['quick', 'quickly', 'in a quick way'], ['slow', 'slowly', 'in a slow way'], ['kind', 'kindly', 'in a kind way'], ['sad', 'sadly', 'in a sad way']]),
  ...e('ness', [['kind', 'kindness', 'being kind'], ['dark', 'darkness', 'being dark'], ['happy', 'happiness', 'being happy']]),
  ...e('er', [['teach', 'teacher', 'someone who teaches'], ['play', 'player', 'someone who plays'], ['paint', 'painter', 'someone who paints'], ['read', 'reader', 'someone who reads']]),
];

/** More real words the lab can build. Explore shows them as real, and challenge never offers them as wrong choices. */
export const EXTRA_ENTRIES: AffixEntry[] = [
  ...e('un', [['like', 'unlike', 'not the same as'], ['read', 'unread', 'not read yet']]),
  ...e('re', [
    ['heat', 'reheat', 'heat again'], ['view', 'review', 'look at again'], ['paint', 'repaint', 'paint again'], ['lock', 'relock', 'lock again'],
    ['appear', 'reappear', 'appear again'], ['colour', 'recolour', 'colour again'], ['teach', 'reteach', 'teach again'], ['home', 'rehome', 'give a new home to'],
  ]),
  ...e('dis', [['colour', 'discolour', 'change colour, often by fading']]),
  ...e('ful', [['fear', 'fearful', 'full of fear']]),
  ...e('less', [['colour', 'colourless', 'without colour']]),
  ...e('ly', [['happy', 'happily', 'in a happy way'], ['tidy', 'tidily', 'in a tidy way'], ['dark', 'darkly', 'in a dark way']]),
  ...e('ness', [['sad', 'sadness', 'being sad'], ['quick', 'quickness', 'being quick'], ['slow', 'slowness', 'being slow'], ['tidy', 'tidiness', 'being tidy'], ['like', 'likeness', 'being like something']]),
  ...e('er', [['help', 'helper', 'someone who helps'], ['build', 'builder', 'someone who builds'], ['write', 'writer', 'someone who writes'], ['view', 'viewer', 'someone who watches'], ['care', 'carer', 'someone who cares for others']]),
];

/**
 * Real words that are NOT built here: false friends whose meaning is not root + affix (display, likely, homely),
 * -er words that mean "more" or "a thing" (kinder, locker...). They are never shown as built words and never offered as wrong choices.
 */
export const AVOIDED_WORDS: string[] = [
  'display', 'likely', 'homely', 'locker', 'heater',
  'kinder', 'slower', 'darker', 'sadder', 'quicker', 'happier', 'tidier',
];

export const ALL_ENTRIES: AffixEntry[] = [...AFFIX_ENTRIES, ...EXTRA_ENTRIES];

export const ROOTS: string[] = [...new Set(AFFIX_ENTRIES.map(x => x.root))];

const bareId = (affix: string): string => affix.replace(/-/g, '');
export const affixInfo = (affix: string): AffixInfo => {
  const a = AFFIXES.find(x => x.id === bareId(affix));
  if (!a) throw new Error(`Unknown affix: ${affix}`);
  return a;
};

const isVowel = (c: string) => 'aeiou'.includes(c);

/** Joins a root and an affix, applying the spelling changes (accepts "ness" or "-ness"). */
export function combine(root: string, affix: string): string {
  const a = affixInfo(affix);
  if (a.kind === 'prefix') return a.id + root;
  const last = root[root.length - 1];
  const beforeLast = root[root.length - 2] ?? '';
  // happy + ness → happiness (consonant + y)
  if (last === 'y' && !isVowel(beforeLast) && a.id !== 'ful' && a.id !== 'less') return `${root.slice(0, -1)}i${a.id}`;
  // write + er → writer (silent e before a vowel)
  if (last === 'e' && !root.endsWith('ee') && a.id === 'er') return root + 'r';
  // sad + er → sadder (short vowel + one consonant)
  if (a.id === 'er' && /^[^aeiou]*[aeiou][^aeiouwxy]$/.test(root)) return root + last + 'er';
  return root + a.id;
}

/** The real word for this pair (challenge words or extras), if there is one. */
export const entryFor = (root: string, affix: string): AffixEntry | undefined => {
  const id = affixInfo(affix).id;
  return ALL_ENTRIES.find(x => x.root === root && x.affix === id);
};
export const isRealCombo = (root: string, affix: string): boolean => entryFor(root, affix) !== undefined;
export const entryOfWord = (word: string): AffixEntry | undefined => ALL_ENTRIES.find(x => x.word === word);
export const isAvoidedWord = (word: string): boolean => AVOIDED_WORDS.includes(word);
