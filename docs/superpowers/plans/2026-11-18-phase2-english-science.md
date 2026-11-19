# StudyKids Phase 2 (English + Science) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 15 toys (7 English, 8 Science) for Grade 1 and Grade 3, plus a small phonics helper that voices letters with the device voice ("<letter> … like <word>").

**Architecture:** Same `Toy` contract and shell as Phase 1. New shared building blocks: `phonics.ts` (letter → example word, `sayLetter`), and a small UI kit (`dragSort`, `choiceCards`, `tiles`) reused by most toys. Content (word lists, stories, science facts) lives in `src/content/english/*` and `src/content/science/*` so it can be reviewed separately from logic.

**Tech Stack:** unchanged — Vite 8 + TypeScript strict, Tailwind v4, vitest/jsdom, Playwright 1.63 (global browser; never `playwright install`), vite-plugin-pwa.

**Spec:** `docs/superpowers/specs/2026-11-18-phase2-english-science-design.md` (parents: `2026-11-18-kids-study-app-design.md`, `2026-11-19-grade-menu-design.md` — grades replace profiles; `ctx.autoRead` comes from the grade + 🔊 toggle). Reference toys to imitate: `src/toys/math/count20`, `src/toys/math/shapes`, `src/toys/math/multiply`.

## Global Constraints

- All Phase 1 Global Constraints still apply (see `docs/superpowers/plans/2026-11-18-studykids-phase1.md`): offline, no CDN, gentle copy (never "Wrong"), British spelling, ≥48px targets, no horizontal scroll at 360×640, DOM via `h()`/textContent, round = 10 questions with one retry and first-answer scoring.
- Speech: toys auto-speak only when `ctx.autoRead`; `demonstrate` speaks only when `ctx.autoRead` (results "Show me" passes autoRead true); `demonstrate` loops bail on `!root.isConnected` and leave no timers (R11/R13).
- Symbol or blank prompts set `spoken` (R14). Questions that a shell e2e may need set a `target` when numeric.
- All stories, sentences, word lists and facts are original writing; nothing copied from Cambridge or other publishers. Images = emoji or self-drawn SVG.
- Science facts must be correct, simplified for children, and match the lists in this plan.
- No audio files. All speech uses the device voice via `ctx.speech`.
- Toy ids, titles, icons, stages exactly as in the table below.

| id | subject | stages | title | icon |
|---|---|---|---|---|
| soundBuilder | english | [1] | Sound Builder | 🔤 |
| trickyWords | english | [1] | Tricky Word Pop | 🎈 |
| sentenceFixer | english | [1] | Sentence Fixer | ✏️ |
| wordSorter | english | [3] | Word Sorter | 🧺 |
| pastTense | english | [3] | Past Tense Machine | ⚙️ |
| affixLab | english | [3] | Prefix & Suffix Lab | 🧪 |
| storyTime | english | [3] | Story Time | 📖 |
| bodySenses | science | [1] | My Body & Senses | 🧍 |
| aliveOrNot | science | [1] | Alive or Not? | 🌱 |
| materials | science | [1] | Material Sorter | 🧱 |
| pushPull | science | [1] | Push or Pull? | 🛒 |
| growPlant | science | [3] | Grow a Plant | 🌻 |
| magnets | science | [3] | Magnet Test | 🧲 |
| shadows | science | [3] | Light & Shadows | 🔦 |
| skeleton | science | [3] | Skeleton Builder | 💀 |

## Review Focus

1. Drag on touch: dragging an item must not scroll the page or get stuck when the finger leaves the screen (pointercancel) — every drag supports a tap-item-then-tap-target alternative (test in Task 2).
2. Device without speechSynthesis → letters and words still shown, no throw (test in Task 1).
3. Same item repeated back-to-back in a round, or a round asking for more questions than the content has (e.g. 4 stories, 10 questions) → generators never repeat consecutively and always return the requested count (test in each content toy: generator over 200 questions).
4. Long words/sentences at 360px (e.g. "disappointment", story text) → wrap, no horizontal scroll (Task 18 e2e covers every new toy in both modes).
5. Leaving a toy mid-drag → no stuck ghost element, no timers (test in Task 2).

---

## File Structure

```
src/content/phonics.ts             letter → example word, sayLetter()
src/ui/kit/dragSort.ts             drag-or-tap items into bins
src/ui/kit/choiceCards.ts          big tappable option cards/balloons, single select
src/ui/kit/tiles.ts                letter/word tile tray + answer slots
src/content/english/{cvc.ts,tricky.ts,sentences.ts,wordClasses.ts,verbs.ts,affixes.ts,stories.ts}
src/content/science/{body.ts,living.ts,materials.ts,forces.ts,plants.ts,magnets.ts,light.ts,skeleton.ts}
src/toys/english/<id>/index.ts     one dir per toy
src/toys/science/<id>/index.ts
tests/** mirrors src
```

