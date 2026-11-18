import type { Sfx } from './types';

// Triangle-wave woodblock/marimba notes, matching the prototype's synth.
const FREQ = { E4: 329.63, C4: 261.63, C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.5 } as const;
const VOLUME = 0.316; // -10 dB
const TICK_MIN_GAP_MS = 45;

/**
 * Time-ordered [time, gain] points: attack .01 to peak, decay to sustain .02
 * (by 0.13s, or by note end if shorter), hold to note end, release .2 to silence.
 */
export function envelopePoints(start: number, dur: number): Array<[number, number]> {
  const sustain = VOLUME * 0.02;
  const end = start + dur;
  const decayEnd = Math.min(start + 0.13, end);
  const pts: Array<[number, number]> = [
    [start, 0.0001],
    [start + 0.01, VOLUME],
    [decayEnd, sustain],
  ];
  if (end > decayEnd) pts.push([end, sustain]);
  pts.push([end + 0.2, 0.0001]);
  return pts;
}

export function createSfx(): Sfx {
  let ctx: AudioContext | null = null;
  let lastTick = 0;

  const getCtx = (): AudioContext | null => {
    if (!ctx) {
      const Ctor =
        (globalThis as { AudioContext?: typeof AudioContext }).AudioContext ??
        (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state !== 'running') void ctx.resume().catch(() => {});
    return ctx;
  };

  const note = (c: AudioContext, freq: number, start: number, dur: number) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const [first, ...rest] = envelopePoints(start, dur);
    gain.gain.setValueAtTime(first[1], first[0]);
    for (const [t, g] of rest) gain.gain.linearRampToValueAtTime(g, t);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + dur + 0.25);
  };

  const play = (notes: Array<[number, number, number]>) => {
    try {
      const c = getCtx();
      if (!c) return;
      const t = c.currentTime;
      for (const [f, offset, dur] of notes) note(c, f, t + offset, dur);
    } catch {
      /* audio is best-effort */
    }
  };

  return {
    tick(major = false) {
      const now = performance.now();
      if (now - lastTick < TICK_MIN_GAP_MS) return;
      lastTick = now;
      play([[major ? FREQ.G5 : FREQ.C5, 0, 0.0625]]);
    },
    success() {
      play([
        [FREQ.C5, 0, 0.125],
        [FREQ.E5, 0.1, 0.125],
        [FREQ.G5, 0.2, 0.125],
        [FREQ.C6, 0.3, 0.25],
      ]);
    },
    tryAgain() {
      play([
        [FREQ.E4, 0, 0.125],
        [FREQ.C4, 0.14, 0.25],
      ]);
    },
  };
}
