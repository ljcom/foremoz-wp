# PROJECT_MEMORY.md
Foremoz – Fitness Vertical
Living Project Memory Document

---

## 1. Purpose of This Document

This file exists to preserve architectural clarity and strategic alignment.

Foremoz Fitness must not drift toward:
- Full ERP (Maxfora territory)
- Marketplace platform (Nitinoto territory)
- Custom per-client development model

This document ensures:
- Scope discipline
- Naming consistency
- Architectural integrity
- Strategic continuity

---

## 2. What Foremoz Is

Foremoz is a Vertical Operational SaaS Suite.

Foremoz Fitness is:

- A fitness center operational system.
- Event-driven.
- Multi-tenant.
- Multi-branch ready.
- Cloud-native.
- PWA-first.

It focuses on:

- Membership lifecycle
- Class booking
- Personal training session tracking
- Attendance logging
- Payment recording (operational level)

---

## 3. What Foremoz Is NOT

Foremoz is not:

- A full ERP platform.
- A marketplace.
- A public directory system.
- A customizable workflow engine.
- An accounting system.
- An inventory management system.

If a client requests deep customization:
→ That belongs to Maxfora.

If public storefront/distribution is needed:
→ That belongs to Nitinoto.

Foremoz remains a vertical operational product.

---

## 4. Architectural Commitments

The following decisions are locked:

1. EventDB is the write layer.
2. All domain actions generate immutable events.
3. Read models are projection-based.
4. No direct mutation-only storage logic.
5. Namespace-based tenant isolation.
6. Chain-based branch separation.
7. PWA-first deployment model.

Architecture must remain event-first.

---

## 5. Namespace & Structure Convention

Namespace format:

foremoz:fitness:<tenant_id>

Chain format:

branch:<branch_id>

If single-branch:
- Use chain: core

No alternative namespace patterns allowed without decision log entry.

---

## 6. Domain Boundaries

Foremoz Fitness covers:

- Member
- Subscription
- Class
- Booking
- PT Session
- Attendance
- Payment (recording + confirmation)

Out of scope:

- Payroll
- Inventory
- Retail POS
- Financial accounting
- Marketplace discovery
- Marketing automation

Scope creep is not allowed.

---

## 7. Relationship with Maxfora

Maxfora:
- Is the universal framework.
- May eventually subsume Foremoz verticals.
- Is heavier and customizable.

Foremoz:
- Is opinionated.
- Is standardized.
- Is faster to deploy.
- Is productized.

Foremoz must remain simpler than Maxfora.

---

## 8. Relationship with Nitinoto

Nitinoto:
- Handles public interaction surface.
- Handles lightweight commerce.
- Handles discovery and communication.

Foremoz:
- Handles operational lifecycle.
- Handles internal business process.
- Does not become a storefront system.

Integration allowed:
- Public booking links
- QR generation
- Payment link redirection

No deeper fusion allowed.

---

## 9. Product Philosophy

Foremoz Fitness must be:

- Operationally focused.
- Clean in UI.
- Predictable.
- Stable.
- Scalable across tenants.

It must not become:
- Feature-heavy.
- Custom per client.
- Workflow-experimental.

---

## 10. Evolution Rule

If Foremoz Fitness grows too broad:

→ Create a new vertical.
→ Do not inflate existing scope.

Future verticals may include:

- Clinic
- Salon
- Academy
- Coworking

Each vertical must have its own scope memory.

---

## 11. Version Discipline

Major architectural changes must:

- Be logged in DECISIONS.md
- Update namespace policy if needed
- Update projection model if changed
- Be backward compatible when possible

No silent structural changes allowed.

---

## 12. Strategic Intent

Foremoz Fitness serves as:

- Real-world validation of EventDB.
- First production vertical of Foremoz.
- Bridge between experimental engine and monetizable SaaS.

It is not a side project.
It is a structured operational product.