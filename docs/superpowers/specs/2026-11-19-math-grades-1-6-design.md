# StudyKids — Math Kelas 1–6 (Cambridge Primary Mathematics 0096)

Tanggal: 2026-11-19 · Pemilik: Bimo · Status: disetujui Bimo (2026-11-19)

Induk: `2026-11-18-kids-study-app-design.md` (lihat catatan arah baru di atasnya). Kontrak mainan, mesin ronde, aturan suara, dan aturan "tidak membocorkan jawaban" dari spec induk dan spec Tahap 2 tetap berlaku.

## 1. Tujuan dan alasan

Bimo ingin app ini berisi **semua kelas 1–6 untuk semua mapel**, dengan isi **sama atau mirip kurikulum Cambridge Primary**. Untuk sementara app belum dibuka untuk umum. Pengerjaan dilakukan per mapel, dan **Math adalah mapel pertama**. Spec ini mencakup Math untuk Kelas 1–6.

Kondisi sekarang: Math hanya punya 7 mainan, untuk Kelas 1 dan 3 saja. Kelas 2, 4, 5, dan 6 tampil "Soon".

Sukses berarti: setiap kelas 1–6 punya Math yang bisa dimainkan, dan **setiap kode tujuan belajar di framework 0096 (Stage 1–6) tertutup oleh minimal satu mainan**. Bagian Thinking & Working Mathematically adalah pengecualian; lihat bagian 2.

## 2. Sasaran, bukan sasaran, anti-sasaran

**Sasaran**
- 23 mainan Math. Ada 7 mainan lama yang diperluas ke kelas lain dan 16 mainan baru (peta di bagian 5).
- Satu mainan bisa dipakai di beberapa kelas, dan soalnya makin sulit sesuai kelas. Explore juga menyesuaikan kelas.
- Ada tabel cakupan (`docs/curriculum/math-0096.md`): setiap kode tujuan belajar → mainan + kelas yang menutupnya. Ada tes otomatis yang memastikan tidak ada kode yang terlewat.
- Setiap gelombang menghasilkan versi yang bisa di-push dan dites Bimo di iPad.

**Bukan sasaran**
- TWM.01–08 (Thinking & Working Mathematically) tidak dibuat sebagai mainan tersendiri. Kemampuan ini muncul lewat penjelasan "kenapa" dan "bagaimana" di layar hasil, dan lewat soal yang meminta anak memperkirakan atau menebak dulu.
- Tidak ada mainan yang meminta anak "melakukan investigasi" di dunia nyata. Untuk tujuan belajar statistik yang menyebut investigasi, mainannya memakai data contoh yang sudah disiapkan.
- Tidak ada penyimpanan progress (tetap seperti spec induk).
- Mapel lain belum dikerjakan.

**Anti-sasaran** (gagal walau secara teknis jalan)
- Mainan jadi lembar soal pilihan ganda belaka. Setiap mainan harus punya sesuatu yang dipegang, diseret, atau digeser, mengikuti standar app jam.
- Soal kelas tinggi bocor ke kelas rendah. Contohnya bilangan negatif muncul di Kelas 2.
- Isi menyimpang dari Cambridge, misalnya urutan materi atau batas bilangan yang tidak sesuai Stage.
- Mainan lama rusak atau berubah perilakunya di kelas yang sudah ada (1 dan 3), kecuali untuk perbaikan yang disebut di spec ini.

## 3. Batasan

- Stack dan kontrak tetap: Vite, TypeScript strict, Tailwind v4, PWA offline, `Toy` contract di `src/core/types.ts`, kit UI bersama (`dragSort`, `choiceCards`, `tiles`).
- Bahasa konten Inggris. Semua suara memakai suara perangkat (tanpa rekaman).
- Satuan ukur metrik (cm, m, km, g, kg, ml, l), sesuai Cambridge.
- Semua aset di-bundle, tanpa CDN. Gambar dibuat dengan SVG atau emoji yang sudah dipakai app. Untuk emoji baru, utamakan yang sudah lama ada (Unicode ≤ 13) karena tablet lama.
- Tetap mematuhi aturan R9/R11/R13/R14/P2, aturan Challenge tidak membocorkan jawaban sebelum Check, dan aturan demo tidak mengulang `explain().how`.

