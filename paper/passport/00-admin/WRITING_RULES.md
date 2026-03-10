# WRITING_RULES.md
Foremoz - Passport Whitepaper

## 1. Writing Tone

- Strategic, technical, and structured.
- Fokus pada member role sebagai pusat identity dan personal performance.
- Hindari marketing fluff.
- Gunakan bahasa operasional yang bisa langsung dipakai tim produk/engineering.

## 2. Objective of the Whitepaper

Whitepaper ini bertujuan untuk:

- Mendefinisikan hubungan surface `foremoz.com/events` (event entry) dan `passport.foremoz.com` (member showcase).
- Menjelaskan bagaimana member dapat join banyak coach/studio.
- Menetapkan model personal tracking (diet, weight, muscle, metric lain).
- Menetapkan consent model untuk data sharing ke coach.

## 3. Scope Discipline

Dokumen wajib mencakup:

- identity lifecycle member/passport.
- multi-subscription ke coach/fitness.
- personal performance logging.
- privacy and consent-based data sharing.
- event-driven projection model.

Hindari:

- ERP extension.
- accounting suite.
- marketplace aggregator lintas domain.
- custom workflow per client.

## 4. Architectural Principles

Semua keputusan arsitektur harus selaras dengan:

1. Event-driven core (EventDB).
2. Immutable write model.
3. Projection-based read model.
4. Multi-tenant readiness.
5. Auditability, replayability, and user consent traceability.

## 5. Terminology Consistency

Gunakan istilah:

- member/passport
- coach
- studio
- subscription
- consent
- performance log
- namespace
- chain
- event
- projection
- read model

## 6. Evolution Rule

Jika kebutuhan keluar dari member identity + tracking core, buat vertical terpisah.
