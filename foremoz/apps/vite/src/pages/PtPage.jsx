import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiJson, clearSession, getAccountSlug, getAllowedEnvironments, getEnvironmentLabel, getSession, setSession } from '../lib.js';
import WorkspaceHeader from '../components/WorkspaceHeader.jsx';
import {
  formatAppDateTime,
  getAppDateKey,
  getAppNowDateTimeInput,
  toAppIsoFromDateTimeInput
} from '../time.js';

function Stat({ label, value, iconClass, tone, hint }) {
  return (
    <article className={`stat ${tone}`}>
      <div className="stat-top">
        <p>{label}</p>
        <span className="stat-icon" aria-hidden="true">
          <i className={iconClass} />
        </span>
      </div>
      <div className="stat-value-row">
        <h3>{value}</h3>
        <small>{hint}</small>
      </div>
    </article>
  );
}

function parseCustomFieldsInput(raw, label) {
  const source = String(raw || '').trim();
  if (!source) return {};
  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`${label} custom_fields harus object JSON.`);
    }
    return parsed;
  } catch {
    throw new Error(`${label} custom_fields tidak valid (format JSON object).`);
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}

function sentenceCase(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function PtPage() {
  const PT_TABS = [
    { id: 'profile', label: 'Coach profile' },
    { id: 'book', label: 'Book session' },
    { id: 'complete', label: 'Complete session' },
    { id: 'member', label: 'Member' },
    { id: 'history', label: 'History sessions' }
  ];
  const navigate = useNavigate();
  const session = getSession();
  const accountSlug = getAccountSlug(session);
  const role = String(session?.role || 'pt').toLowerCase();
  const tenantId = session?.tenant?.id || 'tn_001';
  const branchId = session?.branch?.id || 'core';
  const trainerId = session?.user?.userId || null;
  const [targetEnv, setTargetEnv] = useState('pt');
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileAiWorking, setProfileAiWorking] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const profileImageInputRef = useRef(null);
  const [profileForm, setProfileForm] = useState({
    full_name: session?.user?.fullName || '',
    photo_url: ''
  });
  const [ptBalances, setPtBalances] = useState([]);
  const [ptActivityRows, setPtActivityRows] = useState([]);
  const [bookForm, setBookForm] = useState({
    pt_package_id: '',
    member_id: '',
    session_at: getAppNowDateTimeInput(),
    activity_note: '',
    custom_fields_text: ''
  });
  const [completeForm, setCompleteForm] = useState({
    pt_package_id: '',
    member_id: '',
    session_id: '',
    completed_at: getAppNowDateTimeInput(),
    activity_note: '',
    custom_fields_text: ''
  });
  const [activityForm, setActivityForm] = useState({
    pt_package_id: '',
    member_id: '',
    session_at: getAppNowDateTimeInput(),
    activity_note: '',
    custom_fields_text: ''
  });
  const allowedEnv = useMemo(() => {
    return getAllowedEnvironments(session, role);
  }, [session, role]);

  useEffect(() => {
    if (allowedEnv.length === 0) return;
    if (!allowedEnv.includes(targetEnv)) {
      setTargetEnv(allowedEnv[0]);
    }
  }, [allowedEnv, targetEnv]);
  const insightStats = useMemo(() => {
    const uniqueMembers = new Set(ptBalances.map((item) => String(item.member_id || '').trim()).filter(Boolean)).size;
    const remainingSessions = ptBalances.reduce((sum, row) => sum + Number(row.remaining_sessions || 0), 0);
    const today = getAppDateKey(new Date().toISOString());
    const todaySessions = ptActivityRows.filter((row) => getAppDateKey(row.session_at) === today).length;
    return [
      {
        label: 'active member',
        value: uniqueMembers,
        iconClass: 'fa-solid fa-user-group',
        tone: 'tone-subscription',
        hint: 'member assigned to this PT'
      },
      {
        label: 'remaining session',
        value: remainingSessions,
        iconClass: 'fa-solid fa-dumbbell',
        tone: 'tone-booking',
        hint: 'across active PT package'
      },
      {
        label: 'today activity',
        value: todaySessions,
        iconClass: 'fa-solid fa-calendar-day',
        tone: 'tone-checkin',
        hint: 'booked, completed, and log'
      }
    ];
  }, [ptBalances, ptActivityRows]);
  const memberRows = useMemo(() => {
    const grouped = new Map();
    ptBalances.forEach((row) => {
      const memberId = String(row.member_id || '').trim();
      if (!memberId) return;
      const current = grouped.get(memberId) || {
        member_id: memberId,
        package_count: 0,
        total_sessions: 0,
        consumed_sessions: 0,
        remaining_sessions: 0,
        latest_updated_at: ''
      };
      current.package_count += 1;
      current.total_sessions += Number(row.total_sessions || 0);
      current.consumed_sessions += Number(row.consumed_sessions || 0);
      current.remaining_sessions += Number(row.remaining_sessions || 0);
      const updatedAt = String(row.updated_at || row.last_session_at || '').trim();
      if (updatedAt && (!current.latest_updated_at || updatedAt > current.latest_updated_at)) {
        current.latest_updated_at = updatedAt;
      }
      grouped.set(memberId, current);
    });
    return [...grouped.values()].sort((a, b) => a.member_id.localeCompare(b.member_id));
  }, [ptBalances]);

  function buildCoachImageKeywords() {
    const cityToken = String(session?.tenant?.city || '').trim().split(/[,\s]+/)[0] || 'Indonesia';
    const accountToken = String(accountSlug || '').replace(/[-_]+/g, ' ').trim();
    const keywords = [
      `${String(profileForm.full_name || '').trim()} coach portrait`.trim(),
      `${String(profileForm.full_name || '').trim()} personal trainer`.trim(),
      `${accountToken} coach ${cityToken}`.trim(),
      `${sentenceCase(role)} fitness portrait ${cityToken}`.trim()
    ]
      .map((item) => String(item || '').replace(/\s+/g, ' ').trim())
      .filter((item) => item.length >= 3);
    return [...new Set(keywords)];
  }

  async function fetchPexelsPhotos(keyword, perPage = 4) {
    const query = String(keyword || '').trim() || 'fitness coach portrait';
    const result = await apiJson(
      `/v1/ai/pexels/search?tenant_id=${encodeURIComponent(tenantId)}&query=${encodeURIComponent(query)}&per_page=${encodeURIComponent(perPage)}`
    );
    return Array.isArray(result.rows) ? result.rows : [];
  }

  async function loadPtWorkspace() {
    try {
      setLoading(true);
      setError('');
      await apiJson('/v1/projections/run', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId
        })
      }).catch(() => {});
      const trainerFilter = trainerId ? `&trainer_id=${encodeURIComponent(trainerId)}` : '';
      const [profileRes, balanceRes, activityRes] = await Promise.all([
        apiJson(`/v1/pt/profile?tenant_id=${encodeURIComponent(tenantId)}&user_id=${encodeURIComponent(trainerId || '')}`).catch(() => ({ row: null })),
        apiJson(`/v1/read/pt-balance?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}${trainerFilter}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/read/pt-activity?tenant_id=${encodeURIComponent(tenantId)}${trainerFilter}`).catch(() => ({ rows: [] }))
      ]);
      const profileRow = profileRes?.row || null;
      if (profileRow) {
        setProfileForm({
          full_name: String(profileRow.full_name || session?.user?.fullName || ''),
          photo_url: String(profileRow.photo_url || '')
        });
      }
      const balances = Array.isArray(balanceRes.rows) ? balanceRes.rows : [];
      setPtBalances(balances);
      setPtActivityRows(Array.isArray(activityRes.rows) ? activityRes.rows : []);

      if (balances.length > 0) {
        const first = balances[0];
        setBookForm((prev) => ({
          ...prev,
          pt_package_id: prev.pt_package_id || String(first.pt_package_id || ''),
          member_id: prev.member_id || String(first.member_id || '')
        }));
        setCompleteForm((prev) => ({
          ...prev,
          pt_package_id: prev.pt_package_id || String(first.pt_package_id || ''),
          member_id: prev.member_id || String(first.member_id || '')
        }));
        setActivityForm((prev) => ({
          ...prev,
          pt_package_id: prev.pt_package_id || String(first.pt_package_id || ''),
          member_id: prev.member_id || String(first.member_id || '')
        }));
      }
    } catch (err) {
      setError(err.message || 'failed to load PT workspace');
    } finally {
      setLoading(false);
    }
  }

  function goToEnv(env) {
    if (!allowedEnv.includes(env)) return;
    if (env === 'admin') {
      navigate(`/a/${accountSlug}/admin/dashboard`);
      return;
    }
    if (env === 'sales') {
      navigate(`/a/${accountSlug}/sales/dashboard`);
      return;
    }
    if (env === 'pt') {
      navigate(`/a/${accountSlug}/pt/dashboard`);
      return;
    }
    navigate(`/a/${accountSlug}/cs/dashboard`);
  }

  function signOut() {
    clearSession();
    navigate(`/a/${accountSlug}`, { replace: true });
  }

  async function submitProfile(e) {
    e.preventDefault();
    const fullName = String(profileForm.full_name || '').trim();
    const photoUrl = String(profileForm.photo_url || '').trim();
    if (!fullName) {
      setFeedback('Nama coach wajib diisi.');
      return;
    }
    try {
      setProfileSaving(true);
      setFeedback('');
      const result = await apiJson('/v1/pt/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: trainerId,
          full_name: fullName,
          photo_url: photoUrl || null
        })
      });
      const row = result?.row || null;
      const nextSession = {
        ...(session || {}),
        user: {
          ...(session?.user || {}),
          userId: trainerId,
          fullName: String(row?.full_name || fullName),
          photoUrl: String(row?.photo_url || photoUrl || '')
        }
      };
      setSession(nextSession);
      setProfileForm({
        full_name: String(row?.full_name || fullName),
        photo_url: String(row?.photo_url || photoUrl || '')
      });
      setFeedback('Profil coach berhasil disimpan.');
    } catch (err) {
      setFeedback(err.message || 'Gagal menyimpan profil coach.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function onProfileImageUpload(event) {
    try {
      const file = event.target.files?.[0] || null;
      if (!file) return;
      if (!String(file.type || '').startsWith('image/')) {
        throw new Error('File harus berupa gambar.');
      }
      const maxBytes = 5 * 1024 * 1024;
      if (Number(file.size || 0) > maxBytes) {
        throw new Error('Ukuran gambar maksimal 5MB.');
      }
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl) {
        throw new Error('Gagal memproses gambar.');
      }
      const uploadRes = await apiJson('/v1/admin/uploads/image', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          folder: 'coach-profile',
          filename: file.name || 'coach-profile-image',
          data_url: dataUrl
        })
      });
      const imageUrl = String(uploadRes?.url || '').trim();
      if (!imageUrl) {
        throw new Error('Upload berhasil tapi URL gambar tidak tersedia.');
      }
      setProfileForm((prev) => ({ ...prev, photo_url: imageUrl }));
      setFeedback('coach.image.uploaded: Foto coach berhasil diunggah ke S3.');
    } catch (err) {
      setFeedback(err.message || 'Gagal upload foto coach.');
    } finally {
      event.target.value = '';
    }
  }

  async function aiFillCoachGallery() {
    try {
      setProfileAiWorking(true);
      const keywordCandidates = buildCoachImageKeywords();
      if (keywordCandidates.length === 0) {
        throw new Error('Isi nama coach dulu agar gambar bisa digenerate.');
      }
      let keyword = keywordCandidates[0];
      let photos = [];
      let lastError = null;
      for (const candidate of keywordCandidates) {
        keyword = candidate;
        try {
          photos = await fetchPexelsPhotos(candidate, 6);
        } catch (error) {
          lastError = error;
          photos = [];
        }
        if (photos.length > 0) break;
      }
      if (photos.length === 0) {
        if (lastError) throw lastError;
        setFeedback('ai.assist: Pexels tidak menemukan gambar untuk coach ini.');
        return;
      }
      const urls = photos
        .map((item) => item?.image_url || '')
        .map((item) => String(item || '').trim())
        .filter(Boolean);
      setProfileForm((prev) => ({
        ...prev,
        photo_url: urls[0] || prev.photo_url
      }));
      setFeedback(`ai.assist: Foto coach diisi dari Pexels (${keyword}).`);
    } catch (error) {
      setFeedback(error.message || 'ai.assist: Gagal mengambil gambar coach.');
    } finally {
      setProfileAiWorking(false);
    }
  }

  async function submitBookSession(e) {
    e.preventDefault();
    if (!bookForm.pt_package_id || !bookForm.member_id || !bookForm.session_at) {
      setFeedback('Lengkapi package, member, dan jadwal sesi.');
      return;
    }
    try {
      setSaving(true);
      setFeedback('');
      const customFields = parseCustomFieldsInput(bookForm.custom_fields_text, 'Book session');
      await apiJson('/v1/pt/sessions/book', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: trainerId || undefined,
          trainer_id: trainerId || undefined,
          pt_package_id: bookForm.pt_package_id,
          member_id: bookForm.member_id,
          session_at: toAppIsoFromDateTimeInput(bookForm.session_at),
          activity_note: bookForm.activity_note || null,
          custom_fields: customFields
        })
      });
      setFeedback('Session booked.');
      await loadPtWorkspace();
    } catch (err) {
      setFeedback(err.message || 'Gagal booking session.');
    } finally {
      setSaving(false);
    }
  }

  async function submitCompleteSession(e) {
    e.preventDefault();
    if (!completeForm.pt_package_id || !completeForm.member_id || !completeForm.completed_at) {
      setFeedback('Lengkapi package, member, dan waktu selesai sesi.');
      return;
    }
    try {
      setSaving(true);
      setFeedback('');
      const customFields = parseCustomFieldsInput(completeForm.custom_fields_text, 'Complete session');
      await apiJson(`/v1/pt/sessions/${encodeURIComponent(completeForm.pt_package_id)}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: trainerId || undefined,
          trainer_id: trainerId || undefined,
          member_id: completeForm.member_id,
          session_id: completeForm.session_id || null,
          completed_at: toAppIsoFromDateTimeInput(completeForm.completed_at),
          activity_note: completeForm.activity_note || null,
          custom_fields: customFields
        })
      });
      setFeedback('Session completed.');
      await loadPtWorkspace();
    } catch (err) {
      setFeedback(err.message || 'Gagal menyelesaikan session.');
    } finally {
      setSaving(false);
    }
  }

  async function submitActivityLog(e) {
    e.preventDefault();
    if (!activityForm.member_id || !activityForm.activity_note) {
      setFeedback('Lengkapi member dan catatan aktivitas.');
      return;
    }
    try {
      setSaving(true);
      setFeedback('');
      const customFields = parseCustomFieldsInput(activityForm.custom_fields_text, 'Activity log');
      await apiJson('/v1/pt/activity/log', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: trainerId || undefined,
          trainer_id: trainerId || undefined,
          pt_package_id: activityForm.pt_package_id || null,
          member_id: activityForm.member_id,
          session_at: toAppIsoFromDateTimeInput(activityForm.session_at),
          activity_note: activityForm.activity_note,
          custom_fields: customFields
        })
      });
      setFeedback('Activity logged.');
      setActivityForm((prev) => ({ ...prev, activity_note: '' }));
      await loadPtWorkspace();
    } catch (err) {
      setFeedback(err.message || 'Gagal log activity.');
    } finally {
      setSaving(false);
    }
  }

  function seedFormsFromBalance(row) {
    const packageId = String(row?.pt_package_id || '');
    const memberId = String(row?.member_id || '');
    setBookForm((prev) => ({ ...prev, pt_package_id: packageId, member_id: memberId }));
    setCompleteForm((prev) => ({ ...prev, pt_package_id: packageId, member_id: memberId }));
    setActivityForm((prev) => ({ ...prev, pt_package_id: packageId, member_id: memberId }));
  }

  function seedMemberIntoForms(memberId, nextTab = 'book') {
    const normalizedMemberId = String(memberId || '').trim();
    if (!normalizedMemberId) return;
    setBookForm((prev) => ({ ...prev, member_id: normalizedMemberId }));
    setCompleteForm((prev) => ({ ...prev, member_id: normalizedMemberId }));
    setActivityForm((prev) => ({ ...prev, member_id: normalizedMemberId }));
    setActiveTab(nextTab);
  }

  useEffect(() => {
    loadPtWorkspace();
  }, [tenantId, branchId, trainerId]);

  return (
    <main className="dashboard">
      <WorkspaceHeader
        eyebrow="PT Workspace"
        title={profileForm.full_name || session?.user?.fullName || 'PT'}
        subtitle="Session booking, completion, and member activity tracking"
        allowedEnv={allowedEnv}
        targetEnv={targetEnv}
        getEnvironmentLabel={getEnvironmentLabel}
        onSelectEnv={(env) => {
          setTargetEnv(env);
          goToEnv(env);
        }}
        onSignOut={signOut}
      />

      <section style={{ marginTop: '1rem' }}>
        <p className="eyebrow">Insight</p>
        <section className="stats-grid">
          {insightStats.map((s) => (
            <Stat key={s.label} label={s.label} value={s.value} iconClass={s.iconClass} tone={s.tone} hint={s.hint} />
          ))}
        </section>
        {loading ? <p className="feedback">Loading PT workspace...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {feedback ? <p className="feedback">{feedback}</p> : null}
      </section>

      <section className="card admin-main" style={{ marginTop: '1rem' }}>
        <div className="landing-tabs" role="tablist" aria-label="PT workspace tabs">
          {PT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`landing-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === 'profile' ? (
          <div style={{ marginTop: '1rem' }}>
            <h2>Coach profile</h2>
            <form className="form" onSubmit={submitProfile}>
              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'minmax(140px, 180px) minmax(0, 1fr)', alignItems: 'start' }}>
                <div>
                  <div className="photo-preview-box" style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: '1rem', overflow: 'hidden' }}>
                    {profileForm.photo_url ? (
                      <img src={profileForm.photo_url} alt={profileForm.full_name || 'Coach'} className="photo-preview-image" />
                    ) : (
                      <div className="empty-photo-preview">Belum ada foto</div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '0.9rem' }}>
                  <label>
                    Coach Name
                    <input
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Nama coach"
                    />
                  </label>
                  <label>
                    Profile Image URL
                    <input
                      value={profileForm.photo_url}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, photo_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </label>
                  <div className="row-actions" style={{ marginTop: '-0.2rem' }}>
                    <button
                      className="btn ghost small"
                      type="button"
                      onClick={() => profileImageInputRef.current?.click()}
                    >
                      Upload Image
                    </button>
                    <input
                      ref={profileImageInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={onProfileImageUpload}
                    />
                    <button
                      className="btn ghost small"
                      type="button"
                      disabled={profileAiWorking}
                      onClick={aiFillCoachGallery}
                    >
                      AI Fill Gallery
                    </button>
                  </div>
                  <div>
                    <button className="btn" type="submit" disabled={profileSaving}>
                      {profileSaving ? 'Saving...' : 'Save coach profile'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        ) : null}
        {activeTab === 'book' ? (
          <div style={{ marginTop: '1rem' }}>
            <h2>Book session</h2>
            <form className="form" onSubmit={submitBookSession}>
              <label>pt_package_id<input value={bookForm.pt_package_id} onChange={(e) => setBookForm((p) => ({ ...p, pt_package_id: e.target.value }))} /></label>
              <label>member_id<input value={bookForm.member_id} onChange={(e) => setBookForm((p) => ({ ...p, member_id: e.target.value }))} /></label>
              <label>session_at<input type="datetime-local" value={bookForm.session_at} onChange={(e) => setBookForm((p) => ({ ...p, session_at: e.target.value }))} /></label>
              <label>activity_note<input value={bookForm.activity_note} onChange={(e) => setBookForm((p) => ({ ...p, activity_note: e.target.value }))} /></label>
              <label>custom_fields (JSON)<textarea rows={3} value={bookForm.custom_fields_text} onChange={(e) => setBookForm((p) => ({ ...p, custom_fields_text: e.target.value }))} placeholder='{"intensity":"high","coach_note":"focus core"}' /></label>
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Book session'}</button>
            </form>
          </div>
        ) : null}
        {activeTab === 'complete' ? (
          <div style={{ marginTop: '1rem' }}>
            <h2>Complete session</h2>
            <form className="form" onSubmit={submitCompleteSession}>
              <label>pt_package_id<input value={completeForm.pt_package_id} onChange={(e) => setCompleteForm((p) => ({ ...p, pt_package_id: e.target.value }))} /></label>
              <label>member_id<input value={completeForm.member_id} onChange={(e) => setCompleteForm((p) => ({ ...p, member_id: e.target.value }))} /></label>
              <label>session_id<input value={completeForm.session_id} onChange={(e) => setCompleteForm((p) => ({ ...p, session_id: e.target.value }))} /></label>
              <label>completed_at<input type="datetime-local" value={completeForm.completed_at} onChange={(e) => setCompleteForm((p) => ({ ...p, completed_at: e.target.value }))} /></label>
              <label>completion_note<input value={completeForm.activity_note} onChange={(e) => setCompleteForm((p) => ({ ...p, activity_note: e.target.value }))} /></label>
              <label>custom_fields (JSON)<textarea rows={3} value={completeForm.custom_fields_text} onChange={(e) => setCompleteForm((p) => ({ ...p, custom_fields_text: e.target.value }))} placeholder='{"session_quality":4,"mood":"good"}' /></label>
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Complete session'}</button>
            </form>
          </div>
        ) : null}
        {activeTab === 'member' ? (
          <div style={{ marginTop: '1rem' }}>
            <h2>Member</h2>
            <div className="entity-list">
              {memberRows.map((item) => (
                <div className="entity-row" key={item.member_id}>
                  <div>
                    <strong>{item.member_id}</strong>
                    <p>{item.package_count} package | remaining {item.remaining_sessions} / total {item.total_sessions} | consumed {item.consumed_sessions}</p>
                    <p>{item.latest_updated_at ? `Last update ${formatAppDateTime(item.latest_updated_at)}` : 'Belum ada aktivitas sesi.'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn ghost small" type="button" onClick={() => seedMemberIntoForms(item.member_id, 'book')}>Book</button>
                    <button className="btn ghost small" type="button" onClick={() => seedMemberIntoForms(item.member_id, 'complete')}>Complete</button>
                  </div>
                </div>
              ))}
              {memberRows.length === 0 ? (
                <div className="entity-row">
                  <div>
                    <strong>Belum ada member PT</strong>
                    <p>Member yang punya package PT akan tampil di sini.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {activeTab === 'history' ? (
          <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
            <div>
              <h2>History sessions</h2>
              <div className="entity-list">
                {ptActivityRows.map((item) => (
                  <div className="entity-row" key={item.activity_id}>
                    <div>
                      <strong>{item.member_id} {item.pt_package_id ? `- ${item.pt_package_id}` : ''}</strong>
                      <p>{formatAppDateTime(item.session_at)} | {item.activity_type || 'activity_logged'}{item.session_id ? ` | session ${item.session_id}` : ''}</p>
                      <p>{item.activity_note || '-'}</p>
                      <p>{item.custom_fields && Object.keys(item.custom_fields).length > 0 ? `custom_fields: ${JSON.stringify(item.custom_fields)}` : 'custom_fields: -'}</p>
                    </div>
                  </div>
                ))}
                {ptActivityRows.length === 0 ? (
                  <div className="entity-row">
                    <div>
                      <strong>Belum ada history session</strong>
                      <p>Riwayat booking, complete, dan activity log akan tampil di sini.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div>
              <h2>Log activity</h2>
              <form className="form" onSubmit={submitActivityLog}>
                <label>pt_package_id (optional)<input value={activityForm.pt_package_id} onChange={(e) => setActivityForm((p) => ({ ...p, pt_package_id: e.target.value }))} /></label>
                <label>member_id<input value={activityForm.member_id} onChange={(e) => setActivityForm((p) => ({ ...p, member_id: e.target.value }))} /></label>
                <label>session_at<input type="datetime-local" value={activityForm.session_at} onChange={(e) => setActivityForm((p) => ({ ...p, session_at: e.target.value }))} /></label>
                <label>activity_note<input value={activityForm.activity_note} onChange={(e) => setActivityForm((p) => ({ ...p, activity_note: e.target.value }))} /></label>
                <label>custom_fields (JSON)<textarea rows={3} value={activityForm.custom_fields_text} onChange={(e) => setActivityForm((p) => ({ ...p, custom_fields_text: e.target.value }))} placeholder='{"exercise":"deadlift","weight_kg":80}' /></label>
                <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Log activity'}</button>
              </form>
            </div>
          </div>
        ) : null}
        {activeTab === 'book' || activeTab === 'complete' ? (
          <div style={{ marginTop: '1rem' }}>
            <p className="eyebrow">PT package balance</p>
            <div className="entity-list">
              {ptBalances.map((item) => (
                <div className="entity-row" key={`${item.pt_package_id}:${item.member_id}`}>
                  <div>
                    <strong>{item.member_id} - {item.pt_package_id}</strong>
                    <p>remaining {item.remaining_sessions} / total {item.total_sessions} | consumed {item.consumed_sessions}</p>
                  </div>
                  <button className="btn ghost" type="button" onClick={() => seedFormsFromBalance(item)}>Use</button>
                </div>
              ))}
              {ptBalances.length === 0 ? (
                <div className="entity-row">
                  <div>
                    <strong>Belum ada PT package</strong>
                    <p>Package PT aktif akan tampil di sini untuk memudahkan booking dan completion.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <footer className="dash-foot"><Link to="/host">Back to host</Link></footer>
    </main>
  );
}
