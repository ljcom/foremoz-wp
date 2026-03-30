import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { useI18n } from '../i18n.js';
import { apiJson } from '../lib.js';
import { clearPassportSession, getPassportSession } from '../passport-client.js';
import { getVerticalConfig, getVerticalLabel, guessVerticalSlugByEventText, listVerticalConfigs } from '../industry-jargon.js';
import { formatAppDateTime } from '../time.js';

const JOINED_EVENTS_KEY = 'ff.events.joined';

function buildFallbackEvents(copy) {
  return [
    {
      title: 'Morning Strength Camp',
      vertical: 'Fitness',
      category: 'Strength Training',
      host: 'Coach Rafi - Foremoz Fitness Center',
      organizer: 'Foremoz Fitness Team',
      time: copy.liveNowMorning,
      status: copy.liveStatus,
      image:
        'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80'
    },
    {
      title: 'English Speaking Sprint',
      vertical: 'Learning',
      category: 'Language Practice',
      host: 'Mentor Dita - Learning Hub Bandung',
      organizer: 'Foremoz Learning Team',
      time: copy.liveNowLanguage,
      status: copy.liveStatus,
      image:
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80'
    },
    {
      title: 'Urban Dance Rehearsal',
      vertical: 'Arts',
      category: 'Dance Rehearsal',
      host: 'Studio Kroma - Creative Stage',
      organizer: 'Foremoz Arts Team',
      time: copy.liveNowDance,
      status: copy.liveStatus,
      image:
        'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80'
    },
    {
      title: 'City Night Run Performance',
      vertical: 'Performance',
      category: 'Show',
      host: 'Performer Nara - Central Venue',
      organizer: 'Foremoz Performance Team',
      time: copy.startsAtNight,
      status: copy.liveStatus,
      image:
        'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=1200&q=80'
    },
    {
      title: 'Sunrise Heritage Tour',
      vertical: 'Tourism',
      category: 'Tour',
      host: 'Guide Akbar - Old Town Route',
      organizer: 'Foremoz Tourism Team',
      time: copy.startsAtTour,
      status: copy.liveStatus,
      image:
        'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=1200&q=80'
    }
  ];
}

