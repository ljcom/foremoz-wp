import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearSession, getAccountSlug, getSession } from '../lib.js';

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

export default function SalesPage() {
  const navigate = useNavigate();
  const session = getSession();
  const accountSlug = getAccountSlug(session);
  const role = String(session?.role || 'sales').toLowerCase();
  const [targetEnv, setTargetEnv] = useState('sales');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [items, setItems] = useState([
    { prospect_id: 'lead_001', full_name: 'Arif', phone: '081355550001', source: 'instagram', stage: 'new' },
    { prospect_id: 'lead_002', full_name: 'Mira', phone: '081366660002', source: 'walkin', stage: 'follow_up', follow_up_at: '2026-03-05' },
    { prospect_id: 'lead_003', full_name: 'Rafi', phone: '081377770003', source: 'referral', stage: 'won', deal_at: '2026-03-05' }
  ]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.full_name.toLowerCase().includes(q)
        || item.phone.toLowerCase().includes(q)
        || item.source.toLowerCase().includes(q)
        || item.stage.toLowerCase().includes(q)
        || item.prospect_id.toLowerCase().includes(q)
    );
  }, [items, search]);
  const insightStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const isToday = (value) => String(value || '').slice(0, 10) === today;
    const totalProspect = items.length;
    const followupToday = items.filter((item) => item.stage === 'follow_up' && isToday(item.follow_up_at)).length;
    const dealToday = items.filter((item) => (item.stage === 'won' || item.stage === 'deal') && isToday(item.deal_at)).length;
    const qualified = items.filter((item) => item.stage === 'qualified').length;
    return [
      {
        label: 'total prospek',
        value: totalProspect,
        iconClass: 'fa-solid fa-users',
        tone: 'tone-subscription',
        hint: 'all leads in pipeline'
      },
      {
        label: 'followup today',
        value: followupToday,
        iconClass: 'fa-solid fa-phone',
        tone: 'tone-checkin',
        hint: 'leads to contact today'
      },
      {
        label: 'deal today',
        value: dealToday,
        iconClass: 'fa-solid fa-handshake',
        tone: 'tone-booking',
        hint: 'closed won today'
      },
      {
        label: 'qualified',
        value: qualified,
        iconClass: 'fa-solid fa-filter-circle-dollar',
        tone: 'tone-payment',
        hint: 'ready to close'
      }
    ];
  }, [items]);

  const allFilteredSelected = filteredItems.length > 0 && filteredItems.every((item) => selected.includes(item.prospect_id));
  const allowedEnv = useMemo(() => {
    if (role === 'owner' || role === 'admin') return ['admin', 'cs', 'pt', 'sales'];
    if (role === 'cs') return ['cs'];
    if (role === 'pt') return ['pt'];
    if (role === 'sales') return ['sales'];
    return [];
  }, [role]);

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

  function togglePick(prospectId) {
    setSelected((prev) =>
      prev.includes(prospectId) ? prev.filter((id) => id !== prospectId) : [...prev, prospectId]
    );
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelected((prev) => prev.filter((id) => !filteredItems.some((item) => item.prospect_id === id)));
      return;
    }
    const filteredIds = filteredItems.map((item) => item.prospect_id);
    setSelected((prev) => Array.from(new Set([...prev, ...filteredIds])));
  }

  function deleteSelected() {
    if (selected.length === 0) return;
    setItems((prev) => prev.filter((item) => !selected.includes(item.prospect_id)));
    setSelected([]);
  }

  return (
    <main className="dashboard">
      <header className="dash-head card">
        <div>
          <p className="eyebrow">Sales Workspace</p>
          <h1>{session?.user?.fullName || 'Sales'}</h1>
          <p>Prospect pipeline</p>
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
      </section>

      <section className="card admin-main" style={{ marginTop: '1rem' }}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">Prospect</p>
            <h2>Prospect list</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn ghost" type="button" onClick={() => navigate(`/a/${accountSlug}/sales/prospects/new`)}>
              Add prospect
            </button>
            <button className="btn ghost" type="button" onClick={deleteSelected} disabled={selected.length === 0}>
              Delete selected ({selected.length})
            </button>
          </div>
        </div>

        <div className="search-box">
          <label>
            search
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="name, phone, source, stage, prospect_id"
            />
          </label>
        </div>

        <div style={{ margin: '0.75rem 0' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} />
            Select all filtered
          </label>
        </div>

        <div className="entity-list">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div className="entity-row" key={item.prospect_id}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(item.prospect_id)}
                    onChange={() => togglePick(item.prospect_id)}
                    aria-label={`select ${item.full_name}`}
                  />
                  <div>
                    <strong>{item.full_name}</strong>
                    <p>{item.phone} - {item.source} - {item.stage} - {item.prospect_id}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn ghost" onClick={() => navigate(`/a/${accountSlug}/sales/prospects/${item.prospect_id}/edit`)}>
                    Edit
                  </button>
                  <button className="btn ghost" onClick={() => setItems((prev) => prev.filter((v) => v.prospect_id !== item.prospect_id))}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">No prospect found.</p>
          )}
        </div>
      </section>

      <footer className="dash-foot"><Link to="/web">Back to web</Link></footer>
    </main>
  );
}
