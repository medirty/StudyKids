import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { startApp } from '../../src/app';
import { fakeToy } from '../fixtures/fakeToy';
import type { Speech, Sfx, View } from '../../src/core/types';

let root: HTMLElement;
let app: { destroy(): void } | null;
let speech: Speech & { calls: string[]; stop: ReturnType<typeof vi.fn> };
let sfx: Sfx;
let celebrate: ReturnType<typeof vi.fn<() => void>>;

function boot() {
  app = startApp(root, { speech, sfx, celebrate, rng: () => 0.5, toys: [fakeToy] });
}
function goto(hash: string) {
  location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel);
const qa = (sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));
function answer(n: number) {
  const input = q<HTMLInputElement>('[data-role="answer"]')!;
  input.value = String(n);
  q<HTMLButtonElement>('[data-role="check"]')!.click();
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  location.hash = '';
  root = document.createElement('div');
  document.body.appendChild(root);
  const calls: string[] = [];
  speech = {
    available: true,
    calls,
    speak: vi.fn((t: string) => { calls.push(t); return Promise.resolve(); }),
    stop: vi.fn(),
  } as unknown as typeof speech;
  sfx = { tick: vi.fn(), success: vi.fn(), tryAgain: vi.fn() };
  celebrate = vi.fn<() => void>();
});
afterEach(() => {
  app?.destroy();
  app = null;
  root.remove();
  vi.useRealTimers();
});

describe('app shell', () => {
  it('first launch shows two profiles', () => {
    boot();
    const cards = qa('[data-role="profile-card"]');
    expect(cards.map(c => c.textContent)).toEqual([expect.stringContaining('Adik'), expect.stringContaining('Kakak')]);
    cards[0].click();
    expect(location.hash).toBe('#/p/adik/1');
    expect(localStorage.getItem('studykids.lastProfile')).toBe('adik');
    expect(qa('[data-role="subject"], [data-role="subject-locked"]').length).toBe(8);
  });

  it('relaunch with stored profile opens its subject map', () => {
    localStorage.setItem('studykids.lastProfile', 'kakak');
    boot();
    expect(location.hash).toBe('#/p/kakak/3');
    expect(qa('[data-role="subject"], [data-role="subject-locked"]').length).toBe(8);
    expect(q('[data-role="switch"]')).not.toBeNull();
  });

  it('subject map shows 8 cards and locked ones are not links', () => {
    goto('#/p/adik/1');
    boot();
    expect(qa('[data-role="subject"], [data-role="subject-locked"]').length).toBe(8);
    const open = qa('[data-role="subject"]');
    expect(open.length).toBe(1);
    expect(open[0].tagName).toBe('A');
    const locked = qa('[data-role="subject-locked"]');
    expect(locked.length).toBe(7);
    for (const l of locked) {
      expect(l.tagName).not.toBe('A');
      expect(l.textContent).toContain('🔒 Soon');
    }
  });

  it('toy route with unknown id redirects to toy list', () => {
    goto('#/p/adik/1/math/nope/challenge');
    boot();
    expect(location.hash).toBe('#/p/adik/1/math');
    expect(qa('[data-role="toy-card"]').length).toBe(1);
  });
});

