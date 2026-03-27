import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import TurnstileWidget from '../components/TurnstileWidget.jsx';
import { useI18n } from '../i18n.js';
import { normalizeEmail, passportApiJson, requirePassportField, setPassportSession } from '../passport-client.js';

export default function PassportSignUpPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const authBase = location.pathname.startsWith('/passport') ? '/passport' : '/events';
  const params = new URLSearchParams(location.search || '');
  const nextPath = params.get('next') || '';
  const eventId = params.get('event') || '';
  const initialEmail = params.get('email') || '';
  const signinHref = useMemo(() => {
    const nextParams = new URLSearchParams();
    if (eventId) nextParams.set('event', eventId);
    if (nextPath) nextParams.set('next', nextPath);
    if (initialEmail) nextParams.set('email', initialEmail);
    const query = nextParams.toString();
    return `${authBase}/signin${query ? `?${query}` : ''}`;
  }, [authBase, eventId, initialEmail, nextPath]);
  const [form, setForm] = useState({ fullName: '', email: initialEmail, password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);

  async function onSubmit(event) {
    event.preventDefault();
    try {
      setError('');
      setLoading(true);
      const fullName = requirePassportField(form.fullName, 'full name');
      const email = normalizeEmail(requirePassportField(form.email, 'email'));
      const password = requirePassportField(form.password, 'password');
      if (password.length < 8) throw new Error('password min length is 8 characters');

      const result = await passportApiJson('/v1/tenant/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          turnstile_token: turnstileToken || undefined
        })
      });

      setPassportSession({
        isAuthenticated: true,
        isOnboarded: false,
        role: 'member',
        user: {
          userId: result.user?.passport_id || null,
          fullName: result.user?.full_name || fullName,
          email: result.user?.email || email
        },
        tenant: { id: result.user?.tenant_id || 'ps_001' },
        passport: {
          id: result.user?.passport_id || null,
          fullName: result.user?.full_name || fullName,
          planCode: 'free'
        }
      });

      navigate(nextPath || `${authBase}/onboarding`, { replace: true });
    } catch (err) {
      setError(err.message);
      setTurnstileResetSignal((value) => value + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dashboard">
      <section className="card wide">
        <div className="page-toolbar">
          <p className="eyebrow">{t('passport.signUp.eyebrow')}</p>
          <LanguageSwitcher compact />
        </div>
        <h1>{t('passport.signUp.title')}</h1>
        <p className="sub">{t('passport.signUp.subtitle')}</p>
        <div className="ops-grid" style={{ marginBottom: '1rem' }}>
          <article className="card">
            <p className="eyebrow">{t('passport.signUp.identityLayer')}</p>
            <p className="sub">{t('passport.signUp.identityLayerDescription')}</p>
          </article>
          <article className="card">
            <p className="eyebrow">{t('passport.signUp.afterTitle')}</p>
            <p className="sub">{t('passport.signUp.afterDescription')}</p>
          </article>
        </div>
        <form className="form" onSubmit={onSubmit}>
          <label>
            {t('common.fullName')}
            <input
              name="fullName"
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            />
          </label>
          <label>
            {t('common.email')}
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>
          <label>
            {t('common.password')}
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
              {loading ? t('passport.signUp.loading') : t('passport.signUp.submit')}
            </button>
            <Link className="btn ghost" to={signinHref}>
              {t('passport.signUp.alternate')}
            </Link>
          </div>
          <TurnstileWidget onToken={setTurnstileToken} resetSignal={turnstileResetSignal} />
          <p className="mini-note" style={{ marginTop: '0.75rem' }}>
            {t('passport.signUp.note')}
          </p>
        </form>
      </section>
    </main>
  );
}
