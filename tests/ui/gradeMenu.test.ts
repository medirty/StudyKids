import { describe, it, expect, vi } from 'vitest';
import { renderGradeMenu } from '../../src/ui/screens/gradeMenu';
import type { Speech } from '../../src/core/types';

const speech = (): Speech => ({ available: true, speak: vi.fn(() => Promise.resolve()), stop: vi.fn() });

describe('renderGradeMenu', () => {
  it('renders 6 cards; open ones pick, closed ones are inert', () => {
    const el = document.createElement('div');
    const onPick = vi.fn();
    const sp = speech();
    const view = renderGradeMenu(el, { openGrades: [1, 3], onPick, speech: sp });
    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-role="grade-card"]'));
    expect(cards.map(c => c.dataset.grade)).toEqual(['1', '2', '3', '4', '5', '6']);
    cards[1].click();
    expect(onPick).not.toHaveBeenCalled();
    expect(cards[1].getAttribute('aria-disabled')).toBe('true');
    expect(cards[1].textContent).toContain('🔒 Soon');
    cards[2].click();
    expect(onPick).toHaveBeenCalledWith(3);
    el.querySelectorAll<HTMLButtonElement>('[data-role="speak"]')[0].click();
    expect(sp.speak).toHaveBeenCalledWith('Grade 1');
    expect(el.querySelectorAll('[data-role="speak"]').length).toBe(2);
    view.destroy();
    expect(el.children.length).toBe(0);
  });
});
