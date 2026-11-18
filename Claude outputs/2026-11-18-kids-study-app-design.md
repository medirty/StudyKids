# StudyKids — Desain App Belajar Offline (Cambridge Primary)

Tanggal: 2026-11-18 · Pemilik: Bimo · Status: draft untuk disetujui

## 1. Tujuan dan alasan

Bimo ingin app belajar untuk **dua anaknya sendiri** di rumah:

- **Adik (perempuan, kelas 1 SD / Cambridge Stage 1):** belum lancar membaca tapi sudah sedikit paham, bisa bahasa Inggris dan Indonesia. Suka **menjelajah bebas**. Di prototipe jam, dia senang menyeret jarum untuk tahu jam berapa.
- **Kakak (laki-laki, kelas 3 SD / Cambridge Stage 3):** sudah bisa membaca. Suka **kuis**. Di prototipe jam, dia belajar membaca jam lewat mode kuis.

App harus **fun dan interaktif**, mengikuti **kurikulum Cambridge Primary**, jalan **offline**, dan bisa dibuka di **laptop, tablet, dan HP**.

**Prior art:** Bimo membuat app jam ("Tick-Tock Time!") di Gemini, dan kedua anak sangat menyukainya. File-nya ada di `reference/tick-tock-clock.html`. App jam ini jadi **standar kualitas dan pola interaksi** untuk seluruh app.

## 2. Sasaran, bukan sasaran, anti-sasaran

**Sasaran**
- Setiap konsep dibuat sebagai satu **"mainan" interaktif** yang bisa dipegang anak, bukan sekadar lembar soal.
- Setiap mainan punya dua mode: **Explore** (main bebas, tanpa salah-benar) dan **Challenge** (ronde soal).
- Di akhir ronde Challenge muncul **jumlah benar dan salah**, beserta **penjelasan kenapa salah dan bagaimana caranya**. Penjelasan ini dibacakan, dan kalau memungkinkan mainannya ikut memperagakan jawaban yang benar.
- Semua teks bisa **dibacakan** (read aloud).
- Bisa dipakai offline, dan update otomatis begitu perangkat tersambung internet.

**Bukan sasaran (v1)**
- **Tidak menyimpan progress** antar sesi. Bimo secara eksplisit tidak membutuhkannya. Hasil ronde hilang ketika app ditutup.
- Tidak ada akun, login, server, atau sinkron antar perangkat.
- Tidak ada halaman pemantauan untuk orang tua.
- Tidak ada bahasa Indonesia di v1. Konten berbahasa Inggris, sesuai Cambridge.
- Tidak dirilis ke publik atau App Store.

**Anti-sasaran (gagal walaupun secara teknis jalan)**
- Terasa seperti lembar kerja atau kuis pilihan ganda yang membosankan.
- Adik tidak bisa memakainya sendiri karena terlalu banyak tulisan.
- Kalimat seperti "Wrong!" dengan tanda silang merah yang membuat anak kecil hati. Umpan balik harus lembut dan membantu, seperti di app jam.
- App rusak atau tidak bersuara saat offline (masalah prototipe sekarang yang memuat Tailwind, font, Tone.js, dan confetti dari CDN).
- Menyalin soal, teks, atau gambar resmi Cambridge yang berhak cipta. Yang boleh dipakai hanya *learning objectives* dari framework publiknya. Semua konten dibuat sendiri.

## 3. Batasan

- **Platform:** Progressive Web App (PWA). Satu kode untuk Chrome/Edge di Windows, Chrome di Android, dan Safari di iPad/iPhone.
- **Offline:** pertama kali dibuka harus online untuk install. Setelah itu seluruh aset (JS, CSS, font, suara, gambar) di-cache oleh service worker. **Tidak boleh ada request ke CDN saat runtime.**
- **Update:** ketika ada versi baru di hosting, perangkat mengambilnya sendiri saat online. Paling lambat versi baru aktif pada pembukaan berikutnya.
- **Input:** sentuh dan mouse. Target sentuh besar (minimal sekitar 48px), drag ramah jari (lihat hit-area lebar di app jam).
- **Layar:** dari HP potret (sekitar 360px) sampai laptop. Tablet landscape adalah perangkat utama yang paling nyaman.
- **Suara bacaan:** pakai Web Speech API (`speechSynthesis`) dengan suara bawaan perangkat, sehingga offline tetap jalan di Windows, Android, dan iOS. Kualitas suara berbeda per perangkat, dan ini bisa diterima. Pilih suara `en-*` yang lokal (`localService === true`) bila tersedia.
- **Hosting:** statis dan gratis (GitHub Pages atau Cloudflare Pages).
- **Hak cipta:** lihat anti-sasaran.

## 4. Pendekatan yang dipertimbangkan

