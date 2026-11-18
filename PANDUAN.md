# Panduan StudyKids untuk Orang Tua

Panduan ini untuk Bimo (Windows), tanpa perlu bisa pemrograman. Ikuti nomor demi nomor, pelan-pelan saja.
Setelah selesai, StudyKids bisa dipasang di laptop, HP, dan iPad anak-anak, dan **tetap jalan tanpa internet**.

## 1. Buat akun GitHub

1. Buka https://github.com lalu klik **Sign up**.
2. Isi email, kata sandi, dan **username**. Ingat username ini, nanti dipakai di alamat aplikasi.
3. Cek email Anda dan klik tautan verifikasi dari GitHub.

## 2. Pasang GitHub Desktop

1. Buka https://desktop.github.com lalu klik **Download for Windows**.
2. Jalankan file yang diunduh sampai selesai, lalu buka GitHub Desktop.
3. Klik **Sign in to GitHub.com** dan masuk dengan akun tadi.

## 3. Masukkan folder StudyKids dan publikasikan

1. Di GitHub Desktop: **File → Add local repository...**
2. Pilih folder `C:\Users\PC\Documents\StudyKids`, lalu klik **Add repository**.
3. Jika muncul tulisan "this directory does not appear to be a Git repository", klik **create a repository** lalu **Create repository**.
4. Klik tombol **Publish repository** di bagian atas.
5. Isi nama **studykids** (huruf kecil semua). **Hilangkan centang "Keep this code private"**, karena repositori harus *public*. Lalu klik **Publish repository**.

## 4. Nyalakan GitHub Pages

1. Buka `https://github.com/<username>/studykids` di browser.
2. Klik **Settings** → **Pages** (menu di sebelah kiri).
3. Pada **Source**, pilih **GitHub Actions**.
4. Klik tab **Actions** dan tunggu sampai ada **tanda centang hijau** (sekitar 1 sampai 3 menit).
   **Penting:** proses Actions yang pertama (yang jalan otomatis saat Anda menekan Publish di langkah 3) hampir pasti gagal dengan **tanda silang merah**, karena saat itu Pages belum menyala. Ini normal, bukan salah Anda. Setelah Source diubah ke GitHub Actions, buka proses yang merah itu lalu klik **Re-run all jobs**. Tunggu sampai bertanda centang hijau. Commit baru berikutnya juga akan otomatis berhasil dipublikasikan.

## 5. Cari alamat aplikasi

Alamat StudyKids adalah:

```
https://<username>.github.io/studykids/
```

Ganti `<username>` dengan username GitHub Anda, huruf kecil. Contoh: jika username Anda `bimo`, alamatnya `https://bimo.github.io/studykids/`.
Buka alamat itu di browser untuk mencobanya.

## 6. Pasang aplikasi di perangkat

Buka alamat aplikasi **dengan internet menyala**, lalu:

- **Windows (Chrome atau Edge):** klik ikon **Pasang / Install** di sebelah kanan kolom alamat, lalu klik **Install**.
- **Android (Chrome):** ketuk **⋮ (tiga titik)** → **Install app** (atau **Add to Home screen**).
- **iPad / iPhone (Safari):** ketuk tombol **Bagikan (Share)** → **Add to Home Screen** → **Add**. Harus memakai Safari, bukan Chrome.

Ikon StudyKids akan muncul seperti aplikasi biasa.

## 7. Cek bisa dipakai tanpa internet

1. Buka aplikasi sekali saat **internet menyala**, tunggu sampai halaman pilihan Adik/Kakak muncul.
2. Tutup aplikasi, lalu nyalakan **mode pesawat** (airplane mode).
3. Buka aplikasi lagi dari ikonnya. Jika Adik dan Kakak muncul dan permainan bisa dibuka, semuanya sudah siap.

Pembukaan pertama **harus online**, supaya aplikasi bisa menyimpan dirinya di perangkat.

## 8. Cara memperbarui aplikasi

1. Buka GitHub Desktop. Perubahan akan terlihat di daftar kiri.
2. Tulis catatan singkat di kotak **Summary**, lalu klik **Commit to main**.
3. Klik **Push origin**.
4. Buka `https://github.com/<username>/studykids` → tab **Actions**. Tunggu sampai muncul **tanda centang hijau**.
5. Di perangkat anak, nyalakan internet, lalu buka aplikasi. Versi baru diunduh di belakang layar.
6. **Tutup aplikasi sepenuhnya, lalu buka lagi** (lakukan 2 kali bila perlu). Versi baru aktif pada pembukaan berikutnya, tidak pernah di tengah permainan anak.

## 9. Kalau iPad "lupa" aplikasi saat offline

iPad kadang menghapus data aplikasi yang lama tidak dipakai. Cukup buka aplikasi **sekali saat online**, tunggu sampai muncul halaman Adik/Kakak, lalu tutup. Setelah itu bisa offline lagi.

## Jika ada masalah

| Masalah | Penyebab yang mungkin | Cara mengatasi |
|---|---|---|
| Halaman 404 saat membuka alamat | Pages belum aktif atau proses Actions belum selesai | Cek langkah 4. Pastikan Source = GitHub Actions dan Actions sudah bertanda centang hijau. Tunggu beberapa menit. |
| Pages tidak bisa dinyalakan atau diminta upgrade | Repositori masih private | Di GitHub: Settings → paling bawah **Danger Zone** → **Change visibility** → Public. |
| Tanda silang merah di Actions | Proses pembuatan gagal | Buka proses itu, klik **Re-run all jobs**. Jika tetap gagal setelah Pages menyala, kirim tangkapan layar ke orang yang membuat aplikasi. |
| Tidak ada tombol Install di Chrome/Edge | Halaman belum dibuka lengkap, atau sudah terpasang | Muat ulang halaman, tunggu sebentar. Cek juga menu ⋮ → **Cast, save, and share** → **Install page as app**. |
| Aplikasi kosong saat offline | Belum pernah dibuka online sampai selesai | Buka sekali saat online, tutup, lalu coba lagi. Lihat langkah 7 dan 9. |
| Versi lama masih tampil setelah pembaruan | Versi baru aktif di pembukaan berikutnya | Pastikan online, tutup aplikasi sepenuhnya, buka lagi, ulangi sekali lagi. |
| Tidak ada suara bacaan | Suara perangkat belum terpasang atau volume mati | Cek volume dan tombol 🔊 di aplikasi. Suara memakai fitur bawaan perangkat, jadi bisa berbeda di tiap perangkat. |
| Lupa username GitHub | | Klik foto profil di pojok kanan atas github.com. Username tertulis di sana. |
