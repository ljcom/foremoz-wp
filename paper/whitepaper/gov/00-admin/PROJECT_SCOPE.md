# PROJECT_SCOPE.md
Foremoz Gov - Operational Coverage Definition

## 1. Objective

Foremoz Gov adalah dashboard governance lintas ekosistem Foremoz.
Tujuannya menyediakan kemampuan intervensi kebijakan tingkat platform yang dapat mempengaruhi seluruh tenant.

## 2. Core Governance Goals

- menonaktifkan/suspend akun tenant atau actor tertentu.
- mengubah harga dan policy monetisasi lintas tenant.
- memonitor aktivitas user dan pola anomali operasional.
- menyediakan laporan income dan performa agregat.
- melakukan policy enforcement dengan jejak audit lengkap.

## 3. Core Functional Coverage

### 3.1 Account Intervention

- tenant suspend/unsuspend.
- actor disable/enable.
- alasan dan effective time wajib dicatat.

### 3.2 Pricing and Policy Control

- global price baseline.
- tenant-level price override.
- promotion/policy override.

### 3.3 Monitoring and Risk

- user activity monitoring lintas role.
- suspicious behavior flags.
- operational health dashboard.

### 3.4 Income and Performance Reporting

- income aggregation lintas tenant.
- MRR/revenue trend.
- conversion and retention baseline.

### 3.5 Governance Audit

- semua aksi gov menjadi immutable events.
- approval trail untuk high-impact policy changes.
- replayable history untuk forensik.

## 4. Access Model

- gov dashboard bersifat internal dan restricted.
- bukan surface public.
- akses hanya untuk role governance yang terotorisasi.

## 5. Out of Scope

- operasional harian class/PT level tenant.
- member personal tracking.
- coach growth microsite operations.
