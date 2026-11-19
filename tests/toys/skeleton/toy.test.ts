import { describe, it, expect, beforeAll } from 'vitest';
import { skeletonToy, type SkeletonQuestion } from '../../../src/toys/science/skeleton';
import { HOTSPOTS, VIEW_W, VIEW_H, MIN_HOTSPOT } from '../../../src/toys/science/skeleton/figure';
import {
  BONES, BONE_IDS, JOB_QUESTIONS, MOVE_NOTE, SHOULDER_BLADE_NOTE, displayName, introSentence, type BoneId,
} from '../../../src/content/science/skeleton';
import { toysFor } from '../../../src/content/registry';
import { mulberry32 } from '../../../src/core/rng';
import type { ToyContext } from '../../../src/core/types';

const nameQ = (b: BoneId): SkeletonQuestion => ({
  id: 'q1', prompt: `Tap the ${BONES[b].name}`, spoken: `Tap the ${BONES[b].name}`, kind: 'name', target: b, accepts: [b],
});
const jobQ = (b: BoneId): SkeletonQuestion => ({
  id: 'q1', prompt: JOB_QUESTIONS[b].prompt, spoken: JOB_QUESTIONS[b].prompt, kind: 'job', target: b, accepts: [...JOB_QUESTIONS[b].accepts],
});
const mkCtx = (autoRead = false): ToyContext & { spoken: string[] } => {
  const c = {
    stage: 3 as const, autoRead, spoken: [] as string[],
    speech: { speak: async (t: string) => { c.spoken.push(t); }, stop() {}, available: true },
    sfx: { tick() {}, success() {}, tryAgain() {} },
    celebrate() {},
  };
  return c;
};
const bone = (el: HTMLElement, id: string) => el.querySelector<HTMLElement>(`[data-role="bone"][data-bone="${id}"]`)!;
const boneIds = (el: HTMLElement) => new Set([...el.querySelectorAll<HTMLElement>('[data-role="bone"]')].map(b => b.dataset.bone));

describe('content and meta', () => {
  it('has the bones of the brief (shoulder blade left out because it is hidden from the front)', () => {
    expect([...BONE_IDS]).toEqual([
      'skull', 'jaw', 'spine', 'ribs', 'collarbone', 'pelvis', 'armBones', 'handBones', 'thighBone', 'kneecap', 'shinBones', 'footBones',
    ]);
    expect(SHOULDER_BLADE_NOTE).toMatch(/shoulder blades are on our back/);
  });
  it('uses UK textbook names', () => {
    expect(BONES.spine.name).toBe('backbone');
    expect(BONES.kneecap.name).toBe('kneecap');
    expect(BONES.thighBone.name).toBe('thigh bone');
    expect(displayName('spine')).toBe('Backbone (spine)');
    expect(displayName('pelvis')).toBe('Pelvis (hips)');
    expect(displayName('thighBone')).toBe('Thigh bone (femur)');
    expect(displayName('skull')).toBe('Skull');
  });
  it('has the exact jobs from the brief', () => {
    expect(BONES.skull.job).toBe('The skull protects our brain.');
    expect(BONES.ribs.job).toBe('The ribs protect our heart and lungs.');
    expect(BONES.spine.job).toBe('The backbone holds us up and lets us bend.');
    expect(BONES.jaw.job).toBe('The jaw lets us chew and talk.');
    expect(BONES.thighBone.job).toMatch(/longest bone/);
    expect(BONES.armBones.job).toMatch(/work with muscles/);
    expect(BONES.shinBones.job).toMatch(/work with muscles/);
    expect(MOVE_NOTE).toBe('Bones work with muscles to help us move.');
  });
  it('plural-aware intros', () => {
    expect(introSentence('skull')).toBe('This is the skull.');
    expect(introSentence('ribs')).toBe('These are the ribs.');
    expect(introSentence('spine')).toBe('This is the backbone.');
    expect(introSentence('armBones')).toBe('These are the arm bones.');
    expect(introSentence('kneecap')).toBe('This is the kneecap.');
    expect(introSentence('footBones')).toBe('These are the foot bones.');
    for (const b of BONE_IDS) {
      const isAre = BONES[b].isPlural ? /^These are the / : /^This is the /;
      expect(introSentence(b)).toMatch(isAre);
      expect(BONES[b].job).toMatch(/\.$/);
    }
  });
  it('every job question has accepted bones that exist, and never names the answer', () => {
    for (const b of BONE_IDS) {
      const jq = JOB_QUESTIONS[b];
      expect(jq.accepts).toContain(b);
      for (const a of jq.accepts) expect(BONE_IDS).toContain(a);
      expect(jq.prompt).toMatch(/^Which .*\?$/);
      for (const a of jq.accepts) {
        for (const word of [BONES[a].name, BONES[a].aka].filter(Boolean) as string[]) {
          expect(jq.prompt.toLowerCase()).not.toContain(word.toLowerCase());
        }
        expect(jq.prompt.toLowerCase()).not.toContain(BONES[a].name.toLowerCase());
        expect(jq.hint.toLowerCase()).not.toContain(BONES[a].name.toLowerCase());
      }
      expect(jq.hint).toMatch(/^Look /);
      expect(jq.hint).not.toBe(BONES[b].job);
    }
    expect(JOB_QUESTIONS.ribs.prompt).toBe('Which bones protect the heart and lungs?');
    expect(JOB_QUESTIONS.pelvis.prompt).toBe('Which wide, bowl-shaped bone holds up our tummy?');
    expect(JOB_QUESTIONS.footBones.prompt).toBe('Which bones are at the bottom of our legs and help us balance?');
    expect(JOB_QUESTIONS.armBones.prompt).toBe('Which bones are between our shoulder and our wrist?');
    expect(JOB_QUESTIONS.shinBones.prompt).toBe('Which bones are between our knee and our foot?');
    expect(JOB_QUESTIONS.spine.hint).toBe('Look at the middle of your back.');
  });
  it('is registered for grade 3 science only', () => {
    const m = skeletonToy.meta;
    expect([m.id, m.subject, m.stages, m.title, m.icon]).toEqual(['skeleton', 'science', [3], 'Skeleton Builder', '💀']);
    expect(toysFor('science', 3).map(t => t.meta.id)).toContain('skeleton');
    expect(toysFor('science', 1).map(t => t.meta.id)).not.toContain('skeleton');
  });
});

