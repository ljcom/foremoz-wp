# Foremoz Active Whitepaper v0.3 - Event Model

## Canonical Event Envelope

```json
{
  "type": "event.type",
  "actor": { "kind": "coach|studio|member|admin|sales|pt|gov|owner|system", "id": "..." },
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
- `member.auth.registered`
- `member.auth.password.changed`
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
- `owner.tenant.setup.deleted`
- `owner.user.created`
- `owner.user.updated`
- `owner.user.deleted`
- `owner.saas.extended`

Gov controls:
- `gov.tenant.suspended`
- `gov.tenant.unsuspended`
- `gov.tenant.free_granted`
- `gov.tenant.price.updated`
- `gov.tenant.promotion.updated`

Interaction network and invitation:
- `passport.created`
- `passport.sport_interest.updated`
- `invitation.sent`
- `invitation.accepted`
- `invitation.rejected`
- `coach.studio.linked`
- `coach.member.linked`
- `member.studio.joined`
- `member.studio.left`

## Required Field Highlights

- `owner.tenant.setup.saved`: `tenant_id`, `branch_id`, `account_slug`, `gym_name`.
- `member.auth.registered`: `member_id`, `email`, `password_hash`, `status`, `registered_at`.
- `member.profile.updated`: `member_id`, `full_name`, `phone`, `email`.
- `sales.prospect.created`: `prospect_id`, `full_name`, `phone`, `source`, `stage`.
- `gov.tenant.price.updated`: `tenant_id`, `old_price`, `new_price`, `effective_at`.
- `gov.tenant.suspended`: `tenant_id`, `reason`, `suspended_at`.
- `invitation.sent`: `invitation_id`, `inviter_actor_kind`, `invitee_actor_kind`, `channel`, `target_contact`, `status`.
- `passport.created`: `passport_id`, `member_id`, `created_at`, `sport_interests`.

Sample payload tersedia di `appendix/sample_event_payload.json`.
