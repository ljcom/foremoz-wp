# 2a. Identity and Surface Model

Foremoz memisahkan jelas identity layer, operating layer, dan public event layer.

## Identity Layer

- `passport.foremoz.com/<account>`

Memuat:
- profile
- roles
- reputation
- history
- verification
- network
- consent

## Operating Layer

- `tenant.foremoz.com/a/<account>`
- `tenant.foremoz.com/a/<account>/events/<event_id>`

Memuat:
- dashboard
- admin
- event management
- collaboration
- payment
- sponsorship operations

## Public Layer

Foremoz mendukung dua model public surface:
- route model: `foremoz.com/<vertical>/<account>` dan `foremoz.com/e/<event_slug>`
- vanity model: `<account>.foremoz.com/<event_slug>`

Dokumen platform sengaja mendukung keduanya agar implementasi go-to-market fleksibel.
