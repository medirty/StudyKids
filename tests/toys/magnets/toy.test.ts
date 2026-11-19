import { describe, it, expect, vi } from 'vitest';
import { magnetsToy, type MagnetQuestion } from '../../../src/toys/science/magnets';
import { MAGNET_ITEMS, MAGNET_RULE, magnetItem, magnetExplanation, magnetVerdict } from '../../../src/content/science/magnets';
import { toysFor, findToy } from '../../../src/content/registry';
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
const q = (id = 'paper-clip'): MagnetQuestion => {
  const i = magnetItem(id);
  return { id: 'q1', prompt: `Will the ${i.name} stick to the magnet?`, item: id, magnetic: i.magnetic };
};
const $ = (el: HTMLElement, role: string) => el.querySelector<HTMLElement>(`[data-role="${role}"]`)!;
const choice = (el: HTMLElement, id: string) =>
  [...el.querySelectorAll<HTMLElement>('[data-role="choice"]')].find(b => b.dataset.id === id)!;
const tile = (el: HTMLElement, id: string) => el.querySelector<HTMLElement>(`[data-role="thing"][data-id="${id}"]`)!;

describe('content and meta', () => {
  it('every item has a name, emoji, material and a magnetic flag; ids and names are unique', () => {
    expect(MAGNET_ITEMS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(MAGNET_ITEMS.map(i => i.id)).size).toBe(MAGNET_ITEMS.length);
    expect(new Set(MAGNET_ITEMS.map(i => i.name)).size).toBe(MAGNET_ITEMS.length);
    expect(new Set(MAGNET_ITEMS.map(i => i.emoji)).size).toBe(MAGNET_ITEMS.length);
    for (const i of MAGNET_ITEMS) {
      expect(i.name.length, i.id).toBeGreaterThan(2);
      expect(i.emoji.length, i.id).toBeGreaterThan(0);
      expect(i.material.length, i.id).toBeGreaterThan(2);
      expect(typeof i.magnetic, i.id).toBe('boolean');
    }
  });
  it('is magnetic exactly when made of iron or steel; both kinds well represented', () => {
    for (const i of MAGNET_ITEMS) expect(i.magnetic, i.id).toBe(i.material === 'iron' || i.material === 'steel');
    expect(MAGNET_ITEMS.filter(i => i.magnetic).length).toBeGreaterThanOrEqual(6);
    expect(MAGNET_ITEMS.filter(i => !i.magnetic).length).toBeGreaterThanOrEqual(6);
  });
  it('brass, gold, wood, plastic, glass, paper and rubber are not magnetic', () => {
    for (const m of ['brass', 'gold', 'wood', 'plastic', 'glass', 'paper', 'rubber']) {
      const found = MAGNET_ITEMS.filter(i => i.material === m);
      expect(found.length, m).toBeGreaterThan(0);
      for (const i of found) expect(i.magnetic, i.id).toBe(false);
    }
    expect(magnetItem('paper-clip').magnetic).toBe(true);
    // coins can be steel inside (UK 1p and 2p stick), so none is used
    expect(MAGNET_ITEMS.some(i => /coin|penny|copper/.test(i.name + i.material))).toBe(false);
    expect(magnetItem('safety-pin').name).toBe('steel safety pin');
    // no tautology like "The steel bolt is made of steel"
    for (const i of MAGNET_ITEMS.filter(i => ['bolt', 'scissors', 'spanner', 'chain', 'trumpet'].includes(i.id))) expect(i.name).not.toContain(i.material);
    expect(magnetItem('trumpet').magnetic).toBe(false);
    expect(magnetItem('log').magnetic).toBe(false);
    expect(MAGNET_ITEMS.filter(i => !i.magnetic).length).toBe(8);
  });
  it('states the rule verbatim and explains with the material', () => {
    expect(MAGNET_RULE).toBe('Magnets pull things made of iron or steel.');
    expect(magnetExplanation(magnetItem('trumpet'))).toBe(`The trumpet is made of brass. ${MAGNET_RULE}`);
    expect(magnetExplanation(magnetItem('scissors'))).toBe(`The scissors are made of steel. ${MAGNET_RULE}`);
    expect(magnetVerdict(magnetItem('paper-clip'))).toMatch(/^Yes! The paper clip sticks/);
    expect(magnetVerdict(magnetItem('pencil'))).toMatch(/^Not this time: the wooden pencil falls off\./);
    expect(magnetVerdict(magnetItem('scissors'))).toMatch(/scissors stick /);
  });
  it('is registered for grade 3 science only', () => {
    const m = magnetsToy.meta;
    expect([m.id, m.subject, m.stages, m.title, m.icon]).toEqual(['magnets', 'science', [3], 'Magnet Test', '🧲']);
    expect(toysFor('science', 3).map(t => t.meta.id)).toContain('magnets');
    expect(toysFor('science', 1).map(t => t.meta.id)).not.toContain('magnets');
    expect(findToy('magnets')).toBe(magnetsToy);
  });
});

