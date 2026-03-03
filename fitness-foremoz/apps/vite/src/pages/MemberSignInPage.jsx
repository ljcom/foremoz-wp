import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { requireField, setSession } from '../lib.js';

export default function MemberSignInPage() {
  const navigate = useNavigate();
  const { account } = useParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    try {
      const email = requireField(form.email, 'email');
      requireField(form.password, 'password');

      setSession({
        isAuthenticated: true,
        isOnboarded: true,
        role: 'member',
        user: { fullName: 'Member', email },
        tenant: {
          id: account || 'tn_001',
          account_slug: account || 'tn_001',
          namespace: `foremoz:fitness:${account || 'tn_001'}`,
          gym_name: 'Foremoz Demo Gym'
        },
        branch: { id: 'br_jkt_01', chain: 'branch:br_jkt_01' }
      });

      navigate(`/a/${account || 'tn_001'}/member/portal`, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AuthLayout
      title="Member sign in"
      subtitle="Sign in as member for membership and PT self booking."
      alternateHref={`/a/${account || 'tn_001'}/member/signup`}
      alternateText="New member? Sign up"
    >
      <form className="card form" onSubmit={submit}>
        <label>
          Email
          <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="submit">Sign in as member</button>
      </form>
    </AuthLayout>
  );
}
