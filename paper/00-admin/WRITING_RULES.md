# WRITING_RULES.md
Foremoz – Fitness Vertical Whitepaper

## 1. Writing Tone

- Strategic, technical, and structured.
- Avoid marketing fluff.
- Avoid academic over-formalization.
- Clear reasoning > decorative language.
- Use precise terminology.

This document is not a brochure.
It is an architectural and operational blueprint.

---

## 2. Objective of the Whitepaper

This whitepaper aims to:

- Define the operational coverage of Foremoz Fitness.
- Document the event-driven architecture.
- Clarify system boundaries.
- Establish a scalable vertical SaaS foundation.
- Serve as internal technical alignment document.

It is not:
- A fundraising document.
- A pitch deck.
- A generic SaaS manifesto.

---

## 3. Scope Discipline

The whitepaper must strictly cover:

- Fitness center operations.
- Membership lifecycle.
- Class booking.
- Personal training session tracking.
- Attendance management.
- Payment recording and confirmation.

Avoid:

- Full ERP discussions.
- Inventory management (unless directly related to membership).
- Accounting module expansion.
- Marketplace features.
- Complex CRM features.

If a feature requires customization per client,
it belongs to Maxfora — not Foremoz Fitness.

---

## 4. Architectural Principles

All design decisions must align with:

1. Event-driven core (EventDB).
2. Immutable write model.
3. Read model projection separation.
4. Multi-tenant readiness.
5. Horizontal scalability.

No mutable-only database model is allowed.

---

## 5. Terminology Consistency

Use consistent terms:

- Namespace
- Chain
- Event
- Projection
- Read Model
- Tenant
- Branch
- Subscription
- Session
- Booking

Do not mix:
- Order vs Booking
- Product vs Plan
- Member vs User

Define terms once in glossary and reuse consistently.

---

## 6. Audience

Primary audience:

- Internal system architect.
- Technical collaborators.
- Strategic partners.
- Future vertical adopters.

Secondary audience:

- Potential enterprise clients.
- Operational managers.

---

## 7. Structure Discipline

Each section must:

- Start with purpose.
- Explain reasoning.
- Define structure.
- Avoid unnecessary repetition.

Diagrams must clarify architecture, not decorate.

---

## 8. Evolution Rule

Foremoz Fitness is:

- A vertical SaaS built on EventDB.
- A pilot real-world validation for event-driven operations.

It must remain:

- Focused.
- Opinionated.
- Operationally practical.

If expansion becomes too broad,
a new vertical must be created instead of inflating this one.