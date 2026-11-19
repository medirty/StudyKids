import { describe, it, expect, beforeAll } from 'vitest';
import { bodySensesToy, type BodyQuestion } from '../../../src/toys/science/bodySenses';
import { HOTSPOTS, VIEW_W, VIEW_H, MIN_HOTSPOT } from '../../../src/toys/science/bodySenses/figure';
import { PARTS, PART_IDS, SENSES, senseById, type PartId } from '../../../src/content/science/body';
import { toysFor } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';

const nameQ = (part: PartId): BodyQuestion => ({
  id: 'q1', prompt: `Tap the ${PARTS[part].name}`, spoken: `Tap the ${PARTS[part].name}`, targetParts: [part], kind: 'name',
});
const senseQ = (id: 'sight' | 'hearing' | 'smell' | 'taste' | 'touch'): BodyQuestion => ({
  id: 'q1', prompt: `Which part do we use to ${senseById(id).askVerb}?`, spoken: `Which part do we use to ${senseById(id).askVerb}?`,
  targetParts: [...senseById(id).parts], kind: 'sense', senseId: id,
});
const mkCtx = (autoRead = false): ToyContext & { spoken: string[] } => {
  const c = {
    stage: 1 as const, autoRead, spoken: [] as string[],
    speech: { speak: async (t: string) => { c.spoken.push(t); }, stop() {}, available: true },
    sfx: { tick() {}, success() {}, tryAgain() {} },
    celebrate() {},
  };
  return c;
};
const part = (el: HTMLElement, id: string) => el.querySelector<HTMLElement>(`[data-role="body-part"][data-part="${id}"]`)!;
const partIds = (el: HTMLElement) => new Set([...el.querySelectorAll<HTMLElement>('[data-role="body-part"]')].map(b => b.dataset.part));

describe('content and meta', () => {
  it('has the 18 parts of the brief', () => {
    expect([...PART_IDS]).toEqual(['head', 'hair', 'eyes', 'ears', 'nose', 'mouth', 'tongue', 'neck', 'shoulders', 'arms', 'elbows', 'hands', 'fingers', 'tummy', 'knees', 'legs', 'feet', 'toes']);
    for (const id of PART_IDS) expect(PARTS[id].clue.length).toBeGreaterThan(10);
  });
  it('has five senses with the exact sentences', () => {
    expect(SENSES.map(s => s.sentence)).toEqual([
      'We see with our eyes.', 'We hear with our ears.', 'We smell with our nose.',
      'We taste with our tongue.', 'We feel (touch) with our skin.',
    ]);
    expect(SENSES.map(s => s.icon)).toEqual(['👀', '👂', '👃', '👅', '✋']);
    expect(senseById('sight').parts).toEqual(['eyes']);
    expect(senseById('hearing').parts).toEqual(['ears']);
    expect(senseById('smell').parts).toEqual(['nose']);
    expect(senseById('taste').parts).toEqual(['tongue']);
  });
  it('touch accepts hands and fingers only', () => {
    expect([...senseById('touch').parts].sort()).toEqual(['fingers', 'hands']);
  });
  it('is registered for grade 1 science', () => {
    const m = bodySensesToy.meta;
    expect([m.id, m.subject, m.stages, m.title, m.icon]).toEqual(['bodySenses', 'science', [1], 'My Body & Senses', '🧍']);
    expect(toysFor('science', 1).map(t => t.meta.id)).toContain('bodySenses');
    expect(toysFor('science', 3).map(t => t.meta.id)).not.toContain('bodySenses');
  });
});

