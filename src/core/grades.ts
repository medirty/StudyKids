import type { Mode, Stage } from './types';

export const GRADES: readonly Stage[] = [1, 2, 3, 4, 5, 6];

const LAST_GRADE_KEY = 'studykids.lastGrade';
const AUTO_READ_KEY = 'studykids.autoRead';
const LEGACY_KEYS = ['studykids.lastProfile', 'studykids.profileCustom'];

export function isGrade(v: unknown): v is Stage {
  return typeof v === 'number' && (GRADES as readonly number[]).includes(v);
}

export function gradeDefaults(g: Stage): { autoRead: boolean; defaultMode: Mode } {
  return g <= 2 ? { autoRead: true, defaultMode: 'explore' } : { autoRead: false, defaultMode: 'challenge' };
}

function defaultStorage(): Storage | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

function readAutoReadMap(s: Storage): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(s.getItem(AUTO_READ_KEY) ?? 'null');
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch { return {}; }
}

export function getAutoRead(g: Stage, storage?: Storage): boolean {
  try {
    const s = storage ?? defaultStorage();
    if (!s) return gradeDefaults(g).autoRead;
    const v = readAutoReadMap(s)[String(g)];
    return typeof v === 'boolean' ? v : gradeDefaults(g).autoRead;
  } catch { return gradeDefaults(g).autoRead; }
}

export function setAutoRead(g: Stage, on: boolean, storage?: Storage): void {
  try {
    const s = storage ?? defaultStorage();
    if (!s) return;
    const map = readAutoReadMap(s);
    map[String(g)] = on;
    s.setItem(AUTO_READ_KEY, JSON.stringify(map));
  } catch { /* storage unavailable (e.g. Safari private mode) */ }
}

export function getLastGrade(storage?: Storage): Stage | null {
  try {
    const s = storage ?? defaultStorage();
    if (!s) return null;
    const v = s.getItem(LAST_GRADE_KEY);
    if (v === null || !/^\d$/.test(v)) return null;
    const n = Number(v);
    return isGrade(n) ? n : null;
  } catch { return null; }
}

export function setLastGrade(g: Stage, storage?: Storage): void {
  try {
    const s = storage ?? defaultStorage();
    s?.setItem(LAST_GRADE_KEY, String(g));
  } catch { /* storage unavailable */ }
}

export function clearLegacyStorage(storage?: Storage): void {
  for (const key of LEGACY_KEYS) {
    try {
      const s = storage ?? defaultStorage();
      s?.removeItem(key);
    } catch { /* best effort */ }
  }
}
