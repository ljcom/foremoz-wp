# Glossary

- gov: governance authority layer untuk kontrol kebijakan lintas tenant.
- governance action: tindakan intervensi policy berdampak platform-wide.
- tenant suspension: pembatasan operasional tenant oleh otoritas gov.
- account disable: penonaktifan actor account berdasarkan kebijakan/risk.
- policy override: perubahan aturan default untuk tenant atau platform.
- income summary: agregasi pendapatan lintas tenant untuk analisis kebijakan.
- audit log: jejak immutable seluruh aksi gov beserta actor dan reason.
- namespace: domain event isolasi (`foremoz:gov:platform`).
- chain: stream partition (`core`).
- projection: proses pembentukan read model dari event stream.
- read model: query-optimized state untuk monitoring dan kontrol kebijakan.
