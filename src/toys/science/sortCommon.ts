import type { ChallengeView, Question, Rng, Stage, Toy, ToyContext, View } from '../../core/types';
import { shuffle } from '../../core/rng';
import { button, h } from '../../ui/dom';
import { createDragSort } from '../../ui/kit/dragSort';

/** One item to sort. `name` is unique within a toy: it is the id, the spoken word and the label. */
export interface SortThing { name: string; emoji: string }
export interface SortBinDef { id: string; label: string; emoji: string }
export type SortQuestion = Question & { item: string; target: string };
export type SortAnswer = string | null;

export interface SortToyConfig<I extends SortThing> {
  meta: Toy['meta'];
  items: readonly I[];
  bins: readonly SortBinDef[];
  targetOf(item: I): string;
  /** The rule for a bin, said in Explore after a drop and as the hint and explanation in Challenge. */
  fact(binId: string): string;
  prompt(item: I): string;
  /** "The dog is living" / "The chair is made of wood" (no full stop). */
  verdict(item: I, bin: SortBinDef): string;
  /** Items shown in one Explore round. */
  deal(rng: Rng): I[];
  intro: string;
}

const BEAT_MS = 600;
const say = (ctx: ToyContext, text: string) => { void ctx.speech.speak(text).catch(() => {}); };
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function pop(el: HTMLElement) {
  el.classList.remove('kit-pop');
  void el.offsetWidth;
  el.classList.add('kit-pop');
}

/** Bins are kept compact so six of them fit a 360px phone in two columns. */
const COMPACT = '[&_.kit-bin]:min-h-0 [&_.kit-bin]:p-1.5 [&_.kit-bin]:gap-1 [&_.kit-bin_.font-display]:text-base [&_.kit-bin>div:last-child]:min-h-10';

