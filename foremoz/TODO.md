# TODO Foremoz

## High Priority
- [ ] Passport public page `/p/:account` belum full real data passport.
  - Masih pakai placeholder untuk identity (verified, followers, city, stats seed-based).
  - Perlu resolve `account -> tenant/passport` lalu ambil profile dari API Passport.
- [ ] Simpan konfigurasi public visibility ke backend.
  - Saat ini `allow publish public` dan checklist section masih di `localStorage`.
  - Perlu endpoint read/write visibility per passport/account.
- [ ] Check-in event belum persist ke backend.
  - Status check-in di tab `Check in` masih local (`eventCheckinMap`).
  - Perlu endpoint check-in per participant + read status check-in.

## Event & Participant
- [ ] Unique number participant belum jadi field resmi di backend.
  - Saat ini fallback code digenerate di frontend jika `registration_id` kosong.
  - Perlu standar nomor unik server-side saat registrasi participant.
- [ ] Barcode scanner masih berbasis text input (keyboard wedge).
  - Belum ada integrasi kamera (WebRTC / QR scanner) untuk scan langsung.
- [ ] Tambah export participant/check-in (CSV/XLSX) dari tab Participants/Check in.

## Passport Dashboard
- [ ] Hubungkan profile editor (nama display, status, avatar) ke API Passport.
  - Saat ini status/avatar disimpan localStorage.
- [ ] Tambah pengaturan publikasi per-section untuk data lain (bukan hanya toggle tampil).
  - Contoh: urutan section, pin section tertentu, preview mode private/public.

## Public Passport Page
- [ ] Data `Roles/Capabilities` dan `Programs/Products` masih derived sederhana dari events.
  - Perlu read model khusus capability/program yang lebih akurat.
- [ ] Tambah page khusus `passport.foremoz.com` style + SEO metadata (title/description per profile).
- [ ] Tambah CTA real: follow, contact, request event (saat ini dummy action).

## Admin Dashboard
- [ ] Event Edit tabs sudah dipisah, tapi perlu validasi UX lanjut:
  - Disable submit saat bukan tab `General` (sudah), namun perlu warning unsaved changes saat pindah tab.
  - Tambah empty-state/guide untuk tab `Check in` dan `Participants` ketika event baru belum dipublish.
- [ ] Field `trainer_name` token input class sudah jalan.
  - Perlu opsi multi-trainer sebagai struktur data resmi (array) di backend class.

## QA / Hardening
- [ ] Tambah test otomatis untuk flow penting:
  - Event CRUD + publish + public listing
  - Register event + participant count + check-in
  - Passport visibility toggle mempengaruhi `/p/:account`
- [ ] Tambah error boundary/loading skeleton di halaman `/events/register`, `/passport/dashboard`, `/p/:account`.
- [ ] Audit konsistensi timezone untuk jadwal event (WIB/local vs UTC) di semua page.
