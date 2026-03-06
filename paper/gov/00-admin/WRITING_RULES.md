# WRITING_RULES.md
Foremoz - Gov Whitepaper

## 1. Writing Tone

- Strategic, technical, and structured.
- Fokus pada governance control plane lintas seluruh Foremoz.
- Hindari marketing fluff.
- Jelaskan risiko, guardrail, dan implikasi operasional secara langsung.

## 2. Objective of the Whitepaper

Whitepaper ini bertujuan untuk:

- Mendefinisikan scope `paper/gov` sebagai control dashboard lintas tenant.
- Menetapkan kebijakan intervensi sistem level platform.
- Menjelaskan event model dan audit trail untuk tindakan berisiko tinggi.
- Menjaga agar akses gov tidak dibuka sebagai public surface.

## 3. Scope Discipline

Dokumen wajib mencakup:

- disable/suspend akun.
- perubahan harga lintas tenant.
- monitor aktivitas user.
- laporan income dan metrik performa agregat.
- policy override dengan audit trail.

Hindari:

- detail operasional class/PT per tenant.
- fitur growth campaign per coach.
- fitur member portal end-user.

## 4. Architectural Principles

Semua keputusan arsitektur harus selaras dengan:

1. Event-driven core (EventDB).
2. Immutable action log untuk setiap intervensi gov.
3. Read model terpisah untuk monitoring dan policy state.
4. High-risk action harus punya approval + traceability.
5. Access by least privilege.

## 5. Evolution Rule

Jika kebutuhan berubah ke workflow operasional tenant, pindahkan ke vertical terkait (fitness/coach/passport), bukan menambah scope gov.
