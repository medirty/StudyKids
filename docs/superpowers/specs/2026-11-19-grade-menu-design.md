# Grade menu instead of profiles — short design

Status: approved by Bimo (2026-11-19). Supersedes the profile parts of `2026-11-18-kids-study-app-design.md` (§5.1, §6.1) and the whole of `2026-11-18-profile-names-design.md`.

**Why:** the app should focus on each grade's lessons, not on who is learning.

**Approaches:** (A, chosen) behaviour follows the grade, plus a 🔊 auto-read toggle remembered per device; (B) grade only, no toggle — rejected, a Grade 3 child who still needs reading aloud would have no option; (C) same behaviour for every grade — rejected, Grade 1 children who can't read yet would lose automatic reading.

**Design**
- Home screen: 6 large cards "Grade 1" … "Grade 6" (Indonesian sub-label "Kelas 1" … "Kelas 6"). A grade with no toys yet shows "🔒 Soon" and cannot be opened (today: Grades 1 and 3 have toys). The last chosen grade is remembered on the device (`studykids.lastGrade`); opening the app with a remembered grade goes straight to its subject map. A "🏠 Grades" button in the header returns to the grade menu.
- Per-grade defaults: Grades 1–2 → auto-read ON, toys open in Explore; Grades 3–6 → auto-read OFF, toys open in Challenge.
- Header 🔊 toggle: switches auto-read on/off for the current grade, remembered per device (`studykids.autoRead` = `{ [grade]: boolean }`); default = the grade's default. It replaces the profile's autoRead everywhere (prompts, feedback, greeting none, demonstrate rules R9/R13 unchanged).
- Remove: profiles Adik/Kakak, the profile picker, the name/avatar editor, greeting, `studykids.profileCustom`, `studykids.lastProfile`. Old storage keys are ignored (optionally deleted on start).
- Routes: `#/` grade menu; `#/k/<grade>` subjects; `#/k/<grade>/<subject>`; `#/k/<grade>/<subject>/<toy>/<mode>`. Old `#/p/...` links and invalid grades → grade menu. The subject map no longer has a Stage toggle.
- `Stage` type becomes `1|2|3|4|5|6`; toys keep their `meta.stages`.
- Phonics: no recordings. Sound Builder uses the device voice only (whole words; tapping a letter says "<letter> … like <example word>"). `REKAMAN-PHONICS.md` and the recording processor are dropped.
- Docs updated: parent spec (pointer to this doc), PANDUAN (remove the rename section, describe grade menu and 🔊 toggle), Phase 2 spec and plan (grades instead of Adik/Kakak; no recordings), project status.

**Non-goals:** content for Grades 2, 4, 5, 6 (later phases); multiple children's names.
