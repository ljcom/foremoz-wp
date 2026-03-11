import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiJson } from '../lib.js';

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

const verticalTabs = ['Active', 'Learning', 'Performance', 'Tourism'];

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
  const text = `${eventItem?.event_name || ''} ${eventItem?.location || ''}`.toLowerCase();
  if (text.includes('learn') || text.includes('english') || text.includes('class') || text.includes('workshop')) return 'Learning';
  if (text.includes('tour') || text.includes('trip') || text.includes('travel')) return 'Tourism';
  if (text.includes('run') || text.includes('performance') || text.includes('marathon')) return 'Performance';
  return 'Active';
}

function deriveCapabilities(events) {
  const set = new Set();
  events.forEach((item) => {
    const vertical = guessVertical(item);
    if (vertical === 'Active') set.add('Fitness Coaching');
    if (vertical === 'Learning') set.add('Workshop Instructor');
    if (vertical === 'Performance') set.add('Performance Coach');
    if (vertical === 'Tourism') set.add('Experience Host');
  });
  if (set.size === 0) {
    set.add('Coach');
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
  const [activeVertical, setActiveVertical] = useState('Active');
  const [publicVisibility, setPublicVisibility] = useState(() => normalizePublicVisibility({}));
  const [tenantScope, setTenantScope] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadPassport() {
      try {
        setLoading(true);
        const result = await apiJson(`/v1/public/passport?account=${encodeURIComponent(account)}`);
        if (!mounted) return;
        setProfile(result.profile || null);
        setPublicVisibility(normalizePublicVisibility(result.visibility || {}));
        setTenantScope(result.tenant_id || null);
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
      } catch {
        if (!mounted) return;
        setProfile(null);
        setPublicVisibility(normalizePublicVisibility({}));
        setTenantScope(null);
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

  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">Foremoz Passport</div>
        <nav>
          <Link to="/events">Events</Link>
          <Link to="/passport/signin">Sign in</Link>
        </nav>
      </header>

      <section className="card passport-public-head">
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
            <span>Events created: {stats.events_created}</span>
            <span>Events attended: {stats.events_attended}</span>
            <span>Tenant: {tenantScope || '-'}</span>
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
          <h2>Passport Private</h2>
          <p className="sub">Pemilik passport belum mengizinkan publish ke halaman public.</p>
        </section>
      ) : null}

      {publicVisibility.allowPublicPublish ? (
        <section className="ops-grid">
          {publicVisibility.showRolesCapabilities ? (
            <article className="card">
              <h2>Roles / Capabilities</h2>
              <ul>
                {capabilities.map((item, idx) => (
                  <li key={`${item}-${idx}`}>{item}</li>
                ))}
              </ul>
            </article>
          ) : null}
          {publicVisibility.showProgramsProducts ? (
            <article className="card">
              <h2>Programs / Products</h2>
              <ul>
                {programs.map((item, idx) => (
                  <li key={`${item}-${idx}`}>{item}</li>
                ))}
                {programs.length === 0 ? <li>Belum ada program tersedia.</li> : null}
              </ul>
            </article>
          ) : null}
        </section>
      ) : null}

      {publicVisibility.allowPublicPublish && publicVisibility.showUpcomingEvents ? (
        <section className="card">
          <h2>Upcoming Events</h2>
          {loading ? <p className="sub">Loading events...</p> : null}
          <div className="entity-list">
            {upcoming.map((item) => (
              <div key={item.event_id} className="entity-row">
                <div>
                  <strong>{item.event_name || '-'}</strong>
                  <p>{formatDateTime(item.start_at)}</p>
                </div>
                <Link className="btn ghost small" to={`/events/register?event=${encodeURIComponent(item.event_id)}`}>
                  Join Event
                </Link>
              </div>
            ))}
            {upcoming.length === 0 ? <p className="sub">Belum ada upcoming events.</p> : null}
          </div>
        </section>
      ) : null}

      {publicVisibility.allowPublicPublish && publicVisibility.showPastEvents ? (
        <section className="card">
          <h2>Past Events</h2>
          <div className="entity-list">
            {history.map((item) => (
              <div key={item.event_id} className="entity-row">
                <div>
                  <strong>{item.event_name || '-'}</strong>
                  <p>{formatDateTime(item.start_at)}</p>
                </div>
              </div>
            ))}
            {history.length === 0 ? <p className="sub">Belum ada history events.</p> : null}
          </div>
        </section>
      ) : null}

      {publicVisibility.allowPublicPublish && (publicVisibility.showAchievements || publicVisibility.showCommunity) ? (
        <section className="ops-grid">
          {publicVisibility.showAchievements ? (
            <article className="card">
              <h2>Reputation / Achievements</h2>
              <div className="passport-badge-list">
                <span className="passport-chip">Milestones: {Number(profile?.performance_milestone_count || 0)}</span>
                <span className="passport-chip">Coach relations: {Number(profile?.coach_relation_count || 0)}</span>
                <span className="passport-chip">Studio relations: {Number(profile?.studio_relation_count || 0)}</span>
              </div>
            </article>
          ) : null}
          {publicVisibility.showCommunity ? (
            <article className="card">
              <h2>Community / Followers</h2>
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
              <h2>Activity Feed</h2>
              <ul>
                <li>{name} hosted HIIT training yesterday</li>
                <li>{name} joined Marathon Workshop</li>
                <li>{name} announced new event on {activeVertical}</li>
              </ul>
            </article>
          ) : null}
          {publicVisibility.showHostLocations ? (
            <article className="card">
              <h2>Regular Host Locations</h2>
              <ul>
                {locations.slice(0, 5).map((loc, idx) => (
                  <li key={`${loc}-${idx}`}>{loc}</li>
                ))}
                {locations.length === 0 ? <li>FitLab Studio</li> : null}
              </ul>
            </article>
          ) : null}
        </section>
      ) : null}

      {publicVisibility.allowPublicPublish && publicVisibility.showContactBooking ? (
        <section className="card">
          <h2>Contact / Booking</h2>
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
