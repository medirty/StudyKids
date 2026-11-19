export type PartId = 'root' | 'stem' | 'leaf' | 'flower';
export const PART_IDS: readonly PartId[] = ['root', 'stem', 'leaf', 'flower'];

export interface PlantPart {
  id: PartId;
  name: string;
  emoji: string;
  /** What the part does, as a lower-case verb phrase: "The {name} {fn}." */
  fn: string;
  /** Where to find it, without saying what it does (used as a hint). */
  where: string;
}

/** Grade 3 science, simplified but true. */
export const PLANT_PARTS: Readonly<Record<PartId, PlantPart>> = {
  root: { id: 'root', name: 'root', emoji: '🌱', fn: 'takes in water and holds the plant in the soil', where: 'Roots grow underground, down in the soil.' },
  stem: { id: 'stem', name: 'stem', emoji: '🪵', fn: 'carries water up and holds the plant up', where: 'The stem is the tall part in the middle of the plant.' },
  leaf: { id: 'leaf', name: 'leaf', emoji: '🍃', fn: 'makes food using sunlight', where: 'Leaves are the flat green parts that grow out from the stem.' },
  flower: { id: 'flower', name: 'flower', emoji: '🌼', fn: 'makes seeds', where: 'The flower is the bright part at the top of the plant.' },
};

export const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** "The leaf makes food using sunlight." */
export const partSentence = (p: PartId) => `The ${PLANT_PARTS[p].name} ${PLANT_PARTS[p].fn}.`;

export type NeedId = 'water' | 'light' | 'warmth';
export type Level = 'none' | 'some' | 'lots';
export const LEVELS: readonly Level[] = ['none', 'some', 'lots'];
export interface Need { id: NeedId; label: string; emoji: string }
/** Air is a need too, but it is always there in this toy, so only these three can be changed. */
export const NEEDS: readonly Need[] = [
  { id: 'water', label: 'Water', emoji: '💧' },
  { id: 'light', label: 'Light', emoji: '☀️' },
  { id: 'warmth', label: 'Warmth', emoji: '🔥' },
];
export const LEVEL_LABEL: Record<Level, string> = { none: 'None', some: 'Some', lots: 'Lots' };

export type Conditions = Record<NeedId, Level>;
export type Health = 'thriving' | 'wilting' | 'not growing';

export const EXPLORE_INTRO = 'A plant needs water, light, warmth and air. Air is always there here, so you choose the other three.';

/**
 * The table (one rule, applied in this order):
 * 1. Any need set to "none": not growing (it is missing that need).
 * 2. Otherwise water "lots" (soggy roots) or warmth "lots" (too hot): wilting.
 * 3. Otherwise thriving: water and warmth "some", with "some" or "lots" of light
 *    (plants generally do well in lots of light).
 */
export function plantHealth(c: Conditions): Health {
  if (NEEDS.some(n => c[n.id] === 'none')) return 'not growing';
  if (c.water === 'lots' || c.warmth === 'lots') return 'wilting';
  return 'thriving';
}

const TOO_MUCH: Partial<Record<NeedId, string>> = {
  water: 'Too much water can make the roots go soggy.',
  warmth: 'It is too hot for the plant.',
};

const list = (words: string[]) => (words.length === 1 ? words[0] : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`);

export interface PlantReport { health: Health; note: string }

/** The health and the sentence shown (and read aloud) for it. Several causes are named in the order water, light, warmth. */
export function plantReport(c: Conditions): PlantReport {
  const health = plantHealth(c);
  if (health === 'thriving') return { health, note: 'The plant is thriving! It has everything it needs to grow.' };
  if (health === 'not growing') {
    const missing = NEEDS.filter(n => c[n.id] === 'none').map(n => n.id);
    return { health, note: `The plant is not growing. It needs ${list(missing)}.` };
  }
  const causes = NEEDS.filter(n => c[n.id] === 'lots' && TOO_MUCH[n.id]).map(n => TOO_MUCH[n.id]);
  return { health, note: `The plant is wilting. ${causes.join(' ')}` };
}