export default function PassportLandingPage() {
  const { language } = useI18n();
  const copy = useMemo(() => (language === 'en'
    ? {
        passportTitle: 'Passport Member Profile',
        accountTitle: 'Events @{account}',
        globalTitle: 'Join Events Across {verticals}',
        passportDescription: 'Show your event journey in one shareable profile.',
        accountDescription: 'All events from this account live on one page.',
        globalDescription: 'Pick your favorite event, register, and show up with the community.',
        welcomeFallback: 'Member',
        untitledEvent: 'Untitled Event',
        venueFallback: 'Foremoz Venue',
        organizerFallback: 'Foremoz Organizer',
        startsAt: 'Starts',
        scheduleTbd: 'Schedule not set yet',
        loadError: 'Failed to load events',
        brandPassport: 'Foremoz Passport',
        brandEvents: 'Foremoz Events',
        newHost: 'New Host',
        welcome: 'Welcome {name}',
        profile: 'Profile',
        signOut: 'Sign out',
        signIn: 'Sign in',
        signInPassport: 'Sign in to Passport',
        joinNow: 'Join Events Now',
        exploreAll: 'Explore All Events',
        backPremium: 'Back to Premium Events',
        chipFastRegister: 'Fast registration',
        chipActiveCommunity: 'Active community',
        chipVisibleProgress: 'Visible progress',
        tabEvents: 'Events',
        tabMyEvents: 'My Events',
        tabFaq: 'FAQ',
        eventsEyebrow: 'Events',
        premiumEvents: 'Premium events',
        upcomingEvents: 'Upcoming events',
        accountEvents: 'All saved events',
        exploreEvents: 'Explore all events',
        searchLabel: 'Search events',
        searchPlaceholder: 'title, category, organizer...',
        loadingEvents: 'Loading events...',
        premiumPosted: 'Showing premium events that are already posted.',
        category: 'Category',
        organizer: 'Organizer',
        joined: 'Joined',
        register: 'Register',
        noPremium: 'No premium events yet',
        noPublished: 'No published events yet',
        noAccountEvents: 'No saved events yet',
        noPremiumDescription: 'Try Explore All Events or come back for the next premium event.',
        noPublishedDescription: 'Check back soon, more events are on the way.',
        noAccountEventsDescription: 'Events that are already saved for this account will appear here automatically.',
        myEventsEyebrow: 'My Events',
        myEventsTitle: 'Events you have joined',
        signInFirst: 'Sign in first to view My Events.',
        openEvent: 'Open event',
        noJoinedTitle: 'You have not joined any events yet',
        noJoinedDescription: 'After you register for an event, it will appear here.',
        faqEyebrow: 'FAQ',
        faqTitle: 'How to join events',
        faqStartTitle: 'Start from the event',
        faqStep1: '1. Pick an event you like.',
        faqStep2: '2. Register and show up at the event.',
        faqStep3: '3. Your event history is saved to your profile automatically.',
        faqPassportTitle: 'Do you need a passport first?',
        faqPassportDescription: 'No. You can start from the event, and your profile will follow the journey automatically.',
        createEyebrow: 'Create Events',
        createTitle: 'Want to host your own event on Foremoz?',
        createDescription: 'For hosts and owners who want to publish new events and manage tenant operations, continue to Foremoz Web.',
        createButton: 'Create New Events',
        liveStatus: 'Live',
        liveNowMorning: 'Live now (06:00 - 07:30 WIB)',
        liveNowLanguage: 'Live now (09:00 - 10:30 WIB)',
        liveNowDance: 'Live now (19:00 - 21:00 WIB)',
        startsAtNight: 'Starts 20:00 WIB',
        startsAtTour: 'Starts 06:30 WIB'
      }
    : {
        passportTitle: 'Passport Profile Member',
        accountTitle: 'Event @{account}',
        globalTitle: 'Ikut Event Lintas {verticals}',
        passportDescription: 'Tunjukkan perjalanan event kamu di satu profile yang bisa dibagikan.',
        accountDescription: 'Semua event dari account ini ada di satu halaman.',
        globalDescription: 'Pilih event favoritmu, register, lalu hadir bersama komunitas.',
        welcomeFallback: 'Member',
        untitledEvent: 'Untitled Event',
        venueFallback: 'Foremoz Venue',
        organizerFallback: 'Foremoz Organizer',
        startsAt: 'Mulai',
        scheduleTbd: 'Jadwal belum ditentukan',
        loadError: 'Gagal memuat event',
        brandPassport: 'Foremoz Passport',
        brandEvents: 'Foremoz Events',
        newHost: 'New Host',
        welcome: 'Welcome {name}',
        profile: 'Profile',
        signOut: 'Sign out',
        signIn: 'Sign in',
        signInPassport: 'Masuk ke Passport',
        joinNow: 'Ikut Event Sekarang',
        exploreAll: 'Explore Semua Event',
        backPremium: 'Kembali ke Premium Events',
        chipFastRegister: 'Register cepat',
        chipActiveCommunity: 'Komunitas aktif',
        chipVisibleProgress: 'Progress terlihat',
        tabEvents: 'Events',
        tabMyEvents: 'My Events',
        tabFaq: 'FAQ',
        eventsEyebrow: 'Events',
        premiumEvents: 'Premium events',
        upcomingEvents: 'Upcoming events',
        accountEvents: 'Semua event tersimpan',
        exploreEvents: 'Explore semua event',
        searchLabel: 'Cari event',
        searchPlaceholder: 'judul, kategori, organizer...',
        loadingEvents: 'Loading events...',
        premiumPosted: 'Menampilkan event premium yang sudah diposting.',
        category: 'Category',
        organizer: 'Penyelenggara',
        joined: 'Sudah joined',
        register: 'Register',
        noPremium: 'Belum ada premium event',
        noPublished: 'Belum ada event published',
        noAccountEvents: 'Belum ada event tersimpan',
        noPremiumDescription: 'Coba Explore Semua Event atau tunggu premium event berikutnya.',
        noPublishedDescription: 'Coba lagi sebentar lagi, event baru akan segera hadir.',
        noAccountEventsDescription: 'Event yang sudah disimpan untuk account ini akan tampil otomatis di sini.',
        myEventsEyebrow: 'My Events',
        myEventsTitle: 'Event yang sudah kamu join',
        signInFirst: 'Sign in dulu untuk lihat My Events.',
        openEvent: 'Buka event',
        noJoinedTitle: 'Belum ada event yang kamu join',
        noJoinedDescription: 'Setelah register event, daftar event akan muncul di sini.',
        faqEyebrow: 'FAQ',
        faqTitle: 'Cara ikut event',
        faqStartTitle: 'Mulai dari event',
        faqStep1: '1) Pilih event yang kamu suka.',
        faqStep2: '2) Register dan hadir di event.',
        faqStep3: '3) Riwayat event langsung tersimpan di profile kamu.',
        faqPassportTitle: 'Perlu buat passport dulu?',
        faqPassportDescription: 'Tidak perlu. Kamu bisa mulai dari event, profile akan mengikuti perjalananmu otomatis.',
        createEyebrow: 'Create Events',
        createTitle: 'Ingin bikin event sendiri di Foremoz?',
        createDescription: 'Untuk host/owner yang ingin publish event baru dan kelola operasional tenant, lanjut ke Foremoz Web.',
        createButton: 'Create New Events',
        liveStatus: 'Live',
        liveNowMorning: 'Sedang berlangsung (06:00 - 07:30 WIB)',
        liveNowLanguage: 'Sedang berlangsung (09:00 - 10:30 WIB)',
        liveNowDance: 'Sedang berlangsung (19:00 - 21:00 WIB)',
        startsAtNight: 'Mulai 20:00 WIB',
        startsAtTour: 'Mulai 06:30 WIB'
      }), [language]);
  const navigate = useNavigate();
  const location = useLocation();
  const { account: accountParam } = useParams();
  const normalizedAccount = String(accountParam || '').trim().toLowerCase();
  const isAccountSurface = location.pathname.startsWith('/a/') && location.pathname.endsWith('/events') && Boolean(normalizedAccount);
  const isPassportSurface = location.pathname.startsWith('/passport') || location.pathname.startsWith('/p/');
  const isGlobalEventsSurface = !isPassportSurface && !isAccountSurface;
  const registerBase = isPassportSurface ? '/passport/register' : '/events/register';
  const profileHref = '/passport/dashboard';
  const fallbackEvents = useMemo(() => buildFallbackEvents(copy), [copy]);
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
    ? copy.passportTitle
    : isAccountSurface
      ? copy.accountTitle.replace('{account}', normalizedAccount)
      : copy.globalTitle.replace('{verticals}', verticalListText);
  const description = isPassportSurface
    ? copy.passportDescription
    : isAccountSurface
      ? copy.accountDescription
      : copy.globalDescription;
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
    copy.welcomeFallback;

  useEffect(() => {
    let isMounted = true;
    async function loadEvents() {
      try {
        setLoading(true);
        setError('');
        const result = await apiJson(`/v1/read/events?status=${isAccountSurface ? 'all' : 'published'}&limit=${isAccountSurface ? '400' : '24'}`);
        const rows = Array.isArray(result.rows) ? result.rows : [];
        const mapped = rows.map((row) => {
          const vertical = guessVertical(row);
          const verticalSlug = guessVerticalSlugByEventText(row, 'fitness');
          const vocabularyCreator = getVerticalConfig(verticalSlug)?.vocabulary?.creator || 'Creator';
          return {
            event_id: row.event_id || '',
            account_slug: row.account_slug || '',
            title: row.event_name || copy.untitledEvent,
            vertical,
            category: guessCategory(row),
            host: `${vocabularyCreator} - ${row.location || copy.venueFallback}`,
            organizer:
              row.organizer_name ||
              row.host_name ||
              row.created_by_name ||
              row.tenant_name ||
              copy.organizerFallback,
            time: row.start_at ? `${copy.startsAt} ${formatAppDateTime(row.start_at)}` : copy.scheduleTbd,
            status: String(row.status || (isAccountSurface ? 'draft' : 'published')).toUpperCase(),
            image: row.image_url || fallbackEvents[0]?.image || ''
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
              title: row.event_name || copy.untitledEvent,
              vertical,
              category: guessCategory(row),
              host: `${vocabularyCreator} - ${row.location || copy.venueFallback}`,
              organizer:
                row.organizer_name ||
                row.host_name ||
                row.created_by_name ||
                row.tenant_name ||
                copy.organizerFallback,
              time: row.start_at ? `${copy.startsAt} ${formatAppDateTime(row.start_at)}` : copy.scheduleTbd,
              status: String(row.status || 'draft').toUpperCase(),
              image: row.image_url || fallbackEvents[0]?.image || ''
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
        setError(err.message || copy.loadError);
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
  }, [copy, fallbackEvents, isAccountSurface, normalizedAccount]);

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
    : (isPassportSurface ? copy.brandPassport : copy.brandEvents);

  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">{brandLabel}</div>
        <nav>
          {!isAccountSurface ? <Link to="/host">{copy.newHost}</Link> : null}
          <LanguageSwitcher compact />
          {isAuthenticated ? (
            <>
              <span>{copy.welcome.replace('{name}', welcomeName)}</span>
              <Link to={profileHref}>{copy.profile}</Link>
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
                {copy.signOut}
              </button>
            </>
          ) : (
            <Link to={isPassportSurface ? '/passport/signin' : accountMemberSigninHref || '/events/signin'}>{copy.signIn}</Link>
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
              {isPassportSurface ? copy.signInPassport : copy.joinNow}
            </Link>
            {!isPassportSurface && !isAccountSurface && !isExploreAllMode ? (
              <Link className="btn ghost" to="/events?explore=1">
                {copy.exploreAll}
              </Link>
            ) : null}
            {!isPassportSurface && !isAccountSurface && isExploreAllMode ? (
              <Link className="btn ghost" to="/events">
                {copy.backPremium}
              </Link>
            ) : null}
          </div>

          <div className="passport-badge-list" style={{ marginTop: '0.75rem' }}>
            <span className="passport-chip"><i className="fa-solid fa-calendar-check" /> {copy.chipFastRegister}</span>
            <span className="passport-chip"><i className="fa-solid fa-users" /> {copy.chipActiveCommunity}</span>
            <span className="passport-chip"><i className="fa-solid fa-trophy" /> {copy.chipVisibleProgress}</span>
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
            {copy.tabEvents}
          </button>
          <button
            type="button"
            className={`landing-tab ${activeTab === 'my-events' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-events')}
          >
            {copy.tabMyEvents}
          </button>
          <button
            type="button"
            className={`landing-tab ${activeTab === 'faq' ? 'active' : ''}`}
            onClick={() => setActiveTab('faq')}
          >
            {copy.tabFaq}
          </button>
        </div>

        {activeTab === 'events' ? (
          <>
            <p className="eyebrow">{copy.eventsEyebrow}</p>
            <h2 className="landing-title">
              {isGlobalEventsSurface
                ? (isExploreAllMode ? copy.exploreEvents : copy.premiumEvents)
                : (isAccountSurface ? copy.accountEvents : copy.upcomingEvents)}
            </h2>
            {isAccountSurface ? (
              <div className="hero-actions" style={{ marginBottom: '1rem' }}>
                <Link className="btn ghost small" to={`/a/${encodeURIComponent(normalizedAccount)}`}>
                  Back
                </Link>
              </div>
            ) : null}
            {isGlobalEventsSurface && isExploreAllMode ? (
              <div className="card form" style={{ marginBottom: '1rem' }}>
                <label>
                  {copy.searchLabel}
                  <input
                    type="search"
                    placeholder={copy.searchPlaceholder}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </label>
              </div>
            ) : null}
            {loading ? <p className="feedback">{copy.loadingEvents}</p> : null}
            {error ? <p className="feedback">{error}</p> : null}
            {isGlobalEventsSurface && !isExploreAllMode ? (
              <p className="feedback">{copy.premiumPosted}</p>
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
                  <p className="passport-live-category">{copy.category}: {event.category}</p>
                  <p className="passport-live-host">{event.host}</p>
                  <p className="passport-live-host">{copy.organizer}: {event.organizer || copy.organizerFallback}</p>
                  <p className="passport-live-time">{event.time}</p>
                  {joinedEventIds.includes(String(event.event_id || '')) ? (
                    <span className="passport-live-badge joined">{copy.joined}</span>
                  ) : (
                    <div style={{ marginTop: '1.25rem' }}>
                      <Link
                        className="btn ghost small"
                        to={event.event_id
                          ? (event.account_slug
                            ? `/a/${encodeURIComponent(event.account_slug)}/e/${encodeURIComponent(event.event_id)}`
                            : `${registerBase}?event=${encodeURIComponent(event.event_id)}`)
                          : registerBase}
                      >
                        {copy.register}
                      </Link>
                    </div>
                  )}
                </article>
              ))}
              {!loading && searchableEvents.length === 0 ? (
                <article className="passport-live-card">
                  <h3>
                    {isAccountSurface
                      ? copy.noAccountEvents
                      : (isGlobalEventsSurface && !isExploreAllMode ? copy.noPremium : copy.noPublished)}
                  </h3>
                  <p className="passport-live-time">
                    {isAccountSurface
                      ? copy.noAccountEventsDescription
                      : (isGlobalEventsSurface && !isExploreAllMode
                        ? copy.noPremiumDescription
                        : copy.noPublishedDescription)}
                  </p>
                </article>
              ) : null}
            </div>
          </>
        ) : activeTab === 'my-events' ? (
          <>
            <p className="eyebrow">{copy.myEventsEyebrow}</p>
            <h2 className="landing-title">{copy.myEventsTitle}</h2>
            {!isAuthenticated ? <p className="feedback">{copy.signInFirst}</p> : null}
            <div className="passport-live-grid">
              {isAuthenticated && joinedEvents.map((event, idx) => (
                <article className="passport-live-card" key={event.event_id || `${event.title}-${idx}`}>
                  <img className="passport-live-image" src={event.image} alt={event.title} />
                  <div className="passport-live-head">
                    <span className="passport-live-badge">{event.status}</span>
                    <span className="passport-live-vertical"><i className={iconForVertical(event.vertical)} /> {event.vertical}</span>
                  </div>
                  <h3>{event.title}</h3>
                  <p className="passport-live-category">{copy.category}: {event.category}</p>
                  <p className="passport-live-host">{event.host}</p>
                  <p className="passport-live-host">{copy.organizer}: {event.organizer || copy.organizerFallback}</p>
                  <p className="passport-live-time">{event.time}</p>
                  <div style={{ marginTop: '1rem' }}>
                    <Link
                      className="btn ghost small"
                      to={event.event_id
                        ? (event.account_slug
                          ? `/a/${encodeURIComponent(event.account_slug)}/e/${encodeURIComponent(event.event_id)}`
                          : `${registerBase}?event=${encodeURIComponent(event.event_id)}`)
                        : registerBase}
                    >
                      {copy.openEvent}
                    </Link>
                  </div>
                </article>
              ))}
              {isAuthenticated && !loading && joinedEvents.length === 0 ? (
                <article className="passport-live-card">
                  <h3>{copy.noJoinedTitle}</h3>
                  <p className="passport-live-time">{copy.noJoinedDescription}</p>
                </article>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow">{copy.faqEyebrow}</p>
            <h2 className="landing-title">{copy.faqTitle}</h2>
            <div className="feature-grid">
              <article className="feature-card">
                <h3><i className="fa-solid fa-circle-play" /> {copy.faqStartTitle}</h3>
                <p>{copy.faqStep1}</p>
                <p>{copy.faqStep2}</p>
                <p>{copy.faqStep3}</p>
              </article>
              <article className="feature-card">
                <h3><i className="fa-solid fa-id-card" /> {copy.faqPassportTitle}</h3>
                <p>{copy.faqPassportDescription}</p>
              </article>
            </div>
          </>
        )}
      </section>

      {!isAccountSurface ? (
        <section className="cta">
          <p className="eyebrow">{copy.createEyebrow}</p>
          <h2>{copy.createTitle}</h2>
          <p>{copy.createDescription}</p>
          <div className="hero-actions">
            <Link className="btn ghost" to="/host">
              {copy.createButton}
            </Link>
          </div>
        </section>
      ) : null}
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
