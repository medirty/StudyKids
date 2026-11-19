import { describe, it, expect, vi } from 'vitest';
import { storyTimeToy, type StoryQuestion } from '../../../src/toys/english/storyTime';
import { STORIES, storyOf, wordCount } from '../../../src/content/english/stories';
import { toysFor } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';

type Ctx = ToyContext & { spoken: string[]; stops: number };
/** Speech whose speak() stays pending until stop() or finish(), like a real engine. */
const mkCtx = (autoRead = false): Ctx & { finish(): Promise<void> } => {
  let pending: (() => void)[] = [];
  const c = {
    stage: 3 as const, autoRead, spoken: [] as string[], stops: 0,
    speech: {
      speak: (t: string) => { c.spoken.push(t); return new Promise<void>(r => { pending.push(r); }); },
      stop() { c.stops++; const p = pending; pending = []; p.forEach(r => r()); },
      available: true,
    },
    sfx: { tick() {}, success() {}, tryAgain() {} },
    celebrate() {},
    /** End the current utterance naturally and let the reader move on. */
    async finish() { const p = pending; pending = []; p.forEach(r => r()); for (let i = 0; i < 5; i++) await Promise.resolve(); },
  };
  return c;
};
const byRole = (el: HTMLElement, role: string) => [...el.querySelectorAll<HTMLElement>(`[data-role="${role}"]`)];
const one = (el: HTMLElement, role: string) => el.querySelector<HTMLElement>(`[data-role="${role}"]`)!;
const tapChoice = (el: HTMLElement, text: string) => byRole(el, 'choice').find(b => b.textContent === text)!.click();
const all = (seed = 1) => storyTimeToy.generateQuestions(3, 10, mulberry32(seed));
const find = (storyId: string, q: string): StoryQuestion => {
  for (let seed = 1; seed < 500; seed++) {
    const hit = all(seed).find(x => x.storyId === storyId && x.prompt === q);
    if (hit) return hit;
  }
  throw new Error('not found');
};
const BRITISH_SLIPS = /\b(color|favorite|mom|neighbor|gray|cookie|candy|vacation|center)\b/i;

describe('content', () => {
  it('has the reviewed wording', () => {
    expect(storyOf('kite').paragraphs[2]).toContain('After that, Ravi tied the string around his wrist so his kite could never fly away again.');
    expect(storyOf('kite').questions[5].answer).toBe('So his kite could never fly away again');
    expect(storyOf('garden').paragraphs[0]).toContain('Every weekend, his granddaughter Sofia, who lived next door, came to help him.');
    expect(storyOf('garden').paragraphs[1]).toContain('Sofia was worried because the plants');
    expect(storyOf('crow').questions.find(x => x.q === 'What did Pip use to get the bread out?')!.answer).toBe('A twig');
  });
  it('has four original stories of 80–150 words with unique titles', () => {
    expect(STORIES.length).toBe(4);
    expect(new Set(STORIES.map(s => s.title)).size).toBe(4);
    expect(new Set(STORIES.map(s => s.id)).size).toBe(4);
    for (const s of STORIES) {
      const n = wordCount(s);
      expect(n, s.title).toBeGreaterThanOrEqual(80);
      expect(n, s.title).toBeLessThanOrEqual(150);
      expect(s.paragraphs.join(' ')).not.toMatch(BRITISH_SLIPS);
    }
  });
  it('each story has 6 questions with 3 unique options, the answer among them', () => {
    for (const s of STORIES) {
      expect(s.questions.length).toBe(6);
      expect(new Set(s.questions.map(x => x.q)).size).toBe(6);
      for (const x of s.questions) {
        expect(x.options.length).toBe(3);
        expect(new Set(x.options).size).toBe(3);
        expect(x.options).toContain(x.answer);
        expect(['who', 'what', 'why', 'order']).toContain(x.kind);
      }
      expect(s.questions.some(x => x.kind === 'order' && x.q === 'What happened first?'), s.title).toBe(true);
    }
  });
  it('every evidence is a whole sentence copied verbatim from one paragraph', () => {
    for (const s of STORIES) for (const x of s.questions) {
      const para = s.paragraphs.find(p => p.includes(x.evidence));
      expect(para, `${s.title}: ${x.evidence}`).toBeDefined();
      const at = para!.indexOf(x.evidence);
      expect(at === 0 || /[.!?’] $/.test(para!.slice(0, at)), x.evidence).toBe(true);
      expect(x.evidence).toMatch(/[.!?]’?$/);
    }
  });
  it('is registered for grade 3 english only', () => {
    const m = storyTimeToy.meta;
    expect([m.id, m.subject, m.stages, m.title, m.icon]).toEqual(['storyTime', 'english', [3], 'Story Time', '📖']);
    expect(toysFor('english', 3).map(t => t.meta.id)).toContain('storyTime');
    expect(toysFor('english', 1).map(t => t.meta.id)).not.toContain('storyTime');
  });
});

