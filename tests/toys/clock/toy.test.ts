import { describe, it, expect, vi } from 'vitest';
import { clockToy, type ClockQuestion } from '../../../src/toys/math/clock';
import { toysFor } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';

const q = (target: number): ClockQuestion => ({ id: 'q1', prompt: 'x', target });
const mkCtx = (stage: 1 | 3, autoRead = false): ToyContext & { spoken: string[]; ticks: boolean[] } => {
  const spoken: string[] = [];
  const ticks: boolean[] = [];
  return {
    stage, autoRead, spoken, ticks,
    speech: { speak: async (t: string) => { spoken.push(t); }, stop() {}, available: true },
    sfx: { tick: (m?: boolean) => { ticks.push(!!m); }, success() {}, tryAgain() {} },
    celebrate() {},
  };
};

describe('clockToy meta and registry', () => {
  it('has the brief meta', () => {
    expect(clockToy.meta).toEqual({
      id: 'clock', subject: 'math', stages: [1, 3], title: 'Tick-Tock Time', icon: '🕒',
      objective: "Read and show time on an analogue clock (Stage 1: o'clock and half past; Stage 3: to 5 minutes, past and to).",
    });
  });
  it('is registered for stages 1 and 3', () => {
    expect(toysFor('math', 1).map(t => t.meta.id)).toContain('clock');
    expect(toysFor('math', 3).map(t => t.meta.id)).toContain('clock');
  });
});

describe('generateQuestions', () => {
  it('stage 1 uses only :00 and :30, no consecutive duplicates', () => {
    const qs = clockToy.generateQuestions(1, 50, mulberry32(1));
    expect(qs.length).toBe(50);
    for (const x of qs) expect([0, 30]).toContain(x.target % 60);
    for (let i = 1; i < qs.length; i++) expect(qs[i].target).not.toBe(qs[i - 1].target);
    expect(new Set(qs.map(x => x.id)).size).toBe(50);
  });
  it('stage 3 uses multiples of 5, no consecutive duplicates, prompt matches phrase', () => {
    const qs = clockToy.generateQuestions(3, 50, mulberry32(1));
    for (const x of qs) expect(x.target % 5).toBe(0);
    for (let i = 1; i < qs.length; i++) expect(qs[i].target).not.toBe(qs[i - 1].target);
    expect(qs.some(x => x.target % 60 === 45)).toBe(true);
    expect(clockToy.generateQuestions(3, 1, () => 0)[0].prompt).toBe('Show me 12 o\'clock');
  });
});

describe('check / describe / explain', () => {
  it('accepts within one minute', () => {
    expect(clockToy.check(q(225), 226).correct).toBe(true);
  });
  it('minute on the wrong side gives a left/right hint', () => {
    const r = clockToy.check(q(225), 195);
    expect(r.correct).toBe(false);
    expect(r.hint).toContain('left');
    expect(r.hint).not.toMatch(/<|>/);
    expect(clockToy.check(q(195), 225).hint).toContain('right');
  });
  it('right minute, wrong hour gives hour hand hint', () => {
    expect(clockToy.check(q(225), 165).hint).toContain('almost at 4');
    expect(clockToy.check(q(195), 135).hint).toContain('toward 3');
  });
  it('describeAnswer', () => {
    expect(clockToy.describeAnswer(q(225), 195)).toBe('3:15 (15 past 3)');
  });
  it('explain variants', () => {
    expect(clockToy.explain(q(225), 195).why).toContain('BEFORE');
    expect(clockToy.explain(q(195), 225).why).toContain('AFTER');
    expect(clockToy.explain(q(180), 195).why).toBe('At o\'clock the long hand points straight up to 12.');
    const hourOnly = clockToy.explain(q(225), 165).why;
    expect(hourOnly).toContain('The long hand was right, but the short hand shows the hour.');
    expect(hourOnly).toContain('For "to" times the short hand is almost at 4.');
    expect(clockToy.explain(q(195), 135).why).not.toContain('almost at');
    expect(clockToy.explain(q(225), 195).how).toBe('Put the long blue hand on 9 and the short red hand near 3.');
    expect(clockToy.explain(q(180), 195).how).toBe('Put the long blue hand on 12 and the short red hand on 3.');
  });
});

describe('challenge view', () => {
  it('starts at 12:00, snaps, resets', () => {
    const el = document.createElement('div');
    const v = clockToy.renderChallenge(el, q(225), mkCtx(3));
    expect(v.getAnswer()).toBe(0);
    expect(el.querySelector('[data-role="clock-face"]')).not.toBeNull();
    v.destroy();
  });
});

