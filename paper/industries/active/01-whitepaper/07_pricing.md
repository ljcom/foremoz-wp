# Foremoz Active Whitepaper v0.3 - Pricing Model

## Purpose

Menetapkan model pricing untuk tenant fitness/studio dengan entry barrier rendah dan jalur scale bertahap.
Prinsip utama: selalu ada versi gratis untuk minimum fitur.

## Pricing Principles

- free tier wajib tersedia untuk adopsi awal tenant kecil.
- upgrade berbasis kebutuhan operasional (member volume, branch, analytics, role depth).
- batas tiap tier harus transparan.
- upgrade/downgrade dapat dilakukan self-serve oleh owner.

## Proposed Package Structure

### Free

Target:
- studio kecil/single location yang baru onboarding.

Minimum features:
- membership basic.
- class booking basic.
- check-in basic.
- dashboard operasional ringkas.

Limits:
- 1 branch.
- kuota active member terbatas.
- role seats terbatas.

### Starter

Target:
- studio yang sudah running stabil dengan volume member awal.

Features:
- semua fitur Free.
- limit member/booking lebih tinggi.
- payment queue + history lebih lengkap.
- role management basic.

### Growth

Target:
- tenant dengan beban operasional dan tim lebih besar.

Features:
- semua fitur Starter.
- advanced dashboard and cohort metrics.
- sales pipeline operational depth.
- access guard lebih granular.

### Multi-branch

Target:
- operator fitness multi cabang.

Features:
- semua fitur Growth.
- multi-branch controls.
- branch performance dashboard.
- branch-level policy and access templates.

### Enterprise

Target:
- operator besar dengan governance dan compliance requirement tinggi.

Features:
- semua fitur Multi-branch.
- advanced governance integration.
- enhanced support and SLA.
- custom reporting/export requirements.

## Judgment Pricing (Indonesia Baseline)

Pricing baseline yang direkomendasikan:

- `Free`: `Rp0` / bulan
- `Starter`: `Rp499.000` / bulan
- `Growth`: `Rp1.490.000` / bulan
- `Multi-branch`: `Rp3.490.000` / bulan
- `Enterprise`: custom (mulai sekitar `Rp7.500.000+` / bulan)

Add-on baseline:

- additional admin/cs seat: `Rp79.000` / seat / bulan
- additional branch pack: `Rp299.000` / branch / bulan
- advanced analytics add-on: `Rp249.000` / bulan

## Pricing Judgment Rationale

- `Free` menjaga adopsi awal operator kecil tanpa komitmen biaya.
- `Starter` diposisikan untuk mayoritas gym kecil-menengah yang butuh core operations stabil.
- `Growth` cocok untuk operator yang mulai menuntut analytics dan kontrol operasional lebih tajam.
- `Multi-branch` memberi nilai utama di orkestrasi cabang dan reporting terpusat.
- `Enterprise` untuk requirement compliance, governance, dan SLA tingkat tinggi.

Angka ini adalah baseline go-to-market Indonesia dan harus divalidasi rutin terhadap activation, paid conversion, ARPA, dan churn.

## Guardrails

- Free tier tidak boleh dihapus.
- minimum fitur free harus cukup untuk menjalankan operasional dasar studio.
- perubahan harga harus melewati review dampak terhadap unit economics dan adoption rate.
