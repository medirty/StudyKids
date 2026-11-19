export const PART_IDS = [
  'head', 'hair', 'eyes', 'ears', 'nose', 'mouth', 'tongue', 'neck', 'shoulders',
  'arms', 'elbows', 'hands', 'fingers', 'tummy', 'knees', 'legs', 'feet', 'toes',
] as const;
export type PartId = (typeof PART_IDS)[number];

export interface BodyPart {
  /** Spoken and shown in Explore ("knees"). Used in "Tap the knees". */
  name: string;
  /** One gentle sentence saying where the part is; used as the hint when a child taps the wrong part. */
  clue: string;
  /** "These are the eyes" (true) or "This is the head" (false). */
  isPlural: boolean;
}

export const PARTS: Record<PartId, BodyPart> = {
  head: { name: 'head', clue: 'Our head is at the top of our body.', isPlural: false },
  hair: { name: 'hair', clue: 'Hair grows on top of our head.', isPlural: false },
  eyes: { name: 'eyes', clue: 'Our eyes are on our face, above our nose.', isPlural: true },
  ears: { name: 'ears', clue: 'Our ears are on the sides of our head.', isPlural: true },
  nose: { name: 'nose', clue: 'Our nose is in the middle of our face.', isPlural: false },
  mouth: { name: 'mouth', clue: 'Our mouth is on our face, below our nose.', isPlural: false },
  tongue: { name: 'tongue', clue: 'Our tongue lives in our mouth. Look for the pink bit.', isPlural: false },
  neck: { name: 'neck', clue: 'Our neck joins our head to our body.', isPlural: false },
  shoulders: { name: 'shoulders', clue: 'Our shoulders are at the top of our arms.', isPlural: true },
  arms: { name: 'arms', clue: 'Our arms hang down from our shoulders.', isPlural: true },
  elbows: { name: 'elbows', clue: 'Our elbows are where our arms bend.', isPlural: true },
  hands: { name: 'hands', clue: 'Our hands are at the ends of our arms.', isPlural: true },
  fingers: { name: 'fingers', clue: 'Our fingers are on the ends of our hands.', isPlural: true },
  tummy: { name: 'tummy', clue: 'Our tummy is in the middle of our body.', isPlural: false },
  knees: { name: 'knees', clue: 'Our knees are where our legs bend.', isPlural: true },
  legs: { name: 'legs', clue: 'Our legs go from our hips down to our feet.', isPlural: true },
  feet: { name: 'feet', clue: 'Our feet are at the bottom of our legs.', isPlural: true },
  toes: { name: 'toes', clue: 'Our toes are on the ends of our feet.', isPlural: true },
};

export type SenseId = 'sight' | 'hearing' | 'smell' | 'taste' | 'touch';

export interface Sense {
  id: SenseId;
  icon: string;
  /** Short word under the icon. */
  label: string;
  /** Verb in "Which part do we use to ...?" */
  askVerb: string;
  /** Sentence shown in Explore. */
  sentence: string;
  /** Sentence read aloud (no brackets for the voice to stumble on). */
  spoken: string;
  /** Hint (Challenge) and "how" (explanation); it also says the answer, so it is only shown after a try. */
  hint: string;
  /**
   * Parts that count as the right answer, and that glow in Explore.
   * Touch is felt through our skin all over, but the picture has no "skin" part and a child tapping
   * any skin (arms, feet, tummy ...) would make the question meaningless. A Grade 1 child's go-to
   * touching tools are hands and fingers, so only those two are accepted; the hint nudges to them.
   */
  parts: readonly PartId[];
}

export const SENSES: readonly Sense[] = [
  { id: 'sight', icon: '👀', label: 'See', askVerb: 'see', sentence: 'We see with our eyes.', spoken: 'We see with our eyes.', hint: 'We see with our eyes.', parts: ['eyes'] },
  { id: 'hearing', icon: '👂', label: 'Hear', askVerb: 'hear', sentence: 'We hear with our ears.', spoken: 'We hear with our ears.', hint: 'We hear with our ears.', parts: ['ears'] },
  { id: 'smell', icon: '👃', label: 'Smell', askVerb: 'smell', sentence: 'We smell with our nose.', spoken: 'We smell with our nose.', hint: 'We smell with our nose.', parts: ['nose'] },
  { id: 'taste', icon: '👅', label: 'Taste', askVerb: 'taste', sentence: 'We taste with our tongue.', spoken: 'We taste with our tongue.', hint: 'We taste with our tongue.', parts: ['tongue'] },
  {
    id: 'touch', icon: '✋', label: 'Touch', askVerb: 'touch',
    sentence: 'We feel (touch) with our skin.', spoken: 'We feel with our skin. That is touch.',
    hint: 'We feel with our skin. Try our hands!', parts: ['hands', 'fingers'],
  },
];

export const senseById = (id: SenseId): Sense => SENSES.find(s => s.id === id)!;
