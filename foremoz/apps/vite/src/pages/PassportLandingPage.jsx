import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiJson } from '../lib.js';
import { clearPassportSession, getPassportSession } from '../passport-client.js';
import { getVerticalConfig, getVerticalLabel, guessVerticalSlugByEventText, listVerticalConfigs } from '../industry-jargon.js';
import { formatAppDateTime } from '../time.js';

const JOINED_EVENTS_KEY = 'ff.events.joined';

const fallbackEvents = [
  {
    title: 'Morning Strength Camp',
    vertical: 'Fitness',
    category: 'Strength Training',
    host: 'Coach Rafi - Foremoz Fitness Center',
    organizer: 'Foremoz Fitness Team',
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
  },
  {
    title: 'City Night Run Performance',
    vertical: 'Performance',
    category: 'Show',
    host: 'Performer Nara - Central Venue',
    organizer: 'Foremoz Performance Team',
    time: 'Mulai 20:00 WIB',
    status: 'Live',
    image:
      'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Sunrise Heritage Tour',
    vertical: 'Tourism',
    category: 'Tour',
    host: 'Guide Akbar - Old Town Route',
    organizer: 'Foremoz Tourism Team',
    time: 'Mulai 06:30 WIB',
    status: 'Live',
    image:
      'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=1200&q=80'
  }
];