describe('challenge flow', () => {
  function startKakak() {
    goto('#/p/kakak/3/math/fake/challenge');
    boot();
  }

  it('round flow: wrong then right, rest right → results', () => {
    startKakak();
    expect(q('[data-role="progress"]')!.textContent).toBe('Question 1 of 10');
    expect(q('[data-role="prompt"]')!.dataset.target).toBe('1');
    answer(99);
    expect(q('[data-role="hint"]')!.textContent).toContain('Almost! Count again');
    expect(sfx.tryAgain).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(400);
    answer(1);
    expect(sfx.success).toHaveBeenCalled();
    expect(celebrate).toHaveBeenCalled();
    vi.advanceTimersByTime(1200);
    for (let i = 2; i <= 10; i++) {
      expect(q('[data-role="progress"]')!.textContent).toBe(`Question ${i} of 10`);
      answer(i);
      vi.advanceTimersByTime(1200);
    }
    const res = q('[data-role="results"]')!;
    expect(res.textContent).toContain('9 correct');
    expect(res.textContent).toContain('1 to practise');
    expect(res.textContent).not.toMatch(/wrong/i);
    const cards = qa('[data-role="mistake"]');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Why: W');
    expect(cards[0].textContent).toContain('How: H');
    expect(cards[0].textContent).toContain('You answered: 99');
    expect(celebrate).toHaveBeenCalledTimes(11); // 10 correct answers + results (≥ 1 correct)
  });

  it('double click on Check records one attempt', () => {
    startKakak();
    const input = q<HTMLInputElement>('[data-role="answer"]')!;
    input.value = '99';
    const btn = q<HTMLButtonElement>('[data-role="check"]')!;
    btn.click();
    btn.click();
    expect(qa('[data-role="hint"]').length).toBe(1);
    expect(sfx.tryAgain).toHaveBeenCalledTimes(1);
    expect(q('[data-role="progress"]')!.textContent).toBe('Question 1 of 10');
    expect(btn.disabled).toBe(true);
    // second wrong answer must not be possible within 400ms
    vi.advanceTimersByTime(399);
    expect(btn.disabled).toBe(true);
    vi.advanceTimersByTime(1);
    expect(btn.disabled).toBe(false);
  });

  it('second wrong answer reveals the explanation and offers Next', () => {
    startKakak();
    answer(99);
    vi.advanceTimersByTime(400);
    answer(98);
    expect(root.textContent).toContain("Let's look together");
    expect(root.textContent).toContain('H');
    q<HTMLButtonElement>('[data-role="next"]')!.click();
    expect(q('[data-role="progress"]')!.textContent).toBe('Question 2 of 10');
  });

  it('retry mistakes builds a 1-question round', () => {
    startKakak();
    answer(99);
    vi.advanceTimersByTime(400);
    answer(1);
    vi.advanceTimersByTime(1200);
    for (let i = 2; i <= 10; i++) { answer(i); vi.advanceTimersByTime(1200); }
    q<HTMLButtonElement>('[data-role="retry-mistakes"]')!.click();
    expect(q('[data-role="progress"]')!.textContent).toBe('Question 1 of 1');
    expect(q('[data-role="prompt"]')!.dataset.target).toBe('1');
    answer(1);
    vi.advanceTimersByTime(1200);
    expect(q('[data-role="results"]')!.textContent).toContain('0 to practise');
    expect(q('[data-role="retry-mistakes"]')).toBeNull();
    q<HTMLButtonElement>('[data-role="new-round"]')!.click();
    expect(q('[data-role="progress"]')!.textContent).toBe('Question 1 of 10');
  });

  it('leaving mid-speech stops speech', () => {
    goto('#/p/adik/1/math/fake/challenge');
    boot();
    expect(speech.calls).toContain('Type 1');
    const before = speech.stop.mock.calls.length;
    goto('#/p/adik/1');
    expect(speech.stop.mock.calls.length).toBeGreaterThan(before);
    expect(() => vi.runAllTimers()).not.toThrow();
  });

  it('kakak does not auto-read prompts', () => {
    startKakak();
    expect(speech.speak).not.toHaveBeenCalled();
    expect(q('[data-role="prompt"]')!.textContent).toContain('Type 1');
  });

  it('mode pill switches between explore and challenge', () => {
    goto('#/p/adik/1/math/fake/explore');
    boot();
    expect(q('[data-role="explore-body"]')).not.toBeNull();
    qa('[data-role="mode"]').find(b => b.dataset.mode === 'challenge')!.click();
    expect(location.hash).toBe('#/p/adik/1/math/fake/challenge');
    expect(q('[data-role="progress"]')).not.toBeNull();
  });

  it('kakak (autoRead off): no automatic speech for feedback at all', () => {
    startKakak();
    answer(99); // retry
    vi.advanceTimersByTime(400);
    answer(98); // reveal
    q<HTMLButtonElement>('[data-role="next"]')!.click();
    answer(2); // correct
    vi.advanceTimersByTime(1200);
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it('adik (autoRead on): feedback is spoken', () => {
    goto('#/p/adik/1/math/fake/challenge');
    boot();
    answer(99);
    expect(speech.calls).toContain('Count again');
    vi.advanceTimersByTime(400);
    answer(98);
    expect(speech.calls.some(c => c.startsWith("Let's look together"))).toBe(true);
    q<HTMLButtonElement>('[data-role="next"]')!.click();
    answer(2);
    expect(speech.calls).toContain('Great job!');
  });

  it('double click on Next advances exactly one question', () => {
    startKakak();
    answer(99);
    vi.advanceTimersByTime(400);
    answer(98);
    const next = q<HTMLButtonElement>('[data-role="next"]')!;
    next.click();
    next.click();
    expect(q('[data-role="progress"]')!.textContent).toBe('Question 2 of 10');
  });

  it('late demonstrate view is destroyed when the question has moved on', async () => {
    vi.useRealTimers();
    let resolveDemo!: (v: View) => void;
    const destroy = vi.fn();
    const demoToy = { ...fakeToy, demonstrate: () => new Promise<View>(r => { resolveDemo = r; }) };
    app = startApp(root, { speech, sfx, celebrate, rng: () => 0.5, toys: [demoToy] });
    goto('#/p/kakak/3/math/fake/challenge');
    answer(99);
    await new Promise(r => setTimeout(r, 450));
    answer(98);
    await Promise.resolve(); // demonstrate starts after the (here: absent) explanation speech settles
    await Promise.resolve();
    expect(resolveDemo).toBeTypeOf('function');
    q<HTMLButtonElement>('[data-role="next"]')!.click();
    expect(q('[data-role="progress"]')!.textContent).toBe('Question 2 of 10');
    resolveDemo({ destroy });
    await Promise.resolve();
    await Promise.resolve();
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
