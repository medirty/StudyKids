# StudyKids Phase 1 (Shell + Math) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An installable, fully offline PWA with two child profiles, the 8-subject map, the shared Explore/Challenge/Results flow, and the 7 Math toys (incl. a port of Tick-Tock Time), deployable to GitHub Pages.

**Architecture:** Vite + TypeScript, no UI framework. A thin shell (hash router, screens, round engine, speech, sound effects) renders self-contained toy modules that implement one `Toy` interface. All game logic that decides correctness, phrasing and question generation lives in pure functions with unit tests; DOM views are thin and covered by a few jsdom tests plus Playwright e2e. `vite-plugin-pwa` precaches every asset; new versions activate on the next app open.

**Tech Stack:** Node 22, Vite 6, TypeScript 5 (strict), Tailwind CSS v4 (`@tailwindcss/vite`), `@fontsource/fredoka` + `@fontsource/nunito`, `canvas-confetti`, `vite-plugin-pwa` (Workbox `generateSW`), `@vite-pwa/assets-generator`, Vitest + jsdom, Playwright (preinstalled Chromium), GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-18-kids-study-app-design.md` (Indonesian). Visual/interaction reference: `reference/tick-tock-clock.html`.

**Out of scope for this plan:** English, Science (Phase 2 plan), the other 7 subjects' toys (Phase 3 plan), phonics audio.

## Global Constraints

- No runtime network requests to any host other than the app's own origin. No CDN `<script>`/`<link>`; fonts, confetti, CSS are bundled.
- Works offline after first online visit; new version activates on next open, never reloads mid-play (`registerType: 'prompt'`, no `skipWaiting`, no `clientsClaim`, no refresh prompt UI).
- All child-facing content is English; British spelling ("colour").
- No progress persistence. The only `localStorage` key is `studykids.lastProfile`.
- Profiles: `adik` → Stage 1, default mode `explore`, auto read-aloud ON; `kakak` → Stage 3, default mode `challenge`, auto read-aloud OFF.
- Round = 10 questions; a wrong answer shows a hint and allows exactly one retry; the results screen counts the **first** answer only.
- Feedback copy is gentle: never "Wrong"; use "Almost!", "Try again!", "Let's look together".
- Touch targets ≥ 48×48 CSS px; layouts must not scroll horizontally at 360px width.
- Speech: `speechSynthesis` only, rate 0.92, pitch 1.1; voice preference `en-GB` local → any `en-*` local → any `en-*` → browser default. Must no-op silently if `speechSynthesis` is missing.
- Never copy Cambridge copyrighted text; each toy cites only a learning-objective summary written in our own words.
- Visual tokens from the prototype: bg `#FFFDF7` with dotted radial pattern, sand `#F5EFE0`, coral `#FF6B6B`, ocean `#3B82F6`, mint `#10B981`, amber `#F59E0B`, violet `#8B5CF6`; fonts Fredoka (display) / Nunito (body); `.toy-btn` press effect and `.toy-card` shadow as in the prototype.

## Review Focus

1. **`speechSynthesis` missing or voices not loaded yet** (Chrome returns `[]` until `voiceschanged`; some Android browsers lack the API) → app works, speak calls resolve without throwing. Test in Task 3.
2. **Leaving a toy mid-round or mid-speech** (Home button, browser back) → speech is cancelled, views destroyed, no late callbacks touching removed DOM. Test in Task 5.
3. **Double-tapping "Check"** → one attempt recorded, never skips a question. Test in Task 2 (engine) and Task 5 (button disabled during feedback).
4. **Stale or garbage hash** (old bookmark after an update, `#/p/nobody/...`, unknown toy id) → redirected to the profile picker or subject map, no blank screen. Test in Task 4.
5. **360px-wide phone portrait** → no horizontal scroll on the toy screen; clock remains draggable. Test in Task 13 (e2e).

---

## File Structure

```
index.html                     app entry, <div id="app">
vite.config.ts                 vite + tailwind + pwa + vitest config
package.json, tsconfig.json, playwright.config.ts
public/icon.svg                source icon (generated PNGs land in public/)
.github/workflows/deploy.yml   test + build + deploy to GitHub Pages
src/main.ts                    boot: styles, fonts, SW registration, router → screens
src/styles.css                 tailwind import, @theme tokens, .toy-btn/.toy-card/body pattern
src/core/types.ts              Stage, SubjectId, Mode, Toy, Question, CheckResult, Explanation, ToyContext, views
src/core/rng.ts                seeded RNG + helpers
src/core/round.ts              pure round engine
src/core/speech.ts             pickVoice, createSpeech
src/core/sfx.ts                Web Audio tick/success/tryAgain
src/core/celebrate.ts          confetti wrapper
src/core/router.ts             Route type, parseHash, toHash
src/core/profiles.ts           PROFILES, getLastProfile, setLastProfile
src/content/subjects.ts        8 subjects
src/content/registry.ts        TOYS, toysFor, findToy
src/ui/dom.ts                  h() element helper
src/ui/speakButton.ts          🔊 button
src/ui/readAloud.ts            text with per-word highlight
src/ui/screens/profilePicker.ts
src/ui/screens/subjectMap.ts
src/ui/screens/toyList.ts
src/ui/screens/toyScreen.ts    header, mode switch, explore host, challenge loop
src/ui/screens/results.ts
src/toys/math/clock/{time.ts,face.ts,index.ts}
src/toys/math/count20/index.ts
src/toys/math/numberLine/index.ts
src/toys/math/shapes/index.ts
src/toys/math/multiply/index.ts
src/toys/math/fractions/index.ts
src/toys/math/placeValue/{words.ts,index.ts}
tests/**                       vitest, mirrors src/
e2e/app.spec.ts                Playwright: offline, flow, 360px
PANDUAN.md, CREDITS.md
```

