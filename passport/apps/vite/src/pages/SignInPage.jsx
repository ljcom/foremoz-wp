import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiJson, IS_MOCK_MODE, IS_MOCKUP_OPEN_ACCESS, normalizeEmail, requireField, setSession } from '../lib.js';

const features = [
  'Akses cepat ke seluruh langganan aktif kamu.',
  'Lanjut monitoring progres dan metrik personal.',
  'Review consent data sharing untuk tiap coach.'
];

export default function SignInPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function onChange(event) {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    try {
      setError('');
      setLoading(true);
      const email = normalizeEmail(requireField(form.email, 'email'));
      const password = requireField(form.password, 'password');
      if (IS_MOCK_MODE && IS_MOCKUP_OPEN_ACCESS) {
        setSession({
          isAuthenticated: true,
          isOnboarded: true,
          role: 'member',
          user: {
            userId: 'pass_mock_001',
            fullName: 'Mock Passport User',
            email
          },
          tenant: { id: 'ps_mock' },
          passport: {
            id: 'pass_mock_001',
            fullName: 'Mock Passport User',
            memberId: 'mem_mock_001',
            sportInterests: ['fitness'],
            planCode: 'free'
          }
        });
        navigate('/dashboard', { replace: true });
        return;
      }

      const auth = await apiJson('/v1/tenant/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      const tenantId = auth.user?.tenant_id || 'ps_001';
      const passportId = auth.user?.passport_id;

      await apiJson('/v1/projections/run', {
        method: 'POST',
        body: JSON.stringify({ tenant_id: tenantId })
      });

      const [profileRes, planRes] = await Promise.all([
        apiJson(`/v1/passport/profile?tenant_id=${encodeURIComponent(tenantId)}&passport_id=${encodeURIComponent(passportId)}`),
        apiJson(`/v1/read/passport-plan?tenant_id=${encodeURIComponent(tenantId)}`).catch(() => ({ items: [] }))
      ]);

      const profile = profileRes.item || null;
      const plan = (planRes.items || []).find((item) => item.passport_id === passportId) || null;
      const isOnboarded = Boolean(profile?.member_id);

      setSession({
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

      navigate(isOnboarded ? '/dashboard' : '/onboarding', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page auth-shell">
      <section className="card auth-card">
        <p className="eyebrow">Signin</p>
        <h1>Welcome Back to Passport</h1>
        <p className="sub">Masuk untuk lanjutkan program dan kontrol data kamu.</p>

        <form className="form" onSubmit={onSubmit}>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={onChange} />
          </label>
          <label>
            Password
            <input name="password" type="password" value={form.password} onChange={onChange} />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <article className="hint">
          <p className="eyebrow">Informasi</p>
          <p>
            Passport menyatukan identitas member lintas coach dan studio, jadi kamu tidak perlu
            login akun berbeda untuk setiap program.
          </p>
        </article>

        <article className="card soft-card">
          <p className="eyebrow">Fitur</p>
          <ul className="feature-list compact">
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </article>

        <article className="card cta-banner">
          <div>
            <p className="eyebrow">CTA</p>
            <h2>Baru Pertama Kali?</h2>
            <p className="sub">Buat akun passport dulu untuk mulai join program.</p>
          </div>
          <div className="hero-actions">
            <Link className="btn primary" to="/signup">Buat Akun</Link>
            <Link className="btn ghost" to="/onboarding">Lihat Onboarding</Link>
          </div>
        </article>
      </section>
    </main>
  );
}
