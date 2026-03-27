# Foremoz Gov Whitepaper v0.1 - Event Model

## Canonical Event Envelope

```json
{
  "type": "event.type",
  "actor": { "kind": "gov|system", "id": "..." },
  "subject": { "kind": "entity", "id": "..." },
  "data": {},
  "refs": {},
  "ts": "2026-03-06T10:00:00Z"
}
```

Required fields:
- `type`
- `actor`
- `subject`
- `data`
- `refs`
- `ts`

## Minimum Event Types

Account and tenant intervention:
- `gov.tenant.suspended`
- `gov.tenant.unsuspended`
- `gov.account.disabled`
- `gov.account.enabled`

Policy and pricing:
- `gov.price.baseline.updated`
- `gov.tenant.price.updated`
- `gov.promotion.policy.updated`

Monitoring and risk:
- `gov.user.activity.flagged`
- `gov.anomaly.detected`
- `gov.alert.created`
- `gov.alert.resolved`

Income and reporting:
- `gov.income.snapshot.recorded`
- `gov.income.adjustment.recorded`

Governance process:
- `gov.action.approval.requested`
- `gov.action.approved`
- `gov.action.rejected`

## Required Field Highlights

- `gov.tenant.suspended`: `tenant_id`, `reason`, `effective_at`, `approved_by`.
- `gov.account.disabled`: `account_id`, `account_kind`, `reason`, `effective_at`.
- `gov.tenant.price.updated`: `tenant_id`, `old_price`, `new_price`, `effective_at`, `reason`.
- `gov.user.activity.flagged`: `flag_id`, `user_id`, `risk_level`, `signal`, `detected_at`.
- `gov.income.snapshot.recorded`: `snapshot_id`, `period`, `gross_income`, `net_income`, `currency`.
- `gov.action.approved`: `action_id`, `approved_by`, `approved_at`, `notes`.

Sample payload tersedia di `appendix/sample_event_payload.json`.
