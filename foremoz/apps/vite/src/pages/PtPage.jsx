import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiJson, clearSession, getAccountSlug, getAllowedEnvironments, getEnvironmentLabel, getSession } from '../lib.js';

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

function parseCustomFieldsInput(raw, label) {
  const source = String(raw || '').trim();
  if (!source) return {};
  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`${label} custom_fields harus object JSON.`);
    }
    return parsed;
  } catch {
    throw new Error(`${label} custom_fields tidak valid (format JSON object).`);
  }
}

export default function PtPage() {
  const navigate = useNavigate();
  const session = getSession();
  const accountSlug = getAccountSlug(session);
  const role = String(session?.role || 'pt').toLowerCase();
  const tenantId = session?.tenant?.id || 'tn_001';
  const branchId = session?.branch?.id || 'core';
  const trainerId = session?.user?.userId || null;
  const [targetEnv, setTargetEnv] = useState('pt');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [ptBalances, setPtBalances] = useState([]);
  const [ptActivityRows, setPtActivityRows] = useState([]);
  const [bookForm, setBookForm] = useState({
    pt_package_id: '',
    member_id: '',
    session_at: new Date().toISOString().slice(0, 16),
    activity_note: '',
    custom_fields_text: ''
  });
  const [completeForm, setCompleteForm] = useState({
    pt_package_id: '',
    member_id: '',
    session_id: '',
    completed_at: new Date().toISOString().slice(0, 16),
    activity_note: '',
    custom_fields_text: ''
  });
  const [activityForm, setActivityForm] = useState({
    pt_package_id: '',
    member_id: '',
    session_at: new Date().toISOString().slice(0, 16),
    activity_note: '',
    custom_fields_text: ''
  });
  const allowedEnv = useMemo(() => {
    return getAllowedEnvironments(session, role);
  }, [session, role]);

  useEffect(() => {
    if (allowedEnv.length === 0) return;
    if (!allowedEnv.includes(targetEnv)) {
      setTargetEnv(allowedEnv[0]);
    }
  }, [allowedEnv, targetEnv]);
  const insightStats = useMemo(() => {
    const uniqueMembers = new Set(ptBalances.map((item) => String(item.member_id || '').trim()).filter(Boolean)).size;
    const remainingSessions = ptBalances.reduce((sum, row) => sum + Number(row.remaining_sessions || 0), 0);
    const today = new Date().toISOString().slice(0, 10);
    const todaySessions = ptActivityRows.filter((row) => String(row.session_at || '').slice(0, 10) === today).length;
    return [
      {
        label: 'active member',
        value: uniqueMembers,
        iconClass: 'fa-solid fa-user-group',
        tone: 'tone-subscription',
        hint: 'member assigned to this PT'
      },
      {
        label: 'remaining session',
        value: remainingSessions,
        iconClass: 'fa-solid fa-dumbbell',
        tone: 'tone-booking',
        hint: 'across active PT package'
      },
      {
        label: 'today activity',
        value: todaySessions,
        iconClass: 'fa-solid fa-calendar-day',
        tone: 'tone-checkin',
        hint: 'booked, completed, and log'
      }
    ];
  }, [ptBalances, ptActivityRows]);

  async function loadPtWorkspace() {
    try {
      setLoading(true);
      setError('');
      await apiJson('/v1/projections/run', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId
        })
      }).catch(() => {});
      const trainerFilter = trainerId ? `&trainer_id=${encodeURIComponent(trainerId)}` : '';
      const [balanceRes, activityRes] = await Promise.all([
        apiJson(`/v1/read/pt-balance?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}${trainerFilter}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/read/pt-activity?tenant_id=${encodeURIComponent(tenantId)}${trainerFilter}`).catch(() => ({ rows: [] }))
      ]);
      const balances = Array.isArray(balanceRes.rows) ? balanceRes.rows : [];
      setPtBalances(balances);
      setPtActivityRows(Array.isArray(activityRes.rows) ? activityRes.rows : []);

      if (balances.length > 0) {
        const first = balances[0];
        setBookForm((prev) => ({
          ...prev,
          pt_package_id: prev.pt_package_id || String(first.pt_package_id || ''),
          member_id: prev.member_id || String(first.member_id || '')
        }));
        setCompleteForm((prev) => ({
          ...prev,
          pt_package_id: prev.pt_package_id || String(first.pt_package_id || ''),
          member_id: prev.member_id || String(first.member_id || '')
        }));
        setActivityForm((prev) => ({
          ...prev,
          pt_package_id: prev.pt_package_id || String(first.pt_package_id || ''),
          member_id: prev.member_id || String(first.member_id || '')
        }));
      }
    } catch (err) {
      setError(err.message || 'failed to load PT workspace');
    } finally {
      setLoading(false);
    }
  }

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

  function toIso(value) {
    if (!value) return new Date().toISOString();
    return new Date(value).toISOString();
  }

  async function submitBookSession(e) {
    e.preventDefault();
    if (!bookForm.pt_package_id || !bookForm.member_id || !bookForm.session_at) {
      setFeedback('Lengkapi package, member, dan jadwal sesi.');
      return;
    }
    try {
      setSaving(true);
      setFeedback('');
      const customFields = parseCustomFieldsInput(bookForm.custom_fields_text, 'Book session');
      await apiJson('/v1/pt/sessions/book', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: trainerId || undefined,
          trainer_id: trainerId || undefined,
          pt_package_id: bookForm.pt_package_id,
          member_id: bookForm.member_id,
          session_at: toIso(bookForm.session_at),
          activity_note: bookForm.activity_note || null,
          custom_fields: customFields
        })
      });
      setFeedback('Session booked.');
      await loadPtWorkspace();
    } catch (err) {
      setFeedback(err.message || 'Gagal booking session.');
    } finally {
      setSaving(false);
    }
  }

  async function submitCompleteSession(e) {
    e.preventDefault();
    if (!completeForm.pt_package_id || !completeForm.member_id || !completeForm.completed_at) {
      setFeedback('Lengkapi package, member, dan waktu selesai sesi.');
      return;
    }
    try {
      setSaving(true);
      setFeedback('');
      const customFields = parseCustomFieldsInput(completeForm.custom_fields_text, 'Complete session');
      await apiJson(`/v1/pt/sessions/${encodeURIComponent(completeForm.pt_package_id)}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: trainerId || undefined,
          trainer_id: trainerId || undefined,
          member_id: completeForm.member_id,
          session_id: completeForm.session_id || null,
          completed_at: toIso(completeForm.completed_at),
          activity_note: completeForm.activity_note || null,
          custom_fields: customFields
        })
      });
      setFeedback('Session completed.');
      await loadPtWorkspace();
    } catch (err) {
      setFeedback(err.message || 'Gagal menyelesaikan session.');
    } finally {
      setSaving(false);
    }
  }

  async function submitActivityLog(e) {
    e.preventDefault();
    if (!activityForm.member_id || !activityForm.activity_note) {
      setFeedback('Lengkapi member dan catatan aktivitas.');
      return;
    }
    try {
      setSaving(true);
      setFeedback('');
      const customFields = parseCustomFieldsInput(activityForm.custom_fields_text, 'Activity log');
      await apiJson('/v1/pt/activity/log', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: trainerId || undefined,
          trainer_id: trainerId || undefined,
          pt_package_id: activityForm.pt_package_id || null,
          member_id: activityForm.member_id,
          session_at: toIso(activityForm.session_at),
          activity_note: activityForm.activity_note,
          custom_fields: customFields
        })
      });
      setFeedback('Activity logged.');
      setActivityForm((prev) => ({ ...prev, activity_note: '' }));
      await loadPtWorkspace();
    } catch (err) {
      setFeedback(err.message || 'Gagal log activity.');
    } finally {
      setSaving(false);
    }
  }

  function seedFormsFromBalance(row) {
    const packageId = String(row?.pt_package_id || '');
    const memberId = String(row?.member_id || '');
    setBookForm((prev) => ({ ...prev, pt_package_id: packageId, member_id: memberId }));
    setCompleteForm((prev) => ({ ...prev, pt_package_id: packageId, member_id: memberId }));
    setActivityForm((prev) => ({ ...prev, pt_package_id: packageId, member_id: memberId }));
  }

  useEffect(() => {
    loadPtWorkspace();
  }, [tenantId, branchId, trainerId]);

  return (
    <main className="dashboard">
      <header className="dash-head card">
        <div>
          <p className="eyebrow">PT Workspace</p>
          <h1>{session?.user?.fullName || 'PT'}</h1>
          <p>Session booking, completion, and member activity tracking</p>
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
        {loading ? <p className="feedback">Loading PT workspace...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {feedback ? <p className="feedback">{feedback}</p> : null}
      </section>

      <section className="card admin-main" style={{ marginTop: '1rem' }}>
        <h2>PT package balance</h2>
        <div className="entity-list">
          {ptBalances.map((item) => (
            <div className="entity-row" key={`${item.pt_package_id}:${item.member_id}`}>
              <div>
                <strong>{item.member_id} - {item.pt_package_id}</strong>
                <p>remaining {item.remaining_sessions} / total {item.total_sessions} | consumed {item.consumed_sessions}</p>
              </div>
              <button className="btn ghost" onClick={() => seedFormsFromBalance(item)}>Use</button>
            </div>
          ))}
        </div>
      </section>

      <section className="card admin-main" style={{ marginTop: '1rem' }}>
        <h2>PT actions</h2>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <form className="form" onSubmit={submitBookSession}>
            <p className="eyebrow">Book session</p>
            <label>pt_package_id<input value={bookForm.pt_package_id} onChange={(e) => setBookForm((p) => ({ ...p, pt_package_id: e.target.value }))} /></label>
            <label>member_id<input value={bookForm.member_id} onChange={(e) => setBookForm((p) => ({ ...p, member_id: e.target.value }))} /></label>
            <label>session_at<input type="datetime-local" value={bookForm.session_at} onChange={(e) => setBookForm((p) => ({ ...p, session_at: e.target.value }))} /></label>
            <label>activity_note<input value={bookForm.activity_note} onChange={(e) => setBookForm((p) => ({ ...p, activity_note: e.target.value }))} /></label>
            <label>custom_fields (JSON)<textarea rows={3} value={bookForm.custom_fields_text} onChange={(e) => setBookForm((p) => ({ ...p, custom_fields_text: e.target.value }))} placeholder='{"intensity":"high","coach_note":"focus core"}' /></label>
            <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Book session'}</button>
          </form>

          <form className="form" onSubmit={submitCompleteSession}>
            <p className="eyebrow">Complete session</p>
            <label>pt_package_id<input value={completeForm.pt_package_id} onChange={(e) => setCompleteForm((p) => ({ ...p, pt_package_id: e.target.value }))} /></label>
            <label>member_id<input value={completeForm.member_id} onChange={(e) => setCompleteForm((p) => ({ ...p, member_id: e.target.value }))} /></label>
            <label>session_id<input value={completeForm.session_id} onChange={(e) => setCompleteForm((p) => ({ ...p, session_id: e.target.value }))} /></label>
            <label>completed_at<input type="datetime-local" value={completeForm.completed_at} onChange={(e) => setCompleteForm((p) => ({ ...p, completed_at: e.target.value }))} /></label>
            <label>completion_note<input value={completeForm.activity_note} onChange={(e) => setCompleteForm((p) => ({ ...p, activity_note: e.target.value }))} /></label>
            <label>custom_fields (JSON)<textarea rows={3} value={completeForm.custom_fields_text} onChange={(e) => setCompleteForm((p) => ({ ...p, custom_fields_text: e.target.value }))} placeholder='{"session_quality":4,"mood":"good"}' /></label>
            <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Complete session'}</button>
          </form>

          <form className="form" onSubmit={submitActivityLog}>
            <p className="eyebrow">Log activity</p>
            <label>pt_package_id (optional)<input value={activityForm.pt_package_id} onChange={(e) => setActivityForm((p) => ({ ...p, pt_package_id: e.target.value }))} /></label>
            <label>member_id<input value={activityForm.member_id} onChange={(e) => setActivityForm((p) => ({ ...p, member_id: e.target.value }))} /></label>
            <label>session_at<input type="datetime-local" value={activityForm.session_at} onChange={(e) => setActivityForm((p) => ({ ...p, session_at: e.target.value }))} /></label>
            <label>activity_note<input value={activityForm.activity_note} onChange={(e) => setActivityForm((p) => ({ ...p, activity_note: e.target.value }))} /></label>
            <label>custom_fields (JSON)<textarea rows={3} value={activityForm.custom_fields_text} onChange={(e) => setActivityForm((p) => ({ ...p, custom_fields_text: e.target.value }))} placeholder='{"exercise":"deadlift","weight_kg":80}' /></label>
            <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Log activity'}</button>
          </form>
        </div>
      </section>

      <section className="card admin-main" style={{ marginTop: '1rem' }}>
        <h2>PT timeline</h2>
        <div className="entity-list">
          {ptActivityRows.map((item) => (
            <div className="entity-row" key={item.activity_id}>
              <div>
                <strong>{item.member_id} {item.pt_package_id ? `- ${item.pt_package_id}` : ''}</strong>
                <p>{item.session_at} | {item.activity_type || 'activity_logged'}{item.session_id ? ` | session ${item.session_id}` : ''}</p>
                <p>{item.activity_note || '-'}</p>
                <p>{item.custom_fields && Object.keys(item.custom_fields).length > 0 ? `custom_fields: ${JSON.stringify(item.custom_fields)}` : 'custom_fields: -'}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="dash-foot"><Link to="/host">Back to host</Link></footer>
    </main>
  );
}
