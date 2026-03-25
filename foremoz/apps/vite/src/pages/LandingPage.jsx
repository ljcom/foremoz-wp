import { Link } from 'react-router-dom';
import { APP_ORIGIN, getSession } from '../lib.js';
import { getVerticalLabel } from '../industry-jargon.js';

export default function LandingPage() {
  const host = window.location.host;
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const industrySlug = String(getSession()?.tenant?.industry_slug || '').trim().toLowerCase() || 'active';
  const brand = `Foremoz ${getVerticalLabel(industrySlug, 'Active')}`;
  const whyItems = [
    {
      title: 'Ops tidak lagi pecah di chat, sheet, dan form',
      body: 'Creator, admin, dan participant masuk ke alur yang sama dari publish sampai attendance dan payment review.'
    },
    {
      title: 'Setiap aksi punya jejak operasional',
      body: 'Payment, booking, subscription, dan check-in bisa dilacak ke outcome yang nyata, bukan sekadar catatan transaksi.'
    },
    {
      title: 'Siap dipakai untuk single operator sampai multi-branch',
      body: 'Mulai dari satu akun lalu tumbuh ke tim, role, branch, dan dashboard audit tanpa ganti fondasi.'
    }
  ];
  const howSteps = [
    {
      step: '01',
      title: 'Setup tenant dan branch',
      body: 'Buat account publik, aktifkan package, lalu bentuk struktur operator sesuai vertical.'
    },
    {
      step: '02',
      title: 'Publish experience dan offering',
      body: 'Kelola event, class, product, package, sampai CTA public profile dalam satu panel.'
    },
    {
      step: '03',
      title: 'Run participation dan review payment',
      body: 'Pakai check-in, booking, subscription, dan transaction review untuk memastikan outcome operasional tercatat.'
    }
  ];
  const roleLanes = [
    { role: 'Owner', focus: 'branch, users, package, public account' },
    { role: 'Admin / CS', focus: 'event, class, member, transaction review' },
    { role: 'Member / Passport', focus: 'register, payment, booking, public identity' }
  ];

  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">{brand}</div>
        <nav>
          <Link to="/signin">Sign in</Link>
          <Link className="btn small" to="/signup">
            Start setup
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Industry Ops Platform</p>
          <h1>Run creator, experience, participation, and transaction in one workflow.</h1>
          <p>
            Event-driven operations for multi-industry operators. Write layer on EventDB, read model via projection.
          </p>
          <div className="hero-actions">
            <Link className="btn" to="/signup">
              Create tenant
            </Link>
            <Link className="btn ghost" to="/signin">
              Sign in
            </Link>
          </div>
          <p className="domain">Target origin: {APP_ORIGIN}</p>
          {isLocal && <p className="local-note">Preview mode on localhost. Production host should be your-industry.foremoz.com.</p>}
        </div>

        <aside className="hero-card">
          <h2>Scope</h2>
          <ul>
            <li>identity and profile lifecycle</li>
            <li>experience creation and scheduling</li>
            <li>participation and check-in/check-out</li>
            <li>offering and package management</li>
            <li>transaction recording and confirmation</li>
          </ul>
        </aside>
      </section>

      <section className="landing-section">
        <p className="eyebrow">Why</p>
        <h2 className="landing-title">Dibuat untuk operator yang butuh alur nyata, bukan dashboard generik.</h2>
        <div className="feature-grid">
          {whyItems.map((item) => (
            <article className="feature-card" key={item.title}>
              <div className="feature-head">
                <h3>{item.title}</h3>
              </div>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">How</p>
        <h2 className="landing-title">Satu alur dari setup sampai participation review.</h2>
        <div className="feature-grid">
          {howSteps.map((item) => (
            <article className="feature-card" key={item.step}>
              <div className="feature-head">
                <span className="feature-icon">{item.step}</span>
                <h3>{item.title}</h3>
              </div>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">Who Uses It</p>
        <div className="pricing-grid">
          {roleLanes.map((item) => (
            <article className="pricing-card" key={item.role}>
              <h3>{item.role}</h3>
              <p className="pricing-note">{item.focus}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
