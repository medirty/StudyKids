import { describe, it, expect, vi } from 'vitest';
import { soundBuilderToy, type SoundBuilderQuestion } from '../../../src/toys/english/soundBuilder';
import { CVC_WORDS } from '../../../src/content/english/cvc';
import { toysFor } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';

const q = (word = 'cat', emoji = '🐱'): SoundBuilderQuestion => ({
  id: 'q1', prompt: 'Build the word', spoken: `Build the word ${word}`, word, emoji, letters: [...word, 'm', 'p'],
});
const mkCtx = (autoRead = false): ToyContext & { spoken: string[]; ticks: number } => {
  const c = {
    stage: 1 as const, autoRead, spoken: [] as string[], ticks: 0,
    speech: { speak: async (t: string) => { c.spoken.push(t); }, stop() {}, available: true },
    sfx: { tick: () => { c.ticks++; }, success() {}, tryAgain() {} },
    celebrate() {},
  };
  return c;
};
const letterBtn = (el: HTMLElement, l: string) =>
  [...el.querySelectorAll<HTMLElement>('[data-role="letter"]')].find(b => b.textContent === l)!;
const slots = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-role="slot"]')].map(s => s.textContent);
const poolTile = (el: HTMLElement, t: string) =>
  [...el.querySelectorAll<HTMLElement>('.kit-tile-pool [data-role="tile"]')].find(b => b.textContent === t)!;

describe('content and meta', () => {
  it('has 30+ unique three-letter words with emoji', () => {
    expect(CVC_WORDS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(CVC_WORDS.map(w => w.word)).size).toBe(CVC_WORDS.length);
    expect(new Set(CVC_WORDS.map(w => w.emoji)).size).toBe(CVC_WORDS.length);
    for (const w of CVC_WORDS) { expect(w.word).toMatch(/^[a-z]{3}$/); expect(w.emoji).not.toBe(''); }
  });
  it('is registered for grade 1 english only', () => {
    const m = soundBuilderToy.meta;
    expect([m.id, m.subject, m.stages, m.title, m.icon]).toEqual(['soundBuilder', 'english', [1], 'Sound Builder', '🔤']);
    expect(toysFor('english', 1).map(t => t.meta.id)).toContain('soundBuilder');
    expect(toysFor('english', 3).map(t => t.meta.id)).not.toContain('soundBuilder');
  });
});

describe('generateQuestions', () => {
  it('200 questions: listed words, letters cover the word, 2-3 distractors, no consecutive repeat', () => {
    const qs = soundBuilderToy.generateQuestions(1, 200, mulberry32(5));
    expect(qs.length).toBe(200);
    const byWord = new Map(CVC_WORDS.map(w => [w.word, w.emoji]));
    qs.forEach((x, i) => {
      expect(byWord.get(x.word)).toBe(x.emoji);
      expect(x.prompt).toBe('Build the word');
      expect(x.spoken).toBe(`Build the word ${x.word}`);
      const pool = [...x.letters];
      for (const l of x.word) { const k = pool.indexOf(l); expect(k).toBeGreaterThanOrEqual(0); pool.splice(k, 1); }
      expect(pool.length).toBeGreaterThanOrEqual(2);
      expect(pool.length).toBeLessThanOrEqual(3);
      for (const d of pool) expect(x.word.includes(d)).toBe(false);
      if (i > 0) expect(x.word).not.toBe(qs[i - 1].word);
    });
    expect(new Set(qs.map(x => x.id)).size).toBe(200);
    expect(new Set(qs.map(x => x.word)).size).toBe(CVC_WORDS.length);
  });
  it('returns the requested count for small and zero counts', () => {
    expect(soundBuilderToy.generateQuestions(1, 1, mulberry32(1)).length).toBe(1);
    expect(soundBuilderToy.generateQuestions(1, 0, mulberry32(1)).length).toBe(0);
  });
});

describe('check / describe / explain', () => {
  it('check', () => {
    expect(soundBuilderToy.check(q(), ['c', 'a', 't'])).toEqual({ correct: true });
    expect(soundBuilderToy.check(q(), ['c', 'a', 'p']).correct).toBe(false);
    expect(soundBuilderToy.check(q(), ['c', 'a']).correct).toBe(false);
    expect(soundBuilderToy.check(q(), []).hint).toBe('Listen to each sound: c … like cat, a … like apple, t … like tap');
  });
  it('describeAnswer', () => {
    expect(soundBuilderToy.describeAnswer(q(), ['c', 'a', 'p'])).toBe('cap');
    expect(soundBuilderToy.describeAnswer(q(), [])).toBe('nothing yet');
  });
  it('explain', () => {
    expect(soundBuilderToy.explain(q(), ['c', 'a', 'p'])).toEqual({
      why: 'You made "cap".', how: 'cat has three sounds: c … like cat, a … like apple, t … like tap.',
    });
    expect(soundBuilderToy.explain(q(), []).why).toBe('You made "nothing yet".');
  });
});

