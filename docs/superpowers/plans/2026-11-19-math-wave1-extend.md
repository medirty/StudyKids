# Math Wave M1 — Extend the existing Math toys to Grades 1–6 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stretch the 7 existing Math toys across their new grades. Each grade's content must follow its Cambridge 0096 objectives. When this wave ships, Grades 2, 4, 5 and 6 open with Math.

**Architecture:** A toy keeps one module. Its question type becomes a union discriminated by `kind`. `generateQuestions(stage, …)` draws a per-stage mix of kinds through a shared `mixKinds` helper, and `renderChallenge`/`check`/`explain`/`demonstrate` switch on `kind`. Stage 1 and Stage 3 keep their existing kind with unchanged behaviour; new kinds are added next to it. A coverage table maps every 0096 code to a toy and stage, and a test enforces it.

**Tech Stack:** unchanged — Vite 8 + TypeScript strict, Tailwind v4, vitest/jsdom, Playwright 1.63 (global browser; never `playwright install`), vite-plugin-pwa.

**Spec:** `docs/superpowers/specs/2026-11-19-math-grades-1-6-design.md` (approved). Parents: `2026-11-18-kids-study-app-design.md`, `2026-11-18-phase2-english-science-design.md`. Every code is listed in `reference/cambridge-math-0096-objectives.md`.

## Global Constraints

- All Phase 1/Phase 2 Global Constraints still apply:
  - offline, no CDN
  - gentle copy (never "Wrong"), British spelling
  - ≥48px targets, no horizontal scroll at 360×640
  - DOM via `h()`/`textContent`
  - round = 10 questions, one retry, first-answer scoring
  - device voice only
- Speech rules R9/R11/R13/R14/P2:
  - auto-speak only under `ctx.autoRead`
  - `demonstrate` bails on `!root.isConnected` and leaves no timers
  - any prompt with symbols or blanks sets `spoken`; spoken text never contains "→", "÷", "×", "−", "<", ">", "/" or "…". Use the words "times", "divided by", "minus", "less than", "greater than", "out of"/fraction words, and "blank" instead.
- A Challenge never shows the answer before Check. A demo never repeats `explain().how` (`tests/ui/demo-no-repeat.test.ts` must cover every new kind).
- A stage only gets its own concepts. No negatives below Stage 4, no decimals below Stage 5 (except money, which is not in this wave), no fractions above the stage's denominators.
- Keep existing behaviour for Stage 1 and Stage 3:
  - Existing kinds keep their prompts, ranges and interaction.
  - If adding kinds changes a seeded test, that test may be updated. Write the reason in the commit message.
- Metric units. Numbers ≥ 1000 are shown with a comma (`4,250`) and decimals with a point (`3.75`). Use one helper, `formatNumber`.
- Toy ids stay the same. Titles, icons, stages and strands must match exactly:

| map # | id | title | icon | stages | strand |
|---|---|---|---|---|---|
| 1 | clock | Tick-Tock Time | 🕒 | [1,2,3,4] | geometry |
| 3 | count20 | Counting Jar | 🍎 | [1,2,3] | number |
| 4 | numberLine | Number Line Hops | 🐸 | [1,2,3,4,5,6] | number |
| 5 | placeValue | Place Value Blocks | 🧱 | [1,2,3,4,5,6] | number |
| 7 | multiply | Times Tables | ✖️ | [2,3,4] | number |
| 12 | fractions | Fraction Pizza | 🍕 | [1,2,3,4,5,6] | number |
| 17 | shapes | Shape Spotter | 🔺 | [1,2,3,4,5,6] | geometry |

## Review Focus

1. **Retry-mistakes round with mixed kinds:** Retry rebuilds questions from the wrong ones. Every kind must render, check, explain and demonstrate when it appears alone, in any order. Each toy's test should run all of its kinds through one fake round.
2. **Decimal/float answers** (Number Line S6, Place Value S5–S6): `0.1 + 0.2` must count as `0.3`. Answers are compared in integer units (tenths/hundredths/thousandths), never as raw floats. Pin this with a test on each toy.
3. **Narrow phones (360×640) at high stages:** number lines up to 1000/10,000, a 4–5 column place-value chart, and multi-pizza boards must not scroll sideways. The e2e checks `scrollWidth <= clientWidth` for one high-stage toy each.
4. **Grade switch inside a toy:** opening `#/k/6/math/numberLine/challenge` and then `#/k/1/...` must show Stage 1 content. Questions are regenerated per stage, and stage state is not module-global.
5. **Stage-leak:** a generator test for every toy runs 300 questions per stage and asserts no out-of-stage concept (ranges, negatives, decimals, denominators, kinds).

---

## File map

- Create `src/core/mix.ts`: `mixKinds`.
- Create `src/core/format.ts`: `formatNumber`, `spokenNumber`.
- Modify `src/core/types.ts`: per-stage `objective`, optional `strand`.
- Create `src/core/objective.ts`: `objectiveFor`.
- Modify `src/ui/screens/toyList.ts`: strand groups.
- Modify `src/content/registry.ts`: TOYS order follows map #.
- Create `docs/curriculum/math-0096.md`: the coverage table.
- Create `tests/content/coverage-math.test.ts`.
- Per toy, modify `src/toys/math/<id>/*`; new helper files go inside the toy folder. Tests go in `tests/toys/<id>/`.
- `e2e/app.spec.ts`, `PANDUAN.md` §11, `CREDITS.md` (no change expected).

