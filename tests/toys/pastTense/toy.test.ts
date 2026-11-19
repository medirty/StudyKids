import { describe, it, expect, vi } from 'vitest';
import { pastTenseToy, type PastQuestion } from '../../../src/toys/english/pastTense';
import { VERBS, IRREGULAR_VERBS, REGULAR_VERBS, RULE_CAPTIONS, pastOf, ruleOf, type VerbRule } from '../../../src/content/english/verbs';
import { toysFor } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';

const EXPECTED: Record<string, [string, VerbRule]> = {
  walk: ['walked', 'ed'], jump: ['jumped', 'ed'], play: ['played', 'ed'], help: ['helped', 'ed'], look: ['looked', 'ed'], kick: ['kicked', 'ed'],
  hop: ['hopped', 'double'], stop: ['stopped', 'double'], clap: ['clapped', 'double'], skip: ['skipped', 'double'],
  bake: ['baked', 'd'], smile: ['smiled', 'd'], dance: ['danced', 'd'],
  cry: ['cried', 'ied'], carry: ['carried', 'ied'], try: ['tried', 'ied'],
  go: ['went', 'irregular'], run: ['ran', 'irregular'], see: ['saw', 'irregular'], eat: ['ate', 'irregular'], come: ['came', 'irregular'],
  sit: ['sat', 'irregular'], swim: ['swam', 'irregular'], write: ['wrote', 'irregular'], take: ['took', 'irregular'],
  make: ['made', 'irregular'], have: ['had', 'irregular'], say: ['said', 'irregular'],
};
const mk = (verb: string): PastQuestion => {
  const q = pastTenseToy.generateQuestions(3, 500, mulberry32(1)).find(x => x.verb === verb)!;
  return q;
};
const mkCtx = (autoRead = false): ToyContext & { spoken: string[]; ticks: number } => {
  const c = {
    stage: 3 as const, autoRead, spoken: [] as string[], ticks: 0,
    speech: { speak: async (t: string) => { c.spoken.push(t); }, stop() {}, available: true },
    sfx: { tick: () => { c.ticks++; }, success() {}, tryAgain() {} },
    celebrate() {},
  };
  return c;
};
const poolTile = (el: HTMLElement, t: string) =>
  [...el.querySelectorAll<HTMLElement>('.kit-tile-pool [data-role="tile"]')].find(b => b.textContent === t)!;
const slotTile = (el: HTMLElement, t: string) =>
  [...el.querySelectorAll<HTMLElement>('.kit-slots [data-role="tile"]')].find(b => b.textContent === t)!;
const built = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.kit-slots [data-role="tile"]')].map(b => b.textContent).join('');

describe('content', () => {
  it('pastOf and ruleOf match the brief for every verb', () => {
    expect(VERBS.length).toBe(Object.keys(EXPECTED).length);
    for (const [verb, [past, rule]] of Object.entries(EXPECTED)) {
      expect(pastOf(verb)).toBe(past);
      expect(ruleOf(verb)).toBe(rule);
    }
  });
  it('regular pasts really follow their rule', () => {
    for (const v of REGULAR_VERBS) {
      const last = v.verb.slice(-1);
      const derived = { ed: v.verb + 'ed', double: v.verb + last + 'ed', d: v.verb + 'd', ied: v.verb.slice(0, -1) + 'ied', irregular: '' }[v.rule];
      expect(v.past).toBe(derived);
    }
  });
  it('throws for unknown verbs', () => {
    expect(() => pastOf('zzz')).toThrow();
  });
  it('rule captions are exact', () => {
    expect(RULE_CAPTIONS).toEqual({
      ed: 'Add -ed', double: 'Double the last letter, add -ed', d: 'Just add -d', ied: 'Change y to i, add -ed', irregular: 'Irregular: learn it!',
    });
  });
  it('irregular wrong forms are never a real past form', () => {
    const pasts = new Set(VERBS.map(v => v.past));
    for (const v of IRREGULAR_VERBS) {
      expect(v.wrong!.length).toBe(2);
      expect(new Set([v.past, ...v.wrong!]).size).toBe(3);
      for (const w of v.wrong!) expect(pasts.has(w)).toBe(false);
    }
  });
  it('is registered for grade 3 english only', () => {
    const m = pastTenseToy.meta;
    expect([m.id, m.subject, m.stages, m.title, m.icon]).toEqual(['pastTense', 'english', [3], 'Past Tense Machine', '⚙️']);
    expect(toysFor('english', 3).map(t => t.meta.id)).toContain('pastTense');
    expect(toysFor('english', 1).map(t => t.meta.id)).not.toContain('pastTense');
  });
});

