import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { accountPath, getAccountSlug, getOwnerSetup, getSession, requireField, setSession } from '../lib.js';

function roleHome(session, role, onboarded) {
  if (role === 'gov') return '/gov';
  if (role === 'sales') return accountPath(session, '/sales');
  if (role === 'pt') return accountPath(session, '/dashboard/pt');
  return onboarded ? accountPath(session, '/dashboard') : '/onboarding';
}

export default function SignInPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', role: 'admin' });
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function submit(e) {
    e.preventDefault();
    try {
      const email = requireField(form.email, 'email');
      requireField(form.password, 'password');

      const current = getSession();
      const role = form.role;
      const user = { ...(current?.user || {}), fullName: current?.user?.fullName || 'Operator', email };
      const setup = getOwnerSetup();
      const isOnboarded = role === 'admin'
        ? Boolean(
          current?.isOnboarded
          || (setup?.tenant_id && setup?.branch_id && setup?.account_slug)
        )
        : true;
      const tenant = current?.tenant || {
        id: setup?.tenant_id || 'tn_001',
        account_slug: setup?.account_slug || current?.tenant?.account_slug || 'tn_001',
        namespace: `foremoz:fitness:${setup?.tenant_id || 'tn_001'}`,
        gym_name: setup?.gym_name || 'Foremoz Demo Gym'
      };
      const nextSession = {
        ...(current || {}),
        isAuthenticated: true,
        isOnboarded,
        role,
        user,
        tenant: {
          ...tenant,
          account_slug: getAccountSlug({ tenant })
        },
        branch: current?.branch || { id: 'br_jkt_01', chain: 'branch:br_jkt_01' }
      };

      setSession(nextSession);

      if (role === 'admin' && !isOnboarded) {
        navigate('/web/owner', { replace: true });
        return;
      }

      navigate(roleHome(nextSession, role, isOnboarded), { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AuthLayout
      title="Tenant sign in"
      subtitle="Sign in as admin, sales, or PT."
      alternateHref="/signup"
      alternateText="Need admin account? Create one"
    >
      <form className="card form" onSubmit={submit}>
        <label>
          Role
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="admin">admin</option>
            <option value="sales">sales</option>
            <option value="pt">pt</option>
            <option value="gov">gov</option>
          </select>
        </label>
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={handleChange} />
        </label>
        <label>
          Password
          <input name="password" type="password" value={form.password} onChange={handleChange} />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="submit">
          Sign in
        </button>
      </form>
    </AuthLayout>
  );
}
