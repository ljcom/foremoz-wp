import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  isPassportMockOpen,
  normalizeEmail,
  passportApiJson,
  requirePassportField,
  setPassportSession
} from '../passport-client.js';

export default function PassportSignInPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    try {
      setError('');
      setLoading(true);
      const email = normalizeEmail(requirePassportField(form.email, 'email'));
      const password = requirePassportField(form.password, 'password');

      if (isPassportMockOpen()) {
        setPassportSession({
          isAuthenticated: true,
          isOnboarded: true,
          role: 'member',
          user: { userId: 'pass_mock_001', fullName: 'Mock Passport User', email },
          tenant: { id: 'ps_mock' },
          passport: {
            id: 'pass_mock_001',
            fullName: 'Mock Passport User',
            memberId: 'mem_mock_001',
            sportInterests: ['fitness'],
            planCode: 'free'
          }
        });
        navigate('/passport/dashboard', { replace: true });
        return;
      }

      const auth = await passportApiJson('/v1/tenant/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      const tenantId = auth.user?.tenant_id || 'ps_001';
      const passportId = auth.user?.passport_id;

      await passportApiJson('/v1/projections/run', {
        method: 'POST',
        body: JSON.stringify({ tenant_id: tenantId })
      });

      const [profileRes, planRes] = await Promise.all([
        passportApiJson(`/v1/passport/profile?tenant_id=${encodeURIComponent(tenantId)}&passport_id=${encodeURIComponent(passportId)}`),
        passportApiJson(`/v1/read/passport-plan?tenant_id=${encodeURIComponent(tenantId)}`).catch(() => ({ items: [] }))
      ]);

      const profile = profileRes.item || null;
      const plan = (planRes.items || []).find((item) => item.passport_id === passportId) || null;
      const isOnboarded = Boolean(profile?.member_id);

      setPassportSession({
        isAuthenticated: true,
        isOnboarded,
        role: 'member',
        user: {
          userId: passportId,
          fullName: auth.user?.full_name,
          email: auth.user?.email
        },
        tenant: { id: tenantId },
        passport: {
          id: passportId,
          fullName: profile?.full_name || auth.user?.full_name || '',
          memberId: profile?.member_id || '',
          sportInterests: Array.isArray(profile?.sport_interests) ? profile.sport_interests : [],
          planCode: plan?.plan_code || 'free'
        }
      });

      navigate(isOnboarded ? '/passport/dashboard' : '/passport/onboarding', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dashboard">
      <section className="card wide">
        <p className="eyebrow">Passport Sign in</p>
        <h1>Masuk ke Foremoz Passport</h1>
        <form className="form" onSubmit={onSubmit}>
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <div className="hero-actions">
            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
            <Link className="btn ghost" to="/passport/signup">
              Create account
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
