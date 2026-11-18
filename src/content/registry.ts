import type { Stage, SubjectId, Toy } from '../core/types';
import { clockToy } from '../toys/math/clock';
import { count20Toy } from '../toys/math/count20';
import { fractionsToy } from '../toys/math/fractions';
import { multiplyToy } from '../toys/math/multiply';
import { numberLineToy } from '../toys/math/numberLine';
import { placeValueToy } from '../toys/math/placeValue';
import { shapesToy } from '../toys/math/shapes';

// Toys are listed here explicitly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TOYS: Toy<any, any>[] = [clockToy, count20Toy, fractionsToy, multiplyToy, numberLineToy, placeValueToy, shapesToy];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toysFor(subject: SubjectId, stage: Stage): Toy<any, any>[] {
  return TOYS.filter(t => t.meta.subject === subject && t.meta.stages.includes(stage));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function findToy(id: string): Toy<any, any> | undefined {
  return TOYS.find(t => t.meta.id === id);
}
