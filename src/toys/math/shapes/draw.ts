import type { ShapeId } from './index';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag: string, attrs: Record<string, string>): SVGElement => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};

// Friendly colours from the design tokens.
const COLOUR: Record<ShapeId, string> = {
  circle: '#FF6B6B', triangle: '#F59E0B', square: '#3B82F6', rectangle: '#10B981',
  cube: '#3B82F6', cuboid: '#10B981', sphere: '#FF6B6B', cylinder: '#8B5CF6', cone: '#F59E0B', pyramid: '#10B981',
};
const OUTLINE = '#475569';

type Pt = [number, number];
/** Side endpoints for the 2D shapes, in a 0..100 viewBox. Circle has no sides. */
export const SIDES: Partial<Record<ShapeId, Pt[]>> = {
  triangle: [[50, 12], [90, 84], [10, 84]],
  square: [[16, 16], [84, 16], [84, 84], [16, 84]],
  rectangle: [[6, 26], [94, 26], [94, 74], [6, 74]],
};

let uid = 0;

const pts = (p: Pt[]) => p.map(([x, y]) => `${x},${y}`).join(' ');
/** A flat face with simple shading: light, mid or dark overlay on the base colour. */
function face(g: SVGElement, points: Pt[], colour: string, shade: 'light' | 'mid' | 'dark'): void {
  g.append(svgEl('polygon', { points: pts(points), fill: colour, stroke: OUTLINE, 'stroke-width': '2', 'stroke-linejoin': 'round' }));
  if (shade !== 'mid') {
    g.append(svgEl('polygon', { points: pts(points), fill: shade === 'light' ? '#fff' : '#000', 'fill-opacity': shade === 'light' ? '0.35' : '0.2' }));
  }
}
function path(g: SVGElement, d: string, colour: string, shade: 'light' | 'mid' | 'dark'): void {
  g.append(svgEl('path', { d, fill: colour, stroke: OUTLINE, 'stroke-width': '2', 'stroke-linejoin': 'round' }));
  if (shade !== 'mid') g.append(svgEl('path', { d, fill: shade === 'light' ? '#fff' : '#000', 'fill-opacity': shade === 'light' ? '0.35' : '0.2' }));
}

/** Builds the SVG picture for a shape. 2D shapes also get invisible side lines (data-role="side"). */
export function drawShape(id: ShapeId): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 100 100', class: 'w-full h-full', 'aria-hidden': 'true', focusable: 'false' }) as SVGSVGElement;
  const g = svgEl('g', {});
  const c = COLOUR[id];
  switch (id) {
    case 'circle':
      g.append(svgEl('circle', { cx: '50', cy: '50', r: '38', fill: c, stroke: OUTLINE, 'stroke-width': '2' }));
      break;
    case 'triangle': case 'square': case 'rectangle':
      face(g, SIDES[id]!, c, 'mid');
      break;
    case 'cube':
      face(g, [[50, 8], [88, 28], [50, 48], [12, 28]], c, 'light');
      face(g, [[12, 28], [50, 48], [50, 92], [12, 72]], c, 'mid');
      face(g, [[50, 48], [88, 28], [88, 72], [50, 92]], c, 'dark');
      break;
    case 'cuboid':
      face(g, [[8, 40], [30, 20], [94, 20], [72, 40]], c, 'light');
      face(g, [[8, 40], [72, 40], [72, 88], [8, 88]], c, 'mid');
      face(g, [[72, 40], [94, 20], [94, 68], [72, 88]], c, 'dark');
      break;
    case 'sphere': {
      const gid = `sph${++uid}`;
      const grad = svgEl('radialGradient', { id: gid, cx: '35%', cy: '30%', r: '75%' });
      grad.append(svgEl('stop', { offset: '0%', 'stop-color': '#ffffff' }), svgEl('stop', { offset: '35%', 'stop-color': c }), svgEl('stop', { offset: '100%', 'stop-color': '#7f1d1d' }));
      const defs = svgEl('defs', {});
      defs.append(grad);
      g.append(defs, svgEl('circle', { cx: '50', cy: '50', r: '40', fill: `url(#${gid})`, stroke: OUTLINE, 'stroke-width': '2' }));
      break;
    }
    case 'cylinder':
      path(g, 'M20,24 V74 A30,12 0 0 0 80,74 V24 Z', c, 'mid');
      path(g, 'M20,24 A30,12 0 0 0 80,24 A30,12 0 0 0 20,24 Z', c, 'light');
      break;
    case 'cone':
      path(g, 'M50,8 L84,76 A34,13 0 0 1 16,76 Z', c, 'mid');
      path(g, 'M50,8 L84,76 L60,86 Z', c, 'dark');
      break;
    case 'pyramid':
      face(g, [[50, 8], [8, 74], [52, 92]], c, 'mid');
      face(g, [[50, 8], [52, 92], [92, 70]], c, 'dark');
      break;
  }
  svg.append(g);
  const sides = SIDES[id];
  if (sides) {
    sides.forEach((p, i) => {
      const q = sides[(i + 1) % sides.length];
      svg.append(svgEl('line', {
        x1: String(p[0]), y1: String(p[1]), x2: String(q[0]), y2: String(q[1]),
        stroke: '#FF6B6B', 'stroke-width': '9', 'stroke-linecap': 'round', 'stroke-opacity': '0',
        'data-role': 'side', 'data-index': String(i), 'data-lit': 'false',
      }));
    });
  }
  return svg;
}

export function setSideLit(svg: Element, index: number, lit: boolean): void {
  const s = svg.querySelector(`[data-role="side"][data-index="${index}"]`);
  if (!s) return;
  s.setAttribute('data-lit', String(lit));
  s.setAttribute('stroke-opacity', lit ? '1' : '0');
}
export function clearSides(svg: Element): void {
  svg.querySelectorAll('[data-role="side"]').forEach((_, i) => setSideLit(svg, i, false));
}