describe('generateQuestions', () => {
  it('200 questions: prompt, flag from content, no back-to-back repeat, unique ids, every item used', () => {
    const qs = magnetsToy.generateQuestions(3, 200, mulberry32(5));
    expect(qs.length).toBe(200);
    qs.forEach((x, i) => {
      const it = magnetItem(x.item);
      expect(it).toBeTruthy();
      expect(x.magnetic).toBe(it.magnetic);
      expect(x.prompt).toBe(`Will the ${it.name} stick to the magnet?`);
      if (i > 0) expect(x.item).not.toBe(qs[i - 1].item);
    });
    expect(new Set(qs.map(x => x.id)).size).toBe(200);
    expect(new Set(qs.map(x => x.item)).size).toBe(MAGNET_ITEMS.length);
  });
  it('a round of 10 has both kinds', () => {
    for (let seed = 1; seed < 30; seed++) {
      const qs = magnetsToy.generateQuestions(3, 10, mulberry32(seed));
      expect(new Set(qs.map(x => x.magnetic))).toEqual(new Set([true, false]));
    }
  });
  it('returns the requested count for 0 and 1', () => {
    expect(magnetsToy.generateQuestions(3, 0, mulberry32(1)).length).toBe(0);
    expect(magnetsToy.generateQuestions(3, 1, mulberry32(1)).length).toBe(1);
  });
});

describe('check / describe / explain', () => {
  it('accepts the right answer, hints with the rule otherwise', () => {
    expect(magnetsToy.check(q('paper-clip'), 'yes')).toEqual({ correct: true });
    expect(magnetsToy.check(q('pencil'), 'no')).toEqual({ correct: true });
    expect(magnetsToy.check(q('paper-clip'), 'no')).toEqual({ correct: false, hint: MAGNET_RULE });
    expect(magnetsToy.check(q('trumpet'), 'yes')).toEqual({ correct: false, hint: MAGNET_RULE });
    const none = magnetsToy.check(q(), null);
    expect(none.correct).toBe(false);
    expect(none.hint).toMatch(/Yes or No/);
  });
  it('describeAnswer', () => {
    expect(magnetsToy.describeAnswer(q(), 'yes')).toBe('You said Yes, it will stick');
    expect(magnetsToy.describeAnswer(q(), 'no')).toBe('You said No, it will not stick');
    expect(magnetsToy.describeAnswer(q(), null)).toBe('You did not choose yet');
  });
  it('explain names the material and the rule', () => {
    expect(magnetsToy.explain(q('log'), 'yes')).toEqual({
      why: 'You said Yes, it will stick.',
      how: `The log is made of wood. ${MAGNET_RULE}`,
    });
    expect(magnetsToy.explain(q(), null).why).toBe('You did not choose yet.');
  });
});