## 4. Pendekatan yang dipertimbangkan

**Urutan antarmapel** (diputuskan sebelumnya): per mapel, Kelas 1–6 sekaligus. Bimo memilih urutan Math → English → Science → mapel lain.

**Susunan mainan Math:**

| | Pendekatan | Untung/rugi | Status |
|---|---|---|---|
| **A** | **Keluarga mainan lintas kelas**: satu mainan per topik, tingkat kesulitan menurut kelas | Konsisten, dan anak mengenali mainannya saat naik kelas. Bisa diperiksa per topik terhadap Cambridge. Mesin sekarang sudah mendukung (`meta.stages`, `generateQuestions(stage, …)`). | **Dipilih** |
| B | Mainan terpisah per kelas per topik | Setiap mainan sederhana, tapi jumlahnya sekitar 3× lebih banyak, kodenya mirip-mirip, dan mudah tidak konsisten. | Ditolak |
| C | Bank soal generik per kelas (satu mainan kuis besar) | Cepat, tapi melanggar anti-sasaran (lembar soal). | Ditolak |

## 5. Peta mainan

✅ = mainan sudah ada, kelasnya diperluas · 🆕 = mainan baru. Kode di kolom terakhir adalah kode framework 0096. `n` = nomor Stage.

| # | Mainan | Kelas | Isi per kelas (ringkas) | Kode utama |
|---|---|---|---|---|
| 1 | Tick-Tock Time ✅ | 1–4 | K1 jam tepat & setengah · K2 5 menit (analog & digital) · K3 12 jam digital ↔ analog · K4 24 jam | nGt.02/03 (K1 Gt.03, K2 Gt.02, K3 Gt.02, K4 Gt.02) |
| 2 | Time Trip 🆕 | 1–6 | K1 hari & bulan, urutan kejadian · K2 kalender · K3 jadwal, waktu vs selang waktu · K4 konversi satuan, selang hari–tahun · K5 selang melewati 60, zona waktu, di bawah 1 detik · K6 desimal ↔ satuan campuran | 1Gt.01–02, 2Gt.01/03, 3Gt.01/03/04, 4Gt.01/03/04, 5Gt.01–04, 6Gt.01 |
| 3 | Counting Jar ✅ (count20) | 1–3 | K1 hitung 0–20, pola tanpa menghitung, perkiraan · K2 sampai 100 · K3 perkiraan sampai 1000 | nNc.01–03, 1Np.01, nNi.01 |
| 4 | Number Line Hop ✅ | 1–6 | K1 tambah/kurang ≤20, lompat 1/2/10 · K2 2 digit tanpa menyimpan, lompat 2/5/10 · K3 3 digit dengan menyimpan, lompat 100 · K4 lompat ribuan, bilangan negatif · K5 jumlah/kurang bilangan negatif · K6 lompat pecahan & desimal | nNc.04/01, nNi.02–05, 4Nc.01, 5Nc.01, 5Ni.01, 6Nc.01, 6Ni.01 |
| 5 | Place Value Blocks ✅ | 1–6 | K1 susun/urai 10–20, banding & urut, urutan ke-1–10 · K2 2 digit, nol sebagai penanda, bulat ke 10 · K3 3 digit, ×10, bulat ke 10/100, =,>,< · K4 ribuan, ×÷10/100, bulat sampai 100 000, urut positif/negatif · K5 persepuluhan & perseratusan, ×÷10/100/1000, bulat 1 desimal · K6 perseribuan, bulat 2 desimal | nNp.* , nNi.01 |
| 6 | Patterns & Sequences 🆕 | 1–6 | K1 barisan benda, ganjil/genap · K2 barisan & pola · K3 aturan suku ke suku, benda sebagai bilangan tak diketahui · K4 barisan non-linear, pola kuadrat, ganjil+genap · K5 suku ke-n, dua bilangan tak diketahui, bilangan segitiga · K6 aturan posisi ke suku, huruf sebagai variabel | nNc.05/06, 3Nc.03–06, 4Nc.02–05, 5Nc.02–04, 6Nc.02–04 |
| 7 | Times Tables ✅ (multiply) | 2–4 | K2 penjumlahan berulang & array, tabel 1/2/5/10 · K3 tabel 1–6, 8, 9, 10; sifat komutatif & distributif · K4 semua tabel 1–10, sifat asosiatif | 2Ni.05/07, 3Ni.05–07/10, 4Ni.03/04 |
| 8 | Share & Group 🆕 | 2–6 | K2 berbagi rata & mengelompokkan · K3 ÷2–5 sampai 100, hubungan × dan ÷ · K4 ÷ 1 digit sampai 100, dengan sisa · K5 ÷ 1 digit sampai 1000 · K6 ÷ 1–2 digit sampai 1000 | 2Ni.06, 3Ni.05/09, 4Ni.06, 5Ni.05, 6Ni.05 |
| 9 | Big Multiply 🆕 | 3–6 | K3 ×2–5 sampai 100 · K4 sampai 1000 × 1 digit · K5 × 1–2 digit · K6 sampai 10 000; perkalian desimal | 3Ni.08, 4Ni.05, 5Ni.04, 6Ni.04, 5Nf.10, 6Nf.10/11 |
| 10 | Number Detective 🆕 | 4–6 | K4 faktor & kelipatan, habis dibagi 2/5/10/25/50/100 · K5 prima/komposit, habis dibagi 4/8, bilangan kuadrat · K6 KPK/FPB sederhana, habis dibagi 3/6/9, bilangan kubik | 4Ni.07/08, 5Ni.06–08, 6Ni.06–08 |
| 11 | Operation Order 🆕 | 5–6 | K5 urutan 4 operasi, memilih sifat hitung · K6 kurung | 5Ni.02/03, 6Ni.02/03 |
| 12 | Fraction Pizza ✅ (fractions) | 1–6 | K1 dua bagian sama/tidak, setengah, setengah dari, 2 setengah = 1 · K2 seperempat, ¾, ½ ¼ ¾ dari · K3 (sekarang) + pecahan dari kumpulan, sepertiga & sepersepuluh · K4 makin banyak bagian makin kecil, senilai, jumlah/kurang penyebut sama, banding · K5 pecahan campuran, penyebut kelipatan, × ÷ pecahan satuan · K6 bentuk paling sederhana, penyebut berbeda, × ÷ pecahan biasa | nNf.* (pecahan) |
| 13 | Fraction-Decimal-% 🆕 | 4–6 | K4 persen = per seratus · K5 kesetaraan pecahan/desimal/persen, persen bentuk, urutkan, jumlah/kurang desimal · K6 persen dari jumlah, urutkan, jumlah/kurang desimal beda tempat | 4Nf.06, 5Nf.04/07/08/09, 6Nf.04/07/08/09 |
| 14 | Recipe Mixer 🆕 | 5–6 | K5 proporsi vs rasio · K6 proporsi langsung, rasio senilai | 5Nf.11, 6Nf.12/13 |
| 15 | Money Shop 🆕 | 1–3 | K1 kenal uang · K2 nilai & penulisan, banding kombinasi · K3 jumlah & kembalian (lihat 6.4 soal mata uang) | 1Nm.01, 2Nm.01/02, 3Nm.01/02 |
| 16 | Measure It 🆕 | 1–6 | K1 kosakata panjang/massa/volume, pilih alat ukur · K2 ukur panjang, skala = garis bilangan · K3 cm/m/km, g/kg, ml/l, termometer · K4 baca skala pecahan · K5 skala desimal · K6 volume vs kapasitas | 1Gg.02/04/05/08, 2Gg.03/04/06/07/12, 3Gg.02/06/07/11, 4Gg.09, 6Gg.05 |
| 17 | Shape Lab ✅ (shapes) | 1–6 | K1 (sekarang) + 2D vs 3D · K2 sisi & titik sudut, lingkaran, bentuk di benda · K3 beraturan/tidak, gambar 3D · K4 sisi 3D, jaring-jaring, teselasi · K5 jenis segitiga, 3D dari arah lain, jaring kubus · K6 jenis segiempat, bagian lingkaran, 3D gabungan, jaring prisma/limas, gambar lingkaran berjari-jari | nGg (bentuk) |
| 18 | Area & Perimeter 🆕 | 3–6 | K3 konsep luas & keliling di petak · K4 rumus persegi panjang, bentuk gabungan, bentuk tak beraturan · K5 keliling sama luas beda · K6 luas segitiga siku-siku, luas vs luas permukaan | 3Gg.03/04, 4Gg.02–04, 5Gg.02/03, 6Gg.03/07 |
| 19 | Angles & Turns 🆕 | 2–6 | K2 putaran penuh/setengah/seperempat, searah/berlawanan jarum jam · K3 dibanding sudut siku · K4 lancip/siku/tumpul · K5 refleks, sudut pada garis lurus 180° · K6 ukur & gambar sudut, sudut segitiga 180° | 2Gg.11, 3Gg.10, 4Gg.08, 5Gg.07/08, 6Gg.09/10 |
| 20 | Mirror & Move 🆕 | 1–6 | K1 bentuk sama saat diputar · K2 garis simetri, cermin vertikal, putaran penuh · K3 simetri & cermin horizontal/vertikal · K4 semua garis simetri, cermin di petak · K5 lengkapi pola simetris, pergeseran · K6 simetri putar, cermin diagonal, rotasi 90° | 1Gg.07, 2Gg.09/10, 2Gp.02, 3Gg.09, 3Gp.02, 4Gg.07, 4Gp.03, 5Gg.06, 5Gp.03/04, 6Gg.08, 6Gp.03–05 |
| 21 | Treasure Map 🆕 | 1–6 | K1–2 kata posisi & arah · K3 mata angin utama · K4 8 arah, koordinat kuadran 1 · K5 plot titik jadi bentuk · K6 4 kuadran, desimal/pecahan | nGp.01, 4Gp.01/02, 5Gp.01/02, 6Gp.01/02 |
| 22 | Graph Builder 🆕 | 1–6 | K1 benda/daftar/tabel/piktogram/blok, lebih/kurang/paling · K2 pilih penyajian, persamaan & variasi · K3 turus, diagram batang, Venn/Carroll · K4 dot plot · K5 diagram garis, waffle, modus & median · K6 diagram lingkaran, pencar, rata-rata & jangkauan | nSs.* |
| 23 | Chance Spinner 🆕 | 2–6 | K2 pola teratur/acak, percobaan 2 hasil · K3 pasti/tidak/mungkin · K4 mungkin/pasti/mustahil, percobaan kecil & besar · K5 sama mungkin vs lebih/kurang mungkin, simulasi · K6 bahasa peluang & proporsi, saling lepas, percobaan besar | nSp.* |

