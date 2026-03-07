# Foremoz Tourism Whitepaper (Industry Draft)

Dokumen ini adalah whitepaper industry-level untuk vertikal **tourism**.

## Positioning

Tourism ditetapkan sebagai **Phase 2**.

Alasan:
- Tourism memiliki kompleksitas operasional tertinggi.
- Banyak komponen lintas pihak (guide, transport, akomodasi, tiket atraksi, insurance, group management, multi-day schedule).

Contoh kompleksitas:
- 3D2N Komodo Trip
- Guide
- Boat
- Hotel
- Island tickets
- Meals

Ini jauh lebih kompleks dibanding:
- Yoga class
- AI workshop
- Comedy show

## Scope
- Phase 2 full tourism model: itinerary execution, checkpoint attendance, package orchestration
- Fase awal disiapkan sebagai Tourism Lite (experience tour)

## Relation to General WP
- Architecture, actor model, dan identity mengikuti dokumen general:
  - `paper/general/01-whitepaper/foremoz-event-os-whitepaper-v1.md`
- Sponsorship untuk saat ini mengikuti framework di whitepaper general.

## Tourism Lite (Recommended Entry)

Daripada langsung ke full travel package, entry paling aman adalah **experience tour**:
- city walking tour
- food tour
- photography tour
- museum tour
- bike tour

Contoh event:
- Jakarta Old Town Walking Tour
- Saturday 08:00
- Guide: Arman
- Max: 20 participants

Struktur ini masih mirip vertical lain dan lebih cepat dioperasikan di Event OS.

## Actor Model (Tourism Lite)

Actor utama:
- Guide (performer)
- Participant (member)
- Place (venue)
- Brand (sponsor)

## Passport Integration

Passport tourism dapat menyimpan:
- places visited
- tours joined
- countries visited
- guides followed

Contoh:
- Komodo Island Tour ✓
- Borobudur Sunrise Tour ✓
- Bali Food Tour ✓

Ini membentuk travel identity.

## Monetization

Sumber monetisasi tourism:
- tour ticket
- package price
- equipment rental
- sponsor
- affiliate hotel

Contoh:
- Food Tour Jakarta
- $40 per person

## Roadmap Recommendation

Fase realistis:

### Phase 1 (Core Stabilization)
- fitness
- learning
- performance

Alasan:
- performer-driven
- event structure lebih sederhana
- monetisasi jelas

### Phase 2 (Complex Expansion)
- sport
- tourism

## Universal Event Insight

Semua vertical pada dasarnya punya pola yang sama:
- someone performs
- someone attends
- at a place
- at a time

Artinya tourism tetap kompatibel dengan model Event OS universal, hanya menambah kompleksitas orchestration.

## Kesimpulan

Vertical yang dipertahankan:
- fitness
- sport
- learning
- performance
- tourism

Namun untuk eksekusi produk:
- Tourism masuk **Phase 2**
- Mulai dari **Tourism Lite** sebelum full package orchestration
