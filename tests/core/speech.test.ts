import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pickVoice, createSpeech } from '../../src/core/speech';
import { createSfx } from '../../src/core/sfx';
import { celebrate } from '../../src/core/celebrate';

type V = { lang: string; localService: boolean; name: string };
const v = (lang: string, localService: boolean, name = lang): V => ({ lang, localService, name });

describe('pickVoice', () => {
  it('prefers local en-GB', () => {
    const list = [v('en-US', false), v('id-ID', true), v('en-GB', true)];
    expect(pickVoice(list)).toBe(list[2]);
  });
  it('falls back to any local en, then any en, then null', () => {
    const a = [v('en-US', false), v('en-AU', true), v('id-ID', true)];
    expect(pickVoice(a)).toBe(a[1]);
    const b = [v('id-ID', true), v('en-US', false)];
    expect(pickVoice(b)).toBe(b[1]);
    expect(pickVoice([v('id-ID', true)])).toBeNull();
  });
});

class FakeUtterance {
  rate = 1; pitch = 1; lang = ''; voice: unknown = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onboundary: ((e: { name: string; charIndex: number }) => void) | null = null;
  constructor(public text: string) {}
}

function fakeSynth(voices: V[] = []) {
  const spoken: FakeUtterance[] = [];
  const listeners: Record<string, Array<() => void>> = {};
  const synth = {
    spoken,
    voices,
    speak: vi.fn((u: FakeUtterance) => { spoken.push(u); }),
    cancel: vi.fn(),
    getVoices: () => synth.voices,
    addEventListener: (n: string, f: () => void) => { (listeners[n] ??= []).push(f); },
    fire: (n: string) => (listeners[n] ?? []).forEach((f) => f()),
  };
  return synth;
}

beforeEach(() => {
  (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = FakeUtterance;
});

const make = (s: ReturnType<typeof fakeSynth>) => createSpeech(s as unknown as SpeechSynthesis);
const settled = async (p: Promise<void>) => {
  let done = false;
  void p.then(() => { done = true; });
  await Promise.resolve(); await Promise.resolve();
  return done;
};

describe('createSpeech', () => {
  it('is unavailable and silent without speechSynthesis', async () => {
    const s = createSpeech(undefined);
    expect(s.available).toBe(false);
    await expect(s.speak('hi')).resolves.toBeUndefined();
    expect(() => s.stop()).not.toThrow();
  });

  it('resolves on end and cancels previous', async () => {
    const synth = fakeSynth();
    const sp = make(synth);
    expect(sp.available).toBe(true);
    const p1 = sp.speak('a');
    const p2 = sp.speak('b');
    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.cancel.mock.invocationCallOrder[1]).toBeLessThan(synth.speak.mock.invocationCallOrder[1]);
    await p1; // superseded, must resolve
    expect(await settled(p2)).toBe(false);
    const u = synth.spoken[1];
    expect(u.rate).toBe(0.92);
    expect(u.pitch).toBe(1.1);
    expect(u.lang).toBe('en-GB');
    u.onend!();
    await p2;
  });

  it('resolves even if onerror fires', async () => {
    const synth = fakeSynth();
    const p = make(synth).speak('a');
    synth.spoken[0].onerror!();
    await p;
  });

  it('stop() resolves a pending speak', async () => {
    const synth = fakeSynth();
    const sp = make(synth);
    const p = sp.speak('a');
    sp.stop();
    await p;
    expect(synth.cancel).toHaveBeenCalled();
  });

  it('a stale utterance ending late does not resolve the newer speak', async () => {
    const synth = fakeSynth();
    const sp = make(synth);
    sp.speak('a');
    const p2 = sp.speak('b');
    synth.spoken[0].onend!();
    expect(await settled(p2)).toBe(false);
    synth.spoken[1].onend!();
    await p2;
  });

  it('onWord receives charIndex from boundary events', () => {
    const synth = fakeSynth();
    const onWord = vi.fn();
    void make(synth).speak('hello there', { onWord });
    const u = synth.spoken[0];
    u.onboundary!({ name: 'word', charIndex: 3 });
    u.onboundary!({ name: 'sentence', charIndex: 9 });
    expect(onWord).toHaveBeenCalledTimes(1);
    expect(onWord).toHaveBeenCalledWith(3);
  });

  it('uses voices that load late', () => {
    const synth = fakeSynth([]);
    const sp = make(synth);
    void sp.speak('a');
    expect(synth.spoken[0].voice).toBeNull();
    expect(synth.spoken[0].lang).toBe('en-GB');
    const gb = v('en-AU', true, 'Karen');
    synth.voices = [v('id-ID', true), gb];
    synth.fire('voiceschanged');
    void sp.speak('b');
    expect(synth.spoken[1].voice).toBe(gb);
    expect(synth.spoken[1].lang).toBe('en-AU');
  });
});

describe('sfx and celebrate without audio/canvas', () => {
  it('do not throw when AudioContext is unavailable', () => {
    const sfx = createSfx();
    expect(() => { sfx.tick(); sfx.tick(true); sfx.success(); sfx.tryAgain(); }).not.toThrow();
  });
  it('celebrate does not throw in jsdom', () => {
    expect(() => celebrate()).not.toThrow();
  });
});