// Points that are clearly inside the drawn bone (left side; paired bones are mirrored across x = 160).
const VISIBLE: Record<BoneId, [number, number][]> = {
  skull: [[160, 30], [125, 60], [195, 60], [142, 64], [178, 64], [160, 84], [160, 50]],
  jaw: [[160, 120], [135, 112], [185, 112], [160, 132], [145, 126]],
  spine: [[160, 152], [160, 200], [160, 260], [160, 296], [154, 215], [166, 215], [155, 245], [165, 275], [140, 230], [180, 230]],
  ribs: [[116, 212], [116, 252], [116, 272], [124, 216], [131, 235], [130, 255], [100, 230], [90, 260], [110, 200]],
  collarbone: [[134, 158], [118, 159], [103, 164], [92, 170]],
  pelvis: [[124, 322], [196, 322], [160, 332], [127, 356], [193, 356], [126, 330]],
  armBones: [[77, 193], [70, 219], [63, 245], [49, 300], [60, 300], [45, 325], [57, 325]],
  handBones: [[42, 358], [28, 385], [42, 385], [42, 398]],
  thighBone: [[150, 356], [140, 352], [146, 372], [143, 386], [140, 405], [137, 424]],
  kneecap: [[135, 452], [128, 446], [141, 458]],
  shinBones: [[135, 485], [135, 498], [150, 485], [150, 498]],
  footBones: [[136, 526], [122, 542], [136, 545], [150, 543], [136, 552]],
};
const MIRRORED: readonly BoneId[] = ['ribs', 'collarbone', 'armBones', 'handBones', 'thighBone', 'kneecap', 'shinBones', 'footBones'];

