import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { apiJson, requireField, setOwnerSetup, setSession } from '../lib.js';

function generateTenantId(email) {
  const localPart = String(email || '')
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10) || 'tenant';
  const stamp = Date.now().toString(36);
  return `tn_${localPart}_${stamp}`;
}

export default function SignUpPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const fullName = requireField(form.fullName, 'full name');
      const email = requireField(form.email, 'email');
      const password = requireField(form.password, 'password');
      const tenantId = generateTenantId(email);

      const result = await apiJson('/v1/tenant/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          full_name: fullName,
          email,
          password,
          role: 'owner'
        })
      });

      // New signup starts a fresh tenant onboarding flow.
      setOwnerSetup(null);
      setSession({
        isAuthenticated: true,
        isOnboarded: false,
        role: 'owner',
        user: {
          fullName: result.user?.full_name || fullName,
          email: result.user?.email || email,
          userId: result.user?.user_id || null
        },
        tenant: {
          id: tenantId,
          account_slug: '',
          namespace: `foremoz:${tenantId}`,
          gym_name: ''
        },
        branch: { id: '', chain: '' },
        auth: {
          tokenType: result.auth?.token_type || 'Bearer',
          accessToken: result.auth?.access_token || null,
          expiresIn: result.auth?.expires_in || null
        }
      });

      navigate('/web/owner', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create owner account"
      subtitle="Setup tenant workspace and branch operations."
      alternateHref="/signin"
      alternateText="Already owner? Sign in"
    >
      <form className="card form" onSubmit={submit}>
        <label>
          Full name
          <input name="fullName" value={form.fullName} onChange={handleChange} />
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
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Continue to onboarding'}
        </button>
      </form>
    </AuthLayout>
  );
}
