export type LightKind = 'opaque' | 'translucent' | 'transparent';

export interface LightObject {
  id: string;
  /** What the child sees and hears: "the {name}". Always singular. */
  name: string;
  emoji: string;
  kind: LightKind;
}

/**
 * Opaque things block all the light (dark shadow). Translucent things let some light through (faint
 * shadow). Transparent things let almost all the light through (hardly any shadow).
 * Every object has exactly one class and the same answer in every home.
 */
export const LIGHT_OBJECTS: readonly LightObject[] = [
  { id: 'book', name: 'book', emoji: '📕', kind: 'opaque' },
  { id: 'hand', name: 'hand', emoji: '✋', kind: 'opaque' },
  { id: 'teddy', name: 'teddy', emoji: '🧸', kind: 'opaque' },
  { id: 'wooden-block', name: 'wooden block', emoji: '🟫', kind: 'opaque' },
  { id: 'tissue-paper', name: 'tissue paper', emoji: '🧻', kind: 'translucent' },
  { id: 'frosted-glass', name: 'frosted glass', emoji: '🪟', kind: 'translucent' },
  { id: 'clear-glass', name: 'clear glass jar', emoji: '🫙', kind: 'transparent' },
  { id: 'cling-film', name: 'cling film', emoji: '🫧', kind: 'transparent' },
];

export const lightObject = (id: string): LightObject => LIGHT_OBJECTS.find(o => o.id === id)!;

export const MIN_DISTANCE = 1;
export const MAX_DISTANCE = 5;

/**
 * How big the shadow is next to the object, for a torch distance of 1 (very close) to 5 (far).
 * Strictly decreasing, from 2.0 down to 1.0. Values outside 1..5 are held at the ends.
 */
export function shadowScale(torchDistance: number): number {
  const d = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, torchDistance));
  return 2 - (d - MIN_DISTANCE) * 0.25;
}

/** How dark the shadow is drawn (opacity 0..1). Opaque > translucent > transparent. */
export const SHADOW_DARKNESS: Record<LightKind, number> = { opaque: 0.85, translucent: 0.35, transparent: 0.08 };

export const SIZE_HINT = 'Closer to the light makes a bigger shadow.';
export const DARK_HINT = 'Light cannot pass through opaque things, so their shadows are dark.';
export const SHADOW_SIDE = 'The shadow falls on the side of the object away from the torch.';

const KIND_RULE: Record<LightKind, string> = {
  opaque: DARK_HINT,
  translucent: 'Translucent things let some light through, so their shadows are faint.',
  transparent: 'Transparent things let almost all the light through, so they make hardly any shadow.',
};
export const kindRule = (k: LightKind): string => KIND_RULE[k];

/** "The book is opaque. Light cannot pass through opaque things, so their shadows are dark." */
export const objectLine = (o: LightObject): string => `The ${o.name} is ${o.kind}. ${KIND_RULE[o.kind]}`;

/** Describes the torch distance in Explore. */
export function distanceLine(d: number): string {
  if (d <= 2) return 'The torch is close, so the shadow is big.';
  if (d >= 4) return 'The torch is far away, so the shadow is small.';
  return 'The torch is in the middle, so the shadow is a medium size.';
}

/** Explore sentence for the current object and torch distance. */
export const exploreLine = (o: LightObject, d: number): string => `${objectLine(o)} ${distanceLine(d)}`;

export const EXPLORE_START = `Slide the torch and pick things to see their shadows. ${SHADOW_SIDE}`;

/** Slider position (1 far .. 5 close) and torch distance (5 far .. 1 close) are mirror images. */
export const closeness = (torchDistance: number): number => MAX_DISTANCE + MIN_DISTANCE - torchDistance;

export const BIGGER_WHY = 'The torch is closer, so the shadow gets bigger.';
export const SMALLER_WHY = 'The torch is farther away, so the shadow gets smaller.';
/** Why the shadow grows or shrinks when the torch moves. */
export const sizeWhy = (dir: 'closer' | 'farther'): string => (dir === 'closer' ? BIGGER_WHY : SMALLER_WHY);
