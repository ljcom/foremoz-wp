# Foremoz Coach Whitepaper v0.2 - Summary

## What Foremoz Coach Is

Foremoz Coach adalah vertical SaaS untuk operasional dan pertumbuhan bisnis coach.
Surface utama adalah `coach.foremoz.com` sebagai micro-site promosi coach untuk mengubah koneksi personal menjadi peserta kelas/subscriber.

Write layer:
- EventDB append-only event stream.

Read layer:
- projector worker membentuk read model untuk funnel promosi, booking, subscription, dan performa coach.

## Product Positioning

Foremoz Coach bukan sekadar workspace internal.
Foremoz Coach adalah growth surface yang bisa dibagikan langsung ke jaringan coach melalui channel sosial.

## Product Surfaces

- `coach.foremoz.com`: coach micro-site + growth funnel + workspace.
- `coach.foremoz.com/a/<account>`: studio/account surface untuk operasional lokasi dari entry coach.
- `coach.foremoz.com/a/<account>/dashboard/pt`: PT workspace tenant dari entry coach.

Walaupun beberapa capability overlap dengan fitness workspace, jalur akses dan framing produk tetap dimulai dari coach POV.

## Core Journey

- coach publish micro-site.
- coach share link ke WhatsApp/Instagram/TikTok.
- calon member pilih kelas di lokasi tertentu.
- calon member langsung subscribe/join.
- event conversion tercatat dan diproyeksikan ke dashboard coach.

## Core Capabilities

- coach profile and offer publishing.
- class catalog by location.
- direct subscribe and class join flow.
- invitation network (`coach-member-studio`).
- conversion tracking dari source link/channel.
- support team mode untuk registrasi ulang onsite pada paket service tinggi.
- pricing tiers dengan free plan minimum sebagai entry default.

## Why Event-driven

- auditability: semua touchpoint promosi dan operasional tercatat immutable.
- replayability: funnel coach dapat di-rebuild dari event stream.
- scalability: write throughput terpisah dari read query load.
- operational clarity: growth funnel dan execution ops berada pada satu event model.
