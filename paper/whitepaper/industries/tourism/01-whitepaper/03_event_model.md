# Foremoz Tourism Whitepaper v0.3 - Event Model

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

- tourism.profile.created
- tourism.event.created
- tourism.event.updated
- tourism.ticket.purchased
- tourism.attendance.logged
- tourism.content.published
- pricing.plan.changed
- invitation.sent
- invitation.accepted