| | Pendekatan | Trade-off | Keputusan |
|---|---|---|---|
| **A** | **PWA** (web app yang bisa di-install, di-host statis) | Satu kode untuk semua perangkat, update otomatis, app jam bisa dipakai ulang. Kekurangan: iOS bisa membersihkan cache kalau app lama tidak dibuka, cukup buka sekali saat online. | **Dipilih Bimo** |
| B | Dibungkus Capacitor/Electron jadi app native | Penyimpanan lebih tahan lama, tapi ada tiga build yang harus diurus, iOS butuh akun Apple Developer $99/tahun, dan update harus install ulang. Bertentangan dengan keinginan update online. | Ditolak |
| C | Game engine (Godot/Unity) | Animasi lebih kaya, tapi jauh lebih lambat untuk mengisi 10 mapel yang sebagian besar berbasis UI, unduhan besar, dan app jam tidak bisa dipakai ulang. | Ditolak |
| — | Satu file HTML yang di-copy ke tiap perangkat | Paling sederhana, tapi tidak ada update otomatis. | Dicoret |

Pilihan progress (diputuskan Bimo): **tidak disimpan**. Opsi "simpan di perangkat + backup file" dan "sinkron cloud" sudah dibahas dan tidak dipakai.

## 5. Yang sudah diputuskan (oleh Bimo)

1. Dua profil, **Adik (Stage 1)** dan **Kakak (Stage 3)**. Profil menentukan **kelas default** dan **mode default** (Adik → Explore, Kakak → Challenge). Keduanya tetap bisa pindah mode dan membuka materi kelas lain.
2. Bahasa konten: **Inggris**, semua bisa dibacakan.
   - Profil Adik: instruksi dan soal **otomatis dibacakan** saat muncul, dan kata yang sedang dibaca di-highlight.
   - Profil Kakak: suara hanya keluar kalau tombol 🔊 ditekan.
   - Navigasi pakai ikon besar dan seminimal mungkin tulisan.
3. **Mapel (10)**, dipetakan ke Cambridge Primary:

   | Permintaan Bimo | Mapel di app (Cambridge) |
   |---|---|
   | Math | Mathematics |
   | Science | Science |
   | English | English |
   | Civic, Ethic, Social | Global Perspectives |
   | Life skills | Wellbeing |
   | Design/Art | Art & Design |
   | Music | Music |
   | Computer technology | Computing / Digital Literacy |

   Ketiga permintaan Civic, Ethic, dan Social digabung menjadi satu mapel, Global Perspectives. Jadi ada **8 kartu mapel** di menu yang mencakup 10 permintaan Bimo. *(Ini usulanku. Lihat bagian 7.)*
4. **Dibangun sekali.** Update dilakukan online lewat hosting, bukan lewat penambahan konten rutin.
5. **Hasil ronde:** jumlah benar dan salah, plus review setiap soal yang salah: jawaban anak, *kenapa* salah, *bagaimana* cara benarnya, tombol **▶ Show me** (mainan memperagakan jawaban yang benar), dan tombol **🔁 Retry mistakes**.
6. **Bimo perlu panduan langkah demi langkah** untuk hosting dan install di tiap perangkat. Panduan ini termasuk hasil akhir.

## 6. Desain

### 6.1 Alur layar

```
[Pilih profil]  👧 Adik   👦 Kakak
      ↓
[Peta mapel]  8 kartu besar berikon  (+ toggle kelas: Stage 1 / Stage 3)
      ↓
[Daftar mainan per mapel]  kartu bergambar, judul singkat, tombol 🔊
      ↓
[Mainan]  ┌ Explore: main bebas + read aloud
          └ Challenge: ronde 10 soal → umpan balik langsung + petunjuk → Layar hasil
```

Tombol "Home" dan "Ganti profil" selalu terlihat. Profil yang terakhir dipilih **boleh** diingat di `localStorage` (ini preferensi, bukan progress) supaya anak tidak perlu memilih ulang setiap kali.

### 6.2 Kontrak "mainan" (toy module)

Setiap mainan adalah modul mandiri yang dirender di dalam shell yang sama. Shell menyediakan: header, pemilih mode, mesin ronde, layar hasil, read aloud, suara efek, dan confetti. Mainan menyediakan:

- `meta`: id, mapel, stage (1, 3, atau keduanya), judul, ikon, learning objective Cambridge yang dirujuk.
- `explore(container, api)`: tampilan main bebas.
- `challenge`: generator soal (acak, dengan level sesuai stage), render soal, ambil jawaban anak, `check(answer)` → `{correct, hint}`.
- `explain(question, answer)` → `{why, how}`, berupa teks pendek yang dibacakan.
- `demonstrate(question)`: animasi jawaban yang benar (opsional, tapi diusahakan ada di setiap mainan Math/Science).

Mesin ronde (milik shell): 10 soal per ronde. Jawaban salah memberi petunjuk dan boleh dicoba lagi sekali. Yang dicatat untuk layar hasil adalah **jawaban pertama**. Tombol "Retry mistakes" membuat ronde baru dari soal yang salah saja. Semua state hanya di memori.