---

### Task 1: Letter voice helper

**Files:** Create `src/content/phonics.ts`; Test `tests/content/phonics.test.ts`.

**Interfaces — Produces:**
```ts
export const LETTER_EXAMPLES: Readonly<Record<string, string>>; // a–z → example word: a apple, b bus, c cat, d dog, e egg, f fish, g goat, h hat, i ink, j jam, k kite, l leg, m map, n net, o orange, p pan, q queen, r red, s sun, t tap, u umbrella, v van, w web, x box, y yellow, z zip
export function letterPhrase(letter: string): string; // 'c' → 'c … like cat'
export function sayLetter(letter: string, speech: Speech): Promise<void>; // speech.speak(letterPhrase(letter)); resolves even if speech unavailable
```
- [ ] Step 1 tests: 26 letters present; `letterPhrase('c') === 'c … like cat'`; `sayLetter` with `available:false` speech resolves without throwing; unknown input → resolves, speaks nothing.
- [ ] Steps 2–4 RED/implement/GREEN; Step 5 commit `feat(english): letter voice helper`.

### Task 2: UI kit — dragSort, choiceCards, tiles

**Files:** Create `src/ui/kit/{dragSort,choiceCards,tiles}.ts`; Test `tests/ui/kit/*.test.ts`.

**Interfaces — Produces:**
```ts
export interface SortItem { id: string; label: string; emoji?: string }
export interface SortBin { id: string; label: string; emoji?: string }
export function createDragSort(el: HTMLElement, o: { items: SortItem[]; bins: SortBin[]; onDrop(itemId: string, binId: string): void; tick?: () => void }): View & { placed(): Record<string, string>; reset(): void; setLocked(b: boolean): void };
export function createChoiceCards(el: HTMLElement, o: { options: { id: string; label: string; emoji?: string }[]; style?: 'cards' | 'balloons'; onSelect?(id: string): void }): View & { selected(): string | null; reset(): void; highlight(id: string, kind: 'correct' | 'hint'): void };
export function createTiles(el: HTMLElement, o: { tiles: string[]; slots: number; onTileTap?(t: string): void }): View & { value(): string[]; reset(): void; fill(values: string[]): void };
```
data-roles: items `sort-item` (`data-id`), bins `sort-bin` (`data-id`), cards `choice` (`data-id`, aria-pressed), tiles `tile`, slots `slot`.
- [ ] Step 1 tests: drag via pointer events moves item into bin and calls onDrop; tap item then tap bin does the same; pointercancel returns item to tray; drag sets `touch-action:none` on items only; destroy mid-drag removes the ghost and listeners; choice single-select toggles aria-pressed; tiles fill left-to-right, tapping a filled slot returns the tile; `value()` order; all controls ≥48px classes.
- [ ] Steps 2–4 RED/implement/GREEN; Step 5 commit `feat(ui): drag-sort, choice cards and tiles kit`.

### Task 3: Sound Builder (`soundBuilder`)

Content `src/content/english/cvc.ts`: `CVC_WORDS: {word, emoji}[]` ≥ 30 words using only Kelompok 1–2 graphemes, e.g. cat🐱 dog🐶 sun☀️ pig🐷 bed🛏️ hat🎩 map🗺️ cup☕ fox🦊 bus🚌 net🥅 jam🍓 bat🦇 hen🐔 box📦 van🚐 web🕸️ zip🤐 log🪵 red🔴 pen🖊️ bug🐛 mug☕ fin🦈 kid🧒 nut🥜 rat🐀 cot🛏️ wig💇 leg🦵 (no word used twice).
Question `{id, prompt:'Build the word', spoken:'Build the word {word}', word, letters: string[] (word letters + 2–3 distractors, shuffled), emoji}`; answer `string[]` (slot letters); check = join equals word; hint `Listen to each sound: {s1} … {s2} … {s3}` (letters); explain why `You made "{x}".` how `{word} has three sounds: {l1}, {l2}, {l3}.`; describe = joined letters or 'nothing yet'.
Explore: letter board a–z (tap → `sayLetter(letter, ctx.speech)` — tap is an explicit action, so it speaks regardless of autoRead), 3 slots; when slots spell a CVC word, speak it and show emoji. Challenge: shows emoji + 🔊 replays the word, tiles kit. demonstrate: places letters one by one, each with `sayLetter` (autoRead only), then the word.
- [ ] Tests: generator 200 questions all words from list, letters contain the word's letters, no consecutive repeat; check/explain strings; Explore tap calls sayLetter with the letter; R11 detach test. Commit `feat(english): sound builder toy`.

