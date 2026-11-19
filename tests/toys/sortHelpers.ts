/** DOM helpers shared by the sorting-toy tests (kit drag-sort markup). */
export const sortHelpers = {
  items: (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-role="sort-item"]')],
  bins: (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-role="sort-bin"]')],
  feedback: (el: HTMLElement) => el.querySelector('[data-role="feedback"]')!.textContent!,
  /** Tap an item, then tap a bin. */
  drop(el: HTMLElement, itemId: string, binId: string) {
    sortHelpers.items(el).find(i => i.dataset.id === itemId)!.click();
    sortHelpers.bins(el).find(b => b.dataset.id === binId)!.click();
  },
};
