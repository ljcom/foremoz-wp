# Foremoz Fitness Whitepaper v0.1 - Event Model

## Purpose

Define the minimum event set and canonical event envelope for fitness center operations.

## Canonical Event Envelope

All domain events use this envelope:

- `type`: event type string.
- `actor`: who executed the action (`staff`, `system`, `member`) with id.
- `subject`: primary business entity for the event.
- `data`: domain payload for state transition.
- `refs`: cross-entity references (booking id, subscription id, payment id, etc.).
- `ts`: event timestamp in ISO-8601 UTC.

Example shape:

```json
{
  "type": "subscription.activated",
  "actor": { "kind": "staff", "id": "stf_001" },
  "subject": { "kind": "subscription", "id": "sub_001" },
  "data": {},
  "refs": {},
  "ts": "2026-03-02T10:00:00Z"
}
```

## Minimum Event Types

### Member

1. `member.registered`
- Purpose: create a new member profile.
- Required fields:
  - `data.member_id`
  - `data.tenant_id`
  - `data.branch_id` (nullable when core)
  - `data.full_name`
  - `data.phone`
  - `data.status`

2. `member.updated`
- Purpose: update member contact or profile fields.
- Required fields:
  - `data.member_id`
  - `data.tenant_id`
  - `data.patch` (allowed keys only)

### Plan

3. `plan.created`
- Purpose: define a subscription plan.
- Required fields:
  - `data.plan_id`
  - `data.tenant_id`
  - `data.plan_name`
  - `data.duration_days`
  - `data.price_amount`
  - `data.currency`

4. `plan.updated`
- Purpose: update plan metadata for future subscription use.
- Required fields:
  - `data.plan_id`
  - `data.tenant_id`
  - `data.patch`

### Subscription

5. `subscription.activated`
- Purpose: start a member subscription.
- Required fields:
  - `data.subscription_id`
  - `data.member_id`
  - `data.plan_id`
  - `data.start_date`
  - `data.end_date`
  - `data.status`

6. `subscription.extended`
- Purpose: extend subscription period.
- Required fields:
  - `data.subscription_id`
  - `data.previous_end_date`
  - `data.new_end_date`

7. `subscription.frozen`
- Purpose: pause access for defined period.
- Required fields:
  - `data.subscription_id`
  - `data.freeze_start_date`
  - `data.freeze_end_date`
  - `data.reason`

8. `subscription.unfrozen`
- Purpose: resume subscription before/after freeze window.
- Required fields:
  - `data.subscription_id`
  - `data.resumed_at`

9. `subscription.expired`
- Purpose: mark subscription as expired.
- Required fields:
  - `data.subscription_id`
  - `data.expired_at`

### Payment

10. `payment.recorded`
- Purpose: record incoming payment intent/proof.
- Required fields:
  - `data.payment_id`
  - `data.member_id`
  - `data.subscription_id` (nullable)
  - `data.amount`
  - `data.currency`
  - `data.method`
  - `data.proof_url` (nullable)
  - `data.recorded_at`

11. `payment.confirmed`
- Purpose: confirm payment for operational validity.
- Required fields:
  - `data.payment_id`
  - `data.confirmed_by`
  - `data.confirmed_at`

12. `payment.rejected`
- Purpose: reject invalid payment proof/record.
- Required fields:
  - `data.payment_id`
  - `data.rejected_by`
  - `data.rejected_at`
  - `data.reason`

### Check-in and Attendance

13. `checkin.logged`
- Purpose: record member attendance entry.
- Required fields:
  - `data.checkin_id`
  - `data.member_id`
  - `data.branch_id`
  - `data.channel` (`qr` or `manual`)
  - `data.checkin_at`

### Class Booking

14. `class.scheduled`
- Purpose: register class schedule and capacity.
- Required fields:
  - `data.class_id`
  - `data.branch_id`
  - `data.class_name`
  - `data.start_at`
  - `data.end_at`
  - `data.capacity`

15. `class.booking.created`
- Purpose: create booking for member or guest.
- Required fields:
  - `data.booking_id`
  - `data.class_id`
  - `data.booking_kind` (`member` or `guest`)
  - `data.member_id` (required for member booking)
  - `data.guest_name` (required for guest booking)
  - `data.status`
  - `data.booked_at`

16. `class.booking.canceled`
- Purpose: cancel an existing class booking.
- Required fields:
  - `data.booking_id`
  - `data.class_id`
  - `data.canceled_at`
  - `data.reason`

17. `class.attendance.confirmed`
- Purpose: confirm attendance for booked participant.
- Required fields:
  - `data.booking_id`
  - `data.class_id`
  - `data.confirmed_at`

### PT Session

18. `pt.package.assigned`
- Purpose: assign PT session package to member.
- Required fields:
  - `data.pt_package_id`
  - `data.member_id`
  - `data.total_sessions`
  - `data.assigned_at`

19. `pt.session.booked`
- Purpose: reserve one PT session slot.
- Required fields:
  - `data.pt_booking_id`
  - `data.pt_package_id`
  - `data.member_id`
  - `data.trainer_id`
  - `data.session_at`

20. `pt.session.completed`
- Purpose: consume one PT session from package balance.
- Required fields:
  - `data.pt_booking_id`
  - `data.pt_package_id`
  - `data.member_id`
  - `data.completed_at`

Canonical samples are provided in `appendix/sample_event_payload.json`.
