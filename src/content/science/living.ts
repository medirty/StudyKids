export type LivingId = 'living' | 'nonliving';

export interface LivingItem {
  /** Spoken on tap, shown under the picture, and used in "Where does the dog go?". */
  name: string;
  emoji: string;
  living: boolean;
}

/**
 * Every item is unambiguous for a six-year-old: animals and plants (and mushrooms) are living;
 * rocks, vehicles, objects, water, clouds, the sun and a toy robot are not.
 */
export const LIVING_ITEMS: readonly LivingItem[] = [
  { name: 'dog', emoji: '🐶', living: true },
  { name: 'tree', emoji: '🌳', living: true },
  { name: 'flower', emoji: '🌷', living: true },
  { name: 'fish', emoji: '🐟', living: true },
  { name: 'bird', emoji: '🐦', living: true },
  { name: 'person', emoji: '🧑', living: true },
  { name: 'mushroom', emoji: '🍄', living: true },
  { name: 'butterfly', emoji: '🦋', living: true },
  { name: 'cat', emoji: '🐱', living: true },
  { name: 'bee', emoji: '🐝', living: true },
  { name: 'frog', emoji: '🐸', living: true },
  { name: 'cactus', emoji: '🌵', living: true },
  { name: 'rock', emoji: '🪨', living: false },
  { name: 'car', emoji: '🚗', living: false },
  { name: 'chair', emoji: '🪑', living: false },
  { name: 'cup', emoji: '☕', living: false },
  { name: 'ball', emoji: '⚽', living: false },
  { name: 'phone', emoji: '📱', living: false },
  { name: 'book', emoji: '📖', living: false },
  { name: 'shoe', emoji: '👟', living: false },
  { name: 'water', emoji: '💧', living: false },
  { name: 'cloud', emoji: '☁️', living: false },
  { name: 'sun', emoji: '☀️', living: false },
  { name: 'toy robot', emoji: '🤖', living: false },
];

export const LIVING_BINS: readonly { id: LivingId; label: string; emoji: string }[] = [
  { id: 'living', label: 'Living', emoji: '🌱' },
  { id: 'nonliving', label: 'Not living', emoji: '⚙️' },
];

export const LIVING_FACTS: Record<string, string> = {
  living: 'Living things grow, need food and water, and can have babies.',
  nonliving: 'Non-living things do not grow, do not need food or water, and cannot have babies.',
};

export const livingTarget = (i: LivingItem): LivingId => (i.living ? 'living' : 'nonliving');
