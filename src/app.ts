import type { Rng, Sfx, Speech, Toy, ToyContext, View } from './core/types';
import { parseHash, toHash, type Route } from './core/router';
import { PROFILES, getLastProfile, setLastProfile } from './core/profiles';
import { createSpeech } from './core/speech';
import { createSfx } from './core/sfx';
import { celebrate as defaultCelebrate } from './core/celebrate';
import { mulberry32 } from './core/rng';
import { TOYS } from './content/registry';
import { button, h } from './ui/dom';
import { renderProfilePicker } from './ui/screens/profilePicker';
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
  const header = h('header', { class: 'w-full max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3' },
    h('span', { class: 'font-display font-bold text-2xl text-amber-toy', text: '🌟 StudyKids' }),
    button('👥 Switch', () => go({ name: 'profiles' }), 'bg-white border-2 border-slate-200 text-slate-700', 'switch'));
  root.append(header, main);

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
    let hash = location.hash;
    let route = parseHash(hash);
    if (route.name === 'profiles' && (hash === '' || hash === '#')) {
      const last = getLastProfile();
      if (last) {
        route = { name: 'subjects', profile: last, stage: PROFILES[last].stage };
        history.replaceState(null, '', toHash(route));
      }
    }
    hash = location.hash;
    if (hash === renderedHash) return;
    renderedHash = hash;
    current?.destroy();
    current = null;
    speech.stop();
    main.replaceChildren();
    document.documentElement.scrollTop = 0;
    // The toy screen uses the full width of large screens (big clock face, side-by-side challenge).
    for (const el of [main, header]) el.classList.toggle('lg:max-w-6xl', route.name === 'toy');

    switch (route.name) {
      case 'profiles':
        current = renderProfilePicker(main, {
          onPick(id) {
            setLastProfile(id);
            go({ name: 'subjects', profile: id, stage: PROFILES[id].stage });
          },
        });
        break;
      case 'subjects': {
        const r = route;
        current = renderSubjectMap(main, {
          stage: r.stage, toys, speech,
          hrefFor: s => toHash({ name: 'toys', profile: r.profile, stage: r.stage, subject: s as never }),
          onOpen: s => go({ name: 'toys', profile: r.profile, stage: r.stage, subject: s as never }),
          onStage: stage => go({ name: 'subjects', profile: r.profile, stage }),
        });
        break;
      }
      case 'toys': {
        const r = route;
        if (!toys.some(t => t.meta.subject === r.subject && t.meta.stages.includes(r.stage))) {
          // locked subject (no toys for this stage yet): never show an empty list
          renderedHash = null;
          go({ name: 'subjects', profile: r.profile, stage: r.stage }, true);
          return;
        }
        current = renderToyList(main, {
          subject: r.subject, stage: r.stage, toys, speech,
          hrefFor: id => toHash({ ...r, name: 'toy', toy: id, mode: PROFILES[r.profile].defaultMode }),
          onOpen: id => go({ ...r, name: 'toy', toy: id, mode: PROFILES[r.profile].defaultMode }),
          onBack: () => go({ name: 'subjects', profile: r.profile, stage: r.stage }),
        });
        break;
      }
      case 'toy': {
        const r = route;
        const toy = toys.find(t => t.meta.id === r.toy);
        if (!toy || !toy.meta.stages.includes(r.stage) || toy.meta.subject !== r.subject) {
          renderedHash = null;
          go({ name: 'toys', profile: r.profile, stage: r.stage, subject: r.subject }, true);
          return;
        }
        const ctx: ToyContext = { stage: r.stage, autoRead: PROFILES[r.profile].autoRead, speech, sfx, celebrate };
        current = renderToyScreen(main, {
          toy, stage: r.stage, mode: r.mode, ctx, rng,
          onHome: () => go({ name: 'subjects', profile: r.profile, stage: r.stage }),
          onBack: () => go({ name: 'toys', profile: r.profile, stage: r.stage, subject: r.subject }),
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
