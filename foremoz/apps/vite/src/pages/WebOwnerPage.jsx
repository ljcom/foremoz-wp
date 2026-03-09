import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { APP_ORIGIN, apiJson, clearSession, getOwnerSetup, getSession, setOwnerSetup, setSession } from '../lib.js';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: 'IDR 0 / bulan',
    note: 'Cocok untuk mulai uji operasional basic gym kecil.'
  },
  {
    key: 'starter',
    name: 'Starter',
    price: 'IDR 499.000 / bulan',
    note: 'Untuk studio yang sudah running stabil dengan volume member awal.'
  },
  {
    key: 'growth',
    name: 'Growth',
    price: 'IDR 1.490.000 / bulan',
    note: 'Untuk tenant dengan beban operasional dan tim lebih besar.'
  },
  {
    key: 'multi_branch',
    name: 'Multi-branch',
    price: 'IDR 3.490.000 / bulan',
    note: 'Untuk operator fitness dengan banyak cabang aktif.'
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Mulai IDR 7.500.000+ / bulan',
    note: 'Untuk kebutuhan governance/compliance dan SLA custom.'
  }
];

const PLAN_PRICE = {
  free: 0,
  starter: 499000,
  growth: 1490000,
  multi_branch: 3490000,
  enterprise: 7500000,
  basic: 499000,
  pro: 1490000
};

function normalizePackagePlan(value) {
  const plan = String(value || 'free').trim().toLowerCase();
  if (plan === 'basic') return 'starter';
  if (plan === 'pro') return 'growth';
  return plan || 'free';
}