### Task 4: Tricky Word Pop (`trickyWords`)

Content `tricky.ts`: the 27 words in the spec, in that order. Question `{id, prompt:'Pop the word', spoken:'Pop the word {w}', target:<word>, options: 4 words incl. target}`; answer word|null; hint `Listen again and look at the first letter: "{w[0]}".`; explain how `This word is "{w}". Say it and spell it: {w letters joined by ", "}.`
Explore: grid of word cards; tap → speak. Challenge: choiceCards style 'balloons' (balloon pops on select with a short CSS animation, respects reduced motion); 🔊 replays the word. demonstrate: highlights correct balloon and speaks (autoRead only).
- [ ] Tests: options unique, contain target, from list; null answer hint `Tap a balloon first!`; generator 200 no consecutive repeats. Commit.

### Task 5: Sentence Fixer (`sentenceFixer`)

Content `sentences.ts`: ≥ 20 original simple sentences (4–7 words, Stage 1 vocabulary), stored correct, e.g. "The cat sat on the mat." Question `{id, prompt:'Fix the sentence', words: string[] (all lower-case, no full stop), answerWords: string[]}`; the child taps the first word to toggle its capital and taps the gap after the last word to add the full stop; also accepts capital on "I" mid-sentence when the sentence contains "I". Answer `{capitalised: number[], stop: boolean}`; correct = exactly the required capitals + stop. Hint names what is missing: `A sentence starts with a capital letter.` / `A sentence ends with a full stop.`; explain how `"{correct sentence}" starts with a capital letter and ends with a full stop.`
Explore: correct sentences shown; tap any word → spoken; a "Make it wrong / Fix it" toggle animates the capital and full stop. demonstrate: animates fixing.
- [ ] Tests: required capitals computed (first word + every standalone "i"); wrong extra capital → incorrect with hint `Only the first word (and "I") needs a capital letter.`; generator. Commit.

### Task 6: Word Sorter (`wordSorter`)

Content `wordClasses.ts`: ≥ 15 nouns, 15 verbs, 15 adjectives (unambiguous in isolation, e.g. noun: dog, teacher, river; verb: jump, write, swim; adjective: tiny, shiny, happy) and ≥ 12 original sentences with each word tagged `{text, cls:'noun'|'verb'|'adjective'|null}` where each sentence has ≥1 of each class.
Explore: dragSort with 9 random words into 3 bins (Noun 🏷️ / Verb 🏃 / Adjective 🎨); feedback per drop (gentle). Challenge question `{id, prompt:'Tap the {cls}', sentence tokens, targetIndices}`; answer = tapped index|null; correct if index ∈ targets; hint per class: noun `A noun is a person, place or thing.`, verb `A verb is a doing word.`, adjective `An adjective describes a noun.`; explain how `"{word}" is a {cls}: {definition}`.
- [ ] Tests: every sentence has all three classes; generator; check with multiple valid targets. Commit.

### Task 7: Past Tense Machine (`pastTense`)

Content `verbs.ts`: regular verbs grouped by rule — add -ed (walk, jump, play, help, look, kick), double + ed (hop→hopped, stop→stopped, clap→clapped, skip→skipped), +d after e (bake→baked, smile→smiled, dance→danced), y→ied (cry→cried, carry→carried, try→tried); irregular (go→went, run→ran, see→saw, eat→ate, come→came, sit→sat, swim→swam, write→wrote, take→took, make→made, have→had, say→said). Exported `pastOf(verb)` and `ruleOf(verb)`.
Explore: machine — pick a verb card → animated gears → past form + rule caption (`Add -ed`, `Double the last letter, add -ed`, `Just add -d`, `Change y to i, add -ed`, `Irregular: learn it!`). Challenge: regular → tiles (root letters + suffix tiles `ed`,`d`,`ied`, extra letter tile for doubling); irregular → choiceCards with 3 options (correct, root+ed, a near miss). Question `{id, prompt:'Yesterday I … ({verb})', verb, past, kind:'regular'|'irregular'}`, `spoken:'Yesterday I, {verb}. What is the past tense of {verb}?'`; answer string; hint = the rule caption; explain how `{verb} → {past}. {rule}.`
- [ ] Tests: `pastOf` for every listed verb; generator mixes kinds (≥30% irregular over 200); check. Commit.

