import type { Mode, Stage, SubjectId } from './types';
import { PROFILES, isProfileId, type ProfileId } from './profiles';

export type Route =
  | { name: 'profiles' }
  | { name: 'subjects'; profile: ProfileId; stage: Stage }
  | { name: 'toys'; profile: ProfileId; stage: Stage; subject: SubjectId }
  | { name: 'toy'; profile: ProfileId; stage: Stage; subject: SubjectId; toy: string; mode: Mode };

const SUBJECT_IDS: readonly string[] = ['math', 'english', 'science', 'gp', 'wellbeing', 'art', 'music', 'computing'];

export function toHash(r: Route): string {
  switch (r.name) {
    case 'profiles': return '#/';
    case 'subjects': return `#/p/${r.profile}/${r.stage}`;
    case 'toys': return `#/p/${r.profile}/${r.stage}/${r.subject}`;
    case 'toy': return `#/p/${r.profile}/${r.stage}/${r.subject}/${encodeURIComponent(r.toy)}/${r.mode}`;
  }
}

function decode(s: string): string | null {
  try { return decodeURIComponent(s); } catch { return null; }
}

export function parseHash(hash: string): Route {
  const profiles: Route = { name: 'profiles' };
  try {
    if (typeof hash !== 'string') return profiles;
    const parts = hash.replace(/^#\/?/, '').split('/').filter(p => p !== '');
    if (parts[0] !== 'p' || !isProfileId(parts[1])) return profiles;
    const profile = parts[1];
    const p = PROFILES[profile];
    const stage: Stage = parts[2] === '1' ? 1 : parts[2] === '3' ? 3 : p.stage;
    const subjects: Route = { name: 'subjects', profile, stage };
    const subject = parts[3];
    if (subject === undefined || !SUBJECT_IDS.includes(subject)) return subjects;
    const toys: Route = { name: 'toys', profile, stage, subject: subject as SubjectId };
    const toy = parts[4] === undefined ? null : decode(parts[4]);
    if (!toy) return toys;
    const mode: Mode = parts[5] === 'explore' || parts[5] === 'challenge' ? parts[5] : p.defaultMode;
    return { name: 'toy', profile, stage, subject: subject as SubjectId, toy, mode };
  } catch {
    return profiles;
  }
}