export default function PassportLandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { account: accountParam } = useParams();
  const normalizedAccount = String(accountParam || '').trim().toLowerCase();
  const isAccountSurface = location.pathname.startsWith('/a/') && location.pathname.endsWith('/events') && Boolean(normalizedAccount);
  const isPassportSurface = location.pathname.startsWith('/passport') || location.pathname.startsWith('/p/');
  const isGlobalEventsSurface = !isPassportSurface && !isAccountSurface;
  const registerBase = isPassportSurface ? '/passport/register' : '/events/register';
  const profileHref = '/passport/dashboard';
  const [events, setEvents] = useState(fallbackEvents);
  const [allEvents, setAllEvents] = useState([]);
  const [accountInfo, setAccountInfo] = useState(null);
  const [joinedEventIds, setJoinedEventIds] = useState([]);
  const [activeTab, setActiveTab] = useState('events');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const verticalLabels = listVerticalConfigs().map((item) => item.label);
  const verticalListText = verticalLabels.join(', ');
  const accountMemberSigninHref = isAccountSurface
    ? `/a/${encodeURIComponent(normalizedAccount)}/member/signin`
    : null;
  const entryLabel = isPassportSurface
    ? 'passport.foremoz.com'
    : isAccountSurface
      ? `/a/${normalizedAccount}/events`
      : 'foremoz.com/events';
  const title = isPassportSurface
    ? 'Passport Profile Member'
    : isAccountSurface
      ? `Event @${normalizedAccount}`
      : `Ikut Event Lintas ${verticalListText}`;
  const description = isPassportSurface
    ? 'Tunjukkan perjalanan event kamu di satu profile yang bisa dibagikan.'
    : isAccountSurface
      ? 'Semua event dari account ini ada di satu halaman.'
      : 'Pilih event favoritmu, register, lalu hadir bersama komunitas.';
  const highlightedEventId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('event') || '';
  }, [location.search]);
  const isExploreAllMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('explore') === '1';
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
          const vertical = guessVertical(row);
          const verticalSlug = guessVerticalSlugByEventText(row, 'fitness');
          const vocabularyCreator = getVerticalConfig(verticalSlug)?.vocabulary?.creator || 'Creator';
          return {
            event_id: row.event_id || '',
            account_slug: row.account_slug || '',
            title: row.event_name || 'Untitled Event',
            vertical,
            category: guessCategory(row),
            host: `${vocabularyCreator} - ${row.location || 'Foremoz Venue'}`,
            organizer:
              row.organizer_name ||
              row.host_name ||
              row.created_by_name ||
              row.tenant_name ||
              'Foremoz Organizer',
            time: row.start_at ? `Mulai ${formatAppDateTime(row.start_at)}` : 'Jadwal belum ditentukan',
            status: String(row.status || 'published').toUpperCase(),
            image: row.image_url || fallbackEvents[0].image
          };
        });
        const scopedMapped = isAccountSurface
          ? mapped.filter((item) => String(item.account_slug || '').trim().toLowerCase() === normalizedAccount)
          : mapped;
        if (!isMounted) return;
        setEvents(scopedMapped);
        try {
          const allResult = await apiJson('/v1/read/events?status=all&limit=400');
          const allRows = Array.isArray(allResult.rows) ? allResult.rows : [];
          const allMapped = allRows.map((row) => {
            const vertical = guessVertical(row);
            const verticalSlug = guessVerticalSlugByEventText(row, 'fitness');
            const vocabularyCreator = getVerticalConfig(verticalSlug)?.vocabulary?.creator || 'Creator';
            return {
              event_id: row.event_id || '',
              account_slug: row.account_slug || '',
              title: row.event_name || 'Untitled Event',
              vertical,
              category: guessCategory(row),
              host: `${vocabularyCreator} - ${row.location || 'Foremoz Venue'}`,
              organizer:
                row.organizer_name ||
                row.host_name ||
                row.created_by_name ||
                row.tenant_name ||
                'Foremoz Organizer',
              time: row.start_at ? `Mulai ${formatAppDateTime(row.start_at)}` : 'Jadwal belum ditentukan',
              status: String(row.status || 'draft').toUpperCase(),
              image: row.image_url || fallbackEvents[0].image
            };
          });
          const scopedAllMapped = isAccountSurface
            ? allMapped.filter((item) => String(item.account_slug || '').trim().toLowerCase() === normalizedAccount)
            : allMapped;
          if (!isMounted) return;
          setAllEvents(scopedAllMapped);
        } catch {
          if (!isMounted) return;
          setAllEvents(scopedMapped);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Gagal memuat event');
        setEvents(fallbackEvents);
        setAllEvents(fallbackEvents);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadEvents();
    return () => {
      isMounted = false;
    };
  }, [isAccountSurface, normalizedAccount]);

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

  const premiumEvents = useMemo(
    () => orderedEvents.filter((item) => String(item.status || '').trim().toUpperCase() === 'POSTED'),
    [orderedEvents]
  );

  const searchableEvents = useMemo(() => {
    if (!isGlobalEventsSurface || !isExploreAllMode) {
      return isGlobalEventsSurface ? premiumEvents : orderedEvents;
    }
    const keyword = String(searchQuery || '').trim().toLowerCase();
    if (!keyword) return orderedEvents;
    return orderedEvents.filter((event) => {
      const haystack = [
        event.title,
        event.category,
        event.vertical,
        event.host,
        event.organizer,
        event.account_slug
      ]
        .map((item) => String(item || '').toLowerCase())
        .join(' ');
      return haystack.includes(keyword);
    });
  }, [isGlobalEventsSurface, isExploreAllMode, orderedEvents, premiumEvents, searchQuery]);

  const joinedEvents = useMemo(() => {
    if (!joinedEventIds.length) return [];
    const byId = new Map(allEvents.map((item) => [String(item.event_id || ''), item]));
    return joinedEventIds
      .map((id) => byId.get(String(id)))
      .filter(Boolean);
  }, [allEvents, joinedEventIds]);

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
        if (!active) return;
        // API is source of truth; local cache is only temporary fallback.
        setJoinedEventIds(apiIds);
        localStorage.setItem(JOINED_EVENTS_KEY, JSON.stringify(apiIds));
      } catch {
        // keep local cache as fallback
      }
    }
    loadJoinedEvents();
    return () => {
      active = false;
    };
  }, [isAuthenticated, passportSession?.user?.userId, passportSession?.passport?.id, passportSession?.user?.email]);

  useEffect(() => {
    if (!isAccountSurface || !normalizedAccount) {
      setAccountInfo(null);
      return;
    }
    let active = true;
    async function loadAccountInfo() {
      try {
        const result = await apiJson(`/v1/public/account/resolve?account_slug=${encodeURIComponent(normalizedAccount)}`);
        if (!active) return;
        setAccountInfo(result.row || null);
      } catch {
        if (!active) return;
        setAccountInfo(null);
      }
    }
    loadAccountInfo();
    return () => {
      active = false;
    };
  }, [isAccountSurface, normalizedAccount]);

  const accountDisplayName = String(accountInfo?.gym_name || '').trim() || normalizedAccount;
  const brandLabel = isAccountSurface
    ? accountDisplayName
    : (isPassportSurface ? 'Foremoz Passport' : 'Foremoz Events');

  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">{brandLabel}</div>
        <nav>
          {!isAccountSurface ? <Link to="/host">New Host</Link> : null}
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
                  if (isPassportSurface) {
                    navigate('/passport', { replace: true });
                    return;
                  }
                  if (isAccountSurface) {
                    navigate(`/a/${encodeURIComponent(normalizedAccount)}/events`, { replace: true });
                    return;
                  }
                  navigate('/events', { replace: true });
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to={isPassportSurface ? '/passport/signin' : accountMemberSigninHref || '/events/signin'}>Sign in</Link>
          )}
        </nav>
      </header>

      <section className="hero hero-no-aside">
        <div>
          <p className="eyebrow">{entryLabel}</p>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="hero-actions">
            <Link className="btn" to={isPassportSurface ? '/passport/signin' : accountMemberSigninHref || '/events/signin'}>
              {isPassportSurface ? 'Masuk ke Passport' : 'Ikut Event Sekarang'}
            </Link>
            {!isPassportSurface && !isAccountSurface && !isExploreAllMode ? (
              <Link className="btn ghost" to="/events?explore=1">
                Explore Semua Event
              </Link>
            ) : null}
            {!isPassportSurface && !isAccountSurface && isExploreAllMode ? (
              <Link className="btn ghost" to="/events">
                Kembali ke Premium Events
              </Link>
            ) : null}
          </div>

          <div className="passport-badge-list" style={{ marginTop: '0.75rem' }}>
            <span className="passport-chip"><i className="fa-solid fa-calendar-check" /> Register cepat</span>
            <span className="passport-chip"><i className="fa-solid fa-users" /> Komunitas aktif</span>
            <span className="passport-chip"><i className="fa-solid fa-trophy" /> Progress terlihat</span>
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
            className={`landing-tab ${activeTab === 'my-events' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-events')}
          >
            My Events
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
            <p className="eyebrow">Events</p>
            <h2 className="landing-title">
              {isGlobalEventsSurface
                ? (isExploreAllMode ? 'Explore semua event' : 'Premium events')
                : 'Upcoming events'}
            </h2>
            {isGlobalEventsSurface && isExploreAllMode ? (
              <div className="card form" style={{ marginBottom: '1rem' }}>
                <label>
                  Cari event
                  <input
                    type="search"
                    placeholder="judul, kategori, organizer..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </label>
              </div>
            ) : null}
            {loading ? <p className="feedback">Loading events...</p> : null}
            {error ? <p className="feedback">{error}</p> : null}
            {isGlobalEventsSurface && !isExploreAllMode ? (
              <p className="feedback">Menampilkan event premium yang sudah diposting.</p>
            ) : null}
            <div className="passport-live-grid">
              {searchableEvents.map((event, idx) => (
                <article className="passport-live-card" key={event.event_id || `${event.title}-${idx}`}>
                  <img className="passport-live-image" src={event.image} alt={event.title} />
                  <div className="passport-live-head">
                    <span className="passport-live-badge">{event.status}</span>
                    <span className="passport-live-vertical"><i className={iconForVertical(event.vertical)} /> {event.vertical}</span>
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
                      to={event.event_id
                        ? (event.account_slug
                          ? `/a/${encodeURIComponent(event.account_slug)}/e/${encodeURIComponent(event.event_id)}`
                          : `${registerBase}?event=${encodeURIComponent(event.event_id)}`)
                        : registerBase}
                    >
                      Register
                    </Link>
                  )}
                </article>
              ))}
              {!loading && searchableEvents.length === 0 ? (
                <article className="passport-live-card">
                  <h3>{isGlobalEventsSurface && !isExploreAllMode ? 'Belum ada premium event' : 'Belum ada event published'}</h3>
                  <p className="passport-live-time">
                    {isGlobalEventsSurface && !isExploreAllMode
                      ? 'Coba Explore Semua Event atau tunggu premium event berikutnya.'
                      : 'Coba lagi sebentar lagi, event baru akan segera hadir.'}
                  </p>
                </article>
              ) : null}
            </div>
          </>
        ) : activeTab === 'my-events' ? (
          <>
            <p className="eyebrow">My Events</p>
            <h2 className="landing-title">Event yang sudah kamu join</h2>
            {!isAuthenticated ? <p className="feedback">Sign in dulu untuk lihat My Events.</p> : null}
            <div className="passport-live-grid">
              {isAuthenticated && joinedEvents.map((event, idx) => (
                <article className="passport-live-card" key={event.event_id || `${event.title}-${idx}`}>
                  <img className="passport-live-image" src={event.image} alt={event.title} />
                  <div className="passport-live-head">
                    <span className="passport-live-badge">{event.status}</span>
                    <span className="passport-live-vertical"><i className={iconForVertical(event.vertical)} /> {event.vertical}</span>
                  </div>
                  <h3>{event.title}</h3>
                  <p className="passport-live-category">Category: {event.category}</p>
                  <p className="passport-live-host">{event.host}</p>
                  <p className="passport-live-host">Penyelenggara: {event.organizer || 'Foremoz Organizer'}</p>
                  <p className="passport-live-time">{event.time}</p>
                  <Link
                    className="btn ghost small"
                    to={event.event_id
                      ? (event.account_slug
                        ? `/a/${encodeURIComponent(event.account_slug)}/e/${encodeURIComponent(event.event_id)}`
                        : `${registerBase}?event=${encodeURIComponent(event.event_id)}`)
                      : registerBase}
                  >
                    Buka event
                  </Link>
                </article>
              ))}
              {isAuthenticated && !loading && joinedEvents.length === 0 ? (
                <article className="passport-live-card">
                  <h3>Belum ada event yang kamu join</h3>
                  <p className="passport-live-time">Setelah register event, daftar event akan muncul di sini.</p>
                </article>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow">FAQ</p>
            <h2 className="landing-title">Cara ikut event</h2>
            <div className="feature-grid">
              <article className="feature-card">
                <h3><i className="fa-solid fa-circle-play" /> Mulai dari event</h3>
                <p>1) Pilih event yang kamu suka.</p>
                <p>2) Register dan hadir di event.</p>
                <p>3) Riwayat event langsung tersimpan di profile kamu.</p>
              </article>
              <article className="feature-card">
                <h3><i className="fa-solid fa-id-card" /> Perlu buat passport dulu?</h3>
                <p>Tidak perlu. Kamu bisa mulai dari event, profile akan mengikuti perjalananmu otomatis.</p>
              </article>
            </div>
          </>
        )}
      </section>

      <section className="cta">
        <p className="eyebrow">Create Events</p>
        <h2>Ingin bikin event sendiri di Foremoz?</h2>
        <p>Untuk host/owner yang ingin publish event baru dan kelola operasional tenant, lanjut ke Foremoz Web.</p>
        <div className="hero-actions">
          <Link className="btn ghost" to="/host">
            Create New Events
          </Link>
        </div>
      </section>
    </main>
  );
}

function guessVertical(row) {
  const slug = guessVerticalSlugByEventText(row, 'fitness');
  return getVerticalLabel(slug, 'Fitness');
}

function guessCategory(row) {
  if (Array.isArray(row?.event_categories) && row.event_categories.length > 0) {
    return row.event_categories.map((item) => String(item || '').trim()).filter(Boolean).join(', ');
  }
  const text = `${row.event_name || ''}`.toLowerCase();
  if (text.includes('bootcamp') || text.includes('strength')) return 'Strength Training';
  if (text.includes('english') || text.includes('language')) return 'Language Practice';
  if (text.includes('dance') || text.includes('art')) return 'Creative Session';
  const verticalSlug = guessVerticalSlugByEventText(row, 'fitness');
  const firstType = (getVerticalConfig(verticalSlug)?.experience_types || [])[0];
  return firstType ? String(firstType) : 'General Event';
}

function iconForVertical(verticalLabel) {
  const text = String(verticalLabel || '').toLowerCase();
  if (text.includes('fitness') || text.includes('gym') || text.includes('workout')) return 'fa-solid fa-dumbbell';
  if (text.includes('sport') || text.includes('match') || text.includes('league') || text.includes('tournament')) return 'fa-solid fa-futbol';
  if (text.includes('learning')) return 'fa-solid fa-book-open';
  if (text.includes('performance')) return 'fa-solid fa-microphone-lines';
  if (text.includes('art')) return 'fa-solid fa-palette';
  if (text.includes('tourism')) return 'fa-solid fa-route';
  return 'fa-solid fa-calendar';
}
