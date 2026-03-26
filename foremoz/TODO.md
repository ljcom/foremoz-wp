# TODO Foremoz

## Progress Snapshot (Estimated)
- Overall delivery progress: **79%**
- Platform stability & routing: **88%**
- Passport dashboard/public experience: **76%**
- Admin operational workflow: **83%**
- QA automation & hardening: **30%**
- Experience Network whitepaper scope: **36%**

Last audited terhadap isi folder: **2026-03-26** (`foremoz/apps/api`, `foremoz/apps/vite`, `foremoz/apps/eventdb-custom-json`)

## High Priority (90%)
- [~] Passport public page `/p/:account` sudah pakai real data inti.
  - Resolve `account -> tenant/passport` sudah ada via endpoint public passport.
  - Identity/stat utama sudah diambil dari API (profile, events, stats, relations).
  - Sisa: follower/community masih berbasis local state (belum social graph backend).
- [x] Simpan konfigurasi public visibility ke backend.
  - Endpoint read: `GET /v1/passport/public-visibility`
  - Endpoint write: `POST /v1/passport/public-visibility`
  - Dashboard passport dan public page sudah pakai data backend (bukan localStorage).
- [x] Check-in event sudah persist ke backend.
  - Endpoint: `POST /v1/admin/events/:eventId/participants/checkin`
  - Read status check-in sudah masuk di `GET /v1/admin/events/:eventId/participants` (`checked_in_at`).
- [x] Branch management owner sudah terhubung ke backend DB.
  - Endpoint: `GET /v1/owner/branches`
  - Endpoint: `POST /v1/owner/branches`
  - Endpoint: `PATCH /v1/owner/branches/:branchId`
  - Endpoint: `POST /v1/owner/branches/:branchId/deactivate`
  - Endpoint: `POST /v1/owner/branches/:branchId/reactivate`
  - Resolve account publik (`/a/:account`) sudah bisa baca branch slug via `GET /v1/public/account/resolve`.

## Event & Participant (74%)
- [x] Event capacity / max participant sudah ada di flow event.
  - Field `max_participants` sudah tersedia di Event Edit (`0 = unlimited`).
  - Register event guard backend reject `EVENT_FULL` jika kuota terisi penuh.
  - Card event admin sudah menampilkan `Participants: X / N` atau `unlimited`.
- [x] Unique number participant sudah jadi field resmi di backend.
  - Field `participant_no` dibuat server-side saat `event.participant.registered`.
  - Frontend admin scan/check-in menggunakan `participant_no` sebagai prioritas.
- [ ] Barcode scanner masih berbasis text input (keyboard wedge).
  - Belum ada integrasi kamera (WebRTC / QR scanner) untuk scan langsung.
- [~] Tambah export participant/check-in (CSV/XLSX) dari tab Participants/Check in.
  - Remark: export CSV sudah ada di CS dashboard (browse event/class) dan sudah ada di tab Participants Event Edit. Format XLSX masih belum ada.
- [x] Register class backend sudah punya guard operasional.
  - Validasi kapasitas class (`CLASS_FULL`).
  - Validasi anti double booking member per class (`CLASS_ALREADY_BOOKED`).
  - Validasi branch mismatch (`CLASS_BRANCH_MISMATCH`) dan class existence (`CLASS_NOT_FOUND`).
- [~] Operasional booking class diperluas untuk lifecycle.
  - Endpoint cancel booking sudah ada: `POST /v1/bookings/classes/:bookingId/cancel`.
  - Endpoint attendance confirm sudah ada: `POST /v1/bookings/classes/:bookingId/attendance-confirm`.
  - UI CS sudah bisa cancel/confirm attendance; member booking sudah mendukung opsi pembayaran (`payment.recorded` + `payment.confirmed` dengan `reference_type=class_booking`).
  - Guard backend booking via `payment_id` sudah validasi status confirmed + reference class + member identity.
  - Masih perlu standardisasi policy role/permission.
- [x] Check-in/check-out event dibuat idempotent + state guard.
  - Check-in reject participant yang belum register / sudah checkout.
  - Check-in/check-out duplicate return `duplicate: true` (tidak append event baru).
  - Frontend admin/CS sudah menampilkan feedback `checkin.skip` / `checkout.skip`.
  - Member flow lookup participant sudah fallback by `passport_id/member_id` (tidak hanya email).

