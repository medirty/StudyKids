import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { startApp } from '../../src/app';
import { fakeToy, type FakeQ } from '../fixtures/fakeToy';
import type { Speech, Sfx, Toy, ToyContext, View } from '../../src/core/types';

// Shell behaviour around speech (R13/R14, I-5, R15, M-3) with a fake toy that HAS demonstrate.

let root: HTMLElement;
let app: { destroy(): void } | null;
let calls: string[];
let speech: Speech;
let sfx: Sfx;
let celebrate: ReturnType<typeof vi.fn<() => void>>;
let demoCalls: { autoRead: boolean; spokenBefore: string[] }[];
let demoToy: Toy<FakeQ, number>;
/** When set, speak() for texts starting with this prefix returns a promise we resolve by hand. */
let holdPrefix: string | null;
let release: (() => void) | null;

const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel);
const qa = (sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));
function goto(hash: string) {
  location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
function boot(toys: Toy<any, any>[] = [demoToy]) { // eslint-disable-line @typescript-eslint/no-explicit-any
  app = startApp(root, { speech, sfx, celebrate, rng: () => 0.5, toys });
}
function answer(n: number) {
  const input = q<HTMLInputElement>('[data-role="answer"]')!;
  input.value = String(n);
  q<HTMLButtonElement>('[data-role="check"]')!.click();
}
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
/** Two wrong answers on the current question → reveal. */
function reveal() {
  answer(99);
  vi.advanceTimersByTime(400);
  answer(98);
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  location.hash = '';
  root = document.createElement('div');
  document.body.appendChild(root);
  calls = [];
  holdPrefix = null;
  release = null;
  speech = {
    available: true,
    speak: vi.fn((t: string) => {
      calls.push(t);
      if (holdPrefix && t.startsWith(holdPrefix)) return new Promise<void>(r => { release = r; });
      return Promise.resolve();
    }),
    stop: vi.fn(),
  };
  sfx = { tick: vi.fn(), success: vi.fn(), tryAgain: vi.fn() };
  celebrate = vi.fn<() => void>();
  demoCalls = [];
  demoToy = {
    ...fakeToy,
    demonstrate(el: HTMLElement, _q: FakeQ, ctx: ToyContext): Promise<View> {
      demoCalls.push({ autoRead: ctx.autoRead, spokenBefore: [...calls] });
      const d = document.createElement('div');
      d.dataset.role = 'demo';
      el.append(d);
      if (ctx.autoRead) void ctx.speech.speak('demo speaks').catch(() => {});
      return Promise.resolve({ destroy: () => d.remove() });
    },
  };
});
afterEach(() => {
  app?.destroy();
  app = null;
  root.remove();
  vi.useRealTimers();
});