### Task 8: Prefix & Suffix Lab (`affixLab`)

Content `affixes.ts`: entries `{root, affix, word, meaning}`: un-(happy, kind, lock, tidy), re-(play, read, write, build), dis-(agree, like, appear, obey), pre-(heat, view, school), -ful(help, care, play, colour), -less(care, help, home, fear), -ly(quick, slow, kind, sad), -ness(kind, dark, happy→happiness), -er(teach, play, paint, read). Meanings original and child-friendly (e.g. unhappy = "not happy", reread = "read again", careless = "without care", happiness = "being happy" — note y→i).
Question `{id, prompt:'Make a word that means "{meaning}"', root, affix, word, options: 4 affixes}`; answer `{affix, word}` built by dragging/tapping an affix onto the root (spelling change auto-applied and shown, e.g. happy+ness→happiness); hint `"{affix}" means "{affixMeaning}".`; explain how `{root} + {affix} = {word}: {meaning}.`
Explore: root cards × affix cards; combine to see/hear the word and meaning; invalid combos show `That's not a real word — try another!`.
- [ ] Tests: every listed word = combine(root, affix); invalid combo detection; generator; check. Commit.

### Task 9: Story Time (`storyTime`)

Content `stories.ts`: 4 ORIGINAL stories (80–150 words, Stage 3 level, British spelling, titles e.g. "The Lost Kite", "Mia's Rainy Day Plan", "The Clever Crow", "Grandpa's Garden"), each with 6 questions `{q, options: 3, answer, kind:'who'|'what'|'why'|'order'}` answerable only from the text.
Explore: pick a story → read-along (readAloud with per-word highlight; 🔊 play/pause; paragraphs). Challenge: a round draws 10 questions from two stories (6 + 4, chosen by rng); each question shows its story (collapsible on phones) and title; no question repeated in a round. Answer via choiceCards. hint `Look back at the story: {hintSentence}` (store `evidence` sentence per question); explain why `The story says: "{evidence}"` how `So the answer is "{answer}".`
- [ ] Tests: every evidence string appears verbatim in its story; each question's answer ∈ options; generator returns 10 unique questions; word counts 80–150. Commit.

### Task 10: My Body & Senses (`bodySenses`)

Content `body.ts`: parts with SVG hotspot ids: head, hair, eyes, ears, nose, mouth, tongue, neck, shoulders, arms, elbows, hands, fingers, tummy, knees, legs, feet, toes; senses: sight→eyes, hearing→ears, smell→nose, taste→tongue, touch→skin (hands/fingers accepted).
Self-drawn SVG child (front view, friendly) with ≥48px hit areas (invisible enlarged hotspots). Explore: tap part → name spoken/shown; Senses tab: tap a sense icon → organ glows + sentence ("We see with our eyes."). Question `{id, prompt, targetParts: string[], kind:'name'|'sense'}` e.g. `Tap the knees` / `Which part do we use to smell?`; answer part id|null; hint for sense `We {verb} with our {organ}.`; explain how same sentence.
- [ ] Tests: every sense maps to a part present in SVG; touch accepts hands/fingers; generator. Commit.

### Task 11: Alive or Not? + Material Sorter (`aliveOrNot`, `materials`) — two commits

`living.ts`: living (dog, tree🌳, flower🌷, fish, bird, person, mushroom🍄, grass, cat, bee, frog, cactus🌵) / non-living (rock🪨, car, chair, cup, ball, phone, book, shoe, water 💧, cloud ☁️, sun ☀️, toy robot🤖). Fact line for the bin: living things `grow, need food and water, and can have babies`.
`materials.ts`: items with material: wood (chair 🪑, pencil ✏️, wooden spoon), plastic (bottle, bucket, toy brick), metal (key🔑, coin🪙, fork🍴, can), glass (window🪟, jar, glasses👓 lens), fabric (T-shirt👕, sock🧦, scarf🧣), paper (book📖, newspaper🗞️, envelope✉️); properties per material: hard/soft, see-through yes/no (glass yes; others no), bendy.
Both: Explore = dragSort into bins with fact on drop. Challenge one item per question `{id, prompt:'Where does the {item} go?' | 'What is the {item} made of?', item, target}` answered by dragging (or tapping) to a bin; hint gives the rule; explain how `{item} is {living/non-living | made of material}: {fact}`.
- [ ] Tests: no item ambiguous (each item exactly one target); generator; check. Commit each toy.

### Task 12: Push or Pull? (`pushPull`)

