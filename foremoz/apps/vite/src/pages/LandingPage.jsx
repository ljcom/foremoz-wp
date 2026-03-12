import { Link } from 'react-router-dom';
import { APP_ORIGIN, getSession } from '../lib.js';
import { getVerticalLabel } from '../industry-jargon.js';

export default function LandingPage() {
  const host = window.location.host;
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const industrySlug = String(getSession()?.tenant?.industry_slug || '').trim().toLowerCase() || 'active';
  const brand = `Foremoz ${getVerticalLabel(industrySlug, 'Active')}`;

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
    </main>
  );
}
