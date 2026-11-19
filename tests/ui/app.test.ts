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
  it('first launch shows 6 grade cards; only grades with toys open', () => {
    boot();
    const cards = qa('[data-role="grade-card"]');
    expect(cards.length).toBe(6);
    expect(cards[0].textContent).toContain('Grade 1');
    expect(cards[0].textContent).toContain('Kelas 1');
    for (const c of cards) {
      const open = c.dataset.grade === '1' || c.dataset.grade === '3';
      expect(c.getAttribute('aria-disabled')).toBe(open ? null : 'true');
      expect(c.textContent?.includes('🔒 Soon')).toBe(!open);
    }
    const before = location.hash;
    cards[1].click();
    expect(location.hash).toBe(before);
    expect(qa('[data-role="grade-card"]').length).toBe(6);
    expect(q('[data-role="autoread-toggle"]')).toBeNull();
    expect(q('[data-role="home-grades"]')).toBeNull();
  });

  it('picking Grade 1 opens its subject map and remembers it', () => {
    boot();
    qa('[data-role="grade-card"]')[0].click();
    expect(location.hash).toBe('#/k/1');
    expect(localStorage.getItem('studykids.lastGrade')).toBe('1');
    expect(qa('[data-role="subject"], [data-role="subject-locked"]').length).toBe(8);
    expect(q('[data-role="stage-toggle"]')).toBeNull();
  });

  it('open grade cards have a 🔊 that says "Grade N"', () => {
    boot();
    const sp = qa('[data-role="grade-card"]')[2].parentElement!.querySelector<HTMLButtonElement>('[data-role="speak"]')!;
    sp.click();
    expect(speech.calls).toEqual(['Grade 3']);
    expect(qa('[data-role="grade-card"]')[1].parentElement!.querySelector('[data-role="speak"]')).toBeNull();
  });

  it('relaunch with an open remembered grade opens its subject map', () => {
    localStorage.setItem('studykids.lastGrade', '1');
    boot();
    expect(location.hash).toBe('#/k/1');
    expect(qa('[data-role="subject"], [data-role="subject-locked"]').length).toBe(8);
    expect(q('[data-role="home-grades"]')).not.toBeNull();
  });

  it('a remembered grade without toys falls back to the grade menu', () => {
    localStorage.setItem('studykids.lastGrade', '4');
    boot();
    expect(qa('[data-role="grade-card"]').length).toBe(6);
  });

  it('🏠 Grades returns to the menu', () => {
    localStorage.setItem('studykids.lastGrade', '3');
    goto('#/k/3/math');
    boot();
    q<HTMLButtonElement>('[data-role="home-grades"]')!.click();
    expect(location.hash).toBe('#/');
    expect(qa('[data-role="grade-card"]').length).toBe(6);
  });

  it('old storage keys and #/p/ links are dropped', () => {
    localStorage.setItem('studykids.lastProfile', 'adik');
    localStorage.setItem('studykids.profileCustom', '{}');
    goto('#/p/adik/1/math');
    boot();
    expect(qa('[data-role="grade-card"]').length).toBe(6);
    expect(location.hash).toBe('#/');
    expect(localStorage.getItem('studykids.lastProfile')).toBeNull();
    expect(localStorage.getItem('studykids.profileCustom')).toBeNull();
  });

  it('a closed grade route redirects to the grade menu', () => {
    goto('#/k/5/math');
    boot();
    expect(location.hash).toBe('#/');
    expect(qa('[data-role="grade-card"]').length).toBe(6);
  });

  it('toys open in Explore for Grade 1 and Challenge for Grade 3', () => {
    goto('#/k/1/math');
    boot();
    qa('[data-role="toy-card"]')[0].click();
    expect(location.hash).toBe('#/k/1/math/fake/explore');
    goto('#/k/3/math');
    qa('[data-role="toy-card"]')[0].click();
    expect(location.hash).toBe('#/k/3/math/fake/challenge');
  });

  it('a toy not in the grade redirects to that grade toy list', () => {
    goto('#/k/3/math/count20/explore');
    boot();
    expect(location.hash).toBe('#/k/3/math');
    expect(qa('[data-role="toy-card"]').length).toBe(1);
  });

  it('no names or greeting anywhere', () => {
    boot();
    const check = () => expect(root.textContent).not.toMatch(/Adik|Kakak|Hi,/);
    check();
    qa('[data-role="grade-card"]')[0].click();
    check();
  });

  it('subject map shows 8 cards and locked ones are not links', () => {
    goto('#/k/1');
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
    goto('#/k/1/math/nope/challenge');
    boot();
    expect(location.hash).toBe('#/k/1/math');
    expect(qa('[data-role="toy-card"]').length).toBe(1);
  });
});

