# Foremoz Gov Whitepaper v0.1 - Read Model

## Core Read Models

- `rm_gov_tenant_policy`
- `rm_gov_account_status`
- `rm_gov_user_activity`
- `rm_gov_income_summary`
- `rm_gov_alert`
- `rm_gov_audit_log`

## Read Model Definitions

### rm_gov_tenant_policy

- PK: `(tenant_id)`
- Query use: status tenant, pricing state, promotion policy.

### rm_gov_account_status

- PK: `(account_kind, account_id)`
- Query use: enable/disable state actor accounts.

### rm_gov_user_activity

- PK: `(activity_id)`
- Query use: monitoring aktivitas user lintas tenant.

Columns minimum:
- `activity_id`
- `tenant_id`
- `user_id`
- `user_role`
- `action_type`
- `risk_level`
- `event_ts`

### rm_gov_income_summary

- PK: `(period)`
- Query use: laporan income agregat lintas tenant.

Columns minimum:
- `period`
- `gross_income`
- `net_income`
- `active_tenant_count`
- `updated_at`

### rm_gov_alert

- PK: `(alert_id)`
- Query use: daftar alert aktif/selesai dan SLA response.

### rm_gov_audit_log

- PK: `(audit_id)`
- Query use: jejak aksi governance, approval, dan actor attribution.

## Projection Notes

- projector subscribe by namespace + chain.
- handler wajib idempotent.
- read model adalah query source, bukan write source of truth.
- audit projection harus lengkap untuk semua action governance.
