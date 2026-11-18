import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { startApp } from '../../src/app';
import { fakeToy } from '../fixtures/fakeToy';
import type { Speech, Sfx } from '../../src/core/types';

let root: HTMLElement;
let app: { destroy(): void } | null;
let speech: Speech & { calls: string[] };
const sfx: Sfx = { tick: vi.fn(), success: vi.fn(), tryAgain: vi.fn() };

const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel);
const qa = (sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));
const card = (id: string) => q(`[data-role="profile-card"][data-profile="${id}"]`)!;
const dialog = () => q('[role="dialog"]');
const ptr = (el: Element, type: string, init: PointerEventInit = {}) =>
  el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, pointerType: 'touch', ...init }));
function press(el: Element, ms: number, release = true) {
  ptr(el, 'pointerdown');
  vi.advanceTimersByTime(ms);
  if (release) { ptr(el, 'pointerup'); (el as HTMLElement).click(); }
}
const key = (el: Element, type: 'keydown' | 'keyup', k: string, repeat = false) =>
  el.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true, cancelable: true, repeat }));

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  location.hash = '';
  root = document.createElement('div');
  document.body.appendChild(root);
  const calls: string[] = [];
  speech = { available: true, calls, speak: vi.fn((t: string) => { calls.push(t); return Promise.resolve(); }), stop: vi.fn() } as unknown as typeof speech;
  app = startApp(root, { speech, sfx, celebrate: () => {}, rng: () => 0.5, toys: [fakeToy] });
});
afterEach(() => {
  app?.destroy();
  app = null;
  root.remove();
  vi.useRealTimers();
});

