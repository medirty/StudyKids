import { shuffle } from '../../../core/rng';
import { MATERIALS, MATERIAL_ITEMS, materialById } from '../../../content/science/materials';
import { createSortToy } from '../sortCommon';

export const materialsToy = createSortToy({
  meta: {
    id: 'materials', subject: 'science', stages: [1], title: 'Material Sorter', icon: '🧱',
    objective: 'Sort everyday objects by the material they are made of, and describe it as hard, soft, bendy or see-through.',
  },
  items: MATERIAL_ITEMS,
  bins: MATERIALS.map(m => ({ id: m.id, label: m.label, emoji: m.emoji })),
  targetOf: i => i.material,
  fact: id => materialById(id).fact,
  prompt: i => `What is the ${i.name} made of?`,
  verdict: (i, bin) => `The ${i.name} is made of ${bin.label.toLowerCase()}`,
  // two of each material, shuffled together
  deal: rng => shuffle(rng, MATERIALS.flatMap(m => shuffle(rng, MATERIAL_ITEMS.filter(i => i.material === m.id)).slice(0, 2))),
  intro: 'Drag each picture into a bin. Or tap a picture, then tap a bin. Tap a picture to hear its name.',
});
