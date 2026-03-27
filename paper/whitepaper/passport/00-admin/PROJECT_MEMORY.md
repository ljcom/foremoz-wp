# PROJECT_MEMORY.md
Foremoz Passport - Living Project Memory

## 1. Purpose

Dokumen ini menjaga Foremoz Passport tetap fokus sebagai member identity + personal performance product.

## 2. Product Positioning

Foremoz Passport adalah:

- personal sport identity infrastructure.
- event-driven.
- multi-tenant ready.
- multi-coach and multi-studio compatible.
- consent-first data sharing system.

Foremoz Passport bukan:

- full ERP.
- accounting platform.
- generic public marketplace.

## 3. Locked Architecture Decisions

1. EventDB sebagai write layer.
2. Semua aksi domain menjadi immutable events.
3. Projection worker membentuk read model.
4. Tenant isolation via namespace.
5. Branch partition via chain.
6. `foremoz.com/events` adalah primary event discovery dan participation entry.
7. `passport.foremoz.com` adalah member showcase surface.
8. Data sharing ke coach harus berbasis explicit consent.
9. Model pricing bersifat freemium dengan free tier permanen sebagai baseline.

## 4. Identity and Consent Commitments

- `foremoz.com/events` untuk event entry dan passport creation flow.
- `passport.foremoz.com` untuk identity, tracking, privacy control, dan show off member.
- data performa member default private.
- coach hanya melihat data yang diizinkan member.

## 5. Evolution Rule

Jika kebutuhan keluar dari identity/tracking/consent core, buat vertical terpisah.
