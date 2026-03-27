import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import TurnstileWidget from '../components/TurnstileWidget.jsx';
import { useI18n } from '../i18n.js';
import { apiJson, requireField } from '../lib.js';
import { listVerticalConfigs, normalizeVerticalSlug } from '../industry-jargon.js';

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
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verticalOptions = listVerticalConfigs();
  const defaultIndustry = (() => {
    const requested = normalizeVerticalSlug(searchParams.get('industry'), 'fitness');
    if (verticalOptions.some((item) => item.slug === requested)) return requested;
    return 'fitness';
  })();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', industrySlug: defaultIndustry });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);

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
      const industrySlug = requireField(form.industrySlug, 'industry');
      const tenantId = generateTenantId(email);

      const result = await apiJson('/v1/tenant/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          full_name: fullName,
          email,
          password,
          industry_slug: industrySlug,
          role: 'owner',
          turnstile_token: turnstileToken || undefined
        })
      });
      const verifyParams = new URLSearchParams({
        email: result.user?.email || email,
        tenant_id: tenantId,
        email_sent: result.email_delivery?.sent ? '1' : '0'
      });
      if (result.activation?.activation_url) {
        verifyParams.set('activation_url', result.activation.activation_url);
      }
      navigate(`/verify-password?${verifyParams.toString()}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setTurnstileResetSignal((value) => value + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={t('auth.ownerSignup.title')}
      subtitle={t('auth.ownerSignup.subtitle')}
      alternateHref="/signin"
      alternateText={t('auth.ownerSignup.alternate')}
    >
      <form className="card form" onSubmit={submit}>
        <label>
          {t('common.fullName')}
          <input name="fullName" value={form.fullName} onChange={handleChange} />
        </label>
        <label>
          {t('common.email')}
          <input name="email" type="email" value={form.email} onChange={handleChange} />
        </label>
        <label>
          {t('common.industry')}
          <select name="industrySlug" value={form.industrySlug} onChange={handleChange}>
            {verticalOptions.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('common.password')}
          <input name="password" type="password" value={form.password} onChange={handleChange} />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? t('common.createLoading') : t('common.createAccount')}
        </button>
        <TurnstileWidget onToken={setTurnstileToken} resetSignal={turnstileResetSignal} />
      </form>
    </AuthLayout>
  );
}
