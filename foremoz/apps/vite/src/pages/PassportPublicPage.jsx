import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiJson } from '../lib.js';
import { getVerticalConfig, getVerticalLabel, guessVerticalSlugByEventText } from '../industry-jargon.js';
import PageStateCard from '../components/PageStateCard.jsx';

function hashInt(value) {
  let hash = 0;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function titleFromAccount(account) {
  const raw = String(account || 'member').replace(/[-_]+/g, ' ').trim();
  if (!raw) return 'Member Foremoz';
  return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(value) {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function eventVisual(eventId) {
  return `https://picsum.photos/seed/public-event-${encodeURIComponent(String(eventId || 'x'))}/800/450`;
}

function followStorageKey(slug) {
  return `ff.passport.public.follow.${String(slug || '').trim().toLowerCase()}`;
}

function normalizePublicVisibility(raw) {
  return {
    allowPublicPublish: raw?.allowPublicPublish !== false,
    showRolesCapabilities: raw?.showRolesCapabilities !== false,
    showProgramsProducts: raw?.showProgramsProducts !== false,
    showUpcomingEvents: raw?.showUpcomingEvents !== false,
    showPastEvents: raw?.showPastEvents !== false,
    showAchievements: raw?.showAchievements !== false,
    showCommunity: raw?.showCommunity !== false,
    showActivityFeed: raw?.showActivityFeed !== false,
    showHostLocations: raw?.showHostLocations !== false,
    showPassportStats: raw?.showPassportStats !== false,
    showContactBooking: raw?.showContactBooking !== false
  };
}

function guessVertical(eventItem) {
  const slug = guessVerticalSlugByEventText(eventItem, 'fitness');
  return getVerticalLabel(slug, 'Fitness');
}

function deriveCapabilities(events) {
  const set = new Set();
  events.forEach((item) => {
    const verticalSlug = guessVerticalSlugByEventText(item, 'fitness');
    const creator = getVerticalConfig(verticalSlug)?.vocabulary?.creator;
    if (creator) set.add(creator);
  });
  if (set.size === 0) {
    set.add('Creator');
    set.add('Organizer');
  }
  return [...set].slice(0, 6);
}

function derivePrograms(events) {
  const names = [...new Set(events.map((item) => String(item.event_name || '').trim()).filter(Boolean))];
  return names.slice(0, 6);
}

export default function PassportPublicPage() {
  const { account = 'member' } = useParams();
  const [events, setEvents] = useState({ upcoming: [], past: [] });
  const [profile, setProfile] = useState(null);
  const [ownerSetup, setOwnerSetup] = useState(null);
  const [stats, setStats] = useState({
    events_created: 0,
    events_attended: 0
  });
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [publicVisibility, setPublicVisibility] = useState(() => normalizePublicVisibility({}));
  const [isFollowing, setIsFollowing] = useState(false);
  const [followCount, setFollowCount] = useState(0);
  const [actionMessage, setActionMessage] = useState('');
  const [eventsTab, setEventsTab] = useState('upcoming');
  const upcomingCarouselRef = useRef(null);
  const [loadError, setLoadError] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function loadPassport() {
      try {
        setLoading(true);
        setNotFound(false);
        setLoadError('');
        const result = await apiJson(`/v1/public/passport?account=${encodeURIComponent(account)}`);
        if (!mounted) return;
        const profileItem = result.profile || null;
        const ownerItem = result.owner_setup || null;
        setProfile(profileItem);
        setOwnerSetup(ownerItem);
        setPublicVisibility(normalizePublicVisibility(result.visibility || {}));
        setEvents({
          upcoming: Array.isArray(result?.events?.upcoming) ? result.events.upcoming : [],
          past: Array.isArray(result?.events?.past) ? result.events.past : []
        });
        setStats({
          events_created: Number(result?.stats?.events_created || 0),
          events_attended: Number(result?.stats?.events_attended || 0)
        });
        setNotFound(!profileItem && !ownerItem);
      } catch (error) {
        if (!mounted) return;
        setProfile(null);
        setOwnerSetup(null);
        setNotFound(false);
        setLoadError(error?.message || 'Gagal memuat passport publik.');
        setPublicVisibility(normalizePublicVisibility({}));
        setEvents({ upcoming: [], past: [] });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadPassport();
    return () => {
      mounted = false;
    };
  }, [account, reloadVersion]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = followStorageKey(account);
    const localFollow = localStorage.getItem(key) === '1';
    setIsFollowing(localFollow);
    const storedCount = Number(localStorage.getItem(`${key}.count`) || 0);
    if (Number.isFinite(storedCount) && storedCount > 0) {
      setFollowCount(storedCount);
      return;
    }
    const baseline = (hashInt(account) % 1500) + 120;
    setFollowCount(baseline);
    localStorage.setItem(`${key}.count`, String(baseline));
  }, [account]);

  const upcoming = useMemo(() => (Array.isArray(events?.upcoming) ? events.upcoming : []), [events]);
  const history = useMemo(() => (Array.isArray(events?.past) ? events.past : []), [events]);

  const name = String(profile?.full_name || '').trim() || titleFromAccount(account);
  const seed = hashInt(account);
  const mergedEvents = [...upcoming, ...history];
  const capabilities = deriveCapabilities(mergedEvents);
  const programs = derivePrograms(mergedEvents);
  const locations = [...new Set(mergedEvents.map((item) => String(item.location || '').trim()).filter(Boolean))];
  const activityItems = useMemo(() => {
    const rows = [...upcoming, ...history]
      .sort((a, b) => new Date(b.start_at || 0).getTime() - new Date(a.start_at || 0).getTime())
      .slice(0, 6);
    return rows.map((item) => {
      const isPast = new Date(item.start_at || '').getTime() < Date.now();
      return {
        id: String(item?.event_id || Math.random()),
        icon: isPast ? 'fa-solid fa-circle-check' : 'fa-solid fa-calendar-days',
        text: `${name} ${isPast ? 'joined' : 'scheduled'} ${item.event_name || 'event'}`,
        time: formatDateTime(item.start_at)
      };
    });
  }, [history, name, upcoming]);
  const accountSlug = String(account || '').trim().toLowerCase();
  const ownerAccountSlug = String(ownerSetup?.account_slug || '').trim().toLowerCase();
  const isOwnerContext = Boolean(ownerAccountSlug) && ownerAccountSlug === accountSlug;
  const isPassportIdContext = accountSlug.startsWith('pass_');
  const canShowUpcomingEvents = publicVisibility.allowPublicPublish && publicVisibility.showUpcomingEvents;
  const canShowHistoryEvents = publicVisibility.allowPublicPublish && publicVisibility.showPastEvents;
  const canShowEventsSection = canShowUpcomingEvents || canShowHistoryEvents;
  const isCreatorProfile = isOwnerContext && Number(stats.events_created || 0) > 0;
  const showContactPanel =
    publicVisibility.allowPublicPublish &&
    publicVisibility.showContactBooking &&
    isOwnerContext &&
    !isPassportIdContext;
  const profileDescription = [
    String(profile?.city || '').trim(),
    capabilities.slice(0, 2).join(', '),
    `${Number(stats.events_created || 0)} hosted`,
    `${Number(stats.events_attended || 0)} joined`
  ]
    .filter(Boolean)
    .join(' | ');

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previousTitle = document.title;
    const nextTitle = `${name} | Foremoz Passport`;
    document.title = nextTitle;
    let meta = document.querySelector('meta[name="description"]');
    let created = false;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
      created = true;
    }
    const previousDescription = meta.getAttribute('content');
    meta.setAttribute(
      'content',
      profileDescription || `${name} on Foremoz Passport`
    );
    return () => {
      document.title = previousTitle;
      if (meta) {
        if (previousDescription !== null) {
          meta.setAttribute('content', previousDescription);
        } else if (created) {
          meta.remove();
        }
      }
    };
  }, [name, profileDescription]);

  useEffect(() => {
    if (eventsTab === 'upcoming' && !canShowUpcomingEvents && canShowHistoryEvents) {
      setEventsTab('history');
      return;
    }
    if (eventsTab === 'history' && !canShowHistoryEvents && canShowUpcomingEvents) {
      setEventsTab('upcoming');
    }
  }, [eventsTab, canShowUpcomingEvents, canShowHistoryEvents]);

  function toggleFollow() {
    if (typeof window === 'undefined') return;
    const key = followStorageKey(account);
    const next = !isFollowing;
    const nextCount = Math.max(0, Number(followCount || 0) + (next ? 1 : -1));
    localStorage.setItem(key, next ? '1' : '0');
    localStorage.setItem(`${key}.count`, String(nextCount));
    setIsFollowing(next);
    setFollowCount(nextCount);
    setActionMessage(next ? 'Now following.' : 'Unfollowed.');
  }

  function shareProfile() {
    const href = typeof window !== 'undefined' ? window.location.href : `/p/${encodeURIComponent(account)}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(href).then(() => setActionMessage('Profile link copied.'));
      return;
    }
    setActionMessage(href);
  }

  function contactCreator(type) {
    const subjectMap = {
      book: `Book private session with ${name}`,
      request: `Request event with ${name}`,
      contact: `Contact ${name}`
    };
    const subject = subjectMap[type] || `Contact ${name}`;
    const body = [
      `Hi ${name},`,
      '',
      `I found your passport profile: ${typeof window !== 'undefined' ? window.location.href : ''}`,
      '',
      'Regards,'
    ].join('\n');
    const mailto = `mailto:hello@foremoz.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (typeof window !== 'undefined') window.location.href = mailto;
  }

  function scrollUpcomingCarousel(direction) {
    const node = upcomingCarouselRef.current;
    if (!node) return;
    const delta = direction === 'next' ? node.clientWidth * 0.85 : node.clientWidth * -0.85;
    node.scrollBy({ left: delta, behavior: 'smooth' });
  }

  if (loading && !profile && !ownerSetup && !notFound) {
    return (
      <main className="landing passport-fancy-public" aria-busy="true">
        <div className="passport-bg-orbs" aria-hidden="true" />
        <header className="topbar">
          <div className="brand"><i className="fa-solid fa-id-card" /> Passport</div>
          <nav>
            <Link to="/events">Events</Link>
            <Link to="/passport/signin">Sign in</Link>
          </nav>
        </header>

        <section className="card passport-public-head passport-public-hero-card page-skeleton-card">
          <div className="page-skeleton-avatar page-skeleton-avatar-public" />
          <div className="page-skeleton-stack">
            <div className="page-skeleton-line page-skeleton-title" />
            <div className="page-skeleton-line page-skeleton-line-md" />
            <div className="page-skeleton-line page-skeleton-line-sm" />
            <div className="page-skeleton-pill-row">
              <div className="page-skeleton-pill" />
              <div className="page-skeleton-pill" />
              <div className="page-skeleton-pill" />
            </div>
          </div>
        </section>

        <section className="card page-skeleton-card">
          <div className="page-skeleton-stack">
            <div className="page-skeleton-line page-skeleton-line-lg" />
            <div className="page-skeleton-line" />
            <div className="page-skeleton-line page-skeleton-line-sm" />
          </div>
        </section>

        <section className="card page-skeleton-card">
          <div className="page-skeleton-grid">
            {[1, 2, 3].map((item) => (
              <div key={item} className="passport-live-card page-skeleton-card">
                <div className="page-skeleton-box page-skeleton-media" />
                <div className="page-skeleton-line page-skeleton-line-md" />
                <div className="page-skeleton-line page-skeleton-line-sm" />
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  }

  if (!loading && loadError) {
    return (
      <PageStateCard
        shellClassName="landing passport-fancy-public"
        withBackdrop
        eyebrow="Passport Public"
        title="Passport public belum bisa dimuat"
        description="Profile publik gagal diambil dari backend. Coba lagi atau kembali ke event listing."
        actions={[
          { label: 'Coba lagi', onClick: () => setReloadVersion((value) => value + 1) },
          { label: 'Back to events', to: '/events', variant: 'ghost' }
        ]}
      >
        <p className="error">{loadError}</p>
      </PageStateCard>
    );
  }

  if (!loading && notFound) {
    return (
      <main className="landing passport-fancy-public">
        <div className="passport-bg-orbs" aria-hidden="true" />
        <header className="topbar">
          <div className="brand"><i className="fa-solid fa-id-card" /> Passport</div>
          <nav>
            <Link to="/events">Events</Link>
            <Link to="/passport/signin">Sign in</Link>
          </nav>
        </header>
        <section className="card">
          <p className="eyebrow">404</p>
          <h1>Passport not found</h1>
          <p className="sub">Data passport untuk slug ini belum tersedia atau belum dipublish.</p>
          <div className="hero-actions">
            <Link className="btn" to="/events">Back to events</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="landing passport-fancy-public">
      <div className="passport-bg-orbs" aria-hidden="true" />
      <header className="topbar">
        <div className="brand"><i className="fa-solid fa-id-card" /> Passport</div>
        <nav>
          <Link to="/events">Events</Link>
          <Link to="/passport/signin">Sign in</Link>
        </nav>
      </header>

      <section className="card passport-public-head passport-public-hero-card">
        <img
          className="passport-public-avatar"
          src={`https://picsum.photos/seed/passport-${encodeURIComponent(account)}/180/180`}
          alt={name}
        />
        <div>
          <h1>{name}</h1>
          <p className="sub">{capabilities.slice(0, 3).join(' | ') || 'Member'}</p>
          <p className="sub">{profile?.city || '-'}</p>
          <div className="row-actions">
            {profile?.passport_id ? <span className="passport-verified">Verified</span> : null}
            <button className="btn" type="button" onClick={toggleFollow}>{isFollowing ? 'Following' : 'Follow'}</button>
            <button className="btn ghost" type="button" onClick={shareProfile}>Share</button>
            {canShowEventsSection ? (
              <a className="btn ghost" href="#public-events">Explore Events</a>
            ) : null}
          </div>
          <div className="passport-public-stats">
            <span><i className="fa-solid fa-bolt" /> {stats.events_created} Hosted</span>
            <span><i className="fa-solid fa-ticket" /> {stats.events_attended} Joined</span>
            <span><i className="fa-solid fa-heart" /> {followCount} Followers</span>
          </div>
          {actionMessage ? <p className="sub">{actionMessage}</p> : null}
        </div>
      </section>

      {publicVisibility.allowPublicPublish ? (
        <section className="card">
          <div className="panel-head">
            <div>
              <p className="eyebrow"><i className="fa-solid fa-rocket" /> Work With This Passport</p>
              <h2 style={{ marginBottom: '0.35rem' }}>Public profile yang siap dipakai untuk discovery dan conversion.</h2>
              <p className="sub">{profileDescription || 'Profile ini sudah punya context event, social proof, dan CTA utama.'}</p>
            </div>
            <div className="row-actions">
              <button className="btn" type="button" onClick={shareProfile}>Copy Profile Link</button>
              {showContactPanel ? (
                <button className="btn ghost" type="button" onClick={() => contactCreator('request')}>Request Collaboration</button>
              ) : null}
            </div>
          </div>
          <div className="ops-grid">
            <article className="card passport-insight-card">
              <h2><i className="fa-solid fa-bullseye" /> Best Use Case</h2>
              <p className="sub">
                {isCreatorProfile
                  ? 'Gunakan profile ini untuk mengarahkan audience ke event aktif, private booking, dan kolaborasi host.'
                  : 'Gunakan profile ini sebagai social proof untuk riwayat event, participation, dan credibility.'}
              </p>
            </article>
            <article className="card passport-insight-card">
              <h2><i className="fa-solid fa-user-group" /> Audience Signal</h2>
              <p className="sub">{followCount} follower baseline, {locations.slice(0, 3).join(', ') || 'multi-location presence'}.</p>
            </article>
            <article className="card passport-insight-card">
              <h2><i className="fa-solid fa-link" /> Conversion Path</h2>
              <p className="sub">
                {showContactPanel
                  ? 'Follow -> explore events -> book session/request event.'
                  : 'Follow -> share profile -> explore public events.'}
              </p>
            </article>
          </div>
        </section>
      ) : null}

      {!publicVisibility.allowPublicPublish ? (
        <section className="card">
          <h2><i className="fa-solid fa-lock" /> Private Profile</h2>
          <p className="sub">Halaman ini belum dibuka untuk publik.</p>
        </section>
      ) : null}

      {publicVisibility.allowPublicPublish &&
      (publicVisibility.showRolesCapabilities ||
        publicVisibility.showProgramsProducts ||
        publicVisibility.showAchievements ||
        publicVisibility.showCommunity ||
        publicVisibility.showActivityFeed ||
        publicVisibility.showHostLocations) ? (
        <section className="ops-grid passport-insight-grid">
          {publicVisibility.showRolesCapabilities ? (
            <article className="card passport-insight-card">
              <h2><i className="fa-solid fa-user-check" /> Roles</h2>
              <div className="passport-badge-list">
                {capabilities.map((item, idx) => (
                  <span className="passport-chip" key={`${item}-${idx}`}>
                    <i className="fa-solid fa-check" /> {item}
                  </span>
                ))}
              </div>
            </article>
          ) : null}
          {publicVisibility.showProgramsProducts ? (
            <article className="card passport-insight-card">
              <h2><i className="fa-solid fa-layer-group" /> Programs</h2>
              <div className="passport-badge-list">
                {programs.map((item, idx) => (
                  <span className="passport-chip" key={`${item}-${idx}`}>
                    <i className="fa-solid fa-star" /> {item}
                  </span>
                ))}
                {programs.length === 0 ? <span className="passport-chip"><i className="fa-solid fa-plus" /> Coming Soon</span> : null}
              </div>
            </article>
          ) : null}
          {publicVisibility.showAchievements ? (
            <article className="card passport-insight-card">
              <h2><i className="fa-solid fa-trophy" /> Achievements</h2>
              <div className="passport-badge-list">
                <span className="passport-chip"><i className="fa-solid fa-flag-checkered" /> Milestones {Number(profile?.performance_milestone_count || 0)}</span>
                <span className="passport-chip"><i className="fa-solid fa-user-group" /> Coach {Number(profile?.coach_relation_count || 0)}</span>
                <span className="passport-chip"><i className="fa-solid fa-building" /> Studio {Number(profile?.studio_relation_count || 0)}</span>
              </div>
            </article>
          ) : null}
          {publicVisibility.showCommunity ? (
            <article className="card passport-insight-card">
              <h2><i className="fa-solid fa-users" /> Community</h2>
              <div className="passport-avatar-strip">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <img
                    key={n}
                    src={`https://i.pravatar.cc/48?img=${(seed + n) % 70}`}
                    alt={`Follower ${n}`}
                  />
                ))}
              </div>
              <div className="passport-insight-action">
                <button className="btn" type="button" onClick={toggleFollow}>{isFollowing ? 'Following' : 'Follow'}</button>
              </div>
            </article>
          ) : null}
          {publicVisibility.showActivityFeed ? (
            <article className="card passport-insight-card">
              <h2><i className="fa-solid fa-bolt" /> Activity</h2>
              <ul>
                {activityItems.map((item) => (
                  <li key={item.id}><i className={item.icon} /> {item.text} - {item.time}</li>
                ))}
                {activityItems.length === 0 ? (
                  <li><i className="fa-solid fa-bolt" /> Belum ada aktivitas yang bisa ditampilkan.</li>
                ) : null}
              </ul>
            </article>
          ) : null}
          {publicVisibility.showHostLocations ? (
            <article className="card passport-insight-card">
              <h2><i className="fa-solid fa-location-dot" /> Host Locations</h2>
              <ul>
                {locations.slice(0, 5).map((loc, idx) => (
                  <li key={`${loc}-${idx}`}><i className="fa-solid fa-map-pin" /> {loc}</li>
                ))}
                {locations.length === 0 ? <li><i className="fa-solid fa-map-pin" /> FitLab Studio</li> : null}
              </ul>
            </article>
          ) : null}
        </section>
      ) : null}

      {canShowEventsSection ? (
        <section className="card" id="public-events">
          <h2><i className="fa-solid fa-calendar-days" /> Events</h2>
          <p className="sub">{isCreatorProfile ? 'See you in my event.' : 'Mau join event yang sama?'}</p>
          {canShowUpcomingEvents && canShowHistoryEvents ? (
            <div className="landing-tabs">
              <button
                type="button"
                className={`landing-tab ${eventsTab === 'upcoming' ? 'active' : ''}`}
                onClick={() => setEventsTab('upcoming')}
              >
                {isCreatorProfile ? 'My Upcoming Events' : 'Upcoming Events'}
              </button>
              <button
                type="button"
                className={`landing-tab ${eventsTab === 'history' ? 'active' : ''}`}
                onClick={() => setEventsTab('history')}
              >
                {isCreatorProfile ? 'My Event History' : 'History Events'}
              </button>
            </div>
          ) : null}
          {loading ? <p className="sub">Loading events...</p> : null}
          {canShowUpcomingEvents && eventsTab === 'upcoming' ? (
            <div>
              {isCreatorProfile ? (
                <div className="passport-carousel-head">
                  <p className="sub">Swipe atau gunakan tombol untuk lihat event lainnya.</p>
                  <div className="passport-carousel-arrows">
                    <button type="button" className="btn ghost small" onClick={() => scrollUpcomingCarousel('prev')}>
                      <i className="fa-solid fa-chevron-left" />
                    </button>
                    <button type="button" className="btn ghost small" onClick={() => scrollUpcomingCarousel('next')}>
                      <i className="fa-solid fa-chevron-right" />
                    </button>
                  </div>
                </div>
              ) : null}
              <div
                ref={isCreatorProfile ? upcomingCarouselRef : null}
                className={isCreatorProfile ? 'passport-live-carousel' : 'passport-live-grid'}
              >
              {upcoming.map((item) => (
                <article key={item.event_id} className="passport-live-card">
                  <img className="passport-live-image" src={eventVisual(item.event_id)} alt={item.event_name || 'Event'} />
                  <div className="passport-live-head">
                    <span className="passport-live-badge"><i className="fa-solid fa-fire" /> Live Soon</span>
                    <span className="passport-live-vertical">{guessVertical(item)}</span>
                  </div>
                  <h3>{item.event_name || '-'}</h3>
                  <p className="passport-live-time"><i className="fa-regular fa-clock" /> {formatDateTime(item.start_at)}</p>
                  <Link className="btn ghost small" to={`/a/${encodeURIComponent(item.account_slug || account)}/e/${encodeURIComponent(item.event_id)}`}>
                    Join Event
                  </Link>
                </article>
              ))}
              {upcoming.length === 0 ? <p className="sub">Belum ada upcoming events.</p> : null}
              </div>
            </div>
          ) : null}
          {canShowHistoryEvents && eventsTab === 'history' ? (
            <div className="passport-live-grid">
              {history.map((item) => (
                <article key={item.event_id} className="passport-live-card">
                  <img className="passport-live-image" src={eventVisual(item.event_id)} alt={item.event_name || 'Event'} />
                  <div className="passport-live-head">
                    <span className="passport-live-badge joined"><i className="fa-solid fa-circle-check" /> Joined</span>
                    <span className="passport-live-vertical">{guessVertical(item)}</span>
                  </div>
                  <h3>{item.event_name || '-'}</h3>
                  <p className="passport-live-time"><i className="fa-regular fa-clock" /> {formatDateTime(item.start_at)}</p>
                </article>
              ))}
              {history.length === 0 ? <p className="sub">Belum ada history events.</p> : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {showContactPanel ? (
        <section className="card">
          <h2><i className="fa-solid fa-phone-volume" /> Contact</h2>
          <div className="hero-actions">
            <button className="btn" type="button" onClick={() => contactCreator('book')}>Book Private Session</button>
            <button className="btn ghost" type="button" onClick={() => contactCreator('request')}>Request Event</button>
            <button className="btn ghost" type="button" onClick={() => contactCreator('contact')}>Contact Creator</button>
          </div>
        </section>
      ) : null}

    </main>
  );
}