describe('figure', () => {
  const el = document.createElement('div');
  beforeAll(() => { bodySensesToy.explore(el, mkCtx()); });
  it('has a hotspot for every part and every sense organ', () => {
    expect(partIds(el)).toEqual(new Set(PART_IDS));
    for (const s of SENSES) for (const p of s.parts) expect(partIds(el).has(p)).toBe(true);
    expect(el.querySelector('svg')).not.toBeNull();
    expect(el.querySelectorAll('svg *').length).toBeGreaterThan(30);
  });
  it('hotspots are at least 52 units (so >= 48px at the narrowest layout)', () => {
    for (const hs of HOTSPOTS) {
      expect(hs.w).toBeGreaterThanOrEqual(MIN_HOTSPOT);
      expect(hs.h).toBeGreaterThanOrEqual(MIN_HOTSPOT);
      expect(hs.cx - hs.w / 2).toBeGreaterThanOrEqual(0);
      expect(hs.cx + hs.w / 2).toBeLessThanOrEqual(VIEW_W);
      expect(hs.cy - hs.h / 2).toBeGreaterThanOrEqual(0);
      expect(hs.cy + hs.h / 2).toBeLessThanOrEqual(VIEW_H);
    }
    expect(MIN_HOTSPOT * 0.925).toBeGreaterThanOrEqual(48);
  });
  it('the visible centre of every part resolves to that part (top-most hotspot wins)', () => {
    const contains = (hs: (typeof HOTSPOTS)[number], x: number, y: number) =>
      Math.abs(x - hs.cx) <= hs.w / 2 && Math.abs(y - hs.cy) <= hs.h / 2;
    for (const hs of HOTSPOTS) {
      const top = [...HOTSPOTS].reverse().find(o => contains(o, hs.ax, hs.ay))!;
      expect(`${hs.part}@${hs.ax},${hs.ay} -> ${top.part}`).toBe(`${hs.part}@${hs.ax},${hs.ay} -> ${hs.part}`);
    }
  });
  const contains = (o: (typeof HOTSPOTS)[number], x: number, y: number) =>
    Math.abs(x - o.cx) <= o.w / 2 && Math.abs(y - o.cy) <= o.h / 2;
  const owner = (x: number, y: number) => [...HOTSPOTS].reverse().find(o => contains(o, x, y))?.part;
  it('limbs: mid upper arm, mid forearm, mid thigh and mid shin are arms/legs; joints win only near the joint', () => {
    for (const x of [95, 225]) {
      expect(owner(x, 256)).toBe('arms'); // mid upper arm (shoulder at 222, elbow at 290)
      expect(owner(x, 324)).toBe('arms'); // mid forearm (elbow at 290, hand at 358)
      expect(owner(x, 290)).toBe('elbows');
      expect(owner(x, 222)).toBe('shoulders');
    }
    for (const x of [139, 181]) {
      expect(owner(x, 376)).toBe('legs'); // mid thigh (hip ~350, knee at 430)
      expect(owner(x, 464)).toBe('legs'); // mid shin (knee at 430, foot at 498)
      expect(owner(x, 430)).toBe('knees');
      expect(owner(x, 498)).toBe('feet');
    }
  });
  it('the pink tongue is its own and outside the mouth hotspot; the hairline ends the hair hotspot', () => {
    const tongue = HOTSPOTS.find(o => o.part === 'tongue')!;
    const mouth = HOTSPOTS.find(o => o.part === 'mouth')!;
    expect(tongue.ay).toBeGreaterThan(mouth.cy + mouth.h / 2); // anchor is the pink's visual centre (y 143-168)
    expect(owner(tongue.ax, tongue.ay)).toBe('tongue');
    expect(contains(mouth, tongue.ax, tongue.ay)).toBe(false);
    const hair = HOTSPOTS.find(o => o.part === 'hair')!;
    expect(hair.cy + hair.h / 2).toBe(56);
  });
  it('visible regions: the whole smile is mouth, the pink tongue is tongue, the neck is neck', () => {
    for (const [x, y] of [[145, 136], [160, 138], [175, 136], [140, 129], [180, 129], [160, 130], [160, 142]]) {
      expect(`${x},${y} -> ${owner(x, y)}`).toBe(`${x},${y} -> mouth`);
    }
    for (const [x, y] of [[160, 150], [160, 160], [152, 158], [168, 158], [160, 166]]) {
      expect(`${x},${y} -> ${owner(x, y)}`).toBe(`${x},${y} -> tongue`);
    }
    for (const [x, y] of [[160, 180], [160, 190], [155, 200]]) {
      expect(`${x},${y} -> ${owner(x, y)}`).toBe(`${x},${y} -> neck`);
    }
    expect(owner(160, 102)).toBe('nose');
    expect(owner(160, 126)).toBe('nose'); // nose box ends at 126, the smile starts at 128
  });
  it('no dead zones: hips, thigh to knee, and the torso are covered', () => {
    for (const x of [124, 139, 154, 166, 181, 196]) {
      for (const y of [336, 345, 360, 380, 400, 405, 440]) expect(owner(x, y)).toBeDefined();
    }
    for (const y of [250, 290, 330]) expect(owner(160, y)).toBe('tummy');
  });
  it('DOM order follows HOTSPOTS order (later = on top)', () => {
    const doms = [...el.querySelectorAll<HTMLElement>('[data-role="body-part"]')].map(b => b.dataset.part);
    expect(doms).toEqual(HOTSPOTS.map(h => h.part));
  });
});

