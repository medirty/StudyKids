import type { Rng, Sfx, Stage, Speech, Toy, ToyContext, View } from './core/types';
import { parseHash, toHash, type Route } from './core/router';
import { GRADES, clearLegacyStorage, gradeDefaults, getAutoRead, getLastGrade, setAutoRead, setLastGrade } from './core/grades';
import { createSpeech } from './core/speech';
import { createSfx } from './core/sfx';
import { celebrate as defaultCelebrate } from './core/celebrate';
import { mulberry32 } from './core/rng';
import { TOYS } from './content/registry';
import { button, h } from './ui/dom';
import { renderGradeMenu } from './ui/screens/gradeMenu';
import { renderSubjectMap } from './ui/screens/subjectMap';
import { renderToyList } from './ui/screens/toyList';
import { renderToyScreen } from './ui/screens/toyScreen';

export interface AppDeps {
  speech?: Speech;
  sfx?: Sfx;
  celebrate?: () => void;
  rng?: Rng;
  toys?: Toy<any, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function startApp(root: HTMLElement, deps: AppDeps = {}): { destroy(): void } {
  const speech = deps.speech ?? createSpeech();
  const sfx = deps.sfx ?? createSfx();
  const celebrate = deps.celebrate ?? defaultCelebrate;
  const rng = deps.rng ?? mulberry32(Date.now());
  const toys = deps.toys ?? TOYS;

  const main = h('main', { class: 'w-full max-w-3xl mx-auto px-4 pb-10 flex flex-col gap-5' });
  clearLegacyStorage();
  const isOpen = (g: Stage) => toys.some(t => t.meta.stages.includes(g));

  const header = h('header', { class: 'w-full max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2' });
  const actions = h('div', { class: 'flex items-center gap-2' });
  header.append(h('span', { class: 'font-display font-bold text-xl sm:text-2xl text-amber-toy whitespace-nowrap shrink-0', text: '🌟 StudyKids' }), actions);
  root.append(header, main);

  function renderActions(grade: Stage | null) {
    actions.replaceChildren();
    if (grade === null) return;
    const toggle = h('button', {
      class: 'toy-btn font-display font-bold rounded-2xl min-h-12 min-w-12 px-3 py-2 text-base sm:text-lg inline-flex items-center justify-center gap-1 cursor-pointer select-none border-2',
      role: 'autoread-toggle', attrs: { type: 'button' },
    });
    const paint = () => {
      const on = getAutoRead(grade);
      toggle.textContent = on ? '🔊 On' : '🔇 Off';
      toggle.setAttribute('aria-pressed', String(on));
      toggle.setAttribute('aria-label', `Read aloud: ${on ? 'on' : 'off'}`);
      toggle.classList.toggle('bg-mint', on);
      toggle.classList.toggle('border-mint', on);
      toggle.classList.toggle('text-white', on);
      toggle.classList.toggle('bg-white', !on);
      toggle.classList.toggle('border-slate-200', !on);
      toggle.classList.toggle('text-slate-700', !on);
    };
    toggle.addEventListener('click', () => {
      const next = !getAutoRead(grade);
      setAutoRead(grade, next);
      if (!next) speech.stop();
      paint();
    });
    paint();
    actions.append(button('🏠 Grades', () => go({ name: 'grades' }), 'bg-white border-2 border-slate-200 text-slate-700 !px-3 text-base sm:text-lg', 'home-grades'), toggle);
  }

  let current: View | null = null;
  let renderedHash: string | null = null;
  let destroyed = false;

  function go(route: Route, replace = false) {
    const hash = toHash(route);
    if (replace) history.replaceState(null, '', hash);
    else if (location.hash !== hash) location.hash = hash;
    render();
  }

  function render() {
    if (destroyed) return;
    let route = parseHash(location.hash);
    const raw = location.hash;
    if (route.name === 'grades' && (raw === '' || raw === '#')) {
      const last = getLastGrade();
      if (last !== null && isOpen(last)) {
        route = { name: 'subjects', grade: last };
        history.replaceState(null, '', toHash(route));
      }
    } else if (route.name === 'grades') {
      if (raw !== '#/') history.replaceState(null, '', toHash(route)); // normalise old/invalid links to #/
    } else if (!isOpen(route.grade)) {
      route = { name: 'grades' };
      history.replaceState(null, '', toHash(route));
    }
    const hash = location.hash;
    if (hash === renderedHash) return;
    renderedHash = hash;
    current?.destroy();
    current = null;
    speech.stop();
    main.replaceChildren();
    document.documentElement.scrollTop = 0;
    // The toy screen uses the full width of large screens (big clock face, side-by-side challenge).
    renderActions(route.name === 'grades' ? null : route.grade);
    for (const el of [main, header]) el.classList.toggle('lg:max-w-6xl', route.name === 'toy');

    switch (route.name) {
      case 'grades':
        current = renderGradeMenu(main, {
          openGrades: GRADES.filter(isOpen), speech,
          onPick(g) {
            setLastGrade(g);
            go({ name: 'subjects', grade: g });
          },
        });
        break;
      case 'subjects': {
        const r = route;
        current = renderSubjectMap(main, {
          stage: r.grade, toys, speech,
          hrefFor: s => toHash({ name: 'toys', grade: r.grade, subject: s as never }),
          onOpen: s => go({ name: 'toys', grade: r.grade, subject: s as never }),
        });
        break;
      }
      case 'toys': {
        const r = route;
        if (!toys.some(t => t.meta.subject === r.subject && t.meta.stages.includes(r.grade))) {
          // locked subject (no toys for this grade yet): never show an empty list
          renderedHash = null;
          go({ name: 'subjects', grade: r.grade }, true);
          return;
        }
        const mode = gradeDefaults(r.grade).defaultMode;
        current = renderToyList(main, {
          subject: r.subject, stage: r.grade, toys, speech,
          hrefFor: id => toHash({ ...r, name: 'toy', toy: id, mode }),
          onOpen: id => go({ ...r, name: 'toy', toy: id, mode }),
          onBack: () => go({ name: 'subjects', grade: r.grade }),
        });
        break;
      }
      case 'toy': {
        const r = route;
        const toy = toys.find(t => t.meta.id === r.toy);
        if (!toy || !toy.meta.stages.includes(r.grade) || toy.meta.subject !== r.subject) {
          renderedHash = null;
          go({ name: 'toys', grade: r.grade, subject: r.subject }, true);
          return;
        }
        // autoRead is read live, so the header toggle affects the next prompt/feedback even mid-round.
        const ctx: ToyContext = { stage: r.grade, get autoRead() { return getAutoRead(r.grade); }, speech, sfx, celebrate };
        current = renderToyScreen(main, {
          toy, stage: r.grade, mode: r.mode, ctx, rng,
          onHome: () => go({ name: 'subjects', grade: r.grade }),
          onBack: () => go({ name: 'toys', grade: r.grade, subject: r.subject }),
          onMode: mode => go({ ...r, mode }),
        });
        break;
      }
    }
  }

  const onHash = () => render();
  window.addEventListener('hashchange', onHash);
  render();

  return {
    destroy() {
      destroyed = true;
      window.removeEventListener('hashchange', onHash);
      current?.destroy();
      current = null;
      speech.stop();
      header.remove();
      main.remove();
    },
  };
}
