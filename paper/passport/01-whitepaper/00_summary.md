# Foremoz Passport Whitepaper v0.1 - Summary

## What Foremoz Passport Is

Foremoz Passport adalah lapisan identity universal untuk semua actor Foremoz.
Setiap account memiliki satu Passport yang dapat menjalankan multi-role (Creator, Participant, Host) dalam konteks event yang berbeda.

Write layer:
- EventDB append-only event stream.

Read layer:
- projector worker membentuk read model untuk actor timeline, trust/reputation profile, subscription portfolio, dan consent-aware shared view.

## Product Surfaces

- `passport.foremoz.com/<account>`: universal actor identity, subscriptions, personal metrics, privacy control.
- `tenant.foremoz.com/a/<account>`: operational surface untuk event/account operations.
- `foremoz.com/e/<event_slug>`: public event identity surface.

## Core Journey

- actor membuat/mengaktifkan Passport.
- actor mengaktifkan role sesuai konteks (creator, participant, host).
- actor membangun history event, trust, dan reputation lintas vertical.
- actor mengatur consent untuk data sharing sesuai kebutuhan kolaborasi.
- pihak lain melihat data hanya jika diizinkan.

## Core Capabilities

- universal actor identity and profile lifecycle.
- multi-role attachment pada satu Passport.
- cross-vertical activity history dan reputation continuity.
- optional personal tracking (domain-specific metrics).
- consent management per actor relation dan per data category.
- audit trail untuk consent grant/revoke.
- freemium pricing dengan free tier permanen + premium personal insights opsional.

## Why Event-driven

- auditability: semua update profile, tracking, dan consent tercatat immutable.
- replayability: riwayat actor bisa di-rebuild akurat.
- scalability: write flow terpisah dari query workload.
- trust by design: akses data sensitif selalu berbasis consent.
