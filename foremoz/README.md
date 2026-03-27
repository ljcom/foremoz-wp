# Foremoz Core Workspace

`foremoz/` adalah core workspace implementasi produk Foremoz. Saat ini implementasi yang paling lengkap di folder ini masih berfokus pada vertical `fitness`, tetapi struktur workspace-nya diposisikan sebagai fondasi untuk surface core, operasional tenant, passport, dan pengembangan vertical lanjutan.

## Ruang Lingkup

- Public web dan industry landing
- Tenant auth + dashboard per role
- Event lifecycle: create, publish, register, check-in, check-out
- Payment dan operasi lanjutan: subscription, class booking, PT package
- Passport flow: signup, onboarding, dashboard, public profile
- Branch management owner

Dokumen operasional terkait:

- backlog implementasi: `TODO.md`
- checklist UAT: `UAT.md`
- API detail: `apps/api/README.md`

## Struktur Workspace

```text
foremoz/
├── apps/api                  # Express API + projection runner + read-model endpoints
├── apps/eventdb-custom-json  # manifest projection + definisi/schema read model fitness
├── apps/vite                 # React/Vite frontend
├── README.md
├── TODO.md
└── UAT.md
```

## Domain dan Surface Utama

- runtime vertical: `fitness.foremoz.com`
- event hub: `foremoz.com/events`
- passport surface: `passport.foremoz.com`

Route penting yang saat ini dipakai:

- public browse: `/events`, `/passport`, `/p/:account`, `/e/:eventId`
- tenant public: `/a/:account`, `/a/:account/events`
- tenant auth: `/a/:account/signin`, `/a/:account/member/signin`, `/a/:account/member/signup`
- tenant dashboard:
  - `/a/:account/admin/dashboard`
  - `/a/:account/cs/dashboard`
  - `/a/:account/sales/dashboard`
  - `/a/:account/pt/dashboard`
  - `/a/:account/member/portal`
- passport auth/dashboard:
  - `/passport/signup`
  - `/passport/signin`
  - `/passport/onboarding`
  - `/passport/dashboard`

## Canonical RBAC

- `owner`
- `admin`
- `sales`
- `cs`
- `pt`
- `member`
- `gov`

Catatan: `gov` adalah role governance dan bukan bagian dari public surface utama vertical fitness.

## Arsitektur Singkat

- `apps/vite` adalah frontend React/Vite yang menangani public web, dashboard tenant, dan passport UI.
- `apps/api` adalah Express API untuk auth, event operations, payment, branch, passport, dan query read model.
- `apps/eventdb-custom-json` berisi manifest projection dan schema `read.rm_*` yang dipakai query operasional.
- Workspace ini mengandalkan sibling project `../eventdb` sebagai write layer / event store runtime.

## Whitepaper dan Artefak Read Model

Implementasi aktif saat ini mengikuti whitepaper Active di `paper/industries/active`.

Artefak yang dipakai:

- projection manifest: `apps/eventdb-custom-json/fitness-projection.manifest.json`
- read model definition: `apps/eventdb-custom-json/fitness-read-model.definition.json`
- read model schema: `apps/eventdb-custom-json/fitness-read-model.postgres.sql`

Pricing direction yang dipakai:

- free tier wajib tersedia
- progression tier: `free -> starter -> growth -> multi-branch -> enterprise`

## Menjalankan Workspace

Prasyarat lokal:

- Node.js + npm
- PostgreSQL/EventDB environment yang cocok dengan `DATABASE_URL`
- sibling folder `../eventdb` tersedia

Install dependency:

```bash
cd foremoz
npm install
npm --prefix ./apps/api install
npm --prefix ./apps/vite install
```

Siapkan backend read model:

```bash
cd foremoz
npm run setup:core
```

Script utama:

- `npm run setup:core`
  Menyiapkan schema EventDB dan read model core workspace.
- `npm run mockup`
  Menjalankan frontend mock-only dengan akses terbuka.
- `npm run web`
  Menjalankan frontend Vite untuk mode full app.
- `npm run backend:eventdb`
  Menyalakan service EventDB dari sibling workspace `../eventdb`.
- `npm run backend:api`
  Menyalakan Express API di `apps/api`.
- `npm run full`
  Menjalankan EventDB, API, dan frontend sekaligus.

Catatan:

- Script root saat ini default ke `DATABASE_URL=postgresql://postgres:ljcom2x@localhost:15432/eventdb_foremoz`.
- Bila environment lokal berbeda, override `DATABASE_URL` sebelum menjalankan script.
- Detail env API seperti JWT, email, S3, dan Turnstile dijelaskan di `apps/api/README.md`.

## Fokus QA dan Operasional

Checklist UAT sudah disiapkan di `UAT.md` dan saat ini memetakan flow inti berikut:

- owner onboarding dan branch management
- event publish, register, participant number, check-in/check-out
- payment record, confirm, reject
- class booking dan PT workflow
- passport signup, onboarding, dashboard, public visibility
- multi-account scope dan error handling halaman kritis

## Status dan Backlog

Backlog aktif ada di `TODO.md`. Dokumen itu adalah source of truth untuk:

- progress snapshot per area
- item yang sudah selesai / sebagian selesai
- backlog QA/hardening
- backlog whitepaper sync untuk experience network

Kalau mau mulai dari pekerjaan produk yang paling relevan, cek `TODO.md` lebih dulu sebelum mengubah flow atau schema.
