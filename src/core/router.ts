import type { Mode, Stage, SubjectId } from './types';
import { gradeDefaults, isGrade } from './grades';

export type Route =
  | { name: 'grades' }
  | { name: 'subjects'; grade: Stage }
  | { name: 'toys'; grade: Stage; subject: SubjectId }
  | { name: 'toy'; grade: Stage; subject: SubjectId; toy: string; mode: Mode };

const SUBJECT_IDS: readonly string[] = ['math', 'english', 'science', 'gp', 'wellbeing', 'art', 'music', 'computing'];

export function toHash(r: Route): string {
  switch (r.name) {
    case 'grades': return '#/';
    case 'subjects': return `#/k/${r.grade}`;
    case 'toys': return `#/k/${r.grade}/${r.subject}`;
    case 'toy': return `#/k/${r.grade}/${r.subject}/${encodeURIComponent(r.toy)}/${r.mode}`;
  }
}

function decode(s: string): string | null {
  try { return decodeURIComponent(s); } catch { return null; }
}

export function parseHash(hash: string): Route {
  const grades: Route = { name: 'grades' };
  try {
    if (typeof hash !== 'string') return grades;
    const parts = hash.replace(/^#\/?/, '').split('/').filter(p => p !== '');
    if (parts[0] !== 'k' || parts[1] === undefined || !/^\d$/.test(parts[1])) return grades;
    const grade = Number(parts[1]);
    if (!isGrade(grade)) return grades;
    const subjects: Route = { name: 'subjects', grade };
    const subject = parts[2];
    if (subject === undefined || !SUBJECT_IDS.includes(subject)) return subjects;
    const toys: Route = { name: 'toys', grade, subject: subject as SubjectId };
    const toy = parts[3] === undefined ? null : decode(parts[3]);
    if (!toy) return toys;
    const mode: Mode = parts[4] === 'explore' || parts[4] === 'challenge' ? parts[4] : gradeDefaults(grade).defaultMode;
    return { name: 'toy', grade, subject: subject as SubjectId, toy, mode };
  } catch {
    return grades;
  }
}
