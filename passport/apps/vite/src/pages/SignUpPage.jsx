import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiJson, normalizeEmail, requireField, setSession } from '../lib.js';

const features = [
  'Registrasi cepat dengan email aktif.',
  'Persiapan akun untuk multi-coach subscription.',
  'Mulai dengan default privacy aman untuk member.'
];

export default function SignUpPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
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
      const fullName = requireField(form.fullName, 'full name');
      const email = normalizeEmail(requireField(form.email, 'email'));
      const password = requireField(form.password, 'password');
      if (password.length < 8) {
        throw new Error('password min length is 8 characters');
      }

      const result = await apiJson('/v1/tenant/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          email,
          password
        })
      });

      setSession({
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

      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page auth-shell">
      <section className="card auth-card">
        <p className="eyebrow">Signup</p>
        <h1>Create Your Passport Account</h1>
        <p className="sub">Daftar untuk mulai kelola identitas fitness kamu di satu akun.</p>

        <form className="form" onSubmit={onSubmit}>
          <label>
            Full Name
            <input name="fullName" type="text" value={form.fullName} onChange={onChange} />
          </label>
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
            {loading ? 'Creating passport...' : 'Create Passport'}
          </button>
        </form>

        <article className="hint">
          <p className="eyebrow">Informasi</p>
          <p>
            Setelah signup, kamu bisa langsung lanjut onboarding untuk set tujuan fitness awal
            dan preferensi data sharing.
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
            <h2>Sudah Punya Akun?</h2>
            <p className="sub">Masuk untuk lanjut ke dashboard passport kamu.</p>
          </div>
          <div className="hero-actions">
            <Link className="btn ghost" to="/signin">Masuk Sekarang</Link>
            <Link className="btn" to="/">Kembali ke Landing</Link>
          </div>
        </article>
      </section>
    </main>
  );
}