export function createSortToy<I extends SortThing>(cfg: SortToyConfig<I>): Toy<SortQuestion, SortAnswer> {
  const itemOf = (name: string) => cfg.items.find(i => i.name === name)!;
  const binOf = (id: string) => cfg.bins.find(b => b.id === id)!;
  const binText = (b: SortBinDef) => `${b.emoji} ${b.label}`;

  // Tapping an item, or a bin's label, is an explicit action, so it may speak whatever the auto-read
  // setting is. Speaking never places anything: the kit's own click handlers do that.
  const speakOnTap = (holder: HTMLElement, ctx: ToyContext) =>
    holder.addEventListener('click', e => {
      const target = e.target as HTMLElement;
      const item = target.closest<HTMLElement>('[data-role="sort-item"]');
      if (item?.dataset.id) return say(ctx, item.dataset.id);
      const bin = target.closest<HTMLElement>('[data-role="sort-bin"]');
      // the header is the bin's first child; taps on the item zone below it stay silent
      if (bin?.dataset.id && bin.firstElementChild?.contains(target)) say(ctx, binOf(bin.dataset.id).label);
    }, true); // capture: the kit stops propagation of item clicks

  function explore(el: HTMLElement, ctx: ToyContext): View {
    const holder = h('div', { class: `w-full min-w-0 ${COMPACT}` });
    const feedback = h('p', {
      class: 'text-center text-lg font-bold min-h-14 w-full', role: 'feedback', attrs: { 'aria-live': 'polite' }, text: cfg.intro,
    });
    const again = button('New things 🔄', () => deal(), 'bg-white border-4 border-sand text-lg', 'again');
    let sorter: ReturnType<typeof createDragSort> | null = null;
    let right = new Set<string>();
    let done = false;

    function deal() {
      sorter?.destroy();
      right = new Set();
      done = false;
      feedback.textContent = cfg.intro;
      const things = cfg.deal(Math.random);
      sorter = createDragSort(holder, {
        items: things.map(t => ({ id: t.name, label: t.name, emoji: t.emoji })),
        bins: cfg.bins.map(b => ({ ...b })),
        tick: () => ctx.sfx.tick(),
        onDrop(name, binId) {
          const thing = itemOf(name);
          const bin = binOf(binId);
          const ok = cfg.targetOf(thing) === binId;
          const node = holder.querySelector<HTMLElement>(`[data-role="sort-item"][data-id="${name}"]`);
          if (ok) right.add(name); else right.delete(name);
          if (node) {
            node.dataset.state = ok ? 'right' : 'try';
            node.classList.remove('border-sand', 'border-mint', 'border-amber-toy');
            node.classList.add(ok ? 'border-mint' : 'border-amber-toy');
            pop(node);
          }
          if (right.size === things.length) {
            feedback.textContent = 'All sorted! Brilliant work! 🎉';
            if (!done) {
              done = true;
              ctx.sfx.success();
              ctx.celebrate();
            }
          } else if (ok) {
            feedback.textContent = `Yes! ${cfg.verdict(thing, bin)}. ${cfg.fact(binId)}`;
          } else {
            feedback.textContent = `Hmm, the ${name} does not go in ${bin.label}. Try another bin!`;
            ctx.sfx.tryAgain();
          }
          // Grade 1 children cannot read the feedback, so it is read out when auto-read is on.
          if (ctx.autoRead) say(ctx, feedback.textContent!.replace('🎉', '').trim());
        },
      });
    }

    speakOnTap(holder, ctx);
    const root = h('div', { class: 'flex flex-col items-center gap-4 w-full min-w-0 max-w-[640px] mx-auto' }, holder, feedback, again);
    deal();
    el.append(root);
    return { destroy: () => { sorter?.destroy(); root.remove(); } };
  }

  function renderChallenge(el: HTMLElement, q: SortQuestion, ctx: ToyContext): ChallengeView<SortAnswer> {
    const thing = itemOf(q.item);
    const holder = h('div', { class: `w-full min-w-0 ${COMPACT}` });
    const sorter = createDragSort(holder, {
      items: [{ id: thing.name, label: thing.name, emoji: thing.emoji }],
      bins: cfg.bins.map(b => ({ ...b })),
      tick: () => ctx.sfx.tick(),
      onDrop: () => {},
    });
    speakOnTap(holder, ctx);
    const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' },
      holder,
      h('p', { class: 'text-center text-sm font-bold text-slate-500', text: 'Drag it to a bin. Or tap it, then tap a bin.' }));
    el.append(root);
    return {
      getAnswer: () => sorter.placed()[thing.name] ?? null,
      reset: () => sorter.reset(),
      destroy: () => { sorter.destroy(); root.remove(); },
    };
  }

  function generateQuestions(_stage: Stage, count: number, rng: Rng): SortQuestion[] {
    const out: SortQuestion[] = [];
    let bag: I[] = [];
    let prev: I | null = null;
    for (let i = 0; i < count; i++) {
      if (bag.length === 0) {
        bag = shuffle(rng, cfg.items);
        // pop() takes from the end, so make sure the next item is not the previous one
        if (bag[bag.length - 1] === prev) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
      const item = bag.pop()!;
      prev = item;
      out.push({ id: `q${i + 1}`, prompt: cfg.prompt(item), item: item.name, target: cfg.targetOf(item) });
    }
    return out;
  }

  const how = (q: SortQuestion) => `${cfg.verdict(itemOf(q.item), binOf(q.target))}: ${cfg.fact(q.target)}`;

  return {
    meta: cfg.meta,
    explore,
    generateQuestions,
    renderChallenge,
    check(q, a) {
      if (a === null) return { correct: false, hint: `Put the ${q.item} in a bin first!` };
      if (a === q.target) return { correct: true };
      return { correct: false, hint: cfg.fact(q.target) };
    },
    describeAnswer: (q, a) => (a === null ? 'You did not choose a bin yet' : `You put the ${q.item} in ${binOf(a).label}`),
    explain: (q, a) => ({
      why: a === null ? 'You did not choose a bin yet.' : `You put the ${q.item} in ${binOf(a).label}.`,
      how: how(q),
    }),
    async demonstrate(el, q, ctx) {
      const thing = itemOf(q.item);
      const bins = cfg.bins.map(b => h('div', {
        class: 'rounded-2xl border-4 border-dashed border-sand bg-white p-2 font-display font-bold text-center text-base',
        role: 'demo-bin', text: binText(b), attrs: { 'data-id': b.id },
      }));
      const root = h('div', { class: 'flex flex-col items-center gap-3 w-full min-w-0 max-w-[640px] mx-auto' },
        h('div', { class: 'flex flex-col items-center bg-white rounded-3xl p-4 border-4 border-sky-100 toy-card' },
          h('span', { class: 'text-6xl', attrs: { 'aria-hidden': 'true' }, text: thing.emoji }),
          h('span', { class: 'font-display font-bold text-xl', text: thing.name })),
        h('div', { class: 'grid grid-cols-2 gap-2 w-full' }, ...bins));
      el.append(root);
      const view: View = { destroy: () => root.remove() };
      await sleep(BEAT_MS);
      if (!root.isConnected) return view;
      const target = bins.find(b => b.dataset.id === q.target)!;
      target.dataset.target = 'true';
      target.classList.remove('border-sand', 'border-dashed');
      target.classList.add('border-mint', 'bg-emerald-50');
      pop(target);
      ctx.sfx.tick();
      if (ctx.autoRead) say(ctx, `It goes in ${binOf(q.target).label}.`);
      return view;
    },
  };
}
