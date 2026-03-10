import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiJson } from '../lib.js';
import { getPassportSession } from '../passport-client.js';

const JOINED_EVENTS_KEY = 'ff.events.joined';
const REGISTRATION_ANSWERS_KEY = 'ff.events.registration.answers';

function estimatePrice(durationMinutes) {
  const blocks = Math.max(1, Math.ceil(Number(durationMinutes || 60) / 60));
  return blocks * 99000;
}

function formatIdr(value) {
  return `IDR ${Number(value || 0).toLocaleString('id-ID')}`;
}

function formatDateTime(value) {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function resolveEventGallery(eventItem) {
  const main = String(eventItem?.image_url || '').trim();
  const gallery = Array.isArray(eventItem?.gallery_images) ? eventItem.gallery_images : [];
  const list = [main, ...gallery].map((item) => String(item || '').trim()).filter(Boolean);
  return [...new Set(list)];
}

function resolvePrimaryImage(eventItem) {
  const primary = String(eventItem?.image_url || '').trim();
  if (primary) return primary;
  const eventId = String(eventItem?.event_id || eventItem?.event_name || 'event');
  const seed = encodeURIComponent(eventId);
  return `https://picsum.photos/seed/register-${seed}/1200/700`;
}

export default function EventCheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPassportSurface = location.pathname.startsWith('/passport');
  const authBase = isPassportSurface ? '/passport' : '/events';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentDone, setPaymentDone] = useState(false);
  const [eventItem, setEventItem] = useState(null);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [registrationAnswers, setRegistrationAnswers] = useState({});
  const [registrationError, setRegistrationError] = useState('');
  const eventId = useMemo(() => new URLSearchParams(location.search).get('event') || '', [location.search]);
  const returnTo = useMemo(() => {
    const base = `${authBase}/register`;
    return `${base}${eventId ? `?event=${encodeURIComponent(eventId)}` : ''}`;
  }, [authBase, eventId]);
  const signinHref = useMemo(() => {
    const params = new URLSearchParams();
    if (eventId) params.set('event', eventId);
    params.set('next', returnTo);
    return `${authBase}/signin?${params.toString()}`;
  }, [authBase, eventId, returnTo]);
  const signupHref = useMemo(() => {
    const params = new URLSearchParams();
    if (eventId) params.set('event', eventId);
    params.set('next', returnTo);
    return `${authBase}/signup?${params.toString()}`;
  }, [authBase, eventId, returnTo]);
  const passportSession = getPassportSession();
  const isAuthed = Boolean(passportSession?.isAuthenticated);
  const registrationFields = useMemo(
    () => (Array.isArray(eventItem?.registration_fields) ? eventItem.registration_fields : []),
    [eventItem]
  );
  const scheduleItems = useMemo(
    () => (Array.isArray(eventItem?.schedule_items) ? eventItem.schedule_items : []),
    [eventItem]
  );
  const eventGallery = useMemo(() => resolveEventGallery(eventItem), [eventItem]);

  useEffect(() => {
    if (!eventId || typeof window === 'undefined') return;
    try {
      const ids = JSON.parse(localStorage.getItem(JOINED_EVENTS_KEY) || '[]');
      const exists = Array.isArray(ids) && ids.map((v) => String(v)).includes(String(eventId));
      setAlreadyJoined(exists);
      if (exists) setPaymentDone(true);
    } catch {
      setAlreadyJoined(false);
    }
  }, [eventId]);

  useEffect(() => {
    let mounted = true;
    async function loadEvent() {
      if (!eventId) return;
      try {
        setLoading(true);
        setError('');
        const result = await apiJson('/v1/read/events?status=all&limit=200');
        const rows = Array.isArray(result.rows) ? result.rows : [];
        const selected = rows.find((row) => String(row.event_id || '') === eventId);
        if (!mounted) return;
        setEventItem(selected || null);
        if (!selected) {
          setError('Event tidak ditemukan.');
        }
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Gagal memuat event.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadEvent();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  useEffect(() => {
    if (!eventId || typeof window === 'undefined') {
      setRegistrationAnswers({});
      return;
    }
    try {
      const raw = JSON.parse(localStorage.getItem(REGISTRATION_ANSWERS_KEY) || '{}');
      const byEvent = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw[String(eventId)] : null;
      const answers = byEvent && byEvent.answers && typeof byEvent.answers === 'object' ? byEvent.answers : {};
      setRegistrationAnswers(answers);
    } catch {
      setRegistrationAnswers({});
    }
  }, [eventId]);

  const duration = Number(eventItem?.duration_minutes || 60);
  const price = estimatePrice(duration);

  async function submitPayment() {
    if (!isAuthed) return;
    if (registrationFields.length > 0) {
      for (let i = 0; i < registrationFields.length; i += 1) {
        const field = registrationFields[i] || {};
        const fieldId = String(field.field_id || '');
        const label = String(field.label || `Field ${i + 1}`);
        const value = String(registrationAnswers[fieldId] || '').trim();
        if (field.required !== false && !value) {
          setRegistrationError(`${label} wajib diisi.`);
          return;
        }
      }
    }
    setRegistrationError('');
    if (!eventId || typeof window === 'undefined') {
      setPaymentDone(true);
      return;
    }
    try {
      const answersByLabel = registrationFields.reduce((acc, field, index) => {
        const fieldId = String(field?.field_id || '');
        const label = String(field?.label || `Field ${index + 1}`).trim();
        if (!fieldId || !label) return acc;
        const value = String(registrationAnswers[fieldId] || '').trim();
        if (!value) return acc;
        acc[label] = value;
        return acc;
      }, {});

      await apiJson(`/v1/events/${encodeURIComponent(eventId)}/register`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: eventItem?.tenant_id || undefined,
          branch_id: eventItem?.branch_id || undefined,
          passport_id: passportSession?.user?.userId || passportSession?.passport?.id || '',
          full_name: passportSession?.user?.fullName || passportSession?.passport?.fullName || '',
          email: passportSession?.user?.email || '',
          registration_answers: answersByLabel
        })
      });

      const current = JSON.parse(localStorage.getItem(JOINED_EVENTS_KEY) || '[]');
      const ids = Array.isArray(current) ? current.map((v) => String(v)) : [];
      if (!ids.includes(String(eventId))) {
        ids.push(String(eventId));
      }
      localStorage.setItem(JOINED_EVENTS_KEY, JSON.stringify(ids));
      const rawAnswers = JSON.parse(localStorage.getItem(REGISTRATION_ANSWERS_KEY) || '{}');
      const nextAnswers = rawAnswers && typeof rawAnswers === 'object' && !Array.isArray(rawAnswers) ? rawAnswers : {};
      nextAnswers[String(eventId)] = {
        submitted_at: new Date().toISOString(),
        answers: registrationAnswers
      };
      localStorage.setItem(REGISTRATION_ANSWERS_KEY, JSON.stringify(nextAnswers));
    } catch (err) {
      setError(err.message || 'Gagal melakukan registrasi event.');
      return;
    }
    setAlreadyJoined(true);
    setPaymentDone(true);
  }

  return (
    <main className="dashboard">
      <section className="card wide">
        <p className="eyebrow">Event Checkout</p>
        <h1>Register Event</h1>
        {loading ? <p className="feedback">Memuat data event...</p> : null}
        {error ? <p className="error">{error}</p> : null}

        {eventItem ? (
          <div className="entity-list">
            <div className="entity-row">
              <div>
                <strong>{eventItem.event_name || '-'}</strong>
                <p>Mulai: {formatDateTime(eventItem.start_at)}</p>
                <p>Durasi: {duration} menit</p>
                <p>Harga: {formatIdr(price)}</p>
              </div>
            </div>
            <div className="card" style={{ borderStyle: 'dashed' }}>
              <p className="eyebrow">Event Cover</p>
              <img
                className="passport-live-image"
                src={resolvePrimaryImage(eventItem)}
                alt={eventItem.event_name || 'Event'}
              />
            </div>
            {eventItem.description ? (
              <div className="card" style={{ borderStyle: 'dashed' }}>
                <p className="eyebrow">Deskripsi Acara</p>
                <p className="sub">{eventItem.description}</p>
              </div>
            ) : null}
            {eventGallery.length > 0 ? (
              <div className="card" style={{ borderStyle: 'dashed' }}>
                <p className="eyebrow">Foto Event</p>
                <div className="passport-live-grid">
                  {eventGallery.slice(0, 6).map((url, idx) => (
                    <article key={`${url}-${idx}`} className="passport-live-card">
                      <img className="passport-live-image" src={url} alt={`${eventItem.event_name || 'Event'} ${idx + 1}`} />
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
            {scheduleItems.length > 0 ? (
              <div className="card" style={{ borderStyle: 'dashed' }}>
                <p className="eyebrow">Schedule</p>
                <div className="entity-list">
                  {scheduleItems.map((item, idx) => (
                    <div key={`${item.time || 'time'}-${idx}`} className="entity-row">
                      <div>
                        <strong>{item.time || '-'}</strong>
                        <p>{item.title || '-'}</p>
                        {item.note ? <p>{item.note}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {isAuthed && !paymentDone && registrationFields.length > 0 ? (
              <div className="card" style={{ borderStyle: 'dashed' }}>
                <p className="eyebrow">Informasi untuk penyelenggara</p>
                {registrationFields.map((field, index) => {
                  const fieldId = String(field.field_id || `field_${index}`);
                  const type = String(field.type || 'free_type');
                  const label = String(field.label || `Field ${index + 1}`);
                  const isRequired = field.required !== false;
                  const value = String(registrationAnswers[fieldId] || '');
                  if (type === 'date') {
                    return (
                      <label key={fieldId}>
                        {label}{isRequired ? ' *' : ''}
                        <input
                          type="date"
                          value={value}
                          onChange={(e) => setRegistrationAnswers((prev) => ({ ...prev, [fieldId]: e.target.value }))}
                        />
                      </label>
                    );
                  }
                  if (type === 'lookup') {
                    const options = Array.isArray(field.options) ? field.options : [];
                    return (
                      <label key={fieldId}>
                        {label}{isRequired ? ' *' : ''}
                        <select
                          value={value}
                          onChange={(e) => setRegistrationAnswers((prev) => ({ ...prev, [fieldId]: e.target.value }))}
                        >
                          <option value="">Pilih</option>
                          {options.map((opt, optIndex) => (
                            <option key={`${fieldId}-${optIndex}`} value={String(opt)}>
                              {String(opt)}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  }
                  return (
                    <label key={fieldId}>
                      {label}{isRequired ? ' *' : ''}
                      <input
                        value={value}
                        onChange={(e) => setRegistrationAnswers((prev) => ({ ...prev, [fieldId]: e.target.value }))}
                      />
                    </label>
                  );
                })}
                {registrationError ? <p className="error">{registrationError}</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {!isAuthed ? (
          <div className="entity-list">
            <p className="feedback">Untuk join event, silakan Sign in atau Create account dulu.</p>
            <div className="hero-actions">
              <Link className="btn" to={signinHref}>
                Sign in
              </Link>
              <Link className="btn ghost" to={signupHref}>
                Create account
              </Link>
              <button className="btn ghost" type="button" onClick={() => navigate('/events')}>
                Kembali ke events
              </button>
            </div>
          </div>
        ) : !paymentDone ? (
          <div className="hero-actions">
            <button className="btn" type="button" disabled={!eventItem || loading} onClick={submitPayment}>
              Lanjut ke pembayaran
            </button>
            <button className="btn ghost" type="button" onClick={() => navigate('/events')}>
              Kembali ke events
            </button>
          </div>
        ) : (
          <div className="entity-list">
            <p className="feedback">{alreadyJoined ? 'Kamu sudah join event ini.' : 'Pembayaran berhasil. Langkah berikutnya autentikasi akun.'}</p>
            <button className="btn" type="button" onClick={() => navigate('/events', { replace: true })}>
              Kembali ke events
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
