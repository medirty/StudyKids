export interface MagnetItem {
  id: string;
  /** What the child sees and hears: "the {name}". Plain everyday words. */
  name: string;
  emoji: string;
  /** What it is mostly made of. Used in every explanation. */
  material: string;
  magnetic: boolean;
  /** True when the name is plural ("scissors"), so the sentence says "are". */
  plural?: boolean;
}

/** The rule, used as the Challenge hint and in every explanation. */
export const MAGNET_RULE = 'Magnets pull things made of iron or steel.';

/**
 * Items were chosen so the answer is the same in every home and shop, and the emoji shows the object:
 * - Magnetic things are plain steel: a paper clip, bolt, safety pin, scissors, spanner and chain.
 * - Not on the list on purpose: a "steel spoon" (some stainless steel is not magnetic), a "key" (often brass),
 *   ANY coin, including copper-coloured ones (UK 1p and 2p coins are steel under a copper coating and DO stick),
 *   a "fridge door" (no clear picture, and some fridge fronts are non-magnetic stainless steel), a "tin can"
 *   (steel, but easily mixed up with aluminium drinks cans) and an "iron nail" (no nail emoji).
 * - Non-magnetic things are wood, plastic, glass, paper, rubber, gold and brass (a trumpet is
 *   solid brass, which is copper and zinc, and is not magnetic).
 * - Aluminium is left out: the only emoji for an aluminium object (a ladder) is usually drawn wooden.
 * - Names only carry the material where it is not simply repeated in the explanation.
 */
export const MAGNET_ITEMS: readonly MagnetItem[] = [
  { id: 'paper-clip', name: 'paper clip', emoji: '📎', material: 'steel', magnetic: true },
  { id: 'bolt', name: 'bolt', emoji: '🔩', material: 'steel', magnetic: true },
  { id: 'safety-pin', name: 'steel safety pin', emoji: '🧷', material: 'steel', magnetic: true },
  { id: 'scissors', name: 'scissors', emoji: '✂️', material: 'steel', magnetic: true, plural: true },
  { id: 'spanner', name: 'spanner', emoji: '🔧', material: 'steel', magnetic: true },
  { id: 'chain', name: 'chain', emoji: '⛓️', material: 'steel', magnetic: true },
  { id: 'ruler', name: 'plastic ruler', emoji: '📏', material: 'plastic', magnetic: false },
  { id: 'pencil', name: 'wooden pencil', emoji: '✏️', material: 'wood', magnetic: false },
  { id: 'drinking-glass', name: 'drinking glass', emoji: '🥛', material: 'glass', magnetic: false },
  { id: 'paper-bag', name: 'paper bag', emoji: '🛍️', material: 'paper', magnetic: false },
  { id: 'balloon', name: 'balloon', emoji: '🎈', material: 'rubber', magnetic: false },
  { id: 'trumpet', name: 'trumpet', emoji: '🎺', material: 'brass', magnetic: false },
  { id: 'gold-ring', name: 'gold ring', emoji: '💍', material: 'gold', magnetic: false },
  { id: 'log', name: 'log', emoji: '🪵', material: 'wood', magnetic: false },
];

export const magnetItem = (id: string): MagnetItem => MAGNET_ITEMS.find(i => i.id === id)!;

/** "The paper clip is made of steel." */
export const madeOf = (i: MagnetItem): string => `The ${i.name} ${i.plural ? 'are' : 'is'} made of ${i.material}.`;

/** The Challenge explanation: what it is made of, then the rule. */
export const magnetExplanation = (i: MagnetItem): string => `${madeOf(i)} ${MAGNET_RULE}`;

/** Explore sentence after a test. */
export function magnetVerdict(i: MagnetItem): string {
  const verb = i.plural ? 'stick' : 'sticks';
  return i.magnetic
    ? `Yes! The ${i.name} ${verb} to the magnet. ${magnetExplanation(i)}`
    : `Not this time: the ${i.name} ${i.plural ? 'fall' : 'falls'} off. ${magnetExplanation(i)}`;
}
