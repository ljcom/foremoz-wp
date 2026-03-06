import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { setSession, signInCoachUser, requireField } from '../lib.js';

export default function SignInPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  function onChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function submit(e) {
    e.preventDefault();
    try {
      setError('');
      const email = requireField(form.email, 'email');
      const password = requireField(form.password, 'password');
      const user = signInCoachUser({ email, password });

      // On mock mode, onboarding state inferred from previously saved profile if any.
      const prev = JSON.parse(localStorage.getItem('fc.auth') || 'null');
      const coach = prev?.user?.email === user.email
        ? prev.coach
        : { id: user.userId, handle: '', displayName: '', packagePlan: 'free' };
      const isOnboarded = Boolean(coach?.handle && coach?.displayName);

      setSession({
        isAuthenticated: true,
        isOnboarded,
        role: 'owner',
        user: {
          userId: user.userId,
          fullName: user.fullName,
          email: user.email
        },
        coach: coach || { id: user.userId, handle: '', displayName: '', packagePlan: 'free' }
      });

      navigate(isOnboarded ? '/dashboard' : '/onboarding', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AuthLayout
      title="Sign In"
      subtitle="Access your coach workspace, onboarding, and dashboard."
      alternateHref="/signup"
      alternateText="Need account? Create one"
    >
      <form className="form" onSubmit={submit}>
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={onChange} />
        </label>
        <label>
          Password
          <input name="password" type="password" value={form.password} onChange={onChange} />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn primary" type="submit">Sign in</button>
      </form>
    </AuthLayout>
  );
}