---

### Task 1: Contract, helpers, grouped toy list, coverage table

**Files:**
- Create: `src/core/mix.ts`, `src/core/format.ts`, `src/core/objective.ts`, `docs/curriculum/math-0096.md`
- Modify: `src/core/types.ts:15`, `src/ui/screens/toyList.ts`, `src/content/registry.ts`, the 7 math toys' `meta` (strand only)
- Test: `tests/core/mix.test.ts`, `tests/core/format.test.ts`, `tests/ui/toyList.test.ts`, `tests/content/coverage-math.test.ts`

**Interfaces:**
- Produces:
  - `type Strand = 'number' | 'geometry' | 'statistics'`
  - `meta.objective: string | Partial<Record<Stage, string>>`
  - `meta.strand?: Strand`
  - `objectiveFor(meta: Toy['meta'], stage: Stage): string` (a string objective returns itself; a record returns its stage entry, else the lowest stage's entry)
  - `mixKinds<K extends string>(rng: Rng, count: number, weights: Partial<Record<K, number>>): K[]`
  - `formatNumber(n: number, dp?: number): string`
  - `spokenNumber(n: number, dp?: number): string`

- [ ] **Step 1: Write failing tests**
  - `mixKinds`:
    - `mixKinds(rng, 10, {a: 6, b: 2, c: 2})` has length 10 with exactly 6 a, 2 b and 2 c, in shuffled order.
    - For count 3 with weights {a: 6, b: 2, c: 2}, the counts are proportional, rounded by largest remainder, and every kind with weight > 0 appears at least once when count ≥ number of kinds.
    - The same seed gives the same output.
  - `formatNumber`:
    - `formatNumber(4250) === '4,250'`, `formatNumber(-12) === '−12'` (U+2212), `formatNumber(3.5, 2) === '3.50'`, `formatNumber(999) === '999'`
    - `spokenNumber(-12) === 'minus 12'`, `spokenNumber(3.75, 2) === '3 point 7 5'`
  - toyList: given toys with strands, it renders headings `Number`, `Geometry & Measure`, `Statistics & Probability` (only for non-empty groups, in that order) with role `strand-heading`. Toys without a strand render with no heading, exactly as today.
  - Coverage test (`tests/content/coverage-math.test.ts`):
    - Parse every code matching `/\b[1-6](N[a-z]|G[a-z]|S[a-z])\.\d\d\b/` from `reference/cambridge-math-0096-objectives.md`.
    - Every one appears in exactly one row of `docs/curriculum/math-0096.md`. A row is `| code | summary | toyId | stage | wave | status |`, and status is `done` or `planned`.
    - For `done` rows, `findToy(toyId)` exists and its `meta.stages` includes `stage`.
    - For `planned` rows, the toyId is one of the 23 ids below.

- [ ] **Step 2: Run** `npx vitest run tests/core tests/ui/toyList.test.ts tests/content/coverage-math.test.ts`. Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**
  - Implement the helpers. Update the `meta` type and add `strand` to the 7 math toys. Reorder `TOYS` so the math toys follow map #. Add strand grouping to toyList: headings are `h3`, spoken via `speakButton`.
  - Write `docs/curriculum/math-0096.md`. List every Stage 1–6 code (not TWM), with a paraphrased summary taken from the reference file.
  - Ids for the toys still to come are the spec's names in camelCase: `timeTrip`, `patterns`, `shareGroup`, `bigMultiply`, `numberDetective`, `operationOrder`, `fdp`, `recipeMixer`, `moneyShop`, `measureIt`, `areaPerimeter`, `angles`, `mirrorMove`, `treasureMap`, `graphBuilder`, `chanceSpinner`.
  - Assign every code using the M1 assignments in Tasks 2–13 (wave `M1`). All other codes follow the spec §5 "Kode utama" column (wave `M2`–`M6` per spec §6.7). Number names are an exception:
    - 1Ni.01 and 2Ni.01 go to `count20`.
    - 3Ni.01 and 4Ni.01 go to `placeValue`.
    - 3Nm.01 goes to `moneyShop`, with the summary suffixed "(Dollar mode)".
  - Every row starts as `planned`.

- [ ] **Step 4: Run** `npm test`. Expected: all PASS (existing 696 plus the new tests).

- [ ] **Step 5: Commit** `feat(core): per-stage objectives, strands, kind mixer, number format; math coverage table`

### Task 2: Tick-Tock Time — Stages 2 and 4, digital prompts at Stage 3

**Files:** Modify `src/toys/math/clock/index.ts`, `time.ts`; Test `tests/toys/clock/*.test.ts`

**Interfaces:**
- Consumes `mixKinds`, `objectiveFor`.
- Produces:
  - `ClockQuestion = Question & ({ kind: 'show'; target: number; format: 'words' | 'digital12' | 'digital24' } | { kind: 'read24'; target: number; pm: boolean; options: string[] })`
  - `target` is minutes on the 12-hour cycle, as today. For `digital24`, `target` is `(h24 % 12) * 60 + m`.
  - `digital12(total)` → `'4:05'`, `digital24(h24, m)` → `'16:05'` in `time.ts`.

- [ ] **Step 1: Write failing tests**
  - S1: only `show/words`, minutes ∈ {0, 30} (unchanged).
  - S2: only `show`, minutes are multiples of 5, `format` ∈ {words, digital12} with both present in 200 questions.
  - S3: `show` with the existing STAGE3_MINUTES and words, plus `digital12` in a 7:3 mix.
  - S4:
    - Mix `show/digital24` 6 and `read24` 4. Hours 0–23 appear; ≥ 30% of the 24-hour prompts are afternoon or evening.
    - For `read24`: 4 options, exactly one equal to `digital24` of the target with the `pm` flag, and the distractors include the 12-hour-off twin (e.g. `04:20` vs `16:20`).
  - The prompt is `Show me 16:05` with spoken `Show me sixteen oh five`. `check` accepts the hands at 4:05.
  - `explain` for 24h says to take away 12 for afternoon hours. Spoken has no symbols.
  - Explore at S4 shows a morning/afternoon toggle (role `ampm`) and a digital readout in both 12h and 24h.

- [ ] **Step 2: Run** `npx vitest run tests/toys/clock`. Expected: FAIL.

- [ ] **Step 3: Implement**
  - `read24` renders the analogue face (hands locked) with a ☀️/🌙 badge for am/pm and `choiceCards` of the 4 times. `demonstrate` highlights the correct card.
  - Per-stage objectives:
    - 1: `"Read and show o'clock and half past."`
    - 2: `"Read and show time to five minutes on analogue and digital clocks."`
    - 3: `"Read and show time to five minutes, past and to, on analogue and 12-hour digital clocks."`
    - 4: `"Read and show time on 12-hour and 24-hour clocks."`
  - Coverage rows done: 1Gt.03, 2Gt.02, 3Gt.02, 4Gt.02.

- [ ] **Step 4: Run** `npx vitest run tests/toys/clock tests/content/coverage-math.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(clock): stages 2 and 4, digital prompts, 24-hour reading`

### Task 3: Counting Jar (count20) — Stage 1 additions, Stages 2–3

**Files:** Modify `src/toys/math/count20/index.ts` (split boards into `boards.ts` if it passes ~300 lines); Test `tests/toys/count20/*`, `tests/ui/app.test.ts` (title)

**Interfaces:**
- Produces: `Count20Question = Question & ({ kind: 'make'; target: number; words: boolean } | { kind: 'flash'; target: number; options: number[] } | { kind: 'estimate'; target: number; options: number[]; answerIndex: number })`
  - The answer is a number for `make` and the chosen option for the others.

- [ ] **Step 1: Write failing tests**
  - Title is `'Counting Jar'`; stages are [1,2,3].
  - **S1** mix `make` 6 / `flash` 2 / `estimate` 2:
    - `make` targets 0–20. 0 appears with prompt `Show me zero`. `words: true` (prompt `Show me fourteen`) appears for about a third.
    - `flash` targets 1–10 shown in a dice/ten-frame pattern.
    - `estimate` targets 8–20 with 3 options from {5, 10, 15, 20}. Correct = nearest option. Ties are never generated.
  - **S2** mix `make` 5 / `flash` 2 / `estimate` 3:
    - `make` targets 21–100 on a 10×10 board. Each row has a "fill row" button (count in tens).
    - `flash` uses unfamiliar scattered patterns of 1–10.
    - `estimate` is 20–100 with 3 options that are multiples of 10.
  - **S3**: only `estimate`. Target 100–1000. A reference jar holding 100 is shown. 4 options in steps of ≥150, correct = nearest.
  - `flash` hides the dots after 1500 ms. The dots stay hidden until Check, and Retry re-flashes them. `demonstrate` shows the dots again and counts groups.

- [ ] **Step 2: Run** `npx vitest run tests/toys/count20`. Expected: FAIL.

- [ ] **Step 3: Implement**
  - The S1 `make` path keeps the current two-ten-frame board.
  - Explore per stage:
    - S1: today's board
    - S2: the hundred board with row fills
    - S3: a jar with a slider 0–1000 and a "compare with 100" jar
  - Objectives:
    - 1: `"Count, recognise and estimate up to 20."`
    - 2: `"Count and estimate up to 100, and recognise small groups without counting."`
    - 3: `"Estimate amounts up to 1000 using a jar of 100 to help."`
  - Coverage rows done: 1Nc.01, 1Nc.02, 1Nc.03, 1Ni.01, 1Np.01, 2Nc.01, 2Nc.02, 2Nc.03, 2Ni.01, 3Nc.01.

- [ ] **Step 4: Run** `npm test`. Expected: PASS (update the old `'Count to 20'` title assertions; give the reason in the commit).

- [ ] **Step 5: Commit** `feat(count20): Counting Jar for stages 1–3 (subitise, estimate, to 100 and 1000)`

### Task 4: Number Line Hops — scalable line, Stages 1–3

**Files:** Create `src/toys/math/numberLine/line.ts`; modify `index.ts`; Test `tests/toys/numberLine/*`

**Interfaces:**
- Produces (used by Task 5):
  - `LineConfig { min: number; max: number; unit: number; denom: number }`. Positions are integers counted in `1/denom` units, so `0.3` with denom 10 is `3`.
  - `createLine(cfg: LineConfig, start: number): { root; position(): number; setPosition(n: number): void; hop(delta: number): void }`. It shows a window of at most 21 ticks around the frog and slides the window when the frog leaves it. Labels are produced by a `label(n)` callback.
  - `NumberLineQuestion = Question & { kind: 'calc' | 'missing' | 'skip' | 'swap'; a: number; b: number; op: '+' | '−'; answer: number; target: number; denom: number; hops: number[]; options?: string[] }`
  - The answer is `{ pos: number; hopsMade: number }` for line kinds and an option string for `swap`.

- [ ] **Step 1: Write failing tests**
  - **S1** mix `calc` 6 / `missing` 2 / `skip` 2, range 0–20:
    - `calc`: unchanged generation for + and −. It also includes doubles prompts `Double 6` (a = b) in the mix.
    - `missing`: `7 + blank = 10` (complements of 10) and `difference between 12 and 15`. Spoken `7 plus blank makes 10`. The answer is the hop count (`hopsMade`), and the frog starts at a.
    - `skip`: `Count on in 2s: 4, 6, 8, blank`. Steps are 1, 2 or 10, forwards or backwards, within 0–20. Answer = pos.
    - Hops ±1, ±5 (unchanged).
  - **S2** mix `calc` 5 / `missing` 3 / `skip` 2, range 0–100:
    - 2-digit ± with no regrouping (the ones digits never cross 10).
    - `missing`: complements of 20 and of multiples of 10 to 100. Also the inverse fact: `35 + blank = 47`.
    - `skip` in 2s, 5s or 10s.
    - Hops ±1, ±2, ±5, ±10.
  - **S3** mix `calc` 5 / `missing` 2 / `skip` 2 / `swap` 1, range 0–1000:
    - `calc`: 3-digit ± with regrouping in ≥ half of the questions.
    - `missing`: complements of 100.
    - `skip`: steps 1–9, 10 or 100.
    - `swap`: `Which is the same as 28 + 15?`, with 4 options including `15 + 28` and `28 + 10 + 5`, and distractors that change a number.
    - Hops ±1, ±10, ±100.
  - A line with max 1000 at 360px width has `scrollWidth <= clientWidth` (jsdom: assert ≤ 21 tick nodes rendered).

- [ ] **Step 2: Run** `npx vitest run tests/toys/numberLine`. Expected: FAIL.

- [ ] **Step 3: Implement**
  - Keep S1 visuals: two rows of 0–10 and 11–20 when `max - min ≤ 20`. Use the window mode otherwise.
  - Explore per stage uses that stage's range and hops.
  - `demonstrate` replays the hops. Its spoken cue is only the landing number.
  - Objectives:
    - 1: `"Add and subtract within 20 by hopping, and count on and back in ones, twos and tens."`
    - 2: `"Add and subtract two-digit numbers and count in twos, fives and tens to 100."`
    - 3: `"Add and subtract three-digit numbers and count in steps of ones, tens and hundreds to 1000."`
  - Coverage rows done: 1Nc.04, 1Ni.02, 1Ni.03, 1Ni.04, 1Ni.05, 1Ni.06, 2Nc.04, 2Ni.02, 2Ni.03, 2Ni.04, 3Nc.02, 3Ni.02, 3Ni.03, 3Ni.04.

- [ ] **Step 4: Run** `npx vitest run tests/toys/numberLine tests/content`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(numberLine): scalable line; stages 1–3 (complements, skip counting, regrouping)`

### Task 5: Number Line Hops — Stages 4–6 (negatives, decimals, fractions)

**Files:** Modify `src/toys/math/numberLine/index.ts`, `line.ts`; Test `tests/toys/numberLine/*`

**Interfaces:**
- Consumes `LineConfig` and `createLine` from Task 4.
- Adds kind `estimate` with 4 options and `answerIndex`.

- [ ] **Step 1: Write failing tests**
  - **S4** mix `calc` 4 / `skip` 3 / `estimate` 3:
    - `calc` with negatives in −20..20, with a thermometer story prompt in half of them: `It is 3 °C. It gets 7 degrees colder.`
    - `skip` in steps of 1–9, 10, 100 or 1000, crossing 0 in ≥ 1/3 of questions. Range up to 10,000.
    - `estimate`: 3-digit ± (e.g. `398 + 207 is about…`) with 4 round-number options. Correct = nearest hundred.
  - **S5** mix `calc` 6 / `skip` 4:
    - `calc` with integers −50..50 including negative + positive (e.g. `−8 + 13`).
    - `skip` in constant steps crossing 0.
  - **S6** mix `calc` 4 / `skip` 6:
    - `skip` in steps of 0.1, 0.2, 0.25, 0.5 or ½, ¼, ⅓ (denom 10, 100, 2, 4 or 3) over the range −2..5.
    - `calc` on integers −100..100.
  - **Float pin:** at S6, `0.1 + 0.2` hops land on position 3 (denom 10), and `check` with pos 3 is correct.
  - **Leak:** S4–S6 never produce `denom ≠ 1` except at S6. S1–S3 never go below 0.
  - Spoken prompts use `minus` and `point`, never `−`.

- [ ] **Step 2: Run** `npx vitest run tests/toys/numberLine`. Expected: FAIL.

- [ ] **Step 3: Implement**
  - Labels use `formatNumber`, or fraction text (`1¼`) when denom ∈ {2, 3, 4}.
  - Objectives:
    - 4: `"Count and calculate across zero, and estimate sums and differences."`
    - 5: `"Add and subtract positive and negative numbers."`
    - 6: `"Count in steps of fractions and decimals, and calculate with integers."`
  - Coverage rows done: 4Nc.01, 4Ni.02, 5Nc.01, 5Ni.01, 6Nc.01, 6Ni.01.

- [ ] **Step 4: Run** `npm test`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(numberLine): stages 4–6 (negatives, estimates, decimal and fraction steps)`

### Task 6: Place Value Blocks — Stages 1–3

**Files:** Create `src/toys/math/placeValue/chart.ts` (columns config); modify `index.ts`, `words.ts`; Test `tests/toys/placeValue/*`

**Interfaces:**
- Produces (used by Task 7):
  - `Column = 'th' | 'h' | 't' | 'o' | 'd1' | 'd2' | 'd3'` (d1 = tenths)
  - `createChart(cols: Column[], opts): { root; value(): number /* integer in smallest unit */; set(counts) ; clear() }`
  - `PlaceValueQuestion = Question & { kind: 'make' | 'regroup' | 'order' | 'ordinal' | 'round' | 'compare' | 'times10'; … }`. Each kind carries the data it needs plus `target`.
  - The answer is a union: `PlaceValueAnswer` (counts), `string[]` for order, `string` for choice kinds.

- [ ] **Step 1: Write failing tests**
  - **S1** mix `make` 5 / `order` 3 / `ordinal` 2:
    - `make` 10–20 with tens rods and ones.
    - `order`: 3–4 numbers from 0–20 sorted smallest→largest with `dragSort`.
    - `ordinal`: a race row of 10 animals; prompt `Tap the 3rd animal` (spoken `third`), ordinals 1st–10th.
  - **S2** mix `make` 3 / `regroup` 2 / `order` 2 / `ordinal` 1 / `round` 2:
    - `make` 21–99.
    - `regroup`: `Make 34 with only 2 tens`. Correct = value 34 with t = 2, o = 14.
    - `ordinal`: 1st–31st with a calendar-row story.
    - `round` to the nearest 10. A number line shows the two tens, and the child picks one. 5 rounds up, and explain says so.
  - **S3** mix `make` 4 (existing 100–999; ⅓ of prompts in words: `Make four hundred and six`) / `compare` 2 / `round` 2 / `times10` 2:
    - `compare`: pick `<`, `=` or `>` between two 3-digit numbers. Spoken `less than`; `=` appears ≥ 10%.
    - `round` to the nearest 10 or 100.
    - `times10`: show n (1–99); the child builds 10 × n on the chart.
  - Explain for `regroup` and `times10` mentions moving one column left. Spoken has no symbols.

- [ ] **Step 2: Run** `npx vitest run tests/toys/placeValue`. Expected: FAIL.

- [ ] **Step 3: Implement**
  - Explore per stage: the chart with that stage's columns, plus a readout in digits and words.
  - Objectives:
    - 1: `"Build numbers to 20 from tens and ones, order them, and use first to tenth."`
    - 2: `"Understand tens and ones, regroup, order and round two-digit numbers."`
    - 3: `"Understand hundreds, tens and ones, compare, round and multiply by 10."`
  - Coverage rows done: 1Np.02, 1Np.03, 1Np.04, 2Np.01, 2Np.02, 2Np.03, 2Np.04, 2Np.05, 3Np.01, 3Np.02, 3Np.03, 3Np.04, 3Np.05, 3Ni.01.

- [ ] **Step 4: Run** `npx vitest run tests/toys/placeValue tests/content`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(placeValue): stages 1–3 (teens, ordinals, regroup, compare, round, ×10)`

