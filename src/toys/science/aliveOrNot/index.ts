import { shuffle } from '../../../core/rng';
import { LIVING_BINS, LIVING_FACTS, LIVING_ITEMS, livingTarget } from '../../../content/science/living';
import { createSortToy } from '../sortCommon';

export const aliveOrNotToy = createSortToy({
  meta: {
    id: 'aliveOrNot', subject: 'science', stages: [1], title: 'Alive or Not?', icon: '🌱',
    objective: 'Sort things into living and non-living, and say what living things do.',
  },
  items: LIVING_ITEMS,
  bins: LIVING_BINS,
  targetOf: livingTarget,
  fact: id => LIVING_FACTS[id],
  prompt: i => `Where does the ${i.name} go?`,
  verdict: (i, bin) => `The ${i.name} is ${bin.label.toLowerCase()}`,
  // four of each, shuffled together
  deal: rng => shuffle(rng, [
    ...shuffle(rng, LIVING_ITEMS.filter(i => i.living)).slice(0, 4),
    ...shuffle(rng, LIVING_ITEMS.filter(i => !i.living)).slice(0, 4),
  ]),
  intro: 'Drag each picture into a bin. Or tap a picture, then tap a bin. Tap a picture to hear its name.',
});
