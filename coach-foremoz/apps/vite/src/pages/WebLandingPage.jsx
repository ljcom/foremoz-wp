import { Link } from 'react-router-dom';
import { APP_ORIGIN } from '../lib.js';

export default function WebLandingPage() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">coach.foremoz.com</p>
        <h1>Coach Microsite for Growth and Conversion</h1>
        <p>
          Build your coach page, share to WhatsApp/Instagram/TikTok, convert direct to
          subscribe, then operate classes by location.
        </p>
        <div className="actions">
          <Link className="btn primary" to="/signup">Create Coach Account</Link>
          <Link className="btn ghost" to="/signin">Sign In</Link>
        </div>
        <p className="origin">origin: {APP_ORIGIN}</p>
      </section>
    </main>
  );
}
