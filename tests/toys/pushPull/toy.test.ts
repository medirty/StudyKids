import { describe, it, expect, vi, afterEach } from 'vitest';
import { pushPullToy, rollDistance, resultLine, type PushPullQuestion } from '../../../src/toys/science/pushPull';
import { FORCE_SCENES, FORCE_HINT } from '../../../src/content/science/forces';
import { toysFor, findToy } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';

const mkCtx = (autoRead = false): ToyContext & { spoken: string[] } => {
  const c = {
    stage: 1 as const, autoRead, spoken: [] as string[],
    speech: { speak: async (t: string) => { c.spoken.push(t); }, stop() {}, available: true },
    sfx: { tick() {}, success() {}, tryAgain() {} },
    celebrate: vi.fn(),
  };
  return c;
};
const scene = (id: string) => FORCE_SCENES.find(s => s.id === id)!;
const q = (id = 'kick-ball'): PushPullQuestion => ({
  id: 'q1', prompt: 'Push or pull?', spoken: `Push or pull? ${scene(id).text}`, scene: id, target: scene(id).answer,
});
const $ = (el: HTMLElement, role: string) => el.querySelector<HTMLElement>(`[data-role="${role}"]`)!;
const choice = (el: HTMLElement, id: string) =>
  [...el.querySelectorAll<HTMLElement>('[data-role="choice"]')].find(b => b.dataset.id === id)!;

describe('content and meta', () => {
  it('has at least 14 unique scenes with emoji, text and a push or pull answer, both kinds well represented', () => {
    expect(FORCE_SCENES.length).toBeGreaterThanOrEqual(14);
    expect(new Set(FORCE_SCENES.map(s => s.id)).size).toBe(FORCE_SCENES.length);
    expect(new Set(FORCE_SCENES.map(s => s.text)).size).toBe(FORCE_SCENES.length);
    for (const s of FORCE_SCENES) {
      expect(s.emoji.length).toBeGreaterThan(0);
      expect(s.text.length).toBeGreaterThan(3);
      expect(['push', 'pull']).toContain(s.answer);
    }
    expect(FORCE_SCENES.filter(s => s.answer === 'push').length).toBeGreaterThanOrEqual(7);
    expect(FORCE_SCENES.filter(s => s.answer === 'pull').length).toBeGreaterThanOrEqual(7);
  });
  it('classes the unambiguous scenes correctly', () => {
    for (const id of ['kick-ball', 'press-doorbell', 'push-trolley', 'push-door-shut', 'throw-ball']) expect(scene(id).answer, id).toBe('push');
    for (const id of ['open-drawer', 'tug-of-war', 'pull-carrot']) expect(scene(id).answer, id).toBe('pull');
  });
  it('states the hint verbatim', () => {
    expect(FORCE_HINT).toBe('A push moves something away from you. A pull moves it towards you.');
  });
  it('is registered for grade 1 science only', () => {
    const m = pushPullToy.meta;
    expect([m.id, m.subject, m.stages, m.title, m.icon]).toEqual(['pushPull', 'science', [1], 'Push or Pull?', '🛒']);
    expect(toysFor('science', 1).map(t => t.meta.id)).toContain('pushPull');
    expect(toysFor('science', 3).map(t => t.meta.id)).not.toContain('pushPull');
    expect(findToy('pushPull')).toBe(pushPullToy);
  });
});

describe('rollDistance', () => {
  it('is strictly increasing across the slider range and stays on the track', () => {
    let prev = -1;
    for (let s = 1; s <= 5; s++) {
      const d = rollDistance(s);
      expect(d).toBeGreaterThan(prev);
      expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThanOrEqual(1);
      prev = d;
    }
    expect(rollDistance(2.5)).toBeGreaterThan(rollDistance(2));
    expect(rollDistance(2.5)).toBeLessThan(rollDistance(3));
  });
  it('never decreases outside the range', () => {
    expect(rollDistance(-3)).toBe(rollDistance(1));
    expect(rollDistance(99)).toBe(rollDistance(5));
  });
});

