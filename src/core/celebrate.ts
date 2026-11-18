import confetti from 'canvas-confetti';

export function celebrate(): void {
  try {
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    void confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
  } catch {
    /* celebration is best-effort */
  }
}
