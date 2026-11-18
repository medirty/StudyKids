# Profile Names & Avatars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Bimo rename the two profiles and pick an avatar emoji, via a hidden 2-second press-and-hold on the profile card, stored only on the device.

**Architecture:** A small pure storage module (`profileCustom.ts`) plus a `displayProfile()` helper used wherever a profile's name/emoji is shown; the profile picker gains a hold-to-edit gesture and an edit dialog; the subject map shows a greeting.

**Tech Stack:** existing Vite + TypeScript strict, Tailwind v4, vitest/jsdom, Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-11-18-profile-names-design.md` (parent spec: `docs/superpowers/specs/2026-11-18-kids-study-app-design.md`)

## Global Constraints

- Names never leave the device: localStorage key `studykids.profileCustom` only; no network.
- Stage, defaultMode, autoRead and route ids stay fixed per profile id (`adik`, `kakak`).
- Name: trimmed, max 12 characters; empty → default ("Adik"/"Kakak"). Emoji must be one of: 👧 👦 🧒 👶 🐱 🐶 🦊 🐼; anything else → default emoji.
- Hold duration 2000 ms. A tap (release before 2000 ms) behaves exactly as today (selects the profile). Moving the pointer off the card or `pointercancel` cancels the hold.
- Storage read/write errors swallowed; malformed JSON ignored.
- DOM via `h()`/textContent, no innerHTML interpolation; touch targets ≥48px; no horizontal scroll at 360px; British spelling.
- Greeting speech only when the profile's autoRead is on.
- Commit trailers: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_017fQttueP6FBtYkYVcRNMdu`.

## Review Focus

1. A child's quick taps, double taps or a 1.9 s hold must never open the editor (test in Task 2).
2. Long-press on touch devices must not trigger the browser's context menu/text selection or also select the profile on release (test in Task 2; CSS `touch-action`, `user-select`, `contextmenu` prevented).
3. Corrupt or tampered storage (`'{bad'`, wrong types, 200-char name, unknown emoji) → defaults, no crash (test in Task 1).
4. Leaving the picker mid-hold (navigation) leaves no timer running (test in Task 2).
5. A long name at 360px must not overflow cards or header (test in Task 2 via e2e).

---

### Task 1: Profile customisation storage and display helper

**Files:**
- Create: `src/core/profileCustom.ts`
- Modify: `src/app.ts` (header/switch indicator uses display name if it shows one), `src/ui/screens/profilePicker.ts` (read display name/emoji)
- Test: `tests/core/profileCustom.test.ts`

**Interfaces:**
- Produces:
```ts
export const AVATARS: readonly string[]; // ['👧','👦','🧒','👶','🐱','🐶','🦊','🐼']
export interface ProfileCustom { name: string; emoji: string }
export function getCustom(storage?: Storage): Partial<Record<ProfileId, ProfileCustom>>;
export function setCustom(id: ProfileId, c: ProfileCustom, storage?: Storage): void; // sanitises before saving
export function resetCustom(id: ProfileId, storage?: Storage): void;
export function displayProfile(id: ProfileId, storage?: Storage): { name: string; emoji: string }; // falls back to PROFILES[id]
export function sanitiseName(raw: string): string; // trim, collapse inner whitespace, cut to 12 chars (by code points)
```
- [ ] Step 1: failing tests — defaults when empty; set then display returns custom; `sanitiseName('  Nadia   Putri  ')` → `'Nadia Putri'`; 200-char name cut to 12; empty name → default name; unknown emoji → default emoji; malformed JSON / throwing storage → defaults, no throw; reset removes only that profile; `PROFILES[id].stage` unchanged.
- [ ] Step 2: run `npm test -- tests/core/profileCustom.test.ts` → FAIL. Step 3: implement. Step 4: PASS. Step 5: commit `feat(core): per-device profile names and avatars`.

### Task 2: Hold-to-edit on the picker, edit dialog, greeting

**Files:**
- Create: `src/ui/screens/profileEditor.ts`
- Modify: `src/ui/screens/profilePicker.ts`, `src/ui/screens/subjectMap.ts` (greeting), `src/app.ts` (pass display info, re-render picker after save), `e2e/app.spec.ts`
- Test: `tests/ui/profileEdit.test.ts`

**Interfaces:**
- Consumes: Task 1 functions; `Speech` from `src/core/types.ts`.
- Produces: `openProfileEditor(host: HTMLElement, id: ProfileId, opts: { onDone(saved: boolean): void; storage?: Storage }): View` — modal dialog (role="dialog", aria-modal, focus on name input, Esc = Cancel), elements `data-role="name-input"`, `data-role="avatar"` (8 buttons, `data-emoji`, aria-pressed), `data-role="save"|"cancel"|"reset"`.
- Picker card: `data-role="profile-card"` `data-profile="<id>"`; during a hold a progress ring `data-role="hold-ring"` animates for 2000 ms.
- Greeting: subject map shows `data-role="greeting"` text `Hi, {name}! 👋` once per profile entry (not on stage toggle); spoken via speech when autoRead.

- [ ] Step 1: failing tests (jsdom, fake timers, fake speech):
  - tap (pointerdown→pointerup at 100 ms) selects profile, no dialog;
  - hold 1999 ms then release → no dialog, and release after a cancelled-long hold does not count as a tap if held > 600 ms (no accidental selection);
  - hold 2000 ms → dialog opens, profile NOT selected;
  - pointerleave / pointercancel at 1000 ms → no dialog at 2000 ms; navigating away mid-hold leaves `vi.getTimerCount() === 0`;
  - contextmenu event on the card is prevented;
  - in dialog: type "Nadia", pick 🐱, Save → card shows "Nadia" and 🐱, storage has it; Cancel → unchanged; Reset → "Adik"/👧 default; Esc closes;
  - greeting: after picking Adik (autoRead) → greeting "Hi, Nadia! 👋" shown and spoken; Kakak → shown, not spoken.
- [ ] Step 2: run → FAIL. Step 3: implement (hold via pointer events + setTimeout; keyboard: keydown Enter/Space starts the same hold, keyup before 2 s = normal activation; CSS `touch-action: manipulation; user-select: none; -webkit-touch-callout: none`). Step 4: PASS; `npm test`, `npx tsc --noEmit`, `npm run build`.
- [ ] Step 5: e2e test `long name at 360px`: set storage `studykids.profileCustom` to a 12-char name for both, load at 360×640, assert `scrollWidth <= 360` on picker and subject map; `npm run e2e` PASS.
- [ ] Step 6: PANDUAN.md: add a short section "Mengganti nama anak" (tekan dan tahan kartu 2 detik → ketik nama → pilih avatar → Save; perlu diisi sekali per perangkat). Also fix the URL wording to note it follows the repo name exactly (`https://<username>.github.io/StudyKids/`).
- [ ] Step 7: commit `feat(ui): hold-to-edit profile names with greeting`.