describe('generateQuestions', () => {
  it('200 questions: shape, mix, no consecutive repeat', () => {
    const qs = pastTenseToy.generateQuestions(3, 200, mulberry32(7));
    expect(qs.length).toBe(200);
    qs.forEach((x, i) => {
      expect(x.prompt).toBe(`Yesterday I … (${x.verb})`);
      expect(x.spoken).toBe(`Yesterday I, ${x.verb}. What is the past tense of ${x.verb}?`);
      expect(x.past).toBe(pastOf(x.verb));
      expect(x.kind).toBe(ruleOf(x.verb) === 'irregular' ? 'irregular' : 'regular');
      if (i > 0) expect(x.verb).not.toBe(qs[i - 1].verb);
    });
    expect(qs.filter(x => x.kind === 'irregular').length / 200).toBeGreaterThanOrEqual(0.3);
    expect(qs.filter(x => x.kind === 'regular').length).toBeGreaterThan(0);
    expect(new Set(qs.map(x => x.id)).size).toBe(200);
    expect(new Set(qs.map(x => x.verb)).size).toBe(VERBS.length);
  });
  it('irregular options: correct, over-regularised and near miss, shuffled', () => {
    const qs = pastTenseToy.generateQuestions(3, 200, mulberry32(3)).filter(x => x.kind === 'irregular');
    for (const x of qs) {
      const e = IRREGULAR_VERBS.find(v => v.verb === x.verb)!;
      expect([...x.options!].sort()).toEqual([e.past, ...e.wrong!].sort());
    }
    expect(new Set(qs.map(x => x.options!.indexOf(x.past))).size).toBeGreaterThan(1);
  });
  it('returns the requested count for 0, 1, 5', () => {
    for (const n of [0, 1, 5]) expect(pastTenseToy.generateQuestions(3, n, mulberry32(2)).length).toBe(n);
  });
  it('is deterministic for a seed', () => {
    expect(pastTenseToy.generateQuestions(3, 20, mulberry32(9))).toEqual(pastTenseToy.generateQuestions(3, 20, mulberry32(9)));
  });
});

describe('check / describe / explain', () => {
  it('check accepts the past form only, with the rule as hint', () => {
    for (const v of VERBS) {
      const q = mk(v.verb);
      expect(pastTenseToy.check(q, v.past)).toEqual({ correct: true });
      const bad = pastTenseToy.check(q, 'xyz');
      expect(bad.correct).toBe(false);
      expect(bad.hint).toBe(RULE_CAPTIONS[v.rule]);
      expect(pastTenseToy.check(q, '').correct).toBe(false);
    }
  });
  it('describeAnswer and explain', () => {
    const q = mk('hop');
    expect(pastTenseToy.describeAnswer(q, 'hoped')).toBe('You made "hoped"');
    expect(pastTenseToy.describeAnswer(q, '')).toBe('You have not answered yet');
    expect(pastTenseToy.explain(q, 'hoped')).toEqual({
      why: 'You made "hoped"', how: 'hop becomes hopped. Double the last letter, add -ed.',
    });
    expect(pastTenseToy.describeAnswer(mk('go'), 'goed')).toBe('You chose "goed"');
    expect(pastTenseToy.explain(mk('go'), 'goed').why).toBe('You chose "goed"');
    expect(pastTenseToy.explain(mk('go'), 'goed').how).toBe('go becomes went. Irregular: learn it!');
  });
});

describe('regular challenge (tiles)', () => {
  const setup = (verb: string) => {
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx();
    const view = pastTenseToy.renderChallenge(el, mk(verb), ctx);
    return { el, view, ctx };
  };
  it('starts with the root letters placed', () => {
    const { el, view } = setup('walk');
    expect(built(el)).toBe('walk');
    expect(view.getAnswer()).toBe('walk');
    view.destroy(); el.remove();
  });
  it.each(VERBS.filter(v => v.rule !== 'irregular').map(v => [v.verb, v.past, v.rule]))('%s is buildable as %s (%s)', (verb, past) => {
    const { el, view } = setup(verb);
    const root = verb;
    if (past.endsWith('ied')) {
      slotTile(el, 'y').click();
      poolTile(el, 'ied').click();
    } else if (past === root + 'd') {
      poolTile(el, 'd').click();
    } else if (past === root + root.slice(-1) + 'ed') {
      poolTile(el, root.slice(-1)).click();
      poolTile(el, 'ed').click();
    } else {
      poolTile(el, 'ed').click();
    }
    expect(view.getAnswer()).toBe(past);
    expect(built(el)).toBe(past);
    expect(pastTenseToy.check(mk(verb), view.getAnswer()).correct).toBe(true);
    view.destroy(); el.remove();
  });
  it('wrong build is not correct and reset restores the root', () => {
    const { el, view } = setup('hop');
    poolTile(el, 'ed').click();
    expect(view.getAnswer()).toBe('hoped');
    expect(pastTenseToy.check(mk('hop'), view.getAnswer()).correct).toBe(false);
    view.reset();
    expect(view.getAnswer()).toBe('hop');
    view.destroy(); el.remove();
  });
  it('shows the word being built', () => {
    const { el, view } = setup('bake');
    poolTile(el, 'd').click();
    expect(el.querySelector('[data-role="preview"]')!.textContent).toContain('baked');
    view.destroy(); el.remove();
  });
});

