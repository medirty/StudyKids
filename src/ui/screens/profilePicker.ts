import type { View } from '../../core/types';
import { PROFILES, type ProfileId } from '../../core/profiles';
import { displayProfile } from '../../core/profileCustom';
import { h } from '../dom';
import { openProfileEditor } from './profileEditor';

export const HOLD_MS = 2000;
/** A press this long is a failed hold, never a tap: its release must not select the profile. */
const TAP_MAX_MS = 600;
const MOVE_TOLERANCE_PX = 12;
/** After a non-tap press, swallow the click that may follow for this long (not forever). */
const SUPPRESS_MS = 400;

export function renderProfilePicker(el: HTMLElement, props: { onPick(id: ProfileId): void; storage?: Storage }): View {
  const grid = h('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl mx-auto' });
  const colours: Record<ProfileId, string> = { adik: 'bg-coral', kakak: 'bg-ocean' };
  const wrap = h('section', { class: 'flex flex-col items-center gap-6 pt-4' },
    h('h1', { class: 'font-display font-bold text-3xl sm:text-4xl text-slate-700 text-center', text: "Who's playing? 👋" }),
    grid);
  el.append(wrap);

  let editor: View | null = null;
  // Holding Space/Enter keeps auto-repeating after focus moves into the dialog's name input;
  // swallow those repeats (until the key is released) so they type nothing.
  let repeatGuard = false;
  const onDocKeydown = (e: KeyboardEvent) => {
    if (repeatGuard && e.repeat && (e.key === ' ' || e.key === 'Enter')) e.preventDefault();
  };
  const onDocKeyup = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') repeatGuard = false; };
  document.addEventListener('keydown', onDocKeydown, true);
  document.addEventListener('keyup', onDocKeyup, true);
  const resetters: (() => void)[] = [];
  const cancelAllHolds = () => resetters.splice(0).forEach(fn => fn());

  function build() {
    cancelAllHolds();
    grid.replaceChildren();
    for (const id of Object.keys(PROFILES) as ProfileId[]) grid.append(buildCard(id));
  }

  function buildCard(id: ProfileId): HTMLElement {
    const d = displayProfile(id, props.storage);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 40 40');
    svg.setAttribute('class', 'absolute -inset-3 w-[calc(100%+1.5rem)] h-[calc(100%+1.5rem)] pointer-events-none -rotate-90');
    svg.setAttribute('aria-hidden', 'true');
    svg.dataset.role = 'hold-ring';
    svg.style.display = 'none';
    const arc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    for (const [k, v] of Object.entries({ cx: '20', cy: '20', r: '18', fill: 'none', stroke: 'white', 'stroke-width': '2.5', 'stroke-linecap': 'round', pathLength: '100', class: 'hold-ring-arc' })) arc.setAttribute(k, v);
    svg.append(arc);

    const nameEl = h('span', {
      class: `font-display font-bold ${d.name.length > 10 ? 'text-2xl' : d.name.length > 8 ? 'text-3xl' : 'text-4xl'} max-w-full text-center [overflow-wrap:anywhere]`,
      text: d.name,
    });
    const card = h('button', {
      class: `hold-card toy-btn toy-card ${colours[id]} text-white rounded-3xl p-6 sm:p-10 flex flex-col items-center gap-3 cursor-pointer min-h-48 min-w-0`,
      role: 'profile-card',
      attrs: { type: 'button', 'data-profile': id },
    },
      h('span', { class: 'relative text-7xl sm:text-8xl leading-none' }, h('span', { text: d.emoji }), svg),
      nameEl);

    let timer: ReturnType<typeof setTimeout> | null = null;
    let startedAt = 0;
    let startX = 0, startY = 0;
    let pointerHold = false;
    let keyHold = false;
    let suppressUntil = 0;
    let pressActive = false;
    let moved = false;

    const stopTimer = () => {
      if (timer !== null) { clearTimeout(timer); timer = null; }
      svg.style.display = 'none';
    };
    const reset = () => { stopTimer(); pointerHold = false; keyHold = false; };
    const start = () => {
      startedAt = Date.now();
      svg.style.display = 'block';
      timer = setTimeout(() => {
        timer = null;
        svg.style.display = 'none';
        pointerHold = false; // the release after an opened editor is not a tap either
        keyHold = false;
        editor?.destroy();
        editor = openProfileEditor(el, id, {
          storage: props.storage,
          onDone: () => { editor = null; build(); grid.querySelector<HTMLElement>(`[data-profile="${id}"]`)?.focus(); },
        });
      }, HOLD_MS);
    };
    card.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      reset();
      suppressUntil = 0;
      pressActive = true;
      moved = false;
      pointerHold = true;
      startX = e.clientX; startY = e.clientY;
      start();
    });
    card.addEventListener('pointermove', e => {
      if (pressActive && Math.hypot(e.clientX - startX, e.clientY - startY) > MOVE_TOLERANCE_PX) { moved = true; reset(); }
    });
    card.addEventListener('pointerup', () => {
      if (!pressActive) return;
      pressActive = false;
      // moved too far or held too long: not a tap, so the click that follows must not select
      if (moved || Date.now() - startedAt > TAP_MAX_MS) suppressUntil = Date.now() + SUPPRESS_MS;
      reset();
    });
    const endPress = () => { pressActive = false; reset(); };
    card.addEventListener('pointerleave', endPress);
    card.addEventListener('pointercancel', endPress);
    card.addEventListener('contextmenu', e => e.preventDefault());
    card.addEventListener('click', () => {
      if (Date.now() < suppressUntil) { suppressUntil = 0; return; }
      props.onPick(id);
    });

    // Keyboard: holding Enter/Space opens the editor; a shorter press activates the card as usual.
    card.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault(); // we activate on keyup ourselves
      if (e.repeat || keyHold || pointerHold) return;
      keyHold = true;
      repeatGuard = true;
      start();
    });
    card.addEventListener('keyup', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (!keyHold) return;
      reset();
      props.onPick(id);
    });
    card.addEventListener('blur', reset);

    resetters.push(reset);
    return card;
  }

  build();
  return {
    destroy: () => {
      document.removeEventListener('keydown', onDocKeydown, true);
      document.removeEventListener('keyup', onDocKeyup, true);
      cancelAllHolds();
      editor?.destroy();
      editor = null;
      wrap.remove();
    },
  };
}
