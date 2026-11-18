import type { ChallengeView, Question, Toy } from '../../src/core/types';

export interface FakeQ extends Question { id: string; prompt: string; target: number }

export const fakeToy: Toy<FakeQ, number> = {
  meta: { id: 'fake', subject: 'math', stages: [1, 3], title: 'Fake Toy', icon: '🧪', objective: 'Test toy' },
  explore(el) {
    const d = document.createElement('div');
    d.dataset.role = 'explore-body';
    d.textContent = 'explore';
    el.appendChild(d);
    return { destroy() { d.remove(); } };
  },
  generateQuestions(_stage, count) {
    return Array.from({ length: count }, (_, i) => ({ id: `q${i + 1}`, prompt: `Type ${i + 1}`, target: i + 1 }));
  },
  renderChallenge(el): ChallengeView<number> {
    const input = document.createElement('input');
    input.type = 'number';
    input.dataset.role = 'answer';
    el.appendChild(input);
    return {
      getAnswer: () => Number(input.value),
      reset: () => { input.value = ''; },
      destroy: () => input.remove(),
    };
  },
  check: (q, a) => (a === q.target ? { correct: true } : { correct: false, hint: 'Count again' }),
  describeAnswer: (_q, a) => `${a}`,
  explain: () => ({ why: 'W', how: 'H' }),
};
