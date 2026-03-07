# Foremoz Learning Whitepaper v0.3 - Event Model

## Canonical Event Envelope

{
  "type": "event.type",
  "actor": { "kind": "...", "id": "..." },
  "subject": { "kind": "...", "id": "..." },
  "data": {},
  "refs": {},
  "ts": "2026-03-07T00:00:00Z"
}

## Minimum Event Types

- learning.profile.created
- learning.event.created
- learning.event.updated
- learning.ticket.purchased
- learning.attendance.logged
- learning.content.published
- pricing.plan.changed
- invitation.sent
- invitation.accepted
