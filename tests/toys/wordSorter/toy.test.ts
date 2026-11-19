import { describe, it, expect, vi } from 'vitest';
import { wordSorterToy, type WordQuestion } from '../../../src/toys/english/wordSorter';
import { WORDS, WORD_SENTENCES, DEFINITIONS, CLASSES } from '../../../src/content/english/wordClasses';
import { toysFor } from '../../../src/content/registry';
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
const sent = (i = 0) => WORD_SENTENCES[i];
const q = (cls: WordQuestion['cls'] = 'noun', i = 0): WordQuestion => {
  const s = sent(i);
  const targetIndices = s.tokens.flatMap((t, k) => (t.cls === cls ? [k] : []));
  return { id: 'q1', prompt: `Tap the ${cls}`, cls, sentence: s.tokens.map(t => t.text), targetIndices };
};
const tokBtns = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-role="token"]')];
const bare = (w: string) => w.replace(/[^A-Za-z]/g, '').toLowerCase();

describe('content and meta', () => {
  it('has >= 15 unique words per class, none shared between classes', () => {
    const all: string[] = [];
    for (const c of CLASSES) {
      expect(WORDS[c].length).toBeGreaterThanOrEqual(15);
      all.push(...WORDS[c]);
    }
    expect(new Set(all).size).toBe(all.length);
  });
  it('avoids words that are commonly more than one class', () => {
    const banned = ['run', 'jump', 'play', 'paint', 'drink', 'brush', 'rain', 'sleep', 'shout', 'whisper', 'walk', 'dance',
      'laugh', 'giggle', 'catch', 'throw', 'swim', 'climb', 'bake', 'read', 'frozen', 'garden'];
    for (const c of CLASSES) for (const w of WORDS[c]) expect(banned).not.toContain(w);
  });
  it('has >= 12 unique sentences; every token tagged; each has a noun, verb and adjective; tagged words appear in the text', () => {
    expect(WORD_SENTENCES.length).toBeGreaterThanOrEqual(12);
    expect(new Set(WORD_SENTENCES.map(s => s.text)).size).toBe(WORD_SENTENCES.length);
    for (const s of WORD_SENTENCES) {
      expect(s.text).toMatch(/^[A-Z][a-zA-Z ]*\.$/);
      expect(s.tokens.map(t => t.text).join(' ')).toBe(s.text);
      for (const c of CLASSES) expect(s.tokens.some(t => t.cls === c), `${s.text} needs a ${c}`).toBe(true);
      for (const t of s.tokens) {
        expect([null, 'noun', 'verb', 'adjective']).toContain(t.cls);
        expect(s.text).toContain(t.text);
      }
      // function words are never tagged
      for (const t of s.tokens) if (/^(a|an|the|and|to|on|in|of|our|under|through|across)$/i.test(t.text)) expect(t.cls).toBeNull();
    }
  });
  it('is registered for grade 3 english only', () => {
    const m = wordSorterToy.meta;
    expect([m.id, m.subject, m.stages, m.title, m.icon]).toEqual(['wordSorter', 'english', [3], 'Word Sorter', '🧺']);
    expect(toysFor('english', 3).map(t => t.meta.id)).toContain('wordSorter');
    expect(toysFor('english', 1).map(t => t.meta.id)).not.toContain('wordSorter');
  });
});

describe('generateQuestions', () => {
  it('200 questions: prompt, targets match the tags, valid class, no consecutive repeat, all classes used', () => {
    const qs = wordSorterToy.generateQuestions(3, 200, mulberry32(7));
    expect(qs.length).toBe(200);
    qs.forEach((x, i) => {
      expect(x.prompt).toBe(`Tap the ${x.cls}`);
      expect(CLASSES).toContain(x.cls);
      const s = WORD_SENTENCES.find(w => w.tokens.map(t => t.text).join('|') === x.sentence.join('|'))!;
      expect(s).toBeTruthy();
      expect(x.targetIndices).toEqual(s.tokens.flatMap((t, k) => (t.cls === x.cls ? [k] : [])));
      expect(x.targetIndices.length).toBeGreaterThan(0);
      if (i > 0) expect(`${x.sentence.join(' ')}|${x.cls}`).not.toBe(`${qs[i - 1].sentence.join(' ')}|${qs[i - 1].cls}`);
      if (i > 0) expect(x.sentence.join(' ')).not.toBe(qs[i - 1].sentence.join(' '));
    });
    expect(new Set(qs.map(x => x.id)).size).toBe(200);
    expect(new Set(qs.map(x => x.cls)).size).toBe(3);
  });
  it('returns the requested count for small and zero counts', () => {
    expect(wordSorterToy.generateQuestions(3, 1, mulberry32(1)).length).toBe(1);
    expect(wordSorterToy.generateQuestions(3, 0, mulberry32(1)).length).toBe(0);
  });
});

