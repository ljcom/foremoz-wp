# Foremoz Learning Whitepaper v0.3 - Interaction Network

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

Untuk menjaga completion rate dan keterlibatan belajar, Learning menerapkan gamification berbasis 8 Core Drives Octalysis:
- epic meaning: learner berkontribusi pada misi pembelajaran komunitas
- accomplishment: progress modul, streak belajar, milestone course/session selesai
- empowerment: learner memilih learning path, format kelas, dan target kompetensi
- ownership: transcript aktivitas, badge kompetensi, dan reputasi tersimpan di Passport
- social influence: peer cohort, mentor relation, referral belajar, leaderboard cohort
- scarcity: akses terbatas untuk kelas/mentor tertentu berbasis kriteria
- unpredictability: surprise quiz, seasonal challenge, dynamic learning campaign
- avoidance: reminder jadwal, warning streak loss, dan expiry benefit

Guardrail implementasi:
- reward harus diturunkan dari data tervalidasi (`registration.created`, `checkin.logged`, `event.completed`)
- mekanisme gamification tidak boleh mendorong penyelesaian semu tanpa outcome belajar
- score/certificate harus dapat diaudit melalui event log dan read model
- insentif diprioritaskan untuk outcome Learning (completion, consistency, skill progression)
