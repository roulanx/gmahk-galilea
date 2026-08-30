# MAJELIS GALILEA V8.4

Sistem administrasi Majelis Galilea dengan Google Apps Script + Google Sheets.

## Runtime Apps Script
Tetap 2 file:
- `Code.gs`
- `index.html`

## Role
- `ADMIN` — akses penuh + pengelolaan akun
- `KEUANGAN` — Keuangan & RAPBJ
- `PENGURUS` — administrasi rapat, jemaat, pengurus, inventaris, dokumen, surat
- `MAJELIS` — melihat rapat/keputusan/program dan menulis usulan/tindak lanjut

Login menggunakan username + PIN. PIN disimpan sebagai hash SHA-256 + salt dan session menggunakan CacheService.

## Setup pertama
1. Pasang `Code.gs` dan `index.html` V8.4 di Apps Script.
2. Jalankan `setupDatabase()`.
3. Jika `AKSES_ROLE` masih kosong, sistem membuat akun `admin` dengan PIN acak 6 digit.
4. PIN awal tampil di Execution Log `setupDatabase()`.
5. Login dan buat user lain lewat menu **Akses & Role**.

## Viewer-only Vercel
Folder `viewer/` adalah aplikasi read-only. Viewer hanya menerima notulen yang sudah disetujui, keputusan, program, dan dokumen aktif. Data anggota, nomor telepon, alamat, PIN, dan transaksi keuangan detail tidak dikirim ke viewer.

Saat pertama membuka viewer, masukkan URL deployment Apps Script yang berakhiran `/exec`. Viewer menggunakan endpoint JSONP `?api=viewer` agar dapat dibaca dari Vercel tanpa memberikan akses tulis.