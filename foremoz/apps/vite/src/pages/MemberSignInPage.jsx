import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { apiJson, IS_MOCK_MODE, IS_MOCKUP_OPEN_ACCESS, requireField, setSession } from '../lib.js';
import { passportApiJson } from '../passport-client.js';

export default function MemberSignInPage() {
  const navigate = useNavigate();
  const { account } = useParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function resolveTenantId(accountOrTenant) {
    const raw = String(accountOrTenant || '').trim();
    if (!raw) return 'tn_001';
    if (raw.startsWith('tn_')) return raw;
    try {
      const resolved = await apiJson(`/v1/public/account/resolve?account_slug=${encodeURIComponent(raw)}`);
      const tenantId = String(resolved?.row?.tenant_id || '').trim();
      if (tenantId) return tenantId;
    } catch {
      // fallback to provided value for backward compatibility
    }
    return raw;
  }

  async function submit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const email = requireField(form.email, 'email');
      const password = requireField(form.password, 'password');
      const tenantId = await resolveTenantId(account || 'tn_001');
      if (IS_MOCK_MODE && IS_MOCKUP_OPEN_ACCESS) {
        setSession({
          isAuthenticated: true,
          isOnboarded: true,
          role: 'member',
          user: {
            fullName: 'Mock Member',
            email,
            phone: null,
            memberId: 'mem_mock_001'
          },
          tenant: {
            id: tenantId,
            account_slug: account || tenantId,
            namespace: `foremoz:${tenantId}`,
            gym_name: 'Foremoz Mock Gym'
          },
          branch: { id: 'br_mock_01', chain: 'branch:br_mock_01' },
          auth: {
            tokenType: 'Bearer',
            accessToken: 'mock-token',
            expiresIn: 86400
          }
        });
        navigate(`/a/${account || tenantId}/member/portal`, { replace: true });
        return;
      }

      let result;
      try {
        result = await apiJson('/v1/auth/signin', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: tenantId,
            email,
            password
          })
        });
      } catch (memberSigninError) {
        // Fallback: account may exist only in Passport (event flow), not yet in tenant member auth.
        let passportAuth = null;
        const passportSigninPayloads = [
          { email, password },
          { tenant_id: 'tn_001', email, password },
          { tenant_id: 'ps_001', email, password }
        ];
        for (let i = 0; i < passportSigninPayloads.length; i += 1) {
          try {
            passportAuth = await passportApiJson('/v1/tenant/auth/signin', {
              method: 'POST',
              body: JSON.stringify(passportSigninPayloads[i])
            });
            break;
          } catch {
            // try next payload variant
          }
        }

        if (!passportAuth?.user?.email) {
          throw memberSigninError;
        }

        try {
          await apiJson('/v1/auth/signup', {
            method: 'POST',
            body: JSON.stringify({
              tenant_id: tenantId,
              full_name: passportAuth.user?.full_name || email.split('@')[0],
              email,
              password
            })
          });
        } catch (signupError) {
          const message = String(signupError?.message || '').toLowerCase();
          if (!message.includes('already registered') && !message.includes('email already')) {
            throw signupError;
          }
        }

        result = await apiJson('/v1/auth/signin', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: tenantId,
            email,
            password
          })
        });
      }

      setSession({
        isAuthenticated: true,
        isOnboarded: true,
        role: 'member',
        user: {
          fullName: result.member?.full_name || 'Member',
          email: result.member?.email || email,
          phone: result.member?.phone || null,
          memberId: result.member?.member_id || null
        },
        tenant: {
          id: tenantId,
          account_slug: account || tenantId,
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

      navigate(`/a/${account || tenantId}/member/portal`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in as member'}
        </button>
        <p style={{ margin: '0.25rem 0 0' }}>
          <Link className="link-inline" to={`/a/${account || 'tn_001'}/signin`}>
            Staff sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
