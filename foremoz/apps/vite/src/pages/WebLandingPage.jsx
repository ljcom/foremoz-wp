import { Link } from 'react-router-dom';
import { listVerticalConfigs } from '../industry-jargon.js';

function visualForVertical(slug) {
  const key = String(slug || '').toLowerCase();
  if (key === 'active') {
    return {
      icon: 'fa-solid fa-dumbbell',
      image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80'
    };
  }
  if (key === 'learning') {
    return {
      icon: 'fa-solid fa-book-open',
      image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1400&q=80'
    };
  }
  if (key === 'performance') {
    return {
      icon: 'fa-solid fa-music',
      image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1400&q=80'
    };
  }
  if (key === 'arts') {
    return {
      icon: 'fa-solid fa-palette',
      image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1400&q=80'
    };
  }
  if (key === 'tourism') {
    return {
      icon: 'fa-solid fa-map-location-dot',
      image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80'
    };
  }
  return {
    icon: 'fa-solid fa-calendar-star',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80'
  };
}

export default function WebLandingPage() {
  const isMockupOpenAccess = (import.meta.env.VITE_MOCKUP_OPEN_ACCESS ?? 'false') === 'true';
  const topNavVerticals = listVerticalConfigs().slice(0, 5);
  const verticalCards = listVerticalConfigs().map((item) => {
    const visual = visualForVertical(item.slug);
    return {
      ...item,
      icon: visual.icon,
      image: visual.image
    };
  });

  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">Foremoz</div>
        <nav>
          <Link to="/web">Home</Link>
          <Link to="/events">Events</Link>
          {topNavVerticals.map((item) => (
            <Link key={item.slug} to={`/${item.slug}`}>
              {item.label}
            </Link>
          ))}
          <Link className="btn small" to="/signin">
            Sign In
          </Link>
        </nav>
      </header>

      <section className="hero hero-no-aside web-hero-visual">
        <div>
          <p className="eyebrow">Home</p>
          <h1>Semua event, class, dan komunitas kamu dalam satu tempat.</h1>
          <p>
            Tempat creator dan member ketemu, join, check in, dan tumbuh bareng.
          </p>
          <div className="hero-actions">
            <Link className="btn" to="/events">
              Lihat Events
            </Link>
            {isMockupOpenAccess ? (
              <Link className="btn ghost" to="/signup">
                Mulai Gratis
              </Link>
            ) : null}
          </div>
        </div>

        <div className="web-hero-gallery" aria-label="Foremoz highlights">
          <img
            src="https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1400&q=80"
            alt="Event training"
          />
          <img
            src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80"
            alt="Komunitas"
          />
          <img
            src="https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1400&q=80"
            alt="Workshop class"
          />
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">Quick Start</p>
        <div className="feature-grid web-icon-grid">
          <article className="feature-card">
            <div className="feature-head">
              <span className="feature-icon"><i className="fa-solid fa-calendar-check" /></span>
              <h3>Join Event</h3>
            </div>
          </article>
          <article className="feature-card">
            <div className="feature-head">
              <span className="feature-icon"><i className="fa-solid fa-chalkboard-user" /></span>
              <h3>Ikut Class</h3>
            </div>
          </article>
          <article className="feature-card">
            <div className="feature-head">
              <span className="feature-icon"><i className="fa-solid fa-users" /></span>
              <h3>Bangun Komunitas</h3>
            </div>
          </article>
          <article className="feature-card">
            <div className="feature-head">
              <span className="feature-icon"><i className="fa-solid fa-trophy" /></span>
              <h3>Tunjukkan Progress</h3>
            </div>
          </article>
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">Explore</p>
        <h2 className="landing-title">Pilih dunia yang kamu suka</h2>
        <div className="case-grid web-visual-grid">
          {verticalCards.map((item) => (
            <article className="feature-card case-card web-visual-card" key={item.slug}>
              <img className="web-visual-image" src={item.image} alt={item.label} />
              <div className="web-visual-body">
                <div className="feature-head">
                  <span className="feature-icon"><i className={item.icon} /></span>
                  <h3>{item.label}</h3>
                </div>
                <div className="hero-actions">
                  <Link className="btn small" to={`/${item.slug}`}>
                    Masuk
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cta">
        <p className="eyebrow">Ready</p>
        <h2>Temukan event berikutnya dan mulai sekarang.</h2>
        <div className="hero-actions">
          <Link className="btn" to="/events">
            Browse Events
          </Link>
          <Link className="btn ghost" to="/signin">
            Sign In
          </Link>
        </div>
      </section>
    </main>
  );
}
