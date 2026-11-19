import { displayName, type BoneId } from '../../../content/science/skeleton';
import { h } from '../../../ui/dom';

/** The drawing is 320 x 566 units; it is shown at up to 320px wide, so 1 unit is about 1px. */
export const VIEW_W = 320;
export const VIEW_H = 566;
/** Smallest hotspot side in units: 52 units is 48px even when the figure is squeezed to 92.5% (296px). */
export const MIN_HOTSPOT = 52;

export interface Hotspot {
  part: BoneId;
  /** Centre and size of the invisible tap area, in drawing units. */
  cx: number; cy: number; w: number; h: number;
  /** A point well inside the drawn bone. Whichever hotspot is on top there must be this bone's own. */
  ax: number; ay: number;
}

const hs = (part: BoneId, cx: number, cy: number, w: number, hh: number, ax = cx, ay = cy): Hotspot =>
  ({ part, cx, cy, w, h: hh, ax, ay });
/** Left and right copies of a bone (the right one mirrored across the middle line). */
const pair = (part: BoneId, cx: number, cy: number, w: number, hh: number, ax = cx, ay = cy): Hotspot[] =>
  [hs(part, cx, cy, w, hh, ax, ay), hs(part, VIEW_W - cx, cy, w, hh, VIEW_W - ax, ay)];

/**
 * Bottom to top: later hotspots sit on top where areas overlap. The backbone and pelvis come first;
 * the jaw sits above the skull; the ribs come last, above the arms and collarbone.
 */
export const HOTSPOTS: readonly Hotspot[] = [
  hs('spine', 160, 226, 52, 164, 160, 230),
  hs('pelvis', 160, 336, 100, 60, 160, 330),
  ...pair('thighBone', 134, 400, 52, 68, 142, 398), // shaft
  // The round head of the femur is thigh bone too. Its box starts at y 340 but stays inside x 130-190,
  // so the outer corners of the pelvis (x < 130, y 350-366) still belong to the pelvis.
  ...pair('thighBone', 164, 366, 52, 52, 152, 358),
  ...pair('shinBones', 140, 496, 52, 56, 135, 490),
  ...pair('footBones', 136, 534, 56, 52, 136, 534),
  ...pair('kneecap', 134, 452, 52, 52, 135, 452),
  hs('skull', 160, 56, 100, 80, 160, 40),
  hs('jaw', 160, 122, 84, 52, 160, 122),
  ...pair('collarbone', 116, 166, 52, 52, 118, 159),
  ...pair('armBones', 70, 220, 52, 88, 70, 219),
  ...pair('armBones', 52, 306, 52, 88, 49, 300),
  ...pair('handBones', 40, 378, 56, 56, 42, 385),
  // Ribs sit above the arms: their whole 52 unit box (x 82-134) is tappable, so the ribs are a full-size target.
  // Inner edges stop at x 134 / 186, so the backbone keeps its own 52 unit strip down the chest.
  ...pair('ribs', 108, 246, 52, 120, 116, 252),
];

const NS = 'http://www.w3.org/2000/svg';
const BONE = '#FFFBEF';
const EDGE = '#8A7152';
const DARK = '#5B6B84';

function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, ...kids: SVGElement[]): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const k of kids) el.append(k);
  return el;
}

