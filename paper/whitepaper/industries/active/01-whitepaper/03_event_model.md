# Foremoz Active Whitepaper v0.4 - Event Model

## Canonical Event Envelope

```json
{
  "type": "event.type",
  "actor": { "kind": "creator|participant|host|admin|sales|pt|gov|owner|system", "id": "..." },
  "subject": { "kind": "entity", "id": "..." },
  "data": {},
  "refs": {},
  "ts": "2026-03-10T10:00:00Z"
}
```

Required fields:
- `type`
- `actor`
- `subject`
- `data`
- `refs`
- `ts`

## Event Model Emphasis

### A. Core Creator-led Event Events (Primary Backbone)

Event backbone Active:
- `event.created`
- `event.updated`
- `event.published`
- `invitation.sent`
- `invitation.accepted`
- `registration.created`
- `registration.canceled`
- `checkin.logged`
- `checkout.logged`
- `payment.recorded`
- `payment.confirmed`
- `event.completed`
- `feedback.submitted`
- `followup.sent`
- `creator.host.linked`

Domain-specific mapping tetap tersedia:
- class/PT/tournament/match dapat memetakan ke keluarga event di atas (`class.scheduled`, `pt.session.booked`, `match.result.recorded`, dll).

### B. Institution Operations Events (Operational Expansion)

Institutional extension events:
- membership/subscription:
  - `member.registered`
  - `subscription.activated`
  - `subscription.extended`
  - `subscription.frozen`
  - `subscription.unfrozen`
  - `subscription.expired`
- owner/admin/staff:
  - `owner.tenant.setup.saved`
  - `owner.user.created`
  - `owner.user.updated`
  - `owner.user.deleted`
  - `owner.saas.extended`
- CRM:
  - `sales.prospect.created`
  - `sales.prospect.updated`
  - `sales.prospect.followup.logged`
  - `sales.prospect.converted`
- policy/governance:
  - `gov.tenant.suspended`
  - `gov.tenant.unsuspended`
  - `gov.tenant.price.updated`
  - `gov.tenant.promotion.updated`

## Membership Positioning in Event Model

Membership bukan syarat awal operasi Active.
Membership adalah recurring operational model untuk:
- institution mode,
- atau creator yang sudah matang dan ingin mengaktifkan subscription loop.

Creator dapat tetap menjalankan event one-off sepenuhnya tanpa membership.

## Required Field Highlights

- `event.created`: `event_id`, `creator_id`, `title`, `starts_at`, `location_mode`, `price`.
- `registration.created`: `registration_id`, `event_id`, `participant_id`, `channel`, `status`.
- `checkin.logged`: `event_id`, `participant_id`, `method`, `checked_in_at`.
- `event.completed`: `event_id`, `completed_at`, `attendance_count`, `gross_amount`.
- `creator.host.linked`: `creator_id`, `host_id`, `relationship_type`, `effective_at`.
- `subscription.activated`: `member_id`, `plan_id`, `started_at`, `expired_at`.
- `owner.tenant.setup.saved`: `tenant_id`, `branch_id`, `account_slug`.

## Read Model Layering

Primary read model outputs:
- creator profile and event catalog.
- registration and attendance timeline.
- payment and conversion baseline.
- Passport event history.

Advanced outputs:
- membership states.
- CRM funnel views.
- branch/governance controls.

Layering ini memastikan creator-first flow tetap minimum viable platform, sementara institution capability tetap lengkap saat package ditingkatkan.