Jumlah mainan Math per kelas: K1 13 · K2 17 · K3 19 · K4 19 · K5 19 · K6 19.

Kolom "Kode utama" adalah peta awal. Pemetaan per kode yang mengikat ada di tabel cakupan (bagian 6.6), yang dibuat builder dari daftar lengkap kode di `reference/cambridge-math-0096-objectives.md` (parafrase dari framework 0096 edisi sekarang, mulai diajarkan 2020; link PDF ada di file itu).

**Kode yang tidak pas dengan peta** *(keputusan Claude)*: pertama, perluas mainan yang paling dekat (tambah kelas atau jenis soal). Kalau tetap tidak pas, builder mencatatnya di laporan gelombang dan Claude membawanya ke Bimo. Mainan ke-24 hanya dibuat dengan persetujuan Bimo. Kode tidak boleh dibiarkan bolong diam-diam.

## 6. Desain

### 6.1 Mainan lintas kelas

- `meta.stages` diperluas sesuai peta.
- `generateQuestions(stage, …)` dan `explore` harus menghasilkan isi yang sesuai Stage itu saja. Batas bilangan dan konsep mengikuti framework. Di kelas rendah tidak boleh muncul konsep kelas tinggi, dan di kelas tinggi tidak perlu mengulang semua soal kelas rendah.
- **Objective per kelas:** sekarang `meta.objective` hanya satu string. Kontraknya diubah supaya objective bisa berbeda per kelas, misalnya `string | Partial<Record<Stage, string>>`. Bentuk persisnya diserahkan ke builder. Mainan lama tetap jalan.
- **Perilaku Kelas 1 dan 3 yang sudah ada tidak berubah**, kecuali isinya memang harus ditambah menurut peta (misalnya Fraction Pizza K3 ditambah pecahan dari kumpulan). Tes lama harus tetap lulus. Kalau ada tes yang harus diubah, alasannya ditulis.
- Kelas 4–6 membuka di Challenge (sesuai grade defaults), jadi Challenge di kelas tinggi harus bisa dimainkan tanpa membaca Explore dulu.

