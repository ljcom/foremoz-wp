import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getOwnerSetup, getSession, setOwnerSetup, setSession } from '../lib.js';

export default function WebOwnerPage() {
  const navigate = useNavigate();
  const session = getSession();
  const existingSetup = getOwnerSetup();
  const [feedback, setFeedback] = useState('');
  const [setupForm, setSetupForm] = useState({
    gym_name: existingSetup?.gym_name || session?.tenant?.gym_name || '',
    tenant_id: existingSetup?.tenant_id || session?.tenant?.id || '',
    branch_id: existingSetup?.branch_id || session?.branch?.id || '',
    account_slug: existingSetup?.account_slug || session?.tenant?.account_slug || ''
  });

  const [saasForm, setSaasForm] = useState({ months: '1', note: '' });
  const [userForm, setUserForm] = useState({ full_name: '', email: '', role: 'staff' });
  const [users, setUsers] = useState([
    { user_id: 'usr_001', full_name: 'Aulia Admin', email: 'aulia@raifit.com', role: 'admin' }
  ]);

  function submitSaas(e) {
    e.preventDefault();
    setFeedback(`owner.saas.extended +${saasForm.months} month(s)`);
    setSaasForm({ months: '1', note: '' });
  }

  function submitUser(e) {
    e.preventDefault();
    if (!userForm.full_name || !userForm.email) return;
    setUsers((prev) => [{ ...userForm, user_id: `usr_${Date.now()}` }, ...prev]);
    setFeedback(`owner.user.created ${userForm.full_name}`);
    setUserForm({ full_name: '', email: '', role: 'staff' });
  }

  function submitSetup(e) {
    e.preventDefault();
    if (!setupForm.gym_name || !setupForm.tenant_id || !setupForm.branch_id || !setupForm.account_slug) return;

    const payload = {
      gym_name: setupForm.gym_name,
      tenant_id: setupForm.tenant_id,
      branch_id: setupForm.branch_id,
      account_slug: setupForm.account_slug
    };
    setOwnerSetup(payload);

    if (session?.isAuthenticated && (session?.role || 'admin') === 'admin') {
      setSession({
        ...session,
        isOnboarded: true,
        tenant: {
          id: payload.tenant_id,
          account_slug: payload.account_slug,
          namespace: `foremoz:fitness:${payload.tenant_id}`,
          gym_name: payload.gym_name
        },
        branch: {
          id: payload.branch_id,
          chain: `branch:${payload.branch_id}`
        }
      });
      setFeedback(`owner.setup.saved namespace foremoz:fitness:${payload.tenant_id} chain branch:${payload.branch_id}`);
      navigate(`/a/${payload.account_slug}/dashboard`, { replace: true });
      return;
    }

    setFeedback(`owner.setup.saved namespace foremoz:fitness:${payload.tenant_id} chain branch:${payload.branch_id}`);
  }

  return (
    <main className="dashboard">
      <header className="dash-head card">
        <div>
          <p className="eyebrow">Web Owner</p>
          <h1>Owner control panel</h1>
          <p>Quick control for subscription and account access.</p>
        </div>
        <div className="meta">
          <button className="btn ghost" onClick={() => navigate('/signin')}>Tenant sign in</button>
          <button className="btn ghost" onClick={() => navigate('/web')}>Back to web</button>
        </div>
      </header>

      <section className="admin-grid" style={{ marginTop: '1rem' }}>
        <article className="card admin-panel">
          <p className="eyebrow">Tenant Setup</p>
          <h2>Namespace and branch model</h2>
          <form className="form" onSubmit={submitSetup}>
            <label>
              gym_name
              <input value={setupForm.gym_name} onChange={(e) => setSetupForm((p) => ({ ...p, gym_name: e.target.value }))} />
            </label>
            <label>
              tenant_id
              <input value={setupForm.tenant_id} onChange={(e) => setSetupForm((p) => ({ ...p, tenant_id: e.target.value }))} />
            </label>
            <label>
              branch_id
              <input value={setupForm.branch_id} onChange={(e) => setSetupForm((p) => ({ ...p, branch_id: e.target.value }))} />
            </label>
            <label>
              account_slug
              <input value={setupForm.account_slug} onChange={(e) => setSetupForm((p) => ({ ...p, account_slug: e.target.value }))} />
            </label>
            <button className="btn" type="submit">Save setup</button>
          </form>
        </article>

        <article className="card admin-panel">
          <p className="eyebrow">SaaS</p>
          <h2>Perpanjang membership SaaS</h2>
          <form className="form" onSubmit={submitSaas}>
            <label>
              tambah_bulan
              <select value={saasForm.months} onChange={(e) => setSaasForm((p) => ({ ...p, months: e.target.value }))}>
                <option value="1">1</option>
                <option value="3">3</option>
                <option value="6">6</option>
                <option value="12">12</option>
              </select>
            </label>
            <label>
              note
              <input value={saasForm.note} onChange={(e) => setSaasForm((p) => ({ ...p, note: e.target.value }))} />
            </label>
            <button className="btn" type="submit">Perpanjang</button>
          </form>
        </article>

        <article className="card admin-panel">
          <p className="eyebrow">User</p>
          <h2>Add user</h2>
          <div className="entity-list">
            {users.map((u) => (
              <div className="entity-row" key={u.user_id}>
                <div>
                  <strong>{u.full_name}</strong>
                  <p>{u.email} - {u.role}</p>
                </div>
                <button className="btn ghost" onClick={() => setUsers((prev) => prev.filter((x) => x.user_id !== u.user_id))}>Delete</button>
              </div>
            ))}
          </div>
          <form className="form" onSubmit={submitUser}>
            <label>
              full_name
              <input value={userForm.full_name} onChange={(e) => setUserForm((p) => ({ ...p, full_name: e.target.value }))} />
            </label>
            <label>
              email
              <input type="email" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} />
            </label>
            <label>
              role
              <select value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}>
                <option value="staff">staff</option>
                <option value="manager">manager</option>
                <option value="admin">admin</option>
                <option value="sales">sales</option>
                <option value="pt">pt</option>
              </select>
            </label>
            <button className="btn" type="submit">Add user</button>
          </form>
        </article>
      </section>

      {feedback ? <p className="feedback">{feedback}</p> : null}

      <footer className="dash-foot">
        <Link to="/web">Back to web landing</Link>
      </footer>
    </main>
  );
}
