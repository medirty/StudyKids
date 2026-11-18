# Profile names & avatars — short design

Status: approved by Bimo (2026-11-18)

**Why:** Bimo wants his children's real names in the app instead of "Adik"/"Kakak", without the names ever reaching the public GitHub repo/site, and without the kids changing them by accident.

**Approaches:** (A, chosen) names edited in-app, stored per device in localStorage; (B, rejected) names hard-coded in source — publishes the children's names in a public repo/site.

**Design**
- Profile picker: press-and-hold a profile card for 2s → circular progress fills → edit dialog opens. Releasing/moving away before 2s cancels; a normal tap still selects the profile. Keyboard: holding Enter/Space on a focused card for 2s also opens it.
- Edit dialog: name input (trimmed, max 12 chars), avatar choice of 8 emoji (👧 👦 🧒 👶 🐱 🐶 🦊 🐼), buttons Save / Cancel / Reset (back to defaults). Empty name → default.
- Display name + emoji used everywhere a profile is shown (picker cards, header Switch/profile indicator, greeting).
- Greeting: when a profile is opened, show "Hi, {name}! 👋" briefly on the subject map; spoken only when that profile's autoRead is on.
- Stage, default mode and autoRead stay fixed per profile id (adik: Stage 1/explore/autoRead; kakak: Stage 3/challenge/no autoRead). Route ids stay `adik`/`kakak`.
- Storage: localStorage key `studykids.profileCustom` = `{ adik?: {name, emoji}, kakak?: {name, emoji} }`; read/write errors swallowed; invalid data ignored. (Amends the global constraint "only key is studykids.lastProfile": preferences, not progress.)

**Non-goals:** sync across devices, more than two profiles, changing a profile's stage.
