# Foremoz UAT (User Acceptance Test)

Dokumen ini dipakai sebagai checklist UAT untuk vertical `fitness` pada workspace `foremoz`.

## 1. Tujuan

Memastikan flow utama berjalan end-to-end sesuai kebutuhan operasional:
- akuisisi tenant (owner)
- operasional admin/cs (event, participant, payment, class booking)
- pengalaman member/passport (signup, signin, onboarding, dashboard, public page)
- kontrol akses berbasis role dan account scope

## 2. Ruang Lingkup

In scope:
- Web landing + tenant public page
- Tenant auth dan dashboard per role (`owner/admin/cs/sales/pt/member`)
- Event lifecycle (create -> publish -> register -> check-in -> checkout)
- Payment lifecycle (record -> confirm/reject)
- Member portal + booking/class/riwayat transaksi
- Passport flow (`/passport` + `/p/:account`)
- Branch management owner

Out of scope (untuk UAT fase berikutnya):
- follow system/social graph penuh
- kamera barcode scanner native (saat ini keyboard wedge/input)
- domain terpisah production `passport.foremoz.com`

## 3. Environment UAT

- Frontend: `foremoz/apps/vite`
- API: `foremoz/apps/api`
- Read model & projection aktif
- Database menggunakan skema terbaru `apps/eventdb-custom-json/fitness-read-model.postgres.sql`

Akun uji minimum:
- 1 owner
- 1 admin
- 1 cs
- 1 sales
- 1 pt
- 2 member

Contoh account uji:
- account slug: `tn_001`

## 4. Definisi Status

- `PASS`: sesuai acceptance criteria
- `FAIL`: tidak sesuai acceptance criteria
- `BLOCKED`: tidak bisa diuji (dependency/environment issue)
- `N/A`: tidak relevan untuk build ini

## 5. Rute Kritis yang Harus Diuji

- Public web: `/web`, `/active`, `/learning`, `/tourism`, `/performance`
- Passport public: `/events`, `/passport`, `/p/:account`, `/e/:eventId`
- Tenant public/account: `/a/:account`, `/a/:account/events`
- Auth tenant/member: `/a/:account/signin`, `/a/:account/member/signup`, `/a/:account/member/signin`
- Dashboard role:
  - `/a/:account/admin/dashboard`
  - `/a/:account/cs/dashboard`
  - `/a/:account/sales/dashboard`
  - `/a/:account/pt/dashboard`
  - `/a/:account/member/portal`
- Passport auth/dashboard:
  - `/passport/signup`
  - `/passport/signin`
  - `/passport/onboarding`
  - `/passport/dashboard`

## 6. Test Matrix UAT

Isi kolom `Actual`, `Status`, dan `Evidence` saat eksekusi.

