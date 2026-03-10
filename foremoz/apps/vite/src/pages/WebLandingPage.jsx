import { Link } from 'react-router-dom';
import { APP_ORIGIN } from '../lib.js';

export default function WebLandingPage() {
  const isMockupOpenAccess = (import.meta.env.VITE_MOCKUP_OPEN_ACCESS ?? 'false') === 'true';
  const promiseItems = [
    {
      title: 'From Idea to Execution',
      body: 'Bantu gig worker merancang event, produk layanan, dan alur operasional dari nol.',
    },
    {
      title: 'Operational Control',
      body: 'Semua role kerja di workspace yang sama, dengan read model cepat untuk keputusan harian.',
    },
    {
      title: 'Lifecycle Until Done',
      body: 'Dari onboarding, booking, attendance, payment, sampai post-event retention dan repeat loop.',
    }
  ];

  const caseStudies = [
    {
      slug: 'active',
      title: 'Active',
      body: 'Fitness dan sport operations: membership, booking, PT, team, match, ranking.',
    },
    {
      slug: 'learning',
      title: 'Learning',
      body: 'Course dan cohort operations: enrollment, schedule, attendance, mentor workflow, progress.',
    },
    {
      slug: 'arts',
      title: 'Arts',
      body: 'Creative gig operations: showcase, session booking, rehearsal flow, ticketing, creator collaboration.',
    },
    {
      slug: 'tourism',
      title: 'Tourism',
      body: 'Experience-led trips: itinerary event ops, participant handling, guide workflow, service checkpoints.',
    },
    {
      slug: 'performance',
      title: 'Performance',
      body: 'Creator-led entertainment events: lineup, production, fan engagement, and monetization loops.',
    },
    {
      slug: 'events',
      title: 'Events',
      body: 'Event discovery lintas vertical. Identity layer terbentuk otomatis saat participant ikut event.',
    },
  ];

  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">Foremoz</div>
        <nav>
          <Link to="/web">Home</Link>
          <Link to="/events">Events</Link>
          <Link to="/active">Active</Link>
          <Link to="/learning">Learning</Link>
          <Link to="/arts">Arts</Link>
          {isMockupOpenAccess ? (
            <Link className="btn small" to="/signup">
              Admin signup
            </Link>
          ) : null}
        </nav>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">foremoz.com</p>
          <h1>Event Operating System untuk Gig Workers, dari persiapan sampai event selesai.</h1>
          <p>
            Foremoz membantu creator, trainer, mentor, performer, dan operator mengelola operasi event-driven
            secara end-to-end: bikin layanan, jalankan event, monitor performa, lalu maintain relationship
            setelah event berakhir.
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
            <li>Domain-specific workflows per kategori</li>
            <li>Role workspaces untuk tim operasional</li>
            <li>EventDB write layer + projection read model</li>
            <li>Scalable dari operator kecil ke multi-branch</li>
            <li>Built for recurring gig interactions</li>
          </ul>
        </aside>
      </section>

      <section className="landing-section">
        <p className="eyebrow">Narrative</p>
        <h2 className="landing-title">Satu platform untuk seluruh lifecycle operasi gig</h2>
        <div className="info-grid">
          {promiseItems.map((item) => (
            <article className="info-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">Case Study Verticals</p>
        <h2 className="landing-title">Pilih kategori yang paling relevan untuk operasimu</h2>
        <div className="case-grid">
          {caseStudies.map((item) => (
            <article className="feature-card case-card" key={item.slug}>
              <p className="eyebrow">foremoz.com/{item.slug}</p>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <div className="hero-actions">
                <Link className="btn small" to={`/${item.slug}`}>
                  Explore {item.title}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cta">
        <p className="eyebrow">CTA</p>
        <h2>Start dari kategori yang paling dekat dengan model bisnismu</h2>
        <p>
          Setiap kategori punya blueprint operasional berbeda. Masuk ke halaman kategori untuk lihat scope fitur,
          actor model, dan workflow yang sesuai.
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