describe('figure', () => {
  const el = document.createElement('div');
  beforeAll(() => { skeletonToy.explore(el, mkCtx()); });
  const contains = (o: (typeof HOTSPOTS)[number], x: number, y: number) =>
    Math.abs(x - o.cx) <= o.w / 2 && Math.abs(y - o.cy) <= o.h / 2;
  const owner = (x: number, y: number) => [...HOTSPOTS].reverse().find(o => contains(o, x, y))?.part;

  it('has a hotspot for every bone and a drawn SVG', () => {
    expect(boneIds(el)).toEqual(new Set(BONE_IDS));
    expect(el.querySelector('svg')).not.toBeNull();
    expect(el.querySelectorAll('svg *').length).toBeGreaterThan(60);
    expect(el.querySelectorAll('svg').length).toBe(1);
  });
  it('each job question points at a bone that is in the SVG', () => {
    for (const b of BONE_IDS) for (const a of JOB_QUESTIONS[b].accepts) expect(boneIds(el).has(a)).toBe(true);
  });
  it('hotspots are at least 52 units (so >= 48px at the narrowest layout) and inside the drawing', () => {
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
  it('the anchor of every hotspot resolves to that bone (top-most hotspot wins)', () => {
    for (const hs of HOTSPOTS) {
      expect(`${hs.part}@${hs.ax},${hs.ay} -> ${owner(hs.ax, hs.ay)}`).toBe(`${hs.part}@${hs.ax},${hs.ay} -> ${hs.part}`);
    }
  });
  it('visible regions: several points inside every drawn bone resolve to that bone', () => {
    for (const b of BONE_IDS) {
      expect(VISIBLE[b].length).toBeGreaterThanOrEqual(3);
      for (const [x, y] of VISIBLE[b]) {
        expect(`${b} ${x},${y} -> ${owner(x, y)}`).toBe(`${b} ${x},${y} -> ${b}`);
        if (MIRRORED.includes(b)) {
          expect(`${b} ${VIEW_W - x},${y} -> ${owner(VIEW_W - x, y)}`).toBe(`${b} ${VIEW_W - x},${y} -> ${b}`);
        }
      }
    }
  });
  it('the backbone has a strip at least 48px wide down the chest, and the femur head is thigh bone', () => {
    for (const y of [200, 230, 260, 290]) {
      for (let x = 135; x <= 185; x += 5) expect(`${x},${y} -> ${owner(x, y)}`).toBe(`${x},${y} -> spine`);
    }
    const spine = HOTSPOTS.find(o => o.part === 'spine')!;
    expect(spine.w * 0.925).toBeGreaterThanOrEqual(48);
    for (const x of [150, 170]) expect(owner(x, 356)).toBe('thighBone');
    expect(Math.min(...HOTSPOTS.filter(o => o.part === 'thighBone').map(o => o.cy - o.h / 2))).toBeLessThanOrEqual(350);
  });
  it('the ribs are a full-size target: the whole 52 unit box beside the backbone is ribs, beyond the arm', () => {
    for (const y of [190, 200, 230, 260, 300]) {
      for (let x = 83; x <= 133; x += 5) {
        expect(`${x},${y} -> ${owner(x, y)}`).toBe(`${x},${y} -> ribs`);
        expect(`${VIEW_W - x},${y} -> ${owner(VIEW_W - x, y)}`).toBe(`${VIEW_W - x},${y} -> ribs`);
      }
    }
    // ... and the arm is still tappable along its length.
    for (const [x, y] of [[85, 178], [77, 193], [70, 219], [63, 245], [60, 262]]) expect(owner(x, y)).toBe('armBones');
  });
  it('the pelvis keeps its lower outer edge while the femur head is thigh bone', () => {
    for (const [x, y] of [[126, 356], [128, 360], [127, 350]]) {
      expect(`${x},${y} -> ${owner(x, y)}`).toBe(`${x},${y} -> pelvis`);
      expect(`${VIEW_W - x},${y} -> ${owner(VIEW_W - x, y)}`).toBe(`${VIEW_W - x},${y} -> pelvis`);
    }
    for (const [x, y] of [[150, 356], [145, 362], [152, 366], [140, 352]]) expect(owner(x, y)).toBe('thighBone');
  });
  it('the thick shin bone is on the inner side of each leg', () => {
    const shins = [...el.querySelectorAll('svg path')].filter(p => /^M1[35]\d 47\d L1[35]\d 51\d$/.test(p.getAttribute('d') ?? ''));
    const thick = shins.filter(p => p.getAttribute('stroke-width') === '13' && p.getAttribute('stroke') === '#8A7152').map(p => Number(/^M(\d+)/.exec(p.getAttribute('d')!)![1]));
    const thin = shins.filter(p => p.getAttribute('stroke-width') === '9' && p.getAttribute('stroke') === '#8A7152').map(p => Number(/^M(\d+)/.exec(p.getAttribute('d')!)![1]));
    expect(thick.length).toBeGreaterThan(0);
    expect(thin.length).toBeGreaterThan(0);
    expect(Math.min(...thick)).toBeGreaterThan(Math.max(...thin)); // inner side of the left leg is the larger x
  });
  it('paired bones have a left and a right hotspot; single bones one', () => {
    for (const b of BONE_IDS) {
      const n = HOTSPOTS.filter(o => o.part === b).length;
      expect(n >= 1).toBe(true);
      if (MIRRORED.includes(b)) expect(n % 2).toBe(0);
    }
    for (const b of ['skull', 'jaw', 'spine', 'pelvis'] as const) expect(HOTSPOTS.filter(o => o.part === b).length).toBe(1);
  });
  it('DOM order follows HOTSPOTS order (later = on top)', () => {
    const doms = [...el.querySelectorAll<HTMLElement>('[data-role="bone"]')].map(b => b.dataset.bone);
    expect(doms).toEqual(HOTSPOTS.map(h => h.part));
  });
});

describe('generateQuestions', () => {
  const qs = skeletonToy.generateQuestions(3, 200, mulberry32(7));
  it('returns the requested count, spoken prompts, valid targets, no consecutive repeat', () => {
    expect(qs.length).toBe(200);
    expect(skeletonToy.generateQuestions(3, 0, mulberry32(1)).length).toBe(0);
    expect(skeletonToy.generateQuestions(3, 1, mulberry32(1)).length).toBe(1);
    qs.forEach((x, i) => {
      expect(x.spoken).toBe(x.prompt);
      expect(BONE_IDS).toContain(x.target);
      expect(x.accepts).toContain(x.target);
      if (x.kind === 'name') expect(x.prompt).toBe(`Tap the ${BONES[x.target].name}`);
      else expect(x.prompt).toBe(JOB_QUESTIONS[x.target].prompt);
      if (i > 0) expect(x.target).not.toBe(qs[i - 1].target);
    });
    expect(new Set(qs.map(x => x.id)).size).toBe(200);
  });
  it('covers every bone both by name and by job', () => {
    expect(new Set(qs.filter(x => x.kind === 'name').map(x => x.target))).toEqual(new Set(BONE_IDS));
    expect(new Set(qs.filter(x => x.kind === 'job').map(x => x.target))).toEqual(new Set(BONE_IDS));
  });
  it('a ten question round has both kinds, and many different bones', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const r = skeletonToy.generateQuestions(3, 10, mulberry32(seed));
      const jobs = r.filter(x => x.kind === 'job').length;
      expect([3, 4]).toContain(jobs);
      expect(new Set(r.map(x => x.target)).size).toBe(10);
    }
  });
});

