# TODO Foremoz

## High Priority
- [ ] Passport public page `/p/:account` belum full real data passport.
  - Masih pakai placeholder untuk identity (verified, followers, city, stats seed-based).
  - Perlu resolve `account -> tenant/passport` lalu ambil profile dari API Passport.
- [ ] Simpan konfigurasi public visibility ke backend.
  - Saat ini `allow publish public` dan checklist section masih di `localStorage`.
  - Perlu endpoint read/write visibility per passport/account.
- [x] Check-in event sudah persist ke backend.
  - Endpoint: `POST /v1/admin/events/:eventId/participants/checkin`
  - Read status check-in sudah masuk di `GET /v1/admin/events/:eventId/participants` (`checked_in_at`).

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

## Product Scope Backlog

### Web
- [ ] Landing page
  - [x] what/who
  - [~] why
    - Remark: sudah ada narasi value, tapi belum konsisten di semua section.
  - [~] how
    - Remark: alur sudah ada, masih perlu penyederhanaan messaging.
  - [x] cta

### Industries
- [ ] Landing
  - [x] what/who
  - [~] why
    - Remark: sudah ada highlight per vertical, belum tajam per persona.
  - [~] how
    - Remark: alur ada, tapi belum seragam untuk semua industry page.
  - [x] cta
- [~] Pricing
  - Remark: paket utama sudah ada (Free/Starter/Growth/Multi Branch/Enterprise), masih perlu finalisasi presentasi per industry.

### Events
- [x] Browse: card (ecommerce-like)
- [~] Detail -> passport access -> payment
  - Remark: flow register -> signin/signup -> payment sudah ada; enrichment detail event masih bisa diperdalam.

### Passport
- [x] Signup -> signin -> registration
- [~] Dashboard
  - Remark: dashboard sudah jalan + tab upcoming/history, beberapa data masih campuran API + local storage.
- [~] Public
  - [~] Profile
    - Remark: struktur sudah ada, sebagian identity/stat masih placeholder.
  - [x] Events
  - [~] Achievement
    - Remark: achievement tampil dasar; scoring/ranking baru mulai dari checkout event.
  - [x] Signin

### Owner
- [x] Signup -> signin -> onboarding -> dashboard

### Tenant
- [~] Landing
  - [x] what/who
  - [~] why
    - Remark: value proposition ada, masih perlu pemisahan bahasa per segmen tenant.
  - [~] how
    - Remark: flow ada, belum dirapikan end-to-end untuk semua role.
  - [x] cta
  - [x] events browse: card (ecommerce-like)
  - [x] member signup -> signin
  - [x] tenant signin
- [~] Public: event detail -> see events
  - [x] registration -> member signup -> signin
  - [x] share
  - Remark: detail event sudah ada image/description/schedule; masih bisa ditambah konten media.
- [~] Setup
  - [x] Event (one time)
    - [x] general fields
    - [~] custom fields
      - [x] registration
      - [x] checkin/out
      - [~] session/final score fields
        - Remark: final score via checkout+rank sudah ada, belum ada builder field terpisah untuk session.
  - [~] Class (multiple time)
    - [x] general fields
    - [ ] custom fields
      - [ ] registration
      - [ ] checkin/out
      - [ ] session/final score fields
    - [~] schedule
      - Remark: schedule dasar ada, belum advanced recurrence/session management.
  - [~] Product
    - [x] general
    - [~] custom fields
      - [x] product
      - [ ] cart
    - [x] stock
  - [~] Package
    - [x] general
    - [~] components
      - Remark: komponen ada di struktur dasar, belum lengkap untuk skenario kompleks.
- [~] CS
  - Remark: dashboard CS sudah ada; scope fitur CS spesifik masih perlu difinalkan.