describe('explore', () => {
  it('shows six things, three that stick and three that do not, and nothing is spoken', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const v = magnetsToy.explore(el, ctx);
    const tiles = [...el.querySelectorAll<HTMLElement>('[data-role="thing"]')];
    expect(tiles.length).toBe(6);
    expect(tiles.filter(t => magnetItem(t.dataset.id!).magnetic).length).toBe(3);
    expect($(el, 'magnet')).toBeTruthy();
    expect(ctx.spoken).toEqual([]);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('tapping a magnetic thing snaps it on; a non-magnetic one falls off; the text names the material', () => {
    const el = document.createElement('div');
    const v = magnetsToy.explore(el, mkCtx());
    const tiles = [...el.querySelectorAll<HTMLElement>('[data-role="thing"]')];
    const yes = tiles.find(t => magnetItem(t.dataset.id!).magnetic)!;
    const no = tiles.find(t => !magnetItem(t.dataset.id!).magnetic)!;
    expect($(el, 'object').dataset.state).toBe('ready');
    yes.click();
    expect($(el, 'object').dataset.state).toBe('stuck');
    expect($(el, 'object').textContent).toBe(magnetItem(yes.dataset.id!).emoji);
    expect($(el, 'feedback').textContent).toBe(magnetVerdict(magnetItem(yes.dataset.id!)));
    expect(yes.dataset.result).toBe('stuck');
    no.click();
    expect($(el, 'object').dataset.state).toBe('fell');
    expect($(el, 'feedback').textContent).toBe(magnetVerdict(magnetItem(no.dataset.id!)));
    expect($(el, 'feedback').textContent).toContain('made of');
    expect(no.dataset.result).toBe('fell');
    v.destroy();
  });
  it('speaks only with autoRead (or the 🔊 button), and celebrates once when all are tried', () => {
    const quiet = mkCtx(false);
    const el = document.createElement('div');
    const v = magnetsToy.explore(el, quiet);
    const tiles = [...el.querySelectorAll<HTMLElement>('[data-role="thing"]')];
    tiles[0].click();
    expect(quiet.spoken).toEqual([]);
    $(el, 'speak').click();
    expect(quiet.spoken).toEqual([$(el, 'feedback').textContent]);
    tiles.forEach(t => t.click());
    tiles.forEach(t => t.click());
    expect(quiet.celebrate).toHaveBeenCalledTimes(1);
    expect($(el, 'feedback').textContent).toMatch(/tested them all/);
    v.destroy();

    const loud = mkCtx(true);
    const el2 = document.createElement('div');
    const v2 = magnetsToy.explore(el2, loud);
    el2.querySelector<HTMLElement>('[data-role="thing"]')!.click();
    expect(loud.spoken.length).toBe(1);
    v2.destroy();
  });
  it('New things deals again and clears the magnet', () => {
    const el = document.createElement('div');
    const v = magnetsToy.explore(el, mkCtx());
    tile(el, el.querySelector<HTMLElement>('[data-role="thing"]')!.dataset.id!).click();
    expect($(el, 'object').dataset.state).not.toBe('ready');
    $(el, 'again').click();
    expect($(el, 'object').dataset.state).toBe('ready');
    expect(el.querySelectorAll('[data-role="thing"]').length).toBe(6);
    v.destroy();
  });
  it('leaves no timers', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const v = magnetsToy.explore(el, mkCtx(true));
    el.querySelectorAll<HTMLElement>('[data-role="thing"]').forEach(t => t.click());
    expect(vi.getTimerCount()).toBe(0);
    v.destroy();
    vi.useRealTimers();
  });
  it('touch pointers are left to the page (tap is the touch path): no ghost', () => {
    const el = document.createElement('div');
    document.body.append(el);
    const v = magnetsToy.explore(el, mkCtx());
    const t = el.querySelector<HTMLElement>('[data-role="thing"]')!;
    const ev = (type: string, x: number, y: number) => {
      const e = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
      Object.defineProperty(e, 'pointerType', { value: 'touch' });
      t.dispatchEvent(e);
    };
    ev('pointerdown', 10, 300); ev('pointermove', 100, 200);
    expect(document.querySelector('[data-role="drag-ghost"]')).toBeNull();
    v.destroy();
    el.remove();
  });
  it('keeps the magnet scene and feedback in a sticky block, tiles scroll below', () => {
    const el = document.createElement('div');
    const v = magnetsToy.explore(el, mkCtx());
    const sticky = $(el, 'sticky');
    expect(sticky.classList.contains('sticky')).toBe(true);
    expect(sticky.contains($(el, 'magnet'))).toBe(true);
    expect(sticky.contains($(el, 'feedback'))).toBe(true);
    expect(sticky.contains(el.querySelector('[data-role="thing"]'))).toBe(false);
    expect(el.querySelector<HTMLElement>('[data-role="thing"]')!.classList.contains('touch-manipulation')).toBe(true);
    v.destroy();
  });
  it('dragging a thing onto the magnet tests it; dropping elsewhere does nothing', () => {
    const el = document.createElement('div');
    document.body.append(el);
    const v = magnetsToy.explore(el, mkCtx());
    const t = el.querySelector<HTMLElement>('[data-role="thing"]')!;
    const scene = $(el, 'magnet');
    scene.getBoundingClientRect = () => ({ left: 0, top: 0, right: 300, bottom: 150, width: 300, height: 150, x: 0, y: 0, toJSON() {} });
    const ev = (type: string, x: number, y: number) =>
      t.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));
    // jsdom has no PointerEvent: MouseEvent with the pointer type name carries the coordinates
    ev('pointerdown', 10, 300); ev('pointermove', 200, 400); ev('pointerup', 200, 400);
    expect($(el, 'object').dataset.state).toBe('ready');
    ev('pointerdown', 10, 300); ev('pointermove', 100, 200); ev('pointermove', 150, 60); ev('pointerup', 150, 60);
    expect(['stuck', 'fell']).toContain($(el, 'object').dataset.state);
    expect(document.querySelector('[data-role="drag-ghost"]')).toBeNull();
    v.destroy();
    el.remove();
  });
});

