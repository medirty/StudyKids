import type { Speech, Toy, ToyContext, View } from '../../core/types';
import type { RoundResults } from '../../core/round';
import { button, h } from '../dom';
import { speakButton } from '../speakButton';

export interface ResultsProps {
  toy: Toy<any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  results: RoundResults<any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  ctx: ToyContext;
  speech: Speech;
  onRetryMistakes(): void;
  onNewRound(): void;
}

export function renderResults(el: HTMLElement, props: ResultsProps): View {
  const { toy, results, ctx } = props;
  const views: View[] = [];
  let destroyed = false;

  const cards = results.mistakes.map(m => {
    const ex = toy.explain(m.question, m.firstAnswer);
    const answered = `You answered: ${toy.describeAnswer(m.question, m.firstAnswer)}`;
    const spokenPrompt = m.question.spoken ?? m.question.prompt;
    const demo = h('div', { class: 'w-full' });
    const card = h('article', { class: 'toy-card bg-white rounded-3xl border-4 border-amber-200 p-4 flex flex-col gap-2', role: 'mistake' },
      h('p', { class: 'font-display font-bold text-xl', text: m.question.prompt }),
      h('p', { text: answered }),
      h('p', {}, h('strong', { text: 'Why:' }), ` ${ex.why}`),
      h('p', {}, h('strong', { text: 'How:' }), ` ${ex.how}`),
      h('div', { class: 'flex gap-2 items-center' },
        speakButton(`${spokenPrompt}. ${answered}. ${ex.why} ${ex.how}`, props.speech),
        toy.demonstrate && button('▶ Show me', () => {
          demo.replaceChildren();
          // An explicit tap: the demo may speak even for Kakak (autoRead off). R13b
          void toy.demonstrate!(demo, m.question, { ...ctx, autoRead: true }).then(v => {
            if (destroyed) v.destroy(); else views.push(v);
          }).catch(() => {});
        }, 'bg-violet-toy text-white', 'show-me')),
      demo);
    return card;
  });

  const scoreSpoken = `${results.correct} correct. ${results.wrong} to practise.`;
  const scoreBtn = speakButton(scoreSpoken, props.speech, 'shrink-0');
  scoreBtn.dataset.role = 'speak-score';
  const wrap = h('section', { class: 'flex flex-col gap-5 w-full max-w-3xl mx-auto', role: 'results' },
    h('div', { class: 'flex items-center justify-center gap-3' },
      h('h2', { class: 'font-display font-bold text-3xl sm:text-4xl text-center', text: `⭐ ${results.correct} correct · ${results.wrong} to practise` }),
      scoreBtn),
    ...cards,
    h('div', { class: 'flex flex-wrap gap-3 justify-center' },
      results.mistakes.length > 0 && button('🔁 Retry mistakes', props.onRetryMistakes, 'bg-coral text-white text-xl', 'retry-mistakes'),
      button('▶ New round', props.onNewRound, 'bg-mint text-white text-xl', 'new-round')));
  el.append(wrap);
  if (results.correct >= 1) ctx.celebrate(); // R15: confetti on the results screen
  if (ctx.autoRead) void props.speech.speak(scoreSpoken).catch(() => {});
  return {
    destroy() {
      destroyed = true;
      views.splice(0).forEach(v => v.destroy());
      wrap.remove();
    },
  };
}
