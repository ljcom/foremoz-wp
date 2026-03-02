# Foremoz Fitness Whitepaper v0.1 - Summary

## What Foremoz Fitness Is

Foremoz Fitness is a vertical SaaS for day-to-day fitness center operations. It targets gyms and fitness studios that need predictable workflows for membership, booking, attendance, and payment recording without expanding into heavy ERP scope.

The system is event-driven by design:
- EventDB is the write layer.
- Domain actions append immutable events.
- projections materialize read model tables for fast UI queries.

## Who It Serves

Primary tenants:
- Independent gyms.
- Boutique fitness studios.
- PT-focused studios.
- Multi-branch fitness operators.

Foremoz Fitness is optimized for operators that run recurring subscriptions, class schedules, PT session packages, and attendance control.

## Core Capabilities

Operational capabilities in v0.1 scope:
- Membership lifecycle: member onboarding, plan assignment, subscription activation/extension/freeze/unfreeze/expiry.
- Class booking: schedule-based booking, capacity control, cancellation, attendance confirmation.
- PT session operations: package assignment, session usage tracking, remaining session visibility.
- Attendance: QR check-in and manual check-in with daily totals.
- Payment recording and confirmation: admin-recorded payment flow with proof attachment and status confirmation.

## Why Event-Driven

Event-driven architecture is selected for operational reliability:
- Auditability: every business change is an event with timestamp, actor, and references.
- Scalability: write throughput is isolated in EventDB while projections scale read workload independently.
- Simplicity in ops: staff workflows remain simple while system history stays complete and reconstructable.
- Multi-tenant isolation: namespace + chain structure keeps tenant and branch streams clean.

## Minimal Deployment Model (PWA-first)

Foremoz Fitness deploys as a PWA-first product:
- PWA frontend for staff operations and check-in workflows.
- Gym API for command handling, validation, and event appends.
- EventDB for immutable writes.
- projector workers for projection checkpoints and read model updates.
- Postgres read model schema for query-first screens.

This keeps deployment lightweight and production-ready for fitness centers with limited IT complexity while preserving a clean path to multi-branch growth.
