import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { accountPath, apiJson, clearSession, getAccountSlug, getSession, getAllowedEnvironments } from '../lib.js';
import { MEMBER_FIXTURES } from '../member-data.js';

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

export default function DashboardPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [searchBy, setSearchBy] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dashboardRow, setDashboardRow] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberMode, setMemberMode] = useState('list');
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberForm, setMemberForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    id_card: '',
    member_id: ''
  });
  const [memberFeedback, setMemberFeedback] = useState('');

  const accountSlug = getAccountSlug(session);
  const tenantId = session?.tenant?.id || 'tn_001';
  const branchId = session?.branch?.id || 'core';
  const role = String(session?.role || 'admin').toLowerCase();
  const fullName = session?.user?.fullName || session?.user?.full_name || 'User';
  const [targetEnv, setTargetEnv] = useState(
    role === 'owner' || role === 'admin' ? 'admin' : role === 'sales' ? 'sales' : role === 'pt' ? 'pt' : 'cs'
  );

  const allowedEnv = useMemo(() => {
    return getAllowedEnvironments(session, role);
  }, [session, role]);

  useEffect(() => {
    if (allowedEnv.length === 0) return;
    if (!allowedEnv.includes(targetEnv)) {
      setTargetEnv(allowedEnv[0]);
    }
  }, [allowedEnv, targetEnv]);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError('');
      await apiJson('/v1/projections/run', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: 'core'
        })
      });
      if (branchId !== 'core') {
        await apiJson('/v1/projections/run', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: tenantId,
            branch_id: branchId
          })
        });
      }

      const [dashboardRes, membersRes] = await Promise.all([
        apiJson(`/v1/read/dashboard?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`),
          apiJson(`/v1/read/members?tenant_id=${encodeURIComponent(tenantId)}&limit=1000`)
        ]);

      if (!dashboardRes.row && branchId !== 'core') {
        const coreDashboard = await apiJson(
          `/v1/read/dashboard?tenant_id=${encodeURIComponent(tenantId)}&branch_id=core`
        );
        setDashboardRow(coreDashboard.row || null);
      } else {
        setDashboardRow(dashboardRes.row || null);
      }
      setMembers(membersRes.rows || []);
    } catch (err) {
      setError(err.message || 'failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, branchId]);

  const stats = useMemo(
    () => [
      {
        label: 'active subscription',
        value: dashboardRow?.active_subscription_count ?? 0,
        iconClass: 'fa-solid fa-id-card',
        tone: 'tone-subscription',
        hint: 'members with valid plan'
      },
      {
        label: 'today checkin',
        value: dashboardRow?.today_checkin_count ?? 0,
        iconClass: 'fa-solid fa-door-open',
        tone: 'tone-checkin',
        hint: 'visits recorded today'
      },
      {
        label: 'today booking',
        value: dashboardRow?.today_booking_count ?? 0,
        iconClass: 'fa-solid fa-calendar-check',
        tone: 'tone-booking',
        hint: 'class seats reserved'
      },
      {
        label: 'pending payment',
        value: dashboardRow?.pending_payment_count ?? 0,
        iconClass: 'fa-solid fa-money-bill',
        tone: 'tone-payment',
        hint: 'awaiting confirmation'
      }
    ],
    [dashboardRow]
  );

  const searchSource = members.length > 0 ? members : MEMBER_FIXTURES;
  const searchResults = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return searchSource;

    return searchSource.filter((member) => {
      const fields = {
        full_name: String(member.full_name || '').toLowerCase(),
        phone: String(member.phone || '').toLowerCase(),
        ktp_number: String(member.ktp_number || '').toLowerCase(),
        member_id: String(member.member_id || '').toLowerCase()
      };

      if (searchBy === 'all') {
        return Object.values(fields).some((value) => value.includes(q));
      }

      return fields[searchBy]?.includes(q);
    });
  }, [searchBy, query, searchSource]);

  function signOut() {
    clearSession();
    navigate(`/a/${accountSlug}`, { replace: true });
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
    if (env === 'cs') {
      navigate(`/a/${accountSlug}/cs/dashboard`);
      return;
    }
    navigate(`/a/${accountSlug}/cs/dashboard`);
  }

  function scanQrCode() {
    const scanned = window.prompt('Scan QR code result (member_id):', '');
    if (!scanned) return;
    setSearchBy('member_id');
    setQuery(scanned.trim());
  }

  async function addMember(e) {
    e.preventDefault();
    if (!memberForm.full_name.trim() || !memberForm.phone.trim() || !memberForm.email.trim() || !memberForm.id_card.trim()) return;

    const generatedId = memberForm.member_id.trim() || `mem_${Date.now()}`;
    try {
      setMemberSaving(true);
      setMemberFeedback('');
      await apiJson('/v1/members/register', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          member_id: generatedId,
          full_name: memberForm.full_name.trim(),
          phone: memberForm.phone.trim(),
          email: memberForm.email.trim(),
          id_card: memberForm.id_card.trim(),
          status: 'active'
        })
      });

      await loadDashboard();
      setMemberMode('list');
      setMemberForm({ full_name: '', phone: '', email: '', id_card: '', member_id: '' });
      setMemberFeedback(`member.created: ${generatedId}`);
      setSearchBy('member_id');
      setQuery(generatedId);
    } catch (err) {
      setMemberFeedback(err.message || 'failed to create member');
    } finally {
      setMemberSaving(false);
    }
  }

  return (
    <main className="dashboard">
      <header className="dash-head card">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>{session?.tenant?.gym_name || 'Foremoz Fitness Tenant'}</h1>
          <p>Welcome {fullName}</p>
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
                      {env}
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
                    {env}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <button className="btn ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <section className="stats-grid">
        {stats.map((s) => (
          <Stat key={s.label} label={s.label} value={s.value} iconClass={s.iconClass} tone={s.tone} hint={s.hint} />
        ))}
      </section>

      {loading ? <p className="feedback">Loading dashboard...</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <section className="card search-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Membership Search</p>
            <h2>Search member</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn ghost" onClick={scanQrCode}>
              Scan QR code
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setMemberMode((prev) => (prev === 'add' ? 'list' : 'add'));
                setMemberFeedback('');
              }}
            >
              {memberMode === 'add' ? 'Cancel add' : 'Add member'}
            </button>
          </div>
        </div>

        <div className="search-box">
          <label>
            search_by
            <select value={searchBy} onChange={(e) => setSearchBy(e.target.value)}>
              <option value="all">all</option>
              <option value="full_name">full_name</option>
              <option value="phone">phone</option>
              <option value="ktp_number">ktp_number</option>
              <option value="member_id">member_id</option>
            </select>
          </label>
          <label>
            query
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="name, phone, ktp_number, member_id"
            />
          </label>
        </div>

        {memberMode === 'add' ? (
          <form className="form" onSubmit={addMember} style={{ marginTop: '0.75rem' }}>
            <label>
              full_name
              <input
                value={memberForm.full_name}
                onChange={(e) => setMemberForm((prev) => ({ ...prev, full_name: e.target.value }))}
                placeholder="Nama member"
              />
            </label>
            <label>
              phone
              <input
                value={memberForm.phone}
                onChange={(e) => setMemberForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="08xxxxxxxxxx"
              />
            </label>
            <label>
              email
              <input
                type="email"
                value={memberForm.email}
                onChange={(e) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="member@email.com"
              />
            </label>
            <label>
              id_card
              <input
                value={memberForm.id_card}
                onChange={(e) => setMemberForm((prev) => ({ ...prev, id_card: e.target.value }))}
                placeholder="KTP / ID Card"
              />
            </label>
            <label>
              member_id (optional)
              <input
                value={memberForm.member_id}
                onChange={(e) => setMemberForm((prev) => ({ ...prev, member_id: e.target.value }))}
                placeholder="auto-generate if empty"
              />
            </label>
            <button className="btn" type="submit" disabled={memberSaving}>
              {memberSaving ? 'Saving...' : 'Save member'}
            </button>
          </form>
        ) : null}

        {memberFeedback ? <p className="feedback">{memberFeedback}</p> : null}

        <div className="search-result-list">
          {searchResults.length > 0 ? (
            searchResults.map((member) => (
              <button
                key={member.member_id}
                className="member-row"
                onClick={() => navigate(accountPath(session, `/members/${member.member_id}`))}
              >
                <strong>{member.full_name}</strong>
                <span>{member.member_id}</span>
                <span>{member.phone}</span>
                <span className={`status ${member.status}`}>{member.status}</span>
              </button>
            ))
          ) : (
            <p className="muted">No member found.</p>
          )}
        </div>
      </section>

      <footer className="dash-foot">
        <Link to="/">Back to landing</Link>
      </footer>
    </main>
  );
}
