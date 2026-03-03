import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { clearSession, getSession, setSession } from '../lib.js';

export default function MemberPortalPage() {
  const navigate = useNavigate();
  const { account } = useParams();
  const session = getSession();
  const [tab, setTab] = useState('membership');
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

  return (
    <main className="dashboard">
      <header className="dash-head card">
        <div>
          <p className="eyebrow">Member Portal</p>
          <h1>{session?.user?.fullName || 'Member'}</h1>
          <p>{session?.user?.email || '-'}</p>
        </div>
        <div className="meta">
          <code>role: member</code>
          <code>{session?.tenant?.namespace || '-'}</code>
          <button className="btn ghost" onClick={() => navigate(`/a/${account || session?.tenant?.account_slug || 'tn_001'}`)}>
            Jump to account page
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              clearSession();
              navigate(`/a/${account || 'tn_001'}/member/signin`, { replace: true });
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar card">
          <button className={`side-item ${tab === 'membership' ? 'active' : ''}`} onClick={() => setTab('membership')}>
            Buy membership
          </button>
          <button className={`side-item ${tab === 'pt_booking' ? 'active' : ''}`} onClick={() => setTab('pt_booking')}>
            Self booking PT
          </button>
          <button className={`side-item ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
            Change profile
          </button>
          <button className={`side-item ${tab === 'password' ? 'active' : ''}`} onClick={() => setTab('password')}>
            Change password
          </button>
          <button className={`side-item ${tab === 'photo' ? 'active' : ''}`} onClick={() => setTab('photo')}>
            Upload foto
          </button>
        </aside>

        <article className="card admin-main">
          {tab === 'membership' ? (
            <>
              <p className="eyebrow">Membership</p>
              <h2>Buy membership package</h2>
              <div className="entity-list">
                <div className="entity-row"><div><strong>Monthly Unlimited</strong><p>30 days access</p></div><strong>IDR 650.000</strong></div>
                <div className="entity-row"><div><strong>Quarterly Plan</strong><p>90 days access</p></div><strong>IDR 1.800.000</strong></div>
              </div>
              <button className="btn" onClick={() => setFeedback('payment.recorded queued for membership purchase')}>
                Buy selected package
              </button>
            </>
          ) : null}

          {tab === 'pt_booking' ? (
            <>
              <p className="eyebrow">PT Booking</p>
              <h2>Self booking PT</h2>
              <div className="entity-list">
                <div className="entity-row"><div><strong>Coach Raka</strong><p>HIIT / Strength</p></div><strong>08 Mar 2026 18:00</strong></div>
                <div className="entity-row"><div><strong>Coach Dini</strong><p>Mobility / Recovery</p></div><strong>09 Mar 2026 16:00</strong></div>
              </div>
              <button className="btn" onClick={() => setFeedback('pt.session.booked queued from member portal')}>
                Book PT session
              </button>
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
                    onChange={(e) => setPhotoName(e.target.files?.[0]?.name || '')}
                  />
                </label>
                <p className="mini-note">{photoName ? `Selected: ${photoName}` : 'No file selected'}</p>
                <button className="btn" type="submit">Upload foto</button>
              </form>
            </>
          ) : null}

          {feedback ? <p className="feedback">{feedback}</p> : null}
        </article>
      </section>

      <footer className="dash-foot">
        <Link to={`/a/${account || session?.tenant?.account_slug || 'tn_001'}`}>Back to account page</Link>
      </footer>
    </main>
  );
}
