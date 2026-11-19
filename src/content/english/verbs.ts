export type VerbRule = 'ed' | 'double' | 'd' | 'ied' | 'irregular';
export interface VerbEntry {
  verb: string;
  past: string;
  rule: VerbRule;
  /** Irregular verbs only: two plausible but incorrect forms a child might say (never a real past form). */
  wrong?: [string, string];
}

export const RULE_CAPTIONS: Record<VerbRule, string> = {
  ed: 'Add -ed',
  double: 'Double the last letter, add -ed',
  d: 'Just add -d',
  ied: 'Change y to i, add -ed',
  irregular: 'Irregular: learn it!',
};

const reg = (rule: VerbRule, pairs: [string, string][]): VerbEntry[] => pairs.map(([verb, past]) => ({ verb, past, rule }));

export const REGULAR_VERBS: VerbEntry[] = [
  ...reg('ed', [['walk', 'walked'], ['jump', 'jumped'], ['play', 'played'], ['help', 'helped'], ['look', 'looked'], ['kick', 'kicked']]),
  ...reg('double', [['hop', 'hopped'], ['stop', 'stopped'], ['clap', 'clapped'], ['skip', 'skipped']]),
  ...reg('d', [['bake', 'baked'], ['smile', 'smiled'], ['dance', 'danced']]),
  ...reg('ied', [['cry', 'cried'], ['carry', 'carried'], ['try', 'tried']]),
];

export const IRREGULAR_VERBS: VerbEntry[] = [
  { verb: 'go', past: 'went', rule: 'irregular', wrong: ['goed', 'wented'] },
  { verb: 'run', past: 'ran', rule: 'irregular', wrong: ['runned', 'ranned'] },
  { verb: 'see', past: 'saw', rule: 'irregular', wrong: ['seed', 'sawd'] },
  { verb: 'eat', past: 'ate', rule: 'irregular', wrong: ['eated', 'ated'] },
  { verb: 'come', past: 'came', rule: 'irregular', wrong: ['comed', 'camed'] },
  { verb: 'sit', past: 'sat', rule: 'irregular', wrong: ['sitted', 'satted'] },
  { verb: 'swim', past: 'swam', rule: 'irregular', wrong: ['swimmed', 'swammed'] },
  { verb: 'write', past: 'wrote', rule: 'irregular', wrong: ['writed', 'wroted'] },
  { verb: 'take', past: 'took', rule: 'irregular', wrong: ['taked', 'tooked'] },
  { verb: 'make', past: 'made', rule: 'irregular', wrong: ['maked', 'maded'] },
  { verb: 'have', past: 'had', rule: 'irregular', wrong: ['haved', 'haded'] },
  { verb: 'say', past: 'said', rule: 'irregular', wrong: ['sayed', 'saided'] },
];

export const VERBS: VerbEntry[] = [...REGULAR_VERBS, ...IRREGULAR_VERBS];

export const entryOf = (verb: string): VerbEntry => {
  const e = VERBS.find(v => v.verb === verb);
  if (!e) throw new Error(`Unknown verb: ${verb}`);
  return e;
};
export const pastOf = (verb: string): string => entryOf(verb).past;
export const ruleOf = (verb: string): VerbRule => entryOf(verb).rule;
export const captionOf = (verb: string): string => RULE_CAPTIONS[ruleOf(verb)];
