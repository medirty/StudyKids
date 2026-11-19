import { PARTS, type PartId } from '../../../content/science/body';
import { h } from '../../../ui/dom';

/** The drawing is 320 x 566 units; it is shown at up to 320px wide, so 1 unit is about 1px. */
export const VIEW_W = 320;
export const VIEW_H = 566;
/** Cropped view (head to fingertips) for the Senses tab. */
export const CROP_H = 420;
/** Smallest hotspot side in units: 52 units is 48px even when the figure is squeezed to 92.5% (296px). */
export const MIN_HOTSPOT = 52;

export interface Hotspot {
  part: PartId;
  /** Centre and size of the invisible tap area, in drawing units. */
  cx: number; cy: number; w: number; h: number;
  /** The visible centre of the part. Whichever hotspot is on top there must be this part's own. */
  ax: number; ay: number;
}

const hs = (part: PartId, cx: number, cy: number, w: number, h: number, ax = cx, ay = cy): Hotspot =>
  ({ part, cx, cy, w, h, ax, ay });
/** Left and right copies of a part (the right one mirrored across the middle line). */
const pair = (part: PartId, cx: number, cy: number, w: number, h: number, ax = cx, ay = cy): Hotspot[] =>
  [hs(part, cx, cy, w, h, ax, ay), hs(part, VIEW_W - cx, cy, w, h, VIEW_W - ax, ay)];

/**
 * Bottom to top: later hotspots sit on top when areas overlap, so the small parts of the face
 * (nose, eyes, mouth, tongue) come last and always keep their own centre tappable.
 */
export const HOTSPOTS: readonly Hotspot[] = [
  // A limb has a hotspot for each stretch between its joints; the joint boxes sit on top and win only near the joint.
  ...pair('legs', 139, 370, 52, 70, 139, 376), // thigh (starts at the hips, runs into the knee box)
  ...pair('legs', 139, 464, 52, 52, 139, 464), // shin
  hs('tummy', 160, 288, 92, 96, 160, 285),
  ...pair('arms', 95, 256, 52, 52), // upper arm
  ...pair('arms', 95, 324, 52, 52), // forearm
  ...pair('elbows', 95, 290, 52, 52),
  ...pair('hands', 95, 358, 52, 52, 95, 350),
  ...pair('fingers', 95, 386, 52, 52, 95, 384),
  ...pair('shoulders', 104, 222, 52, 52),
  ...pair('knees', 139, 430, 52, 52),
  ...pair('feet', 139, 498, 52, 52, 136, 496),
  ...pair('toes', 139, 538, 52, 52, 136, 516),
  hs('head', 160, 92, 160, 160, 104, 140),
  hs('hair', 160, 28, 130, 56, 160, 28), // ends at the drawn hairline (y 56)
  ...pair('ears', 72, 98, 52, 56),
  hs('mouth', 160, 118, 88, 52, 150, 131),
  hs('nose', 160, 100, 52, 52, 160, 102),
  ...pair('eyes', 126, 78, 52, 52),
  hs('tongue', 160, 170, 52, 52, 160, 156), // the pink tongue sticking out below the smile (starts below it, y144)
  hs('neck', 160, 196, 56, 52, 160, 198), // above the tongue box, which reaches down over the chin
];

const NS = 'http://www.w3.org/2000/svg';
const SKIN = '#E8B48C';
const SKIN_SHADE = '#D39A72';
const HAIR = '#6B4226';
const SHIRT = '#3B82F6';
const SHORTS = '#F59E0B';

function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, ...kids: SVGElement[]): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const k of kids) el.append(k);
  return el;
}
const mx = (x: number) => VIEW_W - x;