/** A bone shaft: a brown outline under a cream stroke. */
function shaft(d: string, width: number): SVGElement[] {
  const base = { d, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  return [
    s('path', { ...base, stroke: EDGE, 'stroke-width': width + 4 }),
    s('path', { ...base, stroke: BONE, 'stroke-width': width }),
  ];
}
const knob = (cx: number, cy: number, r: number) => s('circle', { cx, cy, r, fill: BONE, stroke: EDGE, 'stroke-width': 2 });
const dot = (cx: number, cy: number, r: number) => s('circle', { cx, cy, r, fill: BONE, stroke: EDGE, 'stroke-width': 1.6 });

/** Ribs: the first y of each rib. */
const RIB_YS = [192, 212, 232, 252, 272] as const;

/** Everything on the left of the picture; the right side is this group mirrored. */
function leftSide(): SVGElement[] {
  const out: SVGElement[] = [];
  // ribs
  for (const y of RIB_YS) {
    out.push(...shaft(`M150 ${y} Q114 ${y - 2} 116 ${y + 20} Q130 ${y + 26} 150 ${y + 18}`, 6));
  }
  // thigh bone (femur): long shaft, round head at the hip, two bumps at the knee
  out.push(
    ...shaft('M148 368 L136 432', 12), knob(150, 362, 12), knob(131, 437, 10), knob(144, 439, 10),
  );
  // shin bones: thick shinbone and thin bone beside it
  out.push(
    ...shaft('M134 472 L135 512', 5),
    ...shaft('M150 470 L150 514', 9),
  );
  // foot bones: ankle blob, five long bones fanning out, toe bones at the tips
  const toes: [number, number][] = [[116, 548], [126, 551], [136, 553], [146, 551], [156, 548]];
  for (const [x, y] of toes) out.push(...shaft(`M136 530 L${x} ${y}`, 4));
  out.push(s('ellipse', { cx: 136, cy: 525, rx: 14, ry: 9, fill: BONE, stroke: EDGE, 'stroke-width': 2 }));
  for (const [x, y] of toes) out.push(dot(x, y + 5, 3.4));
  // kneecap: a round bone on the front of the knee
  out.push(knob(135, 452, 15), s('circle', { cx: 135, cy: 452, r: 7, fill: 'none', stroke: EDGE, 'stroke-width': 1.2, opacity: 0.45 }));
  // collarbone: a gentle curve from the middle of the chest to the shoulder
  out.push(...shaft('M150 160 Q118 152 88 172', 8));
  // arm and hand hang well out from the ribs so the ribs have room to be tapped
  const arm: SVGElement[] = [];
  // arm: upper arm bone, two bones in the forearm, a knob at each end
  arm.push(
    ...shaft('M106 176 L82 262', 13), knob(106, 176, 10), knob(82, 264, 9),
    ...shaft('M78 270 L66 342', 6), ...shaft('M88 270 L78 344', 6),
  );
  // hand: wrist bones and five finger bones
  const fingers: [number, number][] = [[46, 396], [56, 402], [66, 404], [76, 400], [84, 392]];
  for (const [x, y] of fingers) arm.push(...shaft(`M66 358 L${x} ${y}`, 5));
  arm.push(knob(66, 356, 10));
  for (const [x, y] of fingers) arm.push(dot(x, y + 4, 3));
  out.push(s('g', { transform: 'translate(-24 0)' }, ...arm));
  return out;
}

/** A friendly cartoon skeleton, front view, made only of simple shapes. No gore: just clean cream bones. */
export function drawSkeleton(): SVGSVGElement {
  const svg = s('svg', { viewBox: `0 0 ${VIEW_W} ${VIEW_H}`, class: 'w-full h-full', 'aria-hidden': 'true', focusable: 'false' });
  const spine: SVGElement[] = [s('rect', { x: 155, y: 146, width: 10, height: 160, rx: 4, fill: EDGE })];
  for (let i = 0; i < 12; i++) {
    const w = 16 + i * 0.7;
    spine.push(s('rect', { x: 160 - w / 2, y: 146 + i * 13.6, width: w, height: 11.5, rx: 5, fill: BONE, stroke: EDGE, 'stroke-width': 1.6 }));
  }
  const skull = s('path', {
    d: 'M110 62 Q110 16 160 16 Q210 16 210 62 Q210 80 196 92 L196 100 L124 100 L124 92 Q110 80 110 62 Z',
    fill: BONE, stroke: EDGE, 'stroke-width': 3, 'stroke-linejoin': 'round',
  });
  const jaw = s('path', { d: 'M124 102 Q124 136 160 140 Q196 136 196 102 Z', fill: BONE, stroke: EDGE, 'stroke-width': 3, 'stroke-linejoin': 'round' });
  const teeth = Array.from({ length: 7 }, (_, i) =>
    s('rect', { x: 133 + i * 8.5, y: 102, width: 7, height: 9, rx: 2, fill: '#fff', stroke: EDGE, 'stroke-width': 1.2 }));
  const pelvis = [
    s('path', {
      d: 'M122 312 Q112 336 128 364 Q146 374 158 352 L160 344 L162 352 Q174 374 192 364 Q208 336 198 312 Q160 330 122 312 Z',
      fill: BONE, stroke: EDGE, 'stroke-width': 3, 'stroke-linejoin': 'round',
    }),
    s('ellipse', { cx: 141, cy: 346, rx: 8, ry: 10, fill: DARK, opacity: 0.55 }),
    s('ellipse', { cx: 179, cy: 346, rx: 8, ry: 10, fill: DARK, opacity: 0.55 }),
  ];
  const left = leftSide();
  const mirrored = s('g', { transform: `translate(${VIEW_W} 0) scale(-1 1)` }, ...leftSide());
  svg.append(
    s('rect', { x: 0, y: 0, width: VIEW_W, height: VIEW_H, rx: 24, fill: '#DCEBFF' }),
    ...spine, ...left, mirrored, ...pelvis,
    skull,
    s('circle', { cx: 142, cy: 66, r: 11, fill: DARK }), s('circle', { cx: 178, cy: 66, r: 11, fill: DARK }), // eye sockets
    s('path', { d: 'M160 78 L152 93 L168 93 Z', fill: DARK }), // nose hole
    jaw, ...teeth,
  );
  return svg;
}

export interface FigureOptions {
  /** Real buttons (Explore, Challenge) or look-only markers (demonstrate). */
  interactive: boolean;
  /** Give each hotspot its bone name as aria-label (Explore). Off in Challenge so it cannot leak the answer. */
  labels: boolean;
  onTap?: (bone: BoneId, el: HTMLElement) => void;
}

export interface Figure {
  root: HTMLElement;
  /** One selected bone (blue ring) or none. */
  select(bone: BoneId | null): void;
  /** Glow (and pulse) these bones; an empty list clears. */
  glow(bones: readonly BoneId[]): void;
  destroy(): void;
}

export function createFigure(opts: FigureOptions): Figure {
  const root = h('div', {
    class: 'body-figure relative mx-auto w-full',
    style: { maxWidth: `${VIEW_W}px`, aspectRatio: `${VIEW_W} / ${VIEW_H}` },
    attrs: { 'data-role': 'figure' },
  });
  root.append(drawSkeleton());
  const els: { bone: BoneId; el: HTMLElement }[] = [];
  for (const spot of HOTSPOTS) {
    const label = opts.labels ? displayName(spot.part) : 'Bone';
    const el = h(opts.interactive ? 'button' : 'span', {
      class: 'body-hot',
      role: 'bone',
      style: {
        left: `${(spot.cx / VIEW_W) * 100}%`,
        top: `${(spot.cy / VIEW_H) * 100}%`,
        width: `max(48px, ${(spot.w / VIEW_W) * 100}%)`,
        height: `max(48px, ${(spot.h / VIEW_H) * 100}%)`,
        borderRadius: `${Math.min(spot.w, spot.h) / 2}px`,
      },
      attrs: { 'data-bone': spot.part },
    });
    if (el instanceof HTMLButtonElement) {
      el.type = 'button';
      el.setAttribute('aria-label', label);
      el.addEventListener('click', () => opts.onTap?.(spot.part, el));
    } else {
      el.setAttribute('aria-hidden', 'true');
    }
    els.push({ bone: spot.part, el });
    root.append(el);
  }
  return {
    root,
    select(bone) {
      for (const { bone: b, el } of els) el.classList.toggle('is-selected', b === bone);
    },
    glow(bones) {
      for (const { bone: b, el } of els) el.classList.toggle('is-glow', bones.includes(b));
    },
    destroy: () => root.remove(),
  };
}
