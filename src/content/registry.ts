import type { Stage, SubjectId, Toy } from '../core/types';
import { sentenceFixerToy } from '../toys/english/sentenceFixer';
import { soundBuilderToy } from '../toys/english/soundBuilder';
import { trickyWordsToy } from '../toys/english/trickyWords';
import { wordSorterToy } from '../toys/english/wordSorter';
import { pastTenseToy } from '../toys/english/pastTense';
import { affixLabToy } from '../toys/english/affixLab';
import { storyTimeToy } from '../toys/english/storyTime';
import { bodySensesToy } from '../toys/science/bodySenses';
import { aliveOrNotToy } from '../toys/science/aliveOrNot';
import { materialsToy } from '../toys/science/materials';
import { pushPullToy } from '../toys/science/pushPull';
import { growPlantToy } from '../toys/science/growPlant';
import { magnetsToy } from '../toys/science/magnets';
import { shadowsToy } from '../toys/science/shadows';
import { skeletonToy } from '../toys/science/skeleton';
import { clockToy } from '../toys/math/clock';
import { count20Toy } from '../toys/math/count20';
import { fractionsToy } from '../toys/math/fractions';
import { multiplyToy } from '../toys/math/multiply';
import { numberLineToy } from '../toys/math/numberLine';
import { placeValueToy } from '../toys/math/placeValue';
import { shapesToy } from '../toys/math/shapes';

// Toys are listed here explicitly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TOYS: Toy<any, any>[] = [clockToy, count20Toy, fractionsToy, multiplyToy, numberLineToy, placeValueToy, shapesToy, sentenceFixerToy, soundBuilderToy, trickyWordsToy, wordSorterToy, pastTenseToy, affixLabToy, storyTimeToy, bodySensesToy, aliveOrNotToy, materialsToy, pushPullToy, growPlantToy, magnetsToy, shadowsToy, skeletonToy];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toysFor(subject: SubjectId, stage: Stage): Toy<any, any>[] {
  return TOYS.filter(t => t.meta.subject === subject && t.meta.stages.includes(stage));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function findToy(id: string): Toy<any, any> | undefined {
  return TOYS.find(t => t.meta.id === id);
}
