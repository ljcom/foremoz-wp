# 3. Event Engine

Event Engine adalah jantung Foremoz.

**In Foremoz, the event is the atomic unit of activity, interaction, and monetization.**

## Universal Event Structure

Setiap event memiliki elemen minimum:
- creator
- participant set
- host/venue context
- time
- location
- capacity
- policy and pricing

## Universal Lifecycle

- create event
- publish event
- participants join
- check-in/attendance
- event completed
- feedback/distribution

## Event-Driven Economic Flows

Monetisasi berjalan melalui struktur event-driven, termasuk:
- ticket sales
- booking fees
- class/session fees
- subscriptions linked to activity
- sponsorship
- merchandise/add-ons
- venue revenue share

## Event URL as First-class Entity

Event memiliki identitas URL sendiri agar ownership, discovery, dan operasi terpisah jelas:
- operating route: `tenant.foremoz.com/a/<account>/events/<event_id>`
- public route: `foremoz.com/e/<event_slug>`
- public vanity option: `<account>.foremoz.com/<event_slug>`
