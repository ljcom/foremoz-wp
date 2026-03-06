import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearSession, getSession } from '../lib.js';

const locationClasses = [
  { location: 'Kuningan', studio: 'Forge Fitness', className: 'Strength Reset', slot: '18/24', time: '18:30' },
  { location: 'Kemang', studio: 'Pulse Studio', className: 'Mobility Engine', slot: '9/16', time: '07:00' },
  { location: 'Senayan', studio: 'Arena Lab', className: 'Conditioning Blast', slot: '22/24', time: '19:00' }
];

const channels = [
  { name: 'WhatsApp', share: 160, click: 109, subscribe: 33 },
  { name: 'Instagram', share: 98, click: 77, subscribe: 26 },
  { name: 'TikTok', share: 81, click: 66, subscribe: 21 }
];

const team = [
  { name: 'Siska', role: 'cs', area: 'Kuningan', status: 'active' },
  { name: 'Andre', role: 'cs', area: 'Kemang', status: 'active' },
  { name: 'Rico', role: 'cs', area: 'Senayan', status: 'shift' }
];

const plans = [
  { code: 'free', name: 'Free', price: 'Rp0', detail: 'Microsite + basic join flow' },
  { code: 'starter', name: 'Starter', price: 'Rp99.000', detail: 'Attribution + larger class limits' },
  { code: 'growth', name: 'Growth', price: 'Rp299.000', detail: 'Advanced funnel analytics' },
  { code: 'pro_team', name: 'Pro/Team', price: 'Rp799.000', detail: 'Support team + onsite flow' }
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const session = getSession();

  const activePlan = useMemo(() => {
    return plans.find((p) => p.code === session?.coach?.packagePlan) || plans[0];
  }, [session]);

  function logout() {
    clearSession();
    navigate('/signin', { replace: true });
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">coach.foremoz.com/{session?.coach?.handle || 'coach-demo'}</p>
        <h1>{session?.coach?.displayName || session?.user?.fullName || 'Coach'} Workspace</h1>
        <p>
          Coach POV dashboard: share channel performance, join by location, support team,
          and free-first pricing plan.
        </p>
        <div className="actions">
          <button className="btn primary">Copy Campaign Link</button>
          <Link className="btn ghost" to="/onboarding">Edit Onboarding</Link>
          <button className="btn ghost" onClick={logout}>Sign out</button>
        </div>
      </section>

      <section className="grid two-col">
        <article className="card">
          <h2>Join Class by Location</h2>
          <p className="sub">Active classes across linked studios.</p>
          <ul className="list">
            {locationClasses.map((row) => (
              <li className="row" key={`${row.location}-${row.className}`}>
                <div>
                  <strong>{row.className}</strong>
                  <p>{row.studio} · {row.location}</p>
                </div>
                <div className="right">
                  <span>{row.time}</span>
                  <small>Slot {row.slot}</small>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2>Channel Funnel</h2>
          <p className="sub">Share -&gt; Click -&gt; Subscribe performance.</p>
          <div className="channels">
            {channels.map((c) => (
              <div className="metric" key={c.name}>
                <strong>{c.name}</strong>
                <span>Share {c.share}</span>
                <span>Click {c.click}</span>
                <span>Subscribe {c.subscribe}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid two-col">
        <article className="card">
          <h2>Support Team (Higher Tier)</h2>
          <p className="sub">Onsite re-registration and assisted check-in.</p>
          <ul className="list compact">
            {team.map((t) => (
              <li className="row" key={t.name}>
                <div>
                  <strong>{t.name}</strong>
                  <p>{t.role} · {t.area}</p>
                </div>
                <span className={`pill ${t.status === 'active' ? 'ok' : 'warn'}`}>{t.status}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="card plan-card">
          <h2>Pricing Tiers</h2>
          <p className="sub">Free tier always available.</p>
          <ul className="list compact">
            {plans.map((p) => (
              <li className="row" key={p.code}>
                <div>
                  <strong>{p.name}</strong>
                  <p>{p.detail}</p>
                </div>
                <div className="right">
                  <span>{p.price}</span>
                  {activePlan.code === p.code ? <small className="current">Current</small> : null}
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="footer-note">
        <p>Mockup mode: signup/signin/onboarding/dashboard pattern aligned with fitness flow.</p>
      </section>
    </main>
  );
}
