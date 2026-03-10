# PROJECT_MEMORY.md
Foremoz Home – Living Memory

## Purpose
Menjaga konsistensi scope, istilah, dan arah arsitektur untuk vertikal Home.

## Product Positioning
Foremoz Home adalah vertical event operating model yang:
- event-driven
- projection-based
- identity-linked via Passport

## Architecture Commitments
- EventDB sebagai immutable write layer
- Projection sebagai sumber read model
- Multi-tenant isolation via namespace
- No silent schema drift

## Evolution Rule
Jika cakupan vertikal Home melebar melebihi domain inti:
- buat sub-vertical atau capability baru
- jangan mencampur domain tanpa boundary yang jelas
