# Grade Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Adik/Kakak profiles (and the name editor) with a Grade 1–6 home menu; auto-read and default mode follow the grade, with a per-device 🔊 toggle.

**Architecture:** A pure `grades.ts` module owns grade defaults and the remembered settings; the router switches from `#/p/<profile>/<stage>` to `#/k/<grade>`; a new grade-menu screen replaces the profile picker; everything profile-related is deleted.

**Tech Stack:** unchanged (Vite 8, TypeScript strict, Tailwind v4, vitest/jsdom, Playwright 1.63 global browser — never `playwright install`).

**Spec:** `docs/superpowers/specs/2026-11-19-grade-menu-design.md`

## Global Constraints

- Grades 1–6; `Stage` type = `1 | 2 | 3 | 4 | 5 | 6`. A grade is "open" only if at least one registered toy lists it in `meta.stages`; otherwise its card shows "🔒 Soon" and is not clickable.
- Defaults: Grades 1–2 → autoRead true, defaultMode 'explore'; Grades 3–6 → autoRead false, defaultMode 'challenge'.
- Storage keys (only these): `studykids.lastGrade` (number as string), `studykids.autoRead` (JSON `{ "1": true, ... }`). Errors swallowed, invalid values ignored. Old keys `studykids.lastProfile`, `studykids.profileCustom` are removed on start (best-effort).
- Routes: `#/` grades; `#/k/<g>`; `#/k/<g>/<subject>`; `#/k/<g>/<subject>/<toy>/<mode>`. Anything else (incl. old `#/p/...`, grade 0/7/'x') → `{name:'grades'}`; a closed grade → grades; unknown subject → subjects; existing toy-level fallbacks unchanged.
- Card copy: big "Grade N", small "Kelas N". Header button "🏠 Grades". 🔊 toggle: aria-pressed, label "Read aloud: on/off", ≥48px.
- Speech rules R9/R13 unchanged, with "profile autoRead" replaced by "the grade's current autoRead setting".
- No names/greeting anywhere. DOM via `h()`/textContent; ≥48px; no horizontal scroll at 360px; commit trailers `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` / `Claude-Session: https://claude.ai/code/session_017fQttueP6FBtYkYVcRNMdu`.

## Review Focus

1. Device that remembered a profile from the old version (old keys + old `#/p/adik/1/...` bookmark) → lands on the grade menu or Grade 1, never a blank screen (Task 2 test).
2. Remembered grade later becomes closed (no toys) or storage holds garbage → grade menu (Task 1 test).
3. Toggling 🔊 mid-challenge takes effect on the next prompt without restarting the round, and never speaks twice (Task 2 test).
4. A toy that lists stage 1 opened via `#/k/3/math/count20/...` (wrong grade) → toy list redirect, as today (Task 2 test).
5. 6 grade cards at 360px → 2 columns, no horizontal scroll (Task 2 e2e).

---

### Task 1: Grades core + router

**Files:** Create `src/core/grades.ts`; Modify `src/core/types.ts` (Stage), `src/core/router.ts`; Delete `src/core/profiles.ts`, `src/core/profileCustom.ts`, `tests/core/profiles.test.ts`, `tests/core/profileCustom.test.ts`; Test `tests/core/grades.test.ts`, `tests/core/router.test.ts` (rewrite).

