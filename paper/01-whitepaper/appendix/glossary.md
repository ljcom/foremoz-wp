# Glossary

- namespace: tenant-isolated event domain (`foremoz:fitness:<tenant_id>`).
- chain: stream partition (`branch:<branch_id>` atau `core`).
- event: immutable record di EventDB write layer.
- projection: proses membentuk read model dari event stream.
- read model: tabel/view query-optimized untuk layar operasional.
- tenant: akun bisnis gym/studio.
- branch: unit lokasi operasional tenant.
- subscription: entitlement membership berbasis periode.
- booking: reservasi slot class atau PT session.
- PT session: unit sesi personal training.
- owner page: `fitness.foremoz.com/web/owner` untuk setup tenant dan kontrol owner.
- public account page: `fitness.foremoz.com/a/<account>` untuk promosi dan conversion.
- prospect: calon member di pipeline sales CRM.
- gov console: surface lintas tenant untuk policy dan performance control.
