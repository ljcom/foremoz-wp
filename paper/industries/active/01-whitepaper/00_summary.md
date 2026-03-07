# Foremoz Active Whitepaper v0.3 - Summary

## What Foremoz Active Is

Foremoz Active adalah vertical SaaS gabungan dari fitness dan sport dengan arsitektur event-driven.
Platform ini diposisikan sebagai active lifestyle interaction infrastructure yang menghubungkan `coach`, `studio/club`, `athlete/member`, dan `organizer` melalui event stream.

Write layer:
- EventDB append-only event stream.

Read layer:
- projection worker membentuk read model untuk query layar operasional.

## Interaction Network Lens

Model relasi utama:

`coach <-> member <-> studio`

Setiap interaksi operasional seperti scheduling, booking, checkin, dan PT session dicatat sebagai event immutable di EventDB.
Dengan pendekatan ini, platform tidak hanya mengelola operasional internal tenant, tetapi juga membentuk jaringan interaksi antar actor.

Model gabungan ini mencakup dua mode:
- Fitness operations: membership, class/PT booking, attendance, payment.
- Sport operations: tournament/league, match management, ranking, team, spectator flows.

## Product Surfaces

- `foremoz.com/active/`: global landing.
- `foremoz.com/active/owner`: owner control page (tenant setup, SaaS extension, user access).
- `active.foremoz.com/a/<account>`: public account page.
- `coach.foremoz.com`: coach identity surface untuk invitation/network interaction.
- `passport.foremoz.com`: member passport identity surface untuk invitation/network interaction. (lihat passport folder)
- `active.foremoz.com/a/<account>/member`: member self-service entry.
- `active.foremoz.com/a/<account>/member/signup`: member signup.
- `active.foremoz.com/a/<account>/member/signin`: member signin.
- `active.foremoz.com/a/<account>/member/portal`: member portal.
- `active.foremoz.com/a/<account>/dashboard`: admin dashboard.
- `active.foremoz.com/a/<account>/admin`: admin control panel.
- `active.foremoz.com/a/<account>/sales`: sales CRM workspace.
- `active.foremoz.com/a/<account>/dashboard/pt`: PT workspace.

## Access Model

- owner signin: `foremoz.com/active/signin` khusus role `owner`.
- tenant signin: `active.foremoz.com/a/<account>/signin` untuk role `admin`, `sales`, `cs`.
- member signin: `active.foremoz.com/a/<account>/member/signin` khusus role `member`.
- member auth backend: `POST /v1/auth/signup`, `POST /v1/auth/signin`, `GET /v1/auth/me` dengan JWT bearer.

## Core Capabilities

- membership lifecycle: registration, subscription, extension, freeze/unfreeze, expiry.
- class booking: schedule, capacity, booking, cancellation, attendance confirmation.
- PT session: package, booking, completion, activity logging.
- tournament and league lifecycle: registration, bracket/round-robin, fixture, result recording.
- match operations: venue/court assignment, referee assignment, score recording.
- team and ranking: roster, captain, standings/ELO, seasonal leaderboard.
- attendance: QR/manual checkin.
- payment recording/confirmation + payment history.
- invitation-driven growth: actor dapat saling mengundang actor lain untuk membentuk network.
- passport identity layer: riwayat olahraga portable lintas coach dan studio.
- member self-service: profile/password/photo, membership purchase, PT self booking.
- admin operations: member service, user/class/trainer/sales management.
- sales CRM operations: prospect pipeline, funneling, conversion baseline.
- owner operations: tenant setup, SaaS extension, access setup.
- gov operations: cross-tenant performance, suspend/free/price/promotion control.
- pricing tiers untuk tenant dengan free plan minimum sebagai entry.

## Why Event-driven

- auditability: setiap perubahan operasional adalah event immutable.
- scalability: write throughput terpisah dari read query load.
- replayability: read model dapat di-rebuild deterministik dari event.
- operational clarity: role berbeda membaca read model yang sama sesuai kebutuhan.

## Deployment Model

- Vite PWA frontend.
- Gym API (command + read endpoints).
- EventDB write layer.
- projector worker + checkpoint.
- Postgres read model.

## Sport Extension

Detail domain sport dijabarkan pada dokumen tambahan:
- `01-whitepaper/08_sport_extension.md`
