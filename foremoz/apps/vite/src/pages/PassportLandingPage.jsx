import { Link, useLocation } from 'react-router-dom';

const liveEvents = [
  {
    title: 'Morning Strength Camp',
    vertical: 'Active',
    category: 'Strength Training',
    host: 'Coach Rafi - Foremoz Active Center',
    time: 'Sedang berlangsung (06:00 - 07:30 WIB)',
    participant: '24 peserta aktif',
    status: 'Live',
    image:
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'English Speaking Sprint',
    vertical: 'Learning',
    category: 'Language Practice',
    host: 'Mentor Dita - Learning Hub Bandung',
    time: 'Sedang berlangsung (09:00 - 10:30 WIB)',
    participant: '18 peserta aktif',
    status: 'Live',
    image:
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Urban Dance Rehearsal',
    vertical: 'Arts',
    category: 'Dance Rehearsal',
    host: 'Studio Kroma - Creative Stage',
    time: 'Sedang berlangsung (19:00 - 21:00 WIB)',
    participant: '32 peserta aktif',
    status: 'Live',
    image:
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80'
  }
];

export default function PassportLandingPage() {
  const location = useLocation();
  const isPassportSurface = location.pathname.startsWith('/passport');
  const entryLabel = isPassportSurface ? 'passport.foremoz.com' : 'foremoz.com/events';
  const title = isPassportSurface
    ? 'Passport Showcase untuk Member'
    : 'Ikut Event Lintas Active, Learning, dan Arts';
  const description = isPassportSurface
    ? 'Passport dipakai member untuk menunjukkan identity, history, dan trust signal lintas event yang sudah diikuti.'
    : 'Fokus utama di Foremoz adalah event. Pilih event yang sedang berlangsung, join, dan lanjutkan pengalamanmu di vertical yang kamu minati.';

  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">{isPassportSurface ? 'Foremoz Passport' : 'Foremoz Events'}</div>
        <nav>
          <Link to="/web">Foremoz Home</Link>
          <Link to={isPassportSurface ? '/passport/signin' : '/events/signin'}>Sign in</Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">{entryLabel}</p>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="hero-actions">
            <Link className="btn" to={isPassportSurface ? '/passport/signin' : '/events/signin'}>
              {isPassportSurface ? 'Masuk ke Passport' : 'Ikut Event Sekarang'}
            </Link>
          </div>
        </div>

        <aside className="hero-card">
          <h2>{isPassportSurface ? 'Passport untuk Show Off Member' : 'Passport Itu Konsekuensi Join Event'}</h2>
          <ul>
            <li>kamu join event dulu, bukan bikin passport dulu</li>
            <li>identity akan tersimpan otomatis setelah ikut event</li>
            <li>riwayat event lintas vertical tetap terhubung</li>
            <li>member bisa menampilkan pencapaian di passport.foremoz.com</li>
          </ul>
        </aside>
      </section>

      <section className="landing-section">
        <p className="eyebrow">Live Events</p>
        <h2 className="landing-title">Upcoming events</h2>
        <div className="passport-live-grid">
          {liveEvents.map((event) => (
            <article className="passport-live-card" key={event.title}>
              <img className="passport-live-image" src={event.image} alt={event.title} />
              <div className="passport-live-head">
                <span className="passport-live-badge">{event.status}</span>
                <span className="passport-live-vertical">{event.vertical}</span>
              </div>
              <h3>{event.title}</h3>
              <p className="passport-live-category">Category: {event.category}</p>
              <p className="passport-live-host">{event.host}</p>
              <p className="passport-live-time">{event.time}</p>
              <p className="passport-live-participant">{event.participant}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">How It Works</p>
        <h2 className="landing-title">Alur event-first</h2>
        <div className="feature-grid">
          <article className="feature-card">
            <p>1) Pilih event yang sedang aktif.</p>
          </article>
          <article className="feature-card">
            <p>2) Join dan hadir di event.</p>
          </article>
          <article className="feature-card">
            <p>3) Passport terbentuk sebagai identitas lintas event.</p>
          </article>
          <article className="feature-card">
            <p>4) Data progress dan riwayat kamu otomatis terbawa ke event berikutnya.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
