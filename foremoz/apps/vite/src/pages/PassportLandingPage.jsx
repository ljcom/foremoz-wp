import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiJson } from '../lib.js';
import { clearPassportSession, getPassportSession } from '../passport-client.js';

const JOINED_EVENTS_KEY = 'ff.events.joined';

const fallbackEvents = [
  {
    title: 'Morning Strength Camp',
    vertical: 'Active',
    category: 'Strength Training',
    host: 'Coach Rafi - Foremoz Active Center',
    organizer: 'Foremoz Active Team',
    time: 'Sedang berlangsung (06:00 - 07:30 WIB)',
    status: 'Live',
    image:
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'English Speaking Sprint',
    vertical: 'Learning',
    category: 'Language Practice',
    host: 'Mentor Dita - Learning Hub Bandung',
    organizer: 'Foremoz Learning Team',
    time: 'Sedang berlangsung (09:00 - 10:30 WIB)',
    status: 'Live',
    image:
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Urban Dance Rehearsal',
    vertical: 'Arts',
    category: 'Dance Rehearsal',
    host: 'Studio Kroma - Creative Stage',
    organizer: 'Foremoz Arts Team',
    time: 'Sedang berlangsung (19:00 - 21:00 WIB)',
    status: 'Live',
    image:
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80'
  }
];

