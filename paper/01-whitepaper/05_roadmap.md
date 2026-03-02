# Foremoz Fitness Whitepaper v0.1 - Roadmap

## Phase 1 - Core Ops Baseline

Scope:
- membership lifecycle.
- check-in (QR + manual).
- manual payment recording + confirmation queue.
- basic operational dashboard.

Output:
- Stable event types for member/subscription/payment/checkin.
- Core read model tables and projector checkpoints in production.
- PWA workflows usable by front desk and admin.

## Phase 2 - Booking Expansion

Scope:
- class scheduling and class booking.
- guest booking flow.
- reminder pipeline (lightweight notification integration).

Output:
- Capacity-safe booking operations.
- Availability and booking list read models.
- Improved attendance linkage between booking and class sessions.

## Phase 3 - PT + Multi-Branch + Integrations

Scope:
- PT package and PT session tracking.
- multi-branch operational visibility under one tenant.
- integration hooks (payment channel sync and notification providers).

Output:
- PT balance tracking and PT session completion flow.
- Branch-aware dashboard and reporting projections.
- Controlled external integrations without expanding to ERP scope.
