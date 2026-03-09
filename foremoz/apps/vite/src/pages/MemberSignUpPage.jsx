import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { apiJson, requireField, setSession } from '../lib.js';

export default function MemberSignUpPage() {
  const navigate = useNavigate();
  const { account } = useParams();
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const fullName = requireField(form.fullName, 'full name');
      const email = requireField(form.email, 'email');
      const phone = requireField(form.phone, 'phone');
      const password = requireField(form.password, 'password');
      const tenantId = account || 'tn_001';

      const result = await apiJson('/v1/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          full_name: fullName,
          phone,
          email,
          password
        })
      });

      setSession({
        isAuthenticated: true,
        isOnboarded: true,
        role: 'member',
        user: {
          fullName: result.member?.full_name || fullName,
          email: result.member?.email || email,
          phone: result.member?.phone || phone,
          memberId: result.member?.member_id || null
        },
        tenant: {
          id: tenantId,
          account_slug: tenantId,
          namespace: `foremoz:${tenantId}`,
          gym_name: 'Foremoz Demo Gym'
        },
        branch: { id: 'br_jkt_01', chain: 'branch:br_jkt_01' },
        auth: {
          tokenType: result.auth?.token_type || 'Bearer',
          accessToken: result.auth?.access_token || null,
          expiresIn: result.auth?.expires_in || null
        }
      });

      navigate(`/a/${tenantId}/member/portal`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Member signup"
      subtitle="Join as member and access membership purchase + self booking PT."
      alternateHref={`/a/${account || 'tn_001'}/member/signin`}
      alternateText="Already member? Sign in"
    >
      <form className="card form" onSubmit={submit}>
        <label>
          Full name
          <input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create member account'}
        </button>
      </form>
    </AuthLayout>
  );
}