describe('generateQuestions', () => {
  it('200 questions: spoken prompt, answer from content, no back-to-back repeat, unique ids, every scene used', () => {
    const qs = pushPullToy.generateQuestions(1, 200, mulberry32(3));
    expect(qs.length).toBe(200);
    qs.forEach((x, i) => {
      const s = scene(x.scene);
      expect(s).toBeTruthy();
      expect(x.target).toBe(s.answer);
      expect(x.prompt).toBe('Push or pull?');
      expect(x.spoken).toBe(`Push or pull? ${s.text}`);
      if (i > 0) expect(x.scene).not.toBe(qs[i - 1].scene);
    });
    expect(new Set(qs.map(x => x.id)).size).toBe(200);
    expect(new Set(qs.map(x => x.scene)).size).toBe(FORCE_SCENES.length);
  });
  it('a round of 10 has both pushes and pulls', () => {
    for (let seed = 1; seed < 30; seed++) {
      const qs = pushPullToy.generateQuestions(1, 10, mulberry32(seed));
      expect(new Set(qs.map(x => x.target))).toEqual(new Set(['push', 'pull']));
    }
  });
  it('returns the requested count for 0 and 1', () => {
    expect(pushPullToy.generateQuestions(1, 0, mulberry32(1)).length).toBe(0);
    expect(pushPullToy.generateQuestions(1, 1, mulberry32(1)).length).toBe(1);
  });
});

describe('check / describe / explain', () => {
  it('accepts the right answer, hints with the rule otherwise', () => {
    expect(pushPullToy.check(q('kick-ball'), 'push')).toEqual({ correct: true });
    expect(pushPullToy.check(q('kick-ball'), 'pull')).toEqual({ correct: false, hint: FORCE_HINT });
    expect(pushPullToy.check(q('open-drawer'), 'pull')).toEqual({ correct: true });
    const none = pushPullToy.check(q('open-drawer'), null);
    expect(none.correct).toBe(false);
    expect(none.hint).toMatch(/Push or Pull/);
  });
  it('describeAnswer', () => {
    expect(pushPullToy.describeAnswer(q(), 'pull')).toBe('You chose Pull');
    expect(pushPullToy.describeAnswer(q(), null)).toBe('You did not choose yet');
  });
  it('explain names the scene, the answer and the rule', () => {
    expect(pushPullToy.explain(q('open-drawer'), 'push')).toEqual({
      why: 'You chose Push.',
      how: `"${scene('open-drawer').text}" is a pull. ${FORCE_HINT}`,
    });
    expect(pushPullToy.explain(q('kick-ball'), null).why).toBe('You did not choose yet.');
  });
});

describe('explore', () => {
  const setStrength = (el: HTMLElement, v: number) => {
    const s = $(el, 'strength') as HTMLInputElement;
    s.value = String(v);
    s.dispatchEvent(new Event('input'));
  };
  afterEach(() => vi.unstubAllGlobals());

  it('starts in Push mode with a slider, a Go button and nothing spoken', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const v = pushPullToy.explore(el, ctx);
    expect($(el, 'car')).toBeTruthy();
    expect($(el, 'strength')).toBeTruthy();
    expect($(el, 'go').textContent).toMatch(/Push/);
    expect(ctx.spoken).toEqual([]);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('a bigger push sends the car further away; the slider label and result follow', () => {
    const el = document.createElement('div');
    const v = pushPullToy.explore(el, mkCtx());
    const dist: number[] = [];
    for (const s of [1, 2, 3, 4, 5]) {
      setStrength(el, s);
      $(el, 'go').click();
      dist.push(Number($(el, 'car').dataset.pos));
      expect($(el, 'car').dataset.mode).toBe('push');
      expect($(el, 'result').textContent).toBe(resultLine('push', s));
    }
    expect(dist).toEqual([...dist].sort((a, b) => a - b));
    expect(new Set(dist).size).toBe(5);
    expect(dist[0]).toBe(rollDistance(1));
    v.destroy();
  });
  it('Pull mode ties on a string and brings the car towards the child, further for a bigger pull', () => {
    const el = document.createElement('div');
    const v = pushPullToy.explore(el, mkCtx());
    el.querySelector<HTMLElement>('[data-mode="pull"]')!.click();
    expect($(el, 'go').textContent).toMatch(/Pull/);
    expect($(el, 'string').hidden).toBe(false);
    const pos: number[] = [];
    for (const s of [1, 3, 5]) {
      setStrength(el, s);
      $(el, 'go').click();
      pos.push(Number($(el, 'car').dataset.pos));
      expect($(el, 'car').dataset.mode).toBe('pull');
    }
    // position 1 is the far end; pulling brings it closer to 0 (the child)
    expect(pos[0]).toBeGreaterThan(pos[1]);
    expect(pos[1]).toBeGreaterThan(pos[2]);
    expect(pos[0]).toBeCloseTo(1 - rollDistance(1));
    el.querySelector<HTMLElement>('[data-mode="push"]')!.click();
    expect($(el, 'string').hidden).toBe(true);
    v.destroy();
  });
  it('taps speak (mode buttons), Go speaks the result only with autoRead, 🔊 replays it', () => {
    const el = document.createElement('div');
    const quiet = mkCtx(false);
    const v = pushPullToy.explore(el, quiet);
    el.querySelector<HTMLElement>('[data-mode="pull"]')!.click();
    expect(quiet.spoken).toEqual([`Pull. ${FORCE_HINT.split('. ')[1]}`]);
    setStrength(el, 4);
    $(el, 'go').click();
    expect(quiet.spoken.length).toBe(1);
    $(el, 'speak').click();
    expect(quiet.spoken.at(-1)).toBe(resultLine('pull', 4));
    v.destroy();
    const loud = mkCtx(true);
    const el2 = document.createElement('div');
    const v2 = pushPullToy.explore(el2, loud);
    setStrength(el2, 5);
    $(el2, 'go').click();
    expect(loud.spoken).toEqual([resultLine('push', 5)]);
    v2.destroy();
  });
  it('respects reduced motion: no transition, car jumps', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: /reduce/.test(query), media: query }));
    const el = document.createElement('div');
    const v = pushPullToy.explore(el, mkCtx());
    setStrength(el, 3);
    $(el, 'go').click();
    expect($(el, 'car').style.transition).toBe('none');
    v.destroy();
  });
  it('animates otherwise, and leaves no timers', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }));
    const el = document.createElement('div');
    const v = pushPullToy.explore(el, mkCtx(true));
    $(el, 'go').click();
    expect($(el, 'car').style.transition).toMatch(/ease/);
    expect(vi.getTimerCount()).toBe(0);
    v.destroy();
    vi.useRealTimers();
  });
});

