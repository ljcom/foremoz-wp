import { Link } from 'react-router-dom';
import { APP_ORIGIN } from '../lib.js';

export default function LandingPage() {
  const host = window.location.host;
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">Foremoz Fitness</div>
        <nav>
          <Link to="/signin">Sign in</Link>
          <Link className="btn small" to="/signup">
            Start setup
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Fitness Ops Platform</p>
          <h1>Run membership, booking, PT session, attendance, and payment in one workflow.</h1>
          <p>
            Event-driven operations for gyms and fitness studios. Write layer on EventDB, read model via projection.
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
          {isLocal && <p className="local-note">Preview mode on localhost. Production host should be fitness.foremoz.com.</p>}
        </div>

        <aside className="hero-card">
          <h2>Scope</h2>
          <ul>
            <li>membership and subscription lifecycle</li>
            <li>class booking and capacity</li>
            <li>PT session balance</li>
            <li>attendance checkin</li>
            <li>payment recording and confirmation</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
