# PROJECT_SCOPE.md
Foremoz Coach - Operational Coverage Definition

## 1. Objective

Foremoz Coach adalah produk operasional untuk coach dengan core surface `coach.foremoz.com`.
Goal utamanya adalah membantu coach mempromosikan layanan, mengajak koneksi bergabung, dan mengkonversi audience menjadi subscriber/member class.

## 2. Primary Actors

- coach
- member (passport)
- studio (place)
- coach support team (opsional, untuk paket service tinggi)

## 2.1 RBAC Canonical Terms (Aligned with Fitness)

- `owner`: pemilik tenant/bisnis, kontrol tertinggi konfigurasi.
- `admin`: pengelola operasional tenant.
- `sales`: pengelola lead, conversion, dan pipeline komersial.
- `cs`: operator administratif/frontdesk/support.
- `pt`: coach practitioner role (termasuk partner coach).
- `member`: end-user peserta layanan.
- `gov`: governance role lintas kebijakan platform.

Mapping istilah coach management:
- `partner (coach)` -> gunakan role canonical `pt`.
- `coach support team` -> gunakan role canonical `cs` (dan dapat diberi privilege tambahan terbatas).

## 3. Core Functional Coverage

### 3.1 Coach Promotion Micro-site

- public profile coach.
- list kelas dan paket layanan.
- class by location.
- CTA subscribe/join.
- share-ready links untuk WhatsApp/Instagram/TikTok.

### 3.2 Join and Subscription Flow

- member open micro-site.
- pilih kelas atau paket di lokasi tertentu.
- subscribe/join langsung.
- booking dan attendance trace.

### 3.3 Invitation and Network Growth

- coach invite member.
- coach invite studio.
- studio invite coach.
- member invite friend.

### 3.4 Support Team Operations (Higher Service Tier)

- coach dapat menambahkan tim operator.
- tim melakukan registrasi ulang member di lokasi.
- tim membantu check-in, validasi data, dan follow-up conversion onsite.

## 4. Multi-tenant Model

- namespace: `foremoz:coach:<tenant_id>`
- chain: `branch:<branch_id>` atau `core`

## 5. Out of Scope

- payroll.
- inventory.
- deep accounting.
- heavy CRM automation.
- marketplace aggregator lintas platform.
