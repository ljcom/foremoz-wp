# PROJECT_MEMORY.md
Foremoz Gov - Living Project Memory

## 1. Purpose

Dokumen ini menjaga Foremoz Gov tetap fokus sebagai governance control plane, bukan workspace operasional harian.

## 2. Product Positioning

Foremoz Gov adalah:

- platform-level policy and monitoring dashboard.
- high-impact intervention surface.
- event-driven dan audit-first.

Foremoz Gov bukan:

- public-facing portal.
- tenant operational app.
- marketing/growth workspace.

## 3. Locked Architecture Decisions

1. Seluruh aksi gov dicatat sebagai immutable event.
2. High-risk action wajib approval metadata.
3. Monitoring read model terpisah dari policy write path.
4. Gov access bersifat restricted dan tidak dibuka ke publik.
5. Semua override harus reversible secara event-driven.

## 4. Security and Risk Position

Karena Gov dapat mengintervensi seluruh kebijakan Foremoz, kebocoran akses berisiko tinggi.
Konsekuensi ini harus tercermin pada design auth, audit, dan operational SOP.

## 5. Evolution Rule

Jika fitur tidak membutuhkan wewenang lintas tenant/platform, fitur tersebut tidak boleh masuk scope Gov.
