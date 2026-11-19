import { describe, it, expect, vi } from 'vitest';
import { sentenceFixerToy, requiredCapitals, questionFromSentence, type SentenceQuestion } from '../../../src/toys/english/sentenceFixer';
import { SENTENCES } from '../../../src/content/english/sentences';
import { toysFor } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';

const q = (s = 'The cat sat on the mat.'): SentenceQuestion => questionFromSentence(s, 'q1');
const mkCtx = (autoRead = false): ToyContext & { spoken: string[] } => {
  const c = {
    stage: 1 as const, autoRead, spoken: [] as string[],
    speech: { speak: async (t: string) => { c.spoken.push(t); }, stop() {}, available: true },
    sfx: { tick() {}, success() {}, tryAgain() {} },
    celebrate() {},
  };
  return c;
};
const wordBtns = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-role="word"]')];
const capBtns = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-role="cap-toggle"]')];
const stopBtn = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-role="stop"]')!;
const stopOn = (el: HTMLElement) => stopBtn(el).dataset.on === 'true';

describe('content and meta', () => {
  it('has >= 20 unique sentences of 4-7 words, capital start, full stop end, British, some with mid-sentence I', () => {
    expect(SENTENCES.length).toBeGreaterThanOrEqual(20);
    expect(new Set(SENTENCES).size).toBe(SENTENCES.length);
    for (const s of SENTENCES) {
      const words = s.split(' ');
      expect(words.length).toBeGreaterThanOrEqual(4);
      expect(words.length).toBeLessThanOrEqual(7);
      expect(s).toMatch(/^[A-Z][a-zA-Z ]*\.$/);
      expect(s).not.toMatch(/\b(Mum|Dad)\b/);
      // only the first word and "I" are capitalised
      words.slice(1).forEach(w => { if (/^[A-Z]/.test(w)) expect(w).toBe('I'); });
    }
    expect(SENTENCES.filter(s => s.split(' ').slice(1).includes('I')).length).toBeGreaterThanOrEqual(5);
  });
  it('is registered for grade 1 english only', () => {
    const m = sentenceFixerToy.meta;
    expect([m.id, m.subject, m.stages, m.title, m.icon]).toEqual(['sentenceFixer', 'english', [1], 'Sentence Fixer', '✏️']);
    expect(toysFor('english', 1).map(t => t.meta.id)).toContain('sentenceFixer');
    expect(toysFor('english', 3).map(t => t.meta.id)).not.toContain('sentenceFixer');
  });
});

describe('requiredCapitals', () => {
  it('first word plus every standalone i', () => {
    expect(requiredCapitals(['the', 'cat', 'sat'])).toEqual([0]);
    expect(requiredCapitals(['the', 'dog', 'and', 'i', 'run'])).toEqual([0, 3]);
    expect(requiredCapitals(['i', 'can', 'hop'])).toEqual([0]);
    expect(requiredCapitals(['pi', 'is', 'in'])).toEqual([0]);
  });
});

describe('generateQuestions', () => {
  it('200 questions: lower-case words, correct answerWords, spoken sentence, no consecutive repeat', () => {
    const qs = sentenceFixerToy.generateQuestions(1, 200, mulberry32(5));
    expect(qs.length).toBe(200);
    qs.forEach((x, i) => {
      expect(x.prompt).toBe('Fix the sentence');
      expect(x.spoken).toContain(x.words.join(' '));
      expect(x.words.join(' ')).toBe(x.words.join(' ').toLowerCase());
      expect(x.words.join(' ')).not.toContain('.');
      expect(`${x.answerWords.join(' ')}.`).toSatisfy((s: string) => SENTENCES.includes(s));
      expect(x.answerWords.map(w => w.toLowerCase())).toEqual(x.words);
      if (i > 0) expect(x.words.join(' ')).not.toBe(qs[i - 1].words.join(' '));
    });
    expect(new Set(qs.map(x => x.id)).size).toBe(200);
    expect(new Set(qs.map(x => x.words.join(' '))).size).toBe(SENTENCES.length);
  });
  it('returns the requested count for small and zero counts', () => {
    expect(sentenceFixerToy.generateQuestions(1, 1, mulberry32(1)).length).toBe(1);
    expect(sentenceFixerToy.generateQuestions(1, 0, mulberry32(1)).length).toBe(0);
    expect(sentenceFixerToy.generateQuestions(1, 30, mulberry32(1)).length).toBe(30);
  });
});

