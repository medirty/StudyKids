import { describe, it, expect } from 'vitest';
import { SUBJECTS } from '../../src/content/subjects';
import { toysFor, findToy, TOYS } from '../../src/content/registry';

describe('subjects/registry', () => {
  it('has 8 subjects in order', () => {
    expect(SUBJECTS.length).toBe(8);
    expect(SUBJECTS.map(s => s.id)).toEqual(['math', 'english', 'science', 'gp', 'wellbeing', 'art', 'music', 'computing']);
    expect(SUBJECTS.map(s => s.title)).toEqual(['Maths', 'English', 'Science', 'Global Perspectives', 'Wellbeing', 'Art & Design', 'Music', 'Computing']);
    expect(SUBJECTS.map(s => s.icon)).toEqual(['🔢', '🔤', '🔬', '🌏', '💛', '🎨', '🎵', '🤖']);
  });
  it('toysFor filters by subject and stage', () => {
    expect(toysFor('english', 1).map(t => t.meta.id)).toEqual(['sentenceFixer', 'soundBuilder', 'trickyWords']);
    expect(toysFor('english', 3).map(t => t.meta.id)).toEqual(['wordSorter', 'pastTense', 'affixLab', 'storyTime']);
    expect(TOYS.map(t => t.meta.id)).toContain('clock');
    expect(findToy('clock')?.meta.title).toBe('Tick-Tock Time');
  });
  it('findToy unknown → undefined', () => {
    expect(findToy('nope')).toBeUndefined();
  });
});
