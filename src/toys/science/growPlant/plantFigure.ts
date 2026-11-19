import { PLANT_PARTS, cap, type Health, type PartId } from '../../../content/science/plants';
import { h } from '../../../ui/dom';

/** The drawing is 240 x 300 units; it is shown up to 240px wide, so 1 unit is about 1px. */
export const VIEW_W = 240;
export const VIEW_H = 300;
/** Only the part of the drawing from this height down is shown (the empty top of the sky is cropped). */
export const VIEW_TOP = 26;
const SHOWN_H = VIEW_H - VIEW_TOP;
/** Ground line: roots are below it, the stem, leaves and flower above. */
export const GROUND = 200;
/** Smallest hotspot side in units: 52 units is 48px even when the drawing is squeezed to 92.5%. */
export const MIN_HOTSPOT = 52;
/** How long the plant takes to grow or wilt. */
export const GROW_MS = 3000;

export interface Hotspot {
  part: PartId;
  /** Centre and size of the invisible tap area, in drawing units. */
  cx: number; cy: number; w: number; h: number;
  /** The visible centre of the part. Whichever hotspot is on top there must be this part's own. */
  ax: number; ay: number;
}
const hs = (part: PartId, cx: number, cy: number, w: number, hh: number, ax = cx, ay = cy): Hotspot => ({ part, cx, cy, w, h: hh, ax, ay });

/** Bottom to top: later hotspots sit on top where areas overlap, so the leaves win next to the stem. */
export const HOTSPOTS: readonly Hotspot[] = [
  hs('root', 120, 248, 150, 96, 120, 250),
  hs('stem', 120, 156, 52, 92, 120, 160),
  hs('leaf', 80, 140, 56, 52),
  hs('leaf', 160, 140, 56, 52),
  hs('flower', 120, 72, 64, 64),
];

const NS = 'http://www.w3.org/2000/svg';
function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, ...kids: SVGElement[]): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const k of kids) el.append(k);
  return el;
}

const reducedMotion = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Look {
  growth: number;
  /** Lean of the whole plant, droop of each leaf and of the flower head, in degrees. */
  lean: number; leafDroop: number; flowerDroop: number;
  flowerOpacity: number;
  leaf: string; stem: string; petals: string;
}
const LOOKS: Record<Health, Look> = {
  thriving: { growth: 1, lean: 0, leafDroop: 0, flowerDroop: 0, flowerOpacity: 1, leaf: '#22A06B', stem: '#2F9E44', petals: '#FBBF24' },
  wilting: { growth: 0.85, lean: 8, leafDroop: 30, flowerDroop: 55, flowerOpacity: 1, leaf: '#C2B45A', stem: '#9CA83C', petals: '#D9B96A' },
  'not growing': { growth: 0.3, lean: 0, leafDroop: 0, flowerDroop: 0, flowerOpacity: 0, leaf: '#9BCB9B', stem: '#8FC48F', petals: '#FBBF24' },
};

export interface FigureOptions {
  /** Real buttons (Challenge) or look-only markers (demonstrate). */
  interactive: boolean;
  /** Give each hotspot its part name as aria-label. Off in Challenge so it cannot leak the answer. */
  labels: boolean;
  /** Draw no hotspots at all (Explore). */
  noHotspots?: boolean;
  /** Widest the drawing may be, in px. */
  maxWidth?: number;
  onTap?: (part: PartId, el: HTMLElement) => void;
}

export interface PlantFigure {
  root: HTMLElement;
  /** Grow, wilt or stop growing: over GROW_MS, or at once with `animate` false or reduced motion. */
  setHealth(health: Health, animate?: boolean): void;
  /** One selected part (blue ring) or none. */
  select(part: PartId | null): void;
  /** Glow (and pulse) these parts; an empty list clears. */
  glow(parts: readonly PartId[]): void;
  /** Light up the drawn part itself (works while the plant is small or drooping). */
  emphasise(part: PartId | null): void;
  destroy(): void;
}

