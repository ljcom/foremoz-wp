import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import {
  apiJson,
  getOwnerSetup,
  getSession,
  requireField,
  setOwnerSetup,
  setSession
} from '../lib.js';

const OPEN_MOCKUP_ACCESS = (import.meta.env.VITE_MOCKUP_OPEN_ACCESS ?? 'false') === 'true';

export default function SignInPage() {
  const navigate = useNavigate();
  const { account } = useParams();
  const isAccountSignin = Boolean(account);
  const [form, setForm] = useState({ email: '', password: '' });
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
      const email = requireField(form.email, 'email');
      const password = requireField(form.password, 'password');
      const requestedRole = isAccountSignin ? null : 'owner';

      if (!OPEN_MOCKUP_ACCESS) {
        const setup = getOwnerSetup();
        const requestedTenantId = isAccountSignin
          ? (account || setup?.tenant_id || getSession()?.tenant?.id || 'tn_001')
          : null;
        const result = await apiJson('/v1/tenant/auth/signin', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: requestedTenantId,
            email,
            password,
            role: requestedRole
          })
        });
        if (!isAccountSignin && (result.user?.role || requestedRole) !== 'owner') {
          throw new Error('Akun ini bukan owner. /signin hanya untuk owner.');
        }

        const signedRole = result.user?.role || (isAccountSignin ? 'admin' : 'owner');
        const signedTenantId = result.user?.tenant_id || requestedTenantId || setup?.tenant_id || 'tn_001';
        let setupForTenant = null;
        try {
          const setupRes = await apiJson(`/v1/owner/setup?tenant_id=${encodeURIComponent(signedTenantId)}`);
          setupForTenant = setupRes.row || null;
        } catch {
          setupForTenant = null;
        }
        const activeSetup = setupForTenant || (setup?.tenant_id === signedTenantId ? setup : null);
        if (setupForTenant?.tenant_id === signedTenantId) {
          setOwnerSetup({
            gym_name: setupForTenant.gym_name,
            tenant_id: setupForTenant.tenant_id,
            branch_id: setupForTenant.branch_id,
            account_slug: setupForTenant.account_slug,
            package_plan: setupForTenant.package_plan || 'free'
          });
        } else if (!activeSetup) {
          setOwnerSetup(null);
        }
        const isOnboarded = isAccountSignin
          ? true
          : Boolean(activeSetup?.tenant_id === signedTenantId && activeSetup?.branch_id && activeSetup?.account_slug);

        const nextSession = {
          isAuthenticated: true,
          isOnboarded,
          role: signedRole,
          user: {
            fullName: result.user?.full_name || 'Operator',
            email: result.user?.email || email,
            userId: result.user?.user_id || null
          },
          tenant: {
            id: signedTenantId,
            account_slug: activeSetup?.account_slug || account || signedTenantId,
            namespace: `foremoz:fitness:${signedTenantId}`,
            gym_name: activeSetup?.gym_name || 'Foremoz Demo Gym'
          },
          branch: {
            id: activeSetup?.branch_id || 'br_jkt_01',
            chain: `branch:${activeSetup?.branch_id || 'br_jkt_01'}`
          },
          auth: {
            tokenType: result.auth?.token_type || 'Bearer',
            accessToken: result.auth?.access_token || null,
            expiresIn: result.auth?.expires_in || null
          }
        };
        setSession(nextSession);
        if (!isAccountSignin) {
          navigate('/web/owner', { replace: true });
          return;
        }
        if (signedRole === 'sales') {
          navigate(`/a/${nextSession.tenant.account_slug}/sales/dashboard`, { replace: true });
          return;
        }
        if (signedRole === 'pt') {
          navigate(`/a/${nextSession.tenant.account_slug}/pt/dashboard`, { replace: true });
          return;
        }
        navigate(`/a/${nextSession.tenant.account_slug}/admin/dashboard`, { replace: true });
        return;
      }

      const current = getSession();
      const user = { ...(current?.user || {}), fullName: current?.user?.fullName || 'Operator', email };
      const setup = getOwnerSetup();
      const isOnboarded = Boolean(
        current?.isOnboarded
        || (setup?.tenant_id && setup?.branch_id && setup?.account_slug)
      );
      const tenant = current?.tenant || {
        id: setup?.tenant_id || 'tn_001',
        account_slug: setup?.account_slug || current?.tenant?.account_slug || 'tn_001',
        namespace: `foremoz:fitness:${setup?.tenant_id || 'tn_001'}`,
        gym_name: setup?.gym_name || 'Foremoz Demo Gym'
      };
      const nextSession = {
        isAuthenticated: true,
        isOnboarded,
        role: 'owner',
        user,
        tenant: {
          ...tenant,
          account_slug: tenant.account_slug || 'tn_001'
        },
        branch: current?.branch || { id: 'br_jkt_01', chain: 'branch:br_jkt_01' }
      };

      setSession(nextSession);
      navigate(isAccountSignin ? `/a/${nextSession.tenant.account_slug}/admin/dashboard` : '/web/owner', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={isAccountSignin ? `Tenant sign in - ${account}` : 'Owner sign in'}
      subtitle={
        isAccountSignin
          ? 'Sign in as tenant user (admin, CS, sales, PT).'
          : 'Sign in as owner to manage tenant setup and access.'
      }
      alternateHref="/signup"
      alternateText={isAccountSignin ? 'Need owner account? Create one' : 'Need owner account? Create one'}
    >
      <form className="card form" onSubmit={submit}>
        {OPEN_MOCKUP_ACCESS ? <p className="error">Mock mode aktif: signin ini tidak memverifikasi akun ke backend.</p> : null}
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
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
