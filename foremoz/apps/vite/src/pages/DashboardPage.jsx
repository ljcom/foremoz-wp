import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  accountPath,
  apiJson,
  clearSession,
  getAccountSlug,
  getSession,
  getAllowedEnvironments,
  getSessionPackagePlan
} from '../lib.js';
import { getVerticalLabel, guessVerticalSlugByText } from '../industry-jargon.js';
import WorkspaceHeader from '../components/WorkspaceHeader.jsx';
import { useI18n } from '../i18n.js';
import { formatAppDateTime as formatDateTime } from '../time.js';

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

function parseCustomFieldsInput(raw, label) {
  const source = String(raw || '').trim();
  if (!source) return {};
  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`${label} custom_fields must be a JSON object`);
    }
    return parsed;
  } catch {
    throw new Error(`${label} custom_fields is invalid JSON object`);
  }
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

function isSameBookingMember(member, booking) {
  const memberId = String(member?.member_id || '').trim();
  const bookingMemberId = String(booking?.member_id || '').trim();
  if (memberId && bookingMemberId) return memberId === bookingMemberId;
  const memberEmail = toLowerText(member?.email);
  const bookingEmail = toLowerText(booking?.email);
  if (memberEmail && bookingEmail) return memberEmail === bookingEmail;
  const memberName = toLowerText(member?.full_name);
  const bookingName = toLowerText(booking?.guest_name);
  if (memberName && bookingName) return memberName === bookingName;
  return false;
}

function resolveClassCustomFields(classItem) {
  return classItem?.custom_fields && typeof classItem.custom_fields === 'object' && !Array.isArray(classItem.custom_fields)
    ? classItem.custom_fields
    : {};
}

function getClassRegistrationFields(classItem) {
  const customFields = resolveClassCustomFields(classItem);
  return Array.isArray(customFields.registration_fields) ? customFields.registration_fields : [];
}

function resolveProgramInfo(classItem) {
  const customFields = resolveClassCustomFields(classItem);
  return {
    preText: String(customFields.member_pre_info_text || '').trim(),
    postText: String(customFields.member_post_info_text || '').trim()
  };
}

function formatAnswerEntries(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value)
    .map(([label, answer]) => ({
      label: String(label || '').trim(),
      answer: String(answer || '').trim()
    }))
    .filter((item) => item.label && item.answer);
}

