# Whitepaper Alignment - Fitness

Dokumen ini menandai implementasi baseline yang sudah disejajarkan dengan whitepaper terbaru.

## Whitepaper Addition (Experience Network)

### 1.1 Identity Layer: Passport

Foremoz memperkenalkan Passport sebagai identity layer universal lintas vertical.

Passport adalah identitas digital persisten yang mencatat partisipasi, aktivitas, dan kapabilitas user di ekosistem Foremoz.

Setiap actor memiliki Passport:
- Creator
- Participant
- Host
- Sponsor

Role bersifat kontekstual. Satu Passport dapat memiliki multi-role berdasarkan konteks event.

Contoh lifecycle:
- participant -> creator -> institution

### 1.2 Creator-Led Platform Model

Foremoz memprioritaskan model creator-led, bukan institution-first.

Traditional:
- institution -> member -> activities

Foremoz:
- creator -> experience -> participant -> community

Host (gym, venue, gallery, studio, tour location) diposisikan sebagai infrastruktur pendukung, bukan selalu pemilik relasi utama.

### 1.3 Core Platform Objects

Core primitives lintas vertical:
- Passport (identity)
- Experience (event/class/session/tour/show)
- Participation (join/check-in/attendance)
- Offering (ticket/package/product)
- Transaction (payment/revenue share)

Vocabulary bisa berbeda per vertical, struktur tetap sama.

### 1.4 Passport as Social Node

Passport bukan sekadar profile, melainkan node dalam experience network.

Relasi:
- follow creator
- follow participant
- follow host

Feed sosial berbasis experience:
- created
- joined
- attended

### 1.5 Social Media Bridge

Passport menjadi conversion landing page dari social media.

Flow umum:
- creator posting di IG/TikTok/WA
- audience klik link Passport
- lihat upcoming events
- register
- attend
- community grows

Passport berfungsi sebagai:
- identity
- portfolio
- event hub
- conversion page

### 1.6 Passport Public Page

Creator Passport modules:
- Identity (avatar, bio, roles, location, verified links)
- Upcoming Experiences
- Programs
- Reputation
- Community
- Activity Feed

Member Passport fokus:
- experience history
- achievements
- followed creators
- community interactions

### 1.7 Creator Growth Loop

Growth loop:
- creator creates event
- creator promotes event
- participants register
- participants attend
- passport records history
- community expands
- next event easier to fill

### 1.8 Vertical Structure

Vertical yang didukung:
- ACTIVE
- LEARNING
- PERFORMANCE
- ARTS
- TOURISM

Setiap vertical memakai primitives sama, hanya vocabulary berbeda.

### 1.9 Strategic Positioning

Foremoz diposisikan sebagai:
- creator-led experience network

Bukan sekadar:
- gym management software

### 1.10 Core Thesis

Foremoz adalah Experience Network Platform:
- Passport = identity
- Experience = activity
- Event = transaction
- Community = growth engine

## Applied

- Interaction network events (`invitation.*`, `coach.member.linked`, dll).
- Passport projection (`rm_passport_profile`).
- Sales/PT/payment/history read models.
- Tenant policy/performance read models.
- RBAC canonical naming alignment.
- Gov route dikeluarkan dari public Vite routing fitness app.
- Namespace runtime disederhanakan ke `foremoz:<tenant_id>`.
- Endpoint read model tambahan: `actor-network`, `invitations`, `tenant/policy`, `tenant/performance`, `payments/history`, `pt-activity`, `sales/prospects`, `passport-profiles`.
- Projection handler tambahan untuk event `gov.*`, `invitation.*`, `sales.*`, `passport.*`, dan `pt.activity.*`.

## Next Build Tasks

- sinkronkan API commands agar mengemit seluruh event whitepaper.
- integrate pricing plan guardrails ke owner workspace.
