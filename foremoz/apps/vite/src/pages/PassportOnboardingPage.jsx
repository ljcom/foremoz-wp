import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  getPassportSession,
  passportApiJson,
  requirePassportField,
  setPassportSession
} from '../passport-client.js';

export default function PassportOnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const authBase = location.pathname.startsWith('/passport') ? '/passport' : '/events';
  const session = getPassportSession();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    primaryGoal: 'strength',
    trainingDays: '',
    privacyPreset: 'balanced'
  });

  async function onSubmit(event) {
    event.preventDefault();
    try {
      setError('');
      setLoading(true);
      const tenantId = session?.tenant?.id || 'ps_001';
      const passportId = session?.passport?.id || session?.user?.userId;
      if (!passportId) throw new Error('passport_id is missing from session');

      const sportInterests = [form.primaryGoal, ...String(form.trainingDays || '').split(',').map((x) => x.trim()).filter(Boolean)];
      await passportApiJson('/v1/passport/create', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          passport_id: passportId,
          member_id: passportId,
          full_name: requirePassportField(session?.user?.fullName || session?.passport?.fullName, 'full_name'),
          sport_interests: sportInterests
        })
      });

      const planCode = form.privacyPreset === 'strict' ? 'free' : 'starter';
      await passportApiJson('/v1/pricing/plan/change', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          passport_id: passportId,
          plan_code: planCode,
          plan_status: 'active'
        })
      });

      await passportApiJson('/v1/projections/run', {
        method: 'POST',
        body: JSON.stringify({ tenant_id: tenantId })
      });

      setPassportSession({
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

      navigate(`${authBase}/dashboard`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dashboard">
      <section className="card wide">
        <p className="eyebrow">Passport Onboarding</p>
        <h1>Setup Awal Passport</h1>
        <p className="sub">
          Lengkapi context awal supaya dashboard dan public profile punya baseline yang lebih relevan sejak hari pertama.
        </p>
        <div className="ops-grid" style={{ marginBottom: '1rem' }}>
          <article className="card">
            <p className="eyebrow">Primary Goal</p>
            <p className="sub">Dipakai sebagai sinyal awal interest dan positioning profile di dashboard passport.</p>
          </article>
          <article className="card">
            <p className="eyebrow">Privacy Preset</p>
            <p className="sub">Preset ini mempengaruhi plan awal dan akan jadi baseline sebelum kamu atur visibility lebih detail di dashboard.</p>
          </article>
        </div>
        <form className="form" onSubmit={onSubmit}>
          <label>
            Primary goal
            <select
              value={form.primaryGoal}
              onChange={(event) => setForm((prev) => ({ ...prev, primaryGoal: event.target.value }))}
            >
              <option value="strength">Build strength</option>
              <option value="fat-loss">Fat loss</option>
              <option value="mobility">Mobility</option>
            </select>
          </label>
          <label>
            Preferred training days
            <input
              value={form.trainingDays}
              onChange={(event) => setForm((prev) => ({ ...prev, trainingDays: event.target.value }))}
              placeholder="Mon, Wed, Fri"
            />
          </label>
          <label>
            Privacy preset
            <select
              value={form.privacyPreset}
              onChange={(event) => setForm((prev) => ({ ...prev, privacyPreset: event.target.value }))}
            >
              <option value="balanced">Balanced</option>
              <option value="strict">Strict</option>
              <option value="open">Open</option>
            </select>
          </label>
          <div className="card" style={{ borderStyle: 'dashed' }}>
            <p className="eyebrow">Preset Preview</p>
            <p className="sub">
              {form.privacyPreset === 'strict'
                ? 'Strict: mulai dari exposure minimal dengan plan free.'
                : form.privacyPreset === 'open'
                  ? 'Open: cocok untuk profile yang ingin cepat tampil dan dipakai publik.'
                  : 'Balanced: mulai dari visibility yang lebih aktif tanpa terlalu terbuka.'}
            </p>
          </div>
          {error ? <p className="error">{error}</p> : null}
          <div className="hero-actions">
            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save onboarding'}
            </button>
            <Link className="btn ghost" to={`${authBase}/dashboard`}>
              Skip to dashboard
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
