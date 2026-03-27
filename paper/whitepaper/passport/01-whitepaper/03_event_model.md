# Foremoz Passport Whitepaper v0.1 - Event Model

## Canonical Event Envelope

```json
{
  "type": "event.type",
  "actor": { "kind": "member|coach|studio|admin|system", "id": "..." },
  "subject": { "kind": "entity", "id": "..." },
  "data": {},
  "refs": {},
  "ts": "2026-03-06T10:00:00Z"
}
```

Required fields:
- `type`
- `actor`
- `subject`
- `data`
- `refs`
- `ts`

## Minimum Event Types

Identity and network:
- `passport.created`
- `passport.profile.updated`
- `passport.sport_interest.updated`
- `coach.member.linked`
- `member.studio.joined`

Join and subscription:
- `subscription.created`
- `subscription.canceled`
- `class.booking.created`
- `class.attendance.confirmed`
- `pt.session.booked`
- `pt.session.completed`

Personal performance tracking:
- `performance.diet.logged`
- `performance.weight.logged`
- `performance.muscle.logged`
- `performance.workout.logged`
- `performance.milestone.recorded`

Consent and privacy:
- `consent.granted`
- `consent.revoked`
- `consent.scope.updated`

Operational controls:
- `payment.recorded`
- `payment.confirmed`

## Required Field Highlights

- `subscription.created`: `subscription_id`, `passport_id`, `coach_id`, `studio_id`, `plan_id`, `source`.
- `performance.weight.logged`: `metric_log_id`, `passport_id`, `weight_kg`, `measured_at`.
- `performance.muscle.logged`: `metric_log_id`, `passport_id`, `muscle_mass_kg`, `body_fat_pct`, `measured_at`.
- `performance.diet.logged`: `metric_log_id`, `passport_id`, `calorie_intake`, `macro_summary`, `logged_at`.
- `consent.granted`: `consent_id`, `passport_id`, `coach_id`, `metric_categories`, `granted_at`.
- `consent.revoked`: `consent_id`, `passport_id`, `coach_id`, `revoked_at`, `reason`.

Sample payload tersedia di `appendix/sample_event_payload.json`.