### 6.2 Daftar mainan per kelas

Satu kelas bisa punya sampai 19 mainan Math. Daftar mainan dikelompokkan dengan judul kecil menurut bagian Cambridge: **Number**, **Geometry & Measure**, dan **Statistics & Probability**. Urutan di dalam kelompok mengikuti nomor di peta. *(Keputusan Claude.)* Mainan menyimpan kelompoknya di meta, misalnya `meta.strand`. Mapel lain yang belum punya kelompok tampil seperti sekarang.

### 6.3 Interaksi

Setiap mainan baru punya Explore (main bebas) dan Challenge (10 soal), mengikuti pola mainan yang ada. Interaksi utama yang diusulkan (builder boleh mengubah kalau ada yang lebih pas, asal tetap "dipegang"):

- **Time Trip:** kalender yang bisa diklik, jadwal kereta/bus, garis waktu yang ditarik untuk selang waktu, dan jam dunia untuk zona waktu.
- **Patterns:** manik-manik/ubin yang disusun, dan seret suku berikutnya.
- **Share & Group:** seret kue ke piring (berbagi) atau ke kotak berisi n (mengelompokkan). Di kelas tinggi berupa pembagian bersusun bertahap.
- **Big Multiply:** metode grid (kotak luas) yang diisi bertahap.
- **Number Detective:** saringan bilangan (klik kelipatan, faktor, prima).
- **Operation Order:** ekspresi yang diselesaikan selangkah demi selangkah dengan mengetuk operasi yang benar.
- **Fraction-Decimal-%:** batang 100 kotak dan garis bilangan 0–1 yang menyatu dengan dinding pecahan.
- **Recipe Mixer:** campur bahan (misalnya jus) dengan rasio, lalu besarkan resepnya.
- **Money Shop:** toko mainan; seret koin/uang kertas ke kasir, beri kembalian.
- **Measure It:** penggaris, timbangan, dan gelas ukur yang jarumnya/permukaannya dibaca. Skala bisa diatur per kelas.
- **Area & Perimeter:** geoboard/petak: warnai kotak, telusuri pinggir.
- **Angles & Turns:** robot/panah yang diputar, busur derajat yang diseret.
- **Mirror & Move:** petak dengan garis cermin. Anak mewarnai bayangan, menggeser bentuk, atau memutarnya.
- **Treasure Map:** peta harta dengan petak/koordinat, panah arah, dan kompas.
- **Graph Builder:** seret data ke piktogram/batang/tally. Untuk kelas tinggi, baca grafik dan cari modus/median/rata-rata.
- **Chance Spinner:** pemutar dan kantong bola yang bisa diatur. Jalankan 10 lalu 100 percobaan.

