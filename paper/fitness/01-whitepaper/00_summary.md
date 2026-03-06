# Foremoz Fitness Whitepaper v0.3 - Summary

## What Foremoz Fitness Is

Foremoz Fitness adalah vertical SaaS untuk operasi gym dan fitness studio dengan arsitektur event-driven.
Platform ini diposisikan sebagai sports interaction infrastructure yang menghubungkan `coach`, `studio`, dan `member` melalui event stream.

Write layer:
- EventDB append-only event stream.

Read layer:
- projection worker membentuk read model untuk query layar operasional.

## Interaction Network Lens

Model relasi utama:

`coach <-> member <-> studio`

Setiap interaksi operasional seperti scheduling, booking, checkin, dan PT session dicatat sebagai event immutable di EventDB.
Dengan pendekatan ini, platform tidak hanya mengelola operasional internal tenant, tetapi juga membentuk jaringan interaksi antar actor.

## Product Surfaces

- `foremoz.com/fitness/`: global landing.
- `foremoz.com/fitness/owner`: owner control page (tenant setup, SaaS extension, user access).
- `fitness.foremoz.com/a/<account>`: public account page.
- `coach.foremoz.com`: coach identity surface untuk invitation/network interaction. (lihat coach folder)
- `passport.foremoz.com`: member passport identity surface untuk invitation/network interaction. (lihat passport folder)
- `fitness.foremoz.com/a/<account>/member`: member self-service entry.
- `fitness.foremoz.com/a/<account>/member/signup`: member signup.
- `fitness.foremoz.com/a/<account>/member/signin`: member signin.
- `fitness.foremoz.com/a/<account>/member/portal`: member portal.
- `fitness.foremoz.com/a/<account>/dashboard`: admin dashboard.
- `fitness.foremoz.com/a/<account>/admin`: admin control panel.
- `fitness.foremoz.com/a/<account>/sales`: sales CRM workspace.
- `fitness.foremoz.com/a/<account>/dashboard/pt`: PT workspace.

## Access Model

- owner signin: `foremoz.com/fitness/signin` khusus role `owner`.
- tenant signin: `fitness.foremoz.com/a/<account>/signin` untuk role `admin`, `sales`, `cs`.
- member signin: `fitness.foremoz.com/a/<account>/member/signin` khusus role `member`.
- member auth backend: `POST /v1/auth/signup`, `POST /v1/auth/signin`, `GET /v1/auth/me` dengan JWT bearer.

## Core Capabilities

- membership lifecycle: registration, subscription, extension, freeze/unfreeze, expiry.
- class booking: schedule, capacity, booking, cancellation, attendance confirmation.
- PT session: package, booking, completion, activity logging.
- attendance: QR/manual checkin.
- payment recording/confirmation + payment history.
- invitation-driven growth: actor dapat saling mengundang actor lain untuk membentuk network.
- passport identity layer: riwayat olahraga portable lintas coach dan studio.
- member self-service: profile/password/photo, membership purchase, PT self booking.
- admin operations: member service, user/class/trainer/sales management.
- sales CRM operations: prospect pipeline, funneling, conversion baseline.
- owner operations: tenant setup, SaaS extension, access setup.
- gov operations: cross-tenant performance, suspend/free/price/promotion control.

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
