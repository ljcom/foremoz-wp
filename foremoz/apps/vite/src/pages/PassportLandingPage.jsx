import { Link } from 'react-router-dom';

const infoItems = [
  {
    title: 'Satu Identitas Lintas Program',
    body: 'Satu passport untuk join banyak coach, studio, dan vertical lain tanpa bikin akun berulang.'
  },
  {
    title: 'Consent-First by Design',
    body: 'Kamu tentukan data apa saja yang boleh dilihat collaborator per category metrik.'
  }
];

const features = [
  'Multi-subscription portfolio lintas coach/studio.',
  'Personal performance timeline (diet, weight, muscle, workout).',
  'Consent matrix per coach untuk data sharing.',
  'Identity layer reusable ke Active, Learning, Arts, dan vertical berikutnya.'
];

export default function PassportLandingPage() {
  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">Foremoz Passport</div>
        <nav>
          <Link to="/web">General</Link>
          <Link to="/passport/signin">Sign in</Link>
          <Link className="btn small" to="/passport/signup">
            Create passport
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">foremoz.com/passport</p>
          <h1>Your Cross-Vertical Identity Layer</h1>
          <p>
            Passport menyimpan identitas personal yang portable lintas vertical Foremoz, termasuk subscription,
            progres performa, dan consent sharing.
          </p>
          <div className="hero-actions">
            <Link className="btn" to="/passport/signup">
              Buat Passport
            </Link>
            <Link className="btn ghost" to="/passport/signin">
              Masuk
            </Link>
          </div>
        </div>

        <aside className="hero-card">
          <h2>Identity Scope</h2>
          <ul>
            <li>account auth + profile dasar</li>
            <li>subscription portfolio lintas actor</li>
            <li>performance log pribadi</li>
            <li>consent-filtered coach shared view</li>
          </ul>
        </aside>
      </section>

      <section className="landing-section">
        <p className="eyebrow">Informasi</p>
        <h2 className="landing-title">Passport bukan app terpisah, tapi identity core Foremoz</h2>
        <div className="info-grid">
          {infoItems.map((item) => (
            <article className="info-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">Fitur</p>
        <h2 className="landing-title">Capability Passport di dalam Foremoz</h2>
        <div className="feature-grid">
          {features.map((item) => (
            <article className="feature-card" key={item}>
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