### 6.4 Mata uang (Money Shop)

Saat diskusi, Bimo mempertimbangkan Rupiah untuk semua kelas, atau bisa memilih Rupiah/Dollar. **Usulan Claude: ada pilihan 🇮🇩 Rupiah / 🇺🇸 Dollar di Money Shop, defaultnya Rupiah, dan pilihannya diingat di perangkat.** *(Pilihan Rupiah/Dollar adalah ide Bimo; default Rupiah usulan Claude.)*

- **Rupiah:** koin 100, 200, 500, 1000 dan uang kertas 1000–100.000. Angkanya ditulis gaya Inggris supaya tidak bentrok dengan titik desimal di mainan lain: `Rp 5,000`.
- **Dollar:** koin dan uang kertas umum, dengan penulisan desimal `$2.50`.
- Tujuan belajar 3Nm.01 (penulisan uang dengan titik desimal) hanya tertutup di mode Dollar; di tabel cakupan tetap dihitung tertutup oleh Money Shop K3 (dengan catatan "mode Dollar"). Di mode Rupiah, Kelas 3 berlatih jumlah dan kembalian dengan bilangan ribuan. Penulisan desimal tetap diajarkan di Place Value Blocks dan Measure It.
- Gambar uang dibuat sederhana sebagai SVG generik: lingkaran/persegi panjang berwarna dengan nominal. Bukan tiruan uang asli.

