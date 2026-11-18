// Draggable SVG clock face. Geometry, colours and hit areas ported from the prototype.
import { angleFromPointer, hourMinute, minuteFromAngle, totalFromHourDrag, totalFromMinuteDrag } from './time';

export interface ClockFaceOptions {
  minutes: number;
  snap: number;
  zones: boolean;
  interactive: boolean;
  onChange?: (total: number, majorTick: boolean) => void;
}

export interface ClockFace {
  getMinutes(): number;
  setMinutes(total: number, animateMs?: number): Promise<void>;
  setSnap(n: number): void;
  setZones(on: boolean): void;
  destroy(): void;
}

const NS = 'http://www.w3.org/2000/svg';
let uid = 0;

function svg(tag: string, attrs: Record<string, string | number> = {}, parent?: Element, text?: string): SVGElement {
  const e = document.createElementNS(NS, tag);
  for (const k of Object.keys(attrs)) e.setAttribute(k, String(attrs[k]));
  if (text !== undefined) e.textContent = text;
  parent?.appendChild(e);
  return e;
}

function shadow(parent: Element, id: string, dy: number, dev: number, colour: string, op: number, box: [number, number, number, number]) {
  const f = svg('filter', { id, x: `${box[0]}%`, y: `${box[1]}%`, width: `${box[2]}%`, height: `${box[3]}%` }, parent);
  svg('feDropShadow', { dx: 0, dy, stdDeviation: dev, 'flood-color': colour, 'flood-opacity': op }, f);
}

function hand(parent: Element, role: string, filterId: string, spec: { hitTo: number; hitFrom: number; bodyFrom: number; bodyTo: number; width: number; colour: string; shineFrom: number; shineTo: number; shine: string; shineWidth: number; tipY: number }) {
  const g = svg('g', { 'data-role': role, filter: `url(#${filterId})`, style: 'cursor:grab' }, parent);
  svg('line', { x1: 200, y1: spec.hitFrom, x2: 200, y2: spec.hitTo, stroke: 'transparent', 'stroke-width': 56, 'stroke-linecap': 'round' }, g);
  svg('line', { x1: 200, y1: spec.bodyFrom, x2: 200, y2: spec.bodyTo, stroke: spec.colour, 'stroke-width': spec.width, 'stroke-linecap': 'round' }, g);
  svg('line', { x1: 200, y1: spec.shineFrom, x2: 200, y2: spec.shineTo, stroke: spec.shine, 'stroke-width': spec.shineWidth, 'stroke-linecap': 'round' }, g);
  svg('circle', { cx: 200, cy: spec.tipY, r: 9, fill: spec.colour, stroke: '#FFFFFF', 'stroke-width': 2.5 }, g);
  return g;
}

function buildFace(ticks: Element, numbers: Element) {
  const cx = 200, cy = 200;
  for (let m = 0; m < 60; m++) {
    const rad = (m * 6 - 90) * (Math.PI / 180);
    const five = m % 5 === 0;
    const rOuter = 166, rInner = five ? 153 : 159;
    svg('line', {
      x1: cx + rInner * Math.cos(rad), y1: cy + rInner * Math.sin(rad),
      x2: cx + rOuter * Math.cos(rad), y2: cy + rOuter * Math.sin(rad),
      stroke: five ? '#475569' : '#CBD5E1', 'stroke-width': five ? '3.5' : '2', 'stroke-linecap': 'round',
    }, ticks);
    if (five) {
      svg('text', {
        x: cx + 141 * Math.cos(rad), y: cy + 141 * Math.sin(rad) + 3.5, 'text-anchor': 'middle',
        'font-family': 'Nunito, sans-serif', 'font-weight': '800', 'font-size': '10.5',
        fill: m === 0 ? '#64748B' : m <= 30 ? '#059669' : '#7C3AED',
      }, ticks, m === 0 ? '60' : String(m));
    }
  }
  for (let h = 1; h <= 12; h++) {
    const rad = (h * 30 - 90) * (Math.PI / 180);
    svg('text', {
      x: cx + 114 * Math.cos(rad), y: cy + 114 * Math.sin(rad) + 9, 'text-anchor': 'middle',
      'font-family': 'Fredoka, sans-serif', 'font-weight': '700', 'font-size': '27', fill: '#1E293B',
    }, numbers, String(h));
  }
}

