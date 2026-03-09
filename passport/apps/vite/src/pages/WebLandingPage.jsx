import { Link } from 'react-router-dom';

const infoItems = [
  {
    title: 'Satu Identitas Lintas Program',
    description:
      'Join banyak coach dan studio tanpa bikin akun baru berulang kali. Semua langganan terkumpul di satu passport.'
  },
  {
    title: 'Kontrol Privasi di Tangan Member',
    description:
      'Atur data apa saja yang bisa dilihat setiap coach, dengan izin granular per metrik dan bisa dicabut kapan saja.'
  }
];

const features = [
  'Single passport untuk multi-coach dan multi-studio.',
  'Riwayat subscription, status, dan jadwal perpanjangan terpusat.',
  'Snapshot performa personal: weight, muscle, body fat, dan diet adherence.',
  'Consent management untuk sharing data ke masing-masing coach.'
];

export default function WebLandingPage() {
  return (
    <main className="page">
      <section className="hero">
        <div className="hero-blur" />
        <p className="eyebrow">passport.foremoz.com</p>
        <h1>Your Fitness Identity, Across Every Coach.</h1>
        <p>
          Satu passport untuk join banyak coach dan studio, simpan progres personal,
          dan kontrol data mana yang boleh dibagikan.
        </p>
        <div className="hero-actions">
          <Link className="btn primary" to="/signup">Buat Passport</Link>
          <Link className="btn ghost" to="/signin">Masuk</Link>
        </div>
      </section>

      <section className="grid two-up">
        {infoItems.map((item) => (
          <article className="card" key={item.title}>
            <p className="eyebrow">Informasi</p>
            <h2>{item.title}</h2>
            <p className="sub">{item.description}</p>
          </article>
        ))}
      </section>

      <section className="card">
        <p className="eyebrow">Fitur</p>
        <h2>Yang Kamu Dapatkan di Passport Web</h2>
        <ul className="feature-list">
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>

      <section className="card cta-banner">
        <div>
          <p className="eyebrow">CTA</p>
          <h2>Aktifkan Passport dan Mulai Join Program Baru</h2>
          <p className="sub">
            Simpan progres personal, kelola consent data, dan lanjutkan journey fitness kamu
            di banyak coach dari satu akun.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="btn primary" to="/signup">Buat Passport Gratis</Link>
          <Link className="btn ghost" to="/onboarding">Coba Onboarding</Link>
        </div>
      </section>
    </main>
  );
}