export default function DashboardPage() {
  const { language } = useI18n();
  const copy = useMemo(() => (language === 'en'
    ? {
        eyebrow: 'Operational',
        welcome: 'Welcome, {name}',
        envAdmin: 'settings',
        envCs: 'customer service',
        statsActiveMembers: 'Active Members',
        statsActiveMembersHint: 'active subscriptions',
        statsCheckins: 'Today Check-ins',
        statsCheckinsHint: 'recorded visits',
        statsBookings: 'Today Bookings',
        statsBookingsHint: 'filled program slots',
        statsPayments: 'Pending Payments',
        statsPaymentsHint: 'awaiting confirmation',
        loadingDashboard: 'Loading dashboard...',
        workspaceEyebrow: 'Workspace',
        choosePanel: 'Choose Panel',
        workspacePanelAria: 'Workspace panel',
        tabMember: 'Member',
        tabEvent: 'Event',
        tabClass: 'Program',
        memberSearchEyebrow: 'Membership Search',
        memberSearchTitle: 'Search Members',
        scanQr: 'Scan QR/Barcode',
        memberRelation: 'Member relation',
        activeClass: 'Active program',
        activeEvent: 'Active event',
        chooseClass: 'Choose program...',
        chooseEvent: 'Choose event...',
        searchBy: 'Search by',
        searchAll: 'All',
        searchName: 'Name',
        searchPhone: 'Phone',
        keyword: 'Keyword',
        keywordPlaceholder: 'Name, phone, ID card, member ID',
        panelContext: 'Panel context',
        noneSelected: 'not selected yet',
        loadingMemberLinks: 'Loading member links to active events/programs...',
        activeEventsSection: 'Active events',
        activeClassesSection: 'Active programs'
      }
    : {
        eyebrow: 'Operational',
        welcome: 'Selamat datang, {name}',
        envAdmin: 'settings',
        envCs: 'customer service',
        statsActiveMembers: 'Member Aktif',
        statsActiveMembersHint: 'berlangganan aktif',
        statsCheckins: 'Check-in Hari Ini',
        statsCheckinsHint: 'kunjungan tercatat',
        statsBookings: 'Booking Hari Ini',
        statsBookingsHint: 'slot kelas terisi',
        statsPayments: 'Pending Payment',
        statsPaymentsHint: 'menunggu konfirmasi',
        loadingDashboard: 'Memuat dashboard...',
        workspaceEyebrow: 'Workspace',
        choosePanel: 'Pilih Panel',
        workspacePanelAria: 'Workspace panel',
        tabMember: 'Member',
        tabEvent: 'Event',
        tabClass: 'Program',
        memberSearchEyebrow: 'Membership Search',
        memberSearchTitle: 'Cari Member',
        scanQr: 'Scan QR/Barcode',
        memberRelation: 'Relasi member',
        activeClass: 'Program aktif',
        activeEvent: 'Event aktif',
        chooseClass: 'Pilih program...',
        chooseEvent: 'Pilih event...',
        searchBy: 'Cari berdasarkan',
        searchAll: 'Semua',
        searchName: 'Nama',
        searchPhone: 'No. HP',
        keyword: 'Kata kunci',
        keywordPlaceholder: 'Nama, no HP, ID card, member ID',
        panelContext: 'Konteks panel',
        noneSelected: 'belum dipilih',
        loadingMemberLinks: 'Memuat keterkaitan member dengan event/program aktif...',
        activeEventsSection: 'Event aktif',
        activeClassesSection: 'Program aktif'
      }), [language]);
  const navigate = useNavigate();
  const session = getSession();
  const [searchBy, setSearchBy] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dashboardRow, setDashboardRow] = useState(null);
  const [members, setMembers] = useState([]);
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
  const [classBookings, setClassBookings] = useState([]);
  const [classBookingsLoading, setClassBookingsLoading] = useState(false);
  const [eventParticipantQuery, setEventParticipantQuery] = useState('');
  const [memberScopedFilter, setMemberScopedFilter] = useState(null);
  const [participantSearchRows, setParticipantSearchRows] = useState([]);
  const [participantSearchLoading, setParticipantSearchLoading] = useState(false);
  const [checkinCustomFieldsText, setCheckinCustomFieldsText] = useState('');
  const [checkoutCustomFieldsText, setCheckoutCustomFieldsText] = useState('');
  const [bookingRegistrationAnswers, setBookingRegistrationAnswers] = useState({});
  const [actionFeedback, setActionFeedback] = useState('');
  const [actionSaving, setActionSaving] = useState(false);

  const accountSlug = getAccountSlug(session);
  const tenantId = session?.tenant?.id || 'tn_001';
  const branchId = session?.branch?.id || 'core';
  const role = String(session?.role || 'admin').toLowerCase();
  const packagePlan = getSessionPackagePlan(session);
  const fullName = session?.user?.fullName || session?.user?.full_name || 'User';
  const resolvedVerticalSlug = String(session?.tenant?.industry_slug || '').trim().toLowerCase()
    || guessVerticalSlugByText(`${session?.tenant?.gym_name || ''} ${accountSlug}`, 'fitness');
  const inferredVerticalLabel = getVerticalLabel(resolvedVerticalSlug, 'Fitness');
  const [targetEnv, setTargetEnv] = useState(
    role === 'owner' || role === 'admin' ? 'admin' : role === 'sales' ? 'sales' : role === 'pt' ? 'pt' : 'cs'
  );

  const allowedEnv = useMemo(() => {
    return getAllowedEnvironments(session, role);
  }, [session, role]);
  const showClassWorkspace = packagePlan !== 'free';

  useEffect(() => {
    if (allowedEnv.length === 0) return;
    if (!allowedEnv.includes(targetEnv)) {
      setTargetEnv(allowedEnv[0]);
    }
  }, [allowedEnv, targetEnv]);

  useEffect(() => {
    if (showClassWorkspace) return;
    if (workspaceTab === 'class') {
      setWorkspaceTab('member');
    }
    if (selectedExperienceType === 'class') {
      setSelectedExperienceType('event');
      setSelectedExperienceId('');
    }
  }, [showClassWorkspace, workspaceTab, selectedExperienceType]);

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

  async function loadClassBookings(classId) {
    if (!classId) {
      setClassBookings([]);
      return;
    }
    try {
      setClassBookingsLoading(true);
      const response = await apiJson(
        `/v1/read/bookings?tenant_id=${encodeURIComponent(tenantId)}&class_id=${encodeURIComponent(classId)}`
      );
      setClassBookings(response.rows || []);
    } catch (err) {
      setActionFeedback(err.message || 'failed to load class bookings');
    } finally {
      setClassBookingsLoading(false);
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

  useEffect(() => {
    if (selectedExperienceType !== 'class' || !selectedExperienceId) {
      setClassBookings([]);
      return;
    }
    loadClassBookings(selectedExperienceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExperienceId, selectedExperienceType, tenantId]);

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
              source_name: classItem?.class_name || 'Program',
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
        label: copy.statsActiveMembers,
        value: dashboardRow?.active_subscription_count ?? 0,
        iconClass: 'fa-solid fa-id-card',
        tone: 'tone-subscription',
        hint: copy.statsActiveMembersHint
      },
      {
        label: copy.statsCheckins,
        value: dashboardRow?.today_checkin_count ?? 0,
        iconClass: 'fa-solid fa-door-open',
        tone: 'tone-checkin',
        hint: copy.statsCheckinsHint
      },
      {
        label: copy.statsBookings,
        value: dashboardRow?.today_booking_count ?? 0,
        iconClass: 'fa-solid fa-calendar-check',
        tone: 'tone-booking',
        hint: copy.statsBookingsHint
      },
      {
        label: copy.statsPayments,
        value: dashboardRow?.pending_payment_count ?? 0,
        iconClass: 'fa-solid fa-money-bill',
        tone: 'tone-payment',
        hint: copy.statsPaymentsHint
      }
    ],
    [copy.statsActiveMembers, copy.statsActiveMembersHint, copy.statsBookings, copy.statsBookingsHint, copy.statsCheckins, copy.statsCheckinsHint, copy.statsPayments, copy.statsPaymentsHint, dashboardRow]
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
        source_name: row.source_name || (row.source_kind === 'class' ? 'Program' : 'Event'),
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

  const activeExperienceCatalog = useMemo(() => {
    const deduped = [];
    const seen = new Set();
    const rows = [
      ...activeEvents.map((row) => ({
        kind: 'event',
        source_id: String(row?.event_id || '').trim(),
        source_name: row?.event_name || 'Event'
      })),
      ...activeClasses.map((row) => ({
        kind: 'class',
        source_id: String(row?.class_id || '').trim(),
        source_name: row?.class_name || 'Program'
      }))
    ];
    rows.forEach((item) => {
      const sourceKey = item.source_id || item.source_name;
      const itemKey = `${item.kind}:${sourceKey}`;
      if (!sourceKey || seen.has(itemKey)) return;
      seen.add(itemKey);
      deduped.push(item);
    });
    return deduped;
  }, [activeEvents, activeClasses]);

  const memberCardExperienceMap = useMemo(() => {
    const mapped = new Map();
    searchSource.forEach((member) => {
      const memberId = String(member?.member_id || '').trim();
      if (!memberId) return;
      const attachments = memberAttachmentMap.get(memberId) || [];
      const attachmentByKey = new Map(
        attachments.map((item) => [`${item.kind}:${item.source_id}`, item])
      );
      mapped.set(
        memberId,
        activeExperienceCatalog.map((item) => {
          const linked = attachmentByKey.get(`${item.kind}:${item.source_id}`) || null;
          return {
            ...item,
            is_linked: Boolean(linked),
            linked_status: linked?.status || ''
          };
        })
      );
    });
    return mapped;
  }, [searchSource, memberAttachmentMap, activeExperienceCatalog]);

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
    const baseRows = memberScopedFilter?.kind === 'event' && memberScopedFilter?.source_id
      ? events.filter((row) => String(row?.event_id || '') === String(memberScopedFilter.source_id))
      : events;
    if (!q) return baseRows;
    return baseRows.filter((row) => {
      return [row.event_name, row.location, row.event_id, row.status, row.organizer_name]
        .map((v) => toLowerText(v))
        .some((v) => v.includes(q));
    });
  }, [events, eventPanelQuery, memberScopedFilter]);

  const filteredClassPanel = useMemo(() => {
    const q = toLowerText(classPanelQuery);
    const baseRows = memberScopedFilter?.kind === 'class' && memberScopedFilter?.source_id
      ? classes.filter((row) => String(row?.class_id || '') === String(memberScopedFilter.source_id))
      : classes;
    if (!q) return baseRows;
    return baseRows.filter((row) => {
      return [row.class_name, row.class_id, row.trainer_name, row.branch_id]
        .map((v) => toLowerText(v))
        .some((v) => v.includes(q));
    });
  }, [classes, classPanelQuery, memberScopedFilter]);

  const selectedEvent = useMemo(() => {
    if (selectedExperienceType !== 'event') return null;
    return events.find((row) => String(row.event_id || '') === String(selectedExperienceId || '')) || null;
  }, [events, selectedExperienceId, selectedExperienceType]);

  const selectedClass = useMemo(() => {
    if (selectedExperienceType !== 'class') return null;
    return classes.find((row) => String(row.class_id || '') === String(selectedExperienceId || '')) || null;
  }, [classes, selectedExperienceId, selectedExperienceType]);
  const selectedClassRegistrationFields = useMemo(() => getClassRegistrationFields(selectedClass), [selectedClass]);
  const selectedClassProgramInfo = useMemo(() => resolveProgramInfo(selectedClass), [selectedClass]);
  const selectedExperienceLabel = useMemo(() => {
    if (selectedExperienceType === 'event') {
      return selectedEvent ? `Event: ${selectedEvent.event_name || selectedEvent.event_id}` : '';
    }
    if (selectedExperienceType === 'class') {
      return selectedClass ? `Program: ${selectedClass.class_name || selectedClass.class_id}` : '';
    }
    return '';
  }, [selectedClass, selectedEvent, selectedExperienceType]);

  const filteredEventParticipants = useMemo(() => {
    const q = toLowerText(eventParticipantQuery);
    const baseRows = memberScopedFilter?.kind === 'event' && selectedMember
      ? eventParticipants.filter((participant) => isSameParticipant(selectedMember, participant))
      : eventParticipants;
    if (!q) return baseRows;
    return baseRows.filter((participant) => {
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
  }, [eventParticipants, eventParticipantQuery, memberScopedFilter, selectedMember]);

  const filteredClassBookings = useMemo(() => {
    const rows = memberScopedFilter?.kind === 'class' && selectedMember
      ? classBookings.filter((booking) => isSameBookingMember(selectedMember, booking))
      : classBookings;
    return rows;
  }, [classBookings, memberScopedFilter, selectedMember]);

  useEffect(() => {
    setBookingRegistrationAnswers({});
  }, [selectedClass?.class_id]);

  function clearMemberScopedFilter() {
    setMemberScopedFilter(null);
    setEventParticipantQuery('');
    setActionFeedback('');
  }

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
      const customFields = parseCustomFieldsInput(checkinCustomFieldsText, 'Check-in');
      const result = await apiJson(`/v1/admin/events/${encodeURIComponent(selectedEvent.event_id)}/participants/checkin`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          email: email || null,
          full_name: fullName,
          registration_id: registrationId,
          passport_id: passportId,
          custom_fields: customFields
        })
      });
      await loadEventParticipants(selectedEvent.event_id);
      await loadDashboard();
      if (result?.duplicate) {
        setActionFeedback(`checkin.skip: ${fullName || email || passportId || registrationId || '-'} sudah check-in sebelumnya.`);
      } else {
        setActionFeedback(`checkin.success: ${fullName || email || passportId || registrationId || '-'}`);
      }
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
      const customFields = parseCustomFieldsInput(checkoutCustomFieldsText, 'Check-out');
      const result = await apiJson(`/v1/admin/events/${encodeURIComponent(selectedEvent.event_id)}/participants/checkout`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          email: email || null,
          full_name: fullName,
          registration_id: registrationId,
          passport_id: passportId,
          custom_fields: customFields
        })
      });
      await loadEventParticipants(selectedEvent.event_id);
      await loadDashboard();
      if (result?.duplicate) {
        setActionFeedback(`checkout.skip: ${fullName || email || passportId || registrationId || '-'} sudah checkout sebelumnya.`);
      } else {
        setActionFeedback(`checkout.success: ${fullName || email || passportId || registrationId || '-'}`);
      }
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
    for (let index = 0; index < selectedClassRegistrationFields.length; index += 1) {
      const field = selectedClassRegistrationFields[index] || {};
      const fieldId = String(field.field_id || '');
      const label = String(field.label || `Field ${index + 1}`);
      const value = String(bookingRegistrationAnswers[fieldId] || '').trim();
      if (field.required !== false && !value) {
        setActionFeedback(`${label} wajib diisi.`);
        return;
      }
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
          registration_answers: bookingRegistrationAnswers,
          status: 'booked'
        })
      });
      await loadDashboard();
      setBookingRegistrationAnswers({});
      setActionFeedback(`booking.success: ${selectedMember.full_name} -> ${selectedClass.class_name}`);
    } catch (err) {
      setActionFeedback(err.message || 'failed to create booking');
    } finally {
      setActionSaving(false);
    }
  }

  async function cancelClassBooking(booking) {
    if (!booking?.booking_id) return;
    try {
      setActionSaving(true);
      setActionFeedback('');
      const result = await apiJson(`/v1/bookings/classes/${encodeURIComponent(booking.booking_id)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId
        })
      });
      await loadClassBookings(booking.class_id || selectedClass?.class_id || selectedExperienceId);
      await loadDashboard();
      if (result?.duplicate) {
        setActionFeedback(`booking.skip: ${booking.booking_id} sudah canceled.`);
      } else {
        setActionFeedback(`booking.canceled: ${booking.booking_id}`);
      }
    } catch (err) {
      setActionFeedback(err.message || 'failed to cancel booking');
    } finally {
      setActionSaving(false);
    }
  }

  async function confirmClassAttendance(booking) {
    if (!booking?.booking_id) return;
    try {
      setActionSaving(true);
      setActionFeedback('');
      const result = await apiJson(`/v1/bookings/classes/${encodeURIComponent(booking.booking_id)}/attendance-confirm`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId
        })
      });
      await loadClassBookings(booking.class_id || selectedClass?.class_id || selectedExperienceId);
      await loadDashboard();
      if (result?.duplicate) {
        setActionFeedback(`attendance.skip: ${booking.booking_id} sudah confirmed sebelumnya.`);
      } else {
        setActionFeedback(`attendance.confirmed: ${booking.booking_id}`);
      }
    } catch (err) {
      setActionFeedback(err.message || 'failed to confirm attendance');
    } finally {
      setActionSaving(false);
    }
  }

  return (
    <main className="dashboard">
      <WorkspaceHeader
        eyebrow={copy.eyebrow}
        title={session?.tenant?.gym_name || `Foremoz ${inferredVerticalLabel} Tenant`}
        subtitle={copy.welcome.replace('{name}', fullName)}
        allowedEnv={allowedEnv}
        targetEnv={targetEnv}
        getEnvironmentLabel={(env) => {
          if (env === 'admin') return copy.envAdmin;
          if (env === 'cs') return copy.envCs;
          return env;
        }}
        onSelectEnv={(env) => {
          setTargetEnv(env);
          goToEnv(env);
        }}
        onSignOut={signOut}
      />

      <section className="stats-grid">
        {stats.map((s) => (
          <Stat key={s.label} label={s.label} value={s.value} iconClass={s.iconClass} tone={s.tone} hint={s.hint} />
        ))}
      </section>

      {loading ? <p className="feedback">{copy.loadingDashboard}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <section className="card search-panel">
        <div className="panel-head workspace-panel-head">
          <div>
            <p className="eyebrow">{copy.workspaceEyebrow}</p>
            <h2>{copy.choosePanel}</h2>
          </div>
        </div>
        <div className="landing-tabs" role="tablist" aria-label={copy.workspacePanelAria}>
          <button type="button" className={`landing-tab ${workspaceTab === 'member' ? 'active' : ''}`} onClick={() => setWorkspaceTab('member')}>
            {copy.tabMember}
          </button>
          <button
            type="button"
            className={`landing-tab ${workspaceTab === 'event' ? 'active' : ''}`}
            onClick={() => {
              setWorkspaceTab('event');
              setSelectedExperienceType('event');
            }}
          >
            {copy.tabEvent}
          </button>
          {showClassWorkspace ? (
            <button
              type="button"
              className={`landing-tab ${workspaceTab === 'class' ? 'active' : ''}`}
              onClick={() => {
                setWorkspaceTab('class');
                setSelectedExperienceType('class');
              }}
            >
              {copy.tabClass}
            </button>
          ) : null}
        </div>
      </section>

      {workspaceTab === 'member' ? (
        <section className="card search-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">{copy.memberSearchEyebrow}</p>
              <h2>{copy.memberSearchTitle}</h2>
            </div>
            <button className="btn ghost" onClick={scanQrCode}>
              {copy.scanQr}
            </button>
          </div>

          <div className="search-box">
            <label>
              {copy.memberRelation}
              <select
                value={selectedExperienceType}
                onChange={(e) => {
                  const next = e.target.value;
                  setSelectedExperienceType(next);
                  setWorkspaceTab(next === 'class' ? 'class' : 'event');
                  setSelectedExperienceId('');
                }}
              >
                <option value="event">Event</option>
                {showClassWorkspace ? <option value="class">Program</option> : null}
              </select>
            </label>
            <label>
              {selectedExperienceType === 'class' ? copy.activeClass : copy.activeEvent}
              <select
                value={selectedExperienceId}
                onChange={(e) => {
                  setSelectedExperienceId(e.target.value);
                }}
              >
                <option value="">{selectedExperienceType === 'class' ? copy.chooseClass : copy.chooseEvent}</option>
                {(selectedExperienceType === 'class' ? classes : events).map((item) => {
                  const id = selectedExperienceType === 'class' ? item.class_id : item.event_id;
                  const label = selectedExperienceType === 'class'
                    ? (item.class_name || item.class_id || '-')
                    : (item.event_name || item.event_id || '-');
                  return (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </label>
            <label>
              {copy.searchBy}
              <select value={searchBy} onChange={(e) => setSearchBy(e.target.value)}>
                <option value="all">{copy.searchAll}</option>
                <option value="full_name">{copy.searchName}</option>
                <option value="phone">{copy.searchPhone}</option>
                <option value="ktp_number">ID Card</option>
                <option value="member_id">Member ID</option>
              </select>
            </label>
            <label>
              {copy.keyword}
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={copy.keywordPlaceholder} />
            </label>
          </div>
          <p className="sub" style={{ marginTop: '0.5rem' }}>
            {copy.panelContext}: {selectedExperienceLabel || copy.noneSelected}
          </p>
          {participantSearchLoading ? <p className="feedback">{copy.loadingMemberLinks}</p> : null}

          <div className="search-result-list">
            {searchResults.length > 0 ? (
              searchResults.map((row) => {
                const isSelected = String(row.member_id || '') === String(selectedMemberId || '');
                const memberId = String(row.member_id || '').trim();
                const cardExperiences = memberCardExperienceMap.get(memberId) || [];
                const cardEvents = cardExperiences.filter((item) => item.kind === 'event');
                const cardClasses = cardExperiences.filter((item) => item.kind === 'class');
                return (
                  <div
                    key={row.key}
                    className={`member-row ${isSelected ? 'selected' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedMemberId(row.member_id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedMemberId(row.member_id);
                      }
                    }}
                  >
                    <strong>{row.full_name || '-'}</strong>
                    <span>{row.member_id || '-'}</span>
                    <span>{row.phone || '-'}</span>
                    <span>{row.email || '-'}</span>
                    <span className={`status ${row.status}`}>{row.status || '-'}</span>

                    {cardEvents.length > 0 ? (
                      <div className="member-row-section">
                        <span className="member-row-section-title">{copy.activeEventsSection}</span>
                        <div className="member-row-actions">
                          {cardEvents.map((item) => (
                            <button
                              key={`${row.member_id}-${item.kind}-${item.source_id}`}
                              className={`btn ghost small member-experience-btn ${item.is_linked ? 'is-linked' : ''}`}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedMemberId(row.member_id);
                                setWorkspaceTab('event');
                                setSelectedExperienceType('event');
                                setSelectedExperienceId(item.source_id);
                                setMemberScopedFilter({
                                  member_id: row.member_id,
                                  kind: 'event',
                                  source_id: item.source_id
                                });
                                setEventParticipantQuery('');
                              }}
                            >
                              {item.source_name}
                              {item.is_linked ? ` - ${item.linked_status || 'registered'}` : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {cardClasses.length > 0 ? (
                      <div className="member-row-section">
                        <span className="member-row-section-title">{copy.activeClassesSection}</span>
                        <div className="member-row-actions">
                          {cardClasses.map((item) => (
                            <button
                              key={`${row.member_id}-${item.kind}-${item.source_id}`}
                              className={`btn ghost small member-experience-btn ${item.is_linked ? 'is-linked' : ''}`}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedMemberId(row.member_id);
                                setWorkspaceTab('class');
                                setSelectedExperienceType('class');
                                setSelectedExperienceId(item.source_id);
                                setMemberScopedFilter({
                                  member_id: row.member_id,
                                  kind: 'class',
                                  source_id: item.source_id
                                });
                              }}
                            >
                              {item.source_name}
                              {item.is_linked ? ` - ${item.linked_status || 'booked'}` : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
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

          {memberScopedFilter?.kind === 'event' && selectedMember ? (
            <p className="mini-note">
              Filter aktif untuk member <strong>{selectedMember.full_name || selectedMember.member_id}</strong>.
              {' '}
              <button className="btn ghost small" type="button" onClick={clearMemberScopedFilter}>
                Reset Filter
              </button>
            </p>
          ) : null}

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
                      setMemberScopedFilter(null);
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
              <label>
                Check-in custom_fields (JSON, optional)
                <textarea
                  rows={2}
                  value={checkinCustomFieldsText}
                  onChange={(e) => setCheckinCustomFieldsText(e.target.value)}
                  placeholder='{"scanner":"gate-a","shift":"morning"}'
                />
              </label>
              <label>
                Check-out custom_fields (JSON, optional)
                <textarea
                  rows={2}
                  value={checkoutCustomFieldsText}
                  onChange={(e) => setCheckoutCustomFieldsText(e.target.value)}
                  placeholder='{"judge":"staff-1","source":"manual"}'
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
                        <p>checkin_fields: {participant.checkin_custom_fields && Object.keys(participant.checkin_custom_fields).length > 0 ? JSON.stringify(participant.checkin_custom_fields) : '-'}</p>
                        <p>checkout_fields: {participant.checkout_custom_fields && Object.keys(participant.checkout_custom_fields).length > 0 ? JSON.stringify(participant.checkout_custom_fields) : '-'}</p>
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

      {showClassWorkspace && workspaceTab === 'class' ? (
        <section className="card search-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Program Panel</p>
              <h2>Daftar Program</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn ghost" type="button" onClick={() => exportBrowseCsv('class')}>
                Export CSV
              </button>
            </div>
          </div>

          {memberScopedFilter?.kind === 'class' && selectedMember ? (
            <p className="mini-note">
              Filter aktif untuk member <strong>{selectedMember.full_name || selectedMember.member_id}</strong>.
              {' '}
              <button className="btn ghost small" type="button" onClick={clearMemberScopedFilter}>
                Reset Filter
              </button>
            </p>
          ) : null}

          <label>
            Cari program
            <input value={classPanelQuery} onChange={(e) => setClassPanelQuery(e.target.value)} placeholder="Nama program, trainer, program ID" />
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
                      setMemberScopedFilter(null);
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
              <p className="muted">Program tidak ditemukan.</p>
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
              <h3>Selected program</h3>
              {selectedClass ? (
                <>
                  <p><strong>{selectedClass.class_name || '-'}</strong></p>
                  <p>ID: {selectedClass.class_id}</p>
                  <p>Trainer: {selectedClass.trainer_name || '-'}</p>
                  <p>Mulai: {formatDateTime(selectedClass.start_at)}</p>
                  {selectedClassProgramInfo.preText ? <p><strong>Before program:</strong> {selectedClassProgramInfo.preText}</p> : null}
                  {selectedClassProgramInfo.postText ? <p><strong>After program:</strong> {selectedClassProgramInfo.postText}</p> : null}
                </>
              ) : (
                <p className="muted">Pilih program dari daftar di atas.</p>
              )}
            </article>
          </div>

          {selectedClassRegistrationFields.length > 0 ? (
            <div className="card" style={{ marginTop: '1rem', borderStyle: 'dashed' }}>
              <p className="eyebrow">Custom fields</p>
              <p className="feedback">Isi field yang diwajibkan program sebelum booking dibuat.</p>
              <div className="form">
                {selectedClassRegistrationFields.map((field, index) => {
                  const fieldId = String(field?.field_id || `field_${index}`);
                  const type = String(field?.type || 'free_type');
                  const label = String(field?.label || `Field ${index + 1}`);
                  const isRequired = field?.required !== false;
                  const value = String(bookingRegistrationAnswers[fieldId] || '');
                  if (type === 'date') {
                    return (
                      <label key={fieldId}>
                        {label}{isRequired ? ' *' : ''}
                        <input
                          type="date"
                          value={value}
                          onChange={(e) => setBookingRegistrationAnswers((prev) => ({ ...prev, [fieldId]: e.target.value }))}
                        />
                      </label>
                    );
                  }
                  if (type === 'lookup') {
                    const options = Array.isArray(field?.options) ? field.options : [];
                    return (
                      <label key={fieldId}>
                        {label}{isRequired ? ' *' : ''}
                        <select
                          value={value}
                          onChange={(e) => setBookingRegistrationAnswers((prev) => ({ ...prev, [fieldId]: e.target.value }))}
                        >
                          <option value="">Pilih</option>
                          {options.map((optionValue, optionIndex) => (
                            <option key={`${fieldId}-${optionIndex}`} value={String(optionValue)}>
                              {String(optionValue)}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  }
                  return (
                    <label key={fieldId}>
                      {label}{isRequired ? ' *' : ''}
                      <input
                        value={value}
                        onChange={(e) => setBookingRegistrationAnswers((prev) => ({ ...prev, [fieldId]: e.target.value }))}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="member-actions">
            <button className="btn ghost" type="button" disabled={actionSaving || !selectedMember || !selectedClass} onClick={bookClassForMember}>
              {actionSaving ? 'Menyimpan...' : 'Buat Booking Program'}
            </button>
          </div>

          {selectedExperienceType === 'class' && selectedClass ? (
            <div className="payment-history">
              <h3>Program bookings</h3>
              {classBookingsLoading ? (
                <p className="feedback">Memuat booking program...</p>
              ) : filteredClassBookings.length > 0 ? (
                <div className="entity-list">
                  {filteredClassBookings.slice(0, 20).map((booking, index) => (
                    <div className="entity-row" key={`${booking.booking_id || booking.member_id || booking.guest_name || 'b'}-${index}`}>
                      <div>
                        <strong>{booking.guest_name || booking.member_id || '-'}</strong>
                        <p>
                          {booking.member_id || '-'} | status: {booking.status || '-'} | booked: {formatDateTime(booking.booked_at)}
                        </p>
                        <p>
                          attendance: {booking.attendance_confirmed_at ? formatDateTime(booking.attendance_confirmed_at) : '-'}
                        </p>
                        {formatAnswerEntries(booking.registration_answers).length > 0 ? (
                          <p>
                            answers: {formatAnswerEntries(booking.registration_answers).map((entry) => `${entry.label}: ${entry.answer}`).join(' | ')}
                          </p>
                        ) : null}
                      </div>
                      <div className="row-actions">
                        <button
                          className="btn ghost small"
                          type="button"
                          disabled={actionSaving || String(booking.status || '').toLowerCase() === 'canceled'}
                          onClick={() => cancelClassBooking(booking)}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn ghost small"
                          type="button"
                          disabled={
                            actionSaving ||
                            String(booking.status || '').toLowerCase() === 'canceled' ||
                            Boolean(booking.attendance_confirmed_at)
                          }
                          onClick={() => confirmClassAttendance(booking)}
                        >
                          Confirm Attendance
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  {memberScopedFilter?.kind === 'class' && selectedMember
                    ? 'Belum ada booking program untuk member ini.'
                    : 'Belum ada booking program.'}
                </p>
              )}
            </div>
          ) : null}

          {actionFeedback ? <p className="feedback">{actionFeedback}</p> : null}
        </section>
      ) : null}

      <footer className="dash-foot">
        <Link to="/">Kembali ke Home</Link>
      </footer>
    </main>
  );
}