describe('challenge', () => {
  it('shows the object by the magnet and Yes 🧲 / No ✋ cards; no automatic speech', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const v = magnetsToy.renderChallenge(el, q('paper-clip'), ctx);
    expect($(el, 'object').textContent).toBe('📎');
    expect($(el, 'object').dataset.state).toBe('ready');
    expect([...el.querySelectorAll<HTMLElement>('[data-role="choice"]')].map(b => b.dataset.id)).toEqual(['yes', 'no']);
    expect(choice(el, 'yes').textContent).toBe('🧲Yes');
    expect(choice(el, 'no').textContent).toBe('✋No');
    expect(v.getAnswer()).toBeNull();
    expect(ctx.spoken).toEqual([]);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('choosing records the answer but never reveals the result: the object stays at rest', () => {
    for (const [id, pick] of [['paper-clip', 'yes'], ['paper-clip', 'no'], ['trumpet', 'yes'], ['trumpet', 'no']] as const) {
      const el = document.createElement('div');
      const v = magnetsToy.renderChallenge(el, q(id), mkCtx());
      choice(el, pick).click();
      expect(v.getAnswer()).toBe(pick);
      expect($(el, 'object').dataset.state, `${id} ${pick}`).toBe('ready');
      v.reset();
      expect(v.getAnswer()).toBeNull();
      expect($(el, 'object').dataset.state).toBe('ready');
      v.destroy();
    }
  });
  it('leaves no timers', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const v = magnetsToy.renderChallenge(el, q(), mkCtx());
    choice(el, 'yes').click();
    expect(vi.getTimerCount()).toBe(0);
    v.destroy();
    vi.useRealTimers();
  });
});

describe('demonstrate', () => {
  it('highlights the right card and plays the result; speaks only with autoRead', async () => {
    const el = document.createElement('div');
    document.body.append(el);
    const quiet = mkCtx(false);
    const v1 = await magnetsToy.demonstrate!(el, q('pencil'), quiet);
    expect(choice(el, 'no').dataset.highlight).toBe('correct');
    expect(choice(el, 'yes').dataset.highlight).toBeUndefined();
    expect($(el, 'object').dataset.state).toBe('fell');
    expect(quiet.spoken).toEqual([]);
    v1.destroy();
    const loud = mkCtx(true);
    const v2 = await magnetsToy.demonstrate!(el, q('paper-clip'), loud);
    expect(choice(el, 'yes').dataset.highlight).toBe('correct');
    expect($(el, 'object').dataset.state).toBe('stuck');
    expect(loud.spoken).toEqual(['It sticks!']);
    v2.destroy();
    el.remove();
  });
  it('does not speak when detached, and leaves no timers', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const view = await magnetsToy.demonstrate!(el, q(), ctx);
    expect(ctx.spoken).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    view.destroy();
    vi.useRealTimers();
  });
});
