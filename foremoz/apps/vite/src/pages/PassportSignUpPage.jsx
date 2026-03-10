import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { normalizeEmail, passportApiJson, requirePassportField, setPassportSession } from '../passport-client.js';

export default function PassportSignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const authBase = location.pathname.startsWith('/passport') ? '/passport' : '/events';
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
          password
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

      navigate(`${authBase}/onboarding`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dashboard">
      <section className="card wide">
        <p className="eyebrow">Passport Sign up</p>
        <h1>Create Passport Account</h1>
        <form className="form" onSubmit={onSubmit}>
          <label>
            Full name
            <input
              name="fullName"
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            />
          </label>
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
              {loading ? 'Creating...' : 'Create passport'}
            </button>
            <Link className="btn ghost" to={`${authBase}/signin`}>
              Already have account
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
