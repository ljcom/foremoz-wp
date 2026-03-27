# Foremoz Gov Whitepaper v0.1 - Scope

## Objective

Menyediakan dashboard governance yang dapat melakukan intervensi lintas tenant secara terkontrol dan dapat diaudit.

## In Scope

- account intervention:
  - disable/enable actor
  - suspend/unsuspend tenant
- pricing and policy:
  - global pricing policy
  - tenant-level price override
  - promotion policy controls
- monitoring:
  - user activity telemetry
  - anomaly and abuse indicators
  - operational status lintas tenant
- financial reporting:
  - income dashboard
  - MRR/revenue trend
  - collection summary
- governance audit and approval trace.

## Canonical Surface Model

- Gov adalah internal dashboard khusus governance roles.
- Gov tidak termasuk public routing surface untuk user umum.
- akses dibatasi berdasarkan role + approval policy.

## Out of Scope

- tenant daily operations (class/PT handling).
- coach microsite growth operations.
- member personal tracking workflows.
