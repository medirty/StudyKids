export type Rng = () => number; // [0,1)
export type Stage = 1 | 3;
export type SubjectId = 'math' | 'english' | 'science' | 'gp' | 'wellbeing' | 'art' | 'music' | 'computing';
export type Mode = 'explore' | 'challenge';
// prompt: shown (and spoken unless `spoken` is set). spoken: words for symbol-heavy prompts ("4 times 3").
export interface Question { id: string; prompt: string; spoken?: string }
export interface CheckResult { correct: boolean; hint?: string }
export interface Explanation { why: string; how: string }
export interface Speech { speak(text: string, opts?: { onWord?: (charIndex: number) => void }): Promise<void>; stop(): void; available: boolean }
export interface Sfx { tick(major?: boolean): void; success(): void; tryAgain(): void }
export interface ToyContext { stage: Stage; autoRead: boolean; speech: Speech; sfx: Sfx; celebrate(): void }
export interface View { destroy(): void }
export interface ChallengeView<A> extends View { getAnswer(): A; reset(): void }
export interface Toy<Q extends Question = Question, A = unknown> {
  meta: { id: string; subject: SubjectId; stages: Stage[]; title: string; icon: string; objective: string };
  explore(el: HTMLElement, ctx: ToyContext): View;
  generateQuestions(stage: Stage, count: number, rng: Rng): Q[];
  renderChallenge(el: HTMLElement, q: Q, ctx: ToyContext): ChallengeView<A>;
  check(q: Q, answer: A): CheckResult;
  describeAnswer(q: Q, answer: A): string; // "You made 4:15 (15 past 4)"
  explain(q: Q, answer: A): Explanation;
  demonstrate?(el: HTMLElement, q: Q, ctx: ToyContext): Promise<View>; // renders and animates the correct answer
}
