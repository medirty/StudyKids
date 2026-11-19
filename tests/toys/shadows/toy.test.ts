import { readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import { shadowsToy, type ShadowQuestion } from '../../../src/toys/science/shadows';
import {
  LIGHT_OBJECTS, lightObject, shadowScale, SHADOW_DARKNESS, SIZE_HINT, DARK_HINT, closeness, objectLine, distanceLine,
} from '../../../src/content/science/light';
import { toysFor, findToy } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';

const mkCtx = (autoRead = false): ToyContext & { spoken: string[] } => {
  const c = {
    stage: 3 as const, autoRead, spoken: [] as string[],
    speech: { speak: async (t: string) => { c.spoken.push(t); }, stop() {}, available: true },
    sfx: { tick() {}, success() {}, tryAgain() {} },
    celebrate: vi.fn(),
  };
  return c;
};
const size = (dir: 'closer' | 'farther' = 'closer', object = 'book', start = 3): ShadowQuestion => ({
  id: 'q1', prompt: `Move the torch ${dir}. Will the shadow get bigger or smaller?`, mode: 'size', direction: dir, object, start,
  options: ['bigger', 'smaller'], answer: dir === 'closer' ? 'bigger' : 'smaller',
});
const dark = (ids = ['tissue-paper', 'book', 'clear-glass']): ShadowQuestion => ({
  id: 'q1', prompt: 'Which object makes the darkest shadow?', mode: 'dark', direction: null, object: 'book', start: 3,
  options: ids, answer: ids.find(i => lightObject(i).kind === 'opaque')!,
});
const $ = (el: HTMLElement, role: string) => el.querySelector<HTMLElement>(`[data-role="${role}"]`)!;
const choice = (el: HTMLElement, id: string) =>
  [...el.querySelectorAll<HTMLElement>('[data-role="choice"]')].find(b => b.dataset.id === id)!;

describe('content', () => {
  it('shadowScale is strictly decreasing from 2.0 (close) to 1.0 (far), held outside 1..5', () => {
    expect(shadowScale(1)).toBe(2);
    expect(shadowScale(5)).toBe(1);
    for (let d = 1; d < 5; d += 0.5) expect(shadowScale(d)).toBeGreaterThan(shadowScale(d + 0.5));
    expect(shadowScale(0)).toBe(2);
    expect(shadowScale(9)).toBe(1);
  });
  it('closeness mirrors distance', () => {
    expect([1, 2, 3, 4, 5].map(closeness)).toEqual([5, 4, 3, 2, 1]);
  });
  it('every object has exactly one valid class; the lists match the science', () => {
    expect(new Set(LIGHT_OBJECTS.map(o => o.id)).size).toBe(LIGHT_OBJECTS.length);
    expect(new Set(LIGHT_OBJECTS.map(o => o.emoji)).size).toBe(LIGHT_OBJECTS.length);
    for (const o of LIGHT_OBJECTS) expect(['opaque', 'translucent', 'transparent']).toContain(o.kind);
    const of = (k: string) => LIGHT_OBJECTS.filter(o => o.kind === k).map(o => o.name);
    expect(of('opaque')).toEqual(['book', 'hand', 'teddy', 'wooden block']);
    expect(of('translucent')).toEqual(['tissue paper', 'frosted glass']);
    expect(of('transparent')).toEqual(['clear glass jar', 'cling film']);
  });
  it('darkness: opaque > translucent > transparent', () => {
    expect(SHADOW_DARKNESS.opaque).toBeGreaterThan(SHADOW_DARKNESS.translucent);
    expect(SHADOW_DARKNESS.translucent).toBeGreaterThan(SHADOW_DARKNESS.transparent);
    expect(SHADOW_DARKNESS.transparent).toBeLessThan(0.15);
  });
  it('hints verbatim', () => {
    expect(SIZE_HINT).toBe('Closer to the light makes a bigger shadow.');
    expect(DARK_HINT).toBe('Light cannot pass through opaque things, so their shadows are dark.');
    expect(objectLine(lightObject('cling-film'))).toMatch(/^The cling film is transparent\./);
  });
  it('is registered for grade 3 science only', () => {
    const m = shadowsToy.meta;
    expect([m.id, m.subject, m.stages, m.title, m.icon]).toEqual(['shadows', 'science', [3], 'Light & Shadows', '🔦']);
    expect(toysFor('science', 3).map(t => t.meta.id)).toContain('shadows');
    expect(toysFor('science', 1).map(t => t.meta.id)).not.toContain('shadows');
    expect(findToy('shadows')).toBe(shadowsToy);
  });
});

describe('generateQuestions', () => {
  it('200 questions: both kinds, valid answers, no back-to-back repeat, unique ids', () => {
    const qs = shadowsToy.generateQuestions(3, 200, mulberry32(7));
    expect(qs.length).toBe(200);
    qs.forEach((x, i) => {
      if (x.mode === 'size') {
        expect(x.prompt).toBe(`Move the torch ${x.direction}. Will the shadow get bigger or smaller?`);
        expect(x.options).toEqual(['bigger', 'smaller']);
        expect(x.answer).toBe(x.direction === 'closer' ? 'bigger' : 'smaller');
        expect(lightObject(x.object).kind).toBe('opaque');
        expect(x.start).toBeGreaterThanOrEqual(1);
        expect(x.start).toBeLessThanOrEqual(5);
        if (x.direction === 'closer') expect(x.start).toBeGreaterThan(1); else expect(x.start).toBeLessThan(5);
      } else {
        expect(x.prompt).toBe('Which object makes the darkest shadow?');
        expect(x.options.length).toBe(3);
        expect(new Set(x.options).size).toBe(3);
        expect(x.options.filter(o => lightObject(o).kind === 'opaque')).toEqual([x.answer]);
      }
      if (i > 0) expect(x.prompt === qs[i - 1].prompt && x.object === qs[i - 1].object && x.options.join() === qs[i - 1].options.join()).toBe(false);
    });
    expect(new Set(qs.map(x => x.id)).size).toBe(200);
    expect(new Set(qs.map(x => x.mode))).toEqual(new Set(['size', 'dark']));
    expect(new Set(qs.filter(x => x.mode === 'dark').map(x => x.answer)).size).toBe(4);
  });
  it('a round of 10 has both kinds; counts 0 and 1 are honoured', () => {
    for (let s = 1; s < 20; s++) expect(new Set(shadowsToy.generateQuestions(3, 10, mulberry32(s)).map(x => x.mode)).size).toBe(2);
    expect(shadowsToy.generateQuestions(3, 0, mulberry32(1)).length).toBe(0);
    expect(shadowsToy.generateQuestions(3, 1, mulberry32(1)).length).toBe(1);
  });
});

describe('check / describe / explain', () => {
  it('size', () => {
    expect(shadowsToy.check(size('closer'), 'bigger')).toEqual({ correct: true });
    expect(shadowsToy.check(size('farther'), 'smaller')).toEqual({ correct: true });
    expect(shadowsToy.check(size('closer'), 'smaller')).toEqual({ correct: false, hint: SIZE_HINT });
    expect(shadowsToy.check(size('farther'), 'bigger')).toEqual({ correct: false, hint: SIZE_HINT });
  });
  it('dark', () => {
    expect(shadowsToy.check(dark(), 'book')).toEqual({ correct: true });
    expect(shadowsToy.check(dark(), 'tissue-paper')).toEqual({ correct: false, hint: DARK_HINT });
  });
  it('no answer', () => {
    const r = shadowsToy.check(size(), null);
    expect(r.correct).toBe(false);
    expect(r.hint).toMatch(/choose/i);
  });
  it('describe and explain', () => {
    expect(shadowsToy.describeAnswer(size(), 'bigger')).toBe('You said bigger');
    expect(shadowsToy.describeAnswer(dark(), 'clear-glass')).toBe('You said the clear glass jar');
    expect(shadowsToy.describeAnswer(dark(), null)).toBe('You did not choose yet');
    expect(shadowsToy.explain(size('farther'), 'bigger')).toEqual({
      why: 'You said bigger.', how: 'The torch is farther away, so the shadow gets smaller.',
    });
    expect(shadowsToy.explain(dark(), 'tissue-paper').how).toBe(
      'The book is opaque. Light cannot pass through opaque things, so their shadows are dark.');
    expect(shadowsToy.explain(dark(), null).why).toBe('You did not choose yet.');
  });
});

describe('explore', () => {
  it('has a slider of at least 48px, eight objects, the wall shadow, and starts quiet', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const v = shadowsToy.explore(el, ctx);
    const sl = $(el, 'slider') as HTMLInputElement;
    expect(sl.type).toBe('range');
    expect(sl.className).toMatch(/\bh-12\b/);
    expect(el.querySelectorAll('[data-role="thing"]').length).toBe(8);
    expect($(el, 'shadow')).toBeTruthy();
    expect(ctx.spoken).toEqual([]);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('moving the torch closer makes the shadow bigger; text explains', () => {
    const el = document.createElement('div');
    const v = shadowsToy.explore(el, mkCtx());
    const sl = $(el, 'slider') as HTMLInputElement;
    const scale = () => Number($(el, 'shadow').dataset.scale);
    sl.value = '1'; sl.dispatchEvent(new Event('input'));
    const far = scale();
    expect($(el, 'feedback').textContent).toMatch(/far away/);
    sl.value = '5'; sl.dispatchEvent(new Event('input'));
    expect(scale()).toBeGreaterThan(far);
    expect(scale()).toBe(shadowScale(1));
    expect($(el, 'feedback').textContent).toMatch(/close, so the shadow is big/);
    v.destroy();
  });
  it('the torch moves toward the object as it gets closer, shadow falls on the far side', () => {
    const el = document.createElement('div');
    const v = shadowsToy.explore(el, mkCtx());
    const sl = $(el, 'slider') as HTMLInputElement;
    const left = () => parseFloat($(el, 'torch').style.left);
    sl.value = '1'; sl.dispatchEvent(new Event('input'));
    const a = left();
    sl.value = '5'; sl.dispatchEvent(new Event('input'));
    expect(left()).toBeGreaterThan(a);
    expect(parseFloat($(el, 'torch').style.left)).toBeLessThan(parseFloat($(el, 'object').style.left));
    expect(parseFloat($(el, 'shadow').style.left || '100')).toBeGreaterThan(parseFloat($(el, 'object').style.left));
    v.destroy();
  });
  it('slider has aria-valuetext from distanceLine; shadow is never smaller than the 48px object', () => {
    const el = document.createElement('div');
    const v = shadowsToy.explore(el, mkCtx());
    const sl = $(el, 'slider') as HTMLInputElement;
    expect(sl.getAttribute('aria-valuetext')).toBe(distanceLine(3));
    sl.value = '5'; sl.dispatchEvent(new Event('input'));
    expect(sl.getAttribute('aria-valuetext')).toBe(distanceLine(1));
    expect(readFileSync('src/styles.css', 'utf8')).toMatch(/\.sh-shadow \{ width: calc\(3rem \* var\(--sh, 1\)\); height: calc\(3rem \* var\(--sh, 1\)\)/);
    v.destroy();
  });
  it('objects change the shadow darkness by class', () => {
    const el = document.createElement('div');
    const v = shadowsToy.explore(el, mkCtx());
    const op = () => Number($(el, 'shadow').style.opacity);
    const pick = (id: string) => el.querySelector<HTMLElement>(`[data-role="thing"][data-id="${id}"]`)!.click();
    pick('book'); const book = op();
    pick('tissue-paper'); const tissue = op();
    pick('cling-film'); const film = op();
    expect(book).toBe(SHADOW_DARKNESS.opaque);
    expect(tissue).toBe(SHADOW_DARKNESS.translucent);
    expect(film).toBe(SHADOW_DARKNESS.transparent);
    expect($(el, 'object').textContent).toBe(lightObject('cling-film').emoji);
    expect($(el, 'feedback').textContent).toMatch(/^The cling film is transparent\./);
    v.destroy();
  });
  it('speaks only with autoRead (or the 🔊 button); sticky scene; touch-friendly; no timers', () => {
    vi.useFakeTimers();
    const quiet = mkCtx(false);
    const el = document.createElement('div');
    const v = shadowsToy.explore(el, quiet);
    el.querySelector<HTMLElement>('[data-role="thing"]')!.click();
    expect(quiet.spoken).toEqual([]);
    $(el, 'speak').click();
    expect(quiet.spoken).toEqual([$(el, 'feedback').textContent]);
    const sticky = $(el, 'sticky');
    expect(sticky.classList.contains('sticky')).toBe(true);
    expect(sticky.contains($(el, 'scene'))).toBe(true);
    expect(sticky.contains($(el, 'feedback'))).toBe(true);
    expect(sticky.contains($(el, 'slider'))).toBe(false);
    expect(el.querySelector('[data-role="thing"]')!.classList.contains('touch-manipulation')).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    v.destroy();
    vi.useRealTimers();
    const loud = mkCtx(true);
    const el2 = document.createElement('div');
    const v2 = shadowsToy.explore(el2, loud);
    el2.querySelector<HTMLElement>('[data-role="thing"]')!.click();
    expect(loud.spoken.length).toBe(1);
    v2.destroy();
  });
});

describe('challenge', () => {
  it('size: cards bigger/smaller, object at start distance, no speech', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const v = shadowsToy.renderChallenge(el, size('closer', 'teddy', 4), ctx);
    expect([...el.querySelectorAll<HTMLElement>('[data-role="choice"]')].map(b => b.dataset.id)).toEqual(['bigger', 'smaller']);
    expect($(el, 'object').textContent).toBe('🧸');
    expect($(el, 'scene').dataset.distance).toBe('4');
    expect(v.getAnswer()).toBeNull();
    expect(ctx.spoken).toEqual([]);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('dark: three object cards; the scene shows no object or shadow, and choosing reveals nothing', () => {
    const el = document.createElement('div');
    const v = shadowsToy.renderChallenge(el, dark(), mkCtx(true));
    expect([...el.querySelectorAll<HTMLElement>('[data-role="choice"]')].map(b => b.dataset.id)).toEqual(['tissue-paper', 'book', 'clear-glass']);
    expect($(el, 'object').textContent).toBe('');
    expect($(el, 'shadow').hidden).toBe(true);
    choice(el, 'book').click();
    expect(v.getAnswer()).toBe('book');
    expect($(el, 'shadow').hidden).toBe(true);
    expect(choice(el, 'book').dataset.highlight).toBeUndefined();
    v.reset();
    expect(v.getAnswer()).toBeNull();
    v.destroy();
  });
  it('size: choosing never moves the torch or changes the shadow', () => {
    const el = document.createElement('div');
    const v = shadowsToy.renderChallenge(el, size('closer', 'book', 3), mkCtx());
    const before = [$(el, 'torch').style.left, $(el, 'shadow').dataset.scale];
    choice(el, 'bigger').click();
    expect([$(el, 'torch').style.left, $(el, 'shadow').dataset.scale]).toEqual(before);
    expect(v.getAnswer()).toBe('bigger');
    v.destroy();
  });
});

describe('demonstrate', () => {
  it('size: highlights the answer and moves the torch to the end; speaks only with autoRead', async () => {
    const el = document.createElement('div');
    document.body.append(el);
    const quiet = mkCtx(false);
    const v = await shadowsToy.demonstrate!(el, size('closer', 'book', 3), quiet);
    expect(choice(el, 'bigger').dataset.highlight).toBe('correct');
    expect($(el, 'scene').dataset.distance).toBe('2');
    expect(Number($(el, 'shadow').dataset.scale)).toBe(shadowScale(2));
    expect(quiet.spoken).toEqual([]);
    v.destroy();
    const loud = mkCtx(true);
    const v2 = await shadowsToy.demonstrate!(el, size('farther', 'book', 2), loud);
    expect(choice(el, 'smaller').dataset.highlight).toBe('correct');
    expect($(el, 'scene').dataset.distance).toBe('3');
    expect(loud.spoken).toEqual(['The shadow gets smaller.']);
    v2.destroy();
    el.remove();
  });
  it('dark: highlights the opaque object and shows its dark shadow', async () => {
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(true);
    const v = await shadowsToy.demonstrate!(el, dark(), ctx);
    expect(choice(el, 'book').dataset.highlight).toBe('correct');
    expect($(el, 'shadow').hidden).toBe(false);
    expect(Number($(el, 'shadow').style.opacity)).toBe(SHADOW_DARKNESS.opaque);
    expect(ctx.spoken.length).toBe(1);
    v.destroy();
    el.remove();
  });
  it('does not speak when detached, and leaves no timers', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const view = await shadowsToy.demonstrate!(el, size(), ctx);
    expect(ctx.spoken).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    view.destroy();
    vi.useRealTimers();
  });
});
