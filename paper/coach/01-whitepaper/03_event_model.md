# Foremoz Coach Whitepaper v0.2 - Event Model

## Canonical Event Envelope

```json
{
  "type": "event.type",
  "actor": { "kind": "coach|studio|member|owner|admin|sales|cs|pt|gov|system", "id": "..." },
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

Micro-site and growth:
- `coach.profile.published`
- `coach.microsite.link.shared`
- `coach.offer.published`
- `coach.campaign.clicked`
- `subscription.created`

Class and location:
- `class.scheduled`
- `class.booking.created`
- `class.booking.canceled`
- `class.attendance.confirmed`
- `location.class.assigned`

Invitation and network:
- `invitation.sent`
- `invitation.accepted`
- `invitation.rejected`
- `coach.member.linked`
- `coach.studio.linked`

Support team operations:
- `coach.team.member.added`
- `coach.team.member.removed`
- `member.reregistration.logged`
- `onsite.checkin.assisted`

Operational controls:
- `payment.recorded`
- `payment.confirmed`

## Required Field Highlights

- `coach.microsite.link.shared`: `share_id`, `coach_id`, `channel`, `content_type`, `target_url`.
- `coach.campaign.clicked`: `click_id`, `share_id`, `channel`, `landing_path`, `clicked_at`.
- `subscription.created`: `subscription_id`, `coach_id`, `member_id`, `offer_id`, `source_channel`.
- `location.class.assigned`: `class_id`, `location_id`, `studio_id`, `start_at`, `capacity`.
- `member.reregistration.logged`: `reregistration_id`, `member_id`, `location_id`, `staff_id`, `method`.

Sample payload tersedia di `appendix/sample_event_payload.json`.
