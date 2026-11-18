import type { Mode, Question, Rng, Stage, Toy, ToyContext, View, ChallengeView } from '../../core/types';
import { createRound, type Round } from '../../core/round';
import { button, h } from '../dom';
import { readAloud } from '../readAloud';
import { renderResults } from './results';

export interface ToyScreenProps {
  toy: Toy<any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  stage: Stage;
  mode: Mode;
  ctx: ToyContext;
  rng: Rng;
  onHome(): void;
  onBack(): void;
  onMode(mode: Mode): void;
}

const ROUND_SIZE = 10;
const RETRY_LOCK_MS = 400;
const ADVANCE_MS = 1200;
const EXPLAIN_MAX_MS = 15000;

export function renderToyScreen(el: HTMLElement, props: ToyScreenProps): View {
  const { toy, ctx } = props;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  };
  let destroyed = false;
  let questionToken = 0;
  let bodyViews: View[] = [];
  const clearBody = () => {
    bodyViews.splice(0).forEach(v => v.destroy());
    body.replaceChildren();
  };
  const track = <T extends View>(v: T): T => { bodyViews.push(v); return v; };

  const modePill = h('div', { class: 'inline-flex rounded-full bg-sand p-1 border-2 border-amber-200' });
  for (const [m, label] of [['explore', '🧭 Explore'], ['challenge', '⭐ Challenge']] as const) {
    const on = m === props.mode;
    const b = h('button', {
      class: `font-display font-bold rounded-full min-h-12 px-4 cursor-pointer ${on ? 'bg-amber-toy text-white shadow' : 'text-slate-600'}`,
      text: label, role: 'mode', attrs: { type: 'button', 'data-mode': m, 'aria-pressed': String(on) },
    });
    b.addEventListener('click', () => { if (!on) props.onMode(m); });
    modePill.append(b);
  }

  const header = h('div', { class: 'flex flex-wrap items-center gap-2 w-full' },
    button('🏠', props.onHome, 'bg-white border-2 border-slate-200 text-2xl', 'home'),
    button('←', props.onBack, 'bg-white border-2 border-slate-200 text-2xl', 'back'),
    h('h2', { class: 'font-display font-bold text-xl sm:text-2xl flex-1 min-w-0', text: `${toy.meta.icon} ${toy.meta.title}` }),
    modePill);
  const body = h('div', { class: 'w-full' });
  const wrap = h('section', { class: 'flex flex-col gap-4 w-full' }, header, body);
  el.append(wrap);

  // ---- challenge loop ----
  function startRound(questions: Question[]) {
    let round: Round<any, any> = createRound(questions); // eslint-disable-line @typescript-eslint/no-explicit-any
    showQuestion();

    function showQuestion() {
      clearBody();
      const myToken = ++questionToken;
      if (round.done) return showResults();
      const q = round.current()!;
      const prompt = readAloud(q.prompt, ctx.speech, { auto: ctx.autoRead, spoken: q.spoken });
      const promptBox = h('div', { class: 'flex items-center gap-3 bg-white rounded-3xl border-4 border-sky-100 toy-card p-4', role: 'prompt' }, prompt.el);
      const target = (q as { target?: unknown }).target;
      if (typeof target === 'number') promptBox.dataset.target = String(target);
      const listen = button('🔊', () => { void prompt.play(); }, 'bg-white border-2 border-slate-200 text-xl rounded-full', 'speak');
      listen.setAttribute('aria-label', 'Read the question aloud');
      promptBox.append(listen);

      // Narrow: progress, prompt, toy, feedback, actions stacked. Wide landscape: toy on the left,
      // progress/prompt/feedback/actions on the right so Check stays above the fold.
      const stageBox = h('div', { class: 'bg-white rounded-3xl border-4 border-amber-100 toy-card p-3 sm:p-5 w-full overflow-hidden wide:col-start-1 wide:row-start-1 wide:row-span-4' });
      const view: ChallengeView<unknown> = toy.renderChallenge(stageBox, q, ctx);
      track(view);
      const feedback = h('div', { class: 'w-full wide:col-start-2' });
      const check = button('✅ Check', onCheck, 'bg-mint text-white text-2xl w-full py-4 disabled:opacity-50', 'check');
      const actions = h('div', { class: 'flex flex-col gap-3 w-full wide:col-start-2' }, check);
      promptBox.classList.add('wide:col-start-2');
      body.append(h('div', { class: 'flex flex-col gap-4 w-full wide:grid wide:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] wide:grid-rows-[auto_auto_auto_1fr] wide:items-start', role: 'challenge-layout' },
        h('p', { class: 'font-display font-bold text-slate-500 text-center wide:col-start-2', text: `Question ${round.index + 1} of ${round.total}`, role: 'progress' }),
        promptBox, stageBox, feedback, actions));

      let busy = false;
      function onCheck() {
        if (busy || destroyed) return;
        busy = true;
        check.disabled = true;
        const answer = view.getAnswer();
        const res = toy.check(q, answer);
        const outcome = round.submit(answer, res.correct);
        feedback.replaceChildren();
        if (outcome === 'correct') {
          ctx.sfx.success();
          ctx.celebrate();
          if (ctx.autoRead) void ctx.speech.speak('Great job!').catch(() => {});
          feedback.append(h('div', { class: 'bg-emerald-100 text-emerald-900 rounded-2xl p-4 font-display font-bold text-xl text-center', text: '🎉 Great job!' }));
          later(() => { round.advance(); showQuestion(); }, ADVANCE_MS);
        } else if (outcome === 'retry') {
          ctx.sfx.tryAgain();
          const hint = res.hint ?? 'Have another look';
          feedback.append(h('div', { class: 'bg-amber-100 text-amber-900 rounded-2xl p-4 font-display font-bold text-xl', role: 'hint', text: `🤔 Almost! ${hint}` }));
          if (ctx.autoRead) void ctx.speech.speak(hint).catch(() => {});
          later(() => { busy = false; check.disabled = false; }, RETRY_LOCK_MS);
        } else {
          const ex = toy.explain(q, answer);
          feedback.append(h('div', { class: 'bg-sky-100 text-sky-900 rounded-2xl p-4 flex flex-col gap-1', role: 'reveal' },
            h('p', { class: 'font-display font-bold text-xl', text: "Let's look together" }),
            h('p', { text: ex.how })));
          // R13c: with autoRead the explanation is spoken first; the demo (which speaks too) waits for it,
          // so its first say() does not cancel the explanation. Next/leave in between cancels the demo.
          // Safety cap in case a speech engine never reports the end of the utterance.
          const explained = ctx.autoRead
            ? Promise.race([
              ctx.speech.speak(`Let's look together. ${ex.how}`).catch(() => {}),
              new Promise<void>(r => later(r, EXPLAIN_MAX_MS)),
            ])
            : Promise.resolve();
          check.remove();
          const demonstrate = toy.demonstrate;
          if (demonstrate) {
            view.destroy();
            bodyViews = bodyViews.filter(v => v !== view);
            stageBox.replaceChildren();
            const stale = () => destroyed || myToken !== questionToken;
            void explained.then(() => {
              if (stale()) return;
              return demonstrate.call(toy, stageBox, q, ctx).then(v => {
                if (stale()) v.destroy(); else bodyViews.push(v);
              });
            }).catch(() => {});
          }
          let advanced = false;
          actions.append(button('➡️ Next', () => { if (advanced) return; advanced = true; round.advance(); showQuestion(); }, 'bg-ocean text-white text-2xl w-full py-4', 'next'));
        }
      }
    }

    function showResults() {
      const results = round.results();
      track(renderResults(body, {
        toy, results, ctx, speech: ctx.speech,
        onRetryMistakes: () => { clearBody(); startRound(results.mistakes.map(m => m.question)); },
        onNewRound: () => { clearBody(); startRound(toy.generateQuestions(props.stage, ROUND_SIZE, props.rng)); },
      }));
    }
  }

  if (props.mode === 'explore') {
    track(toy.explore(body, ctx));
  } else {
    startRound(toy.generateQuestions(props.stage, ROUND_SIZE, props.rng));
  }

  return {
    destroy() {
      destroyed = true;
      ctx.speech.stop();
      timers.forEach(clearTimeout);
      timers.clear();
      bodyViews.splice(0).forEach(v => v.destroy());
      wrap.remove();
    },
  };
}
