# Foremoz Active Whitepaper v0.4 - Architecture

## Purpose

Menetapkan arsitektur Active sebagai creator-led Event OS dengan default flow `creator -> event -> participant`,
serta menunjukkan bagaimana host/institution dapat mengaktifkan operational layer lanjutan tanpa mengubah fondasi event engine.

## High-Level Architecture

```text
[Identity + Public Surfaces]
  passport.foremoz.com/<account>
  foremoz.com/active/<account>
  foremoz.com/e/<event_slug>
  <account>.foremoz.com/<event_slug> (optional)
       |
       v
[Creator-led Event Flow]
  create event -> share link -> register -> check-in -> complete
       |
       v
[Interaction Layer]
  creator <-> participant <-> host(optional)
  invitation + registration + attendance + follow-up
       |
       v
[Active API]
  - auth (passport + tenant context)
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
[Projector + Read Model]
  creator/event projections
  participant attendance/payment projections
  passport linkage projections
  institution extensions (membership/CRM/admin) projections
```

## Primary vs Advanced Surfaces

### Primary (always-on)

- Passport identity surface.
- public creator surface.
- public event surface.
- event registration and attendance operations.

### Advanced (package-dependent)

- member portal under tenant.
- admin dashboard dan owner controls.
- sales CRM workspace.
- branch/governance controls.

## Host/Place Positioning

Host/place (studio/gym/venue) adalah optional infrastructure provider:
- menyediakan ruang dan slot waktu,
- dapat berkolaborasi dengan creator,
- dapat menjadi operator membership saat institution mode aktif,
- tidak selalu menjadi pemilik utama relasi creator-participant.

Prinsip penting:
- creator dapat beroperasi tanpa memiliki infrastruktur,
- host dapat menyediakan infrastruktur tanpa mengambil alih relasi creator-participant.

## Operating Mode Activation

### Creator-led Event Mode

Fokus komponen runtime:
- public creator and event routes,
- registration/check-in flow,
- payment baseline,
- Passport history and repeat journey.

### Institution Operations Mode

Menambahkan komponen:
- membership/subscription services,
- role workspaces (`admin`, `sales`, `pt`, `gov`),
- owner/admin controls,
- CRM and branch operations.

Kedua mode memakai EventDB dan projector pipeline yang sama; perbedaannya pada command set dan read model depth yang diaktifkan oleh package.

## Auth and Routing

- identity entry universal: `passport.foremoz.com/<account>`.
- creator/public journey tidak wajib melalui institution onboarding.
- tenant route (`tenant.foremoz.com/a/<account>`) dipakai saat creator/host mengaktifkan operating workspace.
- institution routes (`/dashboard`, `/admin`, `/member`, `/sales`, `/web/owner`) bersifat advanced mode.

## Projection Strategy

Table checkpoint: `rm_checkpoint`.

Rules:
- process in-order per namespace+chain.
- write read model + checkpoint dalam satu transaksi.
- restart projector dari `last_event_id`.

Read model disusun berlapis:
- layer creator-event-participant (mandatory).
- layer institution operations (optional package extension).
