import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createChoiceCards } from '../../../src/ui/kit/choiceCards';

const options = [{ id: 'a', label: 'Cat', emoji: '🐱' }, { id: 'b', label: 'Dog' }, { id: 'c', label: 'Cow' }];
function setup(style?: 'cards' | 'balloons') {
  const host = document.createElement('div');
  document.body.append(host);
  const onSelect = vi.fn();
  const view = createChoiceCards(host, { options, style, onSelect });
  const c = (id: string) => host.querySelector<HTMLElement>(`[data-role="choice"][data-id="${id}"]`)!;
  return { host, view, onSelect, c };
}

describe('createChoiceCards', () => {
  it('renders one aria-pressed control per option, none selected', () => {
    const { host, view, c } = setup();
    expect(host.querySelectorAll('[data-role="choice"]')).toHaveLength(3);
    expect(c('a').getAttribute('aria-pressed')).toBe('false');
    expect(view.selected()).toBeNull();
  });
  it('is single-select: choosing another clears the first', () => {
    const { view, c, onSelect } = setup();
    c('a').click();
    expect(view.selected()).toBe('a');
    expect(c('a').getAttribute('aria-pressed')).toBe('true');
    c('b').click();
    expect(view.selected()).toBe('b');
    expect(c('a').getAttribute('aria-pressed')).toBe('false');
    expect(c('b').getAttribute('aria-pressed')).toBe('true');
    expect(onSelect.mock.calls).toEqual([['a'], ['b']]);
  });
  it('tapping the selected card again keeps it selected by default', () => {
    const { view, c, onSelect } = setup();
    c('a').click(); c('a').click();
    expect(view.selected()).toBe('a');
    expect(c('a').getAttribute('aria-pressed')).toBe('true');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
  it('allowDeselect lets a second tap clear it without calling onSelect', () => {
    const host = document.createElement('div');
    const onSelect = vi.fn();
    const view = createChoiceCards(host, { options, allowDeselect: true, onSelect });
    const a = host.querySelector<HTMLElement>('[data-id="a"]')!;
    a.click(); a.click();
    expect(view.selected()).toBeNull();
    expect(a.getAttribute('aria-pressed')).toBe('false');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
  it('setLocked ignores taps until unlocked', () => {
    const { view, c, onSelect } = setup();
    view.setLocked(true);
    c('a').click();
    expect(view.selected()).toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
    view.setLocked(false);
    c('a').click();
    expect(view.selected()).toBe('a');
  });
  it('reset clears selection and highlights', () => {
    const { view, c } = setup();
    c('a').click();
    view.highlight('b', 'correct');
    view.highlight('c', 'hint');
    view.reset();
    expect(view.selected()).toBeNull();
    expect(c('a').getAttribute('aria-pressed')).toBe('false');
    expect(c('b').dataset.highlight).toBeUndefined();
    expect(c('c').classList.contains('is-hint')).toBe(false);
  });
  it('highlight marks correct and hint without touching selection; unknown id is ignored', () => {
    const { view, c } = setup();
    c('a').click();
    view.highlight('b', 'correct');
    view.highlight('c', 'hint');
    view.highlight('zzz', 'hint');
    expect(c('b').dataset.highlight).toBe('correct');
    expect(c('b').classList.contains('is-correct')).toBe(true);
    expect(c('c').dataset.highlight).toBe('hint');
    expect(view.selected()).toBe('a');
  });
  it('balloons style renders balloon controls; both styles are >=48px by class', () => {
    const b = setup('balloons');
    expect(b.c('a').classList.contains('kit-balloon')).toBe(true);
    const k = setup('cards');
    expect(k.c('a').classList.contains('kit-balloon')).toBe(false);
    for (const el of [b.c('a'), k.c('a')]) { expect(el.className).toContain('min-h-12'); expect(el.className).toContain('min-w-12'); }
  });
  it('disables the pop animation under prefers-reduced-motion', () => {
    const css = readFileSync('src/styles.css', 'utf8');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.kit-pop\s*\{\s*animation:\s*none/);
  });
  it('destroy removes the controls', () => {
    const { host, view } = setup();
    view.destroy();
    expect(host.childElementCount).toBe(0);
  });
});