| ID | Area | Skenario Uji | Expected Result | Actual | Status | Evidence |
|---|---|---|---|---|---|---|
| UAT-001 | Public Web | Buka `/web` dan cek CTA utama | Halaman tampil normal, CTA menuju flow signup/signin yang benar |  |  |  |
| UAT-002 | Account Public | Buka `/a/tn_001` | Profil account tampil, identitas branch/account sesuai data backend |  |  |  |
| UAT-003 | Account Events | Buka `/a/tn_001/events` | Event list scoped ke account `tn_001`, tombol sign in menuju `/a/tn_001/member/signin` |  |  |  |
| UAT-004 | Tenant Auth | Sign in owner/admin via `/a/tn_001/signin` | Login sukses, redirect ke dashboard sesuai role |  |  |  |
| UAT-005 | Role Guard | Akses URL dashboard role lain secara langsung | User di-redirect ke home role yang diizinkan |  |  |  |
| UAT-006 | Owner Setup | Owner lengkapi onboarding (`/web/owner`) | Data setup tersimpan, owner bisa lanjut operasional |  |  |  |
| UAT-007 | Branch Mgmt | Owner tambah/edit/deactivate/reactivate branch | Semua aksi persist ke backend dan tercermin di UI |  |  |  |
| UAT-008 | Admin Event Create | Admin create event baru | Event tersimpan dengan data valid (nama, jadwal, lokasi, dsb) |  |  |  |
| UAT-009 | Admin Event Publish | Publikasikan event dari draft | Status event berubah ke `published/posted`, muncul di listing publik |  |  |  |
| UAT-010 | Event Register | Member daftar event via checkout (`/e/:eventId` atau `/events/register`) | Registrasi sukses setelah payment tervalidasi, participant terbentuk |  |  |  |
| UAT-011 | Participant No | Cek participant number setelah registrasi | `participant_no` terisi dan dipakai pada flow check-in |  |  |  |
| UAT-012 | Check-in Event | Check-in participant dari admin/cs | Check-in sukses, idempotent (duplikat tidak menambah event baru) |  |  |  |
| UAT-013 | Check-out Event | Check-out participant yang sudah check-in | Check-out sukses, guard state valid |  |  |  |
| UAT-014 | Class Booking | Buat booking class untuk member | Booking sukses jika kapasitas tersedia dan tidak duplicate |  |  |  |
| UAT-015 | Class Guard | Uji kondisi class full & duplicate booking | API/UI menampilkan error guard yang tepat (`CLASS_FULL`, `CLASS_ALREADY_BOOKED`) |  |  |  |
| UAT-016 | Payment Record | Record payment manual/admin | Payment masuk status `pending` dan tampil di transaction tab |  |  |  |
| UAT-017 | Payment Confirm | Confirm payment pending | Status jadi `confirmed`, relasi operasi (`subscription/booking/pt_package`) terbaca |  |  |  |
| UAT-018 | Payment Reject | Reject payment pending | Status jadi `rejected` dengan reason tercatat |  |  |  |
| UAT-019 | Sales Prospect | Sales tambah prospect lalu follow up | Prospect dan timeline follow-up tersimpan |  |  |  |
| UAT-020 | Sales Convert | Convert prospect ke member/tenant flow | Data convert tercatat dan status prospect berubah benar |  |  |  |
| UAT-021 | PT Package | Assign PT package lalu booking session | Sisa sesi berkurang sesuai booking/complete |  |  |  |
| UAT-022 | Member Portal | Buka `/a/tn_001/member/portal` setelah login member | Ringkasan membership, booking, payment tampil sesuai data read model |  |  |  |
| UAT-023 | Passport Signup | Signup di `/passport/signup` | Akun passport berhasil dibuat |  |  |  |
| UAT-024 | Passport Onboarding | Selesaikan onboarding `/passport/onboarding` | Redirect ke `/passport/dashboard` dan state onboarded tersimpan |  |  |  |
| UAT-025 | Passport Dashboard | Cek tab dashboard + visibility toggle | Data utama load dari backend, perubahan visibility tersimpan |  |  |  |
| UAT-026 | Passport Public | Buka `/p/:account` setelah ubah visibility | Public page mengikuti setting visibility backend |  |  |  |
| UAT-027 | Legacy Redirect | Akses route legacy (`/a/:account/admin`, `/a/:account/dashboard`) | Redirect ke route canonical tanpa error |  |  |  |
| UAT-028 | Session Expired | Gunakan token expired/invalid | User diarahkan ke signin dan tidak bisa akses protected route |  |  |  |
| UAT-029 | Multi Account Scope | Login account A lalu akses account B via URL | Data lintas account tidak bocor, redirect/forbidden sesuai policy |  |  |  |
| UAT-030 | Error Handling | Simulasikan API error di halaman kritis | UI menampilkan pesan error yang bisa dipahami (tidak blank/hang) |  |  |  |
| UAT-031 | Owner Package Flow | Owner pilih/ganti paket dari onboarding atau owner panel | Paket tersimpan benar dan gating fitur mengikuti paket aktif |  |  |  |
| UAT-032 | Branch Resource Toggle | Owner on/off resource per branch | Resource branch berubah sesuai toggle dan scope branch tetap benar |  |  |  |
| UAT-033 | Member Pre-Event Info | Member selesai join event lalu buka dashboard/portal | Info pra-event tampil lengkap: jadwal, lokasi, status payment, instruksi |  |  |  |
| UAT-034 | Member Program Lifecycle | Member booking program, cancel, lalu cek progress/performa | Booking/cancel mengikuti policy dan progress member ter-update |  |  |  |
| UAT-035 | CS Daily Report | Staff CS buat order/payment lalu buka daily report | Daily report memuat transaksi dan aktivitas operasional hari itu |  |  |  |
| UAT-036 | PT Incentive & Award | PT complete session, score member, lalu buka report | Incentive PT dan report award tampil sesuai aktivitas |  |  |  |
| UAT-037 | Sales Order & Incentive | Sales tambah prospect, buat order, lalu buka report incentive | Order tercatat, conversion/linkage benar, incentive sales muncul di report |  |  |  |

## 7. Acceptance Criteria Rilis UAT

Rilis dinyatakan layak jika:
- Semua test case `High` berikut `PASS`:
  - UAT-004, UAT-005, UAT-008 s/d UAT-013, UAT-016 s/d UAT-018, UAT-022, UAT-025, UAT-026, UAT-029
- Tidak ada `FAIL` pada kontrol akses dan data isolation
- Tidak ada defect `Severity 1`
- Defect `Severity 2` memiliki workaround operasional yang disetujui owner produk

## 8. Defect Log Ringkas

| Defect ID | Tanggal | Ditemukan Pada (UAT ID) | Ringkasan Masalah | Severity | PIC | Status |
|---|---|---|---|---|---|---|
| DEF-001 |  |  |  |  |  |  |

Severity reference:
- `S1`: blocker, flow inti tidak bisa jalan
- `S2`: major, flow inti terganggu signifikan
- `S3`: minor, ada workaround
- `S4`: cosmetic

## 9. Sign-off

| Role | Nama | Tanggal | Keputusan |
|---|---|---|---|
| Product Owner |  |  |  |
| QA Lead |  |  |  |
| Engineering Lead |  |  |  |

Keputusan akhir:
- `GO`: lanjut rilis
- `NO GO`: tunda rilis, perbaiki defect mayor
