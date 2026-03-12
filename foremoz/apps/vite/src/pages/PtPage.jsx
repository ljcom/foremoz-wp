import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiJson, clearSession, getAccountSlug, getEnvironmentLabel, getSession, getAllowedEnvironments } from '../lib.js';

function Stat({ label, value, iconClass, tone, hint }) {
  return (
    <article className={`stat ${tone}`}>
      <div className="stat-top">
        <p>{label}</p>
        <span className="stat-icon" aria-hidden="true">
          <i className={iconClass} />
        </span>
      </div>
      <div className="stat-value-row">
        <h3>{value}</h3>
        <small>{hint}</small>
      </div>
    </article>
  );
}

export default function PtPage() {
  const navigate = useNavigate();
  const session = getSession();
  const accountSlug = getAccountSlug(session);
  const role = String(session?.role || 'pt').toLowerCase();
  const [targetEnv, setTargetEnv] = useState('pt');
  const [dashboardRow, setDashboardRow] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [errorInsight, setErrorInsight] = useState('');
  const [activity, setActivity] = useState({ member_id: '', note: '', session_at: '' });
  const [logs, setLogs] = useState([
    { activity_id: 'pta_001', member_id: 'mem_4471', note: 'Mobility warmup + strength block', session_at: '2026-03-05T07:00' },
    { activity_id: 'pta_002', member_id: 'mem_4472', note: 'Strength progression', session_at: '2026-03-05T17:30' },
    { activity_id: 'pta_003', member_id: 'mem_4471', note: 'Recovery session', session_at: '2026-03-06T08:00' }
  ]);
  const allowedEnv = useMemo(() => {
    return getAllowedEnvironments(session, role);
  }, [session, role]);

  useEffect(() => {
    if (allowedEnv.length === 0) return;
    if (!allowedEnv.includes(targetEnv)) {
      setTargetEnv(allowedEnv[0]);
    }
  }, [allowedEnv, targetEnv]);
  const insightStats = useMemo(
    () => {
      const today = new Date().toISOString().slice(0, 10);
      const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const normalized = logs.map((item) => ({
        ...item,
        date: String(item.session_at || '').slice(0, 10)
      }));
      const totalMember = new Set(normalized.map((item) => item.member_id).filter(Boolean)).size;
      const todayBooking = normalized.filter((item) => item.date === today).length;
      const tomorrowSchedule = normalized.filter((item) => item.date === tomorrowDate).length;
      return [
        {
          label: 'total member',
          value: totalMember,
          iconClass: 'fa-solid fa-user-group',
          tone: 'tone-subscription',
          hint: 'maintained by this PT'
        },
        {
          label: 'today booking',
          value: todayBooking,
          iconClass: 'fa-solid fa-calendar-check',
          tone: 'tone-booking',
          hint: 'sessions scheduled today'
        },
        {
          label: 'tomorrow schedule',
          value: tomorrowSchedule,
          iconClass: 'fa-solid fa-calendar-day',
          tone: 'tone-checkin',
          hint: 'sessions planned tomorrow'
        }
      ];
    },
    [logs]
  );

  function goToEnv(env) {
    if (!allowedEnv.includes(env)) return;
    if (env === 'admin') {
      navigate(`/a/${accountSlug}/admin/dashboard`);
      return;
    }
    if (env === 'sales') {
      navigate(`/a/${accountSlug}/sales/dashboard`);
      return;
    }
    if (env === 'pt') {
      navigate(`/a/${accountSlug}/pt/dashboard`);
      return;
    }
    navigate(`/a/${accountSlug}/cs/dashboard`);
  }

  function signOut() {
    clearSession();
    navigate(`/a/${accountSlug}`, { replace: true });
  }

  function addActivity(e) {
    e.preventDefault();
    if (!activity.member_id || !activity.note || !activity.session_at) return;
    setLogs((prev) => [{ activity_id: `pta_${Date.now()}`, ...activity }, ...prev]);
    setActivity({ member_id: '', note: '', session_at: '' });
  }

  useEffect(() => {
    async function loadInsight() {
      const tenantId = session?.tenant?.id || 'tn_001';
      const branchId = session?.branch?.id || 'core';
      try {
        setLoadingInsight(true);
        setErrorInsight('');
        await apiJson('/v1/projections/run', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: tenantId,
            branch_id: 'core'
          })
        });
        const result = await apiJson(
          `/v1/read/dashboard?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`
        );
        setDashboardRow(result.row || null);
      } catch (error) {
        setErrorInsight(error.message || 'failed to load insight');
      } finally {
        setLoadingInsight(false);
      }
    }
    loadInsight();
  }, [session?.tenant?.id, session?.branch?.id]);

  return (
    <main className="dashboard">
      <header className="dash-head card">
        <div>
          <p className="eyebrow">PT Workspace</p>
          <h1>{session?.user?.fullName || 'PT'}</h1>
          <p>Log member PT activity</p>
        </div>
        <div className="meta">
          {allowedEnv.length > 0 ? (
            <div className="env-switcher">
              <label className="env-lookup">
                Environment
                <select
                  value={targetEnv}
                  onChange={(e) => {
                    const next = e.target.value;
                    setTargetEnv(next);
                    goToEnv(next);
                  }}
                >
                  {allowedEnv.map((env) => (
                    <option key={env} value={env}>
                      {getEnvironmentLabel(env)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="env-buttons" role="group" aria-label="Environment">
                {allowedEnv.map((env) => (
                  <button
                    key={env}
                    type="button"
                    className={`btn ghost small ${targetEnv === env ? 'active' : ''}`}
                    onClick={() => {
                      setTargetEnv(env);
                      goToEnv(env);
                    }}
                  >
                    {getEnvironmentLabel(env)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <button className="btn ghost" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <section style={{ marginTop: '1rem' }}>
        <p className="eyebrow">Insight</p>
        <section className="stats-grid">
          {insightStats.map((s) => (
            <Stat key={s.label} label={s.label} value={s.value} iconClass={s.iconClass} tone={s.tone} hint={s.hint} />
          ))}
        </section>
        {loadingInsight ? <p className="feedback">Loading insight...</p> : null}
        {errorInsight ? <p className="error">{errorInsight}</p> : null}
      </section>

      <section className="card admin-main" style={{ marginTop: '1rem' }}>
        <h2>PT activity log</h2>
        <div className="entity-list">
          {logs.map((item) => (
            <div className="entity-row" key={item.activity_id}>
              <div>
                <strong>{item.member_id}</strong>
                <p>{item.session_at} - {item.note}</p>
              </div>
              <button className="btn ghost" onClick={() => setLogs((prev) => prev.filter((v) => v.activity_id !== item.activity_id))}>Delete</button>
            </div>
          ))}
        </div>

        <form className="form" onSubmit={addActivity}>
          <label>member_id<input value={activity.member_id} onChange={(e) => setActivity((p) => ({ ...p, member_id: e.target.value }))} /></label>
          <label>session_at<input type="datetime-local" value={activity.session_at} onChange={(e) => setActivity((p) => ({ ...p, session_at: e.target.value }))} /></label>
          <label>activity_note<input value={activity.note} onChange={(e) => setActivity((p) => ({ ...p, note: e.target.value }))} /></label>
          <button className="btn" type="submit">Log activity</button>
        </form>
      </section>

      <footer className="dash-foot"><Link to="/web">Back to web</Link></footer>
    </main>
  );
}