describe('generateQuestions', () => {
  const qs = bodySensesToy.generateQuestions(1, 200, mulberry32(7));
  it('returns the requested count, spoken prompts, valid targets, no consecutive repeat', () => {
    expect(qs.length).toBe(200);
    expect(bodySensesToy.generateQuestions(1, 0, mulberry32(1)).length).toBe(0);
    expect(bodySensesToy.generateQuestions(1, 1, mulberry32(1)).length).toBe(1);
    const key = (x: BodyQuestion) => `${x.kind}:${x.targetParts.join()}`;
    qs.forEach((x, i) => {
      expect(x.spoken).toBe(x.prompt);
      expect(x.targetParts.length).toBeGreaterThan(0);
      for (const p of x.targetParts) expect(PART_IDS).toContain(p);
      if (x.kind === 'name') expect(x.prompt).toBe(`Tap the ${PARTS[x.targetParts[0]].name}`);
      else expect(x.prompt).toMatch(/^Which part do we use to (see|hear|smell|taste|touch)\?$/);
      if (i > 0) expect(key(x)).not.toBe(key(qs[i - 1]));
    });
    expect(new Set(qs.map(x => x.id)).size).toBe(200);
  });
  it('covers every part by name and every sense', () => {
    expect(new Set(qs.filter(x => x.kind === 'name').map(x => x.targetParts[0]))).toEqual(new Set(PART_IDS));
    expect(new Set(qs.filter(x => x.kind === 'sense').map(x => x.senseId))).toEqual(new Set(SENSES.map(s => s.id)));
  });
  it('a ten question round has 3 or 4 sense questions (both counts happen)', () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const r = bodySensesToy.generateQuestions(1, 10, mulberry32(seed));
      const n = r.filter(x => x.kind === 'sense').length;
      expect([3, 4]).toContain(n);
      seen.add(n);
    }
    expect(seen).toEqual(new Set([3, 4]));
  });
});

describe('check / describe / explain', () => {
  it('name questions', () => {
    expect(bodySensesToy.check(nameQ('knees'), 'knees')).toEqual({ correct: true });
    expect(bodySensesToy.check(nameQ('knees'), 'legs')).toEqual({ correct: false, hint: PARTS.knees.clue });
    expect(bodySensesToy.check(nameQ('knees'), null)).toEqual({ correct: false, hint: 'Tap a part of the body first!' });
  });
  it('sense questions use the sentence as hint', () => {
    expect(bodySensesToy.check(senseQ('smell'), 'nose')).toEqual({ correct: true });
    expect(bodySensesToy.check(senseQ('smell'), 'mouth')).toEqual({ correct: false, hint: 'We smell with our nose.' });
    expect(bodySensesToy.check(senseQ('sight'), 'ears').hint).toBe('We see with our eyes.');
  });
  it('touch accepts hands and fingers, not other skin', () => {
    expect(bodySensesToy.check(senseQ('touch'), 'hands').correct).toBe(true);
    expect(bodySensesToy.check(senseQ('touch'), 'fingers').correct).toBe(true);
    for (const p of PART_IDS.filter(x => x !== 'hands' && x !== 'fingers')) {
      expect(bodySensesToy.check(senseQ('touch'), p).correct).toBe(false);
    }
    expect(bodySensesToy.check(senseQ('touch'), 'feet').hint).toBe('We feel with our skin. Try our hands!');
  });
  it('describeAnswer', () => {
    expect(bodySensesToy.describeAnswer(nameQ('knees'), 'legs')).toBe('You tapped the legs');
    expect(bodySensesToy.describeAnswer(nameQ('knees'), null)).toBe('nothing yet');
  });
  it('explain uses This is / These are correctly', () => {
    const how = (p: PartId) => bodySensesToy.explain(nameQ(p), null).how;
    expect(how('head')).toBe(`This is the head. ${PARTS.head.clue}`);
    expect(how('hair')).toBe(`This is the hair. ${PARTS.hair.clue}`);
    expect(how('tummy')).toBe(`This is the tummy. ${PARTS.tummy.clue}`);
    expect(how('knees')).toBe(`These are the knees. ${PARTS.knees.clue}`);
    expect(how('eyes')).toMatch(/^These are the eyes\./);
  });
  it('explain', () => {
    expect(bodySensesToy.explain(nameQ('knees'), 'legs')).toEqual({
      why: 'You tapped the legs.', how: `These are the knees. ${PARTS.knees.clue}`,
    });
    expect(bodySensesToy.explain(nameQ('knees'), null).why).toBe('You did not tap a part yet.');
    expect(bodySensesToy.explain(senseQ('taste'), 'nose').how).toBe('We taste with our tongue.');
    expect(bodySensesToy.explain(senseQ('touch'), 'hands').how).toBe('We feel with our skin. Try our hands!');
  });
});

