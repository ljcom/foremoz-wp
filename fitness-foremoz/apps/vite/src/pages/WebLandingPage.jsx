import { Link } from 'react-router-dom';
import { APP_ORIGIN } from '../lib.js';

export default function WebLandingPage() {
  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">Foremoz Fitness</div>
        <nav>
          <Link to="/signin">Sign in</Link>
          <Link to="/gov">Gov</Link>
          <Link to="/web/owner">Owner</Link>
          <Link className="btn small" to="/signup">
            Admin signup
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">fitness.foremoz.com/web</p>
          <h1>Operational SaaS for gym, PT session, booking, and member lifecycle.</h1>
          <p>
            Public entrypoint for Foremoz Fitness. Tenant page lives on
            {' '}
            <code>/a/&lt;account&gt;</code>
            {' '}
            for promotion and member conversion.
          </p>
          <div className="hero-actions">
            <Link className="btn" to="/signup">
              Setup tenant
            </Link>
            <Link className="btn ghost" to="/web/owner">
              Owner page
            </Link>
            <Link className="btn ghost" to="/signin">
              Sign in
            </Link>
          </div>
          <p className="domain">origin: {APP_ORIGIN}</p>
        </div>

        <aside className="hero-card">
          <h2>Role Workspaces</h2>
          <ul>
            <li>admin: operations dashboard</li>
            <li>sales: prospect pipeline</li>
            <li>PT: member activity log</li>
            <li>member: membership + self booking PT</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