function formatIdr(value) {
  return `IDR ${Number(value || 0).toLocaleString('id-ID')}`;
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

function createEmptyUserForm() {
  return { full_name: '', email: '', role: '', password: '' };
}

function openDashboardInNewTab(accountSlug) {
  const slug = String(accountSlug || '').trim();
  if (!slug) return;
  const baseOrigin = APP_ORIGIN || window.location.origin;
  const targetUrl = `${baseOrigin}/a/${slug}/dashboard`;
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}

export default function WebOwnerPage() {
  const navigate = useNavigate();
  const session = getSession();
  const existingSetupRaw = getOwnerSetup();
  const existingSetup = existingSetupRaw?.tenant_id === session?.tenant?.id ? existingSetupRaw : null;
  const tenantSeed = useMemo(() => session?.tenant?.id || existingSetup?.tenant_id || 'tn_001', [session, existingSetup]);

  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [menu, setMenu] = useState('profile');
  const [setupRow, setSetupRow] = useState(null);

  const [setupForm, setSetupForm] = useState({
    gym_name: existingSetup?.gym_name || session?.tenant?.gym_name || '',
    account_slug: existingSetup?.account_slug || session?.tenant?.account_slug || '',
    package_plan: normalizePackagePlan(existingSetup?.package_plan || 'free'),
    tenant_id: existingSetup?.tenant_id || session?.tenant?.id || 'tn_001',
    branch_id: existingSetup?.branch_id || session?.branch?.id || '',
    address: existingSetup?.address || '',
    city: existingSetup?.city || '',
    photo_url: existingSetup?.photo_url || ''
  });

  const [saasForm, setSaasForm] = useState({ months: '1', note: '' });
  const [saasInfo, setSaasInfo] = useState(null);
  const [userForm, setUserForm] = useState(createEmptyUserForm);
  const [users, setUsers] = useState([]);
  const [userMode, setUserMode] = useState('list');
  const [editingUserId, setEditingUserId] = useState('');
  const [editingUser, setEditingUser] = useState({ full_name: '', role: 'staff' });
  const [dangerConfirm, setDangerConfirm] = useState('');

  const selectedPlanMonthlyPrice = PLAN_PRICE[setupForm.package_plan] || 0;
  const selectedMonths = Number(saasForm.months || 1);
  const extendTotalPrice = selectedPlanMonthlyPrice * selectedMonths;

  const isSetupReady = Boolean(
    setupRow?.status === 'active' && setupRow?.gym_name && setupRow?.account_slug
  );

  async function refreshOwnerData(targetTenantId) {
    const activeTenant = targetTenantId || setupForm.tenant_id || tenantSeed;
    const [setupRes, saasRes, usersRes] = await Promise.all([
      apiJson(`/v1/owner/setup?tenant_id=${encodeURIComponent(activeTenant)}`),
      apiJson(`/v1/owner/saas?tenant_id=${encodeURIComponent(activeTenant)}`),
      apiJson(`/v1/owner/users?tenant_id=${encodeURIComponent(activeTenant)}&status=active`)
    ]);

    setSetupRow(setupRes.row || null);

    if (setupRes.row?.status === 'active') {
      setSetupForm((prev) => ({
        ...prev,
        gym_name: setupRes.row.gym_name || prev.gym_name,
        tenant_id: setupRes.row.tenant_id || prev.tenant_id,
        branch_id: setupRes.row.branch_id || prev.branch_id,
        account_slug: setupRes.row.account_slug || prev.account_slug,
        address: setupRes.row.address || '',
        city: setupRes.row.city || '',
        photo_url: setupRes.row.photo_url || '',
        package_plan: normalizePackagePlan(setupRes.row.package_plan || prev.package_plan)
      }));
      setOwnerSetup({
        gym_name: setupRes.row.gym_name,
        tenant_id: setupRes.row.tenant_id,
        branch_id: setupRes.row.branch_id,
        account_slug: setupRes.row.account_slug,
        package_plan: normalizePackagePlan(setupRes.row.package_plan || setupForm.package_plan),
        address: setupRes.row.address || '',
        city: setupRes.row.city || '',
        photo_url: setupRes.row.photo_url || ''
      });
    } else {
      // Prevent stale local setup from another tenant leaking into wizard mode.
      setOwnerSetup(null);
      setSetupForm((prev) => ({
        ...prev,
        tenant_id: activeTenant,
        gym_name: '',
        account_slug: '',
        branch_id: '',
        package_plan: 'free',
        address: '',
        city: '',
        photo_url: ''
      }));
    }

    setSaasInfo(saasRes.row || null);
    setUsers(usersRes.rows || []);
  }

  useEffect(() => {
    refreshOwnerData(tenantSeed).catch((error) => setFeedback(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSeed]);

  function continueToPlan() {
    const gymName = setupForm.gym_name.trim();
    const accountSlug = normalizeSlug(setupForm.account_slug || gymName);
    if (!gymName || !accountSlug) return;

    const tenantDefault = setupForm.tenant_id || `tn_${accountSlug.replace(/-/g, '_')}`;
    const branchDefault = setupForm.branch_id || `br_${accountSlug.replace(/-/g, '_')}_main`;

    setSetupForm((prev) => ({
      ...prev,
      gym_name: gymName,
      account_slug: accountSlug,
      tenant_id: tenantDefault,
      branch_id: branchDefault
    }));
    setStep(2);
  }

  async function persistSetup(payload) {
    await apiJson('/v1/owner/setup/save', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setOwnerSetup(payload);
    if (session?.isAuthenticated && (session?.role || 'owner') === 'owner') {
      setSession({
        ...session,
        isOnboarded: true,
        tenant: {
          id: payload.tenant_id,
          account_slug: payload.account_slug,
          namespace: `foremoz:${payload.tenant_id}`,
          gym_name: payload.gym_name
        },
        branch: {
          id: payload.branch_id,
          chain: `branch:${payload.branch_id}`
        }
      });
    }
  }

  async function submitWizard(e) {
    e.preventDefault();
    if (!setupForm.gym_name || !setupForm.account_slug || !setupForm.package_plan) return;

    try {
      setLoading(true);
      const payload = {
        gym_name: setupForm.gym_name,
        tenant_id: setupForm.tenant_id,
        branch_id: setupForm.branch_id,
        account_slug: normalizeSlug(setupForm.account_slug),
        package_plan: setupForm.package_plan,
        address: setupForm.address,
        city: setupForm.city,
        photo_url: setupForm.photo_url
      };

      await persistSetup(payload);
      await refreshOwnerData(payload.tenant_id);
      setFeedback(
        `owner.setup.saved package ${payload.package_plan} namespace foremoz:${payload.tenant_id} chain branch:${payload.branch_id}`
      );
      setMenu('profile');
      navigate('/web/owner', { replace: true });
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitRenameGym(e) {
    e.preventDefault();
    if (!setupForm.gym_name || !setupForm.account_slug) return;

    try {
      setLoading(true);
      const payload = {
        gym_name: setupForm.gym_name,
        tenant_id: setupForm.tenant_id,
        branch_id: setupForm.branch_id,
        account_slug: setupForm.account_slug,
        package_plan: setupForm.package_plan,
        address: setupForm.address,
        city: setupForm.city,
        photo_url: setupForm.photo_url
      };
      await persistSetup(payload);
      await refreshOwnerData(payload.tenant_id);
      setFeedback(`owner.setup.updated gym_name ${payload.gym_name}`);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitSaas(e) {
    e.preventDefault();
    if (setupForm.package_plan === 'free') {
      setFeedback('Paket free tidak memerlukan perpanjangan.');
      return;
    }
    try {
      setLoading(true);
      await apiJson('/v1/owner/saas/extend', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: setupForm.tenant_id || tenantSeed,
          months: Number(saasForm.months),
          note: saasForm.note
        })
      });
      setFeedback(`owner.saas.extended +${saasForm.months} month(s)`);
      setSaasForm({ months: '1', note: '' });
      await refreshOwnerData(setupForm.tenant_id || tenantSeed);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function changePackage(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        gym_name: setupForm.gym_name,
        tenant_id: setupForm.tenant_id,
        branch_id: setupForm.branch_id,
        account_slug: setupForm.account_slug,
        package_plan: setupForm.package_plan,
        address: setupForm.address,
        city: setupForm.city,
        photo_url: setupForm.photo_url
      };
      await persistSetup(payload);
      await refreshOwnerData(payload.tenant_id);
      setFeedback(`owner.package.changed ${payload.package_plan}`);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitUser(e) {
    e.preventDefault();
    if (!userForm.full_name || !userForm.email || !userForm.password || !userForm.role) return;

    try {
      setLoading(true);
      await apiJson('/v1/owner/users', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: setupForm.tenant_id || tenantSeed,
          full_name: userForm.full_name,
          email: userForm.email,
          role: userForm.role,
          password: userForm.password
        })
      });
      setFeedback(`owner.user.created ${userForm.full_name}`);
      setUserForm(createEmptyUserForm());
      setUserMode('list');
      await refreshOwnerData(setupForm.tenant_id || tenantSeed);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  function startEditUser(user) {
    setEditingUserId(user.user_id);
    setEditingUser({ full_name: user.full_name || '', role: user.role || 'staff' });
  }

  async function saveEditUser(userId) {
    try {
      setLoading(true);
      await apiJson(`/v1/owner/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          tenant_id: setupForm.tenant_id || tenantSeed,
          full_name: editingUser.full_name,
          role: editingUser.role
        })
      });
      setEditingUserId('');
      setFeedback(`owner.user.updated ${userId}`);
      await refreshOwnerData(setupForm.tenant_id || tenantSeed);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(userId) {
    try {
      setLoading(true);
      await apiJson(`/v1/owner/users/${encodeURIComponent(userId)}?tenant_id=${encodeURIComponent(setupForm.tenant_id || tenantSeed)}`, {
        method: 'DELETE'
      });
      setFeedback(`owner.user.deleted ${userId}`);
      await refreshOwnerData(setupForm.tenant_id || tenantSeed);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    clearSession();
    navigate('/web', { replace: true });
  }

  async function deleteAccountPermanently(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const tenantId = setupForm.tenant_id || tenantSeed;
      await apiJson('/v1/owner/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          confirm_text: dangerConfirm
        })
      });
      clearSession();
      setOwnerSetup(null);
      setFeedback(`owner.account.deleted ${tenantId}`);
      navigate('/web', { replace: true });
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dashboard">
      <header className="dash-head card">
        <div>
          <p className="eyebrow">Web Owner</p>
          <h1>{isSetupReady ? 'Owner control panel' : 'Owner setup wizard'}</h1>
          <p>
            {isSetupReady
              ? 'Kelola tenant per topik: profile, package, dan user.'
              : 'Lengkapi nama gym dan slug akun sebelum masuk control panel.'}
          </p>
        </div>
        <div className="meta">
          {isSetupReady ? (
            <button
              className="btn ghost"
              onClick={() => openDashboardInNewTab(setupForm.account_slug)}
            >
              Jump to dashboard
            </button>
          ) : null}
          <button className="btn ghost" onClick={signOut}>Sign out</button>
        </div>
      </header>

      {!isSetupReady ? (
        <section className="card wide wizard" style={{ marginTop: '1rem' }}>
          <div className="wizard-steps">
            <span className={step === 1 ? 'active' : ''}>1. Penamaan</span>
            <span className={step === 2 ? 'active' : ''}>2. Paket</span>
          </div>

          {step === 1 ? (
            <div>
              <p className="eyebrow">Step 1</p>
              <h2>Penamaan tenant</h2>
              <form
                className="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  continueToPlan();
                }}
              >
                <label>
                  Nama gym
                  <input
                    placeholder="Contoh: Foremoz Fitness Cilandak"
                    value={setupForm.gym_name}
                    onChange={(e) => setSetupForm((p) => ({ ...p, gym_name: e.target.value }))}
                  />
                </label>
                <label>
                  Account slug
                  <input
                    placeholder="contoh: foremoz-cilandak"
                    value={setupForm.account_slug}
                    onChange={(e) => setSetupForm((p) => ({ ...p, account_slug: normalizeSlug(e.target.value) }))}
                  />
                </label>
                <button className="btn" type="submit" disabled={loading}>Lanjut pilih paket</button>
              </form>
            </div>
          ) : (
            <form className="form" onSubmit={submitWizard}>
              <p className="eyebrow">Step 2</p>
              <h2>Pilih paket</h2>
              <div className="plan-grid">
                {PLANS.map((plan) => (
                  <button
                    type="button"
                    key={plan.key}
                    className={`plan-card ${setupForm.package_plan === plan.key ? 'selected' : ''}`}
                    onClick={() => setSetupForm((p) => ({ ...p, package_plan: plan.key }))}
                  >
                    <strong>{plan.name}</strong>
                    <p>{plan.price}</p>
                    <small>{plan.note}</small>
                  </button>
                ))}
              </div>
              <div className="member-actions">
                <button className="btn ghost" type="button" onClick={() => setStep(1)} disabled={loading}>Kembali</button>
                <button className="btn" type="submit" disabled={loading}>Simpan setup</button>
              </div>
            </form>
          )}
        </section>
      ) : (
        <section className="workspace" style={{ marginTop: '1rem' }}>
          <aside className="sidebar card">
            <p className="eyebrow">Owner Menu</p>
            <button className={`side-item ${menu === 'profile' ? 'active' : ''}`} onClick={() => setMenu('profile')}>
              Gym profile
            </button>
            <button className={`side-item ${menu === 'package' ? 'active' : ''}`} onClick={() => setMenu('package')}>
              Paket dan SaaS
            </button>
            <button
              className={`side-item ${menu === 'users' ? 'active' : ''}`}
              onClick={() => {
                setMenu('users');
                setUserMode('list');
              }}
            >
              User access
            </button>
            <button className={`side-item ${menu === 'danger' ? 'active' : ''}`} onClick={() => setMenu('danger')}>
              Danger zone
            </button>
          </aside>

          <article className="card admin-panel" style={{ flex: 1 }}>
            {menu === 'profile' ? (
              <>
                <p className="eyebrow">Gym Profile</p>
                <h2>Ganti nama gym</h2>
                <form className="form" onSubmit={submitRenameGym}>
                  <label>
                    gym_name
                    <input value={setupForm.gym_name} onChange={(e) => setSetupForm((p) => ({ ...p, gym_name: e.target.value }))} />
                  </label>
                  <label>
                    address
                    <input value={setupForm.address} onChange={(e) => setSetupForm((p) => ({ ...p, address: e.target.value }))} />
                  </label>
                  <label>
                    city
                    <input value={setupForm.city} onChange={(e) => setSetupForm((p) => ({ ...p, city: e.target.value }))} />
                  </label>
                  <label>
                    photo_url
                    <input
                      type="url"
                      placeholder="https://..."
                      value={setupForm.photo_url}
                      onChange={(e) => setSetupForm((p) => ({ ...p, photo_url: e.target.value }))}
                    />
                  </label>
                  {setupForm.photo_url ? (
                    <div className="photo-preview-box">
                      <img
                        src={setupForm.photo_url}
                        alt="Gym preview"
                        className="photo-preview-image"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : null}
                  <label>
                    account_slug (read only)
                    <input value={setupForm.account_slug} disabled readOnly />
                  </label>
                  <div className="member-actions">
                    <button className="btn" type="submit" disabled={loading}>Save profile</button>
                  </div>
                </form>
              </>
            ) : null}

            {menu === 'package' ? (
              <>
                <p className="eyebrow">Paket dan SaaS</p>
                <h2>Paket</h2>
                {saasInfo ? <p className="feedback">Total extended months: {saasInfo.total_months || 0}</p> : null}
                <p className="muted">Current package: {setupForm.package_plan}</p>
                {setupForm.package_plan === 'free' ? (
                  <p className="feedback">
                    Paket free aktif, jadi tidak perlu perpanjangan.
                  </p>
                ) : (
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
                    <p className="feedback">
                      Harga perpanjang {selectedMonths} bulan: {formatIdr(extendTotalPrice)}
                    </p>
                    <button className="btn" type="submit" disabled={loading}>Perpanjang</button>
                  </form>
                )}
                <form className="form" onSubmit={changePackage}>
                  <p className="eyebrow">Change package</p>
                  <div className="plan-grid">
                    {PLANS.map((plan) => (
                      <button
                        type="button"
                        key={plan.key}
                        className={`plan-card ${setupForm.package_plan === plan.key ? 'selected' : ''}`}
                        onClick={() => setSetupForm((p) => ({ ...p, package_plan: plan.key }))}
                      >
                        <strong>{plan.name}</strong>
                        <p>{plan.price}</p>
                        <small>{plan.note}</small>
                      </button>
                    ))}
                  </div>
                  <p className="feedback">
                    Harga paket terpilih: {formatIdr(selectedPlanMonthlyPrice)} / bulan
                  </p>
                  <button className="btn" type="submit" disabled={loading}>Change paket</button>
                </form>
              </>
            ) : null}

            {menu === 'users' ? (
              <>
                <p className="eyebrow">User access</p>
                {userMode === 'list' ? (
                  <>
                    <div className="panel-head">
                      <h2>Add/edit/delete user</h2>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => {
                            setUserForm(createEmptyUserForm());
                            setUserMode('add');
                          }}
                          disabled={loading}
                        >
                          Add New User
                        </button>
                      </div>
                    </div>
                    <div className="entity-list">
                      {users.map((u) => (
                        <div className="entity-row" key={u.user_id}>
                          <div>
                            {editingUserId === u.user_id ? (
                              <>
                                <input value={editingUser.full_name} onChange={(e) => setEditingUser((p) => ({ ...p, full_name: e.target.value }))} />
                                <select value={editingUser.role} onChange={(e) => setEditingUser((p) => ({ ...p, role: e.target.value }))}>
                                  <option value="admin">admin</option>
                                  <option value="cs">cs</option>
                                  <option value="sales">sales</option>
                                  <option value="pt">pt</option>
                                </select>
                              </>
                            ) : (
                              <>
                                <strong>{u.full_name}</strong>
                                <p>{u.email} - {u.role}</p>
                              </>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {editingUserId === u.user_id ? (
                              <button className="btn" onClick={() => saveEditUser(u.user_id)} disabled={loading}>Save</button>
                            ) : (
                              <button className="btn ghost" onClick={() => startEditUser(u)} disabled={loading}>Edit</button>
                            )}
                            <button className="btn ghost" onClick={() => deleteUser(u.user_id)} disabled={loading}>Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="panel-head">
                      <h2>Add user</h2>
                      <button className="btn ghost" type="button" onClick={() => setUserMode('list')} disabled={loading}>
                        Back to list
                      </button>
                    </div>
                    <form className="form" autoComplete="off" onSubmit={submitUser}>
                      <label>
                        full_name
                        <input value={userForm.full_name} onChange={(e) => setUserForm((p) => ({ ...p, full_name: e.target.value }))} />
                      </label>
                      <label>
                        email
                        <input type="email" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} />
                      </label>
                      <label>
                        password
                        <input type="password" value={userForm.password} onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} />
                      </label>
                      <label>
                        role
                        <select value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}>
                          <option value="">pilih role</option>
                          <option value="admin">admin</option>
                          <option value="cs">cs</option>
                          <option value="sales">sales</option>
                          <option value="pt">pt</option>
                        </select>
                      </label>
                      <button className="btn" type="submit" disabled={loading}>Add user</button>
                    </form>
                  </>
                )}
              </>
            ) : null}

            {menu === 'danger' ? (
              <>
                <p className="eyebrow">Danger zone</p>
                <h2>Delete account permanently</h2>
                <p className="error">
                  Ini akan menghapus seluruh data tenant (event stream + read model) dan tidak bisa di-undo.
                </p>
                <form className="form" onSubmit={deleteAccountPermanently}>
                  <label>
                    Type exactly: DELETE {setupForm.tenant_id || tenantSeed}
                    <input
                      value={dangerConfirm}
                      onChange={(e) => setDangerConfirm(e.target.value)}
                      placeholder={`DELETE ${setupForm.tenant_id || tenantSeed}`}
                    />
                  </label>
                  <button className="btn ghost" type="submit" disabled={loading}>
                    Delete account permanently
                  </button>
                </form>
              </>
            ) : null}
          </article>
        </section>
      )}

      {feedback ? <p className="feedback">{feedback}</p> : null}

      <footer className="dash-foot">
        <Link to="/web">Back to web landing</Link>
      </footer>
    </main>
  );
}
