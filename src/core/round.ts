export interface Mistake<Q, A> { question: Q; firstAnswer: A }
export interface RoundResults<Q, A> { correct: number; wrong: number; mistakes: Mistake<Q, A>[] }
export type SubmitOutcome = 'correct' | 'retry' | 'reveal'; // reveal = second wrong, move on after showing answer
export interface Round<Q, A> {
  readonly index: number; readonly total: number; readonly done: boolean;
  current(): Q | null;
  submit(answer: A, correct: boolean): SubmitOutcome; // throws Error('round done') when done
  advance(): void; // only legal after 'correct' or 'reveal'; throws Error('not answered')
  results(): RoundResults<Q, A>;
}

export function createRound<Q, A>(questions: Q[]): Round<Q, A> {
  const qs = [...questions];
  let index = 0;
  let correct = 0;
  let wrong = 0;
  const mistakes: Mistake<Q, A>[] = [];
  // state of the current question
  let attempts = 0;
  let settled: SubmitOutcome | null = null; // 'correct' | 'reveal' once answered

  return {
    get index() { return index; },
    get total() { return qs.length; },
    get done() { return index >= qs.length; },
    current() { return index < qs.length ? qs[index] : null; },
    submit(answer, isCorrect) {
      if (index >= qs.length) throw new Error('round done');
      if (settled) return settled; // double-tap guard: change nothing
      attempts++;
      if (isCorrect) {
        if (attempts === 1) correct++;
        settled = 'correct';
        return 'correct';
      }
      if (attempts === 1) {
        wrong++;
        mistakes.push({ question: qs[index], firstAnswer: answer });
        return 'retry';
      }
      settled = 'reveal';
      return 'reveal';
    },
    advance() {
      if (index >= qs.length || !settled) throw new Error('not answered');
      index++;
      attempts = 0;
      settled = null;
    },
    results() {
      return { correct, wrong, mistakes: mistakes.map(m => ({ ...m })) };
    },
  };
}