export function createClockFace(el: HTMLElement, opts: ClockFaceOptions): ClockFace {
  const id = ++uid;
  const shadowId = `clockShadow${id}`, handShadowId = `handShadow${id}`;
  let total = hourMinute(opts.minutes).normalized;
  let snap = opts.snap;
  let dragging: 'minute' | 'hour' | null = null;
  let destroyed = false;
  let raf = 0;
  let finishAnim: (() => void) | null = null;

  el.textContent = '';
  const root = svg('svg', { viewBox: '0 0 400 400', class: 'clock-face', 'data-role': 'clock-face', 'data-minutes': total, style: 'width:100%;height:100%;overflow:visible;touch-action:none' });
  const defs = svg('defs', {}, root);
  shadow(defs, shadowId, 8, 8, '#94A3B8', 0.25, [-10, -10, 120, 120]);
  shadow(defs, handShadowId, 3, 2.5, '#0F172A', 0.25, [-20, -20, 140, 140]);
  svg('circle', { cx: 200, cy: 200, r: 192, fill: '#FBBF24', filter: `url(#${shadowId})` }, root);
  svg('circle', { cx: 200, cy: 200, r: 180, fill: '#F59E0B' }, root);
  svg('circle', { cx: 200, cy: 200, r: 172, fill: '#FFFDF9' }, root);

  const zonesLayer = svg('g', { 'data-role': 'zones', style: `transition:opacity .3s;opacity:${opts.zones ? 1 : 0}` }, root);
  svg('path', { d: 'M 200 28 A 172 172 0 0 1 200 372 Z', fill: '#ECFDF5' }, zonesLayer);
  svg('path', { d: 'M 200 372 A 172 172 0 0 1 200 28 Z', fill: '#F5F3FF' }, zonesLayer);
  svg('line', { x1: 200, y1: 32, x2: 200, y2: 368, stroke: '#CBD5E1', 'stroke-width': 2, 'stroke-dasharray': '6 6' }, zonesLayer);
  svg('text', { x: 275, y: 205, 'text-anchor': 'middle', 'font-family': 'Fredoka, sans-serif', 'font-weight': '700', 'font-size': '22', fill: '#10B981', opacity: '0.32', 'letter-spacing': '2' }, zonesLayer, 'PAST');
  svg('text', { x: 125, y: 205, 'text-anchor': 'middle', 'font-family': 'Fredoka, sans-serif', 'font-weight': '700', 'font-size': '22', fill: '#8B5CF6', opacity: '0.32', 'letter-spacing': '2' }, zonesLayer, 'TO');

  const ticks = svg('g', {}, root);
  const numbers = svg('g', {}, root);
  buildFace(ticks, numbers);

  const handsLayer = svg('g', {}, root);
  const hourHand = hand(handsLayer, 'hour-hand', handShadowId, { hitFrom: 215, hitTo: 95, bodyFrom: 215, bodyTo: 105, width: 14, colour: '#FF6B6B', shineFrom: 205, shineTo: 112, shine: '#FCA5A5', shineWidth: 4, tipY: 105 });
  const minuteHand = hand(handsLayer, 'minute-hand', handShadowId, { hitFrom: 220, hitTo: 42, bodyFrom: 222, bodyTo: 54, width: 9, colour: '#3B82F6', shineFrom: 210, shineTo: 62, shine: '#93C5FD', shineWidth: 3, tipY: 54 });
  svg('circle', { cx: 200, cy: 200, r: 13, fill: '#F59E0B', stroke: '#FFFFFF', 'stroke-width': 3 }, handsLayer);
  svg('circle', { cx: 200, cy: 200, r: 5, fill: '#FFFBEB' }, handsLayer);
  el.appendChild(root);

  function render(t: number) {
    const norm = ((t % 720) + 720) % 720;
    hourHand.setAttribute('transform', `rotate(${norm * 0.5} 200 200)`);
    minuteHand.setAttribute('transform', `rotate(${(norm % 60) * 6} 200 200)`);
  }
  function publish() {
    root.setAttribute('data-minutes', String(total));
    render(total);
  }
  publish();

  function pointerAngle(x: number, y: number): number {
    const r = root.getBoundingClientRect();
    return angleFromPointer(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
  }

  function dragMove(x: number, y: number) {
    const angle = pointerAngle(x, y);
    let next = total, major = false;
    if (dragging === 'minute') {
      const m = minuteFromAngle(angle, snap);
      next = totalFromMinuteDrag(total, m);
      major = m % 15 === 0;
    } else if (dragging === 'hour') {
      next = totalFromHourDrag(angle, snap);
      major = next % 60 === 0;
    } else return;
    if (next !== total) {
      total = next;
      publish();
      opts.onChange?.(total, major);
    }
  }

  const startDrag = (which: 'minute' | 'hour') => (e: Event) => {
    e.preventDefault();
    finishAnim?.(); // let any running setMinutes animation complete before the drag takes over
    dragging = which;
    (which === 'hour' ? hourHand : minuteHand).style.cursor = 'grabbing';
  };
  const onRootDown = (e: Event) => {
    if (dragging) return;
    finishAnim?.();
    dragging = 'minute';
    const p = e as PointerEvent;
    dragMove(p.clientX, p.clientY);
  };
  const onMove = (e: Event) => {
    if (!dragging) return;
    const p = e as PointerEvent;
    dragMove(p.clientX, p.clientY);
  };
  const onUp = () => {
    if (dragging) {
      hourHand.style.cursor = 'grab';
      minuteHand.style.cursor = 'grab';
      dragging = null;
    }
  };
  const onHourDown = startDrag('hour');
  const onMinuteDown = startDrag('minute');

  if (opts.interactive) {
    hourHand.addEventListener('pointerdown', onHourDown);
    minuteHand.addEventListener('pointerdown', onMinuteDown);
    root.addEventListener('pointerdown', onRootDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  return {
    getMinutes: () => total,
    setMinutes(target, animateMs) {
      if (destroyed) return Promise.resolve();
      if (finishAnim) finishAnim();
      const to = hourMinute(target).normalized;
      const from = total;
      total = to;
      root.setAttribute('data-minutes', String(to));
      if (!animateMs || animateMs <= 0 || from === to) {
        render(to);
        return Promise.resolve();
      }
      // shortest way round the 12-hour cycle
      let delta = to - from;
      if (delta > 360) delta -= 720;
      else if (delta < -360) delta += 720;
      return new Promise<void>((resolve) => {
        const t0 = performance.now();
        const done = () => {
          cancelAnimationFrame(raf);
          finishAnim = null;
          if (!destroyed) render(to);
          resolve();
        };
        finishAnim = done;
        const step = (now: number) => {
          const p = Math.min(1, (now - t0) / animateMs);
          if (p >= 1) { done(); return; }
          const eased = 1 - Math.pow(1 - p, 3);
          render(from + delta * eased);
          raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      });
    },
    setSnap(n) { snap = n; },
    setZones(on) { zonesLayer.style.opacity = on ? '1' : '0'; },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (finishAnim) finishAnim();
      hourHand.removeEventListener('pointerdown', onHourDown);
      minuteHand.removeEventListener('pointerdown', onMinuteDown);
      root.removeEventListener('pointerdown', onRootDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      root.remove();
    },
  };
}