describe('generateQuestions', () => {
  it('a round is 10 unique questions: 6 from one story and 4 from another', () => {
    const seen6 = new Set<string>();
    const seen4 = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const qs = all(seed);
      expect(qs.length).toBe(10);
      expect(new Set(qs.map(x => `${x.storyId}|${x.prompt}`)).size).toBe(10);
      expect(new Set(qs.map(x => x.id)).size).toBe(10);
      const counts = new Map<string, number>();
      qs.forEach(x => counts.set(x.storyId, (counts.get(x.storyId) ?? 0) + 1));
      expect([...counts.values()].sort()).toEqual([4, 6]);
      for (const [id, n] of counts) (n === 6 ? seen6 : seen4).add(id);
      // each story's questions come together, the first one opens the story
      const order = qs.map(x => x.storyId);
      expect(order.filter((v, i) => i === 0 || v !== order[i - 1]).length).toBe(2);
      qs.forEach((x, i) => expect(x.storyFirst).toBe(i === 0 || x.storyId !== qs[i - 1].storyId));
    }
    expect(seen6.size).toBe(4);
    expect(seen4.size).toBe(4);
  });
  it('questions carry the story data; options are a shuffle of the content options', () => {
    const shuffled = new Set<string>();
    for (const x of storyTimeToy.generateQuestions(3, 200, mulberry32(3))) {
      const s = storyOf(x.storyId);
      const d = s.questions.find(y => y.q === x.prompt)!;
      expect(x.title).toBe(s.title);
      expect(x.answer).toBe(d.answer);
      expect(x.evidence).toBe(d.evidence);
      expect(x.kind).toBe(d.kind);
      expect([...x.options].sort()).toEqual([...d.options].sort());
      shuffled.add(x.options.indexOf(x.answer).toString());
    }
    expect(shuffled.size).toBe(3);
  });
  it('200 questions: requested count, every block of 10 unique, never the same question twice in a row', () => {
    const qs = storyTimeToy.generateQuestions(3, 200, mulberry32(11));
    expect(qs.length).toBe(200);
    for (let i = 1; i < qs.length; i++) expect(`${qs[i].storyId}|${qs[i].prompt}`).not.toBe(`${qs[i - 1].storyId}|${qs[i - 1].prompt}`);
    for (let b = 0; b < 200; b += 10) expect(new Set(qs.slice(b, b + 10).map(x => `${x.storyId}|${x.prompt}`)).size).toBe(10);
  });
  it('odd counts are honoured and deterministic for a seed', () => {
    expect(storyTimeToy.generateQuestions(3, 3, mulberry32(5)).length).toBe(3);
    expect(storyTimeToy.generateQuestions(3, 13, mulberry32(5)).length).toBe(13);
    expect(all(9)).toEqual(all(9));
  });
});

describe('check / explain', () => {
  const q = find('kite', 'Where did the kite land?');
  it('correct only for the answer', () => {
    expect(storyTimeToy.check(q, 'In a tall oak tree')).toEqual({ correct: true });
    expect(storyTimeToy.check(q, 'In the duck pond')).toEqual({
      correct: false, hint: 'Look again at paragraph 2. Which sentence tells you?',
    });
    expect(storyTimeToy.check(find('kite', 'What colour was Ravi’s kite?'), 'Blue').hint).toBe('Look again at paragraph 1. Which sentence tells you?');
    expect(storyTimeToy.check(find('garden', 'What did Grandpa call Sofia?'), 'A good cook').hint).toBe('Look again at paragraph 4. Which sentence tells you?');
    expect(storyTimeToy.check(q, null)).toEqual({ correct: false, hint: 'Tap an answer first!' });
  });
  it('explains with the evidence and the answer', () => {
    expect(storyTimeToy.explain(q, 'In the duck pond')).toEqual({
      why: 'The story says: "The kite floated away and landed in a tall oak tree."',
      how: 'So the answer is "In a tall oak tree".',
    });
    expect(storyTimeToy.describeAnswer(q, 'In the duck pond')).toBe('You chose "In the duck pond"');
    expect(storyTimeToy.describeAnswer(q, null)).toBe('You have not answered yet');
  });
});

