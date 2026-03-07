# Glossary

- passport: identitas olahraga personal milik member.
- member: individu yang join/subscribe layanan coach dan studio.
- subscription portfolio: kumpulan subscription aktif participant lintas creator/host.
- performance log: catatan diet, weight, muscle, workout, dan metric lain.
- consent: izin eksplisit dari member untuk berbagi data ke coach.
- consent scope: kategori data yang diizinkan untuk dilihat coach.
- coach shared view: read model data performa yang sudah difilter consent.
- freemium: model pricing dengan free tier permanen dan premium features opsional.
- passport plus/pro: tier premium untuk insight personal lanjutan.
- namespace: tenant-isolated event domain (`foremoz:passport:<tenant_id>`).
- chain: stream partition (`branch:<branch_id>` atau `core`).
- event: immutable record di EventDB write layer.
- projection: proses membentuk read model dari event stream.
- read model: tabel/view query-optimized untuk workspace operasional.