describe('explore view', () => {
  const find = (el: HTMLElement, role: string) => el.querySelector(`[data-role="${role}"]`) as HTMLElement | null;
  it('stage 1 hides zone/snap/phrase toggles and 15 quick jumps', () => {
    const el = document.createElement('div');
    const v = clockToy.explore(el, mkCtx(1));
    expect(find(el, 'zone-toggle')).toBeNull();
    expect(find(el, 'snap-toggle')).toBeNull();
    expect(find(el, 'phrase-toggle')).toBeNull();
    expect(el.querySelectorAll('[data-role="jump"]').length).toBe(2);
    v.destroy();
  });
  it('stage 3 shows them all and jump updates phrase', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(3);
    const v = clockToy.explore(el, ctx);
    expect(find(el, 'zone-toggle')).not.toBeNull();
    expect(find(el, 'snap-toggle')).not.toBeNull();
    expect(find(el, 'phrase-toggle')).not.toBeNull();
    const jumps = [...el.querySelectorAll<HTMLElement>('[data-role="jump"]')];
    expect(jumps.length).toBe(4);
    jumps[3].click();
    expect(find(el, 'phrase')!.textContent).toMatch(/^15 to \d+$/);
    expect(ctx.ticks.length).toBeGreaterThan(0);
    find(el, 'phrase-toggle')!.click();
    expect(find(el, 'phrase')!.textContent).toMatch(/^quarter to \d+$/);
    find(el, 'speak')!.click();
    expect(ctx.spoken[0]).toMatch(/^It's quarter to \d+!$/);
    v.destroy();
  });
  it('digital time hide/show', () => {
    const el = document.createElement('div');
    const v = clockToy.explore(el, mkCtx(3));
    const d = find(el, 'digital')!;
    find(el, 'digital-toggle')!.click();
    expect(d.classList.contains('blur-md')).toBe(true);
    find(el, 'digital-toggle')!.click();
    expect(d.classList.contains('blur-md')).toBe(false);
    v.destroy();
  });
  it('autoRead speaks after a drag ends, not on buttons', () => {
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(1, true);
    const v = clockToy.explore(el, ctx);
    find(el, 'jump')!.click();
    expect(ctx.spoken).toEqual([]);
    const face = el.querySelector('[data-role="clock-face"]')!;
    face.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400, x: 0, y: 0, toJSON() {} });
    face.dispatchEvent(new MouseEvent('pointerdown', { clientX: 400, clientY: 200, bubbles: true }));
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 200, clientY: 400 }));
    expect(ctx.spoken).toEqual([]);
    window.dispatchEvent(new MouseEvent('pointerup'));
    expect(ctx.spoken.length).toBe(1);
    expect(ctx.spoken[0]).toMatch(/^It's /);
    window.dispatchEvent(new MouseEvent('pointerup'));
    expect(ctx.spoken.length).toBe(1);
    v.destroy();
    el.remove();
  });
  it('autoRead off: no speech after drag', () => {
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(3, false);
    const v = clockToy.explore(el, ctx);
    const face = el.querySelector('[data-role="clock-face"]')!;
    face.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400, x: 0, y: 0, toJSON() {} });
    face.dispatchEvent(new MouseEvent('pointerdown', { clientX: 400, clientY: 200, bubbles: true }));
    window.dispatchEvent(new MouseEvent('pointerup'));
    expect(ctx.spoken).toEqual([]);
    v.destroy();
    el.remove();
  });
});

describe('demonstrate', () => {
  it('animates to target then speaks', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(3, true);
    const p = clockToy.demonstrate!(el, q(225), ctx);
    await vi.advanceTimersByTimeAsync(2000);
    const v = await p;
    expect(el.querySelector('[data-role="clock-face"]')!.getAttribute('data-minutes')).toBe('225');
    expect(ctx.spoken).toEqual(["It's 15 to 4!"]);
    v.destroy();
    el.remove();
    vi.useRealTimers();
  });
  it('autoRead off: animates but stays silent', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(3, false);
    const p = clockToy.demonstrate!(el, q(225), ctx);
    await vi.advanceTimersByTimeAsync(2000);
    const v = await p;
    expect(el.querySelector('[data-role="clock-face"]')!.getAttribute('data-minutes')).toBe('225');
    expect(ctx.spoken).toEqual([]);
    v.destroy();
    el.remove();
    vi.useRealTimers();
  });
  it.each(['wrapper.remove', 'body.replaceChildren'])('does not speak when an ancestor is detached mid-animation (%s)', async how => {
    vi.useFakeTimers();
    const wrapper = document.createElement('div');
    const el = document.createElement('div');
    wrapper.append(el);
    document.body.append(wrapper);
    const ctx = mkCtx(3, true);
    const p = clockToy.demonstrate!(el, q(225), ctx);
    await vi.advanceTimersByTimeAsync(500);
    if (how === 'wrapper.remove') wrapper.remove(); else document.body.replaceChildren();
    await vi.advanceTimersByTimeAsync(5000);
    const v = await p;
    expect(ctx.spoken).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    v.destroy();
    vi.useRealTimers();
  });
});