export function createPlantFigure(opts: FigureOptions): PlantFigure {
  const origin = `${VIEW_W / 2}px ${GROUND}px`;
  const root = h('div', {
    class: 'plant-figure relative mx-auto w-full',
    style: { maxWidth: `${opts.maxWidth ?? VIEW_W}px`, aspectRatio: `${VIEW_W} / ${SHOWN_H}` },
    attrs: { 'data-health': 'thriving', 'data-growth': '1' },
    role: 'plant',
  });

  // drawing
  const rootsGroup = s('g', { 'data-part': 'root' },
    s('path', { d: 'M120 200 L120 282', stroke: '#E9D5B0', 'stroke-width': 7, 'stroke-linecap': 'round', fill: 'none' }),
    s('path', { d: 'M120 222 Q96 236 80 262 M120 240 Q144 252 162 276 M120 258 Q104 270 98 288 M120 232 Q150 232 172 246', stroke: '#E9D5B0', 'stroke-width': 4, 'stroke-linecap': 'round', fill: 'none' }));
  const stem = s('rect', { x: 115, y: 100, width: 10, height: 100, rx: 4, 'data-part': 'stem' });
  const mkLeaf = (cx: number, rot: number, attachX: number) => {
    const wrap = s('g', { 'data-part': 'leaf' }, s('ellipse', { cx, cy: 140, rx: 30, ry: 14, transform: `rotate(${rot} ${cx} 140)` }));
    wrap.style.transformBox = 'view-box';
    wrap.style.transformOrigin = `${attachX}px 134px`;
    return wrap;
  };
  const leafL = mkLeaf(84, -15, 114);
  const leafR = mkLeaf(156, 15, 126);
  const petals = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 * Math.PI) / 180;
    return s('ellipse', { cx: 120 + 20 * Math.cos(a), cy: 70 + 20 * Math.sin(a), rx: 13, ry: 8, transform: `rotate(${i * 45} ${120 + 20 * Math.cos(a)} ${70 + 20 * Math.sin(a)})` });
  });
  const flower = s('g', { 'data-part': 'flower' }, ...petals, s('circle', { cx: 120, cy: 70, r: 12, fill: '#92400E' }));
  flower.style.transformBox = 'view-box';
  flower.style.transformOrigin = '120px 100px';
  const top = s('g', { 'data-role': 'plant-top' }, stem, leafL, leafR, flower);
  const bg = s('svg', {
    viewBox: `0 ${VIEW_TOP} ${VIEW_W} ${SHOWN_H}`, class: 'w-full h-full rounded-2xl', 'aria-hidden': 'true', focusable: 'false',
  },
  s('rect', { x: 0, y: 0, width: VIEW_W, height: GROUND, fill: '#E0F2FE' }),
  s('circle', { cx: 205, cy: 56, r: 16, fill: '#FDE68A' }),
  s('rect', { x: 0, y: GROUND, width: VIEW_W, height: VIEW_H - GROUND, fill: '#8B5E3C' }),
  s('rect', { x: 0, y: GROUND - 6, width: VIEW_W, height: 8, fill: '#4ADE80' }),
  rootsGroup, top);
  for (const g of [rootsGroup, top]) { g.style.transformBox = 'view-box'; g.style.transformOrigin = origin; }
  root.append(bg);

  // hotspots
  const els: { part: PartId; el: HTMLElement }[] = [];
  for (const spot of opts.noHotspots ? [] : HOTSPOTS) {
    const el = h(opts.interactive ? 'button' : 'span', {
      class: 'body-hot',
      role: 'plant-part',
      style: {
        left: `${(spot.cx / VIEW_W) * 100}%`,
        top: `${((spot.cy - VIEW_TOP) / SHOWN_H) * 100}%`,
        width: `max(48px, ${(spot.w / VIEW_W) * 100}%)`,
        height: `max(48px, ${(spot.h / SHOWN_H) * 100}%)`,
        borderRadius: `${Math.min(spot.w, spot.h) / 2}px`,
      },
      attrs: { 'data-part': spot.part },
    });
    if (el instanceof HTMLButtonElement) {
      el.type = 'button';
      el.setAttribute('aria-label', opts.labels ? cap(PLANT_PARTS[spot.part].name) : 'Plant part');
      el.addEventListener('click', () => opts.onTap?.(spot.part, el));
    } else {
      el.setAttribute('aria-hidden', 'true');
    }
    els.push({ part: spot.part, el });
    root.append(el);
  }

  const animated = [rootsGroup, top, leafL, leafR, flower, stem, ...petals, ...leafL.children, ...leafR.children] as SVGElement[];
  const fillOf = (look: Look) => {
    stem.style.setProperty('fill', look.stem);
    for (const g of [leafL, leafR]) g.querySelector('ellipse')!.style.setProperty('fill', look.leaf);
    for (const p of petals) p.style.setProperty('fill', look.petals);
  };
  function setHealth(health: Health, animate = true) {
    const look = LOOKS[health];
    const t = animate && !reducedMotion() ? `transform ${GROW_MS}ms ease-in-out, fill ${GROW_MS}ms ease-in-out, opacity ${GROW_MS}ms ease-in-out` : 'none';
    for (const el of animated) (el as SVGElement).style.transition = t;
    top.style.transform = `scale(${look.growth}) rotate(${look.lean}deg)`;
    rootsGroup.style.transform = `scale(${look.growth})`;
    leafL.style.transform = `rotate(${-look.leafDroop}deg)`;
    leafR.style.transform = `rotate(${look.leafDroop}deg)`;
    flower.style.transform = `rotate(${look.flowerDroop}deg)`;
    flower.style.opacity = String(look.flowerOpacity);
    fillOf(look);
    root.dataset.health = health;
    root.dataset.growth = String(look.growth);
  }
  setHealth('thriving', false);

  return {
    root,
    setHealth,
    select(part) {
      for (const { part: p, el } of els) el.classList.toggle('is-selected', p === part);
    },
    glow(parts) {
      for (const { part: p, el } of els) el.classList.toggle('is-glow', parts.includes(p));
    },
    emphasise(part) {
      for (const el of bg.querySelectorAll<SVGElement>('[data-part]')) {
        el.style.filter = el.dataset.part === part ? 'drop-shadow(0 0 5px #F59E0B) drop-shadow(0 0 3px #F59E0B)' : '';
      }
    },
    destroy: () => root.remove(),
  };
}
