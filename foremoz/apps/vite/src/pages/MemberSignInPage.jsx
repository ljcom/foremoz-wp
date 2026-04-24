import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import TurnstileWidget from '../components/TurnstileWidget.jsx';
import { useI18n } from '../i18n.js';
import { apiJson, IS_MOCK_MODE, IS_MOCKUP_OPEN_ACCESS, requireField, setSession } from '../lib.js';
import { passportApiJson } from '../passport-client.js';

export default function MemberSignInPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { account } = useParams();
  const [searchParams] = useSearchParams();
  const nextPath = String(searchParams.get('next') || '').trim();
  const resetNotice = String(searchParams.get('reset') || '').trim() === '1';
  const alternateQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (nextPath) params.set('next', nextPath);
    const query = params.toString();
    return query ? `?${query}` : '';
  }, [nextPath]);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);

  async function resolveAccountContext(accountOrTenant) {
    const raw = String(accountOrTenant || '').trim();
    if (!raw) {
      return {
        tenantId: 'tn_001',
        branchId: 'br_jkt_01',
        accountSlug: 'tn_001'
      };
    }
    if (raw.startsWith('tn_')) {
      return {
        tenantId: raw,
        branchId: 'br_jkt_01',
        accountSlug: raw
      };
    }
    try {
      const resolved = await apiJson(`/v1/public/account/resolve?account_slug=${encodeURIComponent(raw)}`);
      const tenantId = String(resolved?.row?.tenant_id || '').trim();
      if (tenantId) {
        return {
          tenantId,
          branchId: String(resolved?.row?.branch_id || '').trim() || 'br_jkt_01',
          accountSlug: String(resolved?.row?.account_slug || '').trim() || raw
        };
      }
    } catch {
      // fallback to provided value for backward compatibility
    }
    return {
      tenantId: raw,
      branchId: 'br_jkt_01',
      accountSlug: raw
    };
  }

  async function submit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const email = requireField(form.email, 'email');
      const password = requireField(form.password, 'password');
      const accountContext = await resolveAccountContext(account || 'tn_001');
      const tenantId = accountContext.tenantId;
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
            account_slug: accountContext.accountSlug || account || tenantId,
            namespace: `foremoz:${tenantId}`,
            gym_name: 'Foremoz Mock Gym'
          },
          branch: {
            id: accountContext.branchId || 'br_mock_01',
            chain: `branch:${accountContext.branchId || 'br_mock_01'}`
          },
          auth: {
            tokenType: 'Bearer',
            accessToken: 'mock-token',
            expiresIn: 86400
          }
        });
        navigate(nextPath || `/a/${account || tenantId}/member/portal`, { replace: true });
        return;
      }

      let result;
      try {
        result = await apiJson('/v1/auth/signin', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: tenantId,
            email,
            password,
            turnstile_token: turnstileToken || undefined
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
              password,
              turnstile_token: turnstileToken || undefined
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
            password,
            turnstile_token: turnstileToken || undefined
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
          account_slug: accountContext.accountSlug || account || tenantId,
          namespace: `foremoz:${tenantId}`,
          gym_name: 'Foremoz Demo Gym'
        },
        branch: {
          id: accountContext.branchId || 'br_jkt_01',
          chain: `branch:${accountContext.branchId || 'br_jkt_01'}`
        },
        auth: {
          tokenType: result.auth?.token_type || 'Bearer',
          accessToken: result.auth?.access_token || null,
          expiresIn: result.auth?.expires_in || null
        }
      });

      navigate(nextPath || `/a/${account || tenantId}/member/portal`, { replace: true });
    } catch (err) {
      setError(err.message);
      setTurnstileResetSignal((value) => value + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={t('auth.memberSignIn.title')}
      subtitle={t('auth.memberSignIn.subtitle', { accountSuffix: account ? ` @${account}` : '' })}
      alternateHref={`/a/${account || 'tn_001'}/member/signup${alternateQuery}`}
      alternateText={t('auth.memberSignIn.alternate')}
    >
      <form className="card form" onSubmit={submit}>
        {resetNotice ? <p className="feedback">{t('auth.resetNotice')}</p> : null}
        <div className="card" style={{ marginBottom: '1rem', borderStyle: 'dashed' }}>
          <p className="eyebrow">{t('auth.memberSignIn.afterTitle')}</p>
          <p className="sub">{t('auth.memberSignIn.afterDescription')}</p>
        </div>
        <label>
          {t('common.email')}
          <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        </label>
        <label>
          {t('common.password')}
          <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? t('common.signInLoading') : t('auth.memberSignIn.submit')}
        </button>
        <TurnstileWidget onToken={setTurnstileToken} resetSignal={turnstileResetSignal} />
        <p style={{ margin: '0.25rem 0 0' }}>
          <Link className="link-inline" to={`/a/${account || 'tn_001'}/signin`}>
            {t('auth.memberSignIn.staffSignIn')}
          </Link>
        </p>
        <p style={{ margin: '0.25rem 0 0' }}>
          <Link className="link-inline" to={`/a/${account || 'tn_001'}/member/forgot-password`}>
            {t('common.forgotPassword')}
          </Link>
        </p>
        {account ? (
          <p style={{ margin: '0.25rem 0 0' }}>
            <Link className="link-inline" to={`/a/${account}`}>
              {t('auth.memberSignIn.backToAccount')}
            </Link>
          </p>
        ) : null}
      </form>
    </AuthLayout>
  );
}
