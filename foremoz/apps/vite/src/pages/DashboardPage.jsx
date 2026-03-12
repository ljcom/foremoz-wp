import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { accountPath, apiJson, clearSession, getAccountSlug, getEnvironmentLabel, getSession, getAllowedEnvironments } from '../lib.js';
import { getVerticalLabel, guessVerticalSlugByText } from '../industry-jargon.js';

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

function toLowerText(value) {
  return String(value || '').trim().toLowerCase();
}

function formatDateTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatIdr(value) {
  return `IDR ${Number(value || 0).toLocaleString('id-ID')}`;
}

function csvEscape(value) {
  const raw = String(value ?? '');
  if (!/[",\n]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

function downloadCsvFile(filename, rows) {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function isSameParticipant(member, participant) {
  const memberEmail = toLowerText(member?.email);
  const participantEmail = toLowerText(participant?.email);
  if (memberEmail && participantEmail) return memberEmail === participantEmail;
  const memberName = toLowerText(member?.full_name);
  const participantName = toLowerText(participant?.full_name);
  if (memberName && participantName) return memberName === participantName;
  return false;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [searchBy, setSearchBy] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dashboardRow, setDashboardRow] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberMode, setMemberMode] = useState('list');
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberForm, setMemberForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    id_card: '',
    member_id: ''
  });
  const [memberFeedback, setMemberFeedback] = useState('');
  const [workspaceTab, setWorkspaceTab] = useState('member');
  const [classPanelQuery, setClassPanelQuery] = useState('');
  const [eventPanelQuery, setEventPanelQuery] = useState('');
  const [events, setEvents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedExperienceType, setSelectedExperienceType] = useState('event');
  const [selectedExperienceId, setSelectedExperienceId] = useState('');
  const [eventParticipants, setEventParticipants] = useState([]);
  const [eventParticipantsLoading, setEventParticipantsLoading] = useState(false);
  const [eventParticipantQuery, setEventParticipantQuery] = useState('');
  const [participantSearchRows, setParticipantSearchRows] = useState([]);
  const [participantSearchLoading, setParticipantSearchLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');
  const [actionSaving, setActionSaving] = useState(false);

  const accountSlug = getAccountSlug(session);
  const tenantId = session?.tenant?.id || 'tn_001';
  const branchId = session?.branch?.id || 'core';
  const role = String(session?.role || 'admin').toLowerCase();
  const fullName = session?.user?.fullName || session?.user?.full_name || 'User';
  const resolvedVerticalSlug = String(session?.tenant?.industry_slug || '').trim().toLowerCase()
    || guessVerticalSlugByText(`${session?.tenant?.gym_name || ''} ${accountSlug}`, 'active');
  const inferredVerticalLabel = getVerticalLabel(resolvedVerticalSlug, 'Active');
  const [targetEnv, setTargetEnv] = useState(
    role === 'owner' || role === 'admin' ? 'admin' : role === 'sales' ? 'sales' : role === 'pt' ? 'pt' : 'cs'
  );

  const allowedEnv = useMemo(() => {
    return getAllowedEnvironments(session, role);
  }, [session, role]);

  useEffect(() => {
    if (allowedEnv.length === 0) return;
    if (!allowedEnv.includes(targetEnv)) {
      setTargetEnv(allowedEnv[0]);
    }
  }, [allowedEnv, targetEnv]);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError('');
      await apiJson('/v1/projections/run', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: 'core'
        })
      });
      if (branchId !== 'core') {
        await apiJson('/v1/projections/run', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: tenantId,
            branch_id: branchId
          })
        });
      }

      const [dashboardRes, membersRes, eventsRes, classesRes] = await Promise.all([
        apiJson(`/v1/read/dashboard?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`),
        apiJson(`/v1/read/members?tenant_id=${encodeURIComponent(tenantId)}&limit=1000`),
        apiJson(`/v1/read/events?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}&status=all&limit=200`),
        apiJson(`/v1/admin/classes?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`)
      ]);

      if (!dashboardRes.row && branchId !== 'core') {
        const coreDashboard = await apiJson(
          `/v1/read/dashboard?tenant_id=${encodeURIComponent(tenantId)}&branch_id=core`
        );
        setDashboardRow(coreDashboard.row || null);
      } else {
        setDashboardRow(dashboardRes.row || null);
      }
      setMembers(membersRes.rows || []);
      setEvents(eventsRes.rows || []);
      setClasses(classesRes.rows || []);
    } catch (err) {
      setError(err.message || 'failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function loadEventParticipants(eventId) {
    if (!eventId) {
      setEventParticipants([]);
      return;
    }
    try {
      setEventParticipantsLoading(true);
      const response = await apiJson(
        `/v1/admin/events/${encodeURIComponent(eventId)}/participants?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}&limit=500`
      );
      setEventParticipants(response.rows || []);
    } catch (err) {
      setActionFeedback(err.message || 'failed to load participants');
    } finally {
      setEventParticipantsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, branchId]);

  useEffect(() => {
    if (selectedExperienceType !== 'event' || !selectedExperienceId) {
      setEventParticipants([]);
      return;
    }
    loadEventParticipants(selectedExperienceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExperienceId, selectedExperienceType]);

  const activeEvents = useMemo(() => {
    const activeStatuses = new Set(['scheduled', 'published', 'posted', 'active', 'open']);
    return events.filter((row) => activeStatuses.has(toLowerText(row?.status)));
  }, [events]);

  const activeClasses = useMemo(() => {
    const now = Date.now();
    const lookbackMs = 24 * 60 * 60 * 1000;
    return classes.filter((row) => {
      const startAt = new Date(row?.start_at || '').getTime();
      if (!Number.isFinite(startAt)) return true;
      return startAt >= now - lookbackMs;
    });
  }, [classes]);

  useEffect(() => {
    let cancelled = false;
    async function loadParticipantSearchRows() {
      try {
        setParticipantSearchLoading(true);
        const memberById = new Map();
        const memberByEmail = new Map();
        members.forEach((member) => {
          const memberId = String(member?.member_id || '').trim();
          const email = toLowerText(member?.email);
          if (memberId) memberById.set(memberId, member);
          if (email) memberByEmail.set(email, member);
        });

        const eventParticipantResponses = await Promise.all(
          activeEvents.map((eventItem) =>
            apiJson(
              `/v1/admin/events/${encodeURIComponent(eventItem.event_id)}/participants?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}&limit=500`
            ).catch(() => ({ rows: [] }))
          )
        );
        const eventRows = [];
        eventParticipantResponses.forEach((response, index) => {
          const eventItem = activeEvents[index];
          (response.rows || []).forEach((participant, participantIndex) => {
            const linkedMember = memberByEmail.get(toLowerText(participant?.email)) || null;
            eventRows.push({
              key: `event:${eventItem?.event_id || 'unknown'}:${participant?.registration_id || participant?.email || participant?.passport_id || participantIndex}`,
              source_kind: 'event',
              source_id: eventItem?.event_id || '',
              source_name: eventItem?.event_name || 'Event',
              member_id: linkedMember?.member_id || '',
              full_name: participant?.full_name || linkedMember?.full_name || '',
              phone: linkedMember?.phone || '',
              email: participant?.email || linkedMember?.email || '',
              status: participant?.checked_out_at ? 'checked_out' : participant?.checked_in_at ? 'checked_in' : 'registered',
              participant_no: participant?.participant_no || '',
              registration_id: participant?.registration_id || '',
              passport_id: participant?.passport_id || ''
            });
          });
        });

        const classBookingResponses = await Promise.all(
          activeClasses.map((classItem) =>
            apiJson(
              `/v1/read/bookings?tenant_id=${encodeURIComponent(tenantId)}&class_id=${encodeURIComponent(classItem.class_id)}`
            ).catch(() => ({ rows: [] }))
          )
        );
        const classRows = [];
        classBookingResponses.forEach((response, index) => {
          const classItem = activeClasses[index];
          (response.rows || []).forEach((booking, bookingIndex) => {
            const linkedMember = memberById.get(String(booking?.member_id || '').trim()) || null;
            classRows.push({
              key: `class:${classItem?.class_id || 'unknown'}:${booking?.booking_id || booking?.member_id || booking?.guest_name || bookingIndex}`,
              source_kind: 'class',
              source_id: classItem?.class_id || '',
              source_name: classItem?.class_name || 'Class',
              member_id: booking?.member_id || linkedMember?.member_id || '',
              full_name: linkedMember?.full_name || booking?.guest_name || '',
              phone: linkedMember?.phone || '',
              email: linkedMember?.email || '',
              status: booking?.status || 'booked',
              participant_no: '',
              registration_id: booking?.booking_id || '',
              passport_id: ''
            });
          });
        });

        if (cancelled) return;
        const merged = [...eventRows, ...classRows];
        const deduped = [];
        const seen = new Set();
        merged.forEach((row) => {
          const rowKey = String(row?.key || '').trim();
          if (!rowKey || seen.has(rowKey)) return;
          seen.add(rowKey);
          deduped.push(row);
        });
        setParticipantSearchRows(deduped);
      } finally {
        if (!cancelled) setParticipantSearchLoading(false);
      }
    }
    loadParticipantSearchRows();
    return () => {
      cancelled = true;
    };
  }, [tenantId, branchId, activeEvents, activeClasses, members]);

  const stats = useMemo(
    () => [
      {
        label: 'Member Aktif',
        value: dashboardRow?.active_subscription_count ?? 0,
        iconClass: 'fa-solid fa-id-card',
        tone: 'tone-subscription',
        hint: 'berlangganan aktif'
      },
      {
        label: 'Check-in Hari Ini',
        value: dashboardRow?.today_checkin_count ?? 0,
        iconClass: 'fa-solid fa-door-open',
        tone: 'tone-checkin',
        hint: 'kunjungan tercatat'
      },
      {
        label: 'Booking Hari Ini',
        value: dashboardRow?.today_booking_count ?? 0,
        iconClass: 'fa-solid fa-calendar-check',
        tone: 'tone-booking',
        hint: 'slot kelas terisi'
      },
      {
        label: 'Pending Payment',
        value: dashboardRow?.pending_payment_count ?? 0,
        iconClass: 'fa-solid fa-money-bill',
        tone: 'tone-payment',
        hint: 'menunggu konfirmasi'
      }
    ],
    [dashboardRow]
  );

  const searchSource = members;
  const selectedMember = useMemo(
    () => searchSource.find((member) => String(member.member_id || '') === String(selectedMemberId || '')) || null,
    [searchSource, selectedMemberId]
  );

  const memberAttachmentMap = useMemo(() => {
    const memberById = new Map();
    const memberByEmail = new Map();
    searchSource.forEach((member) => {
      const memberId = String(member?.member_id || '').trim();
      const email = toLowerText(member?.email);
      if (memberId) memberById.set(memberId, member);
      if (email) memberByEmail.set(email, member);
    });
    const attachmentMap = new Map();
    participantSearchRows.forEach((row) => {
      let memberId = String(row?.member_id || '').trim();
      if (!memberId) {
        const linked = memberByEmail.get(toLowerText(row?.email));
        memberId = String(linked?.member_id || '').trim();
      }
      if (!memberId) return;
      const item = {
        kind: row.source_kind,
        source_id: row.source_id || '',
        source_name: row.source_name || (row.source_kind === 'class' ? 'Class' : 'Event'),
        full_name: row.full_name || '',
        email: row.email || '',
        participant_no: row.participant_no || '',
        registration_id: row.registration_id || '',
        status: row.status || ''
      };
      const list = attachmentMap.get(memberId) || [];
      if (!list.some((attached) => attached.kind === item.kind && attached.source_id === item.source_id)) {
        list.push(item);
      }
      attachmentMap.set(memberId, list);
    });
    return attachmentMap;
  }, [searchSource, participantSearchRows]);

  const searchResults = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    const memberRows = searchSource.map((member, index) => ({
      key: `member:${member.member_id || member.email || index}`,
      source_kind: 'member',
      source_id: '',
      source_name: '',
      member_id: member.member_id || '',
      full_name: member.full_name || '',
      phone: member.phone || '',
      email: member.email || '',
      id_card: member.id_card || member.ktp_number || '',
      status: member.status || '',
      participant_no: '',
      registration_id: '',
      passport_id: ''
    }));
    if (!q) return memberRows;

    return memberRows.filter((member) => {
      const directFields = {
        full_name: String(member.full_name || '').toLowerCase(),
        phone: String(member.phone || '').toLowerCase(),
        ktp_number: String(member.id_card || '').toLowerCase(),
        member_id: String(member.member_id || '').toLowerCase(),
        email: String(member.email || '').toLowerCase()
      };
      const attachments = memberAttachmentMap.get(String(member.member_id || '').trim()) || [];
      const attachmentFields = attachments.map((item) => ({
        full_name: String(item.full_name || '').toLowerCase(),
        phone: '',
        ktp_number: '',
        member_id: String(member.member_id || '').toLowerCase(),
        email: String(item.email || '').toLowerCase(),
        participant_no: String(item.participant_no || '').toLowerCase(),
        registration_id: String(item.registration_id || '').toLowerCase(),
        source_name: String(item.source_name || '').toLowerCase(),
        source_id: String(item.source_id || '').toLowerCase(),
        status: String(item.status || '').toLowerCase(),
        kind: String(item.kind || '').toLowerCase()
      }));
      const memberDirectHit = searchBy === 'all'
        ? Object.values(directFields).some((value) => value.includes(q))
        : Boolean(directFields[searchBy]?.includes(q));
      if (memberDirectHit) return true;

      if (searchBy === 'all') {
        return attachmentFields.some((fields) => Object.values(fields).some((value) => value.includes(q)));
      }
      return attachmentFields.some((fields) => String(fields[searchBy] || '').includes(q));
    });
  }, [searchBy, query, searchSource, memberAttachmentMap]);

  const filteredEvents = useMemo(() => {
    const q = toLowerText(eventPanelQuery);
    if (!q) return events;
    return events.filter((row) => {
      return [row.event_name, row.location, row.event_id, row.status, row.organizer_name]
        .map((v) => toLowerText(v))
        .some((v) => v.includes(q));
    });
  }, [events, eventPanelQuery]);

  const filteredClassPanel = useMemo(() => {
    const q = toLowerText(classPanelQuery);
    if (!q) return classes;
    return classes.filter((row) => {
      return [row.class_name, row.class_id, row.trainer_name, row.branch_id]
        .map((v) => toLowerText(v))
        .some((v) => v.includes(q));
    });
  }, [classes, classPanelQuery]);

  const selectedEvent = useMemo(() => {
    if (selectedExperienceType !== 'event') return null;
    return events.find((row) => String(row.event_id || '') === String(selectedExperienceId || '')) || null;
  }, [events, selectedExperienceId, selectedExperienceType]);

  const selectedClass = useMemo(() => {
    if (selectedExperienceType !== 'class') return null;
    return classes.find((row) => String(row.class_id || '') === String(selectedExperienceId || '')) || null;
  }, [classes, selectedExperienceId, selectedExperienceType]);

  const filteredEventParticipants = useMemo(() => {
    const q = toLowerText(eventParticipantQuery);
    if (!q) return eventParticipants;
    return eventParticipants.filter((participant) => {
      const bucket = [
        participant.full_name,
        participant.email,
        participant.participant_no,
        participant.registration_id,
        participant.passport_id
      ]
        .map((v) => toLowerText(v))
        .filter(Boolean);
      return bucket.some((value) => value.includes(q));
    });
  }, [eventParticipants, eventParticipantQuery]);

  function signOut() {
    clearSession();
    navigate(`/a/${accountSlug}`, { replace: true });
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
    if (env === 'cs') {
      navigate(`/a/${accountSlug}/cs/dashboard`);
      return;
    }
    navigate(`/a/${accountSlug}/cs/dashboard`);
  }

  function scanQrCode() {
    const scanned = window.prompt('Hasil scan QR/Barcode (member_id / email):', '');
    if (!scanned) return;
    const token = scanned.trim();
    if (!token) return;
    if (token.includes('@')) {
      setSearchBy('all');
      setQuery(token);
      return;
    }
    setSearchBy('member_id');
    setQuery(token);
  }

  function scanParticipantBarcode() {
    if (selectedExperienceType !== 'event' || !selectedExperienceId) {
      setActionFeedback('Pilih event dulu sebelum scan participant barcode.');
      return;
    }

    const scanned = window.prompt('Scan barcode participant / participant_no:', '');
    if (!scanned) return;
    const token = toLowerText(scanned);
    if (!token) return;

    const matches = eventParticipants.filter((participant) => {
      const bucket = [
        participant.participant_no,
        participant.registration_id,
        participant.email,
        participant.passport_id,
        participant.full_name
      ]
        .map((v) => toLowerText(v))
        .filter(Boolean);
      return bucket.some((value) => value.includes(token));
    });

    if (matches.length === 0) {
      setActionFeedback('Participant tidak ditemukan dari barcode ini.');
      return;
    }
    if (matches.length > 1) {
      setActionFeedback('Barcode match lebih dari satu participant. Check-in tidak dijalankan.');
      return;
    }

    const matched = matches[0];
    const mappedMember = searchSource.find((member) => isSameParticipant(member, matched));
    if (!mappedMember) {
      setActionFeedback('Participant ditemukan, tapi member tidak ditemukan di tenant.');
      return;
    }

    setSelectedMemberId(mappedMember.member_id);
    setActionFeedback(`Participant terdeteksi: ${mappedMember.full_name}.`);
  }

  function exportBrowseCsv(type = 'event') {
    if (type === 'event') {
      const rows = [
        ['type', 'event_id', 'event_name', 'location', 'start_at', 'duration_minutes', 'status', 'publish_price', 'participant_count']
      ];
      filteredEvents.forEach((row) => {
        rows.push([
          'event',
          row.event_id || '',
          row.event_name || '',
          row.location || '',
          row.start_at || '',
          row.duration_minutes || '',
          row.status || '',
          row.publish_price || '',
          row.participant_count || 0
        ]);
      });
      downloadCsvFile(`cs-events-${Date.now()}.csv`, rows);
      return;
    }

    const rows = [['type', 'class_id', 'class_name', 'trainer_name', 'start_at', 'end_at', 'capacity']];
    filteredClassPanel.forEach((row) => {
      rows.push([
        'class',
        row.class_id || '',
        row.class_name || '',
        row.trainer_name || '',
        row.start_at || '',
        row.end_at || '',
        row.capacity || ''
      ]);
    });
    downloadCsvFile(`cs-classes-${Date.now()}.csv`, rows);
  }

  async function addMember(e) {
    e.preventDefault();
    if (!memberForm.full_name.trim() || !memberForm.phone.trim() || !memberForm.email.trim() || !memberForm.id_card.trim()) return;

    const generatedId = memberForm.member_id.trim() || `mem_${Date.now()}`;
    try {
      setMemberSaving(true);
      setMemberFeedback('');
      await apiJson('/v1/members/register', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          member_id: generatedId,
          full_name: memberForm.full_name.trim(),
          phone: memberForm.phone.trim(),
          email: memberForm.email.trim(),
          id_card: memberForm.id_card.trim(),
          status: 'active'
        })
      });

      await loadDashboard();
      setMemberMode('list');
      setMemberForm({ full_name: '', phone: '', email: '', id_card: '', member_id: '' });
      setMemberFeedback(`member.created: ${generatedId}`);
      setSelectedMemberId(generatedId);
      setSearchBy('member_id');
      setQuery(generatedId);
    } catch (err) {
      setMemberFeedback(err.message || 'failed to create member');
    } finally {
      setMemberSaving(false);
    }
  }

  async function checkinByIdentity({ member = null, participant = null }) {
    if (!selectedEvent) {
      setActionFeedback('Pilih event dulu sebelum check in.');
      return;
    }
    const email = String(member?.email || participant?.email || '').trim();
    const fullName = member?.full_name || participant?.full_name || null;
    const registrationId = participant?.registration_id || null;
    const passportId = participant?.passport_id || null;
    if (!email && !passportId && !registrationId) {
      setActionFeedback('Identitas participant/member tidak ditemukan.');
      return;
    }

    try {
      setActionSaving(true);
      setActionFeedback('');
      await apiJson(`/v1/admin/events/${encodeURIComponent(selectedEvent.event_id)}/participants/checkin`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          email: email || null,
          full_name: fullName,
          registration_id: registrationId,
          passport_id: passportId
        })
      });
      await loadEventParticipants(selectedEvent.event_id);
      await loadDashboard();
      setActionFeedback(`checkin.success: ${fullName || email || passportId || registrationId || '-'}`);
    } catch (err) {
      setActionFeedback(err.message || 'failed to check in participant');
    } finally {
      setActionSaving(false);
    }
  }

  async function checkoutByIdentity({ member = null, participant = null }) {
    if (!selectedEvent) {
      setActionFeedback('Pilih event dulu sebelum check out.');
      return;
    }
    if (!participant?.checked_in_at) {
      setActionFeedback('Tidak bisa checkout: participant belum check in.');
      return;
    }
    const email = String(member?.email || participant?.email || '').trim();
    const fullName = member?.full_name || participant?.full_name || null;
    const registrationId = participant?.registration_id || null;
    const passportId = participant?.passport_id || null;
    if (!email && !passportId && !registrationId) {
      setActionFeedback('Identitas participant/member tidak ditemukan.');
      return;
    }

    try {
      setActionSaving(true);
      setActionFeedback('');
      await apiJson(`/v1/admin/events/${encodeURIComponent(selectedEvent.event_id)}/participants/checkout`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          email: email || null,
          full_name: fullName,
          registration_id: registrationId,
          passport_id: passportId
        })
      });
      await loadEventParticipants(selectedEvent.event_id);
      await loadDashboard();
      setActionFeedback(`checkout.success: ${fullName || email || passportId || registrationId || '-'}`);
    } catch (err) {
      setActionFeedback(err.message || 'failed to check out participant');
    } finally {
      setActionSaving(false);
    }
  }

  async function bookClassForMember() {
    if (!selectedMember || !selectedClass) {
      setActionFeedback('Pilih member dan class dulu sebelum booking.');
      return;
    }

    try {
      setActionSaving(true);
      setActionFeedback('');
      await apiJson('/v1/bookings/classes/create', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          booking_id: `book_${Date.now()}`,
          class_id: selectedClass.class_id,
          booking_kind: 'member',
          member_id: selectedMember.member_id,
          guest_name: selectedMember.full_name,
          status: 'booked'
        })
      });
      await loadDashboard();
      setActionFeedback(`booking.success: ${selectedMember.full_name} -> ${selectedClass.class_name}`);
    } catch (err) {
      setActionFeedback(err.message || 'failed to create booking');
    } finally {
      setActionSaving(false);
    }
  }

  return (
    <main className="dashboard">
      <header className="dash-head card">
        <div>
          <p className="eyebrow">Operational</p>
          <h1>{session?.tenant?.gym_name || `Foremoz ${inferredVerticalLabel} Tenant`}</h1>
          <p>Selamat datang, {fullName}</p>
        </div>
        <div className="meta">
          {allowedEnv.length > 0 ? (
            <div className="env-switcher">
              <label className="env-lookup">
                Environment
                <select
                  value={targetEnv}
                  onChange={(e) => {
                    const next = e.target.value;
                    setTargetEnv(next);
                    goToEnv(next);
                  }}
                >
                  {allowedEnv.map((env) => (
                    <option key={env} value={env}>
                      {getEnvironmentLabel(env)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="env-buttons" role="group" aria-label="Environment">
                {allowedEnv.map((env) => (
                  <button
                    key={env}
                    type="button"
                    className={`btn ghost small ${targetEnv === env ? 'active' : ''}`}
                    onClick={() => {
                      setTargetEnv(env);
                      goToEnv(env);
                    }}
                  >
                    {getEnvironmentLabel(env)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <button className="btn ghost" onClick={signOut}>
            Keluar
          </button>
        </div>
      </header>

      <section className="stats-grid">
        {stats.map((s) => (
          <Stat key={s.label} label={s.label} value={s.value} iconClass={s.iconClass} tone={s.tone} hint={s.hint} />
        ))}
      </section>

      {loading ? <p className="feedback">Memuat dashboard...</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <section className="card search-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2>Pilih Panel</h2>
          </div>
        </div>
        <div className="landing-tabs" role="tablist" aria-label="Workspace panel">
          <button type="button" className={`landing-tab ${workspaceTab === 'member' ? 'active' : ''}`} onClick={() => setWorkspaceTab('member')}>
            Member
          </button>
          <button
            type="button"
            className={`landing-tab ${workspaceTab === 'event' ? 'active' : ''}`}
            onClick={() => {
              setWorkspaceTab('event');
              setSelectedExperienceType('event');
            }}
          >
            Event
          </button>
          <button
            type="button"
            className={`landing-tab ${workspaceTab === 'class' ? 'active' : ''}`}
            onClick={() => {
              setWorkspaceTab('class');
              setSelectedExperienceType('class');
            }}
          >
            Class
          </button>
        </div>
      </section>

      {workspaceTab === 'member' ? (
        <section className="card search-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Membership Search</p>
              <h2>Cari Member</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn ghost" onClick={scanQrCode}>
                Scan QR/Barcode
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setMemberMode((prev) => (prev === 'add' ? 'list' : 'add'));
                  setMemberFeedback('');
                }}
              >
                {memberMode === 'add' ? 'Batal' : 'Tambah Member'}
              </button>
            </div>
          </div>

          <div className="search-box">
            <label>
              Cari berdasarkan
              <select value={searchBy} onChange={(e) => setSearchBy(e.target.value)}>
                <option value="all">Semua</option>
                <option value="full_name">Nama</option>
                <option value="phone">No. HP</option>
                <option value="ktp_number">ID Card</option>
                <option value="member_id">Member ID</option>
              </select>
            </label>
            <label>
              Kata kunci
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nama, no HP, ID card, member ID" />
            </label>
          </div>

          {memberMode === 'add' ? (
            <form className="form" onSubmit={addMember} style={{ marginTop: '0.75rem' }}>
              <label>
                Nama lengkap
                <input value={memberForm.full_name} onChange={(e) => setMemberForm((prev) => ({ ...prev, full_name: e.target.value }))} placeholder="Nama member" />
              </label>
              <label>
                No. HP
                <input value={memberForm.phone} onChange={(e) => setMemberForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="08xxxxxxxxxx" />
              </label>
              <label>
                Email
                <input type="email" value={memberForm.email} onChange={(e) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="member@email.com" />
              </label>
              <label>
                ID Card
                <input value={memberForm.id_card} onChange={(e) => setMemberForm((prev) => ({ ...prev, id_card: e.target.value }))} placeholder="KTP / ID Card" />
              </label>
              <label>
                Member ID (opsional)
                <input value={memberForm.member_id} onChange={(e) => setMemberForm((prev) => ({ ...prev, member_id: e.target.value }))} placeholder="auto-generate if empty" />
              </label>
              <button className="btn" type="submit" disabled={memberSaving}>
                {memberSaving ? 'Menyimpan...' : 'Simpan Member'}
              </button>
            </form>
          ) : null}

          {memberFeedback ? <p className="feedback">{memberFeedback}</p> : null}
          {participantSearchLoading ? <p className="feedback">Memuat keterkaitan member dengan event/class aktif...</p> : null}

          <div className="search-result-list">
            {searchResults.length > 0 ? (
              searchResults.map((row) => {
                const isSelected = String(row.member_id || '') === String(selectedMemberId || '');
                const attachments = memberAttachmentMap.get(String(row.member_id || '').trim()) || [];
                return (
                  <div key={row.key} className={`member-row ${isSelected ? 'selected' : ''}`}>
                    <strong>{row.full_name || '-'}</strong>
                    <span>{row.member_id || '-'}</span>
                    <span>{row.phone || '-'}</span>
                    <span>{row.email || '-'}</span>
                    <span className={`status ${row.status}`}>{row.status || '-'}</span>
                    {attachments.length > 0 ? (
                      <div className="member-row-actions">
                        {attachments.map((item) => (
                          <button
                            key={`${row.member_id}-${item.kind}-${item.source_id}`}
                            className="btn ghost small"
                            type="button"
                            onClick={() => {
                              if (item.kind === 'event') {
                                setWorkspaceTab('event');
                                setSelectedExperienceType('event');
                                setSelectedExperienceId(item.source_id);
                              } else {
                                setWorkspaceTab('class');
                                setSelectedExperienceType('class');
                                setSelectedExperienceId(item.source_id);
                              }
                            }}
                          >
                            {item.kind === 'event' ? 'Event' : 'Class'}: {item.source_name}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="member-row-actions">
                      <button className="btn ghost small" type="button" onClick={() => setSelectedMemberId(row.member_id)}>
                        {isSelected ? 'Terpilih' : 'Pilih'}
                      </button>
                      <button className="btn ghost small" type="button" onClick={() => navigate(accountPath(session, `/members/${row.member_id}`))}>
                        Lihat Member
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="muted">Member tidak ditemukan.</p>
            )}
          </div>
        </section>
      ) : null}

      {workspaceTab === 'event' ? (
        <section className="card search-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Event Panel</p>
              <h2>Daftar Event</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn ghost" type="button" onClick={() => exportBrowseCsv('event')}>
                Export CSV
              </button>
              <button className="btn ghost" type="button" onClick={scanParticipantBarcode}>
                Scan Barcode Peserta
              </button>
            </div>
          </div>

          <label>
            Cari event
            <input value={eventPanelQuery} onChange={(e) => setEventPanelQuery(e.target.value)} placeholder="Nama event, lokasi, status" />
          </label>

          <div className="entity-list" style={{ marginTop: '0.8rem' }}>
            {filteredEvents.length > 0 ? (
              filteredEvents.map((eventItem) => {
                const selected = selectedExperienceType === 'event' && selectedExperienceId === eventItem.event_id;
                return (
                  <button
                    key={eventItem.event_id}
                    type="button"
                    className={`member-row ${selected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedExperienceType('event');
                      setSelectedExperienceId(eventItem.event_id);
                      setActionFeedback('');
                    }}
                  >
                    <strong>{eventItem.event_name || '-'}</strong>
                    <span>{eventItem.event_id || '-'}</span>
                    <span>{eventItem.location || '-'}</span>
                    <span>Mulai: {formatDateTime(eventItem.start_at)}</span>
                    <span>Durasi: {Number(eventItem.duration_minutes || 0)} menit</span>
                    <span>Participants: {Number(eventItem.participant_count || 0)} | Harga: {formatIdr(eventItem.publish_price || 0)}</span>
                  </button>
                );
              })
            ) : (
              <p className="muted">Event tidak ditemukan.</p>
            )}
          </div>

          <div className="member-layout">
            <article className="member-detail">
              <h3>Selected member</h3>
              {selectedMember ? (
                <>
                  <p><strong>{selectedMember.full_name || '-'}</strong></p>
                  <p>ID: {selectedMember.member_id}</p>
                  <p>Email: {selectedMember.email || '-'}</p>
                </>
              ) : null}
            </article>
            <article className="member-detail">
              <h3>Selected event</h3>
              {selectedEvent ? (
                <>
                  <p><strong>{selectedEvent.event_name || '-'}</strong></p>
                  <p>ID: {selectedEvent.event_id}</p>
                  <p>Mulai: {formatDateTime(selectedEvent.start_at)}</p>
                </>
              ) : (
                <p className="muted">Pilih event dari daftar di atas.</p>
              )}
            </article>
          </div>

          {selectedExperienceType === 'event' && selectedEvent ? (
            <div className="payment-history">
              <h3>Event participants</h3>
              <label>
                Cari participant
                <input
                  value={eventParticipantQuery}
                  onChange={(e) => setEventParticipantQuery(e.target.value)}
                  placeholder="Nama, email, participant no, registration ID"
                />
              </label>
              {eventParticipantsLoading ? (
                <p className="feedback">Memuat participant...</p>
              ) : filteredEventParticipants.length > 0 ? (
                <div className="entity-list">
                  {filteredEventParticipants.slice(0, 20).map((participant, index) => (
                    <div className="entity-row" key={`${participant.registration_id || participant.email || participant.passport_id || 'p'}-${index}`}>
                      <div>
                        <strong>{participant.full_name || participant.email || participant.passport_id || '-'}</strong>
                        <p>{participant.participant_no || '-'} | {participant.email || '-'} | checkin: {participant.checked_in_at ? 'yes' : 'no'} | checkout: {participant.checked_out_at ? 'yes' : 'no'}</p>
                      </div>
                      <div className="row-actions">
                        <button className="btn ghost small" type="button" disabled={actionSaving} onClick={() => checkinByIdentity({ participant })}>
                          {participant.checked_in_at ? 'Update Check-in' : 'Check-in'}
                        </button>
                        <button
                          className="btn ghost small"
                          type="button"
                          disabled={actionSaving || !participant.checked_in_at}
                          onClick={() => checkoutByIdentity({ participant })}
                        >
                          {participant.checked_out_at ? 'Update Check-out' : 'Check-out'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Belum ada participant.</p>
              )}
            </div>
          ) : null}

          {actionFeedback ? <p className="feedback">{actionFeedback}</p> : null}
        </section>
      ) : null}

      {workspaceTab === 'class' ? (
        <section className="card search-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Class Panel</p>
              <h2>Daftar Class</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn ghost" type="button" onClick={() => exportBrowseCsv('class')}>
                Export CSV
              </button>
            </div>
          </div>

          <label>
            Cari class
            <input value={classPanelQuery} onChange={(e) => setClassPanelQuery(e.target.value)} placeholder="Nama class, trainer, class ID" />
          </label>

          <div className="entity-list" style={{ marginTop: '0.8rem' }}>
            {filteredClassPanel.length > 0 ? (
              filteredClassPanel.map((classItem) => {
                const selected = selectedExperienceType === 'class' && selectedExperienceId === classItem.class_id;
                return (
                  <button
                    key={classItem.class_id}
                    type="button"
                    className={`member-row ${selected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedExperienceType('class');
                      setSelectedExperienceId(classItem.class_id);
                      setActionFeedback('');
                    }}
                  >
                    <strong>{classItem.class_name || '-'}</strong>
                    <span>{classItem.class_id || '-'}</span>
                    <span>Trainer: {classItem.trainer_name || '-'}</span>
                    <span>Mulai: {formatDateTime(classItem.start_at)}</span>
                    <span>Selesai: {formatDateTime(classItem.end_at)}</span>
                    <span>Capacity: {Number(classItem.capacity || 0)}</span>
                  </button>
                );
              })
            ) : (
              <p className="muted">Class tidak ditemukan.</p>
            )}
          </div>

          <div className="member-layout">
            <article className="member-detail">
              <h3>Selected member</h3>
              {selectedMember ? (
                <>
                  <p><strong>{selectedMember.full_name || '-'}</strong></p>
                  <p>ID: {selectedMember.member_id}</p>
                  <p>Email: {selectedMember.email || '-'}</p>
                </>
              ) : null}
            </article>
            <article className="member-detail">
              <h3>Selected class</h3>
              {selectedClass ? (
                <>
                  <p><strong>{selectedClass.class_name || '-'}</strong></p>
                  <p>ID: {selectedClass.class_id}</p>
                  <p>Trainer: {selectedClass.trainer_name || '-'}</p>
                  <p>Mulai: {formatDateTime(selectedClass.start_at)}</p>
                </>
              ) : (
                <p className="muted">Pilih class dari daftar di atas.</p>
              )}
            </article>
          </div>

          <div className="member-actions">
            <button className="btn ghost" type="button" disabled={actionSaving || !selectedMember || !selectedClass} onClick={bookClassForMember}>
              {actionSaving ? 'Menyimpan...' : 'Buat Booking Class'}
            </button>
          </div>

          {actionFeedback ? <p className="feedback">{actionFeedback}</p> : null}
        </section>
      ) : null}

      <footer className="dash-foot">
        <Link to="/">Kembali ke Home</Link>
      </footer>
    </main>
  );
}
