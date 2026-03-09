# Whitepaper Alignment - Fitness

Dokumen ini menandai implementasi baseline yang sudah disejajarkan dengan whitepaper terbaru.

## Applied

- Interaction network events (`invitation.*`, `coach.member.linked`, dll).
- Passport projection (`rm_passport_profile`).
- Sales/PT/payment/history read models.
- Tenant policy/performance read models.
- RBAC canonical naming alignment.
- Gov route dikeluarkan dari public Vite routing fitness app.
- Namespace runtime disederhanakan ke `foremoz:<tenant_id>`.
- Endpoint read model tambahan: `actor-network`, `invitations`, `tenant/policy`, `tenant/performance`, `payments/history`, `pt-activity`, `sales/prospects`, `passport-profiles`.
- Projection handler tambahan untuk event `gov.*`, `invitation.*`, `sales.*`, `passport.*`, dan `pt.activity.*`.

## Next Build Tasks

- sinkronkan API commands agar mengemit seluruh event whitepaper.
- integrate pricing plan guardrails ke owner workspace.
