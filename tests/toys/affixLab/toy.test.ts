import { describe, it, expect, vi } from 'vitest';
import { affixLabToy, type AffixQuestion } from '../../../src/toys/english/affixLab';
import { AFFIXES, AFFIX_ENTRIES, ALL_ENTRIES, AVOIDED_WORDS, ROOTS, combine, entryFor, isRealCombo } from '../../../src/content/english/affixes';
import { toysFor } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';

const mkCtx = (autoRead = false): ToyContext & { spoken: string[] } => {
  const c = {
    stage: 3 as const, autoRead, spoken: [] as string[],
    speech: { speak: async (t: string) => { c.spoken.push(t); }, stop() {}, available: true },
    sfx: { tick() {}, success() {}, tryAgain() {} },
    celebrate() {},
  };
  return c;
};
const mk = (word: string): AffixQuestion => affixLabToy.generateQuestions(3, 500, mulberry32(1)).find(q => q.word === word)!;
const byRole = (el: HTMLElement, role: string) => [...el.querySelectorAll<HTMLElement>(`[data-role="${role}"]`)];
const tap = (el: HTMLElement, role: string, text: string) => byRole(el, role).find(b => b.textContent === text)!.click();

const BRIEF: Record<string, string[]> = {
  un: ['happy', 'kind', 'lock', 'tidy'], re: ['play', 'read', 'write', 'build'], dis: ['agree', 'like', 'appear', 'obey'],
  pre: ['heat', 'view', 'school'], ful: ['help', 'care', 'play', 'colour'], less: ['care', 'help', 'home', 'fear'],
  ly: ['quick', 'slow', 'kind', 'sad'], ness: ['kind', 'dark', 'happy'], er: ['teach', 'play', 'paint', 'read'],
};

