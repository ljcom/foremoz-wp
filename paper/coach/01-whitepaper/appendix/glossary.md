# Glossary

- coach microsite: halaman promosi coach di `coach.foremoz.com/<coach_handle>`.
- member: peserta kelas/layanan coach; secara identity direpresentasikan sebagai passport.
- studio (place): lokasi operasional kelas dan aktivitas olahraga.
- subscription: proses join paket/layanan coach dari micro-site.
- invitation network: pertumbuhan jaringan melalui undangan antar actor.
- support team: tim operasional coach untuk registrasi ulang dan bantuan onsite.
- rbac canonical roles: `owner`, `admin`, `sales`, `cs`, `pt`, `member`, `gov`.
- partner coach: istilah bisnis, dipetakan ke role `pt`.
- free tier: paket gratis permanen dengan minimum fitur.
- starter/growth/pro-team: paket berbayar bertingkat sesuai kebutuhan scale coach.
- namespace: tenant-isolated event domain (`foremoz:coach:<tenant_id>`).
- chain: stream partition (`branch:<branch_id>` atau `core`).
- event: immutable record di EventDB write layer.
- projection: proses membentuk read model dari event stream.
- read model: tabel/view query-optimized untuk growth dan operasional coach.
