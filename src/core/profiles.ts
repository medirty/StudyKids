import type { Mode, Stage } from './types';

export type ProfileId = 'adik' | 'kakak';
export interface Profile { id: ProfileId; name: string; emoji: string; stage: Stage; defaultMode: Mode; autoRead: boolean }

export const PROFILES: Record<ProfileId, Profile> = {
  adik: { id: 'adik', name: 'Adik', emoji: '👧', stage: 1, defaultMode: 'explore', autoRead: true },
  kakak: { id: 'kakak', name: 'Kakak', emoji: '👦', stage: 3, defaultMode: 'challenge', autoRead: false },
};

const KEY = 'studykids.lastProfile';

export function isProfileId(v: unknown): v is ProfileId {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(PROFILES, v);
}

function defaultStorage(): Storage | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function getLastProfile(storage?: Storage): ProfileId | null {
  try {
    const s = storage ?? defaultStorage();
    if (!s) return null;
    const v = s.getItem(KEY);
    return isProfileId(v) ? v : null;
  } catch { return null; }
}

export function setLastProfile(id: ProfileId, storage?: Storage): void {
  try {
    const s = storage ?? defaultStorage();
    s?.setItem(KEY, id);
  } catch { /* storage unavailable (e.g. Safari private mode) */ }
}
