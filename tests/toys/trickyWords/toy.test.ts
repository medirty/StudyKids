import { describe, it, expect, vi } from 'vitest';
import { trickyWordsToy, type TrickyQuestion } from '../../../src/toys/english/trickyWords';
import { TRICKY_WORDS } from '../../../src/content/english/tricky';
import { toysFor } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';

const q = (target = 'she'): TrickyQuestion => ({
  id: 'q1', prompt: 'Pop the word', spoken: `Pop the word ${target}`, target, options: ['we', target, 'the', 'was'],
});
const mkCtx = (autoRead = false): ToyContext & { spoken: string[] } => {
  const c = {
    stage: 1 as const, autoRead, spoken: [] as string[],
    speech: { speak: async (t: string) => { c.spoken.push(t); }, stop() {}, available: true },
    sfx: { tick() {}, success() {}, tryAgain() {} },
    celebrate() {},
  };
  return c;
};
const balloon = (el: HTMLElement, w: string) =>
  [...el.querySelectorAll<HTMLElement>('[data-role="choice"]')].find(b => b.dataset.id === w)!;

describe('content and meta', () => {
  it('has the 26 words from the spec, in order, unique, with capital I', () => {
    expect(TRICKY_WORDS.length).toBe(26);
    expect(TRICKY_WORDS.slice(0, 4)).toEqual(['the', 'to', 'I', 'no']);
    expect(TRICKY_WORDS[25]).toBe('there');
    expect(new Set(TRICKY_WORDS).size).toBe(26);
  });
  it('is registered for grade 1 english only', () => {
    const m = trickyWordsToy.meta;
    expect([m.id, m.subject, m.stages, m.title, m.icon]).toEqual(['trickyWords', 'english', [1], 'Tricky Word Pop', '🎈']);
    expect(toysFor('english', 1).map(t => t.meta.id)).toContain('trickyWords');
    expect(toysFor('english', 3).map(t => t.meta.id)).not.toContain('trickyWords');
  });
});

describe('generateQuestions', () => {
  it('200 questions: 4 unique listed options incl. target, spoken prompt, no consecutive repeat', () => {
    const qs = trickyWordsToy.generateQuestions(1, 200, mulberry32(3));
    expect(qs.length).toBe(200);
    qs.forEach((x, i) => {
      expect(x.prompt).toBe('Pop the word');
      expect(x.spoken).toBe(`Pop the word ${x.target}`);
      expect(x.options.length).toBe(4);
      expect(new Set(x.options).size).toBe(4);
      expect(x.options).toContain(x.target);
      for (const o of x.options) expect(TRICKY_WORDS).toContain(o);
      if (i > 0) expect(x.target).not.toBe(qs[i - 1].target);
    });
    expect(new Set(qs.map(x => x.id)).size).toBe(200);
    expect(new Set(qs.map(x => x.target)).size).toBe(26);
  });
  it('returns the requested count for small and zero counts', () => {
    expect(trickyWordsToy.generateQuestions(1, 1, mulberry32(1)).length).toBe(1);
    expect(trickyWordsToy.generateQuestions(1, 0, mulberry32(1)).length).toBe(0);
  });
});

describe('check / describe / explain', () => {
  it('check', () => {
    expect(trickyWordsToy.check(q(), 'she')).toEqual({ correct: true });
    expect(trickyWordsToy.check(q(), 'we')).toEqual({
      correct: false, hint: 'Listen again and look at the first letter: "s".',
    });
    expect(trickyWordsToy.check(q(), null)).toEqual({ correct: false, hint: 'Tap a balloon first!' });
    expect(trickyWordsToy.check(q('I'), 'I')).toEqual({ correct: true });
  });
  it('describeAnswer', () => {
    expect(trickyWordsToy.describeAnswer(q(), 'we')).toBe('we');
    expect(trickyWordsToy.describeAnswer(q(), null)).toBe('nothing yet');
  });
  it('explain', () => {
    expect(trickyWordsToy.explain(q(), 'we')).toEqual({
      why: 'You popped "we".', how: 'This word is "she". Say it and spell it: s, h, e.',
    });
    expect(trickyWordsToy.explain(q('I'), null).how).toBe('This word is "I". Say it and spell it: I.');
    expect(trickyWordsToy.explain(q(), null).why).toBe('You did not pop a balloon yet.');
  });
});

describe('explore', () => {
  it('shows a card per word, tap speaks the word even without autoRead, keeps capital I', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = trickyWordsToy.explore(el, ctx);
    const cards = [...el.querySelectorAll<HTMLElement>('[data-role="word"]')];
    expect(cards.map(c => c.textContent)).toEqual([...TRICKY_WORDS]);
    cards[2].click();
    expect(ctx.spoken).toEqual(['I']);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
});

describe('challenge', () => {
  it('four balloons, selection is the answer, reset clears, no automatic speech', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const v = trickyWordsToy.renderChallenge(el, q(), ctx);
    expect(el.querySelectorAll('[data-role="choice"]').length).toBe(4);
    expect(el.querySelector('.kit-balloon')).not.toBeNull();
    expect(v.getAnswer()).toBeNull();
    balloon(el, 'we').click();
    expect(v.getAnswer()).toBe('we');
    v.reset();
    expect(v.getAnswer()).toBeNull();
    expect(ctx.spoken).toEqual([]);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('🔊 replays the word', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = trickyWordsToy.renderChallenge(el, q(), ctx);
    (el.querySelector('[data-role="speak"]') as HTMLElement).click();
    expect(ctx.spoken).toEqual(['she']);
    v.destroy();
  });
});

describe('demonstrate', () => {
  it('highlights the correct balloon and speaks only with autoRead', async () => {
    for (const autoRead of [true, false]) {
      const el = document.createElement('div');
      document.body.append(el);
      const ctx = mkCtx(autoRead);
      const v = await trickyWordsToy.demonstrate!(el, q(), ctx);
      expect(balloon(el, 'she').dataset.highlight).toBe('correct');
      expect(balloon(el, 'we').dataset.highlight).toBeUndefined();
      expect(ctx.spoken).toEqual(autoRead ? ['she'] : []);
      v.destroy(); el.remove();
    }
  });
  it.each(['wrapper.remove', 'body.replaceChildren'])('leaves no timers when an ancestor is detached (%s)', async how => {
    vi.useFakeTimers();
    const wrapper = document.createElement('div');
    const el = document.createElement('div');
    wrapper.append(el);
    document.body.append(wrapper);
    const ctx = mkCtx(true);
    const p = trickyWordsToy.demonstrate!(el, q(), ctx);
    if (how === 'wrapper.remove') wrapper.remove(); else document.body.replaceChildren();
    await vi.advanceTimersByTimeAsync(5000);
    const view = await p;
    expect(vi.getTimerCount()).toBe(0);
    view.destroy();
    vi.useRealTimers();
  });
});
