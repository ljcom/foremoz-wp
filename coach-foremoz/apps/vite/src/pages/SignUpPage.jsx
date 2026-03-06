import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { createCoachUser, requireField, setSession } from '../lib.js';

export default function SignUpPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');

  function onChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function submit(e) {
    e.preventDefault();
    try {
      setError('');
      const fullName = requireField(form.fullName, 'full name');
      const email = requireField(form.email, 'email');
      const password = requireField(form.password, 'password');
      if (password.length < 8) {
        throw new Error('password min length is 8 characters');
      }

      const user = createCoachUser({ fullName, email, password });
      setSession({
        isAuthenticated: true,
        isOnboarded: false,
        role: 'owner',
        user: {
          userId: user.userId,
          fullName: user.fullName,
          email: user.email
        },
        coach: {
          id: user.userId,
          handle: '',
          displayName: '',
          packagePlan: 'free'
        }
      });
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AuthLayout
      title="Create Coach Account"
      subtitle="Start with free tier, then upgrade when your operation scales."
      alternateHref="/signin"
      alternateText="Already have account? Sign in"
    >
      <form className="form" onSubmit={submit}>
        <label>
          Full name
          <input name="fullName" value={form.fullName} onChange={onChange} />
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
        <button className="btn primary" type="submit">Continue to onboarding</button>
      </form>
    </AuthLayout>
  );
}
