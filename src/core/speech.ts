import type { Speech } from './types';

type VoiceLike = Pick<SpeechSynthesisVoice, 'lang' | 'localService' | 'name'>;

const isEn = (v: VoiceLike) => v.lang.toLowerCase().startsWith('en');
const isGB = (v: VoiceLike) => v.lang.toLowerCase().replace('_', '-') === 'en-gb';

/** en-GB local → any en-* local → any en-* → null (browser default). */
export function pickVoice<T extends VoiceLike>(voices: T[]): T | null {
  return (
    voices.find((v) => isGB(v) && v.localService) ??
    voices.find((v) => isEn(v) && v.localService) ??
    voices.find(isEn) ??
    null
  );
}

export function createSpeech(
  synth: SpeechSynthesis | undefined = (globalThis as { speechSynthesis?: SpeechSynthesis }).speechSynthesis,
): Speech {
  if (!synth) {
    return { available: false, speak: () => Promise.resolve(), stop: () => {} };
  }

  let finishCurrent: (() => void) | null = null;

  const settleCurrent = () => {
    const f = finishCurrent;
    finishCurrent = null;
    f?.();
  };

  return {
    available: true,
    speak(text, opts) {
      settleCurrent(); // superseded speak must not hang
      return new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          if (finishCurrent === finish) finishCurrent = null;
          resolve();
        };
        finishCurrent = finish;
        try {
          synth.cancel();
          const u = new SpeechSynthesisUtterance(text);
          const voice = pickVoice(synth.getVoices());
          if (voice) u.voice = voice as SpeechSynthesisVoice;
          u.lang = voice?.lang ?? 'en-GB';
          u.rate = 0.92;
          u.pitch = 1.1;
          u.onend = finish;
          u.onerror = finish;
          if (opts?.onWord) {
            const onWord = opts.onWord;
            u.onboundary = (e) => {
              if (e.name === 'word' && !done) onWord(e.charIndex);
            };
          }
          synth.speak(u);
        } catch {
          finish();
        }
      });
    },
    stop() {
      settleCurrent();
      try {
        synth.cancel();
      } catch {
        /* ignore */
      }
    },
  };
}
