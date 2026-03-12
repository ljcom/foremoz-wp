import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiJson } from '../lib.js';
import { getVerticalConfig, getVerticalLabel, guessVerticalSlugByEventText, listVerticalConfigs } from '../industry-jargon.js';

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

const verticalTabs = listVerticalConfigs().map((item) => item.label);

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
  const slug = guessVerticalSlugByEventText(eventItem, 'active');
  return getVerticalLabel(slug, 'Active');
}

function deriveCapabilities(events) {
  const set = new Set();
  events.forEach((item) => {
    const verticalSlug = guessVerticalSlugByEventText(item, 'active');
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
  const [stats, setStats] = useState({
    events_created: 0,
    events_attended: 0,
    cities_active: 1,
    collaborations: 0
  });
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [activeVertical, setActiveVertical] = useState('Active');
  const [publicVisibility, setPublicVisibility] = useState(() => normalizePublicVisibility({}));

  useEffect(() => {
    let mounted = true;
    async function loadPassport() {
      try {
        setLoading(true);
        setNotFound(false);
        const result = await apiJson(`/v1/public/passport?account=${encodeURIComponent(account)}`);
        if (!mounted) return;
        const profileItem = result.profile || null;
        setProfile(profileItem);
        setPublicVisibility(normalizePublicVisibility(result.visibility || {}));
        setEvents({
          upcoming: Array.isArray(result?.events?.upcoming) ? result.events.upcoming : [],
          past: Array.isArray(result?.events?.past) ? result.events.past : []
        });
        setStats({
          events_created: Number(result?.stats?.events_created || 0),
          events_attended: Number(result?.stats?.events_attended || 0),
          cities_active: Number(result?.stats?.cities_active || 1),
          collaborations: Number(result?.stats?.collaborations || 0)
        });
        setNotFound(!profileItem);
      } catch {
        if (!mounted) return;
        setProfile(null);
        setNotFound(true);
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
  }, [account]);

  const upcoming = useMemo(() => (Array.isArray(events?.upcoming) ? events.upcoming : []), [events]);
  const history = useMemo(() => (Array.isArray(events?.past) ? events.past : []), [events]);

  const name = String(profile?.full_name || '').trim() || titleFromAccount(account);
  const seed = hashInt(account);
  const mergedEvents = [...upcoming, ...history];
  const capabilities = deriveCapabilities(mergedEvents);
  const programs = derivePrograms(mergedEvents);
  const locations = [...new Set(mergedEvents.map((item) => String(item.location || '').trim()).filter(Boolean))];
  const filteredUpcoming = useMemo(
    () => upcoming.filter((item) => guessVertical(item) === activeVertical),
    [upcoming, activeVertical]
  );
  const filteredHistory = useMemo(
    () => history.filter((item) => guessVertical(item) === activeVertical),
    [history, activeVertical]
  );

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

      <section className="card passport-glance-strip">
        <div className="passport-glance-item"><i className="fa-solid fa-bolt" /><span>Active</span></div>
        <div className="passport-glance-item"><i className="fa-solid fa-compass" /><span>Explore</span></div>
        <div className="passport-glance-item"><i className="fa-solid fa-trophy" /><span>Progress</span></div>
        <div className="passport-glance-item"><i className="fa-solid fa-users" /><span>Community</span></div>
      </section>

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
            <button className="btn" type="button">Follow</button>
          </div>
          <div className="passport-public-stats">
            <span><i className="fa-solid fa-bolt" /> {stats.events_created} Hosted</span>
            <span><i className="fa-solid fa-ticket" /> {stats.events_attended} Joined</span>
            <span><i className="fa-solid fa-heart" /> {(seed % 1500) + 120} Followers</span>
          </div>
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Vertical</p>
        <div className="landing-tabs">
          {verticalTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`landing-tab ${activeVertical === tab ? 'active' : ''}`}
              onClick={() => setActiveVertical(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {!publicVisibility.allowPublicPublish ? (
        <section className="card">
          <h2><i className="fa-solid fa-lock" /> Private Profile</h2>
          <p className="sub">Halaman ini belum dibuka untuk publik.</p>
        </section>
      ) : null}

      {publicVisibility.allowPublicPublish ? (
        <section className="ops-grid">
          {publicVisibility.showRolesCapabilities ? (
            <article className="card">
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
            <article className="card">
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
        </section>
      ) : null}

      {publicVisibility.allowPublicPublish && publicVisibility.showUpcomingEvents ? (
        <section className="card">
          <h2><i className="fa-solid fa-calendar-days" /> Upcoming Events</h2>
          {loading ? <p className="sub">Loading events...</p> : null}
          <div className="passport-live-grid">
            {filteredUpcoming.map((item) => (
              <article key={item.event_id} className="passport-live-card">
                <img className="passport-live-image" src={eventVisual(item.event_id)} alt={item.event_name || 'Event'} />
                <div className="passport-live-head">
                  <span className="passport-live-badge"><i className="fa-solid fa-fire" /> Live Soon</span>
                  <span className="passport-live-vertical">{guessVertical(item)}</span>
                </div>
                <h3>{item.event_name || '-'}</h3>
                <p className="passport-live-time"><i className="fa-regular fa-clock" /> {formatDateTime(item.start_at)}</p>
                <Link className="btn ghost small" to={`/a/${encodeURIComponent(account)}/e/${encodeURIComponent(item.event_id)}`}>
                  Join Event
                </Link>
              </article>
            ))}
            {filteredUpcoming.length === 0 ? <p className="sub">Belum ada upcoming events untuk vertical ini.</p> : null}
          </div>
        </section>
      ) : null}

      {publicVisibility.allowPublicPublish && publicVisibility.showPastEvents ? (
        <section className="card">
          <h2><i className="fa-solid fa-clock-rotate-left" /> Event History</h2>
          <div className="passport-live-grid">
            {filteredHistory.map((item) => (
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
            {filteredHistory.length === 0 ? <p className="sub">Belum ada history events untuk vertical ini.</p> : null}
          </div>
        </section>
      ) : null}

      {publicVisibility.allowPublicPublish && (publicVisibility.showAchievements || publicVisibility.showCommunity) ? (
        <section className="ops-grid">
          {publicVisibility.showAchievements ? (
            <article className="card">
              <h2><i className="fa-solid fa-trophy" /> Achievements</h2>
              <div className="passport-badge-list">
                <span className="passport-chip"><i className="fa-solid fa-flag-checkered" /> Milestones {Number(profile?.performance_milestone_count || 0)}</span>
                <span className="passport-chip"><i className="fa-solid fa-user-group" /> Coach {Number(profile?.coach_relation_count || 0)}</span>
                <span className="passport-chip"><i className="fa-solid fa-building" /> Studio {Number(profile?.studio_relation_count || 0)}</span>
              </div>
            </article>
          ) : null}
          {publicVisibility.showCommunity ? (
            <article className="card">
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
              <button className="btn" type="button">Follow</button>
            </article>
          ) : null}
        </section>
      ) : null}

      {publicVisibility.allowPublicPublish && (publicVisibility.showActivityFeed || publicVisibility.showHostLocations) ? (
        <section className="ops-grid">
          {publicVisibility.showActivityFeed ? (
            <article className="card">
              <h2><i className="fa-solid fa-bolt" /> Activity</h2>
              <ul>
                <li><i className="fa-solid fa-calendar-check" /> {name} hosted HIIT training</li>
                <li><i className="fa-solid fa-shoe-prints" /> {name} joined Marathon Workshop</li>
                <li><i className="fa-solid fa-bullhorn" /> {name} posted a new event on {activeVertical}</li>
              </ul>
            </article>
          ) : null}
          {publicVisibility.showHostLocations ? (
            <article className="card">
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

      {publicVisibility.allowPublicPublish && publicVisibility.showContactBooking ? (
        <section className="card">
          <h2><i className="fa-solid fa-phone-volume" /> Contact</h2>
          <div className="hero-actions">
            <button className="btn" type="button">Book Private Session</button>
            <button className="btn ghost" type="button">Request Event</button>
            <button className="btn ghost" type="button">Contact Creator</button>
          </div>
        </section>
      ) : null}

      {publicVisibility.allowPublicPublish && publicVisibility.showPassportStats ? (
        <section className="stats-grid">
          <article className="stat">
            <p>Events created</p>
            <h3>{stats.events_created}</h3>
          </article>
          <article className="stat">
            <p>Events attended</p>
            <h3>{stats.events_attended}</h3>
          </article>
          <article className="stat">
            <p>Cities active</p>
            <h3>{Math.max(1, Number(stats.cities_active || locations.length || 1))}</h3>
          </article>
          <article className="stat">
            <p>Collaborations</p>
            <h3>{Number(stats.collaborations || 0)}</h3>
          </article>
        </section>
      ) : null}
    </main>
  );
}
