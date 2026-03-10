import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getSession as getForemozSession } from '../lib.js';
import {
  foremozApiJson,
  isPassportMockOpen,
  normalizeEmail,
  passportApiJson,
  requirePassportField,
  setPassportSession
} from '../passport-client.js';

export default function PassportSignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const authBase = location.pathname.startsWith('/passport') ? '/passport' : '/events';
  const params = new URLSearchParams(location.search || '');
  const nextPath = params.get('next') || '';
  const eventId = params.get('event') || '';
  const signupHref = useMemo(() => {
    const nextParams = new URLSearchParams();
    if (eventId) nextParams.set('event', eventId);
    if (nextPath) nextParams.set('next', nextPath);
    const query = nextParams.toString();
    return `${authBase}/signup${query ? `?${query}` : ''}`;
  }, [authBase, eventId, nextPath]);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function bridgeFromForemozMember({ email, password }) {
    const params = new URLSearchParams(location.search || '');
    const hintedTenantId = params.get('tenant') || params.get('account') || '';
    const foremozSession = getForemozSession();
    const candidateTenantIds = [...new Set([hintedTenantId, foremozSession?.tenant?.id, 'tn_001'].filter(Boolean))];

    let foremozAuth = null;
    for (const tenantId of candidateTenantIds) {
      try {
        foremozAuth = await foremozApiJson('/v1/auth/signin', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: tenantId,
            email,
            password
          })
        });
        if (foremozAuth?.member?.member_id) break;
      } catch {
        // keep trying next tenant candidate
      }
    }

    if (!foremozAuth?.member?.member_id) {
      throw new Error('Akun tidak ditemukan di Passport atau member tenant.');
    }

    const tenantId = foremozAuth.member.tenant_id || candidateTenantIds[0] || 'tn_001';
    const fullName = foremozAuth.member.full_name || email.split('@')[0];

    // Try provisioning Passport account from existing Foremoz member.
    try {
      await passportApiJson('/v1/tenant/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          full_name: fullName,
          email,
          password
        })
      });
    } catch {
      // likely already exists, continue to signin attempts
    }

    let auth = null;
    try {
      auth = await passportApiJson('/v1/tenant/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ tenant_id: tenantId, email, password })
      });
    } catch {
      auth = await passportApiJson('/v1/tenant/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
    }

    // Ensure passport profile exists and linked to Foremoz member id.
    const passportId = auth.user?.passport_id;
    if (passportId) {
      try {
        await passportApiJson('/v1/passport/create', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: auth.user?.tenant_id || tenantId,
            passport_id: passportId,
            member_id: foremozAuth.member.member_id,
            full_name: fullName,
            sport_interests: []
          })
        });
      } catch {
        // profile may already exist, ignore
      }
    }

    return auth;
  }

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
        if (nextPath) {
          navigate(nextPath, { replace: true });
        } else if (authBase === '/events') {
          navigate('/events', { replace: true });
        } else {
          navigate(`${authBase}/dashboard`, { replace: true });
        }
        return;
      }

      let auth;
      try {
        auth = await passportApiJson('/v1/tenant/auth/signin', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
      } catch {
        auth = await bridgeFromForemozMember({ email, password });
      }

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

      if (nextPath) {
        navigate(nextPath, { replace: true });
      } else if (authBase === '/events') {
        navigate('/events', { replace: true });
      } else {
        navigate(isOnboarded ? `${authBase}/dashboard` : `${authBase}/onboarding`, { replace: true });
      }
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
            <Link className="btn ghost" to={signupHref}>
              Create account
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
