# Foremoz Performance Whitepaper v0.3 - Interaction Network

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

Untuk meningkatkan repeat attendance dan fan engagement, Performance menerapkan gamification berbasis 8 Core Drives Octalysis:
- epic meaning: fans dan performer berkontribusi pada growth komunitas kreatif
- accomplishment: milestone attendance, streak support, completion campaign/show series
- empowerment: participant memilih track engagement (attend, support, share, collaborate)
- ownership: history show, collectible badge, dan reputasi fan/performer di Passport
- social influence: follow performer, community leaderboard, referral antar fan
- scarcity: akses terbatas untuk show/seat/experience tertentu
- unpredictability: surprise drop, limited challenge, dynamic fan campaign
- avoidance: reminder event series, warning streak loss, expiry reward nudges

Guardrail implementasi:
- reward harus berbasis aktivitas tervalidasi (`registration.created`, `checkin.logged`, `event.completed`)
- desain gamification tidak boleh mendorong bot/spam engagement
- reputasi, badge, dan score harus auditabel melalui event log + read model
- insentif diprioritaskan ke outcome Performance (attendance berulang, fan retention, creator support)
