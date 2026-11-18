import { PROFILES, isProfileId, type ProfileId } from './profiles';

export const AVATARS: readonly string[] = ['👧', '👦', '🧒', '👶', '🐱', '🐶', '🦊', '🐼'];
export interface ProfileCustom { name: string; emoji: string }

const KEY = 'studykids.profileCustom';
export const MAX_NAME_CHARS = 12;

function defaultStorage(): Storage | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/** Trim, collapse inner whitespace, cut to 12 characters (by code point). */
export function sanitiseName(raw: string): string {
  return Array.from(raw.trim().replace(/\s+/g, ' ')).slice(0, MAX_NAME_CHARS).join('');
}

function clean(v: unknown): ProfileCustom | null {
  if (typeof v !== 'object' || v === null) return null;
  const { name, emoji } = v as Record<string, unknown>;
  return {
    name: typeof name === 'string' ? sanitiseName(name) : '',
    emoji: typeof emoji === 'string' && AVATARS.includes(emoji) ? emoji : '',
  };
}

export function getCustom(storage?: Storage): Partial<Record<ProfileId, ProfileCustom>> {
  const out: Partial<Record<ProfileId, ProfileCustom>> = {};
  try {
    const s = storage ?? defaultStorage();
    const raw = s?.getItem(KEY);
    if (!raw) return out;
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return out;
    for (const [k, v] of Object.entries(data)) {
      if (!isProfileId(k)) continue;
      const c = clean(v);
      if (c) out[k] = c;
    }
  } catch { /* malformed JSON or storage unavailable */ }
  return out;
}

function write(all: Partial<Record<ProfileId, ProfileCustom>>, s: Storage): void {
  if (Object.keys(all).length === 0) s.removeItem(KEY);
  else s.setItem(KEY, JSON.stringify(all));
}

export function setCustom(id: ProfileId, c: ProfileCustom, storage?: Storage): void {
  try {
    const s = storage ?? defaultStorage();
    if (!s) return;
    const all = getCustom(s);
    all[id] = clean(c) ?? { name: '', emoji: '' };
    write(all, s);
  } catch { /* storage unavailable */ }
}

export function resetCustom(id: ProfileId, storage?: Storage): void {
  try {
    const s = storage ?? defaultStorage();
    if (!s) return;
    const all = getCustom(s);
    delete all[id];
    write(all, s);
  } catch { /* storage unavailable */ }
}

export function displayProfile(id: ProfileId, storage?: Storage): { name: string; emoji: string } {
  const c = getCustom(storage)[id];
  return { name: c?.name || PROFILES[id].name, emoji: c?.emoji || PROFILES[id].emoji };
}
