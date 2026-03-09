import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiJson, getSession, requireField, setSession } from '../lib.js';

const features = [
  'Set goal utama: weight, strength, atau mobility.',
  'Tentukan preferensi privasi metrik personal sejak awal.',
  'Pilih coach/studio pertama untuk mulai journey.'
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    primaryGoal: 'strength',
    trainingDays: '',
    privacyPreset: 'balanced'
  });

  function onChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    try {
      setError('');
      setLoading(true);
      const tenantId = session?.tenant?.id || 'ps_001';
      const passportId = session?.passport?.id || session?.user?.userId;
      if (!passportId) throw new Error('passport_id is missing from session');

      const sportInterests = [form.primaryGoal, ...String(form.trainingDays || '').split(',').map((x) => x.trim()).filter(Boolean)];
      await apiJson('/v1/passport/create', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          passport_id: passportId,
          member_id: passportId,
          full_name: requireField(session?.user?.fullName || session?.passport?.fullName, 'full_name'),
          sport_interests: sportInterests
        })
      });

      const planCode = form.privacyPreset === 'strict' ? 'free' : 'starter';
      await apiJson('/v1/pricing/plan/change', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          passport_id: passportId,
          plan_code: planCode,
          plan_status: 'active'
        })
      });

      await apiJson('/v1/projections/run', {
        method: 'POST',
        body: JSON.stringify({ tenant_id: tenantId })
      });

      setSession({
        ...(session || {}),
        isAuthenticated: true,
        isOnboarded: true,
        tenant: { id: tenantId },
        passport: {
          ...(session?.passport || {}),
          id: passportId,
          fullName: session?.user?.fullName || session?.passport?.fullName || '',
          memberId: passportId,
          sportInterests,
          planCode
        }
      });

      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page auth-shell">
      <section className="card auth-card">
        <p className="eyebrow">Onboarding</p>
        <h1>Setup Your Fitness Passport</h1>
        <p className="sub">Lengkapi setup awal agar rekomendasi program lebih relevan.</p>

        <form className="form" onSubmit={onSubmit}>
          <label>
            Primary Goal
            <select name="primaryGoal" value={form.primaryGoal} onChange={onChange}>
              <option value="strength">Build Strength</option>
              <option value="fat-loss">Fat Loss</option>
              <option value="mobility">Mobility</option>
            </select>
          </label>
          <label>
            Preferred Training Days
            <input name="trainingDays" type="text" value={form.trainingDays} onChange={onChange} placeholder="Mon, Wed, Fri" />
          </label>
          <label>
            Privacy Preset
            <select name="privacyPreset" value={form.privacyPreset} onChange={onChange}>
              <option value="balanced">Balanced</option>
              <option value="strict">Strict</option>
              <option value="open">Open</option>
            </select>
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? 'Saving onboarding...' : 'Save Onboarding'}
          </button>
        </form>

        <article className="hint">
          <p className="eyebrow">Informasi</p>
          <p>
            Setup ini bisa diubah kapan saja di dashboard. Kamu tetap memegang kontrol penuh
            atas data yang dibagikan.
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
            <h2>Siap Lihat Ringkasan Akun?</h2>
            <p className="sub">Lanjutkan ke dashboard untuk monitor subscription dan progres.</p>
          </div>
          <div className="hero-actions">
            <Link className="btn primary" to="/dashboard">Ke Dashboard</Link>
            <Link className="btn ghost" to="/signin">Masuk Ulang</Link>
          </div>
        </article>
      </section>
    </main>
  );
}