describe('content', () => {
  it('has the brief entries and every word is combine(root, affix)', () => {
    expect(AFFIX_ENTRIES.length).toBe(Object.values(BRIEF).flat().length);
    for (const [affix, roots] of Object.entries(BRIEF)) {
      for (const r of roots) expect(AFFIX_ENTRIES.some(x => x.affix === affix && x.root === r)).toBe(true);
    }
    for (const x of ALL_ENTRIES) {
      expect(combine(x.root, x.affix)).toBe(x.word);
      expect(x.meaning.length).toBeGreaterThan(3);
    }
    expect(new Set(ALL_ENTRIES.map(x => `${x.root}+${x.affix}`)).size).toBe(ALL_ENTRIES.length);
  });
  it('spelling rules', () => {
    const cases: [string, string, string][] = [
      ['happy', 'ness', 'happiness'], ['kind', 'ness', 'kindness'], ['help', 'less', 'helpless'], ['teach', 'er', 'teacher'],
      ['paint', 'er', 'painter'], ['play', 'er', 'player'], ['read', 'er', 'reader'], ['quick', 'ly', 'quickly'], ['sad', 'ly', 'sadly'],
      ['colour', 'ful', 'colourful'], ['care', 'ful', 'careful'], ['care', 'less', 'careless'],
      ['write', 're', 'rewrite'], ['appear', 'dis', 'disappear'], ['heat', 'pre', 'preheat'], ['write', 'er', 'writer'], ['sad', 'er', 'sadder'],
      ['tidy', 'ly', 'tidily'], ['play', 'ful', 'playful'], ['home', 'less', 'homeless'], ['happy', 'un', 'unhappy'],
    ];
    for (const [root, affix, word] of cases) expect(combine(root, affix)).toBe(word);
    expect(combine('happy', '-ness')).toBe('happiness');
    expect(() => combine('x', 'zzz')).toThrow();
  });
  it('every affix has a meaning and a speakable hint', () => {
    expect(AFFIXES.map(a => [a.label, a.affixMeaning, a.hint])).toEqual([
      ['un-', 'not, or undo', '"un-" means "not, or undo".'],
      ['re-', 'again', '"re-" means "again".'],
      ['dis-', 'not, or the opposite of', '"dis-" means "not, or the opposite of".'],
      ['pre-', 'before', '"pre-" means "before".'],
      ['-ful', 'full of', '"-ful" means "full of".'],
      ['-less', 'without', '"-less" means "without".'],
      ['-ly', 'how something is done', '"-ly" makes a word that tells how something is done.'],
      ['-ness', 'being something', '"-ness" makes a word for being something.'],
      ['-er', 'someone who does something', '"-er" means someone who does something.'],
    ]);
    for (const a of AFFIXES) expect(a.hint).not.toContain('…');
    for (const x of ALL_ENTRIES) expect(x.meaning).not.toContain('…');
  });
  it('false friends and comparatives are not real combos', () => {
    expect(isRealCombo('play', 'dis')).toBe(false);
    expect(isRealCombo('like', 'ly')).toBe(false);
    for (const w of ['display', 'likely']) expect(ALL_ENTRIES.some(x => x.word === w)).toBe(false);
    for (const w of ['kinder', 'slower', 'darker', 'sadder', 'quicker', 'happier', 'tidier']) {
      expect(AVOIDED_WORDS).toContain(w);
      expect(ALL_ENTRIES.some(x => x.word === w)).toBe(false);
    }
    expect(ALL_ENTRIES.filter(x => x.affix === 'er').every(x => x.meaning.startsWith('someone who'))).toBe(true);
  });
  it('has the newly added real words', () => {
    for (const [r, a, w] of [['like', 'ness', 'likeness'], ['home', 're', 'rehome'], ['colour', 're', 'recolour'], ['teach', 're', 'reteach']]) {
      expect(entryFor(r, a)!.word).toBe(w);
    }
    expect(entryFor('heat', 'pre')!.meaning).toBe('heat an oven before cooking');
    expect(entryFor('colour', 'dis')!.meaning).toBe('change colour, often by fading');
  });
  it('invalid combos are not real, real ones are', () => {
    expect(isRealCombo('happy', 'ness')).toBe(true);
    expect(isRealCombo('play', 'less')).toBe(false);
    expect(isRealCombo('kind', 'pre')).toBe(false);
    expect(entryFor('care', 'less')!.word).toBe('careless');
  });
  it('is registered for grade 3 english only', () => {
    const m = affixLabToy.meta;
    expect([m.id, m.subject, m.stages, m.title, m.icon]).toEqual(['affixLab', 'english', [3], 'Prefix & Suffix Lab', '🧪']);
    expect(toysFor('english', 3).map(t => t.meta.id)).toContain('affixLab');
    expect(toysFor('english', 1).map(t => t.meta.id)).not.toContain('affixLab');
  });
});

describe('generateQuestions', () => {
  it('200 questions: shape, options, no consecutive repeat', () => {
    const qs = affixLabToy.generateQuestions(3, 200, mulberry32(7));
    expect(qs.length).toBe(200);
    qs.forEach((q, i) => {
      const e = AFFIX_ENTRIES.find(x => x.word === q.word)!;
      expect(q.prompt).toBe(`Make a word that means "${e.meaning}"`);
      expect([q.root, q.affix]).toEqual([e.root, e.affix]);
      expect(q.options.length).toBe(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.affix);
      for (const o of q.options) if (o !== q.affix) {
        expect(isRealCombo(q.root, o)).toBe(false);
        expect(AVOIDED_WORDS).not.toContain(combine(q.root, o));
      }
      if (i > 0) expect(q.word).not.toBe(qs[i - 1].word);
    });
    expect(new Set(qs.map(q => q.id)).size).toBe(200);
    expect(new Set(qs.map(q => q.word)).size).toBe(AFFIX_ENTRIES.length);
    expect(new Set(qs.map(q => q.options.indexOf(q.affix))).size).toBeGreaterThan(1);
  });
  it('returns the requested count and is deterministic', () => {
    for (const n of [0, 1, 5]) expect(affixLabToy.generateQuestions(3, n, mulberry32(2)).length).toBe(n);
    expect(affixLabToy.generateQuestions(3, 20, mulberry32(9))).toEqual(affixLabToy.generateQuestions(3, 20, mulberry32(9)));
  });
});

