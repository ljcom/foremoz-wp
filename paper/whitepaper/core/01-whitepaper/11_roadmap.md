# 11. Platform Roadmap

## Phase 1
- stabilisasi core Event OS
- commercial rollout: Active
- expansion baseline: Learning dan Performance
- passport linkage baseline

## Phase 2
- Tourism Lite rollout, kemudian bertahap ke model tourism yang lebih kompleks
- sponsorship activation layer per vertical
- advanced collaboration policy templates

## Phase 3
- cross-vertical discovery and recommendation
- deeper interoperability antar vertical
- ecosystem-level analytics and benchmarking

## Stage Implementation (Operational Rollout Gate)

Untuk deployment bertahap di environment produk, Foremoz menerapkan `STAGE` sebagai gate fitur:
- STAGE 1: fokus vertical Fitness; language, Passport, dan surface `/events` dinonaktifkan.
- STAGE 2: membuka semua vertical modules (fitness, sport, learning, performance, arts, tourism).
- STAGE 3: mengaktifkan Passport + `/events` sebagai identity/discovery surface.
- STAGE 4: mengaktifkan language switcher untuk multi-language surface.

Prinsip implementasi:
- stage lebih tinggi mewarisi capability stage sebelumnya.
- gate dilakukan di layer routing/surface terlebih dahulu untuk mengurangi risiko operasional saat rollout.
- aktivasi tiap stage harus diikuti verifikasi KPI adopsi dan stabilitas sebelum naik tahap berikutnya.
