# Foremoz Active Whitepaper v0.4 - Interaction Network

## Purpose

Menetapkan Active sebagai creator-first interaction network berbasis Event OS.
Relasi inti jaringan adalah `creator <-> participant <-> host`, dengan host/place sebagai optional infrastructure collaborator.

## Actor Model

Primary actors:
- `creator` (coach/trainer/organizer)
- `participant` (member/passport holder)
- `host` (studio/gym/venue/place)

Supporting roles:
- `admin`
- `sales`
- `cs`
- `reception`
- `gov`

Supporting roles menjalankan operasi internal dan aktif terutama saat institution mode diaktifkan.

## Creator Growth Loop

Loop pertumbuhan utama Active:
1. creator creates event.
2. creator shares event link (WA/IG/TikTok/web).
3. participant registers.
4. participant attends/checks in.
5. Passport records history and trust signals.
6. creator gains repeat followership.
7. next event converts faster.

Loop ini adalah baseline pertumbuhan jaringan, bukan CRM-first pipeline.

## Host as Optional Infrastructure

Host/place diposisikan sebagai:
- venue/time provider,
- collaboration partner untuk creator,
- membership operator hanya saat institution mode aktif.

Prinsip relasi:
- creator dapat beroperasi independen tanpa host tetap.
- host dapat menyediakan infrastruktur tanpa otomatis menjadi pusat relasi participant.

## Interaction Patterns

Creator -> Participant:
- publish event, invite, convert registration, follow-up post-event.

Creator -> Host:
- request slot/venue, agreement, revenue split, recurring collaboration.

Participant -> Host:
- attendance at hosted event; membership interaction hanya bila institution mode aktif.

## Event Representation

Core interaction events:
- `event.created`
- `event.published`
- `registration.created`
- `checkin.logged`
- `event.completed`
- `invitation.sent`
- `invitation.accepted`
- `creator.host.linked`

Institution extension events:
- `subscription.activated`
- `sales.prospect.created`
- `owner.tenant.setup.saved`
- `gov.tenant.suspended`

## Why This Flow Matters

- lebih natural untuk gig/creator economy.
- barrier adopsi awal lebih rendah dibanding institution-first setup.
- bootstrap pertumbuhan lebih cepat melalui distribusi creator.
- coach/trainer bisa mulai independen tanpa infrastruktur berat.
- host bisa ikut ekosistem tanpa harus menjadi system center.
- institution tetap bisa scale di layer lanjutan pada Event OS yang sama.
