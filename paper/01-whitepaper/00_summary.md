# Foremoz Fitness Whitepaper v0.3 - Summary

## What Foremoz Fitness Is

Foremoz Fitness adalah vertical SaaS untuk operasi gym dan fitness studio dengan arsitektur event-driven.

Write layer:
- EventDB append-only event stream.

Read layer:
- projection worker membentuk read model untuk query layar operasional.

## Product Surfaces

- `fitness.foremoz.com/web`: global landing.
- `fitness.foremoz.com/web/owner`: owner control page (tenant setup, SaaS extension, user access).
- `fitness.foremoz.com/a/<account>`: public account page.
- `fitness.foremoz.com/a/<account>/member`: member self-service entry.
- `fitness.foremoz.com/a/<account>/member/signup`: member signup.
- `fitness.foremoz.com/a/<account>/member/signin`: member signin.
- `fitness.foremoz.com/a/<account>/member/portal`: member portal.
- `fitness.foremoz.com/a/<account>/dashboard`: admin dashboard.
- `fitness.foremoz.com/a/<account>/admin`: admin control panel.
- `fitness.foremoz.com/a/<account>/sales`: sales CRM workspace.
- `fitness.foremoz.com/a/<account>/dashboard/pt`: PT workspace.
- `fitness.foremoz.com/gov`: gov console lintas tenant.

## Access Model

- tenant signin: `fitness.foremoz.com/signin` untuk role `admin`, `sales`, `pt`, `gov`.
- member signin: `fitness.foremoz.com/a/<account>/member/signin` khusus role `member`.

## Core Capabilities

- membership lifecycle: registration, subscription, extension, freeze/unfreeze, expiry.
- class booking: schedule, capacity, booking, cancellation, attendance confirmation.
- PT session: package, booking, completion, activity logging.
- attendance: QR/manual checkin.
- payment recording/confirmation + payment history.
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
