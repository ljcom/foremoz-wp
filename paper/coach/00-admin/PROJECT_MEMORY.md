# PROJECT_MEMORY.md
Foremoz Coach - Living Project Memory

## 1. Purpose

Dokumen ini menjaga Foremoz Coach tetap fokus sebagai coach growth dan coach operations product.

## 2. Product Positioning

Foremoz Coach adalah:

- coach promotion + conversion infrastructure.
- event-driven.
- multi-tenant ready.
- invitation-network aware.
- terintegrasi dengan member identity (passport) tanpa menjadikan passport sebagai fokus utama dokumen.

Foremoz Coach bukan:

- full ERP.
- accounting platform.
- generic marketplace.

## 3. Locked Architecture Decisions

1. EventDB sebagai write layer.
2. Semua aksi domain menjadi immutable events.
3. Projection worker membentuk read model.
4. Tenant isolation via namespace.
5. Branch partition via chain.
6. `coach.foremoz.com` adalah primary domain untuk growth funnel coach.
7. Support team flow tersedia sebagai capability tiered service.
8. Model komersial wajib menyediakan free tier permanen untuk minimum fitur.

## 4. Identity Domain Commitments

- `coach.foremoz.com` untuk micro-site, invite funnel, dan coach workspace.
- member tetap direpresentasikan sebagai passport identity di layer user, namun bukan pusat bahasan dokumen ini.

## 5. Evolution Rule

Jika kebutuhan keluar dari coach growth + operations core, buat vertical terpisah.
