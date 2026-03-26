import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearSession, getSession } from '../lib.js';

export default function GovPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [feedback, setFeedback] = useState('');

  const [tenants, setTenants] = useState([
    {
      tenant_id: 'raifit',
      plan: 'growth',
      monthly_price: 3500000,
      status: 'active',
      mrr: 3500000,
      active_member: 412,
      checkin_30d: 4980
    },
    {
      tenant_id: 'fitcamp',
      plan: 'starter',
      monthly_price: 1800000,
      status: 'active',
      mrr: 1800000,
      active_member: 170,
      checkin_30d: 1830
    },
    {
      tenant_id: 'motionlab',
      plan: 'enterprise',
      monthly_price: 7600000,
      status: 'suspended',
      mrr: 0,
      active_member: 0,
      checkin_30d: 0
    }
  ]);

  const [form, setForm] = useState({ tenant_id: 'raifit', new_price: '', promo_code: '', free_months: '1' });

  function updateTenant(tenantId, patch, message) {
    setTenants((prev) => prev.map((t) => (t.tenant_id === tenantId ? { ...t, ...patch } : t)));
    setFeedback(message);
  }

  return (
    <main className="dashboard">
      <header className="dash-head card">
        <div>
          <p className="eyebrow">Gov Console</p>
          <h1>Cross-tenant control</h1>
          <p>Global performance, policy, pricing, and promotion control.</p>
        </div>
        <div className="meta">
          <code>role: gov</code>
          <code>actor: {session?.user?.email || '-'}</code>
          <button className="btn ghost" onClick={() => navigate('/newevent')}>Back to newevent</button>
          <button
            className="btn ghost"
            onClick={() => {
              clearSession();
              navigate('/signin', { replace: true });
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="card admin-main" style={{ marginTop: '1rem' }}>
        <h2>Tenant performance overview</h2>
        <div className="entity-list">
          {tenants.map((t) => (
            <div className="entity-row" key={t.tenant_id}>
              <div>
                <strong>{t.tenant_id}</strong>
                <p>
                  status: {t.status} | plan: {t.plan} | mrr: IDR {t.mrr.toLocaleString('id-ID')}
                </p>
                <p>
                  active_member: {t.active_member} | checkin_30d: {t.checkin_30d}
                </p>
              </div>
              <div className="member-actions">
                <button className="btn ghost" onClick={() => updateTenant(t.tenant_id, { status: 'suspended', mrr: 0 }, `tenant.suspended: ${t.tenant_id}`)}>
                  Suspend
                </button>
                <button className="btn ghost" onClick={() => updateTenant(t.tenant_id, { status: 'active' }, `tenant.unsuspended: ${t.tenant_id}`)}>
                  Unsuspend
                </button>
                <button className="btn ghost" onClick={() => setFeedback(`tenant.free_granted: ${t.tenant_id} (+${form.free_months} month)`)}>
                  Grant free
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-grid" style={{ marginTop: '1rem' }}>
        <article className="card admin-panel">
          <p className="eyebrow">Pricing</p>
          <h2>Edit tenant price</h2>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const price = Number(form.new_price);
              if (!form.tenant_id || !Number.isFinite(price) || price < 0) return;
              updateTenant(
                form.tenant_id,
                { monthly_price: price, mrr: price },
                `tenant.price_updated: ${form.tenant_id} => IDR ${price.toLocaleString('id-ID')}`
              );
              setForm((p) => ({ ...p, new_price: '' }));
            }}
          >
            <label>
              tenant_id
              <select value={form.tenant_id} onChange={(e) => setForm((p) => ({ ...p, tenant_id: e.target.value }))}>
                {tenants.map((t) => (
                  <option key={t.tenant_id} value={t.tenant_id}>{t.tenant_id}</option>
                ))}
              </select>
            </label>
            <label>
              new_monthly_price
              <input type="number" min="0" value={form.new_price} onChange={(e) => setForm((p) => ({ ...p, new_price: e.target.value }))} />
            </label>
            <button className="btn" type="submit">Update price</button>
          </form>
        </article>

        <article className="card admin-panel">
          <p className="eyebrow">Promotion</p>
          <h2>Promotion policy</h2>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.tenant_id || !form.promo_code) return;
              setFeedback(`tenant.promotion_set: ${form.tenant_id} code=${form.promo_code}`);
              setForm((p) => ({ ...p, promo_code: '' }));
            }}
          >
            <label>
              tenant_id
              <select value={form.tenant_id} onChange={(e) => setForm((p) => ({ ...p, tenant_id: e.target.value }))}>
                {tenants.map((t) => (
                  <option key={t.tenant_id} value={t.tenant_id}>{t.tenant_id}</option>
                ))}
              </select>
            </label>
            <label>
              promo_code
              <input value={form.promo_code} onChange={(e) => setForm((p) => ({ ...p, promo_code: e.target.value }))} />
            </label>
            <label>
              free_months
              <select value={form.free_months} onChange={(e) => setForm((p) => ({ ...p, free_months: e.target.value }))}>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="6">6</option>
              </select>
            </label>
            <button className="btn" type="submit">Apply promotion</button>
          </form>
        </article>
      </section>

      {feedback ? <p className="feedback">{feedback}</p> : null}

      <footer className="dash-foot">
        <Link to="/newevent">Back to newevent landing</Link>
      </footer>
    </main>
  );
}