**Interfaces — Produces:**
```ts
// types.ts
export type Stage = 1 | 2 | 3 | 4 | 5 | 6;
// grades.ts
export const GRADES: readonly Stage[]; // [1,2,3,4,5,6]
export function isGrade(v: unknown): v is Stage;
export function gradeDefaults(g: Stage): { autoRead: boolean; defaultMode: Mode };
export function getAutoRead(g: Stage, storage?: Storage): boolean;
export function setAutoRead(g: Stage, on: boolean, storage?: Storage): void;
export function getLastGrade(storage?: Storage): Stage | null;
export function setLastGrade(g: Stage, storage?: Storage): void;
export function clearLegacyStorage(storage?: Storage): void; // removes studykids.lastProfile, studykids.profileCustom
// router.ts
export type Route =
  | { name: 'grades' }
  | { name: 'subjects'; grade: Stage }
  | { name: 'toys'; grade: Stage; subject: SubjectId }
  | { name: 'toy'; grade: Stage; subject: SubjectId; toy: string; mode: Mode };
export function toHash(r: Route): string;
export function parseHash(hash: string): Route; // mode default = gradeDefaults(g).defaultMode
```
(Open/closed grade is decided by the app layer from the registry, not by the router.)
- [ ] Step 1 tests: defaults for each grade 1–6; get/setAutoRead round-trip per grade and default when unset; garbage JSON / throwing storage → defaults, no throw; lastGrade '7', 'x' → null; clearLegacyStorage removes both old keys only; router round-trips all variants; `parseHash('#/p/adik/1')`, `'#/k/0'`, `'#/k/9/math'`, `''` → grades; `'#/k/3/history'` → subjects g3; `'#/k/1/math/clock/dance'` → mode 'explore'; `'#/k/4/math/clock/x'` → mode 'challenge'.
- [ ] Step 2 RED; Step 3 implement and delete the profile modules (fix compile errors only by adapting imports minimally in files Task 2 will rewrite — it's acceptable for `npm test` UI tests to fail until Task 2, but `tests/core` must pass); Step 4 `npm test -- tests/core` GREEN; Step 5 commit `refactor(core): grades and grade routes replace profiles`.

### Task 2: Grade menu screen, header 🔊 toggle, remove profile UI, docs

**Files:** Create `src/ui/screens/gradeMenu.ts`; Modify `src/app.ts`, `src/ui/screens/subjectMap.ts` (drop Stage toggle and greeting), `src/styles.css` (drop hold-to-edit CSS), `src/toys/math/clock/index.ts` (comment wording only), `e2e/app.spec.ts`, `PANDUAN.md`; Delete `src/ui/screens/profilePicker.ts`, `src/ui/screens/profileEditor.ts`, `tests/ui/profileEdit.test.ts`; Test `tests/ui/app.test.ts`, `tests/ui/shell-speech.test.ts` (adapt), new `tests/ui/gradeMenu.test.ts`.

**Interfaces — Consumes:** Task 1. **Produces:** `renderGradeMenu(el, { openGrades: Stage[], onPick(g: Stage): void, speech }): View` — cards `data-role="grade-card"` `data-grade`, closed cards have `aria-disabled="true"` and "🔒 Soon"; each open card has a 🔊 speaking "Grade N". Header: `data-role="home-grades"` button and `data-role="autoread-toggle"`.
- [ ] Step 1 tests:
  - first launch → 6 cards; Grades 1 and 3 open, 2/4/5/6 show Soon and clicking does nothing;
  - pick Grade 1 → hash `#/k/1`, lastGrade stored; relaunch with lastGrade 1 and empty hash → subject map Grade 1; lastGrade 4 (closed) → grade menu;
  - old keys present + hash `#/p/adik/1/math` → grade menu, old keys removed;
  - toy opens in Explore for Grade 1, Challenge for Grade 3;
  - Grade 1 auto-reads prompts; Grade 3 doesn't; toggle 🔊 on in Grade 3 mid-round → next prompt is spoken once, setting persists after reload; toggle off in Grade 1 → no auto speech (R9/R13 tests in shell-speech adapted to the toggle);
  - `#/k/3/math/count20/explore` → redirect to Grade 3 toy list;
  - no element with text "Adik", "Kakak" or "Hi," anywhere.
- [ ] Step 2 RED; Step 3 implement; Step 4 `npm test`, `npx tsc --noEmit`, `npm run build` GREEN.
- [ ] Step 5 e2e: replace profile flows with grade flows (Grade 1 count20 full round → "10 correct"; offline test picks Grade 3 → clock challenge); 360px: grade menu 2 columns, no horizontal scroll; remove the profile-name e2e tests. `npm run e2e` GREEN.
- [ ] Step 6 PANDUAN.md: remove section 10 (ganti nama); add a short section "Memilih kelas dan suara" (pilih Kelas di menu utama; Kelas 1–2 dibacakan otomatis, Kelas 3–6 lewat tombol 🔊; tombol 🔊 di atas untuk menyalakan/mematikan bacaan otomatis, diingat per perangkat). Update any "Adik/Kakak" mention.
- [ ] Step 7 commit `feat(ui): grade menu with read-aloud toggle; remove profiles`.
