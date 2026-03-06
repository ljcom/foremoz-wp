import { Link } from 'react-router-dom';
import { APP_ORIGIN } from '../lib.js';

function FeatureIcon({ name }) {
  if (name === 'member') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.86 0-7 2.24-7 5v1h14v-1c0-2.76-3.14-5-7-5Z" />
      </svg>
    );
  }

  if (name === 'booking') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10Zm0-4H6v2h12V6Z" />
      </svg>
    );
  }

  if (name === 'sales') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19h16v2H2V3h2v16Zm3-4 4-4 3 3 5-6 2 1.5-6.5 8L11 14l-2.5 2.5L7 15Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 3h2v4h-2V3Zm0 14h2v4h-2v-4ZM3 11h4v2H3v-2Zm14 0h4v2h-4v-2Zm-9.9-5.49 1.41-1.42 2.83 2.83-1.41 1.42-2.83-2.83Zm5.66 11.31 1.41-1.42 2.83 2.83-1.41 1.42-2.83-2.83Zm-5.66.01 2.83-2.83 1.41 1.42-2.83 2.83-1.41-1.42Zm11.31-5.67-2.83-2.83 1.41-1.42 2.83 2.83-1.41 1.42Z" />
    </svg>
  );
}

export default function WebLandingPage() {
  const isMockupOpenAccess = (import.meta.env.VITE_MOCKUP_OPEN_ACCESS ?? 'false') === 'true';
  const features = [
    {
      icon: 'member',
      title: 'Manajemen Member Otomatis',
      body: 'Kelola data member, status membership, dan riwayat kunjungan dalam satu dashboard.',
    },
    {
      icon: 'booking',
      title: 'Booking PT Tanpa Ribet',
      body: 'Member bisa pilih jadwal trainer langsung dari portal, lengkap dengan slot real-time.',
    },
    {
      icon: 'sales',
      title: 'Pantau Pipeline Penjualan',
      body: 'Tim sales dapat tracking lead sampai closing agar akuisisi member lebih terukur.',
    },
    {
      icon: 'role',
      title: 'Workspace per Role',
      body: 'Admin, sales, PT, dan member punya tampilan kerja masing-masing sesuai kebutuhan.',
    },
  ];

  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">Foremoz Fitness</div>
        <nav>
          <Link to="/signin">Sign in</Link>
          <Link to="/web/owner">Owner</Link>
          {isMockupOpenAccess ? (
            <Link className="btn small" to="/signup">
              Admin signup
            </Link>
          ) : null}
        </nav>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">fitness.foremoz.com</p>
          <h1>Platform operasional gym modern untuk growth, retention, dan experience member.</h1>
          <p>
            Foremoz membantu gym Anda menjalankan operasional harian lebih cepat, rapi, dan terukur.
            Dari onboarding member baru sampai manajemen sesi personal training.
          </p>
          <div className="hero-actions">
            {isMockupOpenAccess ? (
              <Link className="btn" to="/signup">
                Mulai Sekarang
              </Link>
            ) : null}
            <Link className="btn ghost" to="/web/owner">
              Demo Owner
            </Link>
            <Link className="btn ghost" to="/signin">
              Sign In
            </Link>
          </div>
          <p className="domain">origin: {APP_ORIGIN}</p>
        </div>

        <aside className="hero-card">
          <h2>Kenapa Foremoz</h2>
          <ul>
            <li>Operasional harian jadi lebih terstruktur</li>
            <li>Alur penjualan member lebih konsisten</li>
            <li>Pengalaman member lebih cepat dan modern</li>
            <li>Data penting mudah dipantau dari satu tempat</li>
          </ul>
        </aside>
      </section>

      <section className="landing-section">
        <p className="eyebrow">Fitur Aplikasi</p>
        <h2 className="landing-title">Fitur utama yang bikin operasional gym lebih efektif</h2>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-head">
                <span className="feature-icon">
                  <FeatureIcon name={feature.icon} />
                </span>
                <h3>{feature.title}</h3>
              </div>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cta">
        <p className="eyebrow">Call to Action</p>
        <h2>Siap naik levelkan bisnis gym Anda?</h2>
        <p>
          Buat tenant Foremoz hari ini dan mulai kelola member, sales, serta booking PT dari satu platform.
        </p>
        <div className="hero-actions">
          {isMockupOpenAccess ? (
            <Link className="btn" to="/signup">
              Buat Akun Admin
            </Link>
          ) : null}
          <Link className="btn ghost" to="/signin">
            Masuk ke Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
