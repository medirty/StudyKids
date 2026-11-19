import { describe, it, expect, vi, afterEach } from 'vitest';
import { TOYS } from '../../src/content/registry';
import { mulberry32 } from '../../src/core/rng';
import type { Stage, ToyContext } from '../../src/core/types';

// The shell already speaks "Let's look together. {how}" on a reveal; a demo must not say the same words again.

const mkCtx = (stage: Stage): ToyContext & { spoken: string[] } => {
  const c = {
    stage, autoRead: true, spoken: [] as string[],
    speech: { speak: async (t: string) => { c.spoken.push(t); }, stop() {}, available: true },
    sfx: { tick() {}, success() {}, tryAgain() {} },
    celebrate() {},
  };
  return c;
};
const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

afterEach(() => { vi.useRealTimers(); document.body.replaceChildren(); });

describe.each(TOYS.filter(t => t.demonstrate).map(t => [t.meta.id, t] as const))('%s demonstrate', (_id, toy) => {
  it.each(toy.meta.stages.map(s => [s] as const))('never speaks the explanation (stage %i)', async stage => {
    vi.useFakeTimers();
    const qs = toy.generateQuestions(stage, 12, mulberry32(7));
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) {
      const hows = new Set<string>();
      for (const wrong of [null, undefined, 0, '', []] as unknown[]) {
        try { hows.add(norm(toy.explain(q, wrong as never).how)); } catch { /* answer shape differs */ }
      }
      const el = document.createElement('div');
      document.body.append(el);
      const ctx = mkCtx(stage);
      const p = toy.demonstrate!(el, q, ctx);
      await vi.advanceTimersByTimeAsync(30000);
      const view = await p;
      for (const said of ctx.spoken) {
        expect(hows.has(norm(said)), `"${said}" repeats the explanation`).toBe(false);
      }
      view.destroy();
      el.remove();
    }
  });
});
