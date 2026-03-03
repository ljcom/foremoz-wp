# Foremoz Fitness Whitepaper v0.3 - Event Model

## Canonical Event Envelope

```json
{
  "type": "event.type",
  "actor": { "kind": "admin|sales|pt|member|gov|owner|system", "id": "..." },
  "subject": { "kind": "entity", "id": "..." },
  "data": {},
  "refs": {},
  "ts": "2026-03-03T10:00:00Z"
}
```

Required envelope fields:
- `type`
- `actor`
- `subject`
- `data`
- `refs`
- `ts`

## Minimum Event Types

Membership and subscription:
- `member.registered`
- `member.updated`
- `subscription.activated`
- `subscription.extended`
- `subscription.frozen`
- `subscription.unfrozen`
- `subscription.expired`

Payment and attendance:
- `payment.recorded`
- `payment.confirmed`
- `payment.rejected`
- `checkin.logged`

Class booking:
- `class.scheduled`
- `class.booking.created`
- `class.booking.canceled`
- `class.attendance.confirmed`

PT session:
- `pt.package.assigned`
- `pt.session.booked`
- `pt.session.completed`
- `pt.activity.logged`

Member self-service:
- `member.profile.updated`
- `member.password.changed`
- `member.photo.updated`
- `member.self_booking.pt.created`

Sales CRM:
- `sales.prospect.created`
- `sales.prospect.updated`
- `sales.prospect.followup.logged`
- `sales.prospect.converted`

Owner and tenant setup:
- `owner.tenant.setup.saved`
- `owner.user.created`
- `owner.saas.extended`

Gov controls:
- `gov.tenant.suspended`
- `gov.tenant.unsuspended`
- `gov.tenant.free_granted`
- `gov.tenant.price.updated`
- `gov.tenant.promotion.updated`

## Required Field Highlights

- `owner.tenant.setup.saved`: `tenant_id`, `branch_id`, `account_slug`, `gym_name`.
- `member.profile.updated`: `member_id`, `full_name`, `phone`, `email`.
- `sales.prospect.created`: `prospect_id`, `full_name`, `phone`, `source`, `stage`.
- `gov.tenant.price.updated`: `tenant_id`, `old_price`, `new_price`, `effective_at`.
- `gov.tenant.suspended`: `tenant_id`, `reason`, `suspended_at`.

Sample payload tersedia di `appendix/sample_event_payload.json`.