### Task 7: Place Value Blocks — Stages 4–6 (thousands, decimals, ×÷ powers of ten)

**Files:** Modify `src/toys/math/placeValue/*`; Test `tests/toys/placeValue/*`

**Interfaces:**
- Consumes `createChart` and `Column` from Task 6.
- Adds kind `shift` ({ n, op: '×' | '÷', power: 10 | 100 | 1000 }). It is shown on a digit-slider chart where the digits move columns.

- [ ] **Step 1: Write failing tests**
  - **S4** mix `make` 3 (1000–9999, ⅓ in words) / `shift` 2 (whole numbers ×÷10, 100; results stay whole) / `compare` 2 (including negatives −99..99) / `order` 1 (mixed signs) / `round` 2 (nearest 10, 100, 1000, 10 000 or 100 000; numbers up to 999 999).
  - **S5** mix `make` 3 (decimals to hundredths, e.g. 3.07) / `shift` 4 (wholes ×÷ 10/100/1000; 1dp/2dp decimals ×÷ 10/100) / `round` 3 (1dp → whole).
  - **S6** mix `make` 3 (thousandths) / `shift` 4 (decimals ×÷ 10/100/1000) / `round` 3 (2dp → nearest tenth or whole).
  - **Float pin:** 0.35 × 10 → 3.5, and `check` compares integer units.
  - **Leak:** decimal columns never appear below S5; negatives only in S4 compare/order.
  - At S6, 360px width with 7 columns: column width ≥ 44px (two rows of columns are allowed); no horizontal scroll.

