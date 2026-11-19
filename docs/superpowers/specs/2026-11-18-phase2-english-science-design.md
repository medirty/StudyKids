# StudyKids Tahap 2 — English & Science (desain)

Status: disetujui Bimo (2026-11-18) · Induk: `2026-11-18-kids-study-app-design.md` (semua aturan di sana tetap berlaku)

## Tujuan

Menambah 7 mainan English dan 8 mainan Science untuk Kelas 1 (Stage 1) dan Kelas 3 (Stage 3). Pola dan kualitasnya sama dengan mainan Math: Explore + Challenge, ronde 10 soal, layar hasil dengan *why/how/Show me*, suara sesuai profil, offline, dan nyaman di layar 360px.

## Keputusan Bimo

- **Tanpa rekaman.** Semua suara memakai suara bawaan perangkat (diputuskan 2026-11-19, lihat `2026-11-19-grade-menu-design.md`). Sound Builder membacakan kata utuh; mengetuk huruf mengucapkan "<huruf> … like <contoh kata>". Bunyi huruf murni (/k/) tidak tersedia.
- App memakai menu **Kelas 1–6**, bukan profil Adik/Kakak. Bacaan otomatis mengikuti kelas dan tombol 🔊.

## Pendekatan audio phonics

| | Pendekatan | Trade-off | Status |
|---|---|---|---|
| A | Bimo merekam semua bunyi | Paling akurat, tapi butuh rekaman | Tidak dipakai |
| B | Suara perangkat saja: kata utuh + huruf dengan contoh kata | Tanpa rekaman; bunyi murni tidak ada | **Dipakai** |
| C | Slot rekaman + cadangan suara perangkat | Rumit tanpa manfaat bila tidak ada rekaman | Dibatalkan |

## Mainan

Semua teks dan cerita **ditulis sendiri** (bukan salinan buku Cambridge). Gambar memakai emoji atau SVG sederhana buatan sendiri.

### English, Kelas 1

1. **Sound Builder** (phonics, CVC). *Explore:* papan huruf. Ketuk huruf → "<huruf> … like <contoh kata>" dibacakan; seret 3 huruf → kata dibacakan + emoji muncul kalau kata dikenal. *Challenge:* dengar kata + lihat emoji → susun dari 5–6 ubin huruf. Kata dari daftar CVC sederhana (cat, dog, sun, pig, bed, hat, map, cup, fox, bus, …).
2. **Tricky Word Pop.** Sight words Stage 1 (the, to, I, no, go, into, he, she, we, me, be, was, my, you, they, her, all, are, said, have, like, so, do, some, come, there). *Explore:* kartu kata, ketuk → dibacakan. *Challenge:* dengar kata → letuskan balon yang benar (4 balon).
3. **Sentence Fixer.** Huruf kapital di awal kalimat dan titik di akhir. *Challenge:* kalimat pendek yang salah (misalnya "the cat sat on the mat"). Ketuk huruf yang harus kapital dan ketuk tempat titik. *Explore:* kalimat contoh dengan ketuk-untuk-memperbaiki dan penjelasan suara.

### English, Kelas 3

4. **Word Sorter.** Seret kata ke keranjang noun, verb, atau adjective. *Challenge:* dalam satu kalimat, ketuk kata dengan jenis yang diminta ("Tap the verb").
5. **Past Tense Machine.** Kata kerja masuk mesin dan keluar bentuk lampaunya. Regular -ed (aturan: walk→walked, hop→hopped, bake→baked, cry→cried) dan irregular umum (go→went, run→ran, see→saw, eat→ate, …). *Challenge:* susun bentuk lampau dari ubin, atau pilih dari 3 kartu untuk kata irregular.
6. **Prefix & Suffix Lab.** Awalan un-, re-, dis-, pre-; akhiran -ful, -less, -ly, -ness, -er. *Challenge:* diberi arti ("not happy") → gabungkan akar + imbuhan yang benar.
7. **Story Time.** 4 cerita pendek orisinal (sekitar 80–150 kata) dengan read-along dan highlight per kata. *Challenge:* 10 pertanyaan pemahaman (siapa, apa, kenapa, urutan kejadian), diambil dari cerita yang dipilih.

### Science, Kelas 1

8. **My Body & Senses.** Gambar anak (SVG). Ketuk bagian tubuh → namanya dibacakan. Lima indera beserta organnya. *Challenge:* "Which part do we use to smell?" → ketuk di gambar.
9. **Alive or Not?** Seret benda atau makhluk ke dua lingkaran: living dan non-living (tanaman = living). *Challenge:* kelompokkan 1 kartu per soal.
10. **Material Sorter.** Wood, plastic, metal, glass, fabric, paper. *Challenge:* "What is this made of?" atau properti sederhana (hard/soft, see-through).
11. **Push or Pull?** *Explore:* dorong atau tarik mobil mainan; makin kuat tenaganya, makin jauh mobil bergerak. *Challenge:* adegan (buka laci, tendang bola, tarik pintu, dorong ayunan) → pilih push atau pull.

### Science, Kelas 3

12. **Grow a Plant.** *Explore:* simulasi tanaman dengan pengatur air, cahaya, dan suhu hangat. Tanaman tumbuh sehat hanya kalau ketiganya cukup; terlalu banyak air juga tidak baik. *Challenge:* labeli bagian tanaman (root, stem, leaf, flower) dan fungsinya.
13. **Magnet Test.** Seret benda ke magnet. Yang menempel: benda besi/baja (paperclip, paku, peniti, sendok baja). Yang tidak: plastik, kayu, kaca, kertas, aluminium, tembaga. *Challenge:* prediksi "Will it stick?" lalu lihat hasilnya.
14. **Light & Shadows.** *Explore:* geser senter mendekat atau menjauh dari benda → bayangan membesar atau mengecil; ganti benda transparan/buram. *Challenge:* prediksi bayangan bigger/smaller, atau pilih benda yang menghasilkan bayangan.
15. **Skeleton Builder.** Labeli tulang (skull, ribs, spine, pelvis, arm and leg bones) dan fungsinya: melindungi (skull → brain, ribs → heart and lungs), menopang, dan bergerak bersama otot.

Total **15 mainan**. Setiap fakta Science harus benar dan disederhanakan untuk anak; reviewer mengecek akurasi.

## Batasan tambahan

- Mainan multiple-choice (balon, kartu) tetap harus terasa seperti mainan, bukan lembar soal: animasi, suara, ukuran besar.
- Setiap soal menyimpan `spoken` bila tampilan berbeda dari yang dibacakan.
- Daftar kata/cerita/fakta ada di file konten terpisah (`src/content/english/*.ts`, `src/content/science/*.ts`) supaya mudah ditinjau.

## Diserahkan ke builder

- Detail visual setiap mainan mengikuti pola mainan Math dan app jam.
- Urutan pengerjaan: dasar audio phonics dulu, lalu mainan English, lalu Science.
