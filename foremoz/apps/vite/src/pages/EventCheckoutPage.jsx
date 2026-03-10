import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiJson } from '../lib.js';
import { getPassportSession } from '../passport-client.js';

const JOINED_EVENTS_KEY = 'ff.events.joined';

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

  const duration = Number(eventItem?.duration_minutes || 60);
  const price = estimatePrice(duration);

  function submitPayment() {
    if (!eventId || typeof window === 'undefined') {
      setPaymentDone(true);
      return;
    }
    try {
      const current = JSON.parse(localStorage.getItem(JOINED_EVENTS_KEY) || '[]');
      const ids = Array.isArray(current) ? current.map((v) => String(v)) : [];
      if (!ids.includes(String(eventId))) {
        ids.push(String(eventId));
      }
      localStorage.setItem(JOINED_EVENTS_KEY, JSON.stringify(ids));
    } catch {
      // ignore local cache failure
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