- [ ] **Step 2: Run** `npx vitest run tests/toys/placeValue`. Expected: FAIL.

- [ ] **Step 3: Implement**
  - Objectives:
    - 4: `"Work with thousands, multiply and divide by 10 and 100, compare negatives and round large numbers."`
    - 5: `"Understand tenths and hundredths, multiply and divide by 10, 100 and 1000, and round decimals."`
    - 6: `"Understand thousandths, scale decimals by 10, 100 and 1000, and round to one decimal place."`
  - Coverage rows done: 4Np.01, 4Np.02, 4Np.03, 4Np.04, 4Np.05, 4Ni.01, 5Np.01, 5Np.02, 5Np.03, 5Np.04, 5Np.05, 6Np.01, 6Np.02, 6Np.03, 6Np.04.

- [ ] **Step 4: Run** `npm test`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(placeValue): stages 4–6 (thousands, decimals, powers of ten, rounding)`

### Task 8: Times Tables — Stages 2–4

**Files:** Modify `src/toys/math/multiply/index.ts`; Test `tests/toys/multiply/*`

**Interfaces:**
- Produces: `MultiplyQuestion = Question & { kind: 'table' | 'array' | 'turn' | 'split' | 'multiples' | 'three'; … ; target }`
  - `array`: the answer is `{ rows, cols }`.
  - `multiples`: the answer is a set of tapped numbers.
  - The others take a number or an option.

- [ ] **Step 1: Write failing tests**
  - **S2** mix `array` 4 / `table` 6, tables {1, 2, 5, 10}, a ≤ 10:
    - `array`: `Make 3 rows of 5`. Correct = rows 3, cols 5. Explain says repeated addition `5 + 5 + 5`; spoken `5 plus 5 plus 5`.
  - **S3** mix `table` 6 / `turn` 1 / `split` 2 / `multiples` 1:
    - `table`: tables {1,2,3,4,5,6,8,9,10}. This changes the old {2,3,4,5,8,10}; the reason is 3Ni.07.
    - `turn`: `4 × 3 = 3 × blank`; the array rotates in demonstrate.
    - `split`: `7 × 4 = 5 × 4 + blank`.
    - `multiples`: tap every multiple of 2, 5 or 10 among 8 numbers ≤ 1000.
  - **S4** mix `table` 7 (all 1–10) / `three` 3 (`2 × 3 × 4 = ?` with an option showing regrouping as `6 × 4`).
  - `explain.how` contains no `→` (fixes the open note). The 'how' for the existing kind reads `4 groups of 3: 3, 6, 9, 12. So 4 times 3 is 12.`

- [ ] **Step 2: Run** `npx vitest run tests/toys/multiply`. Expected: FAIL.

- [ ] **Step 3: Implement**
  - Objectives:
    - 2: `"See multiplication as equal groups and arrays, and know the 1, 2, 5 and 10 times tables."`
    - 3: `"Know the 1 to 6, 8, 9 and 10 times tables, and swap and split multiplications."`
    - 4: `"Know all times tables to 10 and group three numbers in any order."`
  - Coverage rows done: 2Ni.05, 2Ni.07, 3Ni.06, 3Ni.07, 3Ni.10, 4Ni.03, 4Ni.04.

- [ ] **Step 4: Run** `npm test`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(multiply): stages 2–4 (arrays, more tables, swap, split, multiples, three factors)`

### Task 9: Fraction Pizza — Stages 1–3

**Files:** Create `src/toys/math/fractions/plates.ts` (set model), `fraction.ts` (`{ n, d }` maths: `simplify`, `equal`, `compare`, `add`, `words`); modify `index.ts`; Test `tests/toys/fractions/*`

**Interfaces:**
- Produces (used by Task 10):
  - `type Frac = { n: number; d: number }`
  - `fractionWords(f: Frac): string` (extends the existing function; `'three quarters'`, `'one and a half'`)
  - `FractionQuestion = Question & { kind: 'colour' | 'equalParts' | 'ofSet' | 'combine' | 'compare' | 'equiv' | 'add'; … ; target }`

- [ ] **Step 1: Write failing tests**
  - **S1** (denominator 2 only) mix `equalParts` 3 / `colour` 3 / `ofSet` 2 / `combine` 2:
    - `equalParts`: a shape cut equally or unequally; choose `Equal parts` / `Not equal`.
    - `colour`: 1/2.
    - `ofSet`: `Half of 8 apples`; drag apples onto 2 plates; answer = one plate's count; the whole is even and ≤ 20.
    - `combine`: `How many halves make 1 whole?` / `2 halves and 1 half make…` with options like `1 and a half`.
  - **S2** (denominators 2 and 4) mix `equalParts` 1 / `colour` 3 (¼, ½, ¾) / `ofSet` 3 (½, ¼, ¾ of numbers ≤ 40, divisible) / `compare` 2 (order ¼, ½, ¾, 1 with dragSort) / `combine` 1 (wholes, halves and quarters).
  - **S3** mix `colour` 4 (existing; denominators [2,3,4,5,6,8,10]) / `ofSet` 2 (thirds and tenths included) / `equiv` 1 (colour a fraction equal to ½ on a pizza cut in 4, 6, 8 or 10) / `add` 2 (same denominator, total ≤ 1; colour the result) / `compare` 1 (unit fractions or same-denominator fractions).
  - **Leak:** S1 only d = 2; S2 d ∈ {2, 4}.
  - Spoken uses fraction words, never `/`.

- [ ] **Step 2: Run** `npx vitest run tests/toys/fractions`. Expected: FAIL.

- [ ] **Step 3: Implement**
  - Objectives:
    - 1: `"Find halves of shapes and small numbers, and see that two halves make a whole."`
    - 2: `"Find halves, quarters and three quarters of shapes and numbers, and compare them."`
    - 3: `"Make, compare and add fractions of shapes and sets, and find equivalent fractions."`
  - Coverage rows done: 1Nf.01, 1Nf.02, 1Nf.03, 1Nf.04, 2Nf.01, 2Nf.02, 2Nf.03, 2Nf.04, 2Nf.05, 2Nf.06, 3Nf.01, 3Nf.02, 3Nf.03, 3Nf.04, 3Nf.05, 3Nf.06, 3Nf.07, 3Nf.08.

- [ ] **Step 4: Run** `npx vitest run tests/toys/fractions tests/content`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(fractions): stages 1–3 (equal parts, sets, combine, compare, equivalence, adding)`

### Task 10: Fraction Pizza — Stages 4–6

**Files:** Modify `src/toys/math/fractions/*`; Test `tests/toys/fractions/*`

**Interfaces:**
- Consumes `Frac`, `fraction.ts` and `plates.ts` from Task 9.
- Adds kinds:
  - `mixed`: a multi-pizza board with up to 4 pizzas; the answer is the total coloured slices.
  - `pick`: 4 `choiceCards` options of fraction text, with `answer: Frac`.

- [ ] **Step 1: Write failing tests**
  - **S4** mix `compare` 2 (more parts → smaller; proper fractions, d ≤ 10) / `ofSet` 2 (unit fractions and ¾ as operators) / `equiv` 2 / `add` 2 (same denominator; subtract too) / `pick` 2 (fraction as division: `3 ÷ 4 = ?`, spoken `3 divided by 4`).
  - **S5** mix `mixed` 3 (improper ↔ mixed: `Colour 7/4`) / `add` 3 (denominators where one is a multiple of the other: ½ + ¼) / `pick` 2 (unit fraction × whole: `⅓ × 6`; whole ÷ … `½ ÷ 2`) / `ofSet` 2 (proper fractions as operators: `⅗ of 20`).
  - **S6** mix `pick` 4 (simplest form; proper fraction × or ÷ whole) / `add` 3 (different denominators, LCD ≤ 24) / `mixed` 1 / `ofSet` 2 (improper fractions as operators: `5/4 of 12`).
  - `fraction.ts` unit tests: `simplify({n:6,d:8})` → `{3,4}`; `add(½, ⅓)` → `{5,6}`; `compare(⅖, ⅜) > 0`.
  - **Leak:** `pick` division and mixed numbers never appear below S4/S5 respectively.

- [ ] **Step 2: Run** `npx vitest run tests/toys/fractions`. Expected: FAIL.

- [ ] **Step 3: Implement**
  - Objectives:
    - 4: `"Compare and find equivalent fractions, add and subtract with the same denominator, and see fractions as division."`
    - 5: `"Use mixed numbers, add related fractions, and multiply and divide unit fractions."`
    - 6: `"Simplify fractions, add with different denominators, and multiply and divide fractions by whole numbers."`
  - Coverage rows done: 4Nf.01, 4Nf.02, 4Nf.03, 4Nf.04, 4Nf.05, 4Nf.07, 5Nf.01, 5Nf.02, 5Nf.03, 5Nf.05, 5Nf.06, 6Nf.01, 6Nf.02, 6Nf.03, 6Nf.05, 6Nf.06.

- [ ] **Step 4: Run** `npm test`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(fractions): stages 4–6 (mixed numbers, unlike denominators, simplest form, × ÷)`

### Task 11: Shape Spotter — Stages 1–3

**Files:** Modify `src/toys/math/shapes/index.ts`, `draw.ts` (new shapes); Test `tests/toys/shapes/*`

**Interfaces:**
- Produces (used by Task 12):
  - `ShapeId` extended with `pentagon`, `hexagon`, `octagon`, `semicircle`, `oval`, `irregular-pentagon`, `irregular-hexagon`, `kite` and `prism`. Each has `SHAPES[id] { name, dim, fact, sides?, vertices?, faces?, edges?, regular? }`.
  - `ShapeQuestion = Question & { kind: 'find' | 'sort2d3d' | 'count' | 'centre' | 'inObject' | 'regular'; … }`

- [ ] **Step 1: Write failing tests**
  - **S1** mix `find` 7 (existing) / `sort2d3d` 3 (dragSort 4 shapes into `Flat` / `Solid`).
  - **S2** mix `find` 3 (with pentagon/hexagon/octagon) / `count` 4 (sides or vertices of a 2D shape; faces, edges or vertices of a 3D shape; numeric answer; demo lights sides one by one) / `centre` 1 (tap the circle centre within 12% of the radius) / `inObject` 2 (emoji object → shape: 🥫 cylinder, 🎲 cube, ⚽ sphere, 📦 cuboid, 🍦 cone; only emoji from Unicode ≤ 13).
  - **S3** mix `find` 3 / `regular` 3 (sort into `Regular` / `Irregular`) / `count` 2 (3D) / `inObject` 2 (3D drawings shown at different angles → name).
  - Shape facts are correct. A test asserts `faces/edges/vertices` for cube 6/12/8, cuboid 6/12/8, square-based pyramid 5/8/5, triangular prism 5/9/6, cylinder 3/2/0 with the fact text "2 flat faces and 1 curved surface", cone 2/1/1, sphere 1/0/0. Explain says that curved surfaces count as faces in this app. *(Decision: follow the common Cambridge-textbook convention; state it once in explain.)*

- [ ] **Step 2: Run** `npx vitest run tests/toys/shapes`. Expected: FAIL.

- [ ] **Step 3: Implement**
  - Objectives:
    - 1: `"Name flat and solid shapes and sort them."`
    - 2: `"Count sides, corners, faces, edges and vertices, and spot shapes in everyday objects."`
    - 3: `"Sort regular and irregular shapes and recognise solid shapes in pictures."`
  - Coverage rows done: 1Gg.01, 1Gg.03, 1Gg.06, 2Gg.01, 2Gg.02, 2Gg.05, 2Gg.08, 3Gg.01, 3Gg.05, 3Gg.08.

- [ ] **Step 4: Run** `npx vitest run tests/toys/shapes tests/content`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(shapes): stages 1–3 (sort, count, centre, everyday objects, regular)`

### Task 12: Shape Spotter — Stages 4–6 (nets, tessellation, triangles, quadrilaterals, circles)

**Files:** Create `src/toys/math/shapes/nets.ts` (net SVGs + which solid they fold into); modify `index.ts`, `draw.ts`; Test `tests/toys/shapes/*`

**Interfaces:**
- Consumes the extended `ShapeId` and `SHAPES` from Task 11.
- Adds kinds `net`, `tessellate`, `faces` (2D faces of a 3D shape), `triangle`, `quad`, `circlePart` and `radius`.

- [ ] **Step 1: Write failing tests**
  - **S4** mix `net` 4 (net → solid, 4 options) / `faces` 3 (which 2D shapes make up the faces, multi-select) / `tessellate` 3 (does this shape tessellate? including combos like octagon + square).
  - **S5** mix `triangle` 4 (equilateral, isosceles or scalene from marked sides) / `net` 3 (which of these nets folds into a cube; it includes the 11 cube nets and non-nets) / `find` 3 (3D shapes drawn in different orientations).
  - **S6** mix `quad` 3 (square, rectangle, rhombus, parallelogram, trapezium, kite; British names) / `circlePart` 3 (tap radius, diameter, centre or circumference) / `net` 2 (prisms and pyramids) / `radius` 2 (drag the compass to radius r on a cm grid and draw; correct within ±0.25 cm).
  - The cube-net list contains exactly 11 distinct nets up to rotation and reflection, checked by a test that folds each one.

- [ ] **Step 2: Run** `npx vitest run tests/toys/shapes`. Expected: FAIL.

- [ ] **Step 3: Implement**
  - Objectives:
    - 4: `"Match nets to solids, name the faces of solids, and find shapes that tessellate."`
    - 5: `"Classify triangles and find nets of a cube."`
    - 6: `"Classify quadrilaterals, name parts of a circle, draw circles and find nets of prisms and pyramids."`
  - Coverage rows done: 4Gg.01, 4Gg.05, 4Gg.06, 5Gg.01, 5Gg.04, 5Gg.05, 6Gg.01, 6Gg.02, 6Gg.04, 6Gg.06, 6Gg.11.

- [ ] **Step 4: Run** `npm test`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(shapes): stages 4–6 (nets, tessellation, triangles, quadrilaterals, circles)`

### Task 13: Wave wrap-up — e2e, guards, guide

**Files:** Modify `e2e/app.spec.ts`, `tests/ui/demo-no-repeat.test.ts`, `PANDUAN.md` (§11), `docs/curriculum/math-0096.md`

- [ ] **Step 1: Write failing checks**
  - e2e: the grade menu shows Grades 2, 4, 5 and 6 unlocked. At Grade 4 → Math, the list shows the `Number` and `Geometry & Measure` headings. For each of grades 2, 4, 5 and 6, open one toy's challenge, answer one question with the demo's answer through "Show me", and see the result screen.
  - 360×640: Grade 6 Place Value and Grade 4 Number Line have no horizontal scroll.
  - Grade switch: open the Grade 6 numberLine challenge → back → Grade 1 numberLine shows a 0–20 line.
  - `demo-no-repeat` iterates every toy × stage × kind (generate 50 per stage).
  - The coverage test passes, and the rows for M1 codes are all `done`.

- [ ] **Step 2: Run** `npm test && npm run build && npm run e2e`. Expected: PASS.

- [ ] **Step 3: Update** `PANDUAN.md` §11: list the Math toys per grade 1–6 in Indonesian, matching the registry.

- [ ] **Step 4: Commit** `test(e2e): math grades 1–6; docs: PANDUAN toy list`

---

## Notes for the executor

- Every toy task adds an `every kind solo` test: for each stage and kind, build one question, render the challenge, check the demonstrated answer is correct, and check explain/demonstrate run (Review Focus 1).
- Read each toy's current tests before changing it. Phase 1 seeded tests pin Stage 1/3 sequences; keep those paths consuming the rng the same way where possible.
- Visual SVGs must be self-drawn; no copied textbook art. Paraphrase the Cambridge wording; never quote it.