## Passport Dashboard (66%)
- [~] Hubungkan profile editor (nama display, status, avatar) ke API Passport.
  - Remark: profile inti sudah load dari API Passport; status/avatar masih disimpan localStorage.
- [~] Tambah pengaturan publikasi per-section untuk data lain (bukan hanya toggle tampil).
  - UI dashboard untuk urutan section, pin section, dan preview mode private/public sudah ada.
  - Saat ini preferensi layout masih local browser (belum persist ke backend).

## Public Passport Page (78%)
- [~] Data `Roles/Capabilities` dan `Programs/Products` masih derived sederhana dari events.
  - Perlu read model khusus capability/program yang lebih akurat.
- [~] Tambah page khusus `passport.foremoz.com` style + SEO metadata (title/description per profile).
  - Remark: style public page sudah ada; SEO metadata title/description per profile sekarang sudah diset di frontend. Domain terpisah belum.
- [~] CTA follow/contact/request event.
  - Remark: CTA hero + conversion panel sudah lebih jelas; contact masih mailto/basic flow dan follow masih local state.

## Admin Dashboard (78%)
- [x] Event edit sudah punya aksi publikasi yang lebih jelas.
  - Tombol `Publikasikan Event` + `Turunkan ke Draft` sudah tersedia.
  - Wording publish flow sudah dirapikan (preview/biaya/publish sekarang).
- [~] Event Edit tabs sudah dipisah, tapi perlu validasi UX lanjut:
  - Disable submit saat bukan tab `General` (sudah), warning unsaved changes saat pindah tab/menu utama juga sudah ada.
  - AI Assist sekarang hanya tampil di tab `General`.
  - Empty-state participants + guide publish flow untuk event draft sudah ada; panduan check-in lanjutan masih bisa diperdalam.
- [~] Field `trainer_name` token input class sudah jalan.
  - Perlu opsi multi-trainer sebagai struktur data resmi (array) di backend class.
- [~] Event edit AI/media assist sudah usable, tapi masih bisa diperdalam.
  - [x] Brief textbox inline + `Generate Draft From Brief`.
  - [x] `AI Rewrite Title` sudah dipindah tepat di bawah judul dan copy lebih variatif.
  - [x] Suggestion `Custom fields` sudah baca context `Event Name + Description`.
  - [x] Upload cover image sendiri sudah simpan ke S3 via backend upload endpoint.
  - [x] `AI Fill Gallery` pakai Pexels dengan fallback multi-keyword.
  - [ ] Perlu peningkatan lagi untuk parsing brief kompleks (tanggal/jam/topik/lokasi) agar hasil draft lebih presisi.
- [x] API admin core sudah mencakup workflow utama lintas modul.
  - Event/Class CRUD + participant check-in/check-out.
  - Product & Package CRUD.
  - Owner users + owner saas extension + account resolve/public passport.
- [~] Transaction tab payment ops terhubung backend.
  - Record payment sudah pakai `POST /v1/payments/record`.
  - Pending payment bisa `confirm/reject` dari UI.
  - Catatan review (reason/note) sudah tersimpan dan tampil di tabel transaksi.
  - [x] Pemetaan `product/reference` di tabel transaksi sudah baca label entity (event/package/product/class) bila tersedia.
  - [x] Payment sekarang bisa dilacak ke artefak operasional (`subscription/booking/pt_package`) dari read model.
  - [x] Endpoint read operasional sudah bisa difilter dengan `payment_id` untuk audit lanjutan.
  - [x] View transaksi admin menampilkan `linked_operation` terpisah dari label product/reference.
  - [x] Mode view transaksi admin menarik detail artefak operasional langsung via query `payment_id`.
  - [x] Read model menambahkan index `payment_id` untuk query audit operasional.
  - [x] Agregasi backend `GET /v1/read/payments/:paymentId/links` sudah tersedia untuk review transaksi.
  - [x] Filter linked operation (`subscription/booking/pt_package/unlinked`) tersedia di tabel transaksi admin.
  - [x] Review transaksi sudah dipisah ke mode detail read-only, tidak reuse form add transaction.
  - [x] Aksi confirm/reject tetap tersedia langsung dari mode detail transaksi.

