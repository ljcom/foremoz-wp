import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { useI18n } from '../i18n.js';
import { apiJson } from '../lib.js';
import { clearPassportSession, getPassportSession, passportApiJson } from '../passport-client.js';
import PageStateCard from '../components/PageStateCard.jsx';
import { formatAppDateTime } from '../time.js';

function postStorageKey(passportId) {
  return `ff.passport.posts.${passportId || 'unknown'}`;
}

function profilePrefsKey(passportId) {
  return `ff.passport.profile-prefs.${passportId || 'unknown'}`;
}

function sectionPrefsKey(passportId) {
  return `ff.passport.section-prefs.${passportId || 'unknown'}`;
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

function normalizeSectionPrefs(raw) {
  const fallbackOrder = [
    'showUpcomingEvents',
    'showPastEvents',
    'showRolesCapabilities',
    'showProgramsProducts',
    'showAchievements',
    'showCommunity',
    'showActivityFeed',
    'showHostLocations',
    'showContactBooking',
    'showPassportStats'
  ];
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const ordered = Array.isArray(source.sectionOrder)
    ? source.sectionOrder.map((item) => String(item || '')).filter(Boolean)
    : [];
  const sectionOrder = [...new Set([...ordered, ...fallbackOrder])].filter(Boolean);
  return {
    sectionOrder,
    pinnedSection: sectionOrder.includes(String(source.pinnedSection || '')) ? String(source.pinnedSection || '') : sectionOrder[0],
    previewMode: String(source.previewMode || 'public') === 'private' ? 'private' : 'public'
  };
}

export default function PassportDashboardPage() {
  const { language } = useI18n();
  const copy = useMemo(() => (language === 'en'
    ? {
        loadError: 'Failed to load the passport dashboard.',
        missingSession: 'Passport session was not found.',
        pageEyebrow: 'Passport Dashboard',
        pageTitle: 'The passport dashboard could not be loaded',
        pageDescription: 'The passport data connection failed. Try again or return to the passport landing page.',
        retry: 'Try again',
        backToPassport: 'Back to passport',
        emptyStatus: 'No profile status yet.',
        context: 'Context',
        showAllContexts: 'Show all contexts',
        previewPublic: 'Preview Public',
        signOut: 'Sign out',
        joined: 'Joined',
        following: 'Following',
        plan: 'Plan',
        account: 'Account',
        interests: 'Interests',
        uploadPhoto: 'Upload profile photo',
        memberStatus: 'Member status',
        statusPlaceholder: 'Example: Focused on marathon prep',
        posts: 'Posts',
        wins: 'Wins',
        achievements: 'My Achievements',
        achievementFallback: 'Achievement',
        performanceUpdate: 'Performance update',
        noAchievements: 'No achievements to showcase yet.',
        upcomingEvents: 'Upcoming Events',
        upcomingBadge: 'Upcoming',
        eventHistory: 'Event History',
        joinedBadge: 'Joined',
        noUpcoming: 'No scheduled events yet.',
        noHistory: 'No event history yet.',
        settings: 'Settings (Public Visibility)',
        showPublic: 'Show to public',
        sectionLayout: 'Section Layout',
        previewMode: 'Preview mode',
        public: 'Public',
        private: 'Private',
        order: 'order',
        pinnedHero: 'Pinned hero section',
        standardSection: 'Standard section',
        visibleInPreview: 'visible in preview',
        hiddenInPreview: 'hidden in preview',
        up: 'Up',
        down: 'Down',
        pinned: 'Pinned',
        pin: 'Pin',
        publicPreviewOutline: 'Public Preview Outline',
        pinnedTop: 'Pinned at top of public narrative',
        shownOrdered: 'Shown in ordered section flow',
        publicPreview: 'public preview',
        privatePreview: 'private preview',
        hidden: 'hidden',
        openAccount: 'Open account',
        noneFollowing: 'No followed accounts yet.',
        partialData: 'Some data is still missing. Try refreshing again.',
        backToLanding: 'Back to landing'
      }
    : {
        loadError: 'Gagal memuat passport dashboard.',
        missingSession: 'Session passport tidak ditemukan.',
        pageEyebrow: 'Passport Dashboard',
        pageTitle: 'Dashboard passport belum bisa dimuat',
        pageDescription: 'Koneksi data passport gagal. Coba lagi atau kembali ke landing passport.',
        retry: 'Coba lagi',
        backToPassport: 'Back to passport',
        emptyStatus: 'Belum ada status profile.',
        context: 'Context',
        showAllContexts: 'Show all contexts',
        previewPublic: 'Preview Public',
        signOut: 'Sign out',
        joined: 'Joined',
        following: 'Following',
        plan: 'Plan',
        account: 'Account',
        interests: 'Interests',
        uploadPhoto: 'Upload foto diri',
        memberStatus: 'Status member',
        statusPlaceholder: 'Contoh: Lagi fokus marathon prep',
        posts: 'Posts',
        wins: 'Wins',
        achievements: 'My Achievements',
        achievementFallback: 'Achievement',
        performanceUpdate: 'Performance update',
        noAchievements: 'Belum ada pencapaian untuk dipamerkan.',
        upcomingEvents: 'Upcoming Events',
        upcomingBadge: 'Upcoming',
        eventHistory: 'Event History',
        joinedBadge: 'Joined',
        noUpcoming: 'Belum ada event terjadwal.',
        noHistory: 'Belum ada history event.',
        settings: 'Settings (Public Visibility)',
        showPublic: 'Tampilkan ke publik',
        sectionLayout: 'Section Layout',
        previewMode: 'Preview mode',
        public: 'Public',
        private: 'Private',
        order: 'order',
        pinnedHero: 'Pinned hero section',
        standardSection: 'Standard section',
        visibleInPreview: 'visible in preview',
        hiddenInPreview: 'hidden in preview',
        up: 'Up',
        down: 'Down',
        pinned: 'Pinned',
        pin: 'Pin',
        publicPreviewOutline: 'Public Preview Outline',
        pinnedTop: 'Pinned at top of public narrative',
        shownOrdered: 'Shown in ordered section flow',
        publicPreview: 'public preview',
        privatePreview: 'private preview',
        hidden: 'hidden',
        openAccount: 'Open account',
        noneFollowing: 'Belum ada akun yang di-follow.',
        partialData: 'Sebagian data belum tampil. Coba refresh lagi.',
        backToLanding: 'Back to landing'
      }), [language]);
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardQuery = useMemo(() => new URLSearchParams(location.search || ''), [location.search]);
  const accountFilter = String(dashboardQuery.get('account') || '').trim().toLowerCase();
  const showAllContextsHref = useMemo(() => {
    const next = new URLSearchParams(location.search || '');
    next.delete('account');
    const qs = next.toString();
    return `${location.pathname}${qs ? `?${qs}` : ''}`;
  }, [location.pathname, location.search]);
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
  const [dashboardTab, setDashboardTab] = useState('profile');
  const [statusInput, setStatusInput] = useState('');
  const [socialPosts, setSocialPosts] = useState([]);
  const [memberStatus, setMemberStatus] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState('');
  const [publicVisibility, setPublicVisibility] = useState(() => normalizePublicVisibility({}));
  const [publicVisibilityHydrated, setPublicVisibilityHydrated] = useState(false);
  const [sectionPrefs, setSectionPrefs] = useState(() => normalizeSectionPrefs({}));
  const [apiError, setApiError] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        setApiStatus('loading');
        setApiError('');
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
      } catch (error) {
        setApiError(error?.message || copy.loadError);
        setApiStatus('error');
      }
    }

    if (!passportId) {
      setApiError(copy.missingSession);
      setApiStatus('error');
      return;
    }
    load();
  }, [copy.loadError, copy.missingSession, passportId, reloadVersion, tenantId, session?.passport?.planCode]);

  const filteredJoinedEvents = useMemo(() => {
    if (!accountFilter) return joinedEvents;
    return joinedEvents.filter((event) => String(event?.account_slug || '').trim().toLowerCase() === accountFilter);
  }, [joinedEvents, accountFilter]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return [...filteredJoinedEvents]
      .filter((event) => new Date(event.start_at || '').getTime() >= now)
      .sort((a, b) => new Date(a.start_at || 0).getTime() - new Date(b.start_at || 0).getTime());
  }, [filteredJoinedEvents]);

  const pastEvents = useMemo(() => {
    const now = Date.now();
    return [...filteredJoinedEvents]
      .filter((event) => new Date(event.start_at || '').getTime() < now)
      .sort((a, b) => new Date(b.start_at || 0).getTime() - new Date(a.start_at || 0).getTime());
  }, [filteredJoinedEvents]);

  const followingItems = useMemo(() => {
    const seen = new Set();
    return filteredJoinedEvents
      .map((event) => {
        const account = String(event?.account_slug || '').trim();
        if (!account || seen.has(account)) return null;
        seen.add(account);
        return {
          account,
          organizer:
            String(event?.organizer_name || '').trim() ||
            String(event?.host_name || '').trim() ||
            String(event?.created_by_name || '').trim() ||
            'Organizer',
          location: String(event?.location || '').trim() || '-'
        };
      })
      .filter(Boolean);
  }, [filteredJoinedEvents]);

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
    try {
      const raw = JSON.parse(localStorage.getItem(sectionPrefsKey(passportId)) || '{}');
      setSectionPrefs(normalizeSectionPrefs(raw));
    } catch {
      setSectionPrefs(normalizeSectionPrefs({}));
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(sectionPrefsKey(passportId), JSON.stringify(sectionPrefs));
  }, [passportId, sectionPrefs]);

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
  const sessionAccountSlug = String(session?.tenant?.account_slug || '').trim().toLowerCase();
  const isGenericPassportTenant = sessionAccountSlug === 'tn_001' || sessionAccountSlug === 'ps_001';
  const publicAccount = accountFilter || (!isGenericPassportTenant ? sessionAccountSlug : '') || passportId || 'member';
  const publicPageSlug = String(profile?.passport_id || passportId || '').trim() || publicAccount;

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
    { key: 'showUpcomingEvents', label: copy.upcomingEvents, icon: 'fa-solid fa-calendar-days' },
    { key: 'showPastEvents', label: copy.eventHistory, icon: 'fa-solid fa-clock-rotate-left' },
    { key: 'showRolesCapabilities', label: 'Roles', icon: 'fa-solid fa-user-check' },
    { key: 'showProgramsProducts', label: 'Programs', icon: 'fa-solid fa-layer-group' },
    { key: 'showAchievements', label: 'Achievements', icon: 'fa-solid fa-medal' },
    { key: 'showCommunity', label: 'Community', icon: 'fa-solid fa-users' },
    { key: 'showActivityFeed', label: 'Activity', icon: 'fa-solid fa-bolt' },
    { key: 'showHostLocations', label: 'Locations', icon: 'fa-solid fa-location-dot' },
    { key: 'showContactBooking', label: 'Contact', icon: 'fa-solid fa-phone' },
    { key: 'showPassportStats', label: 'Stats', icon: 'fa-solid fa-chart-line' }
  ];
  const dashboardTabs = [
    { key: 'upcoming', label: copy.upcomingEvents, icon: 'fa-solid fa-calendar-days' },
    { key: 'history', label: copy.eventHistory, icon: 'fa-solid fa-clock-rotate-left' },
    { key: 'following', label: copy.following, icon: 'fa-solid fa-user-plus' },
    { key: 'profile', label: 'Profile', icon: 'fa-solid fa-id-card' },
    { key: 'settings', label: copy.settings, icon: 'fa-solid fa-sliders' }
  ];
  const visibilityMetaByKey = Object.fromEntries(visibilityOptions.map((item) => [item.key, item]));
  const orderedSectionPreview = sectionPrefs.sectionOrder.map((key) => {
    const meta = visibilityMetaByKey[key];
    if (!meta) return null;
    const isEnabled = Boolean(publicVisibility[key]);
    const isVisibleInMode =
      sectionPrefs.previewMode === 'private'
        ? true
        : publicVisibility.allowPublicPublish && isEnabled;
    return {
      key,
      label: meta.label,
      icon: meta.icon,
      isEnabled,
      isPinned: sectionPrefs.pinnedSection === key,
      isVisibleInMode
    };
  }).filter(Boolean);

  function moveSection(key, direction) {
    setSectionPrefs((prev) => {
      const nextOrder = [...prev.sectionOrder];
      const index = nextOrder.indexOf(key);
      if (index < 0) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= nextOrder.length) return prev;
      const temp = nextOrder[index];
      nextOrder[index] = nextOrder[targetIndex];
      nextOrder[targetIndex] = temp;
      return { ...prev, sectionOrder: nextOrder };
    });
  }

  if (apiStatus === 'loading' && !profile) {
    return (
      <main className="dashboard passport-fancy-dashboard" aria-busy="true">
        <div className="passport-bg-orbs" aria-hidden="true" />
        <header className="dash-head card passport-hero-card page-skeleton-card">
          <div className="page-skeleton-stack" style={{ flex: 1 }}>
            <div className="page-skeleton-line page-skeleton-title" />
            <div className="page-skeleton-line page-skeleton-line-md" />
          </div>
          <div className="page-skeleton-actions">
            <div className="page-skeleton-button" />
            <div className="page-skeleton-button page-skeleton-button-sm" />
          </div>
        </header>

        <section className="card passport-context-strip page-skeleton-card">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="page-skeleton-pill" />
          ))}
        </section>

        <section className="card passport-panel-fancy page-skeleton-card">
          <div className="page-skeleton-tabs">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="page-skeleton-tab" />
            ))}
          </div>
        </section>

        <section className="card passport-profile-card page-skeleton-card">
          <div className="page-skeleton-profile">
            <div className="page-skeleton-avatar" />
            <div className="page-skeleton-stack" style={{ flex: 1 }}>
              <div className="page-skeleton-line page-skeleton-line-lg" />
              <div className="page-skeleton-line page-skeleton-line-md" />
              <div className="page-skeleton-line page-skeleton-line-sm" />
            </div>
          </div>
        </section>

        <section className="stats-grid passport-stat-grid-fancy">
          {[1, 2, 3, 4].map((item) => (
            <article key={item} className="stat page-skeleton-card">
              <div className="page-skeleton-line page-skeleton-line-sm" />
              <div className="page-skeleton-line page-skeleton-line-md" />
            </article>
          ))}
        </section>
      </main>
    );
  }

  if (apiStatus === 'error' && !profile) {
    return (
      <PageStateCard
        shellClassName="dashboard passport-fancy-dashboard"
        withBackdrop
        eyebrow={copy.pageEyebrow}
        title={copy.pageTitle}
        description={copy.pageDescription}
        actions={[
          { label: copy.retry, onClick: () => setReloadVersion((value) => value + 1) },
          { label: copy.backToPassport, to: authBase, variant: 'ghost' }
        ]}
      >
        {apiError ? <p className="error">{apiError}</p> : null}
      </PageStateCard>
    );
  }

  return (
    <main className="dashboard passport-fancy-dashboard">
      <div className="passport-bg-orbs" aria-hidden="true" />
      <header className="dash-head card passport-hero-card">
        <div>
          <h1>{displayName}</h1>
          <p>{memberStatus || copy.emptyStatus}</p>
          {accountFilter ? (
            <p className="sub">
              {copy.context}: <Link to={`/a/${encodeURIComponent(accountFilter)}`}>@{accountFilter}</Link>{' '}
              <Link to={showAllContextsHref}>{copy.showAllContexts}</Link>
            </p>
          ) : null}
        </div>
        <div className="meta">
          <LanguageSwitcher compact />
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.open(`/p/${encodeURIComponent(publicPageSlug)}`, '_blank', 'noopener,noreferrer');
              }
            }}
          >
            {copy.previewPublic}
          </button>
          <button className="btn ghost" onClick={logout}>{copy.signOut}</button>
        </div>
      </header>

      <section className="card passport-context-strip">
        <span className="passport-context-pill"><i className="fa-solid fa-ticket" /> {copy.joined}: {filteredJoinedEvents.length}</span>
        <span className="passport-context-pill"><i className="fa-solid fa-users" /> {copy.following}: {followingItems.length}</span>
        <span className="passport-context-pill"><i className="fa-solid fa-crown" /> {copy.plan}: {planCode}</span>
        {accountFilter ? <span className="passport-context-pill"><i className="fa-solid fa-location-dot" /> {copy.account}: @{accountFilter}</span> : null}
      </section>

      <section className="card passport-panel-fancy">
        <div className="landing-tabs passport-dash-tabbar" style={{ marginBottom: 0 }}>
          {dashboardTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`landing-tab passport-dash-tab ${dashboardTab === tab.key ? 'active' : ''}`}
              onClick={() => setDashboardTab(tab.key)}
            >
              <i className={tab.icon} /> {tab.label}
            </button>
          ))}
        </div>
      </section>

      {dashboardTab === 'profile' ? (
        <>
          <section className="card passport-profile-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
              <div className="passport-avatar-shell">
                {avatarDataUrl ? (
                  <img src={avatarDataUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  initials
                )}
              </div>
              <div>
                <h2 style={{ margin: 0 }}>{displayName}</h2>
                <p className="sub">Passport ID: {passportId || '-'}</p>
                <p className="sub">{copy.interests}: {(profile?.sport_interests || []).join(', ') || '-'}</p>
                <label className="sub" style={{ display: 'block', marginTop: '0.5rem' }}>
                  {copy.uploadPhoto}
                  <input type="file" accept="image/*" onChange={onAvatarUpload} />
                </label>
                <label className="sub" style={{ display: 'block', marginTop: '0.5rem' }}>
                  {copy.memberStatus}
                  <input
                    value={memberStatus}
                    onChange={(event) => setMemberStatus(event.target.value)}
                    placeholder={copy.statusPlaceholder}
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
              <h3>{filteredJoinedEvents.length}</h3>
            </article>
            <article className="stat">
              <p><i className="fa-solid fa-camera-retro" /> {copy.posts}</p>
              <h3>{socialPosts.length}</h3>
            </article>
            <article className="stat">
              <p><i className="fa-solid fa-trophy" /> {copy.wins}</p>
              <h3>{performance.length}</h3>
            </article>
          </section>

          <section className="card passport-panel-fancy">
            <p className="eyebrow"><i className="fa-solid fa-medal" /> {copy.achievements}</p>
            <div className="entity-list">
              {(performance || []).slice(0, 12).map((row) => (
                <div key={row.log_id || row.recorded_at} className="entity-row">
                  <div>
                    <strong><i className="fa-solid fa-award" /> {row.metric_name || copy.achievementFallback}</strong>
                    <p>{row.metric_value || '-'}</p>
                    <p>{row.note || copy.performanceUpdate}</p>
                  </div>
                </div>
              ))}
              {performance.length === 0 ? <p className="sub">{copy.noAchievements}</p> : null}
            </div>
          </section>
        </>
      ) : null}

      {dashboardTab === 'upcoming' ? (
        <section className="card passport-panel-fancy">
          <p className="eyebrow"><i className="fa-solid fa-calendar-days" /> {copy.upcomingEvents}</p>
          <div className="passport-live-grid">
            {upcomingEvents.map((row) => (
              <article key={row.event_id} className="passport-live-card">
                <img className="passport-live-image" src={eventVisual(row.event_id)} alt={row.event_name || 'Event'} />
                <div className="passport-live-head">
                  <span className="passport-live-badge"><i className="fa-solid fa-calendar-days" /> {copy.upcomingBadge}</span>
                </div>
                <h3>{row.event_name || '-'}</h3>
                <p className="passport-live-time"><i className="fa-regular fa-clock" /> {formatAppDateTime(row.start_at)}</p>
                <p className="passport-live-participant"><i className="fa-solid fa-stopwatch" /> {Number(row.duration_minutes || 60)} min</p>
              </article>
            ))}
            {upcomingEvents.length === 0 ? <p className="sub">{copy.noUpcoming}</p> : null}
          </div>
        </section>
      ) : null}

      {dashboardTab === 'history' ? (
        <section className="card passport-panel-fancy">
          <p className="eyebrow"><i className="fa-solid fa-clock-rotate-left" /> {copy.eventHistory}</p>
          <div className="passport-live-grid">
            {pastEvents.map((row) => (
              <article key={row.event_id} className="passport-live-card">
                <img className="passport-live-image" src={eventVisual(row.event_id)} alt={row.event_name || 'Event'} />
                <div className="passport-live-head">
                  <span className="passport-live-badge joined"><i className="fa-solid fa-circle-check" /> {copy.joinedBadge}</span>
                  {eventScoresByEventId[String(row.event_id || '')]?.rank !== null && eventScoresByEventId[String(row.event_id || '')]?.rank !== undefined ? (
                    <span className="passport-live-badge"><i className="fa-solid fa-trophy" /> #{eventScoresByEventId[String(row.event_id || '')].rank}</span>
                  ) : null}
                </div>
                <h3>{row.event_name || '-'}</h3>
                <p className="passport-live-time"><i className="fa-regular fa-clock" /> {formatAppDateTime(row.start_at)}</p>
                <p className="passport-live-participant"><i className="fa-solid fa-star" /> {Number(eventScoresByEventId[String(row.event_id || '')]?.score_points || 0)} pts</p>
              </article>
            ))}
            {pastEvents.length === 0 ? <p className="sub">{copy.noHistory}</p> : null}
          </div>
        </section>
      ) : null}

      {dashboardTab === 'settings' ? (
        <section className="card passport-panel-fancy">
          <p className="eyebrow"><i className="fa-solid fa-globe" /> {copy.settings}</p>
          <label className="passport-toggle">
            <input
              type="checkbox"
              checked={publicVisibility.allowPublicPublish}
              onChange={(event) =>
                setPublicVisibility((prev) => ({ ...prev, allowPublicPublish: event.target.checked }))
              }
            />
            <span><i className="fa-solid fa-earth-asia" /> {copy.showPublic}</span>
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
          <div className="card" style={{ marginTop: '1rem', borderStyle: 'dashed' }}>
            <p className="eyebrow"><i className="fa-solid fa-wand-magic-sparkles" /> {copy.sectionLayout}</p>
            <label className="passport-toggle" style={{ marginBottom: '0.75rem' }}>
              <span><i className="fa-solid fa-eye" /> {copy.previewMode}</span>
              <select
                value={sectionPrefs.previewMode}
                onChange={(event) =>
                  setSectionPrefs((prev) => ({ ...prev, previewMode: event.target.value === 'private' ? 'private' : 'public' }))
                }
              >
                <option value="public">{copy.public}</option>
                <option value="private">{copy.private}</option>
              </select>
            </label>
            <div className="entity-list">
              {orderedSectionPreview.map((item, index) => (
                <div key={item.key} className="entity-row">
                  <div>
                    <strong><i className={item.icon} /> {item.label}</strong>
                    <p>
                      {copy.order} #{index + 1} | {item.isPinned ? copy.pinnedHero : copy.standardSection} | {item.isVisibleInMode ? copy.visibleInPreview : copy.hiddenInPreview}
                    </p>
                  </div>
                  <div className="row-actions">
                    <button className="btn ghost small" type="button" onClick={() => moveSection(item.key, 'up')}>
                      {copy.up}
                    </button>
                    <button className="btn ghost small" type="button" onClick={() => moveSection(item.key, 'down')}>
                      {copy.down}
                    </button>
                    <button
                      className={`btn ghost small ${item.isPinned ? 'active' : ''}`}
                      type="button"
                      onClick={() => setSectionPrefs((prev) => ({ ...prev, pinnedSection: item.key }))}
                    >
                      {item.isPinned ? copy.pinned : copy.pin}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ marginTop: '1rem', borderStyle: 'dashed' }}>
            <p className="eyebrow"><i className="fa-solid fa-panorama" /> {copy.publicPreviewOutline}</p>
            <div className="entity-list">
              {orderedSectionPreview.map((item) => (
                <div
                  key={`preview-${item.key}`}
                  className={`entity-row ${item.isPinned ? 'passport-preview-row-pinned' : ''}`}
                  style={{
                    opacity: item.isVisibleInMode ? 1 : 0.55
                  }}
                >
                  <div>
                    <strong><i className={item.icon} /> {item.label}</strong>
                    <p>{item.isPinned ? copy.pinnedTop : copy.shownOrdered}</p>
                  </div>
                  <span className="passport-chip">
                    {item.isVisibleInMode ? (sectionPrefs.previewMode === 'public' ? copy.publicPreview : copy.privatePreview) : copy.hidden}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {dashboardTab === 'following' ? (
        <section className="card passport-panel-fancy">
          <p className="eyebrow"><i className="fa-solid fa-user-plus" /> Following</p>
          <div className="entity-list">
            {followingItems.map((item) => (
              <div key={item.account} className="entity-row">
                <div>
                  <strong>{item.organizer}</strong>
                  <p>@{item.account}</p>
                  <p>{item.location}</p>
                </div>
                <Link className="btn ghost small" to={`/a/${encodeURIComponent(item.account)}`}>
                  {copy.openAccount}
                </Link>
              </div>
            ))}
            {followingItems.length === 0 ? <p className="sub">{copy.noneFollowing}</p> : null}
          </div>
        </section>
      ) : null}

      <footer className="dash-foot">
        {apiStatus === 'error' ? <p className="mini-note">{copy.partialData}</p> : null}
        <Link to={authBase}>{copy.backToLanding}</Link>
      </footer>
    </main>
  );
}
