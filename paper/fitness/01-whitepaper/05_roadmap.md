# Foremoz Fitness Whitepaper v0.3 - Roadmap

## Phase 1 - Surface Foundation

- `/web` global landing.
- `/a/<account>` public account page.
- `/signin` tenant signin.
- `/a/<account>/member/signup` dan `/a/<account>/member/signin`.
- API auth foundation: `signup/signin/me` dengan JWT untuk member flow.

## Phase 2 - Owner and Admin Foundation

- `/web/owner` tenant setup untuk namespace/chain.
- owner controls: SaaS extension + add/delete user.
- `/a/<account>/dashboard` admin dashboard.
- `/a/<account>/admin` admin control panel.

## Phase 3 - Member and PT Operations

- `/a/<account>/member/portal` self-service member.
- member profile/password/photo settings.
- membership purchase flow.
- PT self booking flow.
- PT workspace activity logging.

## Phase 4 - Sales CRM Operations

- `/a/<account>/sales` workspace CRM.
- prospect pipeline + follow-up + conversion.
- funneling service baseline.
- komisi report baseline.

## Phase 5 - Gov Console

- governance dashboard lintas tenant.
- tenant suspend/unsuspend.
- free grant control.
- tenant price override.
- promotion policy control.

## Phase 6 - Multi-branch Maturity

- branch-level access guard.
- branch performance dashboard.
- projection partition tuning per namespace/chain.

## Phase 7 - Interaction Network Expansion

- actor graph read model (`coach-member-studio`) untuk relasi aktif/pending.
- invitation orchestration service dan acceptance flow lintas actor.
- passport profile enrichment (sport interests, milestones, relationship summary).
- network-aware recommendation baseline untuk class/PT discovery.

## Phase 8 - Multi-sport Rollout

- generalisasi model actor ke domain `coach-venue-player`.
- enablement untuk vertical olahraga tambahan (yoga, crossfit, tennis, badminton, martial arts, swimming).
- shared passport identity tanpa migrasi struktur akun.