describe('resultLine', () => {
  it('is gentle, says away for push and towards for pull, and varies with strength', () => {
    const lines = [1, 2, 3, 4, 5].map(s => resultLine('push', s));
    expect(new Set(lines).size).toBe(5);
    for (const l of lines) expect(l).toMatch(/away from you/);
    for (const s of [1, 2, 3, 4, 5]) expect(resultLine('pull', s)).toMatch(/towards you/);
    expect(resultLine('push', 1)).toBe('A tiny push: the car rolls just a little bit, away from you.');
  });
});

describe('challenge', () => {
  it('scene card plus Push and Pull cards; selection is the answer; no automatic speech', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const v = pushPullToy.renderChallenge(el, q('open-drawer'), ctx);
    expect($(el, 'scene').textContent).toContain(scene('open-drawer').text);
    expect($(el, 'scene').textContent).toContain(scene('open-drawer').emoji);
    expect([...el.querySelectorAll<HTMLElement>('[data-role="choice"]')].map(b => b.dataset.id)).toEqual(['push', 'pull']);
    expect(choice(el, 'push').textContent).toBe('👐Push');
    expect(choice(el, 'pull').textContent).toBe('🪢Pull');
    expect(v.getAnswer()).toBeNull();
    choice(el, 'pull').click();
    expect(v.getAnswer()).toBe('pull');
    v.reset();
    expect(v.getAnswer()).toBeNull();
    expect(ctx.spoken).toEqual([]);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
});

describe('demonstrate', () => {
  it('highlights the right card and shows the rule; speaks only with autoRead', async () => {
    const el = document.createElement('div');
    document.body.append(el);
    const quiet = mkCtx(false);
    const v1 = await pushPullToy.demonstrate!(el, q('open-drawer'), quiet);
    expect(choice(el, 'pull').dataset.highlight).toBe('correct');
    expect(choice(el, 'push').dataset.highlight).toBeUndefined();
    expect(quiet.spoken).toEqual([]);
    v1.destroy();
    const loud = mkCtx(true);
    const v2 = await pushPullToy.demonstrate!(el, q('open-drawer'), loud);
    expect(loud.spoken).toEqual(['That is a pull!']);
    v2.destroy();
    el.remove();
  });
  it('does not speak when an ancestor was detached, and leaves no timers', async () => {
    vi.useFakeTimers();
    const wrapper = document.createElement('div');
    const el = document.createElement('div');
    wrapper.append(el);
    const ctx = mkCtx(true);
    const view = await pushPullToy.demonstrate!(el, q(), ctx); // never attached
    expect(ctx.spoken).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    view.destroy();
    vi.useRealTimers();
  });
});
