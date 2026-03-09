import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearPassportSession, getPassportSession, passportApiJson } from '../passport-client.js';

export default function PassportDashboardPage() {
  const navigate = useNavigate();
  const session = getPassportSession();
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
        await passportApiJson('/v1/projections/run', {
          method: 'POST',
          body: JSON.stringify({ tenant_id: tenantId })
        });
        const [profileRes, subsRes, perfRes, consentRes, planRes] = await Promise.all([
          passportApiJson(`/v1/passport/profile?tenant_id=${encodeURIComponent(tenantId)}&passport_id=${encodeURIComponent(passportId)}`),
          passportApiJson(`/v1/read/subscriptions?tenant_id=${encodeURIComponent(tenantId)}`),
          passportApiJson(`/v1/read/performance?tenant_id=${encodeURIComponent(tenantId)}`),
          passportApiJson(`/v1/read/consents?tenant_id=${encodeURIComponent(tenantId)}`),
          passportApiJson(`/v1/read/passport-plan?tenant_id=${encodeURIComponent(tenantId)}`).catch(() => ({ items: [] }))
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

  function logout() {
    clearPassportSession();
    navigate('/passport/signin', { replace: true });
  }

  return (
    <main className="dashboard">
      <header className="dash-head card">
        <div>
          <p className="eyebrow">Passport Dashboard</p>
          <h1>Identity Control Center</h1>
          <p>Kelola subscription portfolio, performance log, dan consent sharing dari satu tempat.</p>
        </div>
        <div className="meta">
          <button className="btn ghost" onClick={logout}>Sign out</button>
        </div>
      </header>

      <section className="stats-grid">
        <article className="stat">
          <p>Plan</p>
          <h3>{planCode}</h3>
        </article>
        <article className="stat">
          <p>Subscriptions</p>
          <h3>{subscriptions.length}</h3>
        </article>
        <article className="stat">
          <p>Performance Logs</p>
          <h3>{performance.length}</h3>
        </article>
        <article className="stat">
          <p>Consent Rules</p>
          <h3>{consents.length}</h3>
        </article>
      </section>

      <section className="ops-grid">
        <article className="card">
          <h2>Profile</h2>
          <p className="sub">{profile?.full_name || session?.user?.fullName || '-'}</p>
          <p className="sub">Passport ID: {passportId || '-'}</p>
          <p className="sub">Interests: {(profile?.sport_interests || []).join(', ') || '-'}</p>
        </article>
        <article className="card">
          <h2>Subscriptions</h2>
          <ul>
            {(subscriptions || []).slice(0, 5).map((row) => (
              <li key={row.subscription_id}>{row.plan_id || 'plan'} · {row.status}</li>
            ))}
            {subscriptions.length === 0 ? <li>Belum ada subscription.</li> : null}
          </ul>
        </article>
        <article className="card">
          <h2>Consent</h2>
          <ul>
            {(consents || []).slice(0, 5).map((row) => (
              <li key={row.consent_id}>{row.coach_id} · {row.status}</li>
            ))}
            {consents.length === 0 ? <li>Belum ada consent.</li> : null}
          </ul>
        </article>
      </section>

      <section className="card">
        {apiStatus === 'loading' ? <p>Connecting to passport API...</p> : null}
        {apiStatus === 'ok' ? <p>Live API connected (EventDB projection active).</p> : null}
        {apiStatus === 'error' ? <p>API fallback mode: {apiError}</p> : null}
      </section>

      <footer className="dash-foot">
        <Link to="/passport">Back to passport landing</Link>
      </footer>
    </main>
  );
}