export default function PassportLandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPassportSurface = location.pathname.startsWith('/passport') || location.pathname.startsWith('/p/');
  const registerBase = isPassportSurface ? '/passport/register' : '/events/register';
  const profileHref = '/passport/dashboard';
  const [events, setEvents] = useState(fallbackEvents);
  const [joinedEventIds, setJoinedEventIds] = useState([]);
  const [activeTab, setActiveTab] = useState('events');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const entryLabel = isPassportSurface ? 'passport.foremoz.com' : 'foremoz.com/events';
  const title = isPassportSurface
    ? 'Passport Showcase untuk Member'
    : 'Ikut Event Lintas Active, Learning, dan Arts';
  const description = isPassportSurface
    ? 'Passport dipakai member untuk menunjukkan identity, history, dan trust signal lintas event yang sudah diikuti.'
    : 'Fokus utama di Foremoz adalah event. Pilih event yang sedang berlangsung, join, dan lanjutkan pengalamanmu di vertical yang kamu minati.';
  const highlightedEventId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('event') || '';
  }, [location.search]);
  const passportSession = getPassportSession();
  const isAuthenticated = Boolean(passportSession?.isAuthenticated);
  const welcomeName =
    passportSession?.user?.fullName ||
    passportSession?.passport?.fullName ||
    passportSession?.user?.email ||
    'Member';

  useEffect(() => {
    let isMounted = true;
    async function loadEvents() {
      try {
        setLoading(true);
        setError('');
        const result = await apiJson('/v1/read/events?status=published&limit=24');
        const rows = Array.isArray(result.rows) ? result.rows : [];
        const mapped = rows.map((row) => {
          const startAt = new Date(row.start_at || '');
          const validStart = !Number.isNaN(startAt.getTime());
          const vertical = guessVertical(row);
          return {
            event_id: row.event_id || '',
            title: row.event_name || 'Untitled Event',
            vertical,
            category: guessCategory(row),
            host: `${row.location || 'Foremoz Venue'} - ${vertical}`,
            organizer:
              row.organizer_name ||
              row.host_name ||
              row.created_by_name ||
              row.tenant_name ||
              'Foremoz Organizer',
            time: validStart
              ? `Mulai ${startAt.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`
              : 'Jadwal belum ditentukan',
            status: String(row.status || 'published').toUpperCase(),
            image: row.image_url || fallbackEvents[0].image
          };
        });
        if (!isMounted) return;
        setEvents(mapped);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Gagal memuat event');
        setEvents(fallbackEvents);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadEvents();
    return () => {
      isMounted = false;
    };
  }, []);

  const orderedEvents = useMemo(() => {
    if (!highlightedEventId) return events;
    const list = [...events];
    list.sort((a, b) => {
      const ah = String(a.event_id || '') === highlightedEventId ? 1 : 0;
      const bh = String(b.event_id || '') === highlightedEventId ? 1 : 0;
      return bh - ah;
    });
    return list;
  }, [events, highlightedEventId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isAuthenticated) {
      setJoinedEventIds([]);
      return;
    }
    let active = true;
    async function loadJoinedEvents() {
      let localIds = [];
      try {
        const ids = JSON.parse(localStorage.getItem(JOINED_EVENTS_KEY) || '[]');
        localIds = Array.isArray(ids) ? ids.map((v) => String(v)) : [];
      } catch {
        localIds = [];
      }
      if (active) setJoinedEventIds(localIds);

      try {
        const params = new URLSearchParams();
        const passportId = String(passportSession?.user?.userId || passportSession?.passport?.id || '').trim();
        const email = String(passportSession?.user?.email || '').trim().toLowerCase();
        if (passportId) params.set('passport_id', passportId);
        if (email) params.set('email', email);
        if (!passportId && !email) return;

        const result = await apiJson(`/v1/read/event-registrations?${params.toString()}`);
        const apiIds = Array.isArray(result.event_ids) ? result.event_ids.map((v) => String(v)) : [];
        const merged = [...new Set([...localIds, ...apiIds])];
        if (!active) return;
        setJoinedEventIds(merged);
        localStorage.setItem(JOINED_EVENTS_KEY, JSON.stringify(merged));
      } catch {
        // keep local cache as fallback
      }
    }
    loadJoinedEvents();
    return () => {
      active = false;
    };
  }, [isAuthenticated, passportSession?.user?.userId, passportSession?.passport?.id, passportSession?.user?.email]);

  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">{isPassportSurface ? 'Foremoz Passport' : 'Foremoz Events'}</div>
        <nav>
          <Link to="/web">Home</Link>
          {isAuthenticated ? (
            <>
              <span>Welcome {welcomeName}</span>
              <Link to={profileHref}>Profile</Link>
              <button
                className="btn ghost small"
                type="button"
                onClick={() => {
                  clearPassportSession();
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem(JOINED_EVENTS_KEY);
                  }
                  setJoinedEventIds([]);
                  navigate(isPassportSurface ? '/passport' : '/events', { replace: true });
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to={isPassportSurface ? '/passport/signin' : '/events/signin'}>Sign in</Link>
          )}
        </nav>
      </header>

      <section className="hero hero-no-aside">
        <div>
          <p className="eyebrow">{entryLabel}</p>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="hero-actions">
            <Link className="btn" to={isPassportSurface ? '/passport/signin' : '/events/signin'}>
              {isPassportSurface ? 'Masuk ke Passport' : 'Ikut Event Sekarang'}
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-tabs">
          <button
            type="button"
            className={`landing-tab ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            Events
          </button>
          <button
            type="button"
            className={`landing-tab ${activeTab === 'faq' ? 'active' : ''}`}
            onClick={() => setActiveTab('faq')}
          >
            FAQ
          </button>
        </div>

        {activeTab === 'events' ? (
          <>
            <p className="eyebrow">Live Events</p>
            <h2 className="landing-title">Upcoming events</h2>
            {loading ? <p className="feedback">Loading events...</p> : null}
            {error ? <p className="feedback">{error}</p> : null}
            <div className="passport-live-grid">
              {orderedEvents.map((event, idx) => (
                <article className="passport-live-card" key={event.event_id || `${event.title}-${idx}`}>
                  <img className="passport-live-image" src={event.image} alt={event.title} />
                  <div className="passport-live-head">
                    <span className="passport-live-badge">{event.status}</span>
                    <span className="passport-live-vertical">{event.vertical}</span>
                  </div>
                  <h3>{event.title}</h3>
                  <p className="passport-live-category">Category: {event.category}</p>
                  <p className="passport-live-host">{event.host}</p>
                  <p className="passport-live-host">Penyelenggara: {event.organizer || 'Foremoz Organizer'}</p>
                  <p className="passport-live-time">{event.time}</p>
                  {joinedEventIds.includes(String(event.event_id || '')) ? (
                    <span className="passport-live-badge joined">Sudah joined</span>
                  ) : (
                    <Link
                      className="btn ghost small"
                      to={`${registerBase}${event.event_id ? `?event=${encodeURIComponent(event.event_id)}` : ''}`}
                    >
                      Register
                    </Link>
                  )}
                </article>
              ))}
              {!loading && orderedEvents.length === 0 ? (
                <article className="passport-live-card">
                  <h3>Belum ada event published</h3>
                  <p className="passport-live-time">Silakan post event dari dashboard admin.</p>
                </article>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow">FAQ</p>
            <h2 className="landing-title">Alur event-first</h2>
            <div className="feature-grid">
              <article className="feature-card">
                <h3>Bagaimana alur join event di Foremoz?</h3>
                <p>1) Pilih event yang sedang aktif.</p>
                <p>2) Join dan hadir di event.</p>
                <p>3) Passport terbentuk sebagai identitas lintas event.</p>
                <p>4) Data progress dan riwayat otomatis terbawa ke event berikutnya.</p>
              </article>
              <article className="feature-card">
                <h3>Apakah harus buat passport dulu?</h3>
                <p>Tidak. Fokus utama adalah join event terlebih dulu, passport terbentuk sebagai konsekuensi partisipasi.</p>
              </article>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function guessVertical(row) {
  const text = `${row.event_name || ''} ${row.location || ''}`.toLowerCase();
  if (text.includes('learn') || text.includes('english') || text.includes('class')) return 'Learning';
  if (text.includes('dance') || text.includes('art') || text.includes('music')) return 'Arts';
  return 'Active';
}

function guessCategory(row) {
  if (Array.isArray(row?.event_categories) && row.event_categories.length > 0) {
    return row.event_categories.map((item) => String(item || '').trim()).filter(Boolean).join(', ');
  }
  const text = `${row.event_name || ''}`.toLowerCase();
  if (text.includes('bootcamp') || text.includes('strength')) return 'Strength Training';
  if (text.includes('english') || text.includes('language')) return 'Language Practice';
  if (text.includes('dance') || text.includes('art')) return 'Creative Session';
  return 'General Event';
}