describe('hold to edit', () => {
  it('a tap selects the profile and opens no dialog', () => {
    press(card('adik'), 100);
    vi.advanceTimersByTime(3000);
    expect(location.hash).toBe('#/p/adik/1');
    expect(dialog()).toBeNull();
  });
  it('double tap never opens the editor', () => {
    const c = card('kakak');
    for (let i = 0; i < 2; i++) { ptr(c, 'pointerdown'); vi.advanceTimersByTime(80); ptr(c, 'pointerup'); vi.advanceTimersByTime(80); }
    vi.advanceTimersByTime(5000);
    expect(dialog()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('a 1999 ms hold opens nothing and its release does not select', () => {
    press(card('adik'), 1999);
    vi.advanceTimersByTime(2000);
    expect(dialog()).toBeNull();
    expect(location.hash).toBe('');
  });
  it('a 700 ms press-and-release is not a tap either', () => {
    press(card('adik'), 700);
    expect(location.hash).toBe('');
  });
  it('the next plain tap after a failed hold still selects', () => {
    press(card('adik'), 1000);
    press(card('adik'), 100);
    expect(location.hash).toBe('#/p/adik/1');
  });
  it('a 2000 ms hold opens the dialog and does not select the profile', () => {
    const c = card('adik');
    ptr(c, 'pointerdown');
    vi.advanceTimersByTime(1000);
    expect(q<HTMLElement>('[data-role="hold-ring"]')!.style.display).toBe('block');
    vi.advanceTimersByTime(1000);
    expect(dialog()).not.toBeNull();
    expect(dialog()!.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(q('[data-role="name-input"]'));
    ptr(c, 'pointerup'); c.click();
    expect(location.hash).toBe('');
    expect(localStorage.getItem('studykids.lastProfile')).toBeNull();
  });
  it.each(['pointerleave', 'pointercancel'])('%s mid-hold cancels', type => {
    const c = card('adik');
    ptr(c, 'pointerdown');
    vi.advanceTimersByTime(1000);
    ptr(c, type);
    expect(q<HTMLElement>('[data-role="hold-ring"]')!.style.display).toBe('none');
    vi.advanceTimersByTime(3000);
    expect(dialog()).toBeNull();
  });
  it('dragging the pointer away cancels', () => {
    const c = card('adik');
    ptr(c, 'pointerdown', { clientX: 10, clientY: 10 });
    vi.advanceTimersByTime(500);
    ptr(c, 'pointermove', { clientX: 60, clientY: 10 });
    vi.advanceTimersByTime(3000);
    expect(dialog()).toBeNull();
  });
  it('navigating away mid-hold leaves no timer running', () => {
    ptr(card('adik'), 'pointerdown');
    vi.advanceTimersByTime(500);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    location.hash = '#/p/kakak/3'; // Kakak: no spoken greeting; fade timer belongs to the new screen
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    vi.advanceTimersByTime(5000); // would open the editor if the hold timer had survived
    expect(dialog()).toBeNull();
    app!.destroy(); app = null;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('a press moved more than 12 px is not a tap: no selection, no dialog', () => {
    const c = card('adik');
    ptr(c, 'pointerdown', { clientX: 10, clientY: 10 });
    vi.advanceTimersByTime(1000);
    ptr(c, 'pointermove', { clientX: 30, clientY: 10 });
    ptr(c, 'pointerup', { clientX: 30, clientY: 10 }); c.click();
    vi.advanceTimersByTime(3000);
    expect(location.hash).toBe('');
    expect(dialog()).toBeNull();
  });
  it('a quick press that drifted more than 12 px does not select either', () => {
    const c = card('adik');
    ptr(c, 'pointerdown', { clientX: 10, clientY: 10 });
    vi.advanceTimersByTime(100);
    ptr(c, 'pointermove', { clientX: 40, clientY: 10 });
    ptr(c, 'pointerup'); c.click();
    expect(location.hash).toBe('');
  });
  it('a swallowed click does not linger: a later click selects', () => {
    const c = card('adik');
    press(c, 1000);
    vi.advanceTimersByTime(500);
    c.click(); // e.g. screen reader activation
    expect(location.hash).toBe('#/p/adik/1');
  });
  it('contextmenu on the card is prevented', () => {
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    card('adik').dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });
  it('keyboard: short press activates, 2 s hold opens the editor', () => {
    const c = card('kakak');
    key(c, 'keydown', 'Enter'); vi.advanceTimersByTime(200); key(c, 'keyup', 'Enter');
    expect(location.hash).toBe('#/p/kakak/3');
    localStorage.clear(); location.hash = '#/'; window.dispatchEvent(new HashChangeEvent('hashchange'));
    const c2 = card('adik');
    key(c2, 'keydown', ' ');
    vi.advanceTimersByTime(1000); key(c2, 'keydown', ' ', true);
    vi.advanceTimersByTime(1000);
    expect(dialog()).not.toBeNull();
    key(c2, 'keyup', ' ');
    expect(location.hash).toBe('#/');
  });
});

describe('edit dialog', () => {
  function open(id = 'adik') { press(card(id), 2000, false); ptr(card(id), 'pointerup'); }
  const type = (v: string) => { const i = q<HTMLInputElement>('[data-role="name-input"]')!; i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); };

  it('backdrop click without a press on it keeps the dialog open; press then click closes', () => {
    open();
    const overlay = dialog()!.parentElement!;
    overlay.click(); // synthesised click from the finger that opened it
    expect(dialog()).not.toBeNull();
    overlay.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    overlay.click();
    expect(dialog()).toBeNull();
  });
  it('a press that starts inside the dialog and ends on the backdrop does not close it', () => {
    open();
    const overlay = dialog()!.parentElement!;
    dialog()!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    overlay.click();
    expect(dialog()).not.toBeNull();
  });
  it('limits the name by code points while typing, not UTF-16 units', () => {
    open();
    type('🐱'.repeat(15));
    expect(Array.from(q<HTMLInputElement>('[data-role="name-input"]')!.value)).toHaveLength(12);
    expect(q('[data-role="name-input"]')!.hasAttribute('maxlength')).toBe(false);
  });
  it('auto-repeating Space from the hold types nothing into the name input', () => {
    const c = card('adik');
    key(c, 'keydown', ' ');
    vi.advanceTimersByTime(2000);
    const input = q('[data-role="name-input"]')!;
    const rep = new KeyboardEvent('keydown', { key: ' ', repeat: true, bubbles: true, cancelable: true });
    input.dispatchEvent(rep);
    expect(rep.defaultPrevented).toBe(true);
    key(input, 'keyup', ' ');
    const later = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    input.dispatchEvent(later);
    expect(later.defaultPrevented).toBe(false);
  });
  it('save: name and avatar show on the card and in storage', () => {
    open();
    type('Nadia');
    qa('[data-role="avatar"]').find(b => b.dataset.emoji === '🐱')!.click();
    expect(qa('[data-role="avatar"]')).toHaveLength(8);
    expect(qa('[data-role="avatar"]').find(b => b.dataset.emoji === '🐱')!.getAttribute('aria-pressed')).toBe('true');
    q('[data-role="save"]')!.click();
    expect(dialog()).toBeNull();
    expect(card('adik').textContent).toContain('Nadia');
    expect(card('adik').textContent).toContain('🐱');
    expect(JSON.parse(localStorage.getItem('studykids.profileCustom')!)).toEqual({ adik: { name: 'Nadia', emoji: '🐱' } });
    expect(card('kakak').textContent).toContain('Kakak');
  });
  it('cancel leaves everything unchanged', () => {
    open();
    type('Zed');
    q('[data-role="cancel"]')!.click();
    expect(dialog()).toBeNull();
    expect(card('adik').textContent).toContain('Adik');
    expect(localStorage.getItem('studykids.profileCustom')).toBeNull();
  });
  it('reset returns to defaults', () => {
    localStorage.setItem('studykids.profileCustom', JSON.stringify({ adik: { name: 'Nadia', emoji: '🐱' } }));
    app!.destroy(); root.replaceChildren();
    app = startApp(root, { speech, sfx, celebrate: () => {}, rng: () => 0.5, toys: [fakeToy] });
    expect(card('adik').textContent).toContain('Nadia');
    open();
    expect(q<HTMLInputElement>('[data-role="name-input"]')!.value).toBe('Nadia');
    q('[data-role="reset"]')!.click();
    expect(card('adik').textContent).toContain('Adik');
    expect(card('adik').textContent).toContain('👧');
  });
  it('Escape closes without saving; empty name saves as default', () => {
    open();
    type('Zed');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(dialog()).toBeNull();
    expect(localStorage.getItem('studykids.profileCustom')).toBeNull();
    open(); type('   '); q('[data-role="save"]')!.click();
    expect(card('adik').textContent).toContain('Adik');
  });
  it('hostile names render as text', () => {
    open(); type('<b>x</b>'); q('[data-role="save"]')!.click();
    expect(card('adik').querySelector('b')).toBeNull();
    expect(card('adik').textContent).toContain('<b>x</b>');
  });
});

describe('greeting', () => {
  beforeEach(() => {
    localStorage.setItem('studykids.profileCustom', JSON.stringify({ adik: { name: 'Nadia', emoji: '🐱' }, kakak: { name: 'Raka', emoji: '🐶' } }));
    app!.destroy(); root.replaceChildren();
    app = startApp(root, { speech, sfx, celebrate: () => {}, rng: () => 0.5, toys: [fakeToy] });
  });
  it('Adik (autoRead): shown and spoken', () => {
    press(card('adik'), 100);
    expect(q('[data-role="greeting"]')!.textContent).toBe('Hi, Nadia! 👋');
    expect(speech.calls.some(c => c.includes('Hi, Nadia'))).toBe(true);
  });
  it('Kakak: shown, not spoken', () => {
    press(card('kakak'), 100);
    expect(q('[data-role="greeting"]')!.textContent).toBe('Hi, Raka! 👋');
    expect(speech.calls.some(c => c.includes('Hi,'))).toBe(false);
  });
  it('not repeated on stage toggle', () => {
    press(card('kakak'), 100);
    qa('[data-role="stage"]').find(b => b.textContent === 'Stage 1')!.click();
    expect(q('[data-role="greeting"]')).toBeNull();
  });
});