Each toy module directory owns its pure logic and its view; a toy's pure helpers (`generateQuestions`, `check`, `explain`, `describeAnswer`) are exported for tests.

---

### Task 1: Scaffold, styling, PWA and deploy pipeline

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/styles.css`, `public/icon.svg`, `.github/workflows/deploy.yml`, `.gitignore`, `tests/smoke.test.ts`

**Interfaces:**
- Produces: `npm test` (vitest run), `npm run build`, `npm run preview` (port 4173), `npm run e2e`; `src/main.ts` exports nothing and calls `startApp(document.getElementById('app')!)` (defined in Task 5; until then render a placeholder `<h1>StudyKids</h1>`).

- [ ] **Step 1:** `npm init -y`, install deps: `vite typescript vitest jsdom @tailwindcss/vite tailwindcss vite-plugin-pwa @vite-pwa/assets-generator @playwright/test @fontsource/fredoka @fontsource/nunito canvas-confetti @types/canvas-confetti`. Scripts: `dev`, `build` (`tsc --noEmit && vite build`), `preview` (`vite preview --port 4173 --strictPort`), `test` (`vitest run`), `e2e` (`playwright test`), `icons` (`pwa-assets-generator --preset minimal-2023 public/icon.svg`). Use the preinstalled Playwright browser; do not run `playwright install`.
- [ ] **Step 2:** `vite.config.ts`: `base: process.env.VITE_BASE ?? '/'`; plugins `tailwindcss()` and `VitePWA({ registerType: 'prompt', injectRegister: false, workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2,mp3,ogg}'], navigateFallback: 'index.html' }, manifest: { name: 'StudyKids', short_name: 'StudyKids', display: 'standalone', orientation: 'any', background_color: '#FFFDF7', theme_color: '#F59E0B', start_url: '.', scope: '.', icons: [...] } })`; `test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] }`.
- [ ] **Step 3:** `src/styles.css`: `@import "tailwindcss";` plus `@theme` with the Global Constraints colours (`--color-cream`, `--color-sand`, `--color-coral`, `--color-ocean`, `--color-mint`, `--color-amber-toy`, `--color-violet-toy`) and `--font-display: Fredoka`, `--font-sans: Nunito`; port `body`, `.toy-btn`, `.toy-card`, `.draggable-hand` rules from the prototype. `src/main.ts` imports `@fontsource/fredoka/{500,600,700}.css`, `@fontsource/nunito/{600,700,800}.css`, `./styles.css`, then `registerSW({ immediate: true })` from `virtual:pwa-register`.
- [ ] **Step 4:** `public/icon.svg`: amber rounded square with a white clock glyph (as in the prototype header); run `npm run icons` and reference the generated PNGs in the manifest.
- [ ] **Step 5:** `.github/workflows/deploy.yml`: on push to `main` and `workflow_dispatch`; job `build`: checkout, `actions/setup-node@v4` node 22 with npm cache, `npm ci`, `npm test`, `npm run build` with `VITE_BASE: /${{ github.event.repository.name }}/`, `actions/upload-pages-artifact@v3` (path `dist`); job `deploy`: `actions/deploy-pages@v4`, permissions `pages: write`, `id-token: write`, environment `github-pages`.
- [ ] **Step 6: Write test** `tests/smoke.test.ts`: `it('builds with no external URLs in index.html')` reads `index.html` and asserts it contains no `http://` or `https://`.
- [ ] **Step 7:** Run `npm test && npm run build`. Expected: test PASS; `dist/sw.js` and `dist/manifest.webmanifest` exist; `grep -rE "https?://(fonts|cdn)" dist` finds nothing.
- [ ] **Step 8: Commit** `chore: scaffold vite pwa with tailwind and pages deploy`.

### Task 2: Core types, RNG and round engine

**Files:**
- Create: `src/core/types.ts`, `src/core/rng.ts`, `src/core/round.ts`
- Test: `tests/core/rng.test.ts`, `tests/core/round.test.ts`

**Interfaces:**
- Produces (`types.ts`):

```ts
export type Stage = 1 | 3;
export type SubjectId = 'math'|'english'|'science'|'gp'|'wellbeing'|'art'|'music'|'computing';
export type Mode = 'explore' | 'challenge';
export interface Question { id: string; prompt: string } // prompt: shown + spoken
export interface CheckResult { correct: boolean; hint?: string }
export interface Explanation { why: string; how: string }
export interface Speech { speak(text: string, opts?: { onWord?: (charIndex: number) => void }): Promise<void>; stop(): void; available: boolean }
export interface Sfx { tick(major?: boolean): void; success(): void; tryAgain(): void }
export interface ToyContext { stage: Stage; autoRead: boolean; speech: Speech; sfx: Sfx; celebrate(): void }
export interface View { destroy(): void }
export interface ChallengeView<A> extends View { getAnswer(): A; reset(): void }
export interface Toy<Q extends Question = Question, A = unknown> {
  meta: { id: string; subject: SubjectId; stages: Stage[]; title: string; icon: string; objective: string };
  explore(el: HTMLElement, ctx: ToyContext): View;
  generateQuestions(stage: Stage, count: number, rng: Rng): Q[];
  renderChallenge(el: HTMLElement, q: Q, ctx: ToyContext): ChallengeView<A>;
  check(q: Q, answer: A): CheckResult;
  describeAnswer(q: Q, answer: A): string;   // "You made 4:15 (15 past 4)"
  explain(q: Q, answer: A): Explanation;
  demonstrate?(el: HTMLElement, q: Q, ctx: ToyContext): Promise<View>; // renders and animates the correct answer
}
export type Rng = () => number; // [0,1)
```

- Produces (`rng.ts`): `mulberry32(seed: number): Rng`, `randInt(rng, min, max): number` (inclusive), `pick<T>(rng, items: readonly T[]): T`, `shuffle<T>(rng, items: readonly T[]): T[]`.
- Produces (`round.ts`):

```ts
export interface Mistake<Q, A> { question: Q; firstAnswer: A }
export interface RoundResults<Q, A> { correct: number; wrong: number; mistakes: Mistake<Q, A>[] }
export type SubmitOutcome = 'correct' | 'retry' | 'reveal'; // reveal = second wrong, move on after showing answer
export interface Round<Q, A> {
  readonly index: number; readonly total: number; readonly done: boolean;
  current(): Q | null;
  submit(answer: A, correct: boolean): SubmitOutcome; // throws Error('round done') when done
  advance(): void;   // only legal after 'correct' or 'reveal'; idempotent guard: throws Error('not answered')
  results(): RoundResults<Q, A>;
}
export function createRound<Q, A>(questions: Q[]): Round<Q, A>;
```

- [ ] **Step 1: Write failing tests** `tests/core/round.test.ts`:
  - `counts first answer only`: questions [a,b]; submit(x,false)→'retry'; submit(y,true)→'correct'; advance(); submit(z,true)→'correct'; advance(); `results()` = `{correct:1, wrong:1, mistakes:[{question:a, firstAnswer:x}]}`; `done === true`.
  - `second wrong reveals`: submit(x,false)→'retry'; submit(y,false)→'reveal'.
  - `submit after correct without advance is ignored`: submit(x,true)→'correct'; submit(x,true) returns 'correct' again and results still count 1 correct (double-tap guard).
  - `advance before answering throws 'not answered'`; `submit when done throws 'round done'`.
  - `empty round is done immediately` with results `{0,0,[]}`.
  `tests/core/rng.test.ts`: `mulberry32(42)` yields identical sequences for two instances; `randInt` stays within bounds over 1000 draws; `shuffle` returns a permutation and does not mutate input.
- [ ] **Step 2:** Run `npm test -- tests/core` → FAIL (modules missing).
- [ ] **Step 3:** Implement the three files per the interfaces.
- [ ] **Step 4:** Run `npm test -- tests/core` → PASS.
- [ ] **Step 5: Commit** `feat(core): types, seeded rng, round engine`.

### Task 3: Speech, sound effects, celebration

**Files:**
- Create: `src/core/speech.ts`, `src/core/sfx.ts`, `src/core/celebrate.ts`
- Test: `tests/core/speech.test.ts`

**Interfaces:**
- Consumes: `Speech`, `Sfx` from Task 2.
- Produces: `pickVoice(voices: Pick<SpeechSynthesisVoice,'lang'|'localService'|'name'>[]): typeof voices[number] | null`; `createSpeech(synth?: SpeechSynthesis | undefined): Speech` (defaults to `globalThis.speechSynthesis`); `createSfx(): Sfx` (lazy `AudioContext`, resumes on first call, all errors swallowed, tick throttled to ≥45ms apart; notes: tick C5 / major G5, success C5-E5-G5-C6 at 0.1s steps, tryAgain E4→C4 — triangle wave, as in prototype); `celebrate(): void` (canvas-confetti `{particleCount:70, spread:65, origin:{y:0.6}}`, honours `prefers-reduced-motion` by doing nothing).

- [ ] **Step 1: Write failing tests:**
  - `pickVoice prefers local en-GB`: from `[{lang:'en-US',localService:false},{lang:'id-ID',localService:true},{lang:'en-GB',localService:true}]` returns the en-GB one.
  - `pickVoice falls back to any local en, then any en, then null`: three cases.
  - `createSpeech(undefined)` → `available === false`; `await speak('hi')` resolves; `stop()` does not throw.
  - `speak resolves on end and cancels previous`: fake synth object with `speak(u)` capturing utterance, `cancel` spy, `getVoices: () => []`; call `speak('a')`, then `speak('b')`; expect `cancel` called before second speak; firing `u.onend()` resolves; utterance `rate === 0.92`, `pitch === 1.1`, `lang === 'en-GB'`.
  - `speak resolves even if onerror fires` and `stop() resolves a pending speak` (no hanging promises after leaving a screen).
  - `onWord receives charIndex from boundary events` (fire `u.onboundary({name:'word', charIndex:3})`).
  - `voices loaded late`: getVoices returns `[]` first, then a list after a `voiceschanged` event; the next `speak` uses `pickVoice` on the new list.
- [ ] **Step 2:** Run `npm test -- tests/core/speech.test.ts` → FAIL.
- [ ] **Step 3:** Implement the three modules.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(core): speech with voice selection, sfx, confetti`.

### Task 4: Router, profiles, subjects, registry

**Files:**
- Create: `src/core/router.ts`, `src/core/profiles.ts`, `src/content/subjects.ts`, `src/content/registry.ts`
- Test: `tests/core/router.test.ts`, `tests/core/profiles.test.ts`, `tests/content/registry.test.ts`

**Interfaces:**
- Produces:

```ts
// router.ts
export type Route =
  | { name: 'profiles' }
  | { name: 'subjects'; profile: ProfileId; stage: Stage }
  | { name: 'toys'; profile: ProfileId; stage: Stage; subject: SubjectId }
  | { name: 'toy'; profile: ProfileId; stage: Stage; subject: SubjectId; toy: string; mode: Mode };
export function parseHash(hash: string): Route;   // never throws; invalid → best valid ancestor
export function toHash(r: Route): string;          // '#/', '#/p/adik/1', '#/p/adik/1/math', '#/p/adik/1/math/clock/explore'
// profiles.ts
export type ProfileId = 'adik' | 'kakak';
export interface Profile { id: ProfileId; name: string; emoji: string; stage: Stage; defaultMode: Mode; autoRead: boolean }
export const PROFILES: Record<ProfileId, Profile>; // adik: 'Adik','👧',1,'explore',true · kakak: 'Kakak','👦',3,'challenge',false
export function getLastProfile(storage?: Storage): ProfileId | null;
export function setLastProfile(id: ProfileId, storage?: Storage): void; // key 'studykids.lastProfile'; swallow errors
// subjects.ts
export interface Subject { id: SubjectId; title: string; icon: string; color: string }
export const SUBJECTS: Subject[]; // order: math 🔢 Maths, english 🔤 English, science 🔬 Science, gp 🌏 Global Perspectives, wellbeing 💛 Wellbeing, art 🎨 Art & Design, music 🎵 Music, computing 🤖 Computing
// registry.ts
export const TOYS: Toy<any, any>[];               // filled by later tasks
export function toysFor(subject: SubjectId, stage: Stage): Toy<any, any>[];
export function findToy(id: string): Toy<any, any> | undefined;
```

- [ ] **Step 1: Write failing tests:**
  - router round-trips every Route variant through `toHash`/`parseHash`.
  - `parseHash('')`, `'#'`, `'#/garbage'`, `'#/p/nobody/1'` → `{name:'profiles'}`.
  - `parseHash('#/p/adik/7')` → subjects with stage = profile's stage (1).
  - `parseHash('#/p/kakak/3/history')` → `{name:'subjects', profile:'kakak', stage:3}`.
  - `parseHash('#/p/kakak/3/math/clock/dance')` → toy route with mode `'challenge'` (profile default). (Unknown toy ids are resolved by the screen layer, Task 5.)
  - profiles: set then get with a fake Storage returns id; a Storage whose `getItem`/`setItem` throw → `getLastProfile` returns null, `setLastProfile` does not throw; stored value `'hacker'` → null.
  - registry: `SUBJECTS.length === 8`; `toysFor('english', 1)` is `[]` for now.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(core): hash router, profiles, subjects, toy registry`.

### Task 5: Shell screens and challenge flow

**Files:**
- Create: `src/ui/dom.ts`, `src/ui/speakButton.ts`, `src/ui/readAloud.ts`, `src/ui/screens/{profilePicker,subjectMap,toyList,toyScreen,results}.ts`, `src/app.ts`
- Modify: `src/main.ts` (call `startApp`)
- Test: `tests/ui/app.test.ts`, `tests/fixtures/fakeToy.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–4.
- Produces: `startApp(root: HTMLElement, deps?: { speech?: Speech; sfx?: Sfx; celebrate?: () => void; rng?: Rng; toys?: Toy<any,any>[] }): { destroy(): void }` in `src/app.ts`. Each screen is `render<Name>(el, props): View`. `readAloud(text, speech, {auto}): { el: HTMLElement; play(): Promise<void> }` wraps each word in a `<span>` and adds class `bg-amber-200 rounded` to the word at the current `onWord` charIndex.

Behaviour (from spec §5, §6.1):
- Profile picker: two big cards (emoji + name). On pick → `setLastProfile`, go to `subjects` with the profile's stage. On app start with a last profile and empty hash → go straight to its subject map; a "👥 Switch" button is always in the header.
- Subject map: 8 cards in a responsive grid (2 cols at 360px, 4 at ≥768px), coloured by subject; a Stage toggle pill `Stage 1 | Stage 3`. Subjects with zero toys for the stage show a muted card with "🔒 Soon" and are not clickable. Each card has a 🔊 button speaking its title.
- Toy list: cards with icon, title, 🔊.
- Toy screen: header (🏠 Home → subject map, ← back to toy list, title), mode pill `🧭 Explore | ⭐ Challenge`, defaulting to the route's mode. Unknown toy id → replace hash with the subject's toy list.
- Challenge loop: create round from `toy.generateQuestions(stage, 10, rng)`. Shows `Question 3 of 10`, prompt via `readAloud` (auto-plays when `ctx.autoRead`), toy's challenge view, and a big `✅ Check` button. On Check: disable button; `check()`; submit to round.
  - `correct` → `sfx.success()`, `celebrate()`, speak "Great job!", then after 1200ms advance.
  - `retry` → `sfx.tryAgain()`, show amber hint box "🤔 Almost! {hint}" and speak it; re-enable Check.
  - `reveal` → show "Let's look together" plus `explain().how`; if the toy has `demonstrate`, run it in place of the challenge view; show a `➡️ Next` button.
  - After the last question → results screen.
- Results: big `⭐ {correct} correct · {wrong} to practise` (never the word "wrong"), confetti if correct ≥ 7. For each mistake: prompt, "You answered: {describeAnswer}", **Why:** `why`, **How:** `how`, 🔊 (speaks why + how), and `▶ Show me` when the toy has `demonstrate` (renders into the card). Buttons `🔁 Retry mistakes` (only if mistakes > 0; new round from the mistake questions) and `▶ New round`.
- Navigating away (any route change) destroys the current screen: `speech.stop()`, all views' `destroy()`, pending timers cleared.

- [ ] **Step 1: Write fixture** `tests/fixtures/fakeToy.ts`: a `Toy<{id,prompt,target:number}, number>` whose challenge view is an `<input>`; `check` = equality, hint `'Count again'`; `explain` returns `{why:'W', how:'H'}`; `generateQuestions` returns targets 1..count.
- [ ] **Step 2: Write failing tests** `tests/ui/app.test.ts` (jsdom, fake speech recording calls, fake sfx, `vi.useFakeTimers()`):
  - `first launch shows two profiles`; clicking Adik sets `location.hash` to `#/p/adik/1` and stores the profile.
  - `relaunch with stored profile opens its subject map`.
  - `subject map shows 8 cards and locked ones are not links` (with only the fake toy registered under math).
  - `toy route with unknown id redirects to toy list`.
  - `round flow`: answer q1 wrong then right, answer the rest right → results text contains `9 correct` and `1 to practise`, and one mistake card with "Why:" W and "How:" H.
  - `double click on Check records one attempt`: click Check twice synchronously with a wrong answer → hint shown once; round still on question 1.
  - `retry mistakes builds a 1-question round`.
  - `leaving mid-speech stops speech`: start challenge as adik (autoRead), change hash to `#/p/adik/1`, expect `speech.stop` called and no errors after running all timers.
  - `kakak does not auto-read prompts` (no speak call on question render).
- [ ] **Step 3:** Run `npm test -- tests/ui` → FAIL. **Step 4:** Implement. **Step 5:** Run → PASS; `npm run build` passes.
- [ ] **Step 6: Commit** `feat(ui): profile picker, subject map, toy screen, challenge loop, results`.

### Task 6: Clock time engine and draggable face

**Files:**
- Create: `src/toys/math/clock/time.ts`, `src/toys/math/clock/face.ts`
- Test: `tests/toys/clock/time.test.ts`, `tests/toys/clock/face.test.ts`

**Interfaces:**
- Produces (`time.ts`, a direct port of the prototype's sections 4 and 6 maths):

```ts
export type Zone = 'oclock' | 'past' | 'to';
export function hourMinute(total: number): { hour12: number; minute: number; nextHour12: number; normalized: number };
export function spokenTime(total: number, useQuarter?: boolean): { phrase: string; hint: string; zone: Zone };
export function digitalTime(total: number): string;
export function angleFromPointer(dx: number, dy: number): number; // 0..360, 0 = 12 o'clock, clockwise
export function minuteFromAngle(angle: number, snap: number): number; // snap in minutes (1 = none, 5, 30)
export function totalFromMinuteDrag(prevTotal: number, newMinute: number): number; // crossing 12 advances/rewinds hour
export function totalFromHourDrag(angle: number, snap: number): number;
export function sameTime(a: number, b: number, toleranceMin?: number): boolean; // default 1, wraps 59↔0
```

- Produces (`face.ts`): `createClockFace(el: HTMLElement, opts: { minutes: number; snap: number; zones: boolean; interactive: boolean; onChange?: (total: number, majorTick: boolean) => void }): { getMinutes(): number; setMinutes(total: number, animateMs?: number): Promise<void>; setSnap(n: number): void; setZones(on: boolean): void; destroy(): void }`. SVG geometry, colours, hit areas and tap-to-move behaviour copied from `reference/tick-tock-clock.html`; pointer listeners on `window` are removed in `destroy()`.

- [ ] **Step 1: Write failing tests** (values from the prototype):
  - `spokenTime(195)` → phrase `15 past 3`, zone `past`; `spokenTime(195, true)` → `quarter past 3`.
  - `spokenTime(225)` → `15 to 4`; with quarter → `quarter to 4`; zone `to`.
  - `spokenTime(0)` → `12 o'clock`; `spokenTime(210)` → `half past 3`; `spokenTime(181)` → `1 minute past 3`; `spokenTime(239)` → `1 minute to 4`; `spokenTime(200)` → `20 past 3`; `spokenTime(700)` (11:40) → `20 to 12`.
  - `digitalTime(65)` → `1:05`; `digitalTime(0)` → `12:00`; `hourMinute(-5).normalized === 715`.
  - `angleFromPointer(0,-1) === 0`, `(1,0) === 90`, `(0,1) === 180`, `(-1,0) === 270`.
  - `minuteFromAngle(93, 5) === 15`, `minuteFromAngle(357, 1) === 0`, `minuteFromAngle(100, 30) === 30`.
  - `totalFromMinuteDrag(3*60+58, 2) === 4*60+2`; `totalFromMinuteDrag(4*60+2, 58) === 3*60+58`; `totalFromMinuteDrag(11*60+58, 1) === 1` (12:01).
  - `sameTime(225, 226)` true, `sameTime(0, 719)` true, `sameTime(225, 240)` false.
  - face (jsdom): `setMinutes(225)` sets minute hand `transform` to `rotate(270 200 200)` and hour hand to `rotate(112.5 200 200)`; `interactive:false` attaches no pointer listeners; `destroy()` removes window listeners (spy on `removeEventListener`).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(clock): time phrasing engine and draggable clock face`.

### Task 7: Tick-Tock Time toy

**Files:**
- Create: `src/toys/math/clock/index.ts`
- Modify: `src/content/registry.ts` (register)
- Test: `tests/toys/clock/toy.test.ts`

**Interfaces:**
- Consumes: Task 6 functions, `Toy` from Task 2.
- Produces: `clockToy: Toy<ClockQuestion, number>` with `ClockQuestion = Question & { target: number }`; meta `{ id:'clock', subject:'math', stages:[1,3], title:'Tick-Tock Time', icon:'🕒', objective:'Read and show time on an analogue clock (Stage 1: o\'clock and half past; Stage 3: to 5 minutes, past and to).' }`.

Behaviour:
- Explore = the prototype's explore panel: clock face (snap off, zones on), "How we say it" phrase + hint, Read Aloud (`It's {phrase}!`), digital time with Hide/Show, phrasing style toggle, Quick Jump (o'clock/15 past/half past/15 to), ±5 min, 🎲 Random. Stage 1 hides the zone toggle, snap toggle and phrasing toggle, and its Quick Jump shows only O'clock and Half past.
- Challenge view: interactive face, snap 5 (Stage 1: snap 30), starts at 12:00; `getAnswer()` = face minutes; `reset()` → 12:00.
- `generateQuestions(stage, n, rng)`: Stage 1 minute ∈ {0, 30}; Stage 3 minute drawn from the prototype's weighted pool `[0,0,15,15,15,30,30,30,45,45,45,5,10,20,25,35,40,50,55]`; hour 0–11 uniform; no two consecutive equal targets. Prompt: `Show me {phrase}` (Stage 3 uses "15 past/15 to" style).
- `check` = `sameTime(target, answer)`; hints copied from the prototype's `checkQuizAnswer` (minute side "past"/"to" hints, then hour-hand hint), as plain text without HTML.
- `describeAnswer` → `{digital} ({phrase})`.
- `explain`: if the minute is wrong and target zone is `to`: why `"to" means BEFORE the next hour, so the long hand goes on the left side.`; zone `past`: why `"past" means AFTER the hour, so the long hand goes on the right side.`; o'clock: why `At o'clock the long hand points straight up to 12.`; if only the hour is wrong: why `The long hand was right, but the short hand shows the hour.` and, for `to` times, add `For "to" times the short hand is almost at {nextHour12}.`. how: `Put the long blue hand on {minute === 0 ? 12 : minute/5} and the short red hand {near/on} {hour}.` (near when minute ≠ 0).
- `demonstrate`: non-interactive face at 12:00, `setMinutes(target, 1500)`, then speak `It's {phrase}!`.

- [ ] **Step 1: Write failing tests:** Stage 1 questions (seed 1, n=50) all have minute 0 or 30; Stage 3 minutes are all multiples of 5; no consecutive duplicates; `check(q(225), 226).correct` true; `check(q(225), 195)` → false with hint containing `left`; `check(q(225), 165)` (2:45, minute right, hour wrong) → hint containing `almost at 4`; `explain(q(225), 195).why` contains `BEFORE`; `describeAnswer(q, 195) === '3:15 (15 past 3)'`; `clockToy` registered: `toysFor('math', 1)` and `toysFor('math', 3)` both include `clock`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Manual check: `npm run dev`, open the toy as Adik and Kakak at 360px and 1280px widths; take a screenshot each and compare with the prototype look.
- [ ] **Step 6: Commit** `feat(math): Tick-Tock Time toy`.

### Tasks 8–12: the other Math toys

Each task follows the same five steps as Task 7 (failing tests on the pure functions → run FAIL → implement module + register → run PASS → commit `feat(math): <toy>`), plus a screenshot check at 360px. Each toy: `src/toys/math/<dir>/index.ts`, test `tests/toys/<dir>.test.ts`, registered in `registry.ts`. Every `demonstrate` animates step by step and speaks each step. Hints and explanations are gentle and mention the concrete numbers.

#### Task 8: Count to 20 — `count20`, Stage 1, icon 🍎
- Objective: count objects to 20; recognise 10 and some more.
- Explore: two ten-frames; tap an empty cell to add an apple, tap an apple to remove it; big number and spoken count ("thirteen") after each tap.
- Challenge Q: `{ target: 1..20 }`, prompt `Show me {target}`; answer = apples placed (number); start empty.
- `check`: equality; hint `That's {a}. You need {more|fewer} — count again!`.
- `explain`: why `You put {a}. We needed {t}, that is {|t−a|} {more|fewer}.`; how: t > 10 → `Fill one ten-frame to make 10, then add {t−10} more.`, else `Put {t} apples, counting 1, 2, 3… up to {t}.`.
- Tests: generator gives 1..20 only; `explain(q14, 12).how` contains `add 4 more`.

#### Task 9: Number Line Hops — `numberLine`, Stage 1, icon 🐸
- Objective: add and subtract within 20 using a number line.
- Explore: number line 0–20 with a frog; buttons `+1`, `−1`, `+5`, `−5`; each hop animates and speaks the number.
- Challenge Q: `{ a, op: '+'|'−', b, answer }` with all values 0–20, `b ≥ 1`, no negative results; prompt `{a} + {b} = ?` read as "seven plus five"; the frog starts on `a`; the child hops with the buttons; answer = the frog's position.
- `check`: equality; hint `Start at {a} and hop {b} {forward|back}.`.
- `explain`: why `You landed on {x}.`; how `Start at {a}, hop {b} {forward|back}: …{each number}… you land on {answer}.`.
- Tests: 200 generated questions are all within bounds; the how text for 7+5 lists `8, 9, 10, 11, 12`.

#### Task 10: Shape Spotter — `shapes`, Stage 1, icon 🔺
- Objective: name and describe common 2D and 3D shapes.
- Shapes: 2D circle, triangle, square, rectangle; 3D cube, cuboid, sphere, cylinder, cone, pyramid (drawn as simple SVG with shading).
- Explore: grid of all shapes; tap one → name spoken; 2D shapes trace their sides with a counting animation ("1, 2, 3 sides"); 3D shapes say faces/rolls ("A sphere can roll").
- Challenge Q: `{ target, options: 4 shape ids incl. target }`, prompt `Find the {target}`; answer = tapped shape id (tap selects, Check confirms).
- `check`: equality; hint = the target's describing fact (e.g. `A triangle has 3 sides and 3 corners.`).
- `explain`: why `That is a {chosen}.`; how = the target's fact; `demonstrate` highlights and traces the target.
- Tests: options always contain the target, have 4 unique ids, and the same dimension (all 2D or all 3D); a fact is defined for every shape.

#### Task 11: Times Tables — `multiply`, Stage 3, icon ✖️
- Objective: recall 2, 3, 4, 5, 8 and 10 times tables; understand multiplication as equal groups and arrays.
- Explore: array builder with rows and columns steppers (1–10) showing dots, `3 × 4 = 12` and the skip-count line `4, 8, 12`.
- Challenge Q: `{ a: 1..10, b ∈ {2,3,4,5,8,10}, answer }`, prompt `{a} × {b} = ?`; answer via an on-screen number pad (0–9, ⌫), max 3 digits, plus an optional "🔍 Show dots" helper that draws the array.
- `check`: equality; hint `Count in {b}s, {a} times.`.
- `explain`: why `{a} × {b} is not {x}.`; how `{a} groups of {b}: {skip-count list} → {answer}.`; `demonstrate` draws the groups row by row while speaking the skip count.
- Tests: all b values come from the set; `explain` for 4×3 has how `4 groups of 3: 3, 6, 9, 12 → 12`.

#### Task 12: Fraction Pizza and Place Value Blocks — `fractions` (🍕) and `placeValue` (🧱), Stage 3
These are two separate modules in one task because they share the "build it, then Check" pattern; commit each separately.
- **fractions** — Objective: recognise and make unit and non-unit fractions (halves, thirds, quarters, fifths, sixths, eighths, tenths) of a shape.
  - Explore: choose the number of equal parts (2, 3, 4, 5, 6, 8, 10); tap slices to colour them; shows `3/4` and says "three quarters".
  - Challenge Q: `{ num, den }` with `1 ≤ num < den`; pizza pre-cut into `den`; prompt `Colour {num}/{den} of the pizza` ("three quarters"); answer = coloured count.
  - `check`: equality; hint `The pizza has {den} equal parts. Colour {num} of them.`.
  - `explain`: why `You coloured {x} out of {den}.`; how `{num}/{den} means {num} of {den} equal parts.`.
  - `fractionWords(num, den)` exported and tested: 1/2 `one half`, 3/4 `three quarters`, 2/3 `two thirds`, 5/8 `five eighths`, 1/10 `one tenth`.
- **placeValue** — Objective: understand hundreds, tens and ones up to 1000.
  - `words.ts`: `numberToWords(n: 0..1000)` in British English, tested on 0 `zero`, 7 `seven`, 15 `fifteen`, 40 `forty`, 56 `fifty-six`, 100 `one hundred`, 305 `three hundred and five`, 356 `three hundred and fifty-six`, 1000 `one thousand`.
  - Explore: tap `+`/`−` under hundreds flats, tens rods and ones cubes (0–9 each); shows the number and its words, both spoken.
  - Challenge Q: `{ target: 100..999 }`, prompt `Make {target}`; answer `{h,t,o}`; `check` compares `100h + 10t + o` with the target; hint names the first wrong column (`Check your tens.`).
  - `explain`: why `You made {value}.`; how `{target} = {h} hundreds, {t} tens and {o} ones.`.

### Task 13: Offline e2e, guide, credits, handoff

**Files:**
- Create: `playwright.config.ts`, `e2e/app.spec.ts`, `PANDUAN.md`, `CREDITS.md`

**Interfaces:**
- Consumes: the built app (`npm run build && npm run preview`).

- [ ] **Step 1: Write e2e tests** (`webServer: npm run build && npm run preview`, baseURL `http://localhost:4173`):
  - `no external requests`: record every request during a full session (profile → math → clock explore → challenge one question); assert every request URL starts with the baseURL.
  - `works offline after first visit`: load, `await page.evaluate(() => navigator.serviceWorker.ready)`, reload once, `context.setOffline(true)`, reload, pick Kakak, open Maths → Tick-Tock Time, expect `Question 1 of 10`.
  - `360px portrait`: viewport 360×640, open each of the 7 math toys in both modes; assert `document.documentElement.scrollWidth <= 360`; on the clock challenge, drag the minute hand from 12 to 3 with `page.mouse` and expect the clock's minutes to be 15 (expose `data-minutes` on the face root).
  - `round to results`: as Adik in the `count20` challenge, answer 10 questions by tapping the needed number of cells (read the target from the prompt's `data-target` attribute), expect `10 correct`.
- [ ] **Step 2:** Run `npm run e2e` → PASS (fix any failures in the owning task's code).
- [ ] **Step 3:** Write `PANDUAN.md` in Indonesian for Bimo (Windows): (1) create a GitHub account; (2) install GitHub Desktop; (3) add the StudyKids folder as a repository and publish it (public repo named `studykids`); (4) Settings → Pages → Source: GitHub Actions; (5) find the URL `https://<username>.github.io/studykids/`; (6) install on Windows Chrome/Edge (install icon in the address bar), Android Chrome (⋮ → Install app), iPad/iPhone Safari (Share → Add to Home Screen); (7) offline check: open once online, turn on airplane mode, open the app; (8) updating: commit + push in GitHub Desktop, wait for the green tick under Actions, close the app fully and reopen it twice while online; (9) if the iPad loses the app offline, open it once online. Include screenshots-free, numbered steps and a short troubleshooting table.
- [ ] **Step 4:** `CREDITS.md`: fonts (Fredoka, Nunito — SIL OFL 1.1), canvas-confetti (ISC), note that the curriculum alignment uses Cambridge Primary learning objectives summarised in our own words, and a placeholder section "Audio" for Phase 2.
- [ ] **Step 5:** Run `npm test && npm run e2e && npm run build` → all PASS.
- [ ] **Step 6: Commit** `docs: offline e2e, PANDUAN, CREDITS`.
- [ ] **Step 7: Deliver to Bimo's computer**: copy the repository (excluding `node_modules`, `dist`, `.git`, `test-results`, `playwright-report`) into `C:\Users\PC\Documents\StudyKids` with `device_commit_files` (≤50 files per call, overwrite only files this project created), then tell Bimo in Indonesian to follow `PANDUAN.md` from step 1.
