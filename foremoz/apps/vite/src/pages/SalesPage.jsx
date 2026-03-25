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
      throw new Error(`${label} custom_fields must be JSON object`);
    }
    return parsed;
  } catch {
    throw new Error(`${label} custom_fields is invalid JSON object`);
  }
}

function toIso(value) {
  const source = String(value || '').trim();
  if (!source) return null;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toInputDatetime(value) {
  const source = String(value || '').trim();
  if (!source) return '';
  if (source.includes('T')) return source.slice(0, 16);
  if (source.includes(' ')) return source.replace(' ', 'T').slice(0, 16);
  return source.slice(0, 16);
}

function formatDateTime(value) {
  const source = String(value || '').trim();
  if (!source) return '-';
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return source;
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function SalesPage() {
  const navigate = useNavigate();
  const session = getSession();
  const accountSlug = getAccountSlug(session);
  const role = String(session?.role || 'sales').toLowerCase();
  const tenantId = session?.tenant?.id || 'tn_001';
  const branchId = session?.branch?.id || 'core';
  const userId = session?.user?.userId || null;
  const [targetEnv, setTargetEnv] = useState('sales');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [selectedProspectId, setSelectedProspectId] = useState('');
  const [selected, setSelected] = useState([]);
  const [items, setItems] = useState([]);
  const [timelineRows, setTimelineRows] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [newForm, setNewForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    id_card: '',
    source: 'walkin',
    notes: '',
    next_followup_at: '',
    custom_fields_text: ''
  });
  const [followupForm, setFollowupForm] = useState({
    notes: '',
    stage: 'followup',
    next_followup_at: '',
    custom_fields_text: ''
  });
  const [convertForm, setConvertForm] = useState({
    create_member: true,
    converted_member_id: '',
    full_name: '',
    email: '',
    phone: '',
    id_card: '',
    notes: '',
    custom_fields_text: ''
  });

  const allowedEnv = useMemo(() => {
    return getAllowedEnvironments(session, role);
  }, [session, role]);

  const selectedProspect = useMemo(
    () => items.find((item) => String(item.prospect_id || '') === String(selectedProspectId || '')) || null,
    [items, selectedProspectId]
  );

  const insightStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const totalProspect = items.length;
    const followupToday = items.filter((item) => String(item.next_followup_at || '').slice(0, 10) === today).length;
    const dealToday = items.filter((item) => String(item.converted_at || '').slice(0, 10) === today).length;
    const qualified = items.filter((item) => String(item.stage || '').toLowerCase() === 'qualified').length;
    return [
      { label: 'total prospect', value: totalProspect, iconClass: 'fa-solid fa-users', tone: 'tone-subscription', hint: 'all leads in pipeline' },
      { label: 'followup today', value: followupToday, iconClass: 'fa-solid fa-phone', tone: 'tone-checkin', hint: 'scheduled follow-up today' },
      { label: 'deal today', value: dealToday, iconClass: 'fa-solid fa-handshake', tone: 'tone-booking', hint: 'converted today' },
      { label: 'qualified', value: qualified, iconClass: 'fa-solid fa-filter-circle-dollar', tone: 'tone-payment', hint: 'ready to convert' }
    ];
  }, [items]);

  useEffect(() => {
    if (allowedEnv.length === 0) return;
    if (!allowedEnv.includes(targetEnv)) {
      setTargetEnv(allowedEnv[0]);
    }
  }, [allowedEnv, targetEnv]);

  async function loadSalesWorkspace() {
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
      const qs = new URLSearchParams();
      qs.set('tenant_id', tenantId);
      if (stageFilter !== 'all') {
        qs.set('stage', stageFilter);
      }
      if (search.trim()) {
        qs.set('q', search.trim());
      }
      if (role === 'sales' && userId) {
        qs.set('owner_sales_id', userId);
      }
      const result = await apiJson(`/v1/read/sales/prospects?${qs.toString()}`);
      setItems(Array.isArray(result.rows) ? result.rows : []);
    } catch (err) {
      setError(err.message || 'failed to load sales workspace');
    } finally {
      setLoading(false);
    }
  }

  async function loadProspectTimeline(prospectId) {
    if (!prospectId) {
      setTimelineRows([]);
      return;
    }
    try {
      setTimelineLoading(true);
      const result = await apiJson(
        `/v1/read/sales/prospects/${encodeURIComponent(prospectId)}/timeline?tenant_id=${encodeURIComponent(tenantId)}`
      );
      setTimelineRows(Array.isArray(result.rows) ? result.rows : []);
    } catch {
      setTimelineRows([]);
    } finally {
      setTimelineLoading(false);
    }
  }

  useEffect(() => {
    loadSalesWorkspace();
  }, [tenantId, branchId, role, userId, search, stageFilter]);

  useEffect(() => {
    loadProspectTimeline(selectedProspectId);
  }, [selectedProspectId, tenantId]);

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

  async function createProspect(e) {
    e.preventDefault();
    if (!newForm.full_name.trim()) {
      setFeedback('full_name is required');
      return;
    }
    try {
      setSaving(true);
      setFeedback('');
      const customFields = parseCustomFieldsInput(newForm.custom_fields_text, 'Create prospect');
      await apiJson('/v1/sales/prospects', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: userId || undefined,
          owner_sales_id: userId || undefined,
          full_name: newForm.full_name.trim(),
          email: newForm.email.trim() || null,
          phone: newForm.phone.trim() || null,
          id_card: newForm.id_card.trim() || null,
          source: newForm.source.trim() || null,
          notes: newForm.notes.trim() || null,
          next_followup_at: toIso(newForm.next_followup_at),
          custom_fields: customFields
        })
      });
      setFeedback(`prospect.created: ${newForm.full_name}`);
      setNewForm({
        full_name: '',
        email: '',
        phone: '',
        id_card: '',
        source: 'walkin',
        notes: '',
        next_followup_at: '',
        custom_fields_text: ''
      });
      await loadSalesWorkspace();
    } catch (err) {
      setFeedback(err.message || 'failed to create prospect');
    } finally {
      setSaving(false);
    }
  }

  async function updateProspectStage(item, stage) {
    if (!item?.prospect_id) return;
    try {
      setSaving(true);
      setFeedback('');
      await apiJson(`/v1/sales/prospects/${encodeURIComponent(item.prospect_id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          tenant_id: tenantId,
          actor_id: userId || undefined,
          stage
        })
      });
      setFeedback(`prospect.stage.updated: ${item.prospect_id} -> ${stage}`);
      await loadSalesWorkspace();
      await loadProspectTimeline(item.prospect_id);
    } catch (err) {
      setFeedback(err.message || 'failed to update stage');
    } finally {
      setSaving(false);
    }
  }

  function openFollowup(item) {
    setSelectedProspectId(item.prospect_id);
    setFollowupForm({
      notes: '',
      stage: 'followup',
      next_followup_at: toInputDatetime(item.next_followup_at),
      custom_fields_text: item.custom_fields ? JSON.stringify(item.custom_fields) : ''
    });
  }

  async function submitFollowup(e) {
    e.preventDefault();
    if (!selectedProspectId) return;
    try {
      setSaving(true);
      setFeedback('');
      const customFields = parseCustomFieldsInput(followupForm.custom_fields_text, 'Follow-up');
      await apiJson(`/v1/sales/prospects/${encodeURIComponent(selectedProspectId)}/followup`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: userId || undefined,
          owner_sales_id: userId || undefined,
          stage: followupForm.stage,
          notes: followupForm.notes.trim() || null,
          next_followup_at: toIso(followupForm.next_followup_at),
          custom_fields: customFields
        })
      });
      setFeedback(`prospect.followup.logged: ${selectedProspectId}`);
      await loadSalesWorkspace();
      await loadProspectTimeline(selectedProspectId);
    } catch (err) {
      setFeedback(err.message || 'failed to log followup');
    } finally {
      setSaving(false);
    }
  }

  function openConvert(item) {
    setSelectedProspectId(item.prospect_id);
    setConvertForm({
      create_member: true,
      converted_member_id: '',
      full_name: item.full_name || '',
      email: item.email || '',
      phone: item.phone || '',
      id_card: item.id_card || '',
      notes: '',
      custom_fields_text: item.custom_fields ? JSON.stringify(item.custom_fields) : ''
    });
  }

  async function submitConvert(e) {
    e.preventDefault();
    if (!selectedProspectId) return;
    try {
      setSaving(true);
      setFeedback('');
      const customFields = parseCustomFieldsInput(convertForm.custom_fields_text, 'Convert');
      await apiJson(`/v1/sales/prospects/${encodeURIComponent(selectedProspectId)}/convert`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: userId || undefined,
          create_member: Boolean(convertForm.create_member),
          converted_member_id: convertForm.converted_member_id.trim() || null,
          full_name: convertForm.full_name.trim() || null,
          email: convertForm.email.trim() || null,
          phone: convertForm.phone.trim() || null,
          id_card: convertForm.id_card.trim() || null,
          notes: convertForm.notes.trim() || null,
          custom_fields: customFields
        })
      });
      setFeedback(`prospect.converted: ${selectedProspectId}`);
      await loadSalesWorkspace();
      await loadProspectTimeline(selectedProspectId);
    } catch (err) {
      setFeedback(err.message || 'failed to convert prospect');
    } finally {
      setSaving(false);
    }
  }

  async function markSelectedLost() {
    if (selected.length === 0) return;
    try {
      setSaving(true);
      setFeedback('');
      for (const prospectId of selected) {
        await apiJson(`/v1/sales/prospects/${encodeURIComponent(prospectId)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            tenant_id: tenantId,
            actor_id: userId || undefined,
            stage: 'lost'
          })
        });
      }
      setFeedback(`prospect.lost.bulk: ${selected.length}`);
      setSelected([]);
      await loadSalesWorkspace();
    } catch (err) {
      setFeedback(err.message || 'failed to update selected prospect');
    } finally {
      setSaving(false);
    }
  }

  function togglePick(prospectId) {
    setSelected((prev) =>
      prev.includes(prospectId) ? prev.filter((id) => id !== prospectId) : [...prev, prospectId]
    );
  }

  const allFilteredSelected = items.length > 0 && items.every((item) => selected.includes(item.prospect_id));

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelected([]);
      return;
    }
    setSelected(items.map((item) => item.prospect_id));
  }

  return (
    <main className="dashboard">
      <header className="dash-head card">
        <div>
          <p className="eyebrow">Sales Workspace</p>
          <h1>{session?.user?.fullName || 'Sales'}</h1>
          <p>Prospect pipeline with follow-up and conversion</p>
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
        {loading ? <p className="feedback">Loading sales workspace...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {feedback ? <p className="feedback">{feedback}</p> : null}
      </section>

      <section className="card admin-main" style={{ marginTop: '1rem' }}>
        <h2>Add prospect</h2>
        <form className="form" onSubmit={createProspect}>
          <label>full_name<input value={newForm.full_name} onChange={(e) => setNewForm((p) => ({ ...p, full_name: e.target.value }))} /></label>
          <label>email<input type="email" value={newForm.email} onChange={(e) => setNewForm((p) => ({ ...p, email: e.target.value }))} /></label>
          <label>phone<input value={newForm.phone} onChange={(e) => setNewForm((p) => ({ ...p, phone: e.target.value }))} /></label>
          <label>id_card<input value={newForm.id_card} onChange={(e) => setNewForm((p) => ({ ...p, id_card: e.target.value }))} /></label>
          <label>source
            <select value={newForm.source} onChange={(e) => setNewForm((p) => ({ ...p, source: e.target.value }))}>
              <option value="walkin">walkin</option>
              <option value="instagram">instagram</option>
              <option value="referral">referral</option>
              <option value="website">website</option>
            </select>
          </label>
          <label>notes<input value={newForm.notes} onChange={(e) => setNewForm((p) => ({ ...p, notes: e.target.value }))} /></label>
          <label>next_followup_at<input type="datetime-local" value={newForm.next_followup_at} onChange={(e) => setNewForm((p) => ({ ...p, next_followup_at: e.target.value }))} /></label>
          <label>custom_fields (JSON)<textarea rows={3} value={newForm.custom_fields_text} onChange={(e) => setNewForm((p) => ({ ...p, custom_fields_text: e.target.value }))} placeholder='{"campaign":"ramadan","budget":"starter"}' /></label>
          <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create prospect'}</button>
        </form>
      </section>

      <section className="card admin-main" style={{ marginTop: '1rem' }}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">Prospect</p>
            <h2>Prospect list</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label>stage
              <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                <option value="all">all</option>
                <option value="new">new</option>
                <option value="followup">followup</option>
                <option value="qualified">qualified</option>
                <option value="converted">converted</option>
                <option value="lost">lost</option>
              </select>
            </label>
            <button className="btn ghost" type="button" onClick={markSelectedLost} disabled={selected.length === 0 || saving}>
              Mark lost ({selected.length})
            </button>
          </div>
        </div>

        <label>
          search
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="name, email, phone, source, stage, prospect_id"
          />
        </label>

        <div style={{ margin: '0.75rem 0' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} />
            Select all listed
          </label>
        </div>

        <div className="entity-list">
          {items.length > 0 ? (
            items.map((item) => {
              const isSelected = String(selectedProspectId || '') === String(item.prospect_id || '');
              return (
                <div className="entity-row" key={item.prospect_id} style={isSelected ? { border: '1px solid #d97706' } : undefined}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.prospect_id)}
                      onChange={() => togglePick(item.prospect_id)}
                      aria-label={`select ${item.full_name}`}
                    />
                    <div>
                      <strong>{item.full_name}</strong>
                      <p>{item.email || '-'} | {item.phone || '-'} | {item.source || '-'}</p>
                      <p>{item.stage} | followup: {formatDateTime(item.next_followup_at)} | converted: {item.converted_member_id || '-'}</p>
                    </div>
                  </div>
                  <div className="row-actions" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button className="btn ghost small" type="button" onClick={() => setSelectedProspectId(item.prospect_id)}>Detail</button>
                    <button className="btn ghost small" type="button" onClick={() => openFollowup(item)}>Follow-up</button>
                    <button className="btn ghost small" type="button" onClick={() => updateProspectStage(item, 'qualified')} disabled={saving}>Qualified</button>
                    <button className="btn ghost small" type="button" onClick={() => updateProspectStage(item, 'lost')} disabled={saving}>Lost</button>
                    <button className="btn ghost small" type="button" onClick={() => openConvert(item)}>Convert</button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="muted">No prospect found.</p>
          )}
        </div>
      </section>

      {selectedProspect ? (
        <section className="card admin-main" style={{ marginTop: '1rem' }}>
          <h2>Prospect detail - {selectedProspect.full_name}</h2>
          <p>ID: {selectedProspect.prospect_id}</p>
          <p>Custom fields: {selectedProspect.custom_fields ? JSON.stringify(selectedProspect.custom_fields) : '-'}</p>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <form className="form" onSubmit={submitFollowup}>
              <p className="eyebrow">Follow-up</p>
              <label>stage
                <select value={followupForm.stage} onChange={(e) => setFollowupForm((p) => ({ ...p, stage: e.target.value }))}>
                  <option value="followup">followup</option>
                  <option value="qualified">qualified</option>
                  <option value="new">new</option>
                </select>
              </label>
              <label>notes<input value={followupForm.notes} onChange={(e) => setFollowupForm((p) => ({ ...p, notes: e.target.value }))} /></label>
              <label>next_followup_at<input type="datetime-local" value={followupForm.next_followup_at} onChange={(e) => setFollowupForm((p) => ({ ...p, next_followup_at: e.target.value }))} /></label>
              <label>custom_fields (JSON)<textarea rows={3} value={followupForm.custom_fields_text} onChange={(e) => setFollowupForm((p) => ({ ...p, custom_fields_text: e.target.value }))} placeholder='{"channel":"wa","result":"interested"}' /></label>
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Log follow-up'}</button>
            </form>

            <form className="form" onSubmit={submitConvert}>
              <p className="eyebrow">Convert</p>
              <label style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={Boolean(convertForm.create_member)}
                  onChange={(e) => setConvertForm((p) => ({ ...p, create_member: e.target.checked }))}
                />
                create member automatically
              </label>
              <label>converted_member_id (optional)<input value={convertForm.converted_member_id} onChange={(e) => setConvertForm((p) => ({ ...p, converted_member_id: e.target.value }))} /></label>
              <label>full_name<input value={convertForm.full_name} onChange={(e) => setConvertForm((p) => ({ ...p, full_name: e.target.value }))} /></label>
              <label>email<input type="email" value={convertForm.email} onChange={(e) => setConvertForm((p) => ({ ...p, email: e.target.value }))} /></label>
              <label>phone<input value={convertForm.phone} onChange={(e) => setConvertForm((p) => ({ ...p, phone: e.target.value }))} /></label>
              <label>id_card<input value={convertForm.id_card} onChange={(e) => setConvertForm((p) => ({ ...p, id_card: e.target.value }))} /></label>
              <label>notes<input value={convertForm.notes} onChange={(e) => setConvertForm((p) => ({ ...p, notes: e.target.value }))} /></label>
              <label>custom_fields (JSON)<textarea rows={3} value={convertForm.custom_fields_text} onChange={(e) => setConvertForm((p) => ({ ...p, custom_fields_text: e.target.value }))} placeholder='{"conversion_reason":"trial completed"}' /></label>
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Convert prospect'}</button>
            </form>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <p className="eyebrow">Timeline</p>
            {timelineLoading ? (
              <p className="feedback">Loading timeline...</p>
            ) : timelineRows.length > 0 ? (
              <div className="entity-list">
                {timelineRows.map((row) => (
                  <div className="entity-row" key={`${row.sequence}:${row.event_type}`}>
                    <div>
                      <strong>{row.event_type}</strong>
                      <p>{formatDateTime(row.ts || row.data?.updated_at)}</p>
                      <p>{JSON.stringify(row.data || {})}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No timeline yet.</p>
            )}
          </div>
        </section>
      ) : null}

      <footer className="dash-foot"><Link to="/web">Back to web</Link></footer>
    </main>
  );
}
