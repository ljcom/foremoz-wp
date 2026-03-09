import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiJson, clearSession, getSession } from '../lib.js';

const sidebarItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'fitur', label: 'Fitur' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'performance', label: 'Performance' },
  { id: 'consent', label: 'Consent' }
];

function statusPill(status) {
  if (status === 'active') return 'pill pill-active';
  if (status === 'paused') return 'pill pill-paused';
  return 'pill';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const session = getSession();
  const tenantId = session?.tenant?.id || 'ps_001';
  const passportId = session?.passport?.id || session?.user?.userId || '';
  const [apiStatus, setApiStatus] = useState('loading');
  const [apiError, setApiError] = useState('');
  const [subscriptions, setSubscriptions] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [consents, setConsents] = useState([]);
  const [profile, setProfile] = useState(null);
  const [planCode, setPlanCode] = useState('free');

  useEffect(() => {
    async function load() {
      try {
        setApiStatus('loading');
        setApiError('');

        await apiJson('/v1/projections/run', {
          method: 'POST',
          body: JSON.stringify({ tenant_id: tenantId })
        });

        const [profileRes, subsRes, perfRes, consentRes, planRes] = await Promise.all([
          apiJson(`/v1/passport/profile?tenant_id=${encodeURIComponent(tenantId)}&passport_id=${encodeURIComponent(passportId)}`),
          apiJson(`/v1/read/subscriptions?tenant_id=${encodeURIComponent(tenantId)}`),
          apiJson(`/v1/read/performance?tenant_id=${encodeURIComponent(tenantId)}`),
          apiJson(`/v1/read/consents?tenant_id=${encodeURIComponent(tenantId)}`),
          apiJson(`/v1/read/passport-plan?tenant_id=${encodeURIComponent(tenantId)}`).catch(() => ({ items: [] }))
        ]);

        const profileItem = profileRes.item || null;
        setProfile(profileItem);
        setSubscriptions((subsRes.items || []).filter((item) => item.passport_id === passportId));
        setPerformance((perfRes.items || []).filter((item) => item.passport_id === passportId));
        setConsents((consentRes.items || []).filter((item) => item.passport_id === passportId));
        const planItem = (planRes.items || []).find((item) => item.passport_id === passportId);
        setPlanCode(planItem?.plan_code || session?.passport?.planCode || 'free');
        setApiStatus('ok');
      } catch (error) {
        setApiStatus('error');
        setApiError(error.message);
      }
    }

    if (!passportId) {
      setApiStatus('error');
      setApiError('passport_id missing in session');
      return;
    }
    load();
  }, [passportId, tenantId, session?.passport?.planCode]);

  const featureList = useMemo(
    () => [
      'Portfolio langganan lintas coach dalam satu dashboard.',
      'Snapshot performa personal dan trend berkala.',
      'Kontrol consent data untuk setiap coach secara granular.'
    ],
    []
  );

  function logout() {
    clearSession();
    navigate('/signin', { replace: true });
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-blur" />
        <p className="eyebrow">Dashboard</p>
        <h1>Passport Control Center</h1>
        <p>Pantau langganan aktif, progres personal, dan kontrol data sharing dari satu tempat.</p>
      </section>

      <section className="dashboard-layout">
        <aside className="dashboard-sidebar card">
          <p className="eyebrow">Menu</p>
          <nav className="side-nav">
            {sidebarItems.map((item) => (
              <a className="side-link" href={`#${item.id}`} key={item.id}>
                {item.label}
              </a>
            ))}
          </nav>
          <button className="btn ghost" type="button" onClick={logout}>Sign out</button>
        </aside>

        <div className="dashboard-content">
          <section className="card" id="overview">
            <p className="eyebrow">Informasi</p>
            <h2>Status Akun Passport Kamu</h2>
            <p className="sub">
              Passport ID: {passportId || '-'} | Plan: {planCode}
            </p>
            <p className="sub">
              Nama: {profile?.full_name || session?.user?.fullName || '-'} | Interests: {(profile?.sport_interests || []).join(', ') || '-'}
            </p>
          </section>

          <section className="card" id="fitur">
            <p className="eyebrow">Fitur</p>
            <ul className="feature-list compact">
              {featureList.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </section>

          <section className="card cta-banner">
            <div>
              <p className="eyebrow">CTA</p>
              <h2>Tambah Program atau Atur Privasi?</h2>
              <p className="sub">Lanjutkan aksi berikutnya langsung dari dashboard.</p>
            </div>
            <div className="hero-actions">
              <button className="btn primary" type="button">Join New Program</button>
              <button className="btn ghost" type="button">Open Privacy Settings</button>
              <Link className="btn" to="/">Kembali ke Landing</Link>
            </div>
          </section>

          <section className="grid two-up">
            <article className="card spotlight" id="portfolio">
              <h2>Subscription Portfolio</h2>
              <p className="sub">Multi-coach & multi-studio active from one passport.</p>
              <ul className="stack">
                {subscriptions.length === 0 ? <li className="row"><p>Belum ada subscription.</p></li> : null}
                {subscriptions.map((row) => (
                  <li key={row.subscription_id} className="row">
                    <div>
                      <strong>{row.plan_id || 'Plan'}</strong>
                      <p>{row.coach_id || '-'} · {row.studio_id || '-'}</p>
                    </div>
                    <div className="row-right">
                      <span className={statusPill(row.status)}>{row.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </article>

            <article className="card" id="performance">
              <h2>Performance Snapshot</h2>
              <p className="sub">Personal logs: diet, weight, muscle, body composition.</p>
              <div className="metrics">
                {performance.length === 0 ? <p className="sub">Belum ada performance log.</p> : null}
                {performance.map((m) => (
                  <div className="metric" key={m.metric_log_id}>
                    <span>{m.metric_category}</span>
                    <strong>{JSON.stringify(m.metric_value_json)}</strong>
                    <small>{new Date(m.measured_at).toLocaleString('id-ID')}</small>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid">
            <article className="card consent" id="consent">
              <h2>Coach Data Consent</h2>
              <p className="sub">Only shared if you allow. Revoke anytime.</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Coach</th>
                      <th>Metric Categories</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consents.length === 0 ? (
                      <tr><td colSpan="3">Belum ada consent.</td></tr>
                    ) : (
                      consents.map((c) => (
                        <tr key={c.consent_id}>
                          <td>{c.coach_id}</td>
                          <td>{Array.isArray(c.metric_categories) ? c.metric_categories.join(', ') : String(c.metric_categories || '-')}</td>
                          <td>{c.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          <section className="card">
            {apiStatus === 'loading' ? <p>Connecting to passport API...</p> : null}
            {apiStatus === 'ok' ? <p>Live API connected (EventDB projection active).</p> : null}
            {apiStatus === 'error' ? <p>API fallback mode: {apiError}</p> : null}
          </section>
        </div>
      </section>
    </main>
  );
}
