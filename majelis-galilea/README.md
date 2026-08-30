# MAJELIS GALILEA V8.4

Sistem administrasi Majelis Galilea berbasis Google Apps Script + Google Sheets, dengan viewer-only terpisah untuk Vercel.

## Role internal

- **ADMIN** — seluruh akses, termasuk pengelolaan akun dan role.
- **KEUANGAN** — membaca halaman terkait dan mengelola Keuangan/RAPBJ, termasuk rekonsiliasi, verifikasi dan closing.
- **PENGURUS** — administrasi rapat, jemaat, pengurus, inventaris, dokumen, surat sekretaris, program dan arsip; tidak dapat mengubah Keuangan/RAPBJ.
- **MAJELIS** — membaca rapat/keputusan/program/dokumen serta dapat menambah Usulan dan Tindak Lanjut.

Login internal menggunakan **username + PIN**. PIN disimpan dalam bentuk hash SHA-256 + salt, session disimpan di CacheService, dan permission write/delete serta endpoint sensitif diperiksa kembali di backend.

## Setup Apps Script

Runtime Apps Script tetap hanya dua file: `Code.gs` dan `index.html`.

1. Pasang V8.4 ke Apps Script.
2. Jalankan `setupDatabase()`.
3. Sheet `AKSES_ROLE` akan dibuat otomatis.
4. Jika belum ada user, sistem membuat akun awal `admin` dengan PIN acak 6 digit.
5. PIN awal tampil pada **Execution Log** saat setup.
6. Login sebagai admin dan buka **Akses & Role** untuk membuat akun Keuangan, Pengurus, atau Anggota Majelis.

## Viewer-only

Source viewer ada di `viewer/index.html`. Viewer bersifat benar-benar read-only dan hanya memuat data publik yang sudah disaring oleh backend:

- Notulen berstatus Disetujui/Final
- Keputusan yang terkait notulen publik
- Program kerja
- Dokumen aktif

Viewer tidak memuat daftar anggota, alamat/telepon anggota, akun/PIN, maupun transaksi keuangan detail.

Saat pertama dibuka, masukkan URL deployment Apps Script yang berakhiran `/exec`. URL disimpan di browser.

## Vercel

Untuk Git-based deploy gunakan **Root Directory**: `majelis-galilea/viewer`.