### 6.3 Mainan v1 (usulan, harus dicocokkan ke learning objectives Cambridge)

Math, English, dan Science: masing-masing 3–4 mainan untuk Stage 1 dan 3–4 untuk Stage 3. Tujuh mapel lain: masing-masing 1 mainan dulu, berlaku untuk kedua stage dengan tingkat kesulitan berbeda.

| Mapel | Stage 1 (Adik) | Stage 3 (Kakak) |
|---|---|---|
| Math | Hitung benda sampai 20 · Tambah/kurang dengan number line · Bentuk 2D/3D · Jam: o'clock & half past | **Tick-Tock Time** (port dari prototipe: past/to, 5 menit) · Tabel perkalian (array/grup) · Pecahan (potong pizza/coklat) · Nilai tempat sampai 1000 (balok) |
| English | Phonics: bunyi huruf → seret huruf jadi kata CVC · Sight words · Kalimat: huruf kapital & titik | Kelas kata (noun/verb/adjective sorter) · Past tense · Spelling (prefix/suffix) · Baca cerita pendek + pertanyaan |
| Science | Bagian tubuh & panca indra · Hidup/tidak hidup · Material (sortir) · Push & pull | Tanaman: bagian & kebutuhan (siram, cahaya → tumbuh) · Magnet · Cahaya & bayangan · Kerangka tubuh |
| Global Perspectives | Kartu situasi: memilih tindakan baik (berbagi, antre, menjaga lingkungan) | (sama, skenario lebih kompleks) |
| Wellbeing | Mengenali perasaan (wajah → nama emosi) | Kebiasaan sehat / makanan seimbang |
| Art & Design | Mencampur warna | Pola & simetri |
| Music | Tinggi-rendah & keras-pelan (Explore: piano mainan) | Pola ritme |
| Computing | Urutan instruksi: gerakkan robot ke tujuan | Algoritma dengan loop: robot di grid |

Total sekitar **31 mainan**. Ini pekerjaan konten terbesar.

### 6.4 Gaya visual dan suara

- Mengikuti app jam: latar krem bertitik, kartu "toy" yang membulat, tombol 3D yang tertekan saat ditekan, font Fredoka + Nunito, warna coral/ocean/mint/amber/violet. Setiap mapel punya warna sendiri.
- Efek suara disintesis (Web Audio, mirip Tone.js di prototipe): tick, chime saat benar, nada lembut saat salah. Confetti saat benar dan di layar hasil.
- Semua font dan library di-bundle lokal.

### 6.5 Hasil akhir

1. Kode PWA di folder `StudyKids` di komputer Bimo.
2. Versi yang sudah ter-hosting dengan URL.
3. `PANDUAN.md` (Bahasa Indonesia): cara publish/update ke hosting, cara install di laptop Windows, Android, dan iPad/iPhone, cara cek bahwa app jalan offline (mode pesawat), dan apa yang dilakukan kalau iOS membersihkan cache.

## 7. Diserahkan ke builder (dan keputusan yang aku ambil)

Keputusanku (bisa dikoreksi Bimo):
- Civic, Ethic, dan Social digabung ke Global Perspectives. Computing dan Digital Literacy jadi satu kartu.
- Daftar mainan pada 6.3 adalah usulan. Builder memverifikasinya terhadap Cambridge Primary curriculum frameworks (Stage 1 dan 3) dan menyesuaikan.
- Ronde = 10 soal, satu kali percobaan ulang per soal, yang dihitung jawaban pertama.
- Profil terakhir diingat di `localStorage`.
- Stage 1 dan Stage 3 saja di v1. Struktur data mendukung Stage 1–6 supaya bisa ditambah belakangan.
- **Bimo sendiri yang mem-publish dan meng-update**, mengikuti PANDUAN.md. Komputer Bimo pakai Windows. Kode disimpan di repo GitHub, dan GitHub Actions/Cloudflare Pages yang mem-build otomatis setiap kali ada push. Dengan begitu Bimo tidak perlu menginstal Node. Panduan juga mencakup cara membuat akun bila belum punya.
- **Dikirim bertahap:** (1) shell + Tick-Tock Time + mainan Math, (2) English + Science, (3) tujuh mapel lainnya. Setiap tahap bisa langsung dipakai anak-anak. "Dibangun sekali" artinya tidak ada penambahan konten rutin setelah v1 selesai, bukan semuanya dirilis dalam satu kali.

Diserahkan ke builder:
- Tooling (misalnya Vite + vanilla JS/TypeScript, atau framework ringan), cara bundling Tailwind, dan plugin service worker.
- Detail desain setiap mainan selama mengikuti kontrak 6.2 dan pola app jam.
- Urutan pembangunan mainan dan host mana yang dipakai (GitHub Pages atau Cloudflare Pages).