describe('irregular challenge (choice cards)', () => {
  it('shows 3 options; answer is the selected label, empty when none', () => {
    const el = document.createElement('div');
    document.body.append(el);
    const q = mk('go');
    const view = pastTenseToy.renderChallenge(el, q, mkCtx());
    const cards = [...el.querySelectorAll<HTMLElement>('[data-role="choice"]')];
    expect(cards.map(c => c.textContent).sort()).toEqual(['went', 'goed', 'wented'].sort());
    expect(view.getAnswer()).toBe('');
    cards.find(c => c.textContent === 'went')!.click();
    expect(view.getAnswer()).toBe('went');
    expect(pastTenseToy.check(q, view.getAnswer()).correct).toBe(true);
    view.reset();
    expect(view.getAnswer()).toBe('');
    view.destroy(); el.remove();
  });
});

describe('explore', () => {
  it('tap a verb card: gears then past form and rule caption; no timers left after destroy', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx();
    const v = pastTenseToy.explore(el, ctx);
    const cards = [...el.querySelectorAll<HTMLElement>('[data-role="verb"]')];
    expect(cards.length).toBe(VERBS.length);
    cards.find(c => c.textContent === 'cry')!.click();
    expect(el.querySelector('[data-role="gears"]')!.getAttribute('data-running')).toBe('true');
    expect(el.querySelector('[data-role="past"]')!.textContent).toBe('');
    vi.advanceTimersByTime(3000);
    expect(el.querySelector('[data-role="past"]')!.textContent).toBe('cried');
    expect(el.querySelector('[data-role="caption"]')!.textContent).toBe('Change y to i, add -ed');
    expect(el.querySelector('[data-role="gears"]')!.getAttribute('data-running')).toBe('false');
    expect(ctx.spoken).toEqual(['cry', 'Yesterday I cried.']);
    cards.find(c => c.textContent === 'go')!.click();
    v.destroy();
    expect(vi.getTimerCount()).toBe(0);
    el.remove();
    vi.useRealTimers();
  });
  it('does not speak after being detached mid-animation', () => {
    vi.useFakeTimers();
    const wrapper = document.createElement('div');
    document.body.append(wrapper);
    const ctx = mkCtx();
    pastTenseToy.explore(wrapper, ctx);
    wrapper.querySelector<HTMLElement>('[data-role="verb"]')!.click();
    wrapper.remove();
    vi.advanceTimersByTime(5000);
    expect(ctx.spoken).toEqual(['walk']); // the verb is spoken in the tap; the past form is not, once detached
    vi.useRealTimers();
  });
});

describe('demonstrate', () => {
  it.each(['walk', 'hop', 'cry', 'bake', 'go'])('shows the correct answer for %s', async verb => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(true);
    const q = mk(verb);
    const p = pastTenseToy.demonstrate!(el, q, ctx);
    await vi.advanceTimersByTimeAsync(10000);
    const view = await p;
    if (q.kind === 'regular') expect(built(el)).toBe(q.past);
    else expect(el.querySelector('[data-highlight="correct"]')!.textContent).toBe(q.past);
    expect(ctx.spoken).toEqual([`Yesterday I ${q.past}.`]);
    expect(vi.getTimerCount()).toBe(0);
    view.destroy(); el.remove();
    vi.useRealTimers();
  });
  it('is silent when autoRead is off', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(false);
    const p = pastTenseToy.demonstrate!(el, mk('hop'), ctx);
    await vi.advanceTimersByTimeAsync(10000);
    const v = await p;
    expect(ctx.spoken).toEqual([]);
    expect(ctx.ticks).toBeGreaterThan(0);
    v.destroy(); el.remove();
    vi.useRealTimers();
  });
  it.each(['wrapper.remove', 'body.replaceChildren'])('stops when an ancestor is detached (%s)', async how => {
    vi.useFakeTimers();
    const wrapper = document.createElement('div');
    const el = document.createElement('div');
    wrapper.append(el);
    document.body.append(wrapper);
    const ctx = mkCtx(true);
    const p = pastTenseToy.demonstrate!(el, mk('cry'), ctx);
    await vi.advanceTimersByTimeAsync(700);
    const ticks = ctx.ticks;
    if (how === 'wrapper.remove') wrapper.remove(); else document.body.replaceChildren();
    await vi.advanceTimersByTimeAsync(10000);
    const view = await p;
    expect(ctx.spoken).toEqual([]);
    expect(ctx.ticks).toBe(ticks);
    expect(vi.getTimerCount()).toBe(0);
    view.destroy();
    vi.useRealTimers();
  });
});
