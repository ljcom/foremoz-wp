# Foremoz Coach Whitepaper v0.2 - Architecture

## Purpose

Mendefinisikan runtime architecture untuk coach micro-site growth funnel dan operasi kelas di atas EventDB.

## High-Level Architecture

```text
[Public Growth Surface]
  coach.foremoz.com/<coach_handle>
       |
       v
[Growth and Conversion Layer]
  profile | classes by location | subscribe | invite | tracking
       |
       v
[Coach API]
  - auth + role guard
  - command validation
  - append event
  - read model query
       |
       v
[EventDB Write Layer]
  namespace: foremoz:coach:<tenant_id>
  chain: branch:<branch_id> | core
       |
       v
[Projector]
  - consume in-order per namespace+chain
  - update read model
  - persist rm_checkpoint
       |
       v
[Postgres Read Model]
  rm_coach_profile_public
  rm_coach_offer_catalog
  rm_location_class_list
  rm_subscription_funnel
  rm_invitation_queue
  rm_actor_network
  rm_support_team
  rm_coach_performance
```

## Routing and Access Rules

- public entry berada di `coach.foremoz.com/<coach_handle>`.
- conversion entry via `subscribe` dan `join/<class_slug>`.
- source attribution ditangkap dari query params kampanye.
- coach signin di `coach.foremoz.com/signin` untuk mengelola micro-site.
- support team signin di workspace sesuai role operasional yang diberikan coach.
- studio/account operational surface diakses lewat `coach.foremoz.com/a/<account>`.
- PT tenant workspace diakses lewat `coach.foremoz.com/a/<account>/dashboard/pt`.
- jika ada overlap capability dengan fitness layer, routing tetap diprioritaskan dari domain coach (coach-first POV).

## RBAC Mapping

- canonical role set mengikuti fitness: `owner`, `admin`, `sales`, `cs`, `pt`, `member`, `gov`.
- `partner coach` dipetakan ke role `pt`.
- support team administratif dipetakan ke role `cs` dengan permission terbatas.
- kebijakan akses sensitif tetap melalui `owner`/`admin` scope, bukan role `pt`.

## Support Team Operational Mode

Untuk tier service tinggi:
- coach dapat menambahkan anggota tim operator.
- tim memiliki akses registrasi ulang onsite.
- tim dapat melakukan verifikasi data join dan assist check-in di lokasi.

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
- event diproses berurutan per namespace+chain.
- write read model + checkpoint dalam satu transaksi.
- restart projector lanjut dari checkpoint.

## Concurrency Rules

- `class.booking.created` valid hanya jika kapasitas slot tersedia.
- `subscription.created` idempotent by `subscription_id`.
- `member.reregistration.logged` idempotent by `reregistration_id`.