describe('check / describe / explain', () => {
  it('accepts any target when there are several', () => {
    const x = q('noun', 0); // mouse, cheese
    expect(x.targetIndices.length).toBe(2);
    for (const i of x.targetIndices) expect(wordSorterToy.check(x, i)).toEqual({ correct: true });
  });
  it('gives the class definition as the hint for a wrong tap', () => {
    expect(wordSorterToy.check(q('noun'), 0)).toEqual({ correct: false, hint: DEFINITIONS.noun });
    expect(wordSorterToy.check(q('verb'), 0)).toEqual({ correct: false, hint: 'A verb is a doing word.' });
    expect(wordSorterToy.check(q('adjective'), 0)).toEqual({ correct: false, hint: 'An adjective describes a noun.' });
  });
  it('asks for a tap when nothing is selected', () => {
    expect(wordSorterToy.check(q(), null)).toEqual({ correct: false, hint: 'Tap a word first!' });
  });
  it('describeAnswer', () => {
    expect(wordSorterToy.describeAnswer(q(), 1)).toBe('You tapped "tiny"');
    expect(wordSorterToy.describeAnswer(q(), null)).toBe('You did not tap a word yet');
  });
  it('explain names the word, its class and the definition', () => {
    expect(wordSorterToy.explain(q('noun'), 0)).toEqual({
      why: 'You tapped "The".', how: '"mouse" is a noun: A noun is a person, place or thing.',
    });
    expect(wordSorterToy.explain(q('verb'), null).how).toBe('"nibbled" is a verb: A verb is a doing word.');
    expect(wordSorterToy.explain(q('adjective'), 1).how).toBe('"tiny" is an adjective: An adjective describes a noun.');
    expect(wordSorterToy.explain(q('noun'), null).why).toBe('You did not tap a word yet.');
  });
  it('explain uses the tapped word when it is a correct one of several', () => {
    expect(wordSorterToy.explain(q('noun'), 6).how).toBe('"cheese" is a noun: A noun is a person, place or thing.');
  });
});

describe('challenge UI', () => {
  it('shows every token as a >=48px button, single select, tap again to change or clear', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = wordSorterToy.renderChallenge(el, q('noun'), ctx);
    const b = tokBtns(el);
    expect(b.map(x => x.textContent)).toEqual(sent().tokens.map(t => t.text));
    for (const x of b) { expect(x.className).toMatch(/min-h-1[2-6]/); expect(x.className).toMatch(/min-w-1[2-6]/); }
    expect(v.getAnswer()).toBeNull();
    b[2].click();
    expect(v.getAnswer()).toBe(2);
    b[3].click();
    expect(v.getAnswer()).toBe(3);
    expect(b.filter(x => x.getAttribute('aria-pressed') === 'true').length).toBe(1);
    b[3].click();
    expect(v.getAnswer()).toBeNull();
    b[4].click();
    v.reset();
    expect(v.getAnswer()).toBeNull();
    expect(b.every(x => x.getAttribute('aria-pressed') === 'false')).toBe(true);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('tapping a word speaks it (explicit), without punctuation; 🔊 reads the sentence; nothing is spoken on render', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = wordSorterToy.renderChallenge(el, q('noun'), ctx);
    expect(ctx.spoken).toEqual([]);
    tokBtns(el)[6].click();
    expect(ctx.spoken).toEqual(['cheese']);
    el.querySelector<HTMLElement>('[data-role="speak"]')!.click();
    expect(ctx.spoken).toEqual(['cheese', 'The tiny mouse nibbled the sticky cheese.']);
    v.destroy();
  });
});

