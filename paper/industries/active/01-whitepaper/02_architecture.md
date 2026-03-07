# Foremoz Active Whitepaper v0.3 - Architecture

## Purpose

Menetapkan arsitektur runtime untuk identity surface, operating surface, dan public/event surface di atas EventDB.
Arsitektur ini juga menjadi infrastructure layer untuk interaksi antar actor utama: `creator`, `participant`, dan `host`.

## High-Level Architecture

```text
[Web Surfaces]
  passport.foremoz.com/<account>
  tenant.foremoz.com/a/<account>
  tenant.foremoz.com/a/<account>/events/<event_id>
  foremoz.com/active/<account>
  foremoz.com/e/<event_slug>
  <account>.foremoz.com/<event_slug> (optional)
       |
       v
[Role Workspaces]
  admin | sales | pt | member | gov
       |
       v
[Interaction Layer]
  creator <-> participant <-> host
  invitation + booking + checkin + PT session
       |
       v
[Gym API]
  - tenant/member auth split
  - member auth via JWT (HS256, bearer token)
  - role guard
  - command validation
  - append event
  - read model query
       |
       v
[EventDB Write Layer]
  namespace: foremoz:active:<tenant_id>
  chain: branch:<branch_id> | core
       |
       v
[Projector]
  - consume in-order by namespace + chain
  - update read model
  - persist rm_checkpoint
       |
       v
[Postgres Read Model]
  rm_member
  rm_member_auth
  rm_subscription_active
  rm_payment_queue
  rm_payment_history
  rm_sales_prospect
  rm_pt_activity_log
  rm_tenant_performance
  rm_tenant_policy
  rm_actor_network
  rm_passport_profile
```

## Actor and Role Mapping

- `coach` direpresentasikan melalui workspace `pt` (dan dapat diperluas ke role actor khusus).
- `studio` adalah host/place operator yang menyediakan slot ruang dan waktu.
- `member` direpresentasikan oleh Passport yang portable lintas event dan tenant.
- supporting roles (`admin`, `sales`, `cs`, `reception`) adalah operator proses, bukan node ekonomi utama jaringan.

## Auth and Routing Rules

- identity entry universal di `passport.foremoz.com/<account>`.
- tenant signin di `tenant.foremoz.com/a/<account>/signin` untuk `admin`, `sales`, `pt`, `gov`.
- member signin di `tenant.foremoz.com/a/<account>/member/signin` untuk `member`.
- API `POST /v1/auth/signup` append `member.registered` + `member.auth.registered`, lalu projector update `rm_member` + `rm_member_auth`.
- API `POST /v1/auth/signin` validasi credential dari `rm_member_auth`, lalu issue JWT bearer untuk member workspace.
- API `GET /v1/auth/me` memvalidasi JWT dan state member aktif dari read model.
- admin yang belum setup tenant diarahkan ke `tenant.foremoz.com/web/owner`.
- owner setup menulis tenant config (`tenant_id`, `branch_id`, `account_slug`) lalu mengaktifkan namespace/chain session.

## Namespace and Chain Convention

- namespace format: `foremoz:active:<tenant_id>`
- chain format: `branch:<branch_id>` atau `core`

## Projection Checkpoint Strategy

Table: `rm_checkpoint`

Fields:
- `projector_name`
- `namespace`
- `chain`
- `last_event_id`
- `last_event_ts`
- `updated_at`

Rules:
- process event berurutan per namespace+chain.
- update read model dan checkpoint dalam satu transaksi.
- restart projector lanjut dari checkpoint.

## Booking Concurrency Rule

- command `class.booking.created` hanya valid bila slot tersedia.
- projection menghitung `rm_class_availability` dari stream booking.
- race ditangani oleh deterministic rejection pada command path.

## Interaction Growth Rule

- actor dapat mengirim invitation (`coach`, `studio`, `member`) untuk ekspansi network.
- jika target studio belum ada di platform, invitation tetap direkam sebagai pending relationship.
- saat invitation diterima, projector membentuk relasi aktif pada read model network.
