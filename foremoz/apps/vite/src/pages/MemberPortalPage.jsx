import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiJson, clearSession, getSession, setSession } from '../lib.js';

export default function MemberPortalPage() {
  const navigate = useNavigate();
  const { account } = useParams();
  const session = getSession();
  const [tab, setTab] = useState('my_events');
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
  const accountSlug = account || session?.tenant?.account_slug || 'tn_001';
  const memberEmail = String(session?.user?.email || '').trim().toLowerCase();

  const orderedMyEvents = useMemo(() => {
    return [...myEvents].sort((a, b) => new Date(b.start_at || 0).getTime() - new Date(a.start_at || 0).getTime());
  }, [myEvents]);

  useEffect(
    () => () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    },
    [photoPreviewUrl]
  );

  useEffect(() => {
    let active = true;
    async function loadMyEvents() {
      if (!memberEmail) {
        if (!active) return;
        setMyEvents([]);
        return;
      }
      try {
        setMyEventsLoading(true);
        setMyEventsError('');
        const [registrationRes, eventRes] = await Promise.all([
          apiJson(`/v1/read/event-registrations?email=${encodeURIComponent(memberEmail)}&limit=400`),
          apiJson('/v1/read/events?status=all&limit=400')
        ]);
        const joinedIds = new Set(
          (Array.isArray(registrationRes?.event_ids) ? registrationRes.event_ids : []).map((id) => String(id))
        );
        const rows = Array.isArray(eventRes?.rows) ? eventRes.rows : [];
        const items = rows.filter((row) => joinedIds.has(String(row?.event_id || '')));
        if (!active) return;
        setMyEvents(items);
      } catch (error) {
        if (!active) return;
        setMyEvents([]);
        setMyEventsError(error.message || 'Gagal memuat My Events.');
      } finally {
        if (active) setMyEventsLoading(false);
      }
    }
    loadMyEvents();
    return () => {
      active = false;
    };
  }, [memberEmail]);

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