describe('challenge', () => {
  const setup = (q: StoryQuestion, ctx = mkCtx()) => {
    const el = document.createElement('div');
    document.body.append(el);
    return { el, ctx, view: storyTimeToy.renderChallenge(el, q, ctx) };
  };
  it('shows the title, the paragraphs and three choices; answers via the cards', () => {
    const q = find('crow', 'Who dropped the bread into the pipe?');
    const { el, ctx, view } = setup(q);
    expect(one(el, 'story-title').textContent).toBe('🐦‍⬛ The Clever Crow');
    expect(byRole(el, 'paragraph').map(p => p.textContent)).toEqual(storyOf('crow').paragraphs);
    expect(byRole(el, 'choice').map(b => b.textContent)).toEqual(q.options);
    expect(view.getAnswer()).toBeNull();
    tapChoice(el, 'Lola');
    expect(view.getAnswer()).toBe('Lola');
    view.reset();
    expect(view.getAnswer()).toBeNull();
    expect(ctx.spoken).toEqual([]);
    view.destroy();
    expect(el.children.length).toBe(0);
    el.remove();
  });
  it('the story is open for the first question of a story and collapsible on phones', () => {
    const first = setup({ ...find('garden', 'Why was Sofia worried?'), storyFirst: true });
    expect(one(first.el, 'story-body').dataset.open).toBe('true');
    first.view.destroy(); first.el.remove();

    const later = setup({ ...find('garden', 'Why was Sofia worried?'), storyFirst: false });
    const body = one(later.el, 'story-body');
    const toggle = one(later.el, 'story-toggle');
    expect(body.dataset.open).toBe('false');
    expect(body.classList.contains('hidden')).toBe(true);
    expect(body.classList.contains('wide:flex')).toBe(true);
    expect(body.classList.contains('flex')).toBe(false); // always open on wide screens
    expect(toggle.classList.contains('wide:hidden')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    expect(body.dataset.open).toBe('true');
    expect(body.classList.contains('hidden')).toBe(false);
    expect(body.classList.contains('flex')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.click();
    expect(body.dataset.open).toBe('false');
    later.view.destroy(); later.el.remove();
  });
  it('🔊 reads the story paragraph by paragraph (opening it), tap again pauses', async () => {
    const { el, ctx, view } = setup({ ...find('rainyDay', 'Why did Mia feel cross?'), storyFirst: false });
    const read = one(el, 'read');
    read.click();
    expect(one(el, 'story-body').dataset.open).toBe('true');
    const paras = storyOf('rainyDay').paragraphs;
    expect(ctx.spoken).toEqual([paras[0]]);
    expect(read.getAttribute('aria-pressed')).toBe('true');
    await ctx.finish();
    expect(ctx.spoken).toEqual([paras[0], paras[1]]);
    read.click(); // pause
    await ctx.finish();
    expect(read.getAttribute('aria-pressed')).toBe('false');
    expect(ctx.stops).toBe(1);
    expect(ctx.spoken.length).toBe(2);
    read.click(); // resumes at the paragraph it stopped in
    expect(ctx.spoken[2]).toBe(paras[1]);
    view.destroy();
    expect(ctx.stops).toBe(2);
    el.remove();
  });
  it('the read-along stops when the question 🔊 or Check is tapped, so their voice is not cut off', async () => {
    const { el, ctx, view } = setup(find('kite', 'Who climbed the ladder?'));
    const other = document.createElement('button');
    other.dataset.role = 'speak';
    document.body.append(other);
    one(el, 'read').click();
    other.click();
    expect(ctx.stops).toBe(1);
    expect(one(el, 'read').getAttribute('aria-pressed')).toBe('false');
    await ctx.finish();
    expect(ctx.spoken.length).toBe(1);
    view.destroy();
    other.click(); // listener removed with the view
    expect(ctx.stops).toBe(1);
    other.remove(); el.remove();
  });
  it('tapping an answer stops the read-along first', async () => {
    for (const auto of [false, true]) {
      const { el, ctx, view } = setup(find('crow', 'Who dropped the bread into the pipe?'), mkCtx(auto));
      one(el, 'read').click();
      tapChoice(el, 'Daniel');
      expect(ctx.stops).toBe(1);
      expect(one(el, 'read').getAttribute('aria-pressed')).toBe('false');
      expect(ctx.spoken).toEqual(auto ? [storyOf('crow').paragraphs[0], 'Daniel'] : [storyOf('crow').paragraphs[0]]);
      await ctx.finish();
      expect(ctx.spoken.length).toBe(auto ? 2 : 1); // the reader did not move on
      view.destroy(); el.remove();
    }
  });
  it('speaks the chosen answer only with autoRead', () => {
    const q = find('crow', 'Who dropped the bread into the pipe?');
    const a = setup(q);
    tapChoice(a.el, 'Daniel');
    expect(a.ctx.spoken).toEqual([]);
    a.view.destroy(); a.el.remove();
    const b = setup(q, mkCtx(true));
    tapChoice(b.el, 'Daniel');
    expect(b.ctx.spoken).toEqual(['Daniel']);
    b.view.destroy(); b.el.remove();
  });
});

describe('explore', () => {
  const setup = (ctx = mkCtx()) => {
    const el = document.createElement('div');
    document.body.append(el);
    return { el, ctx, view: storyTimeToy.explore(el, ctx) };
  };
  it('lists every story; picking one shows it without speaking (autoRead off)', () => {
    const { el, ctx, view } = setup();
    expect(byRole(el, 'story').map(b => b.dataset.id)).toEqual(STORIES.map(s => s.id));
    byRole(el, 'story').find(b => b.dataset.id === 'garden')!.click();
    expect(one(el, 'story-title').textContent).toBe('🌻 Grandpa’s Garden');
    expect(byRole(el, 'paragraph').map(p => p.textContent)).toEqual(storyOf('garden').paragraphs);
    expect(one(el, 'story-body').dataset.open).toBe('true');
    expect(el.querySelector('[data-role="story-toggle"]')).toBeNull();
    expect(ctx.spoken).toEqual([]);
    one(el, 'stories').click();
    expect(byRole(el, 'story').length).toBe(4);
    expect(byRole(el, 'paragraph').length).toBe(0);
    view.destroy(); el.remove();
  });
  it('with autoRead, picking a story starts the read-along', () => {
    const { el, ctx, view } = setup(mkCtx(true));
    byRole(el, 'story').find(b => b.dataset.id === 'kite')!.click();
    expect(ctx.spoken).toEqual([storyOf('kite').paragraphs[0]]);
    view.destroy();
    expect(ctx.stops).toBeGreaterThan(0);
    el.remove();
  });
  it('🔊 plays all paragraphs in order; going back stops the reading', async () => {
    const { el, ctx, view } = setup();
    byRole(el, 'story').find(b => b.dataset.id === 'crow')!.click();
    one(el, 'read').click();
    const paras = storyOf('crow').paragraphs;
    for (let i = 0; i < paras.length; i++) await ctx.finish();
    expect(ctx.spoken).toEqual(paras);
    expect(one(el, 'read').getAttribute('aria-pressed')).toBe('false');
    one(el, 'read').click();
    expect(ctx.spoken.length).toBe(paras.length + 1); // starts again from the top
    expect(ctx.spoken[paras.length]).toBe(paras[0]);
    one(el, 'stories').click();
    expect(ctx.stops).toBe(1);
    await ctx.finish();
    expect(ctx.spoken.length).toBe(paras.length + 1);
    view.destroy(); el.remove();
  });
});

describe('demonstrate', () => {
  it('highlights the evidence sentence and the right answer; speaks only with autoRead', async () => {
    for (const auto of [true, false]) {
      vi.useFakeTimers();
      const el = document.createElement('div');
      document.body.append(el);
      const ctx = mkCtx(auto);
      const q = find('rainyDay', 'What did they build out of cushions?');
      const p = storyTimeToy.demonstrate!(el, q, ctx);
      await vi.advanceTimersByTimeAsync(5000);
      const view = await p;
      expect(el.querySelector('[data-highlight="correct"]')!.textContent).toBe('A sandcastle');
      const marked = [...el.querySelectorAll('[data-evidence]')].map(s => s.textContent).join(' ');
      expect(marked).toBe(q.evidence);
      expect(one(el, 'story-body').dataset.open).toBe('true');
      expect(ctx.spoken).toEqual(auto ? [`The story says: ${q.evidence}`] : []);
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
    const p = storyTimeToy.demonstrate!(el, find('kite', 'Who climbed the ladder?'), ctx);
    if (how === 'wrapper.remove') wrapper.remove(); else document.body.replaceChildren();
    await vi.advanceTimersByTimeAsync(5000);
    const view = await p;
    expect(ctx.spoken).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    view.destroy();
    vi.useRealTimers();
  });
});
