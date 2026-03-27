# Foremoz Performance Whitepaper v0.3 - Event Model

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

- performance.profile.created
- performance.event.created
- performance.event.updated
- performance.ticket.purchased
- performance.attendance.logged
- performance.content.published
- pricing.plan.changed
- invitation.sent
- invitation.accepted