## QA / Hardening (28%)
- [ ] Tambah test otomatis untuk flow penting:
  - Event CRUD + publish + public listing
  - Register event + participant count + check-in
  - Passport visibility toggle mempengaruhi `/p/:account`
- [ ] Tambah error boundary/loading skeleton di halaman `/events/register`, `/passport/dashboard`, `/p/:account`.
- [ ] Audit konsistensi timezone untuk jadwal event (WIB/local vs UTC) di semua page.

## Experience Network Backlog (Whitepaper Sync) (36%)

### 2.1 Passport Core System
- [~] Create tables: `passport`, `passport_roles`, `passport_follow`, `passport_activity`, `passport_stats`.
  - Remark: `rm_passport_profile` sudah ada, tapi belum terpisah lengkap sesuai model social graph + stats node.
- [~] Field identity passport lengkap (`handle`, `display_name`, `bio`, `avatar`, `location`, `verification_status`).
  - Remark: sebagian field sudah ada di profile/passport visibility, belum full standard schema.
- [ ] Roles context multi-role formal: `creator`, `participant`, `host`, `sponsor`.

### 2.2 Follow System
- [ ] Buat social graph table `passport_follow`.
- [ ] Support `follow_creator`, `follow_participant`, `follow_host`.
- [ ] Endpoint follow/unfollow + read follower/following.

### 2.3 Activity Feed
- [~] Event-based feed.
  - Remark: feed UI sudah ada (status + event/history mix), backend activity feed terstruktur lintas actor belum final.
- [ ] Standardize activity types:
  - `event_created`
  - `event_joined`
  - `event_attended`
  - `event_completed`
  - `creator_followed`
  - `program_published`
- [ ] Table `activity_feed` formal + query timeline per passport.

### 2.4 Social Media Integration
- [ ] Passport social links: `instagram`, `tiktok`, `youtube`, `facebook`, `website`.
- [ ] Verification mechanism: bio/token/API verification.
- [~] Share tools.
  - Remark: share event dasar sudah ada, share template spesifik IG/WA/TikTok belum lengkap.

### 2.5 Event Promotion Tools
- [ ] Event poster generator.
- [ ] Event QR code generator.
- [ ] Canonical event share link (`/e/<event_slug>`).
- [~] Public profile link.
  - Remark: `/p/:account` sudah ada, domain terpisah `passport.foremoz.com` belum.

### 2.6 Passport Public Page Modules
- [~] Creator modules: identity_header, upcoming_events, programs, community, activity_feed, reputation.
  - Remark: struktur sudah ada, beberapa bagian masih placeholder/derived.
- [~] Member modules: events_attended, achievements, following, activity.
  - Remark: events/achievements sudah ada, following/activity lintas actor belum final.

### 2.7 Creator Discovery
- [ ] Creator search by vertical/location/popularity/activity.
- [ ] Indexes/scoring: `creator_score`, `event_count`, `participant_count`.

### 2.8 Social Event Features
- [ ] Friends attending.
- [ ] Invite friends.
- [ ] Community discussion.

### 2.9 Creator Conversion Tools
- [ ] Bio link page.
- [~] Creator landing page.
  - Remark: `/a/:account` sudah aktif dan section conversion-oriented (`why join`, `how to start`, CTA flow) sudah ditambahkan. Masih bisa diperdalam dengan data real program/coach.
- [ ] Event short link share (`foremoz.com/e/<slug>`).

### 2.10 Passport Reputation System
- [~] Metrics foundation.
  - Remark: hosted/attended/score mulai ada; rating, returning participants, dan community size belum lengkap.
- [ ] Reputation formula dan rank layer lintas vertical.

## Product Scope Backlog (69%)

### Web
- [ ] Landing page
  - [x] what/who
  - [x] why
  - [x] how
  - [x] cta

### Industries
- [ ] Landing
  - [x] what/who
  - [x] why
  - [x] how
  - [x] cta