describe('check / describe / explain', () => {
  it('accepts the right affix, hints with its meaning otherwise', () => {
    const q = mk('careless');
    expect(affixLabToy.check(q, { affix: 'less', word: 'careless' })).toEqual({ correct: true });
    expect(affixLabToy.check(q, { affix: 'ful', word: 'careful' })).toEqual({ correct: false, hint: '"-less" means "without".' });
    expect(affixLabToy.check(mk('quickly'), { affix: 'er', word: 'quicker' }).hint).toBe('"-ly" makes a word that tells how something is done.');
    expect(affixLabToy.check(q, { affix: '', word: '' }).correct).toBe(false);
    expect(affixLabToy.check(mk('dislike'), { affix: 'un', word: 'unlike' }).hint).toBe('"dis-" means "not, or the opposite of".');
  });
  it('describeAnswer and explain', () => {
    const q = mk('happiness');
    expect(affixLabToy.describeAnswer(q, { affix: 'un', word: 'unhappy' })).toBe('You made "unhappy"');
    expect(affixLabToy.describeAnswer(q, { affix: '', word: '' })).toBe('You have not answered yet');
    expect(affixLabToy.explain(q, { affix: 'un', word: 'unhappy' })).toEqual({
      why: 'You made "unhappy"', how: 'happy + -ness = happiness: being happy.',
    });
  });
});

describe('challenge', () => {
  const setup = (word: string, ctx = mkCtx()) => {
    const el = document.createElement('div');
    document.body.append(el);
    const q = mk(word);
    return { el, q, ctx, view: affixLabToy.renderChallenge(el, q, ctx) };
  };
  it('shows the root and four affix cards; selecting builds the word', () => {
    const { el, q, view } = setup('happiness');
    expect(el.querySelector('[data-role="root"]')!.textContent).toBe('happy');
    expect(byRole(el, 'choice').length).toBe(4);
    expect(view.getAnswer()).toEqual({ affix: '', word: '' });
    tap(el, 'choice', '-ness');
    expect(view.getAnswer()).toEqual({ affix: 'ness', word: 'happiness' });
    expect(el.querySelector('[data-role="built"]')!.textContent).toBe('happiness');
    expect(affixLabToy.check(q, view.getAnswer()).correct).toBe(true);
    view.reset();
    expect(view.getAnswer()).toEqual({ affix: '', word: '' });
    expect(el.querySelector('[data-role="built"]')!.textContent).toBe('?');
    view.destroy(); el.remove();
  });
  it('does not speak by itself when autoRead is off, speaks the built word when on', () => {
    const a = setup('careless');
    tap(a.el, 'choice', '-less');
    expect(a.ctx.spoken).toEqual([]);
    a.view.destroy(); a.el.remove();
    const b = setup('careless', mkCtx(true));
    tap(b.el, 'choice', '-less');
    expect(b.ctx.spoken).toEqual(['careless']);
    b.view.destroy(); b.el.remove();
  });
});

