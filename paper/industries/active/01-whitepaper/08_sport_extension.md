# Foremoz Active - Sport Extension

Dokumen ini adalah ekstensi domain sport di dalam vertikal **active**.

## Scope
- Event olahraga kompetitif dan non-kompetitif
- Booking, registration, attendance, leaderboard/event result
- Komunitas peserta dan performer/event host

## Relation to General WP
- Architecture, actor model, dan identity mengikuti dokumen general:
  - `paper/general/01-whitepaper/foremoz-event-os-whitepaper-v1.md`
- Sponsorship untuk saat ini mengikuti framework di whitepaper general.

## 1. Event Competition Layer

Sport tidak hanya latihan, tetapi juga kompetisi.

### 1.1 Tournament / League Management
- create tournament
- bracket management
- round robin league
- knockout system
- match scheduling

Contoh:
- Badminton Open Sunter
- 32 players
- Single elimination

### 1.2 Match Management
- match creation
- court assignment
- score recording
- match referee

Contoh:
- Court 3
- Arman vs Budi
- Score 21-17

### 1.3 Ranking System
- player ranking
- league table
- ELO rating
- season ranking

Contoh:
- Badminton Ranking Sunter
- #1 Arman
- #2 Budi

## 2. Team Management Layer

Sport sering melibatkan team, bukan hanya individu.

Fitur:
- create team
- join team
- team roster
- team captain
- team stats

Contoh:
- Team Garuda
- Players: 8
- Captain: Arman

## 3. Venue / Field Booking

Sport sangat bergantung pada venue availability.

Fitur:
- court booking
- field booking
- match schedule
- venue availability

Contoh:
- Badminton Court
- 20:00-22:00

## 4. Performance Tracking

Sport memiliki performance data.

Contoh data:
- match history
- win/loss record
- personal best
- training logs

Contoh ringkas:
- Matches: 20
- Wins: 15
- Losses: 5

## 5. Referee / Official Layer

Beberapa sport membutuhkan official roles:
- referee
- judge
- time keeper
- score keeper

Mereka juga bisa memiliki profile di platform.

## 6. Community League

Sport sangat cocok dengan community league system.

Contoh:
- Sunday Basketball League
- Amateur Badminton League
- Running Club Championship

Fitur:
- season
- team standings
- fixtures
- statistics

## 7. Sponsorship Activation

Sport sangat menarik bagi sponsor.

Contoh slot:
- title sponsor
- jersey sponsor
- equipment sponsor
- hydration partner

Contoh event:
- Sunter Basketball League
- Sponsored by Nike

## 8. Media / Content Layer

Sport memiliki nilai media yang besar.

Fitur:
- match highlight
- live score
- event recap
- photo gallery

Member bisa share:
- scored winning goal
- won tournament

## 9. Athlete Passport

Passport di sport bisa sangat kuat sebagai digital athlete profile.

Passport menyimpan:
- player history
- match history
- ranking
- performance record
- teams played

Contoh:
- Arman
- Sport: Badminton
- Matches: 45
- Wins: 32

## 10. Equipment Marketplace

Sport juga membuka peluang commerce.

Contoh:
- equipment sale
- team merchandise
- sports gear

Misalnya:
- badminton racket
- team jersey
- running shoes

## 11. Coaching Layer

Coach tetap relevan di sport.

Fitur:
- training session
- private coaching
- team training
- skills workshop

## 12. Tournament Organizer Layer

Actor tambahan:
- organizer
- league operator
- sports association

Mereka bisa membuat:
- tournament
- league
- championship

## 13. Spectator Layer

Sport juga memiliki penonton.

Fitur:
- spectator ticket
- fan following
- match attendance

## 14. Sport Vertical yang Paling Cocok

Community sport:
- badminton
- tennis
- basketball
- futsal
- running
- cycling

Skill sport:
- martial arts
- climbing
- skateboarding
- surfing

## 15. Kenapa Sport Vertical Kuat

Sport memiliki:
- competition
- community
- identity
- status
- data

Ini membuat platform sangat engaging.

## 16. Posisi Sport di Foremoz

Jika digabung dengan konsep Event OS:
- Fitness
- Sport
- Tournament
- Community

Semua tetap berbasis event.

## Kesimpulan

Sport vertical bisa menambahkan banyak fungsi baru:
- tournament
- league
- ranking
- team
- match management
- performance stats
- equipment commerce
- spectator layer

Namun semuanya tetap dibangun di atas Event OS yang sama.