describe('read-aloud toggle', () => {
  const toggle = () => q<HTMLButtonElement>('[data-role="autoread-toggle"]')!;

  it('shows state, labels and is at least 48px tall by class', () => {
    goto('#/k/3/math');
    boot();
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
    expect(toggle().getAttribute('aria-label')).toBe('Read aloud: off');
    expect(toggle().className).toContain('min-h-12');
    toggle().click();
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
    expect(toggle().getAttribute('aria-label')).toBe('Read aloud: on');
  });

  it('turning it on mid-round in Grade 3 speaks the next prompt once and persists', () => {
    goto('#/k/3/math/fake/challenge');
    boot();
    expect(speech.speak).not.toHaveBeenCalled();
    toggle().click();
    expect(speech.speak).not.toHaveBeenCalled(); // toggling itself is silent
    answer(1);
    vi.advanceTimersByTime(1200);
    expect(speech.calls.filter(c => c === 'Type 2').length).toBe(1);
    expect(JSON.parse(localStorage.getItem('studykids.autoRead')!)).toEqual({ '3': true });
    app!.destroy(); root.replaceChildren();
    speech.calls.length = 0;
    boot();
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
    expect(speech.calls).toContain('Type 1');
  });

  it('turning it off in Grade 1 stops automatic speech', () => {
    goto('#/k/1/math/fake/challenge');
    boot();
    expect(speech.calls).toContain('Type 1');
    toggle().click();
    expect(speech.stop).toHaveBeenCalled();
    (speech.speak as ReturnType<typeof vi.fn>).mockClear();
    answer(99);
    vi.advanceTimersByTime(400);
    answer(1);
    vi.advanceTimersByTime(1200);
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it('is per grade', () => {
    goto('#/k/1');
    boot();
    toggle().click();
    goto('#/k/3');
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
    goto('#/k/1');
    expect(toggle().getAttribute('aria-pressed')).toBe('false'); // Grade 1 was switched off
  });
});

describe('challenge flow', () => {
  function startG3() {
    goto('#/k/3/math/fake/challenge');
    boot();
  }

  it('feedback and Check live in a sticky bar pinned to the bottom of the viewport', () => {
    startG3();
    const bar = q('[data-role="challenge-bar"]')!;
    expect(bar.classList.contains('sticky')).toBe(true);
    expect(bar.classList.contains('bottom-0')).toBe(true);
    expect(bar.className).toContain('bg-[#FFFDF7]');
    expect(bar.className).toContain('shadow-');
    expect(bar.contains(q('[data-role="check"]'))).toBe(true);
    answer(99);
    expect(bar.contains(q('[data-role="hint"]'))).toBe(true);
    vi.advanceTimersByTime(400);
    answer(98);
    expect(bar.contains(q('[data-role="next"]'))).toBe(true);
  });

  it('round flow: wrong then right, rest right → results', () => {
    startG3();
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
    startG3();
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
    startG3();
    answer(99);
    vi.advanceTimersByTime(400);
    answer(98);
    expect(root.textContent).toContain("Let's look together");
    expect(root.textContent).toContain('H');
    q<HTMLButtonElement>('[data-role="next"]')!.click();
    expect(q('[data-role="progress"]')!.textContent).toBe('Question 2 of 10');
  });

  it('retry mistakes builds a 1-question round', () => {
    startG3();
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
    goto('#/k/1/math/fake/challenge');
    boot();
    expect(speech.calls).toContain('Type 1');
    const before = speech.stop.mock.calls.length;
    goto('#/k/1');
    expect(speech.stop.mock.calls.length).toBeGreaterThan(before);
    expect(() => vi.runAllTimers()).not.toThrow();
  });

  it('Grade 3 does not auto-read prompts', () => {
    startG3();
    expect(speech.speak).not.toHaveBeenCalled();
    expect(q('[data-role="prompt"]')!.textContent).toContain('Type 1');
  });

  it('mode pill switches between explore and challenge', () => {
    goto('#/k/1/math/fake/explore');
    boot();
    expect(q('[data-role="explore-body"]')).not.toBeNull();
    qa('[data-role="mode"]').find(b => b.dataset.mode === 'challenge')!.click();
    expect(location.hash).toBe('#/k/1/math/fake/challenge');
    expect(q('[data-role="progress"]')).not.toBeNull();
  });

  it('Grade 3 (autoRead off): no automatic speech for feedback at all', () => {
    startG3();
    answer(99); // retry
    vi.advanceTimersByTime(400);
    answer(98); // reveal
    q<HTMLButtonElement>('[data-role="next"]')!.click();
    answer(2); // correct
    vi.advanceTimersByTime(1200);
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it('Grade 1 (autoRead on): feedback is spoken', () => {
    goto('#/k/1/math/fake/challenge');
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
    startG3();
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
    goto('#/k/3/math/fake/challenge');
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