describe('explore', () => {
  it('has a-z board and 3 slots; tap speaks the letter even without autoRead', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = soundBuilderToy.explore(el, ctx);
    expect(el.querySelectorAll('[data-role="letter"]').length).toBe(26);
    expect(el.querySelectorAll('[data-role="slot"]').length).toBe(3);
    letterBtn(el, 'c').click();
    expect(ctx.spoken).toEqual(['c … like cat']);
    expect(slots(el)).toEqual(['c', '', '']);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('a CVC word speaks the word and shows its emoji; a non-word does not', async () => {
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(false);
    const v = soundBuilderToy.explore(el, ctx);
    for (const l of ['c', 'a', 't']) letterBtn(el, l).click();
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(ctx.spoken).toContain('cat');
    expect(el.querySelector('[data-role="emoji"]')!.textContent).toBe('🐱');
    (el.querySelector('[data-role="clear"]') as HTMLElement).click();
    expect(slots(el)).toEqual(['', '', '']);
    expect(el.querySelector('[data-role="emoji"]')!.textContent).toBe('');
    for (const l of ['x', 'q', 'z']) letterBtn(el, l).click();
    await Promise.resolve();
    expect(ctx.spoken).not.toContain('xqz');
    expect(el.querySelector('[data-role="emoji"]')!.textContent).toBe('');
    v.destroy();
    el.remove();
  });
  it('a fourth letter starts a fresh word; tapping a filled slot removes it', () => {
    const el = document.createElement('div');
    const v = soundBuilderToy.explore(el, mkCtx());
    for (const l of ['x', 'q', 'z', 'b']) letterBtn(el, l).click();
    expect(slots(el)).toEqual(['b', '', '']);
    el.querySelectorAll<HTMLElement>('[data-role="slot"]')[0].click();
    expect(slots(el)).toEqual(['', '', '']);
    v.destroy();
  });
});

describe('challenge', () => {
  it('shows emoji, sets data-word, tiles build the answer, reset clears', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = soundBuilderToy.renderChallenge(el, q(), ctx);
    expect((el.querySelector('[data-word]') as HTMLElement).dataset.word).toBe('cat');
    expect(el.querySelector('[data-role="emoji"]')!.textContent).toBe('🐱');
    expect(v.getAnswer()).toEqual([]);
    poolTile(el, 'c').click(); poolTile(el, 'a').click(); poolTile(el, 't').click();
    expect(v.getAnswer()).toEqual(['c', 'a', 't']);
    v.reset();
    expect(v.getAnswer()).toEqual([]);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('🔊 replays the word on tap; no automatic speech', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = soundBuilderToy.renderChallenge(el, q(), ctx);
    expect(ctx.spoken).toEqual([]);
    (el.querySelector('[data-role="speak"]') as HTMLElement).click();
    expect(ctx.spoken).toEqual(['cat']);
    v.destroy();
  });
  it('tapping a tile speaks its letter only with autoRead', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = soundBuilderToy.renderChallenge(el, q(), ctx);
    poolTile(el, 'c').click();
    expect(ctx.spoken).toEqual([]);
    v.destroy();
    const el2 = document.createElement('div');
    const ctx2 = mkCtx(true);
    const v2 = soundBuilderToy.renderChallenge(el2, q(), ctx2);
    poolTile(el2, 'c').click();
    expect(ctx2.spoken).toEqual(['c … like cat']);
    v2.destroy();
  });
});

describe('demonstrate', () => {
  it('places letters one by one with sayLetter, then says the word', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(true);
    const p = soundBuilderToy.demonstrate!(el, q(), ctx);
    await vi.advanceTimersByTimeAsync(10000);
    const v = await p;
    expect(slots(el)).toEqual(['c', 'a', 't']);
    expect(ctx.spoken).toEqual(['c … like cat', 'a … like apple', 't … like tap', 'cat']);
    v.destroy();
    el.remove();
    vi.useRealTimers();
  });
  it('is silent without autoRead', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(false);
    const p = soundBuilderToy.demonstrate!(el, q(), ctx);
    await vi.advanceTimersByTimeAsync(10000);
    const v = await p;
    expect(slots(el)).toEqual(['c', 'a', 't']);
    expect(ctx.spoken).toEqual([]);
    v.destroy(); el.remove();
    vi.useRealTimers();
  });
  it.each(['wrapper.remove', 'body.replaceChildren'])('stops and leaves no timers when an ancestor is detached (%s)', async how => {
    vi.useFakeTimers();
    const wrapper = document.createElement('div');
    const el = document.createElement('div');
    wrapper.append(el);
    document.body.append(wrapper);
    const ctx = mkCtx(true);
    const p = soundBuilderToy.demonstrate!(el, q(), ctx);
    await vi.advanceTimersByTimeAsync(1000);
    const spoken = ctx.spoken.length;
    expect(spoken).toBeGreaterThan(0);
    if (how === 'wrapper.remove') wrapper.remove(); else document.body.replaceChildren();
    await vi.advanceTimersByTimeAsync(10000);
    const view = await p;
    expect(ctx.spoken.length).toBe(spoken);
    expect(vi.getTimerCount()).toBe(0);
    view.destroy();
    vi.useRealTimers();
  });
});

describe('explore word speech guard', () => {
  const flush = async () => { for (let k = 0; k < 6; k++) await Promise.resolve(); };
  const setup = () => {
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(false);
    return { el, ctx, view: soundBuilderToy.explore(el, ctx) };
  };
  const tap = (el: HTMLElement, word: string) => { for (const l of word) letterBtn(el, l).click(); };

  it('positive control: the word is spoken when nothing interferes', async () => {
    const { el, ctx, view } = setup();
    try {
      tap(el, 'cat');
      await flush();
      expect(ctx.spoken).toContain('cat');
    } finally { view.destroy(); el.remove(); }
  });
  it('not spoken if the slots changed before the letter speech resolved', async () => {
    const { el, ctx, view } = setup();
    try {
      tap(el, 'cat');
      el.querySelectorAll<HTMLElement>('[data-role="slot"]')[0].click();
      await flush();
      expect(ctx.spoken).not.toContain('cat');
    } finally { view.destroy(); el.remove(); }
  });
  it('not spoken if destroy() ran (element left attached) before the letter speech resolved', async () => {
    const { el, ctx, view } = setup();
    try {
      tap(el, 'dog');
      view.destroy();
      expect(el.isConnected).toBe(true);
      await flush();
      expect(ctx.spoken).not.toContain('dog');
    } finally { el.remove(); }
  });
});
