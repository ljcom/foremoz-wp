import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { apiJson, requireField } from '../lib.js';
import { passportApiJson } from '../passport-client.js';

async function resolveTenantIdFromAccount(account) {
  const raw = String(account || '').trim();
  if (!raw) return 'tn_001';
  if (raw.startsWith('tn_')) return raw;
  try {
    const resolved = await apiJson(`/v1/public/account/resolve?account_slug=${encodeURIComponent(raw)}`);
    const tenantId = String(resolved?.row?.tenant_id || '').trim();
    if (tenantId) return tenantId;
  } catch {
    // fallback keeps existing behavior on unknown account slug
  }
  return raw;
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { account } = useParams();
  const params = new URLSearchParams(location.search || '');
  const initialEmail = String(params.get('email') || '').trim();
  const isPassport = location.pathname.startsWith('/events') || location.pathname.startsWith('/passport');
  const isMember = !isPassport && location.pathname.includes('/member/');
  const mode = isPassport ? 'passport' : (isMember ? 'member' : 'host');
  const authBase = isPassport
    ? (location.pathname.startsWith('/passport') ? '/passport' : '/events')
    : '';

  const [form, setForm] = useState({
    email: initialEmail,
    accountName: account || '',
    code: '',
    newPassword: ''
  });
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [codeRequested, setCodeRequested] = useState(false);

  const signinHref = useMemo(() => {
    if (mode === 'passport') return `${authBase}/signin`;
    if (mode === 'member') return `/a/${account || 'tn_001'}/member/signin`;
    return account ? `/a/${account}/signin` : '/signin';
  }, [account, authBase, mode]);

  async function requestCode(event) {
    event.preventDefault();
    try {
      setError('');
      setFeedback('');
      setSending(true);
      const email = requireField(form.email, 'email');

      if (mode === 'host') {
        const payload = {
          email
        };
        if (form.accountName) payload.account_name = String(form.accountName).trim();
        await apiJson('/v1/tenant/auth/password/forgot', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } else if (mode === 'member') {
        const tenantId = await resolveTenantIdFromAccount(account || 'tn_001');
        await apiJson('/v1/auth/password/forgot', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: tenantId,
            email
          })
        });
      } else {
        await passportApiJson('/v1/tenant/auth/password/forgot', {
          method: 'POST',
          body: JSON.stringify({ email })
        });
      }

      setCodeRequested(true);
      setFeedback('Jika akun ditemukan, kode reset sudah dikirim ke email kamu.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function submitReset(event) {
    event.preventDefault();
    try {
      setError('');
      setFeedback('');
      setResetting(true);
      const email = requireField(form.email, 'email');
      const code = requireField(form.code, 'code').replace(/\D/g, '').slice(0, 6);
      const newPassword = requireField(form.newPassword, 'new password');

      if (mode === 'host') {
        const payload = {
          email,
          code,
          new_password: newPassword
        };
        if (form.accountName) payload.account_name = String(form.accountName).trim();
        await apiJson('/v1/tenant/auth/password/reset', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } else if (mode === 'member') {
        const tenantId = await resolveTenantIdFromAccount(account || 'tn_001');
        await apiJson('/v1/auth/password/reset', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: tenantId,
            email,
            code,
            new_password: newPassword
          })
        });
      } else {
        await passportApiJson('/v1/tenant/auth/password/reset', {
          method: 'POST',
          body: JSON.stringify({
            email,
            code,
            new_password: newPassword
          })
        });
      }

      navigate(`${signinHref}?reset=1`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <AuthLayout
      title="Forgot password"
      subtitle={
        mode === 'host'
          ? 'Reset password untuk akun host/tenant. Isi account name bila login dari /signin.'
          : mode === 'member'
            ? `Reset password member${account ? ` @${account}` : ''}.`
            : 'Reset password untuk akun Passport/Event.'
      }
      alternateHref={signinHref}
      alternateText="Kembali ke sign in"
    >
      <section className="card form">
        <form onSubmit={requestCode}>
          {mode === 'host' ? (
            <label>
              Account name
              <input
                name="accountName"
                placeholder="contoh: tourguidesam"
                value={form.accountName}
                onChange={(event) => setForm((prev) => ({ ...prev, accountName: event.target.value }))}
              />
            </label>
          ) : null}
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>
          <button className="btn ghost" type="submit" disabled={sending}>
            {sending ? 'Sending code...' : 'Send reset code'}
          </button>
        </form>

        <form onSubmit={submitReset}>
          <label>
            Reset code
            <input
              name="code"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="6 digit code"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: String(event.target.value || '').replace(/\D/g, '').slice(0, 6) }))}
            />
          </label>
          <label>
            New password
            <input
              name="newPassword"
              type="password"
              value={form.newPassword}
              onChange={(event) => setForm((prev) => ({ ...prev, newPassword: event.target.value }))}
            />
          </label>
          {codeRequested ? <p className="feedback">Kode reset sudah diminta. Lanjut masukkan kode dan password baru.</p> : null}
          {feedback ? <p className="feedback">{feedback}</p> : null}
          {error ? <p className="error">{error}</p> : null}
          <button className="btn" type="submit" disabled={resetting}>
            {resetting ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
        <Link className="link-inline" to={signinHref}>
          Kembali ke sign in
        </Link>
      </section>
    </AuthLayout>
  );
}