### 6.5 Penjelasan dan demo

Setiap soal punya `explain()` (kenapa + bagaimana) yang disesuaikan kelasnya, dan `demonstrate()` yang memperagakan di mainan. Aturan yang sudah ada berlaku: demo tidak mengulang `how`, bail ketika root terlepas, dan bicara hanya di bawah autoRead. Kalimat yang dibacakan harus ramah TTS: tanpa simbol seperti "→", "–", "÷" mentah; pakai field `spoken` bila perlu.

### 6.6 Tabel cakupan

`docs/curriculum/math-0096.md` berisi semua kode 0096 Stage 1–6 (kecuali TWM) dengan kolom: kode, ringkasan (parafrase, bukan kutipan), mainan, kelas, gelombang. Ada tes yang membaca tabel ini, lalu memastikan (kode untuk gelombang yang belum dibangun ditandai "planned" dan hanya dicek setelah gelombangnya selesai; di akhir M6 tidak boleh ada "planned" lagi):
- setiap kode punya mainan;
- mainan yang disebut memang ada dan `meta.stages`-nya mencakup kelas itu.

### 6.7 Gelombang pembangunan

Setiap gelombang punya plan sendiri. Setiap gelombang diakhiri tes lengkap, review, merge, dan file dikirim ke folder Bimo untuk di-push.

1. **M1. Perluas mainan lama.** 7 mainan yang ada diperluas ke kelas barunya. Ditambah perubahan kontrak (objective per kelas, `strand`), pengelompokan daftar mainan, dan tabel cakupan + tesnya. Setelah gelombang ini, Kelas 2, 4, 5, 6 langsung terbuka.
2. **M2. Bilangan:** Patterns & Sequences, Share & Group, Big Multiply, Number Detective, Money Shop.
3. **M3. Pecahan dan lanjutan:** Fraction-Decimal-%, Recipe Mixer, Operation Order.
4. **M4. Ukur dan waktu:** Time Trip, Measure It, Area & Perimeter.
5. **M5. Geometri:** Angles & Turns, Mirror & Move, Treasure Map.
6. **M6. Data:** Graph Builder, Chance Spinner. Ditutup dengan pemeriksaan bahwa semua kode di tabel cakupan tertutup.

## 7. Diserahkan ke builder (dan keputusan yang aku ambil)

- Cara persis tiap mainan menyesuaikan kelas, bentuk soal, dan gambar, dalam batas peta dan bagian 6.3.
- Bentuk persis perubahan kontrak (`objective` per kelas, `strand`).
- Pembagian tugas di dalam gelombang.
- **Keputusan Claude:**
  - satu mainan lintas kelas;
  - pengelompokan daftar mainan per bagian Cambridge;
  - TWM tidak dibuat sebagai mainan;
  - investigasi statistik memakai data contoh;
  - penulisan `Rp 5,000`;
  - urutan gelombang.
- **Catatan terbuka dari Tahap 2 yang ikut dibereskan di M1** (karena menyentuh mainan Math): penjelasan Times Tables masih memakai "→".
