import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountPath, getSession, requireField, setSession } from '../lib.js';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [form, setForm] = useState({
    tenant_id: '',
    branch_id: '',
    gym_name: '',
    booking_capacity_policy: 'strict'
  });
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function submit(e) {
    e.preventDefault();
    try {
      const tenant_id = requireField(form.tenant_id, 'tenant_id');
      const branch_id = requireField(form.branch_id, 'branch_id');
      const gym_name = requireField(form.gym_name, 'gym_name');

      setSession({
        ...session,
        isAuthenticated: true,
        isOnboarded: true,
        tenant: {
          id: tenant_id,
          account_slug: tenant_id,
          namespace: `foremoz:${tenant_id}`,
          gym_name
        },
        branch: {
          id: branch_id,
          chain: `branch:${branch_id}`,
          booking_capacity_policy: form.booking_capacity_policy
        }
      });

      navigate(accountPath({ tenant: { account_slug: tenant_id } }, '/admin/dashboard'), { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="onboarding">
      <section className="card wide">
        <p className="eyebrow">Onboarding</p>
        <h1>Initialize tenant and branch</h1>
        <p>Set namespace and chain defaults before operational usage.</p>

        <form className="form grid" onSubmit={submit}>
          <label>
            gym_name
            <input name="gym_name" value={form.gym_name} onChange={handleChange} />
          </label>
          <label>
            tenant_id
            <input name="tenant_id" value={form.tenant_id} onChange={handleChange} placeholder="tn_001" />
          </label>
          <label>
            branch_id
            <input name="branch_id" value={form.branch_id} onChange={handleChange} placeholder="br_jkt_01" />
          </label>
          <label>
            booking_capacity_policy
            <select name="booking_capacity_policy" value={form.booking_capacity_policy} onChange={handleChange}>
              <option value="strict">strict</option>
              <option value="soft">soft</option>
            </select>
          </label>
          {error ? <p className="error span-2">{error}</p> : null}
          <button className="btn span-2" type="submit">
            Finish onboarding
          </button>
        </form>
      </section>
    </main>
  );
}
