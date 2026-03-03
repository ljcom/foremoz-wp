import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAccountSlug, getSession } from '../lib.js';

export default function SalesPage() {
  const navigate = useNavigate();
  const session = getSession();
  const accountSlug = getAccountSlug(session);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [items, setItems] = useState([
    { prospect_id: 'lead_001', full_name: 'Arif', phone: '081355550001', source: 'instagram', stage: 'new' },
    { prospect_id: 'lead_002', full_name: 'Mira', phone: '081366660002', source: 'walkin', stage: 'follow_up' }
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

  const allFilteredSelected = filteredItems.length > 0 && filteredItems.every((item) => selected.includes(item.prospect_id));

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
        <div className="meta"><code>role: sales</code><code>{session?.tenant?.namespace || '-'}</code></div>
      </header>

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