/** A friendly flat child, front view, made only of simple shapes. */
export function drawChild(height: number): SVGSVGElement {
  const mouthD = 'M136 128 Q160 158 184 128 Z';
  const svg = s('svg', { viewBox: `0 0 ${VIEW_W} ${height}`, class: 'w-full h-full', 'aria-hidden': 'true', focusable: 'false' });
  const side = (flip: boolean) => {
    const x = (v: number) => (flip ? mx(v) : v);
    const rect = (l: number, t: number, w: number, hh: number, rx: number, fill: string) =>
      s('rect', { x: flip ? mx(l + w) : l, y: t, width: w, height: hh, rx, fill });
    return {
      legs: [
        rect(124, 340, 30, 152, 13, SKIN),
        s('circle', { cx: x(139), cy: 430, r: 8, fill: SKIN_SHADE, opacity: 0.55 }), // knee
        s('ellipse', { cx: x(136), cy: 498, rx: 25, ry: 13, fill: SKIN }), // foot
        ...[-14, -7, 0, 7, 14].map(d => s('circle', { cx: x(136) + d, cy: 516, r: 4.6, fill: SKIN, stroke: SKIN_SHADE, 'stroke-width': 1 })),
      ],
      arm: [
        rect(80, 214, 30, 146, 15, SKIN),
        rect(77, 210, 36, 56, 15, SHIRT), // sleeve
        s('circle', { cx: x(95), cy: 290, r: 7, fill: SKIN_SHADE, opacity: 0.55 }), // elbow
        s('circle', { cx: x(95), cy: 358, r: 17, fill: SKIN }), // hand
        ...[0, 1, 2, 3].map(i => s('ellipse', { cx: x(95) + (i - 1.5) * 8, cy: 383, rx: 3.8, ry: 9, fill: SKIN, stroke: SKIN_SHADE, 'stroke-width': 1 })),
      ],
      ear: [
        s('ellipse', { cx: x(78), cy: 98, rx: 12, ry: 16, fill: SKIN }),
        s('ellipse', { cx: x(78), cy: 98, rx: 6, ry: 9, fill: SKIN_SHADE, opacity: 0.5 }),
      ],
    };
  };
  const [left, right] = [side(false), side(true)];
  svg.append(
    ...left.legs, ...right.legs,
    s('rect', { x: 146, y: 166, width: 28, height: 46, rx: 8, fill: SKIN }), // neck
    s('rect', { x: 112, y: 206, width: 96, height: 132, rx: 28, fill: SHIRT }), // body
    s('path', { d: 'M112 328 L208 328 L210 366 L166 366 L160 352 L154 366 L110 366 Z', fill: SHORTS }),
    s('path', { d: 'M138 206 Q160 232 182 206 Z', fill: SKIN }), // collar
    s('circle', { cx: 160, cy: 284, r: 3, fill: '#2563EB' }), // tummy button
    ...left.arm, ...right.arm,
    ...left.ear, ...right.ear,
    s('circle', { cx: 160, cy: 92, r: 80, fill: SKIN }), // head
    s('path', { d: 'M82 84 Q76 16 160 10 Q244 16 238 84 Q226 56 160 56 Q94 56 82 84 Z', fill: HAIR }), // hair, hairline at y 56
    s('circle', { cx: 112, cy: 114, r: 9, fill: '#F28B82', opacity: 0.45 }),
    s('circle', { cx: 208, cy: 114, r: 9, fill: '#F28B82', opacity: 0.45 }),
    ...[126, 194].flatMap(cx => [
      s('circle', { cx, cy: 78, r: 11, fill: '#fff', stroke: '#CBB89E', 'stroke-width': 1.5 }),
      s('circle', { cx, cy: 79, r: 6.2, fill: '#3B2A1E' }),
      s('circle', { cx: cx + 2, cy: 76.5, r: 2, fill: '#fff' }),
    ]),
    s('ellipse', { cx: 160, cy: 102, rx: 8, ry: 6.5, fill: SKIN_SHADE }), // nose
    // tongue first, so it pokes out from under the lower lip
    s('path', { d: 'M146 136 L174 136 L174 156 Q174 168 160 168 Q146 168 146 156 Z', fill: '#F7A1B5' }),
    s('path', { d: 'M160 146 L160 158', stroke: '#E0788F', 'stroke-width': 2, 'stroke-linecap': 'round', fill: 'none' }),
    s('path', { d: mouthD, fill: '#8B2635' }), // mouth
    s('path', { d: 'M136 128 Q160 158 184 128', fill: 'none', stroke: '#8B2635', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
  );
  return svg;
}

export interface FigureOptions {
  /** Real buttons (Explore, Challenge) or look-only markers (Senses tab, demonstrate). */
  interactive: boolean;
  /** Give each hotspot its part name as aria-label (Explore). Off in Challenge so it cannot leak the answer. */
  labels: boolean;
  /** Show only the head-to-hands part of the figure. */
  crop?: boolean;
  /** Only these parts get a hotspot. */
  only?: readonly PartId[];
  /** Widest the figure may be, in px. */
  maxWidth?: number;
  onTap?: (part: PartId, el: HTMLElement) => void;
}

export interface Figure {
  root: HTMLElement;
  /** One selected part (blue ring) or none. */
  select(part: PartId | null): void;
  /** Glow (and pulse) these parts; an empty list clears. */
  glow(parts: readonly PartId[]): void;
  destroy(): void;
}

export function createFigure(opts: FigureOptions): Figure {
  const height = opts.crop ? CROP_H : VIEW_H;
  const root = h('div', {
    class: 'body-figure relative mx-auto w-full',
    style: { maxWidth: `${opts.maxWidth ?? VIEW_W}px`, aspectRatio: `${VIEW_W} / ${height}` },
    attrs: { 'data-role': 'figure' },
  });
  root.append(drawChild(height));
  const els: { part: PartId; el: HTMLElement }[] = [];
  for (const spot of HOTSPOTS) {
    if (opts.only && !opts.only.includes(spot.part)) continue;
    const label = opts.labels ? cap(PARTS[spot.part].name) : 'Body part';
    const el = h(opts.interactive ? 'button' : 'span', {
      class: 'body-hot',
      role: 'body-part',
      style: {
        left: `${(spot.cx / VIEW_W) * 100}%`,
        top: `${(spot.cy / height) * 100}%`,
        width: `max(48px, ${(spot.w / VIEW_W) * 100}%)`,
        height: `max(48px, ${(spot.h / height) * 100}%)`,
        borderRadius: `${Math.min(spot.w, spot.h) / 2}px`,
      },
      attrs: { 'data-part': spot.part },
    });
    if (el instanceof HTMLButtonElement) {
      el.type = 'button';
      el.setAttribute('aria-label', label);
      el.addEventListener('click', () => opts.onTap?.(spot.part, el));
    } else {
      el.setAttribute('aria-hidden', 'true');
    }
    els.push({ part: spot.part, el });
    root.append(el);
  }
  return {
    root,
    select(part) {
      for (const { part: p, el } of els) el.classList.toggle('is-selected', p === part);
    },
    glow(parts) {
      for (const { part: p, el } of els) el.classList.toggle('is-glow', parts.includes(p));
    },
    destroy: () => root.remove(),
  };
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
