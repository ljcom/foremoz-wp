# Foremoz Tourism Whitepaper v0.3 - Interaction Network

## Core Relationship

Performer <-> Participant <-> Venue

## Growth Mechanism

- invitation flow antar actor
- follow/fan/community relation
- read model network untuk relasi active/pending

## Identity Implication

- passport dipakai untuk portable identity
- actor profile dapat diekspos via subdomain vertical

## Gamification Framework (Yukai Chou Octalysis)

Untuk meningkatkan repeat trip dan community participation, Tourism menerapkan gamification berbasis 8 Core Drives Octalysis:
- epic meaning: traveler berkontribusi pada eksplorasi lokal dan komunitas destinasi
- accomplishment: milestone destinasi, streak perjalanan, completion itinerary/challenge
- empowerment: traveler memilih route/challenge sesuai minat dan profil perjalanan
- ownership: history perjalanan, collectible badge, dan travel reputation di Passport
- social influence: group trip, referral teman, leaderboard komunitas traveler
- scarcity: akses terbatas untuk slot tour/experience eksklusif
- unpredictability: surprise destination challenge, seasonal campaign, mystery reward
- avoidance: reminder booking window, warning benefit expiry, re-engagement nudges

Guardrail implementasi:
- reward hanya diberikan dari aktivitas tervalidasi (`registration.created`, `checkin.logged`, `event.completed`)
- mekanisme gamification tidak boleh mendorong abuse booking/check-in
- reputasi dan badge harus dapat ditelusuri lewat event log dan read model
- insentif difokuskan ke outcome Tourism (repeat visit, destination completion, local engagement)
