# Foremoz Active Whitepaper v0.3 - Scope

## Objective

Foremoz Active berfokus pada operasi active center end-to-end (fitness + sport):
- membership
- booking
- PT session
- tournament/league management
- match management
- team and ranking
- attendance
- payment recording/confirmation
- owner setup
- sales CRM pipeline operasional
- member self-service
- gov cross-tenant control
- actor interaction network (`coach`, `studio`, `member/passport`)

## In Scope

- membership lifecycle.
- class booking + capacity rules.
- PT session package + PT activity logging.
- tournament lifecycle: create tournament/league, format setup, scheduling.
- match management: court/field assignment, score recording, result publishing.
- team operations: create/join team, roster and captain management.
- ranking systems: leaderboard, season standings, ELO-style scoring.
- spectator flow: match attendance and spectator ticket baseline.
- attendance logging (QR/manual).
- payment queue + payment history.
- interaction model antar actor: coach-studio, coach-member, member-studio.
- invitation workflow: coach invite member/studio, studio invite coach, member invite friend.
- passport sebagai identity layer olahraga yang portable lintas coach/studio.
- owner page operations (`/web/owner`): tenant setup namespace/chain, perpanjang SaaS, user access.
- role workspaces: `admin`, `sales`, `pt`, `member`, `gov`.
- public web/account surfaces (`/web`, `/a/<account>`).
- member self-service (`/a/<account>/member/*`).
- sales CRM pipeline (prospect create/update/follow-up/conversion).
- gov policy operations (suspend/free/price/promotion).
- packaging komersial bertingkat dengan free tier minimum untuk tenant kecil.

## Canonical URL Map

- `/web`
- `/web/owner`
- `/a/<account>`
- `/a/<account>/member`
- `/a/<account>/member/signup`
- `/a/<account>/member/signin`
- `/a/<account>/member/portal`
- `/a/<account>/dashboard`
- `/a/<account>/admin`
- `/a/<account>/sales`
- `/a/<account>/dashboard/pt`

## Actor Identity Domains

Invitation network membutuhkan identity endpoint yang konsisten untuk tiap actor.
Minimal domain yang wajib tersedia:

- `coach.foremoz.com` untuk coach identity surface (invite acceptance, profile, network relation).
- `passport.foremoz.com` untuk member passport identity surface (invite acceptance, sport identity, portable history).

## Multi-tenant and Branch Model

- namespace: `foremoz:active:<tenant_id>`
- chain: `branch:<branch_id>` atau `core`

Tenant terisolasi oleh namespace. Operasi branch terpisah by chain.
Konfigurasi namespace/chain dilakukan di owner page (`/web/owner`), bukan onboarding terpisah.

## Out of Scope

- heavy ERP modules.
- payroll.
- inventory/warehouse.
- marketplace aggregation.
- deep accounting.
- complex marketing automation.
- supporting staff sebagai node ekonomi utama jaringan.

CRM pada scope ini bersifat operasional pipeline ringan, bukan automation suite enterprise.