- [~] Pricing
  - Remark: paket utama sudah ada dan context copy per tier sudah dirapikan; finalisasi presentasi visual per industry masih bisa diperdalam.

### Events
- [x] Browse: card (ecommerce-like)
- [~] Detail -> passport access -> payment
  - Remark: checkout sekarang merekam `payment.recorded` lalu `payment.confirmed` sebelum `event.participant.registered`, dan register menerima verifikasi `payment_id`; enrichment detail event masih bisa diperdalam.
- [~] Event creator assist (AI)
  - [x] Generate draft event copy dari brief singkat (title, description, category, schedule starter).
  - [~] Regenerate per section (judul/deskripsi/rundown) sebelum save.
    - Remark: rewrite title, generate/shorten description, generate/improve rundown sudah ada; kualitas promptless heuristic masih perlu diperdalam.
  - [ ] Simpan metadata draft AI (`generated_by_ai`, `prompt_snapshot`) untuk audit/editability.
  - [~] Image strategy
    - [x] Tahap 1: gunakan stock image gratis (Pexels) untuk isi gallery event.
    - [x] Upload manual image host -> S3 object URL.
    - [ ] Tahap 2: AI generated image sebagai opsi berbayar/quota.
    - Remark: cost-aware default sekarang stock gratis + upload manual dulu, AI image menyusul jika usage sudah justify.

### Passport
- [x] Signup -> signin -> registration
  - Remark: halaman Passport signup/signin/onboarding sekarang sudah lebih jelas secara funnel dan value proposition.
- [~] Dashboard
  - Remark: dashboard sudah jalan + tab upcoming/history; member operational flow sudah bisa transaksi nyata (membership, PT package, class booking payment), termasuk status `subscription_end`, `remaining PT session`, plan aktif, dan `payment_id` terkait dari read model. Aktivasi membership, PT assignment, dan class booking juga sudah bisa menyimpan `payment_id` dengan guard backend, dan relasi itu sekarang ikut diproyeksikan ke read model utama. History payment member sekarang tampil label entity yang lebih terbaca dan status operasional refresh setelah aksi. Beberapa data lain masih campuran API + local storage.
- [~] Public
  - [~] Profile
    - Remark: struktur sudah ada, sebagian identity/stat masih placeholder.
  - [x] Events
  - [~] Achievement
    - Remark: achievement tampil dasar; scoring/ranking baru mulai dari checkout event.
  - [x] Signin

### Owner
- [x] Signup -> signin -> onboarding -> dashboard
- [~] Branch management
  - [x] list branch
  - [x] add branch (gated by package multi-branch/enterprise)
  - [x] edit branch
  - [x] data branch (name, slug, address, city, photo_url) dipakai di halaman `/a/:branch`
  - [x] delete/deactivate branch (soft delete via status `inactive`) + reactivate
  - [ ] branch-level policy/access control per user

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
  - [x] tenant user email activation / verification
    - Remark: owner signup dan user tenant tambahan (`admin/cs/sales/pt`) sekarang masuk `pending_activation`, bisa resend activation, dan redirect balik ke sign-in tenant yang sesuai sesudah verifikasi.
- [~] Public: event detail -> see events
  - [x] Account scoped event page `/a/:account/events` (tidak lari ke `/events` global)
  - [x] Pada `/a/:account/events`, `Sign in` diarahkan ke `/a/:account/member/signin`
  - [x] Brand kiri atas di `/a/:account/events` pakai display name account (gym_name)
  - [x] registration -> member signup -> signin
  - [x] share
  - Remark: detail event sudah ada image/description/schedule; masih bisa ditambah konten media.
- [~] Member portal
  - Remark: overview portal sesudah sign in sekarang sudah menampilkan subscription/PT status, payment activity, booking summary, dan shortcut ke event/account/member ops.
- [~] Member auth funnel
  - Remark: halaman member signup/signin sekarang sudah membawa context account dan value proposition yang nyambung ke portal member.
