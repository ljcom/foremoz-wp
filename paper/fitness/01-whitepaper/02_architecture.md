# Foremoz Fitness Whitepaper v0.3 - Architecture

## Purpose

Menetapkan arsitektur runtime untuk public surface, role workspace, dan control surface di atas EventDB.
Arsitektur ini juga menjadi infrastructure layer untuk interaksi antar actor utama: `coach`, `studio`, dan `member`.

## High-Level Architecture

```text
[Web Surfaces]
  /web
  /web/owner
  /a/<account>
  coach.foremoz.com
  passport.foremoz.com
       |
       v
[Role Workspaces]
  admin | sales | pt | member | gov
       |
       v
[Interaction Layer]
  coach <-> member <-> studio
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
  namespace: foremoz:fitness:<tenant_id>
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
- `studio` adalah tenant/place operator yang menyediakan slot ruang dan waktu.
- `member` direpresentasikan oleh `passport` sebagai identity layer olahraga yang portable.
- supporting roles (`admin`, `sales`, `cs`, `reception`) adalah operator proses, bukan node ekonomi utama jaringan.

## Auth and Routing Rules

- tenant signin di `/signin` untuk `admin`, `sales`, `pt`, `gov`.
- member signin di `/a/<account>/member/signin` untuk `member`.
- `coach.foremoz.com` menjadi entry identity coach untuk invitation acceptance dan network relationship.
- `passport.foremoz.com` menjadi entry identity passport/member untuk invitation acceptance dan riwayat portable.
- API `POST /v1/auth/signup` append `member.registered` + `member.auth.registered`, lalu projector update `rm_member` + `rm_member_auth`.
- API `POST /v1/auth/signin` validasi credential dari `rm_member_auth`, lalu issue JWT bearer untuk member workspace.
- API `GET /v1/auth/me` memvalidasi JWT dan state member aktif dari read model.
- admin yang belum setup tenant diarahkan ke `/web/owner`.
- owner setup menulis tenant config (`tenant_id`, `branch_id`, `account_slug`) lalu mengaktifkan namespace/chain session.

## Namespace and Chain Convention

- namespace format: `foremoz:fitness:<tenant_id>`
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
