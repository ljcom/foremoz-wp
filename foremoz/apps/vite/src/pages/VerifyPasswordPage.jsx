import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { apiJson, requireField } from '../lib.js';

export default function VerifyPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = String(searchParams.get('email') || '').trim();
  const tenantId = String(searchParams.get('tenant_id') || '').trim();
  const emailSent = String(searchParams.get('email_sent') || '').trim() === '1';
  const initialActivationUrl = String(searchParams.get('activation_url') || '').trim();
  const [form, setForm] = useState({ email: initialEmail, code: '' });
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [activationUrl, setActivationUrl] = useState(initialActivationUrl);
  const [isEmailSent, setIsEmailSent] = useState(emailSent);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'code' ? String(value || '').replace(/\D/g, '').slice(0, 6) : value
    }));
  }

  async function submitVerification(event) {
    event.preventDefault();
    try {
      setError('');
      setFeedback('');
      setVerifying(true);
      const email = requireField(form.email, 'email');
      const code = requireField(form.code, 'verification code');
      await apiJson('/v1/tenant/auth/activate', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId || undefined,
          email,
          code
        })
      });
      navigate('/signin?activated=1', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  }

  async function resendCode() {
    try {
      setError('');
      setFeedback('');
      setResending(true);
      const email = requireField(form.email, 'email');
      const result = await apiJson('/v1/tenant/auth/activation/resend', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId || undefined,
          email
        })
      });
      setIsEmailSent(Boolean(result.email_delivery?.sent));
      setActivationUrl(result.activation?.activation_url || activationUrl);
      setFeedback(result.already_active ? 'Akun ini sudah aktif. Silakan sign in.' : 'Kode verifikasi baru sudah dikirim.');
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout
      title="Verify password"
      subtitle="Aktivasi owner account sebelum mulai setup tenant."
      alternateHref="/signin"
      alternateText="Kembali ke sign in"
    >
      <section className="card form">
        <p className="feedback">
          Akun owner{tenantId ? ` untuk tenant ${tenantId}` : ''} sudah dibuat.
        </p>
        <p className="feedback">
          Cek email {form.email ? <strong>{form.email}</strong> : 'kamu'} untuk aktivasi akun.
        </p>
        <p className="feedback">
          Sebelum aktivasi, akun belum bisa login dan belum bisa membuat event/class.
        </p>
        <form onSubmit={submitVerification}>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={handleChange} />
          </label>
          <label>
            Verification code
            <input
              name="code"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="6 digit code"
              value={form.code}
              onChange={handleChange}
            />
          </label>
          {feedback ? <p className="feedback">{feedback}</p> : null}
          {error ? <p className="error">{error}</p> : null}
          <button className="btn" type="submit" disabled={verifying}>
            {verifying ? 'Verifying...' : 'Verify code'}
          </button>
        </form>
        <button className="btn ghost" type="button" onClick={resendCode} disabled={resending}>
          {resending ? 'Resending...' : 'Resend code'}
        </button>
        {!isEmailSent && activationUrl ? (
          <p className="feedback">
            Email belum terkirim dari server ini. Untuk environment dev, buka link aktivasi ini:
            {' '}
            <a href={activationUrl}>aktivasi akun</a>
          </p>
        ) : null}
        <Link className="btn ghost" to="/signin">
          Ke halaman sign in
        </Link>
      </section>
    </AuthLayout>
  );
}