- [~] Identity strategy: email tetap primary, phone untuk trust/activation
  - [x] Keputusan produk: login utama tetap berbasis email/password.
  - [ ] Nomor HP wajib dan unique sebagai identifier verifikasi.
  - [ ] Verifikasi aktivasi akun via SMS OTP (bukan ganti primary login).
  - [ ] Flow change phone + re-verify OTP.
  - [ ] Normalisasi phone ke format baku (`E.164`) + unique constraint di backend/read model.
  - [ ] Tentukan scope unique phone lintas owner/member/passport, default yang dipilih: global unique.
- [~] Forgot password di semua sign-in
  - [x] Owner/Tenant sign-in (`/signin`, `/a/:account/signin`)
    - Reset endpoint mendukung `account_name/account_slug` untuk verifikasi tenant scope host.
  - [x] Member sign-in (`/a/:account/member/signin`)
  - [x] Passport/Event sign-in (`/events/signin`, `/passport/signin`)
    - Remark: UI + route forgot/reset sudah disiapkan, bergantung endpoint reset di service Passport.
  - [~] Security guard auth:
    - [x] Integrasi Cloudflare Turnstile untuk sign-in + forgot password.
    - [x] Backend verifikasi token Turnstile sudah aktif untuk endpoint auth di Foremoz API (signup/signin/forgot/reset).
    - [ ] Sinkronisasi enforcement Turnstile di service Passport API (di repo/service terpisah).
    - [ ] Rate limiting per IP + per email/account slug pada endpoint auth.
    - [ ] Tambah rate limiting + resend cooldown khusus OTP SMS.
- [~] Auth clarity `/web` vs `/events`
  - Remark: route creator/host sekarang dipusatkan ke `/host` (dengan redirect legacy dari `/web` dan `/newevent`), sedangkan participant/member tetap di `/events`.
  - Remark tambahan: default route diarahkan ke `/events` (Foremoz Events), dan di landing events ada CTA `New Host` untuk pindah ke `/host`.
- [~] PT workspace
  - Remark: PT dashboard sekarang sudah pakai flow nyata (book session, complete session, log activity) + read model `pt-balance` dan `pt-activity` dengan filter trainer, tidak lagi log local dummy. Form PT + checkin/checkout event kini mendukung `custom_fields` JSON untuk metadata operasional.
- [~] Sales workspace
  - Remark: Sales dashboard sekarang sudah pakai flow real (create prospect, follow-up, update stage, convert ke member) + timeline event prospect. Form sales juga sudah mendukung `custom_fields` JSON untuk metadata follow-up/convert.
- [ ] Reporting
  - [ ] Laporan komisi coach/team untuk event dan class per periode.
  - [ ] Read model komisi dari `coach_shares` x nilai transaksi/price aktual.
  - [ ] Breakdown per event/class: gross amount, coach involved, persen share, nominal komisi.
  - [ ] Filter reporting per branch, date range, coach, dan jenis aktivitas (`event/class`).
  - [ ] Status settlement komisi (`pending/approved/paid`) + timestamp payout.
  - [ ] Export CSV untuk laporan komisi coach/team.
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
    - [ ] AI assist untuk class setup/edit
      - [ ] Generate draft dari brief singkat (`class_name`, deskripsi, coach, price, duration/schedule starter).
      - [ ] Rewrite/improve copy per section (judul, deskripsi, instruction/notes).
      - [ ] Bantu parsing brief kompleks untuk jadwal class berulang / multi-session.
      - [ ] Simpan metadata hasil AI (`generated_by_ai`, `prompt_snapshot`) untuk audit/editability.
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
  - [~] dashboard
    - [x] browse events/class card (ecommerce like)
      - [x] export csv
      - [~] search member -> get class/events -> checkin -> check out
        - Remark: event flow sudah checkin/checkout penuh; class saat ini pakai booking cepat (belum checkout khusus class).
      - [x] scan barcode
    - [x] order -> payment
- [~] Member operational page `/a/:account/members/:memberId`
  - [x] Payment history load dari API (`/v1/read/payments/history`).
  - [x] Buy membership submit ke backend (`payment.recorded` + `payment.confirmed` + `subscription.activated`).
  - [x] Booking class submit ke backend (`/v1/bookings/classes/create`) + menampilkan daftar booking member.
  - [x] Check-in/check-out event dari halaman member via selector event terdaftar.