describe('explore', () => {
  const items = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-role="sort-item"]')];
  const bins = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-role="sort-bin"]')];
  const classOf = (w: string) => CLASSES.find(c => WORDS[c].includes(w))!;
  const binFor = (el: HTMLElement, c: string) => bins(el).find(b => b.dataset.id === c)!;
  const feedback = (el: HTMLElement) => el.querySelector('[data-role="feedback"]')!.textContent!;
  const drop = (el: HTMLElement, w: string, c: string) => {
    items(el).find(i => i.dataset.id === w)!.click();
    binFor(el, c).click();
  };

  it('shows 9 words (3 per class) and 3 bins with labels', () => {
    const el = document.createElement('div');
    const v = wordSorterToy.explore(el, mkCtx());
    expect(items(el).length).toBe(9);
    const ids = items(el).map(i => i.dataset.id!);
    for (const c of CLASSES) expect(ids.filter(w => classOf(w) === c).length).toBe(3);
    expect(bins(el).map(b => b.textContent)).toEqual(['🏷️ Noun', '🏃 Verb', '🎨 Adjective']);
    v.destroy();
  });
  it('gives gentle feedback per drop, never "Wrong"', () => {
    const el = document.createElement('div');
    const v = wordSorterToy.explore(el, mkCtx());
    const w = items(el)[0].dataset.id!;
    const right = classOf(w);
    const other = CLASSES.find(c => c !== right)!;
    drop(el, w, other);
    expect(feedback(el)).toMatch(/try/i);
    expect(feedback(el)).not.toMatch(/wrong/i);
    drop(el, w, right);
    expect(feedback(el)).toContain(`"${w}" is`);
    expect(feedback(el)).toContain(DEFINITIONS[right]);
    v.destroy();
  });
  it('celebrates once when all nine are right, and "New words" deals a fresh set', () => {
    const el = document.createElement('div');
    const ctx = mkCtx();
    const v = wordSorterToy.explore(el, ctx);
    for (const i of items(el)) drop(el, i.dataset.id!, classOf(i.dataset.id!));
    expect(ctx.celebrate).toHaveBeenCalledTimes(1);
    expect(feedback(el)).toMatch(/sorted/i);
    el.querySelector<HTMLElement>('[data-role="again"]')!.click();
    expect(items(el).length).toBe(9);
    expect(feedback(el)).not.toMatch(/sorted/i);
    v.destroy();
  });
  it('tapping a word speaks it, but nothing speaks on its own', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = wordSorterToy.explore(el, ctx);
    expect(ctx.spoken).toEqual([]);
    const w = items(el)[0].dataset.id!;
    items(el)[0].click();
    expect(ctx.spoken).toEqual([w]);
    v.destroy();
  });
});

describe('demonstrate', () => {
  it('highlights the targets after a beat; speaks the sentence only with autoRead', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const quiet = mkCtx(false);
    const p1 = wordSorterToy.demonstrate!(el, q('verb'), quiet);
    expect(tokBtns(el).filter(b => b.dataset.target === 'true').length).toBe(0);
    await vi.advanceTimersByTimeAsync(5000);
    const v1 = await p1;
    expect(tokBtns(el).filter(b => b.dataset.target === 'true').map(b => b.textContent)).toEqual(['nibbled']);
    expect(quiet.spoken).toEqual([]);
    v1.destroy();
    const loud = mkCtx(true);
    const p2 = wordSorterToy.demonstrate!(el, q('verb'), loud);
    await vi.advanceTimersByTimeAsync(5000);
    const v2 = await p2;
    expect(loud.spoken).toEqual(['The tiny mouse nibbled the sticky cheese.']);
    v2.destroy();
    el.remove();
    vi.useRealTimers();
  });
  it('does not speak when an ancestor was detached, and leaves no timers', async () => {
    vi.useFakeTimers();
    const wrapper = document.createElement('div');
    const el = document.createElement('div');
    wrapper.append(el);
    document.body.append(wrapper);
    const ctx = mkCtx(true);
    const p = wordSorterToy.demonstrate!(el, q('verb'), ctx);
    wrapper.remove();
    await vi.advanceTimersByTimeAsync(10000);
    const view = await p;
    expect(ctx.spoken).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    view.destroy();
    vi.useRealTimers();
  });
});