describe('check / describe / explain', () => {
  const I = () => q('The dog and I run.');
  it('correct: exactly the required capitals plus the stop', () => {
    expect(sentenceFixerToy.check(q(), { capitalised: [0], stop: true })).toEqual({ correct: true });
    expect(sentenceFixerToy.check(I(), { capitalised: [3, 0], stop: true })).toEqual({ correct: true });
  });
  it('missing capital at the start', () => {
    expect(sentenceFixerToy.check(q(), { capitalised: [], stop: true })).toEqual({ correct: false, hint: 'A sentence starts with a capital letter.' });
    expect(sentenceFixerToy.check(q(), { capitalised: [], stop: false }).hint).toBe('A sentence starts with a capital letter.');
  });
  it('missing full stop', () => {
    expect(sentenceFixerToy.check(q(), { capitalised: [0], stop: false })).toEqual({ correct: false, hint: 'A sentence ends with a full stop.' });
  });
  it('extra capital, or I left lower case', () => {
    const only = 'Only the first word (and "I") needs a capital letter.';
    expect(sentenceFixerToy.check(q(), { capitalised: [0, 2], stop: true })).toEqual({ correct: false, hint: only });
    expect(sentenceFixerToy.check(I(), { capitalised: [0], stop: true })).toEqual({ correct: false, hint: 'The word "I" always needs a capital letter.' });
    expect(sentenceFixerToy.check(I(), { capitalised: [0], stop: false }).hint).toBe('The word "I" always needs a capital letter.');
    expect(sentenceFixerToy.check(I(), { capitalised: [0, 1], stop: true }).hint).toBe(only);
    expect(sentenceFixerToy.check(I(), { capitalised: [0, 1, 3], stop: true }).hint).toBe(only);
    expect(sentenceFixerToy.check(q(), { capitalised: [0, 2], stop: false }).hint).toBe(only);
  });
  it('describeAnswer shows what the child wrote', () => {
    expect(sentenceFixerToy.describeAnswer(q(), { capitalised: [0], stop: true })).toBe('You wrote "The cat sat on the mat."');
    expect(sentenceFixerToy.describeAnswer(q(), { capitalised: [], stop: false })).toBe('You wrote "the cat sat on the mat"');
    expect(sentenceFixerToy.describeAnswer(I(), { capitalised: [0, 3], stop: false })).toBe('You wrote "The dog and I run"');
  });
  it('explain', () => {
    const e = sentenceFixerToy.explain(q(), { capitalised: [], stop: true });
    expect(e.how).toBe('"The cat sat on the mat." starts with a capital letter and ends with a full stop.');
    expect(e.why).toBe('You wrote "the cat sat on the mat."');
    expect(sentenceFixerToy.explain(I(), { capitalised: [0, 3], stop: true }).how).toBe('"The dog and I run." starts with a capital letter and ends with a full stop.');
  });
});

describe('explore', () => {
  it('shows a correct sentence, tap speaks the word without autoRead, toggle makes it wrong and fixes it', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = sentenceFixerToy.explore(el, ctx);
    const first = wordBtns(el)[0].textContent!;
    expect(first[0]).toBe(first[0].toUpperCase());
    expect(stopOn(el)).toBe(true);
    wordBtns(el)[1].click();
    expect(ctx.spoken.length).toBe(1);
    const toggle = el.querySelector<HTMLElement>('[data-role="toggle"]')!;
    expect(toggle.textContent).toContain('Make it wrong');
    toggle.click();
    expect(wordBtns(el)[0].textContent).toBe(first.toLowerCase());
    expect(stopOn(el)).toBe(false);
    expect(toggle.textContent).toContain('Fix it');
    toggle.click();
    expect(wordBtns(el)[0].textContent).toBe(first);
    expect(stopOn(el)).toBe(true);
    expect(ctx.spoken.length).toBe(1);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('has no automatic speech', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const v = sentenceFixerToy.explore(el, ctx);
    expect(ctx.spoken).toEqual([]);
    v.destroy();
  });
});