describe('explore', () => {
  it('tapping a part speaks and shows its name even without autoRead', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = bodySensesToy.explore(el, ctx);
    part(el, 'knees').click();
    expect(ctx.spoken).toEqual(['Knees']);
    expect(el.querySelector('[data-role="part-name"]')!.textContent).toBe('Knees');
    expect(part(el, 'knees').classList.contains('is-selected')).toBe(true);
    part(el, 'ears').click();
    expect(part(el, 'knees').classList.contains('is-selected')).toBe(false);
    expect(ctx.spoken).toEqual(['Knees', 'Ears']);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('senses tab: five icons, tapping glows the organ and speaks the sentence', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = bodySensesToy.explore(el, ctx);
    (el.querySelector('[data-role="tab"][data-tab="senses"]') as HTMLElement).click();
    const icons = [...el.querySelectorAll<HTMLElement>('[data-role="sense"]')];
    expect(icons.map(i => i.dataset.sense)).toEqual(['sight', 'hearing', 'smell', 'taste', 'touch']);
    expect(icons.map(i => i.querySelector('[data-role="sense-icon"]')!.textContent)).toEqual(['👀', '👂', '👃', '👅', '✋']);
    icons[2].click();
    expect(el.querySelector('[data-role="sentence"]')!.textContent).toBe('We smell with our nose.');
    expect(ctx.spoken).toEqual(['We smell with our nose.']);
    const glowing = [...el.querySelectorAll<HTMLElement>('[data-role="body-part"].is-glow')].map(b => b.dataset.part);
    expect(glowing).toEqual(['nose']);
    icons[4].click();
    expect(el.querySelector('[data-role="sentence"]')!.textContent).toBe('We feel (touch) with our skin.');
    expect(ctx.spoken[1]).toBe('We feel with our skin. That is touch.');
    expect(new Set([...el.querySelectorAll<HTMLElement>('[data-role="body-part"].is-glow')].map(b => b.dataset.part))).toEqual(new Set(['hands', 'fingers']));
    expect(el.querySelectorAll('[data-role="body-part"].is-glow').length).toBe(4); // two hands, two sets of fingers
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('switching back to the body tab restores the interactive figure', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = bodySensesToy.explore(el, ctx);
    (el.querySelector('[data-tab="senses"]') as HTMLElement).click();
    (el.querySelector('[data-tab="body"]') as HTMLElement).click();
    expect(el.querySelector('[data-role="sense"]')).toBeNull();
    part(el, 'nose').click();
    expect(ctx.spoken).toEqual(['Nose']);
    v.destroy();
  });
});

describe('challenge', () => {
  it('tap only selects: no speech, one selection at a time, reset clears', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const v = bodySensesToy.renderChallenge(el, nameQ('knees'), ctx);
    expect(v.getAnswer()).toBeNull();
    part(el, 'knees').click();
    expect(v.getAnswer()).toBe('knees');
    part(el, 'feet').click();
    expect(v.getAnswer()).toBe('feet');
    // a part with a left and a right hotspot (feet) is selected as one part
    expect(new Set([...el.querySelectorAll<HTMLElement>('.is-selected')].map(b => b.dataset.part))).toEqual(new Set(['feet']));
    expect(ctx.spoken).toEqual([]);
    expect(el.querySelector('[data-role="part-name"]')).toBeNull();
    v.reset();
    expect(v.getAnswer()).toBeNull();
    expect(el.querySelectorAll('.is-selected').length).toBe(0);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('has no text labels that would leak the answer (the shell owns the prompt 🔊)', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = bodySensesToy.renderChallenge(el, senseQ('smell'), ctx);
    for (const b of el.querySelectorAll<HTMLElement>('[data-role="body-part"]')) {
      expect(b.textContent).toBe('');
      expect(b.getAttribute('aria-label')).toBe('Body part');
    }
    expect(el.querySelector('[data-role="speak"]')).toBeNull();
    expect(ctx.spoken).toEqual([]);
    v.destroy();
  });
});

describe('demonstrate', () => {
  it('glows the answer; speaks only with autoRead', async () => {
    for (const auto of [false, true]) {
      const el = document.createElement('div');
      document.body.append(el);
      const ctx = mkCtx(auto);
      const v = await bodySensesToy.demonstrate!(el, senseQ('touch'), ctx);
      expect(new Set([...el.querySelectorAll<HTMLElement>('.is-glow')].map(b => b.dataset.part))).toEqual(new Set(['hands', 'fingers']));
      expect(ctx.spoken).toEqual(auto ? ['That is our hands.'] : []);
      v.destroy();
      el.remove();
    }
  });
  it('name question speaks the part name with autoRead', async () => {
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = mkCtx(true);
    await bodySensesToy.demonstrate!(el, nameQ('knees'), ctx);
    expect(ctx.spoken).toEqual(['Knees']);
    el.remove();
  });
  it('does not speak or leave timers when detached', async () => {
    const el = document.createElement('div'); // never attached
    const ctx = mkCtx(true);
    const v = await bodySensesToy.demonstrate!(el, nameQ('knees'), ctx);
    expect(ctx.spoken).toEqual([]);
    v.destroy();
  });
});
