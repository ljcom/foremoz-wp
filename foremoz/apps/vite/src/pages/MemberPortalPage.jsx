import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiJson, clearSession, getSession, setSession } from '../lib.js';

function formatPortalDate(value) {
  const time = new Date(value || '').getTime();
  if (!Number.isFinite(time) || Number.isNaN(time)) return '-';
  return new Date(time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function MemberPortalPage() {
  const navigate = useNavigate();
  const { account } = useParams();
  const session = getSession();
  const [tab, setTab] = useState('overview');
  const [feedback, setFeedback] = useState('');
  const [profile, setProfile] = useState({
    fullName: session?.user?.fullName || '',
    email: session?.user?.email || '',
    phone: session?.user?.phone || ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [photoName, setPhotoName] = useState(session?.user?.photoName || '');
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [myEvents, setMyEvents] = useState([]);
  const [myEventsLoading, setMyEventsLoading] = useState(false);
  const [myEventsError, setMyEventsError] = useState('');
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [ptBalances, setPtBalances] = useState([]);
  const [portalLoading, setPortalLoading] = useState(false);
  const accountSlug = account || session?.tenant?.account_slug || 'tn_001';
  const memberEmail = String(session?.user?.email || '').trim().toLowerCase();
  const memberId = String(session?.user?.memberId || '').trim();

  const orderedMyEvents = useMemo(() => {
    return [...myEvents].sort((a, b) => new Date(b.start_at || 0).getTime() - new Date(a.start_at || 0).getTime());
  }, [myEvents]);
  const orderedPayments = useMemo(
    () => [...payments].sort((a, b) => new Date(b.recorded_at || 0).getTime() - new Date(a.recorded_at || 0).getTime()),
    [payments]
  );
  const orderedBookings = useMemo(
    () => [...bookings].sort((a, b) => new Date(b.booked_at || 0).getTime() - new Date(a.booked_at || 0).getTime()),
    [bookings]
  );
  const activeSubscription = useMemo(
    () =>
      [...subscriptions].sort((a, b) => new Date(b.end_date || 0).getTime() - new Date(a.end_date || 0).getTime())[0] || null,
    [subscriptions]
  );
  const latestPtBalance = useMemo(
    () =>
      [...ptBalances].sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())[0] || null,
    [ptBalances]
  );
  const totalRemainingPtSessions = useMemo(
    () => ptBalances.reduce((sum, item) => sum + Number(item?.remaining_sessions || 0), 0),
    [ptBalances]
  );
  const pendingPayments = useMemo(
    () => orderedPayments.filter((item) => String(item?.status || '').toLowerCase() === 'pending'),
    [orderedPayments]
  );

  useEffect(
    () => () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    },
    [photoPreviewUrl]
  );

  useEffect(() => {
    let active = true;
    async function loadPortalData() {
      if (!memberEmail && !memberId) {
        if (!active) return;
        setMyEvents([]);
        setPayments([]);
        setBookings([]);
        setSubscriptions([]);
        setPtBalances([]);
        return;
      }
      try {
        setMyEventsLoading(true);
        setPortalLoading(true);
        setMyEventsError('');
        await apiJson('/v1/projections/run', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: session?.tenant?.id || 'tn_001',
            branch_id: session?.branch?.id || null
          })
        }).catch(() => {});
        const [registrationRes, eventRes, paymentRes, bookingRes, subscriptionRes, ptBalanceRes] = await Promise.all([
          apiJson(`/v1/read/event-registrations?email=${encodeURIComponent(memberEmail)}&passport_id=${encodeURIComponent(memberId)}&limit=400`),
          apiJson('/v1/read/events?status=all&limit=400'),
          apiJson(
            `/v1/read/payments/history?tenant_id=${encodeURIComponent(session?.tenant?.id || 'tn_001')}&member_id=${encodeURIComponent(memberId)}`
          ).catch(() => ({ rows: [] })),
          apiJson(
            `/v1/read/bookings?tenant_id=${encodeURIComponent(session?.tenant?.id || 'tn_001')}&member_id=${encodeURIComponent(memberId)}`
          ).catch(() => ({ rows: [] })),
          apiJson(
            `/v1/read/subscriptions/active?tenant_id=${encodeURIComponent(session?.tenant?.id || 'tn_001')}&member_id=${encodeURIComponent(memberId)}`
          ).catch(() => ({ rows: [] })),
          apiJson(
            `/v1/read/pt-balance?tenant_id=${encodeURIComponent(session?.tenant?.id || 'tn_001')}&member_id=${encodeURIComponent(memberId)}`
          ).catch(() => ({ rows: [] }))
        ]);
        const joinedIds = new Set(
          (Array.isArray(registrationRes?.event_ids) ? registrationRes.event_ids : []).map((id) => String(id))
        );
        const rows = Array.isArray(eventRes?.rows) ? eventRes.rows : [];
        const items = rows.filter((row) => joinedIds.has(String(row?.event_id || '')));
        if (!active) return;
        setMyEvents(items);
        setPayments(Array.isArray(paymentRes?.rows) ? paymentRes.rows : []);
        setBookings(Array.isArray(bookingRes?.rows) ? bookingRes.rows : []);
        setSubscriptions(Array.isArray(subscriptionRes?.rows) ? subscriptionRes.rows : []);
        setPtBalances(Array.isArray(ptBalanceRes?.rows) ? ptBalanceRes.rows : []);
      } catch (error) {
        if (!active) return;
        setMyEvents([]);
        setPayments([]);
        setBookings([]);
        setSubscriptions([]);
        setPtBalances([]);
        setMyEventsError(error.message || 'Gagal memuat My Events.');
      } finally {
        if (active) {
          setMyEventsLoading(false);
          setPortalLoading(false);
        }
      }
    }
    loadPortalData();
    return () => {
      active = false;
    };
  }, [memberEmail, memberId, session?.tenant?.id, session?.branch?.id]);

  return (
    <main className="dashboard">
      <header className="dash-head card">
        <div>
          <p className="eyebrow">Member Portal</p>
          <h1>{session?.user?.fullName || 'Member'}</h1>
          <p>{session?.user?.email || '-'}</p>
        </div>
        <div className="meta">
          <button className="btn ghost" onClick={() => navigate(`/a/${accountSlug}`)}>
            Jump to account page
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              clearSession();
              navigate(`/a/${accountSlug}/member/signin`, { replace: true });
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="landing-section">
        <div className="landing-tabs">
          <button className={`landing-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
            Overview
          </button>
          <button className={`landing-tab ${tab === 'my_events' ? 'active' : ''}`} onClick={() => setTab('my_events')}>
            My Events
          </button>
          <button className={`landing-tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
            Change profile
          </button>
          <button className={`landing-tab ${tab === 'password' ? 'active' : ''}`} onClick={() => setTab('password')}>
            Change password
          </button>
          <button className={`landing-tab ${tab === 'photo' ? 'active' : ''}`} onClick={() => setTab('photo')}>
            Upload foto
          </button>
        </div>

        <article className="card admin-main">
        {tab === 'overview' ? (
          <>
            <p className="eyebrow">Overview</p>
            <h2>Portal member untuk aktivitas harian</h2>
            {portalLoading ? <p className="feedback">Loading portal status...</p> : null}
            <section className="stats-grid passport-stat-grid-fancy">
              <article className="stat">
                <p>Active subscription</p>
                <h3>{activeSubscription?.plan_id || '-'}</h3>
              </article>
              <article className="stat">
                <p>PT remaining</p>
                <h3>{totalRemainingPtSessions || 0}</h3>
              </article>
              <article className="stat">
                <p>My bookings</p>
                <h3>{orderedBookings.length}</h3>
              </article>
              <article className="stat">
                <p>Pending payments</p>
                <h3>{pendingPayments.length}</h3>
              </article>
            </section>
            <div className="ops-grid">
              <section className="card">
                <p className="eyebrow">Quick Actions</p>
                <div className="hero-actions">
                  <Link className="btn" to={`/a/${accountSlug}/events`}>Explore events</Link>
                  <Link className="btn ghost" to={`/a/${accountSlug}`}>Open public account</Link>
                  {memberId ? (
                    <Link className="btn ghost" to={`/a/${accountSlug}/members/${encodeURIComponent(memberId)}`}>
                      Open member ops
                    </Link>
                  ) : null}
                </div>
              </section>
              <section className="card">
                <p className="eyebrow">Operational Status</p>
                <p><strong>subscription_end:</strong> {activeSubscription?.end_date || '-'}</p>
                <p><strong>subscription_payment:</strong> {activeSubscription?.payment_id || '-'}</p>
                <p><strong>pt_package_id:</strong> {latestPtBalance?.pt_package_id || '-'}</p>
                <p><strong>pt_payment:</strong> {latestPtBalance?.payment_id || '-'}</p>
              </section>
            </div>
            <section className="card">
              <p className="eyebrow">Recent Activity</p>
              <div className="entity-list">
                {orderedPayments.slice(0, 3).map((item) => (
                  <div className="entity-row" key={item.payment_id}>
                    <div>
                      <strong>{item.payment_id}</strong>
                      <p>{item.reference_type || '-'}:{item.reference_id || '-'}</p>
                      <p>{formatPortalDate(item.recorded_at)}</p>
                    </div>
                    <span className={`status ${item.status}`}>{item.status || '-'}</span>
                  </div>
                ))}
                {orderedPayments.length === 0 ? <p className="sub">Belum ada aktivitas payment.</p> : null}
              </div>
            </section>
          </>
        ) : null}

        {tab === 'my_events' ? (
          <>
            <p className="eyebrow">My Events</p>
            <h2>Event yang sudah kamu join</h2>
            {myEventsLoading ? <p className="feedback">Loading my events...</p> : null}
            {myEventsError ? <p className="feedback">{myEventsError}</p> : null}
            <div className="passport-live-grid">
              {orderedMyEvents.map((event) => (
                <article className="passport-live-card" key={event.event_id}>
                  <img
                    className="passport-live-image"
                    src={event.image_url || `https://picsum.photos/seed/member-portal-${encodeURIComponent(event.event_id || 'event')}/720/420`}
                    alt={event.event_name || 'Event'}
                  />
                  <div className="passport-live-head">
                    <span className="passport-live-badge">{String(event.status || '-').toUpperCase()}</span>
                    <span className="passport-live-badge joined">Joined</span>
                  </div>
                  <h3>{event.event_name || 'Untitled Event'}</h3>
                  <p className="passport-live-time">
                    Mulai {event.start_at ? new Date(event.start_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                  </p>
                  <p className="passport-live-host">{event.location || '-'}</p>
                  <Link
                    className="btn ghost small"
                    to={event.account_slug
                      ? `/a/${encodeURIComponent(event.account_slug)}/e/${encodeURIComponent(event.event_id)}`
                      : `/e/${encodeURIComponent(event.event_id)}`}
                  >
                    Open event
                  </Link>
                </article>
              ))}
              {!myEventsLoading && orderedMyEvents.length === 0 ? (
                <article className="passport-live-card">
                  <h3>Belum ada event</h3>
                  <p className="passport-live-time">Event yang sudah kamu join akan muncul di sini.</p>
                </article>
              ) : null}
            </div>
            <div className="card" style={{ marginTop: '1rem' }}>
              <p className="eyebrow">My Bookings</p>
              <div className="entity-list">
                {orderedBookings.slice(0, 6).map((item) => (
                  <div className="entity-row" key={item.booking_id}>
                    <div>
                      <strong>{item.booking_id}</strong>
                      <p>{item.class_id || '-'} | {item.status || '-'}</p>
                      <p>{formatPortalDate(item.booked_at)}</p>
                    </div>
                    <span className="passport-chip">{item.payment_id || 'no payment link'}</span>
                  </div>
                ))}
                {orderedBookings.length === 0 ? <p className="sub">Belum ada booking class.</p> : null}
              </div>
            </div>
          </>
        ) : null}

        {tab === 'profile' ? (
          <>
            <p className="eyebrow">Profile</p>
            <h2>Change profile</h2>
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                const next = {
                  ...session,
                  user: {
                    ...session?.user,
                    fullName: profile.fullName,
                    email: profile.email,
                    phone: profile.phone,
                    photoName
                  }
                };
                setSession(next);
                setFeedback('member.profile.updated saved');
              }}
            >
              <label>
                Full name
                <input value={profile.fullName} onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))} />
              </label>
              <label>
                Email
                <input type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
              </label>
              <label>
                Phone
                <input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
              </label>
              <button className="btn" type="submit">Save profile</button>
            </form>
          </>
        ) : null}

        {tab === 'password' ? (
          <>
            <p className="eyebrow">Security</p>
            <h2>Change password</h2>
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword) {
                  setFeedback('password update failed: confirmation mismatch');
                  return;
                }
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setFeedback('member.password.changed saved');
              }}
            >
              <label>
                Current password
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                />
              </label>
              <button className="btn" type="submit">Update password</button>
            </form>
          </>
        ) : null}

        {tab === 'photo' ? (
          <>
            <p className="eyebrow">Photo</p>
            <h2>Upload foto</h2>
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!photoName) {
                  setFeedback('upload failed: choose file first');
                  return;
                }
                const next = {
                  ...session,
                  user: {
                    ...session?.user,
                    photoName
                  }
                };
                setSession(next);
                setFeedback(`member.photo.uploaded: ${photoName}`);
              }}
            >
              <label>
                Foto member
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
                    if (!file) {
                      setPhotoName('');
                      setPhotoPreviewUrl('');
                      return;
                    }
                    setPhotoName(file.name);
                    setPhotoPreviewUrl(URL.createObjectURL(file));
                  }}
                />
              </label>
              <div className="photo-preview-box">
                {photoPreviewUrl ? (
                  <img src={photoPreviewUrl} alt="Preview foto member" className="photo-preview-image" />
                ) : (
                  <p className="mini-note">Preview foto akan tampil di sini</p>
                )}
              </div>
              <p className="mini-note">{photoName ? `Selected: ${photoName}` : 'No file selected'}</p>
              <button className="btn" type="submit">Upload foto</button>
            </form>
          </>
        ) : null}

        {feedback ? <p className="feedback">{feedback}</p> : null}
      </article>
      </section>

      <footer className="dash-foot">
        <Link to={`/a/${accountSlug}`}>Back to account page</Link>
      </footer>
    </main>
  );
}
