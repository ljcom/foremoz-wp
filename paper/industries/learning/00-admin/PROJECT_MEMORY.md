# PROJECT_MEMORY.md
Foremoz Learning – Living Memory

## Purpose
Menjaga konsistensi scope, istilah, dan arah arsitektur untuk vertikal Learning.

## Product Positioning
Foremoz Learning adalah vertical event operating model untuk aktivitas belajar:
- event-driven
- projection-based
- identity-linked via Passport

## Architecture Commitments
- EventDB sebagai immutable write layer
- Projection sebagai sumber read model
- Multi-tenant isolation via namespace
- Program -> Session -> Participant sebagai struktur inti

## Evolution Rule
Jika cakupan learning melebar:
- pecah capability per domain
- jaga boundary tetap jelas