describe('check / describe / explain', () => {
  it('name questions', () => {
    expect(skeletonToy.check(nameQ('kneecap'), 'kneecap')).toEqual({ correct: true });
    expect(skeletonToy.check(nameQ('kneecap'), 'thighBone')).toEqual({ correct: false, hint: BONES.kneecap.job });
    expect(skeletonToy.check(nameQ('kneecap'), null)).toEqual({ correct: false, hint: 'Tap a bone first!' });
  });
  it('job questions use a location hint, not the job sentence', () => {
    expect(skeletonToy.check(jobQ('ribs'), 'ribs')).toEqual({ correct: true });
    expect(skeletonToy.check(jobQ('ribs'), 'skull')).toEqual({ correct: false, hint: 'Look at the sides of your chest.' });
    expect(skeletonToy.check(jobQ('spine'), 'skull').hint).toBe('Look at the middle of your back.');
    for (const b of BONE_IDS) expect(skeletonToy.check(jobQ(b), null).hint).toBe('Tap a bone first!');
  });
  it('only an accepted bone is right', () => {
    for (const t of BONE_IDS) {
      for (const a of BONE_IDS) {
        expect(skeletonToy.check(jobQ(t), a).correct).toBe(JOB_QUESTIONS[t].accepts.includes(a));
        expect(skeletonToy.check(nameQ(t), a).correct).toBe(a === t);
      }
    }
  });
  it('no hint is gentle-copy unsafe', () => {
    for (const b of BONE_IDS) expect(JSON.stringify(skeletonToy.check(nameQ(b), null))).not.toMatch(/wrong/i);
  });
  it('describeAnswer', () => {
    expect(skeletonToy.describeAnswer(nameQ('kneecap'), 'ribs')).toBe('You tapped the ribs');
    expect(skeletonToy.describeAnswer(nameQ('kneecap'), 'spine')).toBe('You tapped the backbone');
    expect(skeletonToy.describeAnswer(nameQ('kneecap'), null)).toBe('nothing yet');
  });
  it('explain is plural-aware and gives the job', () => {
    expect(skeletonToy.explain(nameQ('ribs'), 'skull')).toEqual({
      why: 'You tapped the skull.', how: 'These are the ribs. The ribs protect our heart and lungs.',
    });
    expect(skeletonToy.explain(jobQ('skull'), null)).toEqual({
      why: 'You did not tap a bone yet.', how: 'This is the skull. The skull protects our brain.',
    });
    expect(skeletonToy.explain(nameQ('spine'), 'spine').how).toBe('This is the backbone. The backbone holds us up and lets us bend.');
  });
});

