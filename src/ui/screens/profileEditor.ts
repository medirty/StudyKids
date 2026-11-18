import type { View } from '../../core/types';
import type { ProfileId } from '../../core/profiles';
import { PROFILES } from '../../core/profiles';
import { MAX_NAME_CHARS, AVATARS, displayProfile, getCustom, resetCustom, sanitiseName, setCustom } from '../../core/profileCustom';
import { button, h } from '../dom';

export interface ProfileEditorOpts { onDone(saved: boolean): void; storage?: Storage }

export function openProfileEditor(host: HTMLElement, id: ProfileId, opts: ProfileEditorOpts): View {
  const current = displayProfile(id, opts.storage);
  const customName = getCustom(opts.storage)[id]?.name ?? '';
  let selected = current.emoji;
  let closed = false;
  const previousFocus = document.activeElement as HTMLElement | null;

  const input = h('input', {
    class: 'w-full min-h-12 rounded-2xl border-2 border-slate-300 px-4 text-2xl font-display font-semibold text-slate-800 bg-white select-text',
    role: 'name-input',
    attrs: { type: 'text', placeholder: PROFILES[id].name, 'aria-label': 'Name', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false' },
  });
  input.value = customName;
  // maxlength counts UTF-16 units; names are limited by code points, like sanitiseName.
  input.addEventListener('input', () => {
    const cps = Array.from(input.value);
    if (cps.length > MAX_NAME_CHARS) input.value = cps.slice(0, MAX_NAME_CHARS).join('');
  });

  const avatarRow = h('div', { class: 'grid grid-cols-4 gap-2', attrs: { role: 'group', 'aria-label': 'Avatar' } });
  const avatarBtns = AVATARS.map(emoji => {
    const b = h('button', {
      class: 'toy-btn rounded-2xl min-h-14 text-4xl flex items-center justify-center cursor-pointer border-4',
      text: emoji,
      role: 'avatar',
      attrs: { type: 'button', 'data-emoji': emoji, 'aria-label': `Avatar ${emoji}` },
    });
    b.addEventListener('click', () => { selected = emoji; paint(); });
    avatarRow.append(b);
    return b;
  });
  function paint() {
    for (const b of avatarBtns) {
      const on = b.dataset.emoji === selected;
      b.setAttribute('aria-pressed', String(on));
      b.className = `toy-btn rounded-2xl min-h-14 text-4xl flex items-center justify-center cursor-pointer border-4 ${on ? 'border-amber-toy bg-amber-100' : 'border-transparent bg-white'}`;
    }
  }
  paint();

  const finish = (saved: boolean) => {
    if (closed) return;
    close();
    opts.onDone(saved);
  };
  const save = button('Save', () => {
    setCustom(id, { name: sanitiseName(input.value), emoji: selected }, opts.storage);
    finish(true);
  }, 'bg-mint text-white text-xl flex-1', 'save');
  const cancel = button('Cancel', () => finish(false), 'bg-white border-2 border-slate-200 text-slate-700 flex-1', 'cancel');
  const reset = button('Reset', () => { resetCustom(id, opts.storage); finish(true); }, 'bg-white border-2 border-slate-200 text-slate-500 text-sm w-full', 'reset');

  const titleId = `profile-editor-title-${id}`;
  const dialog = h('div', {
    class: 'bg-cream rounded-3xl p-5 w-full max-w-sm flex flex-col gap-4 max-h-full overflow-y-auto toy-card',
    attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
  },
    h('h2', { class: 'font-display font-bold text-2xl text-slate-700 text-center', text: 'Name and avatar', attrs: { id: titleId } }),
    input,
    avatarRow,
    h('div', { class: 'flex gap-3' }, cancel, save),
    reset);
  const overlay = h('div', { class: 'fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4' }, dialog);
  // Only a press that also started on the backdrop cancels: iOS Safari sends a synthesised click to
  // whatever is under a finger that is still down when the dialog appears.
  let pressedOverlay = false;
  overlay.addEventListener('pointerdown', e => { pressedOverlay = e.target === overlay; });
  overlay.addEventListener('click', e => {
    const ok = pressedOverlay && e.target === overlay;
    pressedOverlay = false;
    if (ok) finish(false);
  });

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); finish(false); return; }
    if (e.key === 'Tab') {
      const items = Array.from(dialog.querySelectorAll<HTMLElement>('input, button'));
      const first = items[0], last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
      else if (!dialog.contains(active)) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener('keydown', onKey);

  function close() {
    closed = true;
    document.removeEventListener('keydown', onKey);
    overlay.remove();
    previousFocus?.isConnected && previousFocus.focus();
  }

  host.append(overlay);
  input.focus();
  return { destroy: () => { if (!closed) close(); } };
}