describe('explore', () => {
  const setup = (ctx = mkCtx()) => {
    const el = document.createElement('div');
    document.body.append(el);
    return { el, ctx, view: affixLabToy.explore(el, ctx) };
  };
  it('has a card for every root and affix, and says nothing on its own', () => {
    const { el, ctx, view } = setup();
    expect(byRole(el, 'root').map(b => b.textContent)).toEqual(ROOTS);
    expect(byRole(el, 'affix').map(b => b.textContent)).toEqual(AFFIXES.map(a => a.label));
    expect(ctx.spoken).toEqual([]);
    view.destroy(); el.remove();
  });
  it('real combos show the word and meaning and speak on tap', () => {
    const { el, ctx, view } = setup();
    tap(el, 'root', 'happy');
    expect(ctx.spoken).toEqual(['happy']);
    tap(el, 'affix', '-ness');
    expect(el.querySelector('[data-role="word"]')!.textContent).toBe('happiness');
    expect(el.querySelector('[data-role="meaning"]')!.textContent).toBe('being happy');
    expect(el.querySelector('[data-role="result"]')!.getAttribute('data-valid')).toBe('true');
    expect(ctx.spoken[ctx.spoken.length - 1]).toBe('happiness. being happy.');
    view.destroy(); el.remove();
  });
  it('invalid combos say so (never calling a word fake); changing the root re-checks', () => {
    const { el, ctx, view } = setup();
    tap(el, 'affix', '-less');
    expect(ctx.spoken).toEqual(['"-less" means "without".']);
    expect(el.querySelector('[data-role="meaning"]')!.textContent).toBe('"-less" means "without".');
    tap(el, 'root', 'play');
    expect(el.querySelector('[data-role="result"]')!.getAttribute('data-valid')).toBe('false');
    expect(el.querySelector('[data-role="meaning"]')!.textContent).toBe("Hmm, that one isn't in our word lab — try another!");
    expect(el.querySelector('[data-role="word"]')!.textContent).toBe('');
    tap(el, 'root', 'care');
    expect(el.querySelector('[data-role="word"]')!.textContent).toBe('careless');
    expect(el.querySelector('[data-role="meaning"]')!.textContent).toBe('without care');
    view.destroy(); el.remove();
  });
  it('false friends are not shown as built words', () => {
    const { el, view } = setup();
    tap(el, 'root', 'play'); tap(el, 'affix', 'dis-');
    expect(el.querySelector('[data-role="result"]')!.getAttribute('data-valid')).toBe('false');
    expect(el.querySelector('[data-role="word"]')!.textContent).toBe('');
    tap(el, 'root', 'like'); tap(el, 'affix', '-ly');
    expect(el.querySelector('[data-role="result"]')!.getAttribute('data-valid')).toBe('false');
    view.destroy(); el.remove();
  });
  it('every root × affix pair behaves according to the content', () => {
    const { el, view } = setup();
    for (const r of ROOTS) for (const a of AFFIXES) {
      tap(el, 'root', r); tap(el, 'affix', a.label);
      const res = el.querySelector('[data-role="result"]')!;
      const real = entryFor(r, a.id);
      expect(res.getAttribute('data-valid')).toBe(String(!!real));
      expect(el.querySelector('[data-role="word"]')!.textContent).toBe(real ? real.word : '');
    }
    view.destroy(); el.remove();
  });
});

describe('demonstrate', () => {
  it('highlights the right affix and shows the word; speaks only with autoRead', async () => {
    for (const auto of [true, false]) {
      vi.useFakeTimers();
      const el = document.createElement('div');
      document.body.append(el);
      const ctx = mkCtx(auto);
      const p = affixLabToy.demonstrate!(el, mk('preview'), ctx);
      await vi.advanceTimersByTimeAsync(5000);
      const view = await p;
      expect(el.querySelector('[data-highlight="correct"]')!.textContent).toBe('pre-');
      expect(el.querySelector('[data-role="built"]')!.textContent).toBe('preview');
      expect(ctx.spoken).toEqual(auto ? ['preview!'] : []);
      expect(vi.getTimerCount()).toBe(0);
      view.destroy(); el.remove();
      vi.useRealTimers();
    }
  });
  it.each(['wrapper.remove', 'body.replaceChildren'])('stops when an ancestor is detached (%s)', async how => {
    vi.useFakeTimers();
    const wrapper = document.createElement('div');
    const el = document.createElement('div');
    wrapper.append(el);
    document.body.append(wrapper);
    const ctx = mkCtx(true);
    const p = affixLabToy.demonstrate!(el, mk('careless'), ctx);
    if (how === 'wrapper.remove') wrapper.remove(); else document.body.replaceChildren();
    await vi.advanceTimersByTimeAsync(5000);
    const view = await p;
    expect(ctx.spoken).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    view.destroy();
    vi.useRealTimers();
  });
});
