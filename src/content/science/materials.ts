export type MaterialId = 'wood' | 'plastic' | 'metal' | 'glass' | 'fabric' | 'paper';

export interface MaterialItem {
  name: string;
  emoji: string;
  material: MaterialId;
}

export interface Material {
  id: MaterialId;
  label: string;
  /** Picture on the bin. Never the same emoji as an item, so a child does not match pictures by mistake. */
  emoji: string;
  hard: boolean;
  seeThrough: boolean;
  bendy: boolean;
  /** One gentle sentence about the material; it matches hard / seeThrough / bendy above. */
  fact: string;
}

export const MATERIALS: readonly Material[] = [
  { id: 'wood', label: 'Wood', emoji: '🌳', hard: true, seeThrough: false, bendy: false,
    fact: 'Wood is hard and strong. It does not bend easily and you cannot see through it.' },
  { id: 'plastic', label: 'Plastic', emoji: '🥤', hard: true, seeThrough: false, bendy: true,
    fact: 'Plastic is light and smooth. Some plastic is hard and some can bend.' },
  { id: 'metal', label: 'Metal', emoji: '🔩', hard: true, seeThrough: false, bendy: false,
    fact: 'Metal is hard and shiny. It feels cold and does not bend easily.' },
  { id: 'glass', label: 'Glass', emoji: '🥛', hard: true, seeThrough: true, bendy: false,
    fact: 'Glass is hard and smooth, and you can see through it. It does not bend and it can break, so we take care.' },
  { id: 'fabric', label: 'Fabric', emoji: '🧵', hard: false, seeThrough: false, bendy: true,
    fact: 'Fabric is soft and bendy. We can fold it and wear it.' },
  { id: 'paper', label: 'Paper', emoji: '📄', hard: false, seeThrough: false, bendy: true,
    fact: 'Paper is thin, light and bendy. It bends easily, so we can fold it and tear it.' },
];

export const materialById = (id: string): Material => MATERIALS.find(m => m.id === id)!;

/**
 * Each item is made of one material in everyday life, and its name does not give the answer away
 * ("jar", not "glass jar"). Things that vary (a bottle, a spoon, glasses) are left out or described
 * so only one material fits: a squeezy bottle, a beach bucket and a toothbrush are plastic.
 */
export const MATERIAL_ITEMS: readonly MaterialItem[] = [
  { name: 'chair', emoji: '🪑', material: 'wood' },
  { name: 'pencil', emoji: '✏️', material: 'wood' },
  { name: 'log', emoji: '🪵', material: 'wood' },
  { name: 'squeezy bottle', emoji: '🧴', material: 'plastic' },
  { name: 'beach bucket', emoji: '🪣', material: 'plastic' },
  { name: 'toothbrush', emoji: '🪥', material: 'plastic' },
  { name: 'key', emoji: '🔑', material: 'metal' },
  { name: 'coin', emoji: '🪙', material: 'metal' },
  { name: 'fork', emoji: '🍴', material: 'metal' },
  { name: 'food can', emoji: '🥫', material: 'metal' },
  { name: 'window', emoji: '🪟', material: 'glass' },
  { name: 'jar', emoji: '🫙', material: 'glass' },
  { name: 'mirror', emoji: '🪞', material: 'glass' },
  { name: 'T-shirt', emoji: '👕', material: 'fabric' },
  { name: 'sock', emoji: '🧦', material: 'fabric' },
  { name: 'scarf', emoji: '🧣', material: 'fabric' },
  { name: 'dress', emoji: '👗', material: 'fabric' },
  { name: 'book', emoji: '📖', material: 'paper' },
  { name: 'newspaper', emoji: '🗞️', material: 'paper' },
  { name: 'envelope', emoji: '✉️', material: 'paper' },
];
