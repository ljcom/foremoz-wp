import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiJson } from '../lib.js';
import { clearPassportSession, getPassportSession, passportApiJson } from '../passport-client.js';

function formatEventDate(value) {
  const time = new Date(value || '').getTime();
  if (!Number.isFinite(time) || Number.isNaN(time)) return '-';
  return new Date(time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function postStorageKey(passportId) {
  return `ff.passport.posts.${passportId || 'unknown'}`;
}

function profilePrefsKey(passportId) {
  return `ff.passport.profile-prefs.${passportId || 'unknown'}`;
}

function eventVisual(eventId) {
  return `https://picsum.photos/seed/passport-event-${encodeURIComponent(String(eventId || 'x'))}/720/420`;
}

function feedIcon(type) {
  if (type === 'achievement') return 'fa-solid fa-trophy';
  if (type === 'event') return 'fa-solid fa-calendar-check';
  return 'fa-solid fa-sparkles';
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

export default function PassportDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const authBase = location.pathname.startsWith('/passport') ? '/passport' : '/events';
  const session = getPassportSession();
  const tenantId = session?.tenant?.id || 'ps_001';
  const passportId = session?.passport?.id || session?.user?.userId || '';
  const [apiStatus, setApiStatus] = useState('loading');
  const [subscriptions, setSubscriptions] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [consents, setConsents] = useState([]);
  const [profile, setProfile] = useState(null);
  const [planCode, setPlanCode] = useState('free');
  const [joinedEvents, setJoinedEvents] = useState([]);
  const [eventScoresByEventId, setEventScoresByEventId] = useState({});
  const [eventTab, setEventTab] = useState('upcoming');
  const [statusInput, setStatusInput] = useState('');
  const [socialPosts, setSocialPosts] = useState([]);
  const [memberStatus, setMemberStatus] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState('');
  const [publicVisibility, setPublicVisibility] = useState(() => normalizePublicVisibility({}));
  const [publicVisibilityHydrated, setPublicVisibilityHydrated] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setApiStatus('loading');
        await passportApiJson('/v1/projections/run', {
          method: 'POST',
          body: JSON.stringify({ tenant_id: tenantId })
        });
        const publicAccount = session?.tenant?.account_slug || session?.tenant?.id || passportId || 'member';
        const [profileRes, subsRes, perfRes, consentRes, planRes, registrationRes, eventRes, scoreRes, visibilityRes] = await Promise.all([
          passportApiJson(`/v1/passport/profile?tenant_id=${encodeURIComponent(tenantId)}&passport_id=${encodeURIComponent(passportId)}`),
          passportApiJson(`/v1/read/subscriptions?tenant_id=${encodeURIComponent(tenantId)}`),
          passportApiJson(`/v1/read/performance?tenant_id=${encodeURIComponent(tenantId)}`),
          passportApiJson(`/v1/read/consents?tenant_id=${encodeURIComponent(tenantId)}`),
          passportApiJson(`/v1/read/passport-plan?tenant_id=${encodeURIComponent(tenantId)}`).catch(() => ({ items: [] })),
          apiJson(
            `/v1/read/event-registrations?passport_id=${encodeURIComponent(passportId)}&email=${encodeURIComponent(
              String(session?.user?.email || '')
            )}&limit=400`
          ).catch(() => ({ event_ids: [] })),
          apiJson('/v1/read/events?status=all&limit=400').catch(() => ({ rows: [] })),
          apiJson(
            `/v1/read/passport-event-scores?passport_id=${encodeURIComponent(passportId)}&email=${encodeURIComponent(
              String(session?.user?.email || '')
            )}&limit=400`
          ).catch(() => ({ rows: [] })),
          apiJson(
            `/v1/passport/public-visibility?tenant_id=${encodeURIComponent(tenantId)}&passport_id=${encodeURIComponent(
              passportId
            )}&account=${encodeURIComponent(publicAccount)}`
          ).catch(() => ({ visibility: normalizePublicVisibility({}) }))
        ]);
        const profileItem = profileRes.item || null;
        setProfile(profileItem);
        setSubscriptions((subsRes.items || []).filter((item) => item.passport_id === passportId));
        setPerformance((perfRes.items || []).filter((item) => item.passport_id === passportId));
        setConsents((consentRes.items || []).filter((item) => item.passport_id === passportId));
        const planItem = (planRes.items || []).find((item) => item.passport_id === passportId);
        setPlanCode(planItem?.plan_code || session?.passport?.planCode || 'free');
        const joinedEventIds = Array.isArray(registrationRes.event_ids) ? registrationRes.event_ids.map((v) => String(v)) : [];
        const rows = Array.isArray(eventRes.rows) ? eventRes.rows : [];
        const joinedRows = rows.filter((item) => joinedEventIds.includes(String(item.event_id || '')));
        setJoinedEvents(joinedRows);
        const scoreRows = Array.isArray(scoreRes.rows) ? scoreRes.rows : [];
        const scoreMap = Object.fromEntries(
          scoreRows.map((item) => [
            String(item?.event_id || ''),
            {
              rank: item?.rank ?? null,
              score_points: Number(item?.score_points || 0),
              checked_out_at: item?.checked_out_at || null
            }
          ])
        );
        setEventScoresByEventId(scoreMap);
        setPublicVisibility(normalizePublicVisibility(visibilityRes?.visibility || {}));
        setPublicVisibilityHydrated(true);
        setApiStatus('ok');
      } catch {
        setApiStatus('error');
      }
    }

    if (!passportId) {
      setApiStatus('error');
      return;
    }
    load();
  }, [passportId, tenantId, session?.passport?.planCode]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return [...joinedEvents]
      .filter((event) => new Date(event.start_at || '').getTime() >= now)
      .sort((a, b) => new Date(a.start_at || 0).getTime() - new Date(b.start_at || 0).getTime());
  }, [joinedEvents]);

  const pastEvents = useMemo(() => {
    const now = Date.now();
    return [...joinedEvents]
      .filter((event) => new Date(event.start_at || '').getTime() < now)
      .sort((a, b) => new Date(b.start_at || 0).getTime() - new Date(a.start_at || 0).getTime());
  }, [joinedEvents]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = JSON.parse(localStorage.getItem(postStorageKey(passportId)) || '[]');
      setSocialPosts(Array.isArray(raw) ? raw : []);
    } catch {
      setSocialPosts([]);
    }
  }, [passportId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(postStorageKey(passportId), JSON.stringify(socialPosts));
  }, [passportId, socialPosts]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = JSON.parse(localStorage.getItem(profilePrefsKey(passportId)) || '{}');
      const prefs = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
      setMemberStatus(String(prefs.member_status || ''));
      setAvatarDataUrl(String(prefs.avatar_data_url || ''));
    } catch {
      setMemberStatus('');
      setAvatarDataUrl('');
    }
  }, [passportId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      profilePrefsKey(passportId),
      JSON.stringify({ member_status: memberStatus, avatar_data_url: avatarDataUrl })
    );
  }, [passportId, memberStatus, avatarDataUrl]);

  const feedItems = useMemo(() => {
    const postFeed = socialPosts.map((item) => ({
      feed_id: item.post_id,
      type: 'status',
      created_at: item.created_at,
      title: item.text,
      subtitle: 'Status update'
    }));
    const eventFeed = pastEvents.slice(0, 20).map((event) => ({
      feed_id: `evt-${event.event_id}`,
      type: 'event',
      created_at: event.start_at,
      title: `Selesai mengikuti ${event.event_name || 'event'}`,
      subtitle: `${Number(event.duration_minutes || 60)} menit`
    }));
    const perfFeed = performance.slice(0, 20).map((row) => ({
      feed_id: `perf-${row.log_id || row.recorded_at || Math.random().toString(36).slice(2)}`,
      type: 'achievement',
      created_at: row.recorded_at || row.created_at || new Date().toISOString(),
      title: `${row.metric_name || 'Performance'}: ${row.metric_value || '-'}`,
      subtitle: row.note || 'Pencapaian baru'
    }));
    return [...postFeed, ...eventFeed, ...perfFeed].sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  }, [socialPosts, pastEvents, performance]);

  function logout() {
    clearPassportSession();
    navigate(`${authBase}/signin`, { replace: true });
  }

  function postStatus() {
    const text = statusInput.trim();
    if (!text) return;
    setSocialPosts((prev) => [
      {
        post_id: `post_${Date.now()}`,
        text,
        created_at: new Date().toISOString()
      },
      ...prev
    ]);
    setStatusInput('');
  }

  function onAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setAvatarDataUrl(result);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  const displayName = profile?.full_name || session?.user?.fullName || 'Member';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'M';
  const publicAccount = session?.tenant?.account_slug || session?.tenant?.id || passportId || 'member';

  useEffect(() => {
    if (!publicVisibilityHydrated || !tenantId || (!passportId && !publicAccount)) return;
    apiJson('/v1/passport/public-visibility', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: tenantId,
        passport_id: passportId || null,
        account: publicAccount,
        visibility: publicVisibility
      })
    }).catch(() => {});
  }, [publicVisibilityHydrated, tenantId, passportId, publicAccount, publicVisibility]);

  const visibilityOptions = [
    { key: 'showUpcomingEvents', label: 'Upcoming Events', icon: 'fa-solid fa-calendar-days' },
    { key: 'showPastEvents', label: 'Event History', icon: 'fa-solid fa-clock-rotate-left' },
    { key: 'showRolesCapabilities', label: 'Roles', icon: 'fa-solid fa-user-check' },
    { key: 'showProgramsProducts', label: 'Programs', icon: 'fa-solid fa-layer-group' },
    { key: 'showAchievements', label: 'Achievements', icon: 'fa-solid fa-medal' },
    { key: 'showCommunity', label: 'Community', icon: 'fa-solid fa-users' },
    { key: 'showActivityFeed', label: 'Activity', icon: 'fa-solid fa-bolt' },
    { key: 'showHostLocations', label: 'Locations', icon: 'fa-solid fa-location-dot' },
    { key: 'showContactBooking', label: 'Contact', icon: 'fa-solid fa-phone' },
    { key: 'showPassportStats', label: 'Stats', icon: 'fa-solid fa-chart-line' }
  ];

  return (
    <main className="dashboard passport-fancy-dashboard">
      <div className="passport-bg-orbs" aria-hidden="true" />
      <header className="dash-head card passport-hero-card">
        <div>
          <h1>{displayName}</h1>
          <p>{memberStatus || 'Belum ada status profile.'}</p>
        </div>
        <div className="meta">
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.open(`/p/${encodeURIComponent(publicAccount)}`, '_blank', 'noopener,noreferrer');
              }
            }}
          >
            Preview Public
          </button>
          <button className="btn ghost" onClick={logout}>Sign out</button>
        </div>
      </header>

      <section className="card passport-profile-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '999px',
              background: 'linear-gradient(180deg,#ffdcb8,#ffbe87)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7b3f1a',
              fontWeight: 800,
              overflow: 'hidden'
            }}
          >
            {avatarDataUrl ? (
              <img
                src={avatarDataUrl}
                alt={displayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              initials
            )}
          </div>
          <div>
            <h2 style={{ margin: 0 }}>{displayName}</h2>
            <p className="sub">Passport ID: {passportId || '-'}</p>
            <p className="sub">Interests: {(profile?.sport_interests || []).join(', ') || '-'}</p>
            <label className="sub" style={{ display: 'block', marginTop: '0.5rem' }}>
              Upload foto diri
              <input type="file" accept="image/*" onChange={onAvatarUpload} />
            </label>
            <label className="sub" style={{ display: 'block', marginTop: '0.5rem' }}>
              Status member
              <input
                value={memberStatus}
                onChange={(event) => setMemberStatus(event.target.value)}
                placeholder="Contoh: Lagi fokus marathon prep"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="stats-grid passport-stat-grid-fancy">
        <article className="stat">
          <p><i className="fa-solid fa-crown" /> Plan</p>
          <h3>{planCode}</h3>
        </article>
        <article className="stat">
          <p><i className="fa-solid fa-ticket" /> Joined</p>
          <h3>{joinedEvents.length}</h3>
        </article>
        <article className="stat">
          <p><i className="fa-solid fa-camera-retro" /> Posts</p>
          <h3>{socialPosts.length}</h3>
        </article>
        <article className="stat">
          <p><i className="fa-solid fa-trophy" /> Wins</p>
          <h3>{performance.length}</h3>
        </article>
      </section>

      <section className="card passport-panel-fancy">
        <p className="eyebrow"><i className="fa-solid fa-globe" /> Public Page</p>
        <label className="passport-toggle">
          <input
            type="checkbox"
            checked={publicVisibility.allowPublicPublish}
            onChange={(event) =>
              setPublicVisibility((prev) => ({ ...prev, allowPublicPublish: event.target.checked }))
            }
          />
          <span><i className="fa-solid fa-earth-asia" /> Tampilkan ke publik</span>
        </label>
        <div className="passport-toggle-grid">
          {visibilityOptions.map((item) => (
            <label className="passport-toggle" key={item.key}>
              <input
                type="checkbox"
                checked={Boolean(publicVisibility[item.key])}
                disabled={!publicVisibility.allowPublicPublish}
                onChange={(event) =>
                  setPublicVisibility((prev) => ({ ...prev, [item.key]: event.target.checked }))
                }
              />
              <span><i className={item.icon} /> {item.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="card passport-panel-fancy">
        <p className="eyebrow"><i className="fa-solid fa-pen-nib" /> New Post</p>
        <textarea
          rows={3}
          placeholder="Lagi latihan apa hari ini? Share status kamu..."
          value={statusInput}
          onChange={(event) => setStatusInput(event.target.value)}
        />
        <div className="hero-actions">
          <button className="btn" type="button" onClick={postStatus}>
            Post Status
          </button>
        </div>
      </section>

      <section className="card passport-panel-fancy">
        <div className="landing-tabs" style={{ marginBottom: '0.8rem' }}>
          <button
            type="button"
            className={`landing-tab ${eventTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setEventTab('upcoming')}
          >
            Upcoming Events
          </button>
          <button
            type="button"
            className={`landing-tab ${eventTab === 'history' ? 'active' : ''}`}
            onClick={() => setEventTab('history')}
          >
            Event History
          </button>
        </div>
        {eventTab === 'upcoming' ? (
          <div className="passport-live-grid">
            {upcomingEvents.map((row) => (
              <article key={row.event_id} className="passport-live-card">
                <img className="passport-live-image" src={eventVisual(row.event_id)} alt={row.event_name || 'Event'} />
                <div className="passport-live-head">
                  <span className="passport-live-badge"><i className="fa-solid fa-calendar-days" /> Upcoming</span>
                </div>
                <h3>{row.event_name || '-'}</h3>
                <p className="passport-live-time"><i className="fa-regular fa-clock" /> {formatEventDate(row.start_at)}</p>
                <p className="passport-live-participant"><i className="fa-solid fa-stopwatch" /> {Number(row.duration_minutes || 60)} min</p>
              </article>
            ))}
            {upcomingEvents.length === 0 ? <p className="sub">Belum ada event terjadwal.</p> : null}
          </div>
        ) : (
          <div className="passport-live-grid">
            {pastEvents.map((row) => (
              <article key={row.event_id} className="passport-live-card">
                <img className="passport-live-image" src={eventVisual(row.event_id)} alt={row.event_name || 'Event'} />
                <div className="passport-live-head">
                  <span className="passport-live-badge joined"><i className="fa-solid fa-circle-check" /> Joined</span>
                  {eventScoresByEventId[String(row.event_id || '')]?.rank !== null && eventScoresByEventId[String(row.event_id || '')]?.rank !== undefined ? (
                    <span className="passport-live-badge"><i className="fa-solid fa-trophy" /> #{eventScoresByEventId[String(row.event_id || '')].rank}</span>
                  ) : null}
                </div>
                <h3>{row.event_name || '-'}</h3>
                <p className="passport-live-time"><i className="fa-regular fa-clock" /> {formatEventDate(row.start_at)}</p>
                <p className="passport-live-participant"><i className="fa-solid fa-star" /> {Number(eventScoresByEventId[String(row.event_id || '')]?.score_points || 0)} pts</p>
              </article>
            ))}
            {pastEvents.length === 0 ? <p className="sub">Belum ada history event.</p> : null}
          </div>
        )}
      </section>

      <section className="ops-grid passport-ops-fancy">
        <article className="card">
          <h2><i className="fa-solid fa-bolt" /> Activity</h2>
          <div className="entity-list">
            {feedItems.slice(0, 25).map((item) => (
              <div key={item.feed_id} className="entity-row">
                <div>
                  <strong><i className={feedIcon(item.type)} /> {item.title}</strong>
                  <p>{item.subtitle}</p>
                  <p>{formatEventDate(item.created_at)}</p>
                </div>
              </div>
            ))}
            {feedItems.length === 0 ? <p className="sub">Belum ada aktivitas.</p> : null}
          </div>
        </article>
        <article className="card">
          <h2><i className="fa-solid fa-medal" /> Showcase</h2>
          <div className="entity-list">
            {(performance || []).slice(0, 8).map((row) => (
              <div key={row.log_id || row.recorded_at} className="entity-row">
                <div>
                  <strong><i className="fa-solid fa-award" /> {row.metric_name || 'Achievement'}</strong>
                  <p>{row.metric_value || '-'}</p>
                  <p>{row.note || 'Performance update'}</p>
                </div>
              </div>
            ))}
            {performance.length === 0 ? <p className="sub">Belum ada pencapaian untuk dipamerkan.</p> : null}
          </div>
        </article>
      </section>

      <footer className="dash-foot">
        {apiStatus === 'error' ? <p className="mini-note">Sebagian data belum tampil. Coba refresh lagi.</p> : null}
        <Link to={authBase}>Back to landing</Link>
      </footer>
    </main>
  );
}