describe('reveal + demonstrate (R13)', () => {
  it('Grade 3 reveal: demo runs but nothing is spoken at all', async () => {
    goto('#/k/3/math/fake/challenge');
    boot();
    reveal();
    await flush();
    expect(demoCalls.length).toBe(1);
    expect(demoCalls[0].autoRead).toBe(false);
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it('Grade 1 reveal: the explanation is spoken in full before the demo starts', async () => {
    goto('#/k/1/math/fake/challenge');
    boot();
    holdPrefix = "Let's look together";
    reveal();
    await flush();
    expect(calls.some(c => c.startsWith("Let's look together"))).toBe(true);
    expect(demoCalls.length).toBe(0); // still speaking the explanation
    release!();
    await flush();
    expect(demoCalls.length).toBe(1);
    expect(demoCalls[0].autoRead).toBe(true);
    expect(calls.indexOf('demo speaks')).toBeGreaterThan(calls.findIndex(c => c.startsWith("Let's look together")));
  });

  it('Grade 1 reveal: pressing Next before the explanation ends cancels the demo start', async () => {
    goto('#/k/1/math/fake/challenge');
    boot();
    holdPrefix = "Let's look together";
    reveal();
    q<HTMLButtonElement>('[data-role="next"]')!.click();
    expect(q('[data-role="progress"]')!.textContent).toBe('Question 2 of 10');
    release!();
    await flush();
    expect(demoCalls.length).toBe(0);
    expect(q('[data-role="demo"]')).toBeNull();
  });

  it('Grade 1 reveal: leaving before the explanation ends cancels the demo start', async () => {
    goto('#/k/1/math/fake/challenge');
    boot();
    holdPrefix = "Let's look together";
    reveal();
    goto('#/k/1');
    release!();
    await flush();
    expect(demoCalls.length).toBe(0);
  });

  it('Grade 1 reveal: a failing explanation speech still starts the demo', async () => {
    goto('#/k/1/math/fake/challenge');
    speech.speak = vi.fn((t: string) => { calls.push(t); return t.startsWith("Let's look") ? Promise.reject(new Error('x')) : Promise.resolve(); });
    boot();
    reveal();
    await flush();
    expect(demoCalls.length).toBe(1);
  });
});

function finishRoundWithOneMistake() {
  reveal(); // q1 wrong twice
  q<HTMLButtonElement>('[data-role="next"]')!.click();
  for (let i = 2; i <= 10; i++) { answer(i); vi.advanceTimersByTime(1200); }
}

describe('toggle drives speech rules', () => {
  const toggle = () => q<HTMLButtonElement>('[data-role="autoread-toggle"]')!;

  it('Grade 3 with the toggle on: explanation is spoken before the demo, demo speaks', async () => {
    goto('#/k/3/math/fake/challenge');
    boot();
    toggle().click();
    holdPrefix = "Let's look together";
    reveal();
    await flush();
    expect(demoCalls.length).toBe(0);
    release!();
    await flush();
    expect(demoCalls.length).toBe(1);
    expect(demoCalls[0].autoRead).toBe(true);
    expect(calls).toContain('demo speaks');
  });

  it('Grade 1 with the toggle off: reveal is silent and the demo does not speak', async () => {
    goto('#/k/1/math/fake/challenge');
    boot();
    toggle().click();
    calls.length = 0;
    reveal();
    await flush();
    expect(demoCalls.length).toBe(1);
    expect(demoCalls[0].autoRead).toBe(false);
    expect(calls).toEqual([]);
  });
});

describe('results screen', () => {
  it('Show me in Grade 3 (auto-read off) is an explicit tap, so the demo speaks', async () => {
    goto('#/k/3/math/fake/challenge');
    boot();
    finishRoundWithOneMistake();
    await flush();
    demoCalls = [];
    (speech.speak as ReturnType<typeof vi.fn>).mockClear();
    calls.length = 0;
    q<HTMLButtonElement>('[data-role="show-me"]')!.click();
    await flush();
    expect(demoCalls.length).toBe(1);
    expect(demoCalls[0].autoRead).toBe(true);
    expect(calls).toContain('demo speaks');
  });

  it('score heading has a 🔊 that reads the score', () => {
    goto('#/k/3/math/fake/challenge');
    boot();
    finishRoundWithOneMistake();
    expect(speech.speak).not.toHaveBeenCalled(); // Grade 3: no auto-read of the score
    const btn = q<HTMLButtonElement>('[data-role="speak-score"]')!;
    expect(btn).not.toBeNull();
    btn.click();
    expect(calls).toEqual(['9 correct. 1 to practise.']);
  });

  it('Grade 1: the score is read once on arrival', () => {
    goto('#/k/1/math/fake/challenge');
    boot();
    finishRoundWithOneMistake();
    expect(calls.filter(c => c === '9 correct. 1 to practise.').length).toBe(1);
  });

  it('mistake card 🔊 reads prompt, your answer, why and how', () => {
    goto('#/k/3/math/fake/challenge');
    boot();
    finishRoundWithOneMistake();
    q<HTMLButtonElement>('[data-role="mistake"] [data-role="speak"]')!.click();
    expect(calls).toEqual(['Type 1. You answered: 99. W H']);
  });

  it('mistake card 🔊 uses the spoken prompt when there is one', () => {
    const spokenToy: Toy<FakeQ, number> = {
      ...demoToy,
      generateQuestions: (s, n, r) => fakeToy.generateQuestions(s, n, r).map(x => ({ ...x, prompt: `${x.target} × 1 = ?`, spoken: `${x.target} times 1` })),
    };
    goto('#/k/3/math/fake/challenge');
    boot([spokenToy]);
    finishRoundWithOneMistake();
    q<HTMLButtonElement>('[data-role="mistake"] [data-role="speak"]')!.click();
    expect(calls).toEqual(['1 times 1. You answered: 99. W H']);
  });

  it('confetti on results whenever at least one answer was right (R15)', () => {
    goto('#/k/3/math/fake/challenge');
    boot();
    // 1 right, 9 wrong
    answer(1);
    vi.advanceTimersByTime(1200);
    for (let i = 2; i <= 10; i++) { reveal(); q<HTMLButtonElement>('[data-role="next"]')!.click(); }
    expect(q('[data-role="results"]')!.textContent).toContain('1 correct');
    expect(celebrate).toHaveBeenCalledTimes(2); // the one right answer + results
  });

  it('no results confetti when nothing was right', () => {
    goto('#/k/3/math/fake/challenge');
    boot();
    for (let i = 1; i <= 10; i++) { reveal(); q<HTMLButtonElement>('[data-role="next"]')!.click(); }
    expect(q('[data-role="results"]')!.textContent).toContain('0 correct');
    expect(celebrate).not.toHaveBeenCalled();
  });
});

describe('spoken prompts (R14)', () => {
  const symToy = (): Toy<FakeQ, number> => ({
    ...fakeToy,
    generateQuestions: (s, n, r) => fakeToy.generateQuestions(s, n, r).map(x => ({ ...x, prompt: `${x.target} × 3 = ?`, spoken: `${x.target} times 3` })),
  });

  it('Grade 1 auto-read speaks the spoken form, not the symbols', () => {
    goto('#/k/1/math/fake/challenge');
    boot([symToy()]);
    expect(calls).toEqual(['1 times 3']);
    expect(q('[data-role="prompt"]')!.textContent).toContain('1 × 3 = ?');
  });

  it('🔊 speaks the spoken form and highlights the whole prompt while speaking', async () => {
    let done!: () => void;
    let onWord: ((i: number) => void) | undefined;
    speech.speak = vi.fn((t: string, opts?: { onWord?: (i: number) => void }) => {
      calls.push(t);
      onWord = opts?.onWord;
      return new Promise<void>(r => { done = r; });
    });
    goto('#/k/3/math/fake/challenge');
    boot([symToy()]);
    q<HTMLButtonElement>('[data-role="prompt"] [data-role="speak"]')!.click();
    expect(calls).toEqual(['1 times 3']);
    const p = q('[data-role="prompt"] p')!;
    expect(p.classList.contains('bg-amber-200')).toBe(true);
    onWord?.(2); // char index into the spoken text must not light a single display word
    expect(p.querySelectorAll('span.bg-amber-200').length).toBe(0);
    done();
    await flush();
    expect(p.classList.contains('bg-amber-200')).toBe(false);
  });

  it('prompts without spoken keep per-word highlighting', () => {
    let onWord: ((i: number) => void) | undefined;
    speech.speak = vi.fn((t: string, opts?: { onWord?: (i: number) => void }) => {
      calls.push(t);
      onWord = opts?.onWord;
      return new Promise<void>(() => {});
    });
    goto('#/k/3/math/fake/challenge');
    boot();
    q<HTMLButtonElement>('[data-role="prompt"] [data-role="speak"]')!.click();
    expect(calls).toEqual(['Type 1']);
    onWord!(5);
    const lit = qa('[data-role="prompt"] span.bg-amber-200');
    expect(lit.map(s => s.textContent)).toEqual(['1']);
  });
});

describe('routing', () => {
  it('a subject with no toys for the stage redirects (replace) to the subject map', () => {
    goto('#/k/1/english');
    const replace = vi.spyOn(history, 'replaceState');
    boot();
    expect(location.hash).toBe('#/k/1');
    expect(replace).toHaveBeenCalled();
    expect(qa('[data-role="subject"], [data-role="subject-locked"]').length).toBe(8);
    replace.mockRestore();
  });
});

describe('wide layout (I-4)', () => {
  it('only the toy route widens the page on large screens', () => {
    goto('#/k/3/math/fake/challenge');
    boot();
    const main = root.querySelector('main')!;
    expect(main.classList.contains('lg:max-w-6xl')).toBe(true);
    goto('#/k/3');
    expect(main.classList.contains('lg:max-w-6xl')).toBe(false);
  });

  it('challenge puts the toy left and prompt/feedback/Check right on wide landscape', () => {
    goto('#/k/3/math/fake/challenge');
    boot();
    const layout = q('[data-role="challenge-layout"]')!;
    expect(layout.className).toContain('wide:grid');
    const stage = q('[data-role="answer"]')!.parentElement!;
    expect(stage.className).toContain('wide:col-start-1');
    for (const sel of ['[data-role="progress"]', '[data-role="prompt"]']) expect(q(sel)!.className).toContain('wide:col-start-2');
    expect(q('[data-role="check"]')!.parentElement!.className).toContain('wide:col-start-2');
    // DOM order keeps the narrow stacking: progress, prompt, toy, feedback, actions
    expect(Array.from(layout.children).indexOf(stage)).toBe(2);
  });
});
