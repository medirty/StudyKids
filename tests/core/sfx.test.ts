import { describe, it, expect } from 'vitest';
import { envelopePoints } from '../../src/core/sfx';

describe('envelopePoints', () => {
  for (const dur of [0.0625, 0.125, 0.25]) {
    it(`is strictly time-ordered and never steps up after the peak (dur ${dur})`, () => {
      const pts = envelopePoints(1, dur);
      for (let i = 1; i < pts.length; i++) expect(pts[i][0]).toBeGreaterThan(pts[i - 1][0]);
      const peak = pts.findIndex((p) => p[1] === Math.max(...pts.map((q) => q[1])));
      for (let i = peak + 1; i < pts.length; i++) expect(pts[i][1]).toBeLessThanOrEqual(pts[i - 1][1]);
      expect(pts[pts.length - 1][0]).toBeCloseTo(1 + dur + 0.2);
    });
  }
});
