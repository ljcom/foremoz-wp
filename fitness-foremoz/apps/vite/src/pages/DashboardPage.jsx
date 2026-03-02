import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL, clearSession, getSession } from '../lib.js';
import { findMembers } from '../member-data.js';

function Stat({ label, value }) {
  return (
    <article className="stat">
      <p>{label}</p>
      <h3>{value}</h3>
    </article>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [searchBy, setSearchBy] = useState('all');
  const [query, setQuery] = useState('');

  const namespace = session?.tenant?.namespace || '-';
  const chain = session?.branch?.chain || 'core';

  const stats = useMemo(
    () => [
      { label: 'active subscription', value: 128 },
      { label: 'today checkin', value: 94 },
      { label: 'today booking', value: 36 },
      { label: 'pending payment', value: 11 }
    ],
    []
  );

  const searchResults = useMemo(() => findMembers(searchBy, query), [searchBy, query]);

  function signOut() {
    clearSession();
    navigate('/signin', { replace: true });
  }

  function scanQrCode() {
    const scanned = window.prompt('Scan QR code result (member_id):', '');
    if (!scanned) return;
    setSearchBy('member_id');
    setQuery(scanned.trim());
  }

  return (
    <main className="dashboard">
      <header className="dash-head card">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>{session?.tenant?.gym_name || 'Foremoz Fitness Tenant'}</h1>
          <p>{session?.user?.email || '-'}</p>
        </div>
        <div className="meta">
          <code>namespace: {namespace}</code>
          <code>chain: {chain}</code>
          <code>api: {API_BASE_URL}</code>
          <button className="btn ghost" onClick={() => navigate('/dashboard/admin')}>
            Admin
          </button>
          <button className="btn ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <section className="stats-grid">
        {stats.map((s) => (
          <Stat key={s.label} label={s.label} value={s.value} />
        ))}
      </section>

      <section className="card search-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Membership Search</p>
            <h2>Search member</h2>
          </div>
          <button className="btn ghost" onClick={scanQrCode}>
            Scan QR code
          </button>
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

        {query.trim() ? (
          <div className="search-result-list">
            {searchResults.length > 0 ? (
              searchResults.map((member) => (
                <button
                  key={member.member_id}
                  className="member-row"
                  onClick={() => navigate(`/members/${member.member_id}`)}
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
        ) : (
          <p className="muted">Input query to show member result.</p>
        )}
      </section>

      <footer className="dash-foot">
        <Link to="/">Back to landing</Link>
      </footer>
    </main>
  );
}