`forces.ts`: scenes `{id, text, emoji, answer:'push'|'pull'}` ≥ 14 (kick a ball → push, open a drawer → pull, push a pram/swing → push, pull a wagon, tug of war → pull, press a doorbell → push, pull up socks, close a door by pushing → push, pull a rope, push a shopping trolley, pull a weed, throw a ball → push, pull open a curtain, push a button).
Explore: toy car on a track; slider "Push strength" small→big; release → car rolls further for a bigger push; a "Pull" mode with a string. Challenge: scene card + choiceCards Push 👐 / Pull 🪢; hint `A push moves something away from you. A pull moves it towards you.`; explain how same + scene.
- [ ] Tests: content answers; generator; distance monotonic in strength (pure `rollDistance(strength)`). Commit.

### Task 13: Grow a Plant (`growPlant`)

`plants.ts`: parts root (takes in water, holds the plant in the soil), stem (carries water up, holds the plant up), leaf (makes food using sunlight), flower (makes seeds); needs: water, light, warmth (also air) — too much water harms roots.
Explore: plant with three controls water/light/warmth (none/some/lots); pure `plantHealth({water, light, warmth}) → 'thriving'|'wilting'|'not growing'` (thriving only when all three are 'some', water 'lots' → wilting with "too much water" note, any 'none' → not growing with which need is missing); grows over ~3s animation. Challenge kinds: label a part (tap part on SVG) or "What does the {part} do?" (choiceCards of the four functions); hint uses the function text.
- [ ] Tests: `plantHealth` table for all 27 combos; content; generator. Commit.

### Task 14: Magnet Test (`magnets`)

`magnets.ts`: magnetic (paper clip, iron nail, steel spoon, safety pin, steel scissors blade, fridge door) / not magnetic (plastic ruler, wooden pencil, glass marble, paper, rubber, aluminium can, copper coin, gold ring). Rule text: `Magnets pull things made of iron or steel.`
Explore: drag an object to the magnet → it snaps on (magnetic) or falls off. Challenge `{id, prompt:'Will the {item} stick to the magnet?', item, magnetic}`: choiceCards Yes 🧲 / No ✋, then the object animates to the magnet to show the result; explain how `{item} is made of {material}. {rule}`.
- [ ] Tests: each item has a material and correct flag; aluminium and copper are not magnetic; generator. Commit.

### Task 15: Light & Shadows (`shadows`)

`light.ts`: opaque (book, hand, teddy, wooden block), translucent (tissue paper, frosted glass), transparent (clear glass, plastic wrap); pure `shadowScale(torchDistance)` → larger when the torch is closer to the object (distance 1..5 → scale 2.0..1.0).
Explore: draggable torch slider and object picker; shadow on the wall resizes; transparent objects cast almost no shadow, translucent a faint one. Challenge kinds: "Move the torch closer. Will the shadow get bigger or smaller?" (answer bigger/smaller) and "Which object makes the darkest shadow?" (choiceCards of 3 objects, one opaque). Hints: `Closer to the light makes a bigger shadow.` / `Light cannot pass through opaque things, so their shadows are dark.`
- [ ] Tests: `shadowScale` monotonic decreasing in distance; each object has one class; generator. Commit.

### Task 16: Skeleton Builder (`skeleton`)

`skeleton.ts`: bones skull, jaw, spine (backbone), ribs, collarbone, shoulder blade, pelvis (hips), arm bones, hand bones, leg bones (thigh bone/femur), knee cap, foot bones; jobs: skull protects the brain; ribs protect the heart and lungs; spine holds us up and lets us bend; leg and arm bones work with muscles to help us move.
Self-drawn SVG skeleton. Explore: tap bone → name + job. Challenge kinds: `Tap the {bone}` and `Which bones protect the heart and lungs?` (tap on SVG); hint = job sentence.
- [ ] Tests: each job references a bone in the SVG; generator. Commit.

### Task 17: Register, e2e, docs

**Files:** Modify `src/content/registry.ts`, `e2e/app.spec.ts`, `PANDUAN.md` (update the "Saat ini baru Kelas 1 dan Kelas 3" note if needed), `CREDITS.md` (no new third-party assets; note all stories/content original).
(Registration of each toy happens in its own task; this task verifies.)
- [ ] e2e: for every new toy, in the right grade (`#/k/1/...` or `#/k/3/...`), open Explore and Challenge at 360×640 → no horizontal scroll, no console errors; one full Challenge round in Sound Builder (answer via tiles using `data-word` exposed on the prompt) → results show `10 correct`; subject maps of Grade 1 and Grade 3 show English and Science unlocked, other subjects still "Soon".
- [ ] `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run e2e` all PASS. Commit `test(e2e): phase 2 toys; docs`.