describe('explore', () => {
  it('tapping a bone shows its name and job and speaks even without autoRead', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = skeletonToy.explore(el, ctx);
    bone(el, 'ribs').click();
    expect(el.querySelector('[data-role="bone-name"]')!.textContent).toBe('Ribs');
    expect(el.querySelector('[data-role="bone-intro"]')!.textContent).toBe('These are the ribs.');
    expect(el.querySelector('[data-role="bone-job"]')!.textContent).toBe('The ribs protect our heart and lungs.');
    expect(ctx.spoken).toEqual(['These are the ribs. The ribs protect our heart and lungs.']);
    expect(bone(el, 'ribs').classList.contains('is-selected')).toBe(true);
    bone(el, 'spine').click();
    expect(bone(el, 'ribs').classList.contains('is-selected')).toBe(false);
    expect(el.querySelector('[data-role="bone-name"]')!.textContent).toBe('Backbone (spine)');
    expect(el.querySelector('[data-role="bone-intro"]')!.textContent).toBe('This is the backbone.');
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('shows the muscles note and the shoulder blade note, and labels every hotspot', () => {
    const el = document.createElement('div');
    const v = skeletonToy.explore(el, mkCtx());
    expect(el.textContent).toContain(MOVE_NOTE);
    expect(el.textContent).toContain(SHOULDER_BLADE_NOTE);
    expect(bone(el, 'ribs').getAttribute('aria-label')).toBe('Ribs');
    expect(bone(el, 'spine').getAttribute('aria-label')).toBe('Backbone (spine)');
    v.destroy();
  });
});

describe('challenge', () => {
  it('tap only selects: no speech, one bone selected at a time, reset clears', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(true);
    const v = skeletonToy.renderChallenge(el, nameQ('kneecap'), ctx);
    expect(v.getAnswer()).toBeNull();
    bone(el, 'kneecap').click();
    expect(v.getAnswer()).toBe('kneecap');
    bone(el, 'footBones').click();
    expect(v.getAnswer()).toBe('footBones');
    expect(new Set([...el.querySelectorAll<HTMLElement>('.is-selected')].map(b => b.dataset.bone))).toEqual(new Set(['footBones']));
    expect(ctx.spoken).toEqual([]);
    expect(el.querySelector('[data-role="bone-name"]')).toBeNull();
    v.reset();
    expect(v.getAnswer()).toBeNull();
    expect(el.querySelectorAll('.is-selected').length).toBe(0);
    v.destroy();
    expect(el.children.length).toBe(0);
  });
  it('has no labels, names or jobs that would leak the answer', () => {
    const el = document.createElement('div');
    const ctx = mkCtx(false);
    const v = skeletonToy.renderChallenge(el, jobQ('ribs'), ctx);
    for (const b of el.querySelectorAll<HTMLElement>('[data-role="bone"]')) {
      expect(b.textContent).toBe('');
      expect(b.getAttribute('aria-label')).toBe('Bone');
    }
    expect(el.textContent).toBe('');
    expect(el.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
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
      const v = await skeletonToy.demonstrate!(el, jobQ('ribs'), ctx);
      expect(new Set([...el.querySelectorAll<HTMLElement>('.is-glow')].map(b => b.dataset.bone))).toEqual(new Set(['ribs']));
      expect(ctx.spoken).toEqual(auto ? ['These are the ribs.'] : []);
      v.destroy();
      el.remove();
    }
  });
  it('paired bones glow on both sides', async () => {
    const el = document.createElement('div');
    document.body.append(el);
    await skeletonToy.demonstrate!(el, nameQ('kneecap'), mkCtx(false));
    expect(el.querySelectorAll('.is-glow').length).toBe(2);
    el.remove();
  });
  it('does not speak or leave timers when detached', async () => {
    const el = document.createElement('div'); // never attached
    const ctx = mkCtx(true);
    const v = await skeletonToy.demonstrate!(el, nameQ('skull'), ctx);
    expect(ctx.spoken).toEqual([]);
    v.destroy();
  });
});