describe('challenge', () => {
  it('starts lower case with no stop; tapping words and the gap builds the answer; reset clears; no automatic speech', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const v = sentenceFixerToy.renderChallenge(el, q('The dog and I run.'), ctx);
    expect(wordBtns(el).map(b => b.textContent)).toEqual(['the', 'dog', 'and', 'i', 'run']);
    expect(v.getAnswer()).toEqual({ capitalised: [], stop: false });
    expect(ctx.spoken).toEqual([]);
    capBtns(el)[0].click();
    expect(wordBtns(el)[0].textContent).toBe('The');
    capBtns(el)[3].click();
    expect(wordBtns(el)[3].textContent).toBe('I');
    stopBtn(el).click();
    expect(v.getAnswer()).toEqual({ capitalised: [0, 3], stop: true });
    expect(stopBtn(el).textContent).toBe('.');
    capBtns(el)[0].click();
    expect(v.getAnswer()).toEqual({ capitalised: [3], stop: true });
    stopBtn(el).click();
    expect(v.getAnswer().stop).toBe(false);
    v.reset();
    expect(v.getAnswer()).toEqual({ capitalised: [], stop: false });
    expect(wordBtns(el)[3].textContent).toBe('i');
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('tapping a word only speaks it; tapping its Aa toggles the capital; aria-label follows the shown word', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = sentenceFixerToy.renderChallenge(el, q('The dog and I run.'), ctx);
    expect(capBtns(el).length).toBe(5);
    wordBtns(el)[0].click();
    wordBtns(el)[3].click();
    expect(v.getAnswer()).toEqual({ capitalised: [], stop: false });
    expect(wordBtns(el)[0].textContent).toBe('the');
    expect(wordBtns(el)[0].getAttribute('aria-label')).toBe('Word the');
    capBtns(el)[0].click();
    expect(v.getAnswer().capitalised).toEqual([0]);
    expect(wordBtns(el)[0].getAttribute('aria-label')).toBe('Word The');
    expect(capBtns(el)[0].getAttribute('aria-pressed')).toBe('true');
    capBtns(el)[0].click();
    expect(v.getAnswer().capitalised).toEqual([]);
    expect(ctx.spoken).toEqual(['The', 'I']);
    v.destroy();
  });
  it('shows the instruction text', () => {
    const el = document.createElement('div');
    const v = sentenceFixerToy.renderChallenge(el, q(), mkCtx());
    expect(el.textContent).toContain('Tap a word to hear it. Tap Aa for a capital letter. Tap the gap for a full stop.');
    v.destroy();
  });
  it('explore has no Aa toggles', () => {
    const el = document.createElement('div');
    const v = sentenceFixerToy.explore(el, mkCtx());
    expect(capBtns(el).length).toBe(0);
    v.destroy();
  });
  it('tapping a word speaks its correct form (the shell 🔊 reads the whole spoken prompt)', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = sentenceFixerToy.renderChallenge(el, q('The dog and I run.'), ctx);
    wordBtns(el)[3].click();
    expect(ctx.spoken).toEqual(['I']);
    v.destroy();
  });
  it('targets are at least 48px (BTN classes)', () => {
    const el = document.createElement('div');
    const v = sentenceFixerToy.renderChallenge(el, q(), mkCtx());
    for (const b of [...wordBtns(el), ...capBtns(el), stopBtn(el)]) {
      expect(b.className).toMatch(/min-h-1[2-6]/);
      expect(b.className).toMatch(/min-w-1[2-6]/);
    }
    v.destroy();
  });
});

describe('demonstrate', () => {
  it('animates fixing: capital then full stop, speaking the sentence only with autoRead', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(true);
    const p = sentenceFixerToy.demonstrate!(el, q('The dog and I run.'), ctx);
    expect(wordBtns(el).map(b => b.textContent)).toEqual(['the', 'dog', 'and', 'i', 'run']);
    await vi.advanceTimersByTimeAsync(10000);
    const v = await p;
    expect(wordBtns(el).map(b => b.textContent)).toEqual(['The', 'dog', 'and', 'I', 'run']);
    expect(stopOn(el)).toBe(true);
    expect(ctx.spoken).toEqual(['Now it is a proper sentence.']);
    v.destroy();
    el.remove();
    vi.useRealTimers();
  });
  it('is silent without autoRead', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(false);
    const p = sentenceFixerToy.demonstrate!(el, q(), ctx);
    await vi.advanceTimersByTimeAsync(10000);
    const v = await p;
    expect(stopOn(el)).toBe(true);
    expect(ctx.spoken).toEqual([]);
    v.destroy();
    el.remove();
    vi.useRealTimers();
  });
  it.each(['wrapper.remove', 'body.replaceChildren'])('stops cleanly, no speech, no timers left, when an ancestor is detached (%s)', async how => {
    vi.useFakeTimers();
    const wrapper = document.createElement('div');
    const el = document.createElement('div');
    wrapper.append(el);
    document.body.append(wrapper);
    const ctx = mkCtx(true);
    const p = sentenceFixerToy.demonstrate!(el, q(), ctx);
    await vi.advanceTimersByTimeAsync(100);
    if (how === 'wrapper.remove') wrapper.remove(); else document.body.replaceChildren();
    await vi.advanceTimersByTimeAsync(10000);
    const view = await p;
    expect(ctx.spoken).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    view.destroy();
    vi.useRealTimers();
  });
});
