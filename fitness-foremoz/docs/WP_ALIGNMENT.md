# Whitepaper Alignment - Fitness

Dokumen ini menandai implementasi baseline yang sudah disejajarkan dengan whitepaper terbaru.

## Applied

- Interaction network events (`invitation.*`, `coach.member.linked`, dll).
- Passport projection (`rm_passport_profile`).
- Sales/PT/payment/history read models.
- Tenant policy/performance read models.
- RBAC canonical naming alignment.
- Gov route dikeluarkan dari public Vite routing fitness app.

## Next Build Tasks

- implement projector handlers untuk event types baru.
- sinkronkan API commands agar mengemit seluruh event whitepaper.
- tambah endpoint read untuk read model baru (`rm_actor_network`, `rm_payment_history`, dll).
- integrate pricing plan guardrails ke owner workspace.
