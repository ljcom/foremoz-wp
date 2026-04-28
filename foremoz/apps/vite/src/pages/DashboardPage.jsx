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
import BackendWorkspaceShell from '../components/BackendWorkspaceShell.jsx';
import { useI18n } from '../i18n.js';
import { formatAppDateTime as formatDateTime } from '../time.js';
import {
  getConfigCopy,
  getConfiguredOption,
  getConfiguredOptions,
  getBackendShellNavItems,
  getDashboardOrderConfig,
  normalizeConfiguredOptionValue
} from '../config/app-config.js';

const CS_SIDEBAR_NAV_ITEMS = getBackendShellNavItems('cs');
const DASHBOARD_ORDER_CONFIG = getDashboardOrderConfig();
const ORDER_TYPE_OPTIONS = getConfiguredOptions(DASHBOARD_ORDER_CONFIG, 'orderTypes');
const ORDER_FORM_TYPE_OPTIONS = ORDER_TYPE_OPTIONS.filter((option) => option.visibleInOrderForm !== false);
const ORDER_PAYMENT_METHOD_OPTIONS = getConfiguredOptions(DASHBOARD_ORDER_CONFIG, 'paymentMethods');
const ORDER_SETTLEMENT_OPTIONS = getConfiguredOptions(DASHBOARD_ORDER_CONFIG, 'settlements');
const DEFAULT_ORDER_TYPE = DASHBOARD_ORDER_CONFIG.defaultOrderType || ORDER_TYPE_OPTIONS[0]?.value || '';
const DEFAULT_ORDER_PAYMENT_METHOD = DASHBOARD_ORDER_CONFIG.defaultPaymentMethod || ORDER_PAYMENT_METHOD_OPTIONS[0]?.value || '';

function Stat({ label, value, iconClass, tone, hint, onClick, active = false }) {
  const Tag = onClick ? 'button' : 'article';
  return (
    <Tag
      className={`stat ${tone} ${onClick ? 'is-clickable' : ''} ${active ? 'active' : ''}`}
      type={onClick ? 'button' : undefined}
      onClick={onClick || undefined}
    >
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
    </Tag>
  );
}

function toLowerText(value) {
  return String(value || '').trim().toLowerCase();
}

function formatIdr(value) {
  return `IDR ${Number(value || 0).toLocaleString('id-ID')}`;
}

function createCsMemberId() {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toLocalDateKey(value) {
  const date = value instanceof Date ? value : new Date(value || '');
  const time = date.getTime();
  if (!Number.isFinite(time)) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMemberCreateError(err) {
  const code = String(err?.errorCode || '').trim();
  if (code === 'MEMBER_EMAIL_EXISTS') return 'Email sudah terdaftar. Gunakan email lain atau cari member yang sudah ada.';
  if (code === 'MEMBER_PHONE_EXISTS') return 'No. HP sudah terdaftar. Gunakan nomor lain atau cari member yang sudah ada.';
  if (code === 'MEMBER_ID_CARD_EXISTS') return 'ID card / KTP sudah terdaftar. Gunakan data member yang sudah ada.';
  return err?.message || 'Gagal membuat member.';
}

function formatMemberProfileError(err) {
  const code = String(err?.errorCode || '').trim();
  if (code === 'MEMBER_EMAIL_EXISTS') return 'Email sudah dipakai member lain.';
  if (code === 'MEMBER_PHONE_EXISTS') return 'No. HP sudah dipakai member lain.';
  if (code === 'MEMBER_NOT_FOUND') return 'Member tidak ditemukan lagi. Coba kembali ke list member.';
  return err?.message || 'Gagal menyimpan perubahan member.';
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
  const memberId = String(member?.member_id || '').trim();
  const participantMemberId = String(participant?.member_id || '').trim();
  const participantPassportId = String(participant?.passport_id || '').trim();
  if (memberId && participantMemberId) return memberId === participantMemberId;
  if (memberId && participantPassportId) return memberId === participantPassportId;
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

function buildMemberHistoryRowKey(item) {
  const kind = String(item?.kind || item?.source_kind || '').trim() || 'history';
  const sourceId = String(item?.source_id || item?.event_id || item?.class_id || '').trim() || 'unknown';
  const registrationId = String(item?.registration_id || '').trim();
  const participantNo = String(item?.participant_no || '').trim();
  const memberId = String(item?.member_id || '').trim();
  const email = toLowerText(item?.email);
  const fallback = String(item?.source_name || item?.full_name || '').trim() || 'row';
  return `${kind}:${sourceId}:${registrationId || participantNo || memberId || email || fallback}`;
}

function sortMemberHistoryRows(rows) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(a?.checked_out_at || a?.checked_in_at || a?.booked_at || 0).getTime();
    const bTime = new Date(b?.checked_out_at || b?.checked_in_at || b?.booked_at || 0).getTime();
    return bTime - aTime;
  });
}

function mergeMemberHistoryRows(...collections) {
  const merged = [];
  const seen = new Set();
  collections.flat().forEach((item) => {
    const row = item && typeof item === 'object' ? item : null;
    if (!row) return;
    const key = buildMemberHistoryRowKey(row);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(row);
  });
  return sortMemberHistoryRows(merged);
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

function buildOrderTargetKey(sourceKind, sourceId) {
  return `${String(sourceKind || '').trim()}:${String(sourceId || '').trim()}`;
}

function normalizeOrderType(value) {
  return normalizeConfiguredOptionValue(DASHBOARD_ORDER_CONFIG, 'orderTypes', value, DEFAULT_ORDER_TYPE);
}

function formatOrderTypeLabel(value) {
  return getConfiguredOption(DASHBOARD_ORDER_CONFIG, 'orderTypes', normalizeOrderType(value))?.label || '';
}

function formatOrderTypeTargetLabel(value) {
  const option = getConfiguredOption(DASHBOARD_ORDER_CONFIG, 'orderTypes', normalizeOrderType(value));
  return String(option?.targetLabel || option?.label || '').toLowerCase();
}

function getOrderPaymentMethodMeta(value) {
  return getConfiguredOption(DASHBOARD_ORDER_CONFIG, 'paymentMethods', value) || {};
}

function getOrderCopy(key, vars = {}) {
  return getConfigCopy(DASHBOARD_ORDER_CONFIG, key, vars);
}

function getTargetPlaceholder(type, targets) {
  const targetLabel = formatOrderTypeTargetLabel(type);
  if (targets.length > 0) return `${getOrderCopy('targetSelectPrefix')} ${targetLabel}`;
  return `${getOrderCopy('targetEmptyPrefix')} ${targetLabel} ${getOrderCopy('targetEmptySuffix')}`;
}

function resolveOrderReferenceLabel(item, lookups = {}) {
  const orderItems = Array.isArray(item?.order_items) ? item.order_items : [];
  if (orderItems.length > 1) {
    const labels = orderItems
      .map((entry) => String(entry?.target_label || entry?.order_label || '').trim())
      .filter(Boolean);
    if (labels.length > 0) {
      return `${labels.slice(0, 2).join(' + ')}${labels.length > 2 ? ` +${labels.length - 2} item` : ''}`;
    }
    return `Bundle (${orderItems.length} items)`;
  }
  const referenceType = String(item?.reference_type || '').trim().toLowerCase();
  const referenceId = String(item?.reference_id || '').trim();
  const classesById = lookups.classesById || new Map();
  const eventsById = lookups.eventsById || new Map();
  const productsById = lookups.productsById || new Map();
  const packagesById = lookups.packagesById || new Map();
  if (referenceType === 'membership_purchase' || referenceType === 'pt_package_purchase') {
    return packagesById.get(referenceId) || referenceId || '-';
  }
  if (['open_access_purchase', 'activity_purchase', 'session_pack_purchase'].includes(referenceType)) {
    return packagesById.get(referenceId) || classesById.get(referenceId) || referenceId || '-';
  }
  if (referenceType === 'event_registration') {
    return eventsById.get(referenceId) || referenceId || '-';
  }
  if (referenceType === 'class_booking') {
    return classesById.get(referenceId) || referenceId || '-';
  }
  if (referenceType === 'product') {
    return productsById.get(referenceId) || referenceId || '-';
  }
  return referenceId || '-';
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
        statsDetailHint: 'click for detail',
        loadingDashboard: 'Loading dashboard...',
        workspaceEyebrow: 'Workspace',
        choosePanel: 'Choose Panel',
        workspacePanelAria: 'Workspace panel',
        tabMember: 'Member',
        tabEvent: 'Event',
        tabClass: 'Program',
        tabReport: 'Daily Report',
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
        activeClassesSection: 'Active programs',
        insightClose: 'Close',
        activeMembersDetailTitle: 'Active member details',
        activeMembersDetailEmpty: 'No active members yet.',
        todayCheckinsDetailTitle: 'Today check-in details',
        todayCheckinsDetailEmpty: 'No check-in recorded today.',
        todayBookingsDetailTitle: 'Today booking details',
        todayBookingsDetailEmpty: 'No booking recorded today.',
        pendingPaymentsDetailTitle: 'Pending payment details',
        pendingPaymentsDetailEmpty: 'No pending payment right now.'
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
        statsDetailHint: 'klik untuk lihat detail',
        loadingDashboard: 'Memuat dashboard...',
        workspaceEyebrow: 'Workspace',
        choosePanel: 'Pilih Panel',
        workspacePanelAria: 'Workspace panel',
        tabMember: 'Member',
        tabEvent: 'Event',
        tabClass: 'Program',
        tabReport: 'Daily Report',
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
        activeClassesSection: 'Program aktif',
        insightClose: 'Tutup',
        activeMembersDetailTitle: 'Detail member aktif',
        activeMembersDetailEmpty: 'Belum ada member aktif.',
        todayCheckinsDetailTitle: 'Detail check-in hari ini',
        todayCheckinsDetailEmpty: 'Belum ada check-in hari ini.',
        todayBookingsDetailTitle: 'Detail booking hari ini',
        todayBookingsDetailEmpty: 'Belum ada booking hari ini.',
        pendingPaymentsDetailTitle: 'Detail pending payment',
        pendingPaymentsDetailEmpty: 'Belum ada pending payment.'
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
  const [products, setProducts] = useState([]);
  const [packages, setPackages] = useState([]);
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
  const [memberHistoryOverrides, setMemberHistoryOverrides] = useState([]);
  const [participantSearchLoading, setParticipantSearchLoading] = useState(false);
  const [checkinCustomFieldsText, setCheckinCustomFieldsText] = useState('');
  const [checkoutCustomFieldsText, setCheckoutCustomFieldsText] = useState('');
  const [bookingRegistrationAnswers, setBookingRegistrationAnswers] = useState({});
  const [memberOrderRows, setMemberOrderRows] = useState([]);
  const [memberOrderLoading, setMemberOrderLoading] = useState(false);
  const [memberPaymentRows, setMemberPaymentRows] = useState([]);
  const [memberPaymentLoading, setMemberPaymentLoading] = useState(false);
  const [memberHistoryRows, setMemberHistoryRows] = useState([]);
  const [memberHistoryLoading, setMemberHistoryLoading] = useState(false);
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderFlowStep, setOrderFlowStep] = useState('form');
  const [orderPaymentDraft, setOrderPaymentDraft] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [editingOrderId, setEditingOrderId] = useState('');
  const [orderForm, setOrderForm] = useState({
    order_type: DEFAULT_ORDER_TYPE,
    target_key: '',
    label: '',
    qty: '1',
    unit_price: '',
    method: DEFAULT_ORDER_PAYMENT_METHOD,
    settlement: ORDER_SETTLEMENT_OPTIONS[0]?.value || '',
    notes: ''
  });
  const [actionFeedback, setActionFeedback] = useState('');
  const [actionSaving, setActionSaving] = useState(false);
  const [memberCreateMode, setMemberCreateMode] = useState(false);
  const [memberCreateSaving, setMemberCreateSaving] = useState(false);
  const [memberCreateNotice, setMemberCreateNotice] = useState('');
  const [memberCreateNoticeTone, setMemberCreateNoticeTone] = useState('feedback');
  const [memberCreateForm, setMemberCreateForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    id_card: ''
  });
  const [memberWorkspaceTab, setMemberWorkspaceTab] = useState('profile');
  const [memberProfileSaving, setMemberProfileSaving] = useState(false);
  const [memberProfileForm, setMemberProfileForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    status: 'active'
  });
  const [selectedInsightKey, setSelectedInsightKey] = useState('');
  const [insightDetailRows, setInsightDetailRows] = useState([]);
  const [insightDetailLoading, setInsightDetailLoading] = useState(false);

  const accountSlug = getAccountSlug(session);
  const tenantId = session?.tenant?.id || 'tn_001';
  const branchId = session?.branch?.id || 'core';
  const role = String(session?.role || 'admin').toLowerCase();
  const packagePlan = getSessionPackagePlan(session);
  const isMultiBranchPlan = packagePlan === 'multi_branch';
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
  const csSidebarNavItems = useMemo(
    () =>
      CS_SIDEBAR_NAV_ITEMS
        .filter((item) => item.id !== 'class' || showClassWorkspace)
        .map((item) => ({
          ...item,
          href: `#${item.id}`,
          onClick: (event) => {
            event.preventDefault();
            setWorkspaceTab(item.id);
          }
        })),
    [showClassWorkspace]
  );

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

      const [dashboardRes, membersRes, eventsRes, classesRes, productsRes, packagesRes] = await Promise.all([
        apiJson(`/v1/read/dashboard?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`),
        apiJson(`/v1/read/members?tenant_id=${encodeURIComponent(tenantId)}&limit=1000`),
        apiJson(`/v1/read/events?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}&status=all&limit=200`),
        apiJson(`/v1/admin/classes?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`),
        apiJson(`/v1/admin/products?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/admin/packages?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`).catch(() => ({ rows: [] }))
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
      setProducts(productsRes.rows || []);
      setPackages(packagesRes.rows || []);
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
      const scopedResponse = await apiJson(
        `/v1/admin/events/${encodeURIComponent(eventId)}/participants?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}&limit=500`
      ).catch(() => ({ rows: [] }));

      let scopedRows = Array.isArray(scopedResponse?.rows) ? scopedResponse.rows : [];
      if (scopedRows.length === 0) {
        const unscopedResponse = await apiJson(
          `/v1/admin/events/${encodeURIComponent(eventId)}/participants?tenant_id=${encodeURIComponent(tenantId)}&limit=500`
        ).catch(() => ({ rows: [] }));
        scopedRows = Array.isArray(unscopedResponse?.rows) ? unscopedResponse.rows : [];
      }

      setEventParticipants(scopedRows);
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

  async function loadSelectedMemberPayments(memberId) {
    const targetMemberId = String(memberId || '').trim();
    if (!targetMemberId) {
      setMemberPaymentRows([]);
      return;
    }
    try {
      setMemberPaymentLoading(true);
      const response = await apiJson(
        `/v1/read/payments/history?tenant_id=${encodeURIComponent(tenantId)}&member_id=${encodeURIComponent(targetMemberId)}`
      );
      setMemberPaymentRows(Array.isArray(response?.rows) ? response.rows : []);
    } catch (err) {
      setActionFeedback(err.message || 'failed to load member payments');
    } finally {
      setMemberPaymentLoading(false);
    }
  }

  async function loadSelectedMemberHistory(member) {
    const targetMemberId = String(member?.member_id || '').trim();
    const targetEmail = toLowerText(member?.email);
    if (!targetMemberId && !targetEmail) {
      return [];
    }

    const [bookingRes, registrationRes] = await Promise.all([
      targetMemberId
        ? apiJson(
          `/v1/read/bookings?tenant_id=${encodeURIComponent(tenantId)}&member_id=${encodeURIComponent(targetMemberId)}`
        ).catch(() => ({ rows: [] }))
        : Promise.resolve({ rows: [] }),
      apiJson(
        `/v1/read/event-registrations?tenant_id=${encodeURIComponent(tenantId)}&passport_id=${encodeURIComponent(targetMemberId)}&email=${encodeURIComponent(targetEmail)}&limit=300`
      ).catch(() => ({ rows: [], event_ids: [] }))
    ]);

    const eventNameById = new Map(
      events
        .map((item) => [String(item?.event_id || '').trim(), String(item?.event_name || '').trim()])
        .filter(([eventId]) => eventId)
    );
    const classNameById = new Map(
      classes
        .map((item) => [String(item?.class_id || '').trim(), String(item?.class_name || '').trim()])
        .filter(([classId]) => classId)
    );

    const bookingRows = Array.isArray(bookingRes?.rows) ? bookingRes.rows : [];
    const classHistoryRows = bookingRows.map((booking) => {
      const checkedInAt = booking?.attendance_checked_in_at || booking?.attendance_confirmed_at || '';
      const checkedOutAt = booking?.attendance_checked_out_at || '';
      return {
        key: `class:${booking?.class_id || ''}:${booking?.booking_id || booking?.member_id || booking?.guest_name || 'booking'}`,
        member_id: targetMemberId,
        kind: 'class',
        source_id: booking?.class_id || '',
        source_name: booking?.class_name || classNameById.get(String(booking?.class_id || '').trim()) || booking?.class_id || 'Program',
        full_name: member?.full_name || booking?.guest_name || '',
        email: targetEmail || '',
        participant_no: '',
        registration_id: booking?.booking_id || '',
        status: checkedOutAt ? 'checked_out' : checkedInAt ? 'checked_in' : booking?.status || 'booked',
        linked_status: checkedOutAt ? 'checked_out' : checkedInAt ? 'checked_in' : booking?.status || 'booked',
        booked_at: booking?.booked_at || '',
        checked_in_at: checkedInAt,
        checked_out_at: checkedOutAt
      };
    });

    const registrationRows = Array.isArray(registrationRes?.rows) ? registrationRes.rows : [];
    const eventIds = [...new Set(
      registrationRows
        .map((row) => String(row?.event_id || '').trim())
        .filter(Boolean)
    )];
    const participantResponses = await Promise.all(
      eventIds.map((eventId) =>
        apiJson(
          `/v1/admin/events/${encodeURIComponent(eventId)}/participants?tenant_id=${encodeURIComponent(tenantId)}&limit=500`
        ).catch(() => ({ rows: [] }))
      )
    );
    const participantRowsByEventId = new Map(
      eventIds.map((eventId, index) => [
        eventId,
        Array.isArray(participantResponses[index]?.rows) ? participantResponses[index].rows : []
      ])
    );
    const eventHistoryRows = registrationRows.map((registration) => {
      const eventId = String(registration?.event_id || '').trim();
      const eventParticipants = participantRowsByEventId.get(eventId) || [];
      const matchedParticipant = eventParticipants.find((participant) => {
        const registrationId = String(registration?.registration_id || '').trim();
        const participantRegistrationId = String(participant?.registration_id || '').trim();
        if (registrationId && participantRegistrationId) return registrationId === participantRegistrationId;
        return isSameParticipant(member, participant);
      }) || null;
      const checkedInAt = matchedParticipant?.checked_in_at || '';
      const checkedOutAt = matchedParticipant?.checked_out_at || '';
      return {
        key: `event:${eventId}:${registration?.registration_id || registration?.email || registration?.passport_id || 'registration'}`,
        member_id: targetMemberId,
        kind: 'event',
        source_id: eventId,
        source_name: eventNameById.get(eventId) || eventId || 'Event',
        full_name: matchedParticipant?.full_name || registration?.full_name || member?.full_name || '',
        email: matchedParticipant?.email || registration?.email || targetEmail || '',
        participant_no: matchedParticipant?.participant_no || registration?.participant_no || '',
        registration_id: matchedParticipant?.registration_id || registration?.registration_id || '',
        status: checkedOutAt ? 'checked_out' : checkedInAt ? 'checked_in' : 'registered',
        linked_status: checkedOutAt ? 'checked_out' : checkedInAt ? 'checked_in' : 'registered',
        booked_at: matchedParticipant?.registered_at || registration?.registered_at || '',
        checked_in_at: checkedInAt,
        checked_out_at: checkedOutAt
      };
    });

    const merged = mergeMemberHistoryRows(eventHistoryRows, classHistoryRows);
    return merged.filter((row) => row.checked_in_at || row.checked_out_at);
  }

  async function loadSelectedMemberOrders(memberId) {
    const targetMemberId = String(memberId || '').trim();
    if (!targetMemberId) {
      setMemberOrderRows([]);
      return;
    }
    try {
      setMemberOrderLoading(true);
      const response = await apiJson(
        `/v1/read/orders?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}&member_id=${encodeURIComponent(targetMemberId)}&limit=20`
      );
      setMemberOrderRows(Array.isArray(response?.rows) ? response.rows : []);
    } catch (err) {
      setActionFeedback(err.message || 'failed to load member orders');
    } finally {
      setMemberOrderLoading(false);
    }
  }

  async function deletePendingOrder(orderRow) {
    const orderId = String(orderRow?.order_id || '').trim();
    if (!orderId || !selectedMember?.member_id) return;
    if (String(orderRow?.payment_status || '').toLowerCase() === 'confirmed' || String(orderRow?.status || '').toLowerCase() === 'paid') {
      setActionFeedback('Order paid tidak bisa dihapus.');
      return;
    }
    if (String(orderRow?.status || '').toLowerCase() === 'deleted') {
      setActionFeedback(`Order ${orderId} sudah deleted.`);
      return;
    }
    if (!window.confirm(`Hapus order pending ${orderId}? Status akan berubah menjadi deleted.`)) return;
    try {
      setActionSaving(true);
      const response = await apiJson(`/v1/orders/${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: session?.user?.userId || session?.user?.user_id || 'cs_dashboard',
          note: `Order deleted by CS from history: ${orderId}`
        })
      });
      setMemberOrderRows((prev) => prev.map((item) => (
        String(item?.order_id || '') === orderId
          ? {
              ...item,
              status: 'deleted',
              payment_status: response?.payment_id ? 'deleted' : item.payment_status
            }
          : item
      )));
      if (editingOrderId === orderId) {
        setOrderForm({
          order_type: DEFAULT_ORDER_TYPE,
          target_key: '',
          label: '',
          qty: '1',
          unit_price: '',
          method: DEFAULT_ORDER_PAYMENT_METHOD,
          settlement: ORDER_SETTLEMENT_OPTIONS[0]?.value || '',
          notes: ''
        });
        setOrderItems([]);
        setEditingOrderId('');
        setOrderPaymentDraft(null);
        setOrderFlowStep('form');
      }
      await loadDashboard();
      await loadSelectedMemberOrders(selectedMember.member_id);
      if (response?.payment_id) {
        await loadSelectedMemberPayments(selectedMember.member_id);
      }
      setActionFeedback(`order.deleted: ${selectedMember.full_name || selectedMember.member_id} -> ${orderId}`);
    } catch (err) {
      setActionFeedback(err.message || 'failed to delete order');
    } finally {
      setActionSaving(false);
    }
  }

  function exportDailyReportCsv() {
    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadCsvFile(
      `cs-daily-report-${branchId}-${dateStamp}.csv`,
      [
        ['metric', 'value'],
        ...dailyReportRows.map((item) => [item.label, item.value])
      ]
    );
    setActionFeedback(`daily.report.exported: ${branchId} -> ${dateStamp}`);
  }

  async function openInsightDetail(insightKey) {
    if (!insightKey) return;
    if (selectedInsightKey === insightKey) {
      setSelectedInsightKey('');
      setInsightDetailRows([]);
      setInsightDetailLoading(false);
      return;
    }

    setSelectedInsightKey(insightKey);
    setInsightDetailLoading(false);

    if (insightKey === 'today_checkins') {
      setInsightDetailRows(todayCheckinDetailRows);
      return;
    }
    if (insightKey === 'today_bookings') {
      setInsightDetailRows(todayBookingDetailRows);
      return;
    }

    try {
      setInsightDetailLoading(true);
      if (insightKey === 'active_members') {
        const response = await apiJson(
          `/v1/read/subscriptions/active?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`
        );
        const rows = Array.isArray(response?.rows) ? response.rows : [];
        setInsightDetailRows(
          rows.map((item, index) => {
            const member = memberById.get(String(item?.member_id || '').trim()) || null;
            return {
              key: String(item?.subscription_id || item?.member_id || `active-${index}`),
              title: member?.full_name || item?.member_id || '-',
              badge: item?.plan_id || 'subscription',
              lines: [
                `Member ID: ${item?.member_id || '-'}`,
                `Paket: ${item?.plan_id || '-'}`,
                `Akhir aktif: ${item?.end_date || '-'}`,
                `Status: ${item?.status || 'active'}`
              ]
            };
          })
        );
        return;
      }
      if (insightKey === 'pending_payments') {
        const response = await apiJson(
          `/v1/read/payments/queue?tenant_id=${encodeURIComponent(tenantId)}&status=pending`
        );
        const rows = Array.isArray(response?.rows) ? response.rows : [];
        const filteredRows = branchId === 'core'
          ? rows
          : rows.filter((item) => String(item?.branch_id || '').trim() === String(branchId || '').trim());
        setInsightDetailRows(
          filteredRows.map((item, index) => {
            const member = memberById.get(String(item?.member_id || '').trim()) || null;
            return {
              key: String(item?.payment_id || `payment-${index}`),
              title: member?.full_name || item?.member_id || item?.payment_id || '-',
              badge: formatIdr(item?.amount || 0),
              lines: [
                `Payment ID: ${item?.payment_id || '-'}`,
                `Member ID: ${item?.member_id || '-'}`,
                `Metode: ${item?.method || '-'}`,
                `Dicatat: ${formatDateTime(item?.recorded_at)}`
              ]
            };
          })
        );
      }
    } catch (err) {
      setActionFeedback(err.message || 'failed to load insight detail');
      setInsightDetailRows([]);
    } finally {
      setInsightDetailLoading(false);
    }
  }

  function applyOrderTarget(target) {
    if (!target) return;
    setOrderForm((prev) => ({
      ...prev,
      target_key: target.key,
      label: prev.label || target.order_label,
      unit_price: String(target.unit_price || 0),
      qty: normalizeOrderType(prev.order_type) === 'product' ? prev.qty || '1' : '1'
    }));
  }

  function applyCurrentContextToOrder() {
    if (selectedExperienceType === 'class' && selectedClass) {
      const targetKey = buildOrderTargetKey('class', selectedClass.class_id);
      const matched = classOrderTargets.find((item) => item.key === targetKey) || null;
      setOrderForm((prev) => ({
        ...prev,
        order_type: 'class'
      }));
      applyOrderTarget(matched);
      return;
    }
    if (selectedExperienceType === 'event' && selectedEvent) {
      const targetKey = buildOrderTargetKey('event', selectedEvent.event_id);
      const matched = eventOrderTargets.find((item) => item.key === targetKey) || null;
      setOrderForm((prev) => ({
        ...prev,
        order_type: 'event'
      }));
      applyOrderTarget(matched);
    }
  }

  function buildCurrentOrderItemDraft() {
    const orderType = normalizeOrderType(orderForm.order_type);
    if (!selectedOrderTarget) {
      throw new Error(getOrderCopy('targetRequired'));
    }
    const qty = Math.max(1, Number(orderForm.qty || 1));
    const resolvedQty = orderType === 'product' ? qty : 1;
    const unitPrice = Math.max(0, Number(orderForm.unit_price || selectedOrderTarget.unit_price || 0));
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error(getOrderCopy('pricePositiveRequired'));
    }
    return {
      item_id: `itm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      order_type: orderType,
      order_label: selectedOrderTarget.order_label || selectedOrderTarget.label || getOrderCopy('fallbackOrderItemLabel'),
      target_label: selectedOrderTarget.label || selectedOrderTarget.order_label || getOrderCopy('fallbackOrderItemLabel'),
      helper: selectedOrderTarget.helper || '',
      qty: resolvedQty,
      unit_price: unitPrice,
      total_amount: resolvedQty * unitPrice,
      reference_type: selectedOrderTarget.reference_type || null,
      reference_id: selectedOrderTarget.reference_id || null
    };
  }

  function addCurrentItemToOrder() {
    try {
      const nextItem = buildCurrentOrderItemDraft();
      setOrderItems((prev) => [...prev, nextItem]);
      setOrderForm((prev) => ({
        ...prev,
        target_key: '',
        qty: '1',
        unit_price: '',
        label: prev.label || nextItem.order_label
      }));
      setActionFeedback(getOrderCopy('itemAddedFeedback', { label: nextItem.target_label }));
    } catch (err) {
      setActionFeedback(err.message || getOrderCopy('addItemFailed'));
    }
  }

  function removeOrderItem(itemId) {
    setOrderItems((prev) => prev.filter((item) => item.item_id !== itemId));
  }

  function openOrderEditor(orderRow) {
    if (!orderRow) return;
    const normalizedItems = Array.isArray(orderRow.order_items) && orderRow.order_items.length > 0
      ? orderRow.order_items.map((item, index) => ({
          item_id: item.item_id || `itm_${index + 1}`,
          order_type: normalizeOrderType(item.order_type),
          order_label: item.order_label || item.target_label || orderRow.order_label || getOrderCopy('fallbackOrderItemLabel'),
          target_label: item.target_label || item.order_label || orderRow.order_label || getOrderCopy('fallbackOrderItemLabel'),
          helper: '',
          qty: Number(item.qty || 1),
          unit_price: Number(item.unit_price || 0),
          total_amount: Number(item.total_amount || (Number(item.qty || 1) * Number(item.unit_price || 0)) || 0),
          reference_type: item.reference_type || null,
          reference_id: item.reference_id || null
        }))
      : [{
          item_id: `${orderRow.order_id}_1`,
          order_type: normalizeOrderType(orderRow.order_type),
          order_label: orderRow.order_label || orderRow.order_id,
          target_label: resolveOrderReferenceLabel(orderRow, orderReferenceLookups),
          helper: '',
          qty: Number(orderRow.qty || 1),
          unit_price: Number(orderRow.unit_price || 0),
          total_amount: Number(orderRow.total_amount || 0),
          reference_type: orderRow.reference_type || null,
          reference_id: orderRow.reference_id || null
        }];
    const firstItem = normalizedItems[0] || null;
    setEditingOrderId(String(orderRow.order_id || ''));
    setOrderItems(normalizedItems);
    setOrderPaymentDraft(null);
    setOrderFlowStep('form');
    setOrderForm({
      order_type: firstItem ? normalizeOrderType(firstItem.order_type) : 'membership',
      target_key: '',
      label: orderRow.order_label || '',
      qty: firstItem ? String(firstItem.qty || 1) : '1',
      unit_price: firstItem ? String(firstItem.unit_price || '') : '',
      method: orderRow.payment_method || 'cash',
      settlement: String(orderRow.payment_status || '').toLowerCase() === 'confirmed' ? 'paid' : 'pending',
      notes: orderRow.notes || ''
    });
    setMemberWorkspaceTab('order');
    setActionFeedback(getOrderCopy('editOrderFeedback', { orderId: orderRow.order_id }));
  }

  function buildOrderSubmissionDraft() {
    if (!selectedMember) {
      throw new Error(getOrderCopy('memberRequired'));
    }
    const resolvedItems = orderItems.length > 0 ? orderItems : [buildCurrentOrderItemDraft()];
    const uniqueOrderTypes = [...new Set(resolvedItems.map((item) => normalizeOrderType(item.order_type)))];
    const orderType = uniqueOrderTypes.length === 1 ? uniqueOrderTypes[0] : 'bundle';
    const label = String(orderForm.label || '').trim()
      || (resolvedItems.length === 1
        ? resolvedItems[0].order_label
        : getOrderCopy('bundleLabel', {
            member: selectedMember.full_name || selectedMember.member_id,
            count: resolvedItems.length
          }));
    if (!label) {
      throw new Error(getOrderCopy('labelRequired'));
    }
    const totalQty = resolvedItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const totalAmount = resolvedItems.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
    const primaryItem = resolvedItems.length === 1 ? resolvedItems[0] : null;
    const paymentMethod = orderForm.method || 'cash';
    const paymentSettlement = orderForm.settlement || 'pending';
    return {
      requestBody: {
        tenant_id: tenantId,
        branch_id: branchId,
        member_id: selectedMember.member_id,
        order_label: label,
        order_type: orderType,
        qty: primaryItem ? primaryItem.qty : totalQty,
        unit_price: primaryItem ? primaryItem.unit_price : totalAmount,
        currency: 'IDR',
        payment_method: paymentMethod,
        payment_settlement: paymentSettlement,
        reference_type: primaryItem?.reference_type || null,
        reference_id: primaryItem?.reference_id || null,
        items: resolvedItems.map((item) => ({
          item_id: item.item_id,
          order_type: item.order_type,
          order_label: item.order_label,
          target_label: item.target_label,
          qty: item.qty,
          unit_price: item.unit_price,
          reference_type: item.reference_type,
          reference_id: item.reference_id
        })),
        notes: String(orderForm.notes || '').trim() || getOrderCopy('defaultOrderNotes', {
          member: selectedMember.full_name || selectedMember.member_id
        })
      },
      summary: {
        memberName: selectedMember.full_name || selectedMember.member_id,
        orderTypeLabel: formatOrderTypeLabel(orderType),
        targetLabel: resolvedItems.length === 1
          ? resolvedItems[0].target_label
          : getOrderCopy('multiItemCountLabel', { count: resolvedItems.length }),
        referenceLabel: resolvedItems.length === 1
          ? resolveOrderReferenceLabel(
              {
                order_type: orderType,
                reference_type: resolvedItems[0].reference_type,
                reference_id: resolvedItems[0].reference_id
              },
              orderReferenceLookups
            )
          : getOrderCopy('multiItemBundleLabel'),
        qty: totalQty,
        unitPrice: primaryItem ? primaryItem.unit_price : totalAmount,
        totalAmount,
        paymentMethod,
        paymentSettlement,
        notes: String(orderForm.notes || '').trim(),
        items: resolvedItems
      }
    };
  }

  function continueOrderToPayment() {
    try {
      setActionFeedback('');
      const draft = buildOrderSubmissionDraft();
      setOrderPaymentDraft(draft);
      setOrderFlowStep('payment');
    } catch (err) {
      setActionFeedback(err.message || getOrderCopy('preparePaymentFailed'));
    }
  }

  async function submitOrder() {
    const draft = orderPaymentDraft || (() => {
      try {
        return buildOrderSubmissionDraft();
      } catch (err) {
        setActionFeedback(err.message || getOrderCopy('createOrderFailed'));
        return null;
      }
    })();
    if (!draft) return;
    try {
      setOrderSaving(true);
      setActionFeedback('');
      let response = null;
      if (editingOrderId) {
        response = await apiJson(`/v1/orders/${encodeURIComponent(editingOrderId)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...draft.requestBody,
            payment_settlement: 'pending'
          })
        });
        if (orderForm.settlement === 'paid') {
          await apiJson(`/v1/payments/${encodeURIComponent(response?.payment_id || draft.requestBody.payment_id || '')}/confirm`, {
            method: 'POST',
            body: JSON.stringify({
              tenant_id: tenantId,
              branch_id: branchId,
              order_id: editingOrderId,
              actor_id: session?.user?.userId || session?.user?.user_id || 'cs_dashboard',
              note: getOrderCopy('paymentConfirmNote', { label: draft.requestBody.order_label })
            })
          });
        }
      } else {
        response = await apiJson('/v1/orders', {
          method: 'POST',
          body: JSON.stringify(draft.requestBody)
        });
      }
      await loadDashboard();
      await loadSelectedMemberOrders(selectedMember.member_id);
      await loadSelectedMemberPayments(selectedMember.member_id);
      setOrderForm({
        order_type: DEFAULT_ORDER_TYPE,
        target_key: '',
        label: '',
        qty: '1',
        unit_price: '',
        method: DEFAULT_ORDER_PAYMENT_METHOD,
        settlement: ORDER_SETTLEMENT_OPTIONS[0]?.value || '',
        notes: ''
      });
      setOrderItems([]);
      setEditingOrderId('');
      setOrderPaymentDraft(null);
      setOrderFlowStep('form');
      setActionFeedback(
        editingOrderId
          ? getOrderCopy('orderUpdatedFeedback', {
              member: selectedMember.full_name || selectedMember.member_id,
              orderId: editingOrderId,
              status: orderForm.settlement === 'paid' ? 'confirmed' : 'pending'
            })
          : getOrderCopy('orderCreatedFeedback', {
              member: selectedMember.full_name || selectedMember.member_id,
              orderId: response?.order?.order_id || '-',
              status: response?.order?.payment_status || 'pending'
            })
      );
    } catch (err) {
      setActionFeedback(err.message || getOrderCopy('createOrderFailed'));
    } finally {
      setOrderSaving(false);
    }
  }

  async function submitQuickMemberCreate(e) {
    e.preventDefault();
    const fullNameInput = String(memberCreateForm.full_name || '').trim();
    const phoneInput = String(memberCreateForm.phone || '').trim();
    const emailInput = String(memberCreateForm.email || '').trim().toLowerCase();
    const idCardInput = String(memberCreateForm.id_card || '').trim();
    if (!fullNameInput || !phoneInput || !emailInput || !idCardInput) {
      setMemberCreateNoticeTone('error');
      setMemberCreateNotice('Lengkapi nama, no. HP, email, dan ID card sebelum membuat member.');
      return;
    }

    const memberId = createCsMemberId();
    try {
      setMemberCreateSaving(true);
      setMemberCreateNotice('');
      await apiJson('/v1/members/register', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: session?.user?.userId || session?.user?.user_id || 'cs_dashboard',
          member_id: memberId,
          full_name: fullNameInput,
          phone: phoneInput,
          email: emailInput,
          id_card: idCardInput,
          status: 'active'
        })
      });
      await loadDashboard();
      setSelectedMemberId(memberId);
      setMemberWorkspaceTab('profile');
      setSearchBy('full_name');
      setQuery(fullNameInput);
      setMemberCreateMode(false);
      setMemberCreateForm({
        full_name: '',
        phone: '',
        email: '',
        id_card: ''
      });
      setMemberCreateNoticeTone('feedback');
      setMemberCreateNotice(`Member berhasil dibuat: ${fullNameInput} -> ${memberId}. Member siap dipakai untuk order.`);
    } catch (err) {
      setMemberCreateNoticeTone('error');
      setMemberCreateNotice(formatMemberCreateError(err));
    } finally {
      setMemberCreateSaving(false);
    }
  }

  async function submitMemberProfileUpdate(e) {
    e.preventDefault();
    if (!selectedMember) return;
    try {
      setMemberProfileSaving(true);
      setActionFeedback('');
      await apiJson(`/v1/members/${encodeURIComponent(selectedMember.member_id)}/update`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: session?.user?.userId || session?.user?.user_id || 'cs_dashboard',
          full_name: String(memberProfileForm.full_name || '').trim(),
          phone: String(memberProfileForm.phone || '').trim(),
          email: String(memberProfileForm.email || '').trim().toLowerCase(),
          status: String(memberProfileForm.status || 'active').trim().toLowerCase()
        })
      });
      await loadDashboard();
      setActionFeedback(`member.updated: ${selectedMember.member_id}`);
    } catch (err) {
      setActionFeedback(formatMemberProfileError(err));
    } finally {
      setMemberProfileSaving(false);
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

  useEffect(() => {
    loadSelectedMemberOrders(selectedMemberId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMemberId, tenantId, branchId]);

  useEffect(() => {
    loadSelectedMemberPayments(selectedMemberId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMemberId, tenantId, branchId]);

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
  const membershipOrderTargets = useMemo(() => {
    return packages
      .filter((item) => String(item?.package_type || '').trim().toLowerCase() === 'membership')
      .map((item) => ({
        key: buildOrderTargetKey('package', item.package_id),
        source_kind: 'package',
        source_id: String(item.package_id || ''),
        label: item.package_name || item.package_id || 'Membership Package',
        helper: `${Number(item.max_months || item.duration_months || 1)} bulan`,
        unit_price: Number(item.price || 0),
        reference_type: 'membership_purchase',
        reference_id: item.package_id || null,
        order_label: `Membership - ${item.package_name || item.package_id}`
      }));
  }, [packages]);
  const eventOrderTargets = useMemo(() => (
    activeEvents.map((item) => ({
      key: buildOrderTargetKey('event', item.event_id),
      source_kind: 'event',
      source_id: String(item.event_id || ''),
      label: item.event_name || item.event_id || 'Event',
      helper: item.location || item.status || 'event',
      unit_price: Number(item.price || 0),
      reference_type: 'event_registration',
      reference_id: item.event_id || null,
      order_label: `Event - ${item.event_name || item.event_id}`
    }))
  ), [activeEvents]);
  const classOrderTargets = useMemo(() => {
    const packageTargets = packages
      .filter((item) => String(item?.package_type || '').trim().toLowerCase() === 'class')
      .map((item) => ({
        key: buildOrderTargetKey('package', item.package_id),
        source_kind: 'package',
        source_id: String(item.package_id || ''),
        label: item.package_name || item.class_name || item.package_id || 'Program Package',
        helper: [
          item.class_name || 'activity program',
          item.session_count ? `${item.session_count} sesi` : '',
          item.max_months || item.duration_months ? `${Number(item.max_months || item.duration_months || 1)} bulan` : ''
        ].filter(Boolean).join(' • '),
        unit_price: Number(item.price || 0),
        reference_type: 'session_pack_purchase',
        reference_id: item.package_id || null,
        order_label: `Program - ${item.package_name || item.class_name || item.package_id}`
      }));
    const activityTargets = classes
      .filter((item) => {
        const classType = String(item?.class_type || 'scheduled').trim().toLowerCase();
        return ['scheduled', 'open_access', 'activity', 'session_pack'].includes(classType);
      })
      .map((item) => ({
        key: buildOrderTargetKey(
          String(item?.class_type || 'scheduled').trim().toLowerCase() === 'scheduled' ? 'class' : 'activity',
          item.class_id
        ),
        source_kind: String(item?.class_type || 'scheduled').trim().toLowerCase() === 'scheduled' ? 'class' : 'activity',
        source_id: String(item.class_id || ''),
        label: item.class_name || item.class_id || 'Program',
        helper: String(item?.class_type || 'scheduled').trim().toLowerCase() === 'scheduled'
          ? (item.trainer_name || item.branch_id || 'program')
          : 'activity program',
        unit_price: Number(item.price || 0),
        reference_type: String(item?.class_type || 'scheduled').trim().toLowerCase() === 'scheduled'
          ? 'class_booking'
          : 'open_access_purchase',
        reference_id: item.class_id || null,
        order_label: `Program - ${item.class_name || item.class_id}`
      }));
    return [...packageTargets, ...activityTargets];
  }, [classes, packages]);
  const ptOrderTargets = useMemo(() => (
    packages
      .filter((item) => String(item?.package_type || '').trim().toLowerCase() === 'pt')
      .map((item) => ({
        key: buildOrderTargetKey('package', item.package_id),
        source_kind: 'package',
        source_id: String(item.package_id || ''),
        label: item.package_name || item.package_id || 'PT Package',
        helper: [
          item.trainer_name || 'personal trainer',
          item.session_count ? `${item.session_count} sesi` : '',
          item.max_months || item.duration_months ? `${Number(item.max_months || item.duration_months || 1)} bulan` : ''
        ].filter(Boolean).join(' • '),
        unit_price: Number(item.price || 0),
        reference_type: 'pt_package_purchase',
        reference_id: item.package_id || null,
        order_label: `PT - ${item.package_name || item.package_id}`
      }))
  ), [packages]);
  const productOrderTargets = useMemo(() => (
    products.map((item) => ({
      key: buildOrderTargetKey('product', item.product_id),
      source_kind: 'product',
      source_id: String(item.product_id || ''),
      label: item.product_name || item.product_id || 'Product',
      helper: item.category || 'product',
      unit_price: Number(item.price || 0),
      reference_type: 'product',
      reference_id: item.product_id || null,
      order_label: `Product - ${item.product_name || item.product_id}`
    }))
  ), [products]);
  const orderTargetCollections = useMemo(() => ({
    membership: membershipOrderTargets,
    event: eventOrderTargets,
    class: classOrderTargets,
    pt: ptOrderTargets,
    product: productOrderTargets
  }), [membershipOrderTargets, eventOrderTargets, classOrderTargets, ptOrderTargets, productOrderTargets]);
  const currentOrderTargets = useMemo(() => {
    const orderType = normalizeOrderType(orderForm.order_type);
    const orderTypeConfig = getConfiguredOption(DASHBOARD_ORDER_CONFIG, 'orderTypes', orderType);
    return orderTargetCollections[orderTypeConfig?.targetCollection] || [];
  }, [orderForm.order_type, orderTargetCollections]);
  const selectedOrderTarget = useMemo(
    () => currentOrderTargets.find((item) => item.key === orderForm.target_key) || null,
    [currentOrderTargets, orderForm.target_key]
  );
  const purchasedProgramSourceIds = useMemo(() => {
    const allowedReferenceTypes = new Set([
      'class_booking',
      'open_access_purchase',
      'activity_purchase',
      'session_pack_purchase',
      'membership_purchase'
    ]);
    const packageClassIdByPackageId = new Map(
      packages
        .map((item) => [String(item?.package_id || '').trim(), String(item?.class_id || '').trim()])
        .filter(([packageId, classId]) => packageId && classId)
    );
    const ids = new Set();
    memberOrderRows.forEach((order) => {
      const status = String(order?.status || '').trim().toLowerCase();
      const paymentStatus = String(order?.payment_status || '').trim().toLowerCase();
      const isPurchased = status === 'paid' || paymentStatus === 'confirmed';
      if (!isPurchased) return;
      const items = Array.isArray(order?.order_items) && order.order_items.length > 0
        ? order.order_items
        : [order];
      items.forEach((item) => {
        const referenceType = String(item?.reference_type || '').trim().toLowerCase();
        const referenceId = String(item?.reference_id || '').trim();
        if (!referenceId || !allowedReferenceTypes.has(referenceType)) return;
        if (referenceType === 'membership_purchase') {
          const mappedClassId = packageClassIdByPackageId.get(referenceId);
          if (mappedClassId) ids.add(mappedClassId);
          return;
        }
        ids.add(referenceId);
      });
    });
    return ids;
  }, [memberOrderRows, packages]);
  const purchasedEventSourceIds = useMemo(() => {
    const ids = new Set();
    memberOrderRows.forEach((order) => {
      const status = String(order?.status || '').trim().toLowerCase();
      const paymentStatus = String(order?.payment_status || '').trim().toLowerCase();
      const isPurchased = status === 'paid' || paymentStatus === 'confirmed';
      if (!isPurchased) return;
      const items = Array.isArray(order?.order_items) && order.order_items.length > 0
        ? order.order_items
        : [order];
      items.forEach((item) => {
        const referenceType = String(item?.reference_type || '').trim().toLowerCase();
        const referenceId = String(item?.reference_id || '').trim();
        const orderType = normalizeOrderType(item?.order_type || order?.order_type);
        const isEventOrder = referenceType === 'event_registration' || orderType === 'event';
        if (!isEventOrder || !referenceId) return;
        ids.add(referenceId);
      });
    });
    return ids;
  }, [memberOrderRows]);
  const checkinEventTargets = useMemo(
    () => eventOrderTargets.filter((item) => purchasedEventSourceIds.has(String(item?.source_id || '').trim())),
    [eventOrderTargets, purchasedEventSourceIds]
  );
  const checkinClassTargets = useMemo(
    () => classOrderTargets
      .filter((item) => item.source_kind === 'class' || item.source_kind === 'activity')
      .filter((item) => purchasedProgramSourceIds.has(String(item?.source_id || '').trim())),
    [classOrderTargets, purchasedProgramSourceIds]
  );
  const currentCheckinTargets = useMemo(() => {
    if (selectedExperienceType === 'class') return checkinClassTargets;
    return checkinEventTargets;
  }, [checkinClassTargets, checkinEventTargets, selectedExperienceType]);
  const selectedCheckinTarget = useMemo(
    () => currentCheckinTargets.find((item) => String(item.source_id || '') === String(selectedExperienceId || '')) || null,
    [currentCheckinTargets, selectedExperienceId]
  );
  const orderReferenceLookups = useMemo(() => {
    const packagesById = new Map(
      packages
        .map((item) => [String(item?.package_id || ''), item.package_name || item.class_name || item.package_id || '-'])
        .filter(([id]) => Boolean(id))
    );
    return {
      packagesById,
      eventsById: new Map(activeEvents.map((item) => [String(item.event_id || ''), item.event_name || item.event_id || '-'])),
      classesById: new Map(classes.map((item) => [String(item.class_id || ''), item.class_name || item.class_id || '-'])),
      productsById: new Map(products.map((item) => [String(item.product_id || ''), item.product_name || item.product_id || '-']))
    };
  }, [packages, activeEvents, classes, products]);

  useEffect(() => {
    if (memberWorkspaceTab === 'order') return;
    setOrderFlowStep('form');
    setOrderPaymentDraft(null);
    setOrderItems([]);
    setEditingOrderId('');
  }, [selectedMemberId, memberWorkspaceTab]);

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
          events.map((eventItem) =>
            apiJson(
              `/v1/admin/events/${encodeURIComponent(eventItem.event_id)}/participants?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}&limit=500`
            ).catch(() => ({ rows: [] }))
          )
        );
        const eventRows = [];
        eventParticipantResponses.forEach((response, index) => {
          const eventItem = events[index];
          (response.rows || []).forEach((participant, participantIndex) => {
            const linkedMember = memberById.get(String(participant?.member_id || '').trim())
              || memberByEmail.get(toLowerText(participant?.email))
              || null;
            eventRows.push({
              key: `event:${eventItem?.event_id || 'unknown'}:${participant?.registration_id || participant?.email || participant?.passport_id || participantIndex}`,
              source_kind: 'event',
              source_id: eventItem?.event_id || '',
              source_name: eventItem?.event_name || 'Event',
              member_id: String(participant?.member_id || linkedMember?.member_id || '').trim(),
              full_name: participant?.full_name || linkedMember?.full_name || '',
              phone: linkedMember?.phone || '',
              email: participant?.email || linkedMember?.email || '',
              status: participant?.checked_out_at ? 'checked_out' : participant?.checked_in_at ? 'checked_in' : 'registered',
              participant_no: participant?.participant_no || '',
              registration_id: participant?.registration_id || '',
              passport_id: participant?.passport_id || '',
              checked_in_at: participant?.checked_in_at || '',
              checked_out_at: participant?.checked_out_at || ''
            });
          });
        });

        const classBookingResponses = await Promise.all(
          classes.map((classItem) =>
            apiJson(
              `/v1/read/bookings?tenant_id=${encodeURIComponent(tenantId)}&class_id=${encodeURIComponent(classItem.class_id)}`
            ).catch(() => ({ rows: [] }))
          )
        );
        const classRows = [];
        classBookingResponses.forEach((response, index) => {
          const classItem = classes[index];
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
              passport_id: '',
              booked_at: booking?.booked_at || '',
              checked_in_at: booking?.attendance_checked_in_at || booking?.attendance_confirmed_at || '',
              checked_out_at: booking?.attendance_checked_out_at || ''
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
  }, [tenantId, branchId, events, classes, members]);

  const stats = useMemo(
    () => [
      {
        key: 'active_members',
        label: copy.statsActiveMembers,
        value: dashboardRow?.active_subscription_count ?? 0,
        iconClass: 'fa-solid fa-id-card',
        tone: 'tone-subscription',
        hint: `${copy.statsActiveMembersHint} • ${copy.statsDetailHint}`
      },
      {
        key: 'today_checkins',
        label: copy.statsCheckins,
        value: dashboardRow?.today_checkin_count ?? 0,
        iconClass: 'fa-solid fa-door-open',
        tone: 'tone-checkin',
        hint: `${copy.statsCheckinsHint} • ${copy.statsDetailHint}`
      },
      {
        key: 'today_bookings',
        label: copy.statsBookings,
        value: dashboardRow?.today_booking_count ?? 0,
        iconClass: 'fa-solid fa-calendar-check',
        tone: 'tone-booking',
        hint: `${copy.statsBookingsHint} • ${copy.statsDetailHint}`
      },
      {
        key: 'pending_payments',
        label: copy.statsPayments,
        value: dashboardRow?.pending_payment_count ?? 0,
        iconClass: 'fa-solid fa-money-bill',
        tone: 'tone-payment',
        hint: `${copy.statsPaymentsHint} • ${copy.statsDetailHint}`
      }
    ],
    [
      copy.statsActiveMembers,
      copy.statsActiveMembersHint,
      copy.statsBookings,
      copy.statsBookingsHint,
      copy.statsCheckins,
      copy.statsCheckinsHint,
      copy.statsPayments,
      copy.statsPaymentsHint,
      copy.statsDetailHint,
      dashboardRow
    ]
  );

  const searchSource = members;
  const memberById = useMemo(() => (
    new Map(
      searchSource
        .map((member) => [String(member?.member_id || '').trim(), member])
        .filter(([memberId]) => memberId)
    )
  ), [searchSource]);
  const selectedMember = useMemo(
    () => searchSource.find((member) => String(member.member_id || '') === String(selectedMemberId || '')) || null,
    [searchSource, selectedMemberId]
  );

  useEffect(() => {
    let cancelled = false;
    async function refreshSelectedMemberHistory() {
      if (!selectedMember) {
        setMemberHistoryRows([]);
        setMemberHistoryLoading(false);
        return;
      }
      try {
        setMemberHistoryLoading(true);
        const rows = await loadSelectedMemberHistory(selectedMember);
        if (cancelled) return;
        setMemberHistoryRows(rows);
      } catch (err) {
        if (cancelled) return;
        setActionFeedback(err.message || 'failed to load member history');
        setMemberHistoryRows([]);
      } finally {
        if (!cancelled) setMemberHistoryLoading(false);
      }
    }
    refreshSelectedMemberHistory();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMember, tenantId, events, classes]);

  useEffect(() => {
    if (!selectedMemberId) return;
    loadMemberHistoryOverrides(selectedMemberId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMemberId, tenantId, branchId]);

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
        status: row.status || '',
        booked_at: row.booked_at || '',
        checked_in_at: row.checked_in_at || '',
        checked_out_at: row.checked_out_at || ''
      };
      const list = attachmentMap.get(memberId) || [];
      if (!list.some((attached) => attached.kind === item.kind && attached.source_id === item.source_id)) {
        list.push(item);
      }
      attachmentMap.set(memberId, list);
    });
    return attachmentMap;
  }, [searchSource, participantSearchRows]);

  const memberCardExperienceMap = useMemo(() => {
    const mapped = new Map();
    searchSource.forEach((member) => {
      const memberId = String(member?.member_id || '').trim();
      if (!memberId) return;
      const attachments = memberAttachmentMap.get(memberId) || [];
      mapped.set(
        memberId,
        attachments.map((item) => ({
          ...item,
          is_linked: true,
          linked_status: item?.status || ''
        }))
      );
    });
    return mapped;
  }, [searchSource, memberAttachmentMap]);
  const selectedMemberExperiences = useMemo(() => {
    if (!selectedMember) return [];
    const memberId = String(selectedMember.member_id || '').trim();
    const linkedRows = memberCardExperienceMap.get(memberId) || [];
    const overrideRows = memberHistoryOverrides.filter((item) => String(item?.member_id || '').trim() === memberId);
    const merged = [...overrideRows, ...linkedRows];
    const deduped = [];
    const seen = new Set();
    merged.forEach((item) => {
      const dedupeKey = `${String(item?.kind || '').trim()}:${String(item?.source_id || '').trim()}:${String(item?.registration_id || '').trim() || String(item?.participant_no || '').trim() || String(item?.source_name || '').trim()}`;
      if (!dedupeKey || seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      deduped.push(item);
    });
    return deduped;
  }, [memberCardExperienceMap, memberHistoryOverrides, selectedMember]);
  const selectedMemberEventLinks = useMemo(
    () => selectedMemberExperiences.filter((item) => item.kind === 'event'),
    [selectedMemberExperiences]
  );
  const selectedMemberClassLinks = useMemo(
    () => selectedMemberExperiences.filter((item) => item.kind === 'class'),
    [selectedMemberExperiences]
  );
  const selectedMemberPurchasedClassLinks = useMemo(
    () => selectedMemberClassLinks.filter((item) => purchasedProgramSourceIds.has(String(item?.source_id || '').trim())),
    [purchasedProgramSourceIds, selectedMemberClassLinks]
  );
  const selectedMemberHistoryRowsAll = useMemo(() => {
    const memberId = String(selectedMember?.member_id || '').trim();
    const overrideRows = memberHistoryOverrides.filter((item) => String(item?.member_id || '').trim() === memberId);
    return mergeMemberHistoryRows(overrideRows, memberHistoryRows);
  }, [memberHistoryOverrides, memberHistoryRows, selectedMember]);
  const selectedMemberHistoryRows = useMemo(() => (
    selectedMemberHistoryRowsAll.filter((row) => {
      if (!(row?.checked_in_at || row?.checked_out_at)) return false;
      const isMembershipDraftCheckin = String(row?.kind || '').trim() === 'class'
        && String(row?.registration_id || '').trim().startsWith('chk_')
        && !row?.checked_out_at;
      return !isMembershipDraftCheckin;
    })
  ), [selectedMemberHistoryRowsAll]);

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
  const selectedClassBookingForMember = useMemo(() => {
    if (!selectedMember || !selectedClass) return null;
    return classBookings.find((booking) => isSameBookingMember(selectedMember, booking)) || null;
  }, [classBookings, selectedClass, selectedMember]);
  const selectedClassType = useMemo(
    () => String(selectedClass?.class_type || 'scheduled').trim().toLowerCase(),
    [selectedClass]
  );
  const selectedClassIsMembershipMode = useMemo(() => (
    selectedClassType === 'open_access'
  ), [selectedClassType]);
  const selectedEventParticipantForMember = useMemo(() => {
    if (!selectedMember || !selectedEvent) return null;
    const selectedEventId = String(selectedEvent?.event_id || '').trim();
    const selectedEventLinks = selectedMemberEventLinks.filter(
      (item) => String(item?.source_id || '').trim() === selectedEventId
    );

    const registrationIdCandidates = new Set(
      selectedEventLinks
        .map((item) => String(item?.registration_id || '').trim())
        .filter(Boolean)
    );
    if (registrationIdCandidates.size > 0) {
      const matchedByRegistration = eventParticipants.find((participant) =>
        registrationIdCandidates.has(String(participant?.registration_id || '').trim())
      );
      if (matchedByRegistration) return matchedByRegistration;
    }

    const participantNoCandidates = new Set(
      selectedEventLinks
        .map((item) => String(item?.participant_no || '').trim())
        .filter(Boolean)
    );
    if (participantNoCandidates.size > 0) {
      const matchedByParticipantNo = eventParticipants.find((participant) =>
        participantNoCandidates.has(String(participant?.participant_no || '').trim())
      );
      if (matchedByParticipantNo) return matchedByParticipantNo;
    }

    return eventParticipants.find((participant) => isSameParticipant(selectedMember, participant)) || null;
  }, [eventParticipants, selectedEvent, selectedMember, selectedMemberEventLinks]);
  const selectedEventLatestHistoryRow = useMemo(() => {
    if (!selectedMember || !selectedEvent) return null;
    const selectedEventId = String(selectedEvent.event_id || '').trim();
    const rows = selectedMemberHistoryRowsAll
      .filter((row) => String(row?.kind || '').trim() === 'event')
      .filter((row) => String(row?.source_id || '').trim() === selectedEventId);
    return rows[0] || null;
  }, [selectedEvent, selectedMember, selectedMemberHistoryRowsAll]);
  const selectedEventCanCheckout = useMemo(() => (
    Boolean(selectedEventLatestHistoryRow?.checked_in_at) && !selectedEventLatestHistoryRow?.checked_out_at
  ), [selectedEventLatestHistoryRow]);
  const selectedMembershipLatestHistoryRow = useMemo(() => {
    if (!selectedMember || !selectedClass) return null;
    const selectedClassId = String(selectedClass.class_id || '').trim();
    const rows = selectedMemberHistoryRowsAll
      .filter((row) => String(row?.kind || '').trim() === 'class')
      .filter((row) => String(row?.source_id || '').trim() === selectedClassId)
      .filter((row) => String(row?.registration_id || '').trim().startsWith('chk_'));
    return rows[0] || null;
  }, [selectedClass, selectedMember, selectedMemberHistoryRowsAll]);
  const selectedMembershipCanCheckout = useMemo(() => (
    Boolean(selectedMembershipLatestHistoryRow?.checked_in_at) && !selectedMembershipLatestHistoryRow?.checked_out_at
  ), [selectedMembershipLatestHistoryRow]);
  const dailyReportRows = useMemo(() => {
    const reportDate = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    return [
      { label: 'Tanggal report', value: reportDate },
      { label: 'Check-in hari ini', value: String(dashboardRow?.today_checkin_count ?? 0) },
      { label: 'Booking hari ini', value: String(dashboardRow?.today_booking_count ?? 0) },
      { label: 'Pending payment', value: String(dashboardRow?.pending_payment_count ?? 0) },
      { label: 'Event aktif', value: String(activeEvents.length) },
      { label: 'Program aktif', value: String(activeClasses.length) }
    ];
  }, [activeClasses.length, activeEvents.length, dashboardRow]);
  const todayDateKey = useMemo(() => toLocalDateKey(new Date()), []);
  const todayCheckinDetailRows = useMemo(() => {
    return participantSearchRows
      .filter((row) => toLocalDateKey(row.checked_in_at) === todayDateKey)
      .sort((a, b) => new Date(b.checked_in_at || 0).getTime() - new Date(a.checked_in_at || 0).getTime())
      .map((row) => ({
        key: `${row.key}:checkin`,
        title: row.full_name || row.member_id || row.email || '-',
        badge: row.source_kind === 'class' ? 'Program' : 'Event',
        lines: [
          `Sumber: ${row.source_name || '-'}`,
          `Member ID: ${row.member_id || '-'}`,
          `Kontak: ${row.phone || row.email || '-'}`,
          `Check-in: ${formatDateTime(row.checked_in_at)}`
        ]
      }));
  }, [participantSearchRows, todayDateKey]);
  const todayBookingDetailRows = useMemo(() => {
    return participantSearchRows
      .filter((row) => row.source_kind === 'class' && toLocalDateKey(row.booked_at) === todayDateKey)
      .sort((a, b) => new Date(b.booked_at || 0).getTime() - new Date(a.booked_at || 0).getTime())
      .map((row) => ({
        key: `${row.key}:booking`,
        title: row.full_name || row.member_id || row.email || '-',
        badge: row.status || 'booked',
        lines: [
          `Program: ${row.source_name || '-'}`,
          `Member ID: ${row.member_id || '-'}`,
          `Booking ID: ${row.registration_id || '-'}`,
          `Dibuat: ${formatDateTime(row.booked_at)}`
        ]
      }));
  }, [participantSearchRows, todayDateKey]);
  const insightDetailConfig = useMemo(() => ({
    active_members: {
      title: copy.activeMembersDetailTitle,
      empty: copy.activeMembersDetailEmpty
    },
    today_checkins: {
      title: copy.todayCheckinsDetailTitle,
      empty: copy.todayCheckinsDetailEmpty
    },
    today_bookings: {
      title: copy.todayBookingsDetailTitle,
      empty: copy.todayBookingsDetailEmpty
    },
    pending_payments: {
      title: copy.pendingPaymentsDetailTitle,
      empty: copy.pendingPaymentsDetailEmpty
    }
  }), [
    copy.activeMembersDetailEmpty,
    copy.activeMembersDetailTitle,
    copy.pendingPaymentsDetailEmpty,
    copy.pendingPaymentsDetailTitle,
    copy.todayBookingsDetailEmpty,
    copy.todayBookingsDetailTitle,
    copy.todayCheckinsDetailEmpty,
    copy.todayCheckinsDetailTitle
  ]);
  const activeInsightMeta = selectedInsightKey ? insightDetailConfig[selectedInsightKey] || null : null;

  useEffect(() => {
    setBookingRegistrationAnswers({});
  }, [selectedClass?.class_id]);

  useEffect(() => {
    if (!selectedMember) {
      setMemberWorkspaceTab('profile');
      setMemberProfileForm({
        full_name: '',
        phone: '',
        email: '',
        status: 'active'
      });
      return;
    }
    setMemberProfileForm({
      full_name: selectedMember.full_name || '',
      phone: selectedMember.phone || '',
      email: selectedMember.email || '',
      status: selectedMember.status || 'active'
    });
  }, [selectedMember]);

  useEffect(() => {
    if (!selectedMember) return;
    if (memberWorkspaceTab !== 'checkin' && memberWorkspaceTab !== 'checkout') return;

    if (isMultiBranchPlan) {
      const hasSelectedEvent = selectedExperienceType === 'event'
        && checkinEventTargets.some((item) => String(item.source_id || '') === String(selectedExperienceId || ''));
      const hasSelectedClass = selectedExperienceType === 'class'
        && checkinClassTargets.some((item) => String(item.source_id || '') === String(selectedExperienceId || ''));
      if (hasSelectedEvent || hasSelectedClass) return;

      const firstEvent = selectedMemberEventLinks.find((item) =>
        checkinEventTargets.some((target) => String(target.source_id || '') === String(item.source_id || ''))
      ) || checkinEventTargets[0] || null;
      const firstClass = selectedMemberPurchasedClassLinks[0] || checkinClassTargets[0] || null;
      if (selectedExperienceType === 'class' && firstClass) {
        setSelectedExperienceId(firstClass.source_id);
        return;
      }
      if (selectedExperienceType === 'event' && firstEvent) {
        setSelectedExperienceId(firstEvent.source_id);
        return;
      }
      if (firstEvent) {
        setSelectedExperienceType('event');
        setSelectedExperienceId(firstEvent.source_id);
        return;
      }
      if (firstClass) {
        setSelectedExperienceType('class');
        setSelectedExperienceId(firstClass.source_id);
        return;
      }
      setSelectedExperienceId('');
      return;
    }

    const hasSelectedEvent = selectedExperienceType === 'event'
      && checkinEventTargets.some((item) => String(item.source_id || '') === String(selectedExperienceId || ''));
    const hasSelectedClass = selectedExperienceType === 'class'
      && checkinClassTargets.some((item) => String(item.source_id || '') === String(selectedExperienceId || ''));
    if (hasSelectedEvent || hasSelectedClass) return;

    const firstEvent = checkinEventTargets[0] || null;
    const firstClass = checkinClassTargets[0] || null;
    if (firstEvent) {
      setSelectedExperienceType('event');
      setSelectedExperienceId(firstEvent.source_id);
      return;
    }
    if (firstClass) {
      setSelectedExperienceType('class');
      setSelectedExperienceId(firstClass.source_id);
      return;
    }
    setSelectedExperienceId('');
  }, [
    checkinClassTargets,
    checkinEventTargets,
    isMultiBranchPlan,
    memberWorkspaceTab,
    selectedExperienceId,
    selectedExperienceType,
    selectedMember,
    selectedMemberPurchasedClassLinks,
    selectedMemberEventLinks
  ]);

  useEffect(() => {
    if (selectedInsightKey === 'today_checkins') {
      setInsightDetailRows(todayCheckinDetailRows);
    }
    if (selectedInsightKey === 'today_bookings') {
      setInsightDetailRows(todayBookingDetailRows);
    }
  }, [selectedInsightKey, todayBookingDetailRows, todayCheckinDetailRows]);

  function clearMemberScopedFilter() {
    setMemberScopedFilter(null);
    setEventParticipantQuery('');
    setActionFeedback('');
  }

  function focusMember(memberId, nextTab = 'profile') {
    setSelectedMemberId(memberId);
    setMemberWorkspaceTab(nextTab);
    setMemberScopedFilter(null);
    setActionFeedback('');
    setMemberCreateNotice('');
  }

  function resetMemberFocus() {
    setSelectedMemberId('');
    setMemberWorkspaceTab('profile');
    setMemberScopedFilter(null);
    setSelectedExperienceType('event');
    setSelectedExperienceId('');
    setEventParticipantQuery('');
    setActionFeedback('');
  }

  function selectFocusedMemberExperience(kind, sourceId) {
    setSelectedExperienceType(kind);
    setSelectedExperienceId(sourceId);
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

  function upsertParticipantSearchRow(nextRow) {
    const rowKey = String(nextRow?.key || '').trim();
    if (!rowKey) return;
    setParticipantSearchRows((prev) => {
      let found = false;
      const updated = prev.map((row) => {
        if (String(row?.key || '').trim() !== rowKey) return row;
        found = true;
        return { ...row, ...nextRow };
      });
      return found ? updated : [nextRow, ...prev];
    });
  }

  function upsertMemberHistoryOverride(nextRow) {
    const rowKey = String(nextRow?.key || '').trim();
    const memberId = String(nextRow?.member_id || '').trim();
    if (!rowKey || !memberId) return;
    setMemberHistoryOverrides((prev) => {
      let found = false;
      const updated = prev.map((row) => {
        if (String(row?.key || '').trim() !== rowKey) return row;
        found = true;
        return { ...row, ...nextRow };
      });
      return found ? updated : [nextRow, ...prev];
    });
    persistMemberHistoryOverride(nextRow);
  }

  async function persistMemberHistoryOverride(row, options = {}) {
    const silent = options?.silent !== false;
    const rowKey = String(row?.key || '').trim();
    const memberId = String(row?.member_id || '').trim();
    if (!rowKey || !memberId) return false;
    try {
      await apiJson('/v1/member-history-overrides', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId || 'all',
          member_id: memberId,
          history_key: rowKey,
          kind: row?.kind || row?.source_kind || null,
          source_id: row?.source_id || null,
          source_name: row?.source_name || null,
          full_name: row?.full_name || null,
          email: row?.email || null,
          participant_no: row?.participant_no || null,
          registration_id: row?.registration_id || null,
          status: row?.status || null,
          linked_status: row?.linked_status || null,
          booked_at: row?.booked_at || null,
          checked_in_at: row?.checked_in_at || null,
          checked_out_at: row?.checked_out_at || null
        })
      });
      return true;
    } catch {
      if (!silent) {
        throw new Error('history override gagal disimpan');
      }
      // Persist errors should not block UI; backend will be retried on next action.
      return false;
    }
  }

  async function loadMemberHistoryOverrides(memberId) {
    const targetMemberId = String(memberId || '').trim();
    if (!targetMemberId) return;
    try {
      const response = await apiJson(
        `/v1/read/member-history-overrides?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId || 'all')}&member_id=${encodeURIComponent(targetMemberId)}&limit=200`
      );
      const rows = Array.isArray(response?.rows) ? response.rows.map((row) => ({
        ...row,
        key: row.history_key || row.key || buildMemberHistoryRowKey(row)
      })) : [];
      setMemberHistoryOverrides((prev) => {
        const filtered = prev.filter((row) => String(row?.member_id || '').trim() !== targetMemberId);
        return [...rows, ...filtered];
      });
    } catch {
      // Ignore load errors to avoid interrupting CS flow.
    }
  }

  async function checkinByIdentity({ member = null, participant = null, moveToCheckout = false }) {
    if (!selectedEvent) {
      setActionFeedback('Pilih event dulu sebelum check in.');
      return;
    }
    if (participant?.checked_in_at && !participant?.checked_out_at) {
      setActionFeedback('Tidak bisa check-in lagi: participant sudah check-in dan belum check-out.');
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
      upsertParticipantSearchRow({
        key: `event:${selectedEvent.event_id}:${registrationId || email || passportId || 'member'}`,
        source_kind: 'event',
        source_id: selectedEvent.event_id || '',
        source_name: selectedEvent.event_name || 'Event',
        member_id: String(member?.member_id || selectedMember?.member_id || '').trim(),
        full_name: fullName || '',
        phone: member?.phone || selectedMember?.phone || '',
        email: email || '',
        status: 'checked_in',
        participant_no: participant?.participant_no || '',
        registration_id: registrationId || '',
        passport_id: passportId || '',
        checked_in_at: result?.checked_in_at || participant?.checked_in_at || new Date().toISOString(),
        checked_out_at: ''
      });
      upsertMemberHistoryOverride({
        key: `event:${selectedEvent.event_id}:${registrationId || email || passportId || 'member'}`,
        member_id: String(member?.member_id || selectedMember?.member_id || '').trim(),
        kind: 'event',
        source_id: selectedEvent.event_id || '',
        source_name: selectedEvent.event_name || 'Event',
        full_name: fullName || '',
        email: email || '',
        participant_no: participant?.participant_no || '',
        registration_id: registrationId || '',
        status: 'checked_in',
        linked_status: 'checked_in',
        booked_at: participant?.booked_at || '',
        checked_in_at: result?.checked_in_at || participant?.checked_in_at || new Date().toISOString(),
        checked_out_at: ''
      });
      if (result?.duplicate) {
        setActionFeedback(`checkin.skip: ${fullName || email || passportId || registrationId || '-'} sudah check-in sebelumnya.`);
      } else {
        setActionFeedback(`checkin.success: ${fullName || email || passportId || registrationId || '-'}`);
      }
      if (moveToCheckout) {
        setMemberWorkspaceTab('checkout');
      }
    } catch (err) {
      setActionFeedback(err.message || 'failed to check in participant');
    } finally {
      setActionSaving(false);
    }
  }

  async function checkoutByIdentity({ member = null, participant = null, moveToHistory = false }) {
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
      upsertParticipantSearchRow({
        key: `event:${selectedEvent.event_id}:${registrationId || email || passportId || 'member'}`,
        source_kind: 'event',
        source_id: selectedEvent.event_id || '',
        source_name: selectedEvent.event_name || 'Event',
        member_id: String(member?.member_id || selectedMember?.member_id || '').trim(),
        full_name: fullName || '',
        phone: member?.phone || selectedMember?.phone || '',
        email: email || '',
        status: 'checked_out',
        participant_no: participant?.participant_no || '',
        registration_id: registrationId || '',
        passport_id: passportId || '',
        checked_in_at: participant?.checked_in_at || '',
        checked_out_at: result?.checked_out_at || participant?.checked_out_at || new Date().toISOString()
      });
      upsertMemberHistoryOverride({
        key: `event:${selectedEvent.event_id}:${registrationId || email || passportId || 'member'}`,
        member_id: String(member?.member_id || selectedMember?.member_id || '').trim(),
        kind: 'event',
        source_id: selectedEvent.event_id || '',
        source_name: selectedEvent.event_name || 'Event',
        full_name: fullName || '',
        email: email || '',
        participant_no: participant?.participant_no || '',
        registration_id: registrationId || '',
        status: 'checked_out',
        linked_status: 'checked_out',
        booked_at: participant?.booked_at || '',
        checked_in_at: participant?.checked_in_at || '',
        checked_out_at: result?.checked_out_at || participant?.checked_out_at || new Date().toISOString()
      });
      if (result?.duplicate) {
        setActionFeedback(`checkout.skip: ${fullName || email || passportId || registrationId || '-'} sudah checkout sebelumnya.`);
      } else {
        setActionFeedback(`checkout.success: ${fullName || email || passportId || registrationId || '-'}`);
      }
      if (moveToHistory) {
        setMemberWorkspaceTab('history');
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

  async function checkinClassBooking(booking, options = {}) {
    if (!booking?.booking_id) return;
    if ((booking?.attendance_checked_in_at || booking?.attendance_confirmed_at) && !booking?.attendance_checked_out_at) {
      setActionFeedback(`class.checkin.skip: ${booking.booking_id} sudah check-in dan belum check-out.`);
      return;
    }
    try {
      setActionSaving(true);
      setActionFeedback('');
      const result = await apiJson(`/v1/bookings/classes/${encodeURIComponent(booking.booking_id)}/checkin`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId
        })
      });
      await loadClassBookings(booking.class_id || selectedClass?.class_id || selectedExperienceId);
      await loadDashboard();
      upsertParticipantSearchRow({
        key: `class:${booking.class_id || selectedClass?.class_id || selectedExperienceId}:${booking.booking_id || booking.member_id || booking.guest_name || 'booking'}`,
        source_kind: 'class',
        source_id: booking.class_id || selectedClass?.class_id || selectedExperienceId || '',
        source_name: selectedClass?.class_name || booking?.class_name || 'Program',
        member_id: booking?.member_id || selectedMember?.member_id || '',
        full_name: selectedMember?.full_name || booking?.guest_name || '',
        phone: selectedMember?.phone || '',
        email: selectedMember?.email || '',
        status: booking?.status || 'booked',
        participant_no: '',
        registration_id: booking?.booking_id || '',
        passport_id: '',
        booked_at: booking?.booked_at || '',
        checked_in_at: result?.attendance_checked_in_at || booking?.attendance_checked_in_at || booking?.attendance_confirmed_at || new Date().toISOString(),
        checked_out_at: ''
      });
      upsertMemberHistoryOverride({
        key: `class:${booking.class_id || selectedClass?.class_id || selectedExperienceId}:${booking.booking_id || booking.member_id || booking.guest_name || 'booking'}`,
        member_id: booking?.member_id || selectedMember?.member_id || '',
        kind: 'class',
        source_id: booking.class_id || selectedClass?.class_id || selectedExperienceId || '',
        source_name: selectedClass?.class_name || booking?.class_name || 'Program',
        full_name: selectedMember?.full_name || booking?.guest_name || '',
        email: selectedMember?.email || '',
        participant_no: '',
        registration_id: booking?.booking_id || '',
        status: 'checked_in',
        linked_status: 'checked_in',
        booked_at: booking?.booked_at || '',
        checked_in_at: result?.attendance_checked_in_at || booking?.attendance_checked_in_at || booking?.attendance_confirmed_at || new Date().toISOString(),
        checked_out_at: ''
      });
      if (result?.duplicate) {
        setActionFeedback(`class.checkin.skip: ${booking.booking_id} sudah check-in sebelumnya.`);
      } else {
        setActionFeedback(`class.checkin.success: ${booking.booking_id}`);
      }
      if (options.moveToCheckout) {
        setMemberWorkspaceTab('checkout');
      }
    } catch (err) {
      setActionFeedback(err.message || 'failed to check in class booking');
    } finally {
      setActionSaving(false);
    }
  }

  async function checkinMembershipClassWithoutBooking(options = {}) {
    if (!selectedMember || !selectedClass) {
      setActionFeedback('Pilih member dan program dulu sebelum check-in.');
      return;
    }
    if (!selectedClassIsMembershipMode) {
      setActionFeedback('Check-in tanpa booking hanya untuk program membership.');
      return;
    }
    try {
      setActionSaving(true);
      setActionFeedback('');
      const access = await apiJson('/v1/activities/access-check', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          class_id: selectedClass.class_id,
          member_id: selectedMember.member_id,
          action_type: 'checkin'
        })
      });
      if (!access?.allowed) {
        const reasonText = Array.isArray(access?.reasons) && access.reasons.length > 0
          ? access.reasons.join(', ')
          : 'akses member ke program membership belum aktif';
        setActionFeedback(`membership.checkin.blocked: ${reasonText}`);
        return;
      }

      const checkedInAt = new Date().toISOString();
      const checkinId = `chk_${Date.now()}`;
      await apiJson('/v1/checkins/log', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          checkin_id: checkinId,
          member_id: selectedMember.member_id,
          channel: 'cs_membership_program',
          checkin_at: checkedInAt,
          custom_fields: {
            source: 'cs_dashboard',
            class_id: selectedClass.class_id,
            class_name: selectedClass.class_name || selectedClass.class_id,
            class_type: selectedClassType
          }
        })
      });
      await loadDashboard();
      upsertParticipantSearchRow({
        key: `class:${selectedClass.class_id}:membership_checkin:${selectedMember.member_id}:${checkinId}`,
        source_kind: 'class',
        source_id: selectedClass.class_id || '',
        source_name: selectedClass.class_name || selectedClass.class_id || 'Program',
        member_id: selectedMember.member_id || '',
        full_name: selectedMember.full_name || '',
        phone: selectedMember.phone || '',
        email: selectedMember.email || '',
        status: 'checked_in',
        participant_no: '',
        registration_id: checkinId,
        passport_id: '',
        booked_at: '',
        checked_in_at: checkedInAt,
        checked_out_at: ''
      });
      const membershipHistoryRow = {
        key: `class:${selectedClass.class_id}:membership_checkin:${selectedMember.member_id}:${checkinId}`,
        member_id: selectedMember.member_id || '',
        kind: 'class',
        source_id: selectedClass.class_id || '',
        source_name: selectedClass.class_name || selectedClass.class_id || 'Program',
        full_name: selectedMember.full_name || '',
        email: selectedMember.email || '',
        participant_no: '',
        registration_id: checkinId,
        status: 'checked_in',
        linked_status: 'checked_in',
        booked_at: '',
        checked_in_at: checkedInAt,
        checked_out_at: ''
      };
      upsertMemberHistoryOverride(membershipHistoryRow);
      await persistMemberHistoryOverride(membershipHistoryRow, { silent: false });
      setActionFeedback(`membership.checkin.success: ${selectedMember.full_name || selectedMember.member_id}`);
      if (options.moveToCheckout) {
        setMemberWorkspaceTab('checkout');
      }
    } catch (err) {
      setActionFeedback(err.message || 'failed to check in membership program');
    } finally {
      setActionSaving(false);
    }
  }

  async function checkoutMembershipClassWithoutBooking(options = {}) {
    if (!selectedMember || !selectedClass) {
      setActionFeedback('Pilih member dan program dulu sebelum check-out.');
      return;
    }
    if (!selectedClassIsMembershipMode) {
      setActionFeedback('Check-out tanpa booking hanya untuk program membership.');
      return;
    }
    if (!selectedMembershipCanCheckout) {
      setActionFeedback('Member belum punya check-in membership yang aktif.');
      return;
    }
    try {
      setActionSaving(true);
      setActionFeedback('');
      const checkedOutAt = new Date().toISOString();
      const registrationId = String(selectedMembershipLatestHistoryRow?.registration_id || `chk_${Date.now()}`).trim();
      const checkedInAt = selectedMembershipLatestHistoryRow?.checked_in_at || '';
      const historyKey = `class:${selectedClass.class_id}:membership_checkin:${selectedMember.member_id}:${registrationId}`;
      upsertParticipantSearchRow({
        key: historyKey,
        source_kind: 'class',
        source_id: selectedClass.class_id || '',
        source_name: selectedClass.class_name || selectedClass.class_id || 'Program',
        member_id: selectedMember.member_id || '',
        full_name: selectedMember.full_name || '',
        phone: selectedMember.phone || '',
        email: selectedMember.email || '',
        status: 'checked_out',
        participant_no: '',
        registration_id: registrationId,
        passport_id: '',
        booked_at: '',
        checked_in_at: checkedInAt,
        checked_out_at: checkedOutAt
      });
      const membershipHistoryRow = {
        key: historyKey,
        member_id: selectedMember.member_id || '',
        kind: 'class',
        source_id: selectedClass.class_id || '',
        source_name: selectedClass.class_name || selectedClass.class_id || 'Program',
        full_name: selectedMember.full_name || '',
        email: selectedMember.email || '',
        participant_no: '',
        registration_id: registrationId,
        status: 'checked_out',
        linked_status: 'checked_out',
        booked_at: '',
        checked_in_at: checkedInAt,
        checked_out_at: checkedOutAt
      };
      upsertMemberHistoryOverride(membershipHistoryRow);
      await persistMemberHistoryOverride(membershipHistoryRow, { silent: false });
      setActionFeedback(`membership.checkout.success: ${selectedMember.full_name || selectedMember.member_id}`);
      if (options.moveToHistory) {
        setMemberWorkspaceTab('history');
      }
    } catch (err) {
      setActionFeedback(err.message || 'failed to check out membership program');
    } finally {
      setActionSaving(false);
    }
  }

  async function checkoutClassBooking(booking, options = {}) {
    if (!booking?.booking_id) return;
    try {
      setActionSaving(true);
      setActionFeedback('');
      const result = await apiJson(`/v1/bookings/classes/${encodeURIComponent(booking.booking_id)}/checkout`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId
        })
      });
      await loadClassBookings(booking.class_id || selectedClass?.class_id || selectedExperienceId);
      await loadDashboard();
      upsertParticipantSearchRow({
        key: `class:${booking.class_id || selectedClass?.class_id || selectedExperienceId}:${booking.booking_id || booking.member_id || booking.guest_name || 'booking'}`,
        source_kind: 'class',
        source_id: booking.class_id || selectedClass?.class_id || selectedExperienceId || '',
        source_name: selectedClass?.class_name || booking?.class_name || 'Program',
        member_id: booking?.member_id || selectedMember?.member_id || '',
        full_name: selectedMember?.full_name || booking?.guest_name || '',
        phone: selectedMember?.phone || '',
        email: selectedMember?.email || '',
        status: booking?.status || 'booked',
        participant_no: '',
        registration_id: booking?.booking_id || '',
        passport_id: '',
        booked_at: booking?.booked_at || '',
        checked_in_at: booking?.attendance_checked_in_at || booking?.attendance_confirmed_at || '',
        checked_out_at: result?.attendance_checked_out_at || booking?.attendance_checked_out_at || new Date().toISOString()
      });
      upsertMemberHistoryOverride({
        key: `class:${booking.class_id || selectedClass?.class_id || selectedExperienceId}:${booking.booking_id || booking.member_id || booking.guest_name || 'booking'}`,
        member_id: booking?.member_id || selectedMember?.member_id || '',
        kind: 'class',
        source_id: booking.class_id || selectedClass?.class_id || selectedExperienceId || '',
        source_name: selectedClass?.class_name || booking?.class_name || 'Program',
        full_name: selectedMember?.full_name || booking?.guest_name || '',
        email: selectedMember?.email || '',
        participant_no: '',
        registration_id: booking?.booking_id || '',
        status: 'checked_out',
        linked_status: 'checked_out',
        booked_at: booking?.booked_at || '',
        checked_in_at: booking?.attendance_checked_in_at || booking?.attendance_confirmed_at || '',
        checked_out_at: result?.attendance_checked_out_at || booking?.attendance_checked_out_at || new Date().toISOString()
      });
      if (result?.duplicate) {
        setActionFeedback(`class.checkout.skip: ${booking.booking_id} sudah check-out sebelumnya.`);
      } else {
        setActionFeedback(`class.checkout.success: ${booking.booking_id}`);
      }
      if (options.moveToHistory) {
        setMemberWorkspaceTab('history');
      }
    } catch (err) {
      setActionFeedback(err.message || 'failed to check out class booking');
    } finally {
      setActionSaving(false);
    }
  }

  return (
    <BackendWorkspaceShell
      activeNavId={workspaceTab}
      navItems={csSidebarNavItems}
      eyebrow="Foremoz Admin"
      title={copy.eyebrow}
      subtitle={copy.welcome.replace('{name}', fullName)}
      session={session}
      role={role}
      userName={fullName}
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
    >

      <section className="stats-grid">
        {stats.map((s) => (
          <Stat
            key={s.key}
            label={s.label}
            value={s.value}
            iconClass={s.iconClass}
            tone={s.tone}
            hint={s.hint}
            active={selectedInsightKey === s.key}
            onClick={() => openInsightDetail(s.key)}
          />
        ))}
      </section>

      {selectedInsightKey ? (
        <section className="card search-panel" style={{ marginTop: '0.85rem' }}>
          <div className="panel-head">
            <div>
              <p className="eyebrow">Insight detail</p>
              <h2>{activeInsightMeta?.title || 'Detail'}</h2>
            </div>
            <button className="btn ghost small" type="button" onClick={() => openInsightDetail(selectedInsightKey)}>
              {copy.insightClose}
            </button>
          </div>
          {insightDetailLoading || (selectedInsightKey === 'today_checkins' && participantSearchLoading) || (selectedInsightKey === 'today_bookings' && participantSearchLoading) ? (
            <p className="feedback">Memuat detail...</p>
          ) : insightDetailRows.length > 0 ? (
            <div className="entity-list" style={{ marginTop: '0.75rem' }}>
              {insightDetailRows.map((item) => (
                <div className="entity-row" key={item.key}>
                  <div>
                    <strong>{item.title}</strong>
                    {Array.isArray(item.lines)
                      ? item.lines.map((line, index) => (
                        <p key={`${item.key}-line-${index}`}>{line}</p>
                      ))
                      : null}
                  </div>
                  <span className="passport-chip">{item.badge || '-'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">{activeInsightMeta?.empty || 'Belum ada data.'}</p>
          )}
        </section>
      ) : null}

      {loading ? <p className="feedback">{copy.loadingDashboard}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {workspaceTab === 'member' ? (
        <section className="card search-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">{copy.memberSearchEyebrow}</p>
              <h2>{copy.memberSearchTitle}</h2>
            </div>
            <div className="row-actions">
              <button className="btn ghost" onClick={scanQrCode}>
                {copy.scanQr}
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setMemberCreateMode((prev) => !prev);
                  setMemberCreateNotice('');
                }}
              >
                {memberCreateMode ? 'Tutup form member baru' : 'Tambah member baru'}
              </button>
            </div>
          </div>

          {!selectedMember ? (
            <>
              {memberCreateMode ? (
                <form className="card form" style={{ marginBottom: '0.9rem' }} onSubmit={submitQuickMemberCreate}>
                  <p className="eyebrow">Quick member create</p>
                  <label>
                    Nama lengkap
                    <input
                      value={memberCreateForm.full_name}
                      onChange={(e) => setMemberCreateForm((prev) => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Nama customer"
                    />
                  </label>
                  <label>
                    No. HP
                    <input
                      value={memberCreateForm.phone}
                      onChange={(e) => setMemberCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="08xxxx"
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={memberCreateForm.email}
                      onChange={(e) => setMemberCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="customer@email.com"
                    />
                  </label>
                  <label>
                    ID card / KTP
                    <input
                      value={memberCreateForm.id_card}
                      onChange={(e) => setMemberCreateForm((prev) => ({ ...prev, id_card: e.target.value }))}
                      placeholder="Nomor identitas"
                    />
                  </label>
                  <div className="row-actions">
                    <button className="btn" type="submit" disabled={memberCreateSaving}>
                      {memberCreateSaving ? 'Membuat member...' : 'Buat member'}
                    </button>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        setMemberCreateMode(false);
                        setMemberCreateNotice('');
                        setMemberCreateForm({
                          full_name: '',
                          phone: '',
                          email: '',
                          id_card: ''
                        });
                      }}
                    >
                      Batal
                    </button>
                  </div>
                  {memberCreateNotice ? <p className={memberCreateNoticeTone === 'error' ? 'error' : 'feedback'}>{memberCreateNotice}</p> : null}
                  <p className="feedback">Setelah member dibuat, CS bisa langsung lanjut bikin order dari panel yang sama.</p>
                </form>
              ) : null}

              <div className="search-box member-search-box">
                <div className="search-box-row search-box-row-primary">
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
                </div>
                <div className="search-box-row search-box-row-secondary">
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
                  <label className="search-box-keyword">
                    {copy.keyword}
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={copy.keywordPlaceholder} />
                  </label>
                </div>
              </div>
              <p className="mini-note member-search-context">
                {copy.panelContext}: <strong>{selectedExperienceLabel || copy.noneSelected}</strong>
              </p>
              {participantSearchLoading ? <p className="feedback">{copy.loadingMemberLinks}</p> : null}

              <div className="search-result-list">
                {searchResults.length > 0 ? (
                  searchResults.map((row) => {
                    const memberId = String(row.member_id || '').trim();
                    const cardExperiences = memberCardExperienceMap.get(memberId) || [];
                    const cardEvents = cardExperiences.filter((item) => item.kind === 'event');
                    const cardClasses = cardExperiences.filter((item) => item.kind === 'class');
                    return (
                      <div
                        key={row.key}
                        className="member-row"
                        role="button"
                        tabIndex={0}
                        onClick={() => focusMember(row.member_id, 'profile')}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            focusMember(row.member_id, 'profile');
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
                                  className="btn ghost small member-experience-btn is-linked"
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    focusMember(row.member_id, 'checkin');
                                    selectFocusedMemberExperience('event', item.source_id);
                                  }}
                                >
                                  {item.source_name} - {item.linked_status || 'registered'}
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
                                  className="btn ghost small member-experience-btn is-linked"
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    focusMember(row.member_id, 'checkin');
                                    selectFocusedMemberExperience('class', item.source_id);
                                  }}
                                >
                                  {item.source_name} - {item.linked_status || 'booked'}
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
            </>
          ) : (
            <div className="member-focus-shell">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Focused member</p>
                  <h2>{selectedMember.full_name || selectedMember.member_id}</h2>
                </div>
                <button className="btn ghost" type="button" onClick={resetMemberFocus}>
                  Kembali ke list member
                </button>
              </div>

              <div className="member-focus-summary">
                <article className="member-detail">
                  <p className="eyebrow">Profile member</p>
                  <h3>{selectedMember.full_name || '-'}</h3>
                  <p>member_id: {selectedMember.member_id || '-'}</p>
                  <p>phone: {selectedMember.phone || '-'}</p>
                  <p>email: {selectedMember.email || '-'}</p>
                  <p>status: {selectedMember.status || '-'}</p>
                </article>
                <article className="member-detail">
                  <p className="eyebrow">Relasi aktif</p>
                  <h3>{selectedMemberExperiences.length}</h3>
                  <p>Event: {selectedMemberEventLinks.length}</p>
                  <p>Program: {selectedMemberClassLinks.length}</p>
                  <p>Order: {memberOrderRows.length}</p>
                  <p>Payment: {memberPaymentRows.length}</p>
                </article>
              </div>

              <div className="landing-tabs member-workspace-tabs" role="tablist" aria-label="Member workspace">
                <button type="button" className={`landing-tab ${memberWorkspaceTab === 'profile' ? 'active' : ''}`} onClick={() => setMemberWorkspaceTab('profile')}>
                  Edit profile
                </button>
                <button type="button" className={`landing-tab ${memberWorkspaceTab === 'order' ? 'active' : ''}`} onClick={() => setMemberWorkspaceTab('order')}>
                  Create order
                </button>
                <button type="button" className={`landing-tab ${memberWorkspaceTab === 'checkin' ? 'active' : ''}`} onClick={() => setMemberWorkspaceTab('checkin')}>
                  Check in
                </button>
                <button type="button" className={`landing-tab ${memberWorkspaceTab === 'checkout' ? 'active' : ''}`} onClick={() => setMemberWorkspaceTab('checkout')}>
                  Check out
                </button>
                <button type="button" className={`landing-tab ${memberWorkspaceTab === 'history' ? 'active' : ''}`} onClick={() => setMemberWorkspaceTab('history')}>
                  History
                </button>
              </div>

              {memberWorkspaceTab === 'profile' ? (
                <form className="card form" style={{ marginTop: '0.9rem' }} onSubmit={submitMemberProfileUpdate}>
                  <p className="eyebrow">Edit profile</p>
                  <label>
                    Nama lengkap
                    <input
                      value={memberProfileForm.full_name}
                      onChange={(e) => setMemberProfileForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    />
                  </label>
                  <label>
                    No. HP
                    <input
                      value={memberProfileForm.phone}
                      onChange={(e) => setMemberProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={memberProfileForm.email}
                      onChange={(e) => setMemberProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </label>
                  <label>
                    Status
                    <select
                      value={memberProfileForm.status}
                      onChange={(e) => setMemberProfileForm((prev) => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                  </label>
                  <div className="row-actions">
                    <button className="btn" type="submit" disabled={memberProfileSaving}>
                      {memberProfileSaving ? 'Menyimpan...' : 'Simpan profile'}
                    </button>
                  </div>
                </form>
              ) : null}

              {memberWorkspaceTab === 'order' ? (
                <article className="card" style={{ marginTop: '0.9rem' }}>
                  <p className="eyebrow">Create order</p>
                  {editingOrderId ? <p className="feedback">Editing pending order: {editingOrderId}</p> : null}
                  <p className="feedback">Order disusun per tipe supaya reference dan harga lebih konsisten. Payment sekarang dipisah ke step terpisah setelah form order selesai diisi.</p>
                  <div className="wizard-steps" style={{ marginBottom: '0.9rem' }}>
                    <span className={orderFlowStep === 'form' ? 'active' : ''}>1. Order detail</span>
                    <span className={orderFlowStep === 'payment' ? 'active' : ''}>2. Payment</span>
                  </div>
                  {orderFlowStep === 'form' ? (
                    <div className="form">
                      <label>
                        {getOrderCopy('orderTypeLabel')}
                        <select
                          value={orderForm.order_type}
                          onChange={(e) =>
                            setOrderForm((prev) => ({
                              ...prev,
                              order_type: normalizeOrderType(e.target.value),
                              target_key: '',
                              label: '',
                              qty: normalizeOrderType(e.target.value) === 'product' ? prev.qty : '1',
                              unit_price: '',
                              notes: ''
                            }))
                          }
                        >
                          {ORDER_FORM_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.selectLabel || option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {getOrderCopy('targetLabel')}
                        <select
                          value={orderForm.target_key}
                          onChange={(e) => {
                            const nextTarget = currentOrderTargets.find((item) => item.key === e.target.value) || null;
                            if (!nextTarget) {
                              setOrderForm((prev) => ({ ...prev, target_key: '' }));
                              return;
                            }
                            applyOrderTarget(nextTarget);
                          }}
                        >
                          <option value="">{getTargetPlaceholder(orderForm.order_type, currentOrderTargets)}</option>
                          {currentOrderTargets.map((item) => (
                            <option key={item.key} value={item.key}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {selectedOrderTarget ? (
                        <div className="card" style={{ borderStyle: 'dashed' }}>
                          <p className="eyebrow">{getOrderCopy('selectedTargetEyebrow')}</p>
                          <p><strong>{selectedOrderTarget.label}</strong></p>
                          <p>{selectedOrderTarget.helper}</p>
                          <p>{getOrderCopy('referenceLabel')}: {selectedOrderTarget.reference_type} / {selectedOrderTarget.reference_id || '-'}</p>
                          <p>{getOrderCopy('defaultPriceLabel')}: {formatIdr(selectedOrderTarget.unit_price || 0)}</p>
                        </div>
                      ) : null}
                      <label>
                        {getOrderCopy('orderLabelLabel')}
                        <input
                          value={orderForm.label}
                          onChange={(e) => setOrderForm((prev) => ({ ...prev, label: e.target.value }))}
                          placeholder={getOrderCopy('orderLabelPlaceholder')}
                        />
                      </label>
                      <label>
                        {getOrderCopy('qtyLabel')}
                        <input
                          type="number"
                          min="1"
                          value={orderForm.qty}
                          onChange={(e) => setOrderForm((prev) => ({ ...prev, qty: e.target.value }))}
                          disabled={normalizeOrderType(orderForm.order_type) !== 'product'}
                        />
                      </label>
                      <label>
                        {getOrderCopy('unitPriceLabel')}
                        <input
                          type="number"
                          min="0"
                          value={orderForm.unit_price}
                          onChange={(e) => setOrderForm((prev) => ({ ...prev, unit_price: e.target.value }))}
                        />
                      </label>
                      <label>
                        {getOrderCopy('notesLabel')}
                        <input
                          value={orderForm.notes}
                          onChange={(e) => setOrderForm((prev) => ({ ...prev, notes: e.target.value }))}
                          placeholder={getOrderCopy('notesPlaceholder')}
                        />
                      </label>
                      <div className="row-actions">
                        <button className="btn" type="button" disabled={orderSaving} onClick={addCurrentItemToOrder}>
                          {getOrderCopy('addItemButton')}
                        </button>
                        <button className="btn" type="button" disabled={orderSaving} onClick={continueOrderToPayment}>
                          {getOrderCopy('continuePaymentButton')}
                        </button>
                        {editingOrderId ? (
                          <button
                            className="btn ghost"
                            type="button"
                            onClick={() => {
                              setEditingOrderId('');
                              setOrderItems([]);
                              setOrderPaymentDraft(null);
                              setOrderFlowStep('form');
                              setOrderForm({
                                order_type: DEFAULT_ORDER_TYPE,
                                target_key: '',
                                label: '',
                                qty: '1',
                                unit_price: '',
                                method: DEFAULT_ORDER_PAYMENT_METHOD,
                                settlement: ORDER_SETTLEMENT_OPTIONS[0]?.value || '',
                                notes: ''
                              });
                            }}
                          >
                            {getOrderCopy('cancelEditButton')}
                          </button>
                        ) : null}
                        <button className="btn ghost" type="button" onClick={applyCurrentContextToOrder}>
                          {getOrderCopy('useCurrentContextButton')}
                        </button>
                      </div>
                      {orderItems.length > 0 ? (
                        <div className="card" style={{ borderStyle: 'dashed' }}>
                          <p className="eyebrow">{getOrderCopy('orderItemsEyebrow')}</p>
                          <div className="entity-list">
                            {orderItems.map((item) => (
                              <div className="entity-row" key={item.item_id}>
                                <div>
                                  <strong>{item.target_label}</strong>
                                  <p>{formatOrderTypeLabel(item.order_type)} | {item.reference_type || '-'} / {item.reference_id || '-'}</p>
                                  <p>{getOrderCopy('qtyPrefix')} {item.qty} x {formatIdr(item.unit_price)}</p>
                                </div>
                                <div className="payment-meta">
                                  <strong>{formatIdr(item.total_amount)}</strong>
                                  <button className="btn ghost small" type="button" onClick={() => removeOrderItem(item.item_id)}>
                                    Hapus
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="feedback">{getOrderCopy('temporaryTotalLabel')}: {formatIdr(orderItems.reduce((sum, item) => sum + Number(item.total_amount || 0), 0))}</p>
                        </div>
                      ) : (
                        <p className="muted">{getOrderCopy('emptyOrderItems')}</p>
                      )}
                    </div>
                  ) : (
                    <div className="form">
                      <div className="payment-checkout-grid">
                        <div className="payment-checkout-card">
                          <p className="eyebrow">{getOrderCopy('paymentMethodEyebrow')}</p>
                          <div className="payment-method-grid">
                            {ORDER_PAYMENT_METHOD_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                className={`payment-method-card ${orderForm.method === option.value ? 'selected' : ''}`}
                                onClick={() => setOrderForm((prev) => ({ ...prev, method: option.value }))}
                              >
                                <strong>{option.label}</strong>
                                <small>{option.note}</small>
                              </button>
                            ))}
                          </div>
                          <div className="payment-method-preview">
                            <p><strong>{getOrderPaymentMethodMeta(orderForm.method).label}</strong></p>
                            <p className="muted">{getOrderPaymentMethodMeta(orderForm.method).note}</p>
                            <p className="feedback">{getOrderCopy('paymentMethodPreview')}</p>
                          </div>
                          <label>
                            {getOrderCopy('paymentResultLabel')}
                            <select value={orderForm.settlement} onChange={(e) => setOrderForm((prev) => ({ ...prev, settlement: e.target.value }))}>
                              {ORDER_SETTLEMENT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="payment-checkout-card payment-summary-card">
                          <p className="eyebrow">{getOrderCopy('orderSummaryEyebrow')}</p>
                          <p><strong>{orderPaymentDraft?.requestBody?.order_label || '-'}</strong></p>
                          <p className="feedback">{getOrderCopy('summaryMemberLabel')}: {orderPaymentDraft?.summary?.memberName || '-'}</p>
                          <p className="feedback">{getOrderCopy('summaryTypeLabel')}: {orderPaymentDraft?.summary?.orderTypeLabel || '-'}</p>
                          <p className="feedback">{getOrderCopy('summaryTargetLabel')}: {orderPaymentDraft?.summary?.targetLabel || '-'}</p>
                          <p className="feedback">{getOrderCopy('summaryReferenceLabel')}: {orderPaymentDraft?.summary?.referenceLabel || '-'}</p>
                          <p className="feedback">{getOrderCopy('summaryQtyLabel')}: {orderPaymentDraft?.summary?.qty || 0}</p>
                          <p className="feedback">{getOrderCopy('summaryPaymentMethodLabel')}: {getOrderPaymentMethodMeta(orderForm.method).label}</p>
                          <p className="feedback">{getOrderCopy('summaryPaymentStatusLabel')}: {orderForm.settlement}</p>
                          <p className="payment-summary-total">{formatIdr(orderPaymentDraft?.summary?.totalAmount || 0)}</p>
                          {Array.isArray(orderPaymentDraft?.summary?.items) && orderPaymentDraft.summary.items.length > 0 ? (
                            <div className="entity-list" style={{ marginTop: '0.8rem' }}>
                              {orderPaymentDraft.summary.items.map((item) => (
                                <div className="entity-row" key={item.item_id}>
                                  <div>
                                    <strong>{item.target_label}</strong>
                                    <p>{formatOrderTypeLabel(item.order_type)} | {item.reference_type || '-'} / {item.reference_id || '-'}</p>
                                  </div>
                                  <div className="payment-meta">
                                    <strong>{formatIdr(item.total_amount)}</strong>
                                    <small>{getOrderCopy('qtyPrefix')} {item.qty}</small>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                          <small>{getOrderCopy('confirmHelp')}</small>
                        </div>
                      </div>
                      <div className="row-actions">
                        <button
                          className="btn ghost"
                          type="button"
                          disabled={orderSaving}
                          onClick={() => {
                            setOrderPaymentDraft(null);
                            setOrderFlowStep('form');
                          }}
                        >
                          {getOrderCopy('backToFormButton')}
                        </button>
                        <button className="btn" type="button" disabled={orderSaving} onClick={submitOrder}>
                          {orderSaving ? 'Menyimpan...' : editingOrderId ? 'Simpan perubahan order' : 'Konfirmasi payment & create order'}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ) : null}

              {memberWorkspaceTab === 'checkin' || memberWorkspaceTab === 'checkout' ? (
                <article className="card" style={{ marginTop: '0.9rem' }}>
                  <p className="eyebrow">{memberWorkspaceTab === 'checkin' ? 'Check in' : 'Check out'}</p>
                  {(checkinEventTargets.length + checkinClassTargets.length) > 0 ? (
                    <>
                      <div className="form">
                        <label>
                          {isMultiBranchPlan ? 'Order type' : 'Tipe relasi'}
                          <select
                            value={selectedExperienceType}
                            disabled={memberWorkspaceTab === 'checkout'}
                            onChange={(e) => {
                              setSelectedExperienceType(e.target.value);
                              setSelectedExperienceId('');
                            }}
                          >
                            <option
                              value="event"
                              disabled={checkinEventTargets.length === 0}
                            >
                              Event
                            </option>
                            <option
                              value="class"
                              disabled={checkinClassTargets.length === 0}
                            >
                              Program
                            </option>
                          </select>
                        </label>
                        <label>
                          {isMultiBranchPlan ? 'Target' : 'Pilih item'}
                          <select
                            value={selectedExperienceId}
                            disabled={memberWorkspaceTab === 'checkout'}
                            onChange={(e) => {
                              if (isMultiBranchPlan) {
                                const nextTarget = currentCheckinTargets.find((item) => String(item.source_id || '') === String(e.target.value || '')) || null;
                                if (!nextTarget) {
                                  setSelectedExperienceId('');
                                  return;
                                }
                                selectFocusedMemberExperience(selectedExperienceType, nextTarget.source_id);
                                return;
                              }
                              selectFocusedMemberExperience(selectedExperienceType, e.target.value);
                            }}
                          >
                            {isMultiBranchPlan ? (
                              <>
                                <option value="">
                                  {getTargetPlaceholder(selectedExperienceType, currentCheckinTargets)}
                                </option>
                                {currentCheckinTargets.map((item) => (
                                  <option key={item.key} value={item.source_id}>
                                    {item.label}
                                  </option>
                                ))}
                              </>
                            ) : (
                              <>
                                <option value="">Pilih item aktif</option>
                                {currentCheckinTargets.map((item) => (
                                  <option key={item.key} value={item.source_id}>
                                    {item.label}
                                  </option>
                                ))}
                              </>
                            )}
                          </select>
                        </label>
                      </div>
                      {isMultiBranchPlan && selectedCheckinTarget ? (
                        <div className="card" style={{ marginTop: '1rem', borderStyle: 'dashed' }}>
                          <p className="eyebrow">{getOrderCopy('selectedTargetEyebrow')}</p>
                          <p><strong>{selectedCheckinTarget.label}</strong></p>
                          <p>{selectedCheckinTarget.helper}</p>
                          <p>{getOrderCopy('referenceLabel')}: {selectedCheckinTarget.reference_type} / {selectedCheckinTarget.reference_id || '-'}</p>
                          <p>{getOrderCopy('defaultPriceLabel')}: {formatIdr(selectedCheckinTarget.unit_price || 0)}</p>
                        </div>
                      ) : null}

                      {selectedExperienceType === 'event' && selectedEvent ? (
                        <div className="card" style={{ marginTop: '1rem', borderStyle: 'dashed' }}>
                          <p>Event: <strong>{selectedEvent.event_name || selectedEvent.event_id}</strong></p>
                          {selectedEventParticipantForMember ? (
                            <>
                              <p>Status: {selectedEventParticipantForMember.checked_out_at ? 'checked out' : selectedEventParticipantForMember.checked_in_at ? 'checked in' : 'registered'}</p>
                              <p>Participant no: {selectedEventParticipantForMember.participant_no || '-'}</p>
                              <div className="row-actions">
                                {memberWorkspaceTab === 'checkin' ? (
                                  <button
                                    className="btn"
                                    type="button"
                                    disabled={actionSaving || (selectedEventParticipantForMember?.checked_in_at && !selectedEventParticipantForMember?.checked_out_at)}
                                    onClick={() => checkinByIdentity({ member: selectedMember, participant: selectedEventParticipantForMember, moveToCheckout: true })}
                                  >
                                    {(selectedEventParticipantForMember?.checked_in_at && !selectedEventParticipantForMember?.checked_out_at)
                                      ? 'checked-in'
                                      : 'check-in member'}
                                  </button>
                                ) : (
                                  <button
                                    className="btn"
                                    type="button"
                                    disabled={actionSaving || !selectedEventParticipantForMember.checked_in_at}
                                    onClick={() => checkoutByIdentity({ member: selectedMember, participant: selectedEventParticipantForMember, moveToHistory: true })}
                                  >
                                    {selectedEventParticipantForMember.checked_in_at && !selectedEventParticipantForMember.checked_out_at
                                      ? 'checked-out member'
                                      : 'Nothing check-out'}
                                  </button>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="muted">
                                {memberWorkspaceTab === 'checkin'
                                  ? 'Member belum terdaftar di event ini, tapi tetap bisa check-in langsung.'
                                  : 'Member belum terdeteksi di participant list event ini.'}
                              </p>
                              <div className="row-actions">
                                {memberWorkspaceTab === 'checkin' ? (
                                  <button
                                    className="btn"
                                    type="button"
                                    disabled={actionSaving || selectedEventCanCheckout}
                                    onClick={() => checkinByIdentity({ member: selectedMember, moveToCheckout: true })}
                                  >
                                    {selectedEventCanCheckout ? 'checked-in' : 'check-in member'}
                                  </button>
                                ) : (
                                  <button
                                    className="btn"
                                    type="button"
                                    disabled={actionSaving || !selectedEventCanCheckout}
                                    onClick={() => checkoutByIdentity({
                                      member: selectedMember,
                                      participant: {
                                        checked_in_at: selectedEventLatestHistoryRow?.checked_in_at || '',
                                        checked_out_at: selectedEventLatestHistoryRow?.checked_out_at || '',
                                        registration_id: selectedEventLatestHistoryRow?.registration_id || null,
                                        participant_no: selectedEventLatestHistoryRow?.participant_no || null,
                                        email: selectedMember?.email || '',
                                        full_name: selectedMember?.full_name || ''
                                      },
                                      moveToHistory: true
                                    })}
                                  >
                                    {selectedEventCanCheckout ? 'checked-out member' : 'Nothing check-out'}
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ) : null}

                      {selectedExperienceType === 'class' && selectedClass ? (
                        <div className="card" style={{ marginTop: '1rem', borderStyle: 'dashed' }}>
                          <p>Program: <strong>{selectedClass.class_name || selectedClass.class_id}</strong></p>
                          {selectedClassBookingForMember ? (
                            <>
                              <p>Booking ID: {selectedClassBookingForMember.booking_id || '-'}</p>
                              <p>Status attendance: {selectedClassBookingForMember.attendance_checked_out_at ? 'checked out' : selectedClassBookingForMember.attendance_checked_in_at || selectedClassBookingForMember.attendance_confirmed_at ? 'checked in' : 'booked'}</p>
                              <div className="row-actions">
                                {memberWorkspaceTab === 'checkin' ? (
                                  <button
                                    className="btn"
                                    type="button"
                                    disabled={actionSaving || ((selectedClassBookingForMember?.attendance_checked_in_at || selectedClassBookingForMember?.attendance_confirmed_at) && !selectedClassBookingForMember?.attendance_checked_out_at)}
                                    onClick={() => checkinClassBooking(selectedClassBookingForMember, { moveToCheckout: true })}
                                  >
                                    Check-in member
                                  </button>
                                ) : (
                                  <button
                                    className="btn"
                                    type="button"
                                    disabled={actionSaving || !(selectedClassBookingForMember.attendance_checked_in_at || selectedClassBookingForMember.attendance_confirmed_at)}
                                    onClick={() => checkoutClassBooking(selectedClassBookingForMember, { moveToHistory: true })}
                                  >
                                    Check-out member
                                  </button>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="muted">
                                {selectedClassIsMembershipMode
                                  ? 'Program membership ini tidak butuh booking untuk check-in.'
                                  : 'Member belum punya booking di program ini.'}
                              </p>
                              {selectedClassIsMembershipMode && memberWorkspaceTab === 'checkin' ? (
                                <div className="row-actions">
                                  <button
                                    className="btn"
                                    type="button"
                                    disabled={actionSaving || selectedMembershipCanCheckout}
                                    onClick={() => checkinMembershipClassWithoutBooking()}
                                  >
                                    {selectedMembershipCanCheckout ? 'Checked-in' : 'Check-in member'}
                                  </button>
                                </div>
                              ) : null}
                              {selectedClassIsMembershipMode && memberWorkspaceTab === 'checkout' ? (
                                <div className="row-actions">
                                  <button
                                    className="btn"
                                    type="button"
                                    disabled={actionSaving || !selectedMembershipCanCheckout}
                                    onClick={() => checkoutMembershipClassWithoutBooking({ moveToHistory: true })}
                                  >
                                    {selectedMembershipCanCheckout ? 'checked-out member' : 'Nothing check-out'}
                                  </button>
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="muted">Belum ada event atau program yang terhubung ke member ini.</p>
                  )}
                </article>
              ) : null}

              {memberWorkspaceTab === 'history' ? (
                <div className="member-focus-history">
                  <div className="payment-history" style={{ marginTop: '0.9rem' }}>
                    <h3>History check-in / check-out</h3>
                    {memberHistoryLoading ? (
                      <p className="feedback">Memuat history check-in / check-out...</p>
                    ) : selectedMemberHistoryRows.length > 0 ? (
                      <div className="entity-list">
                        {selectedMemberHistoryRows.map((item) => (
                          <div className="entity-row" key={`${item.kind}:${item.source_id}:${item.registration_id || item.participant_no || item.source_name}`}>
                            <div>
                              <strong>{item.source_name || '-'}</strong>
                              <p>{item.kind === 'class' ? 'Program' : 'Event'} | status: {item.linked_status || item.status || '-'}</p>
                              <p>booking/registration: {item.registration_id || '-'}</p>
                              <p>booked: {item.booked_at ? formatDateTime(item.booked_at) : '-'}</p>
                              <p>check-in: {item.checked_in_at ? formatDateTime(item.checked_in_at) : '-'}</p>
                              <p>check-out: {item.checked_out_at ? formatDateTime(item.checked_out_at) : '-'}</p>
                            </div>
                            <span className="passport-chip">{item.kind === 'class' ? 'Program' : 'Event'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">Belum ada history check-in / check-out.</p>
                    )}
                  </div>

                  <div className="payment-history" style={{ marginTop: '1rem' }}>
                    <h3>Order & payment</h3>
                    {memberOrderLoading ? (
                      <p className="feedback">Memuat order member...</p>
                    ) : memberOrderRows.length > 0 ? (
                      <div className="entity-list">
                        {memberOrderRows.map((item) => (
                          <div className="entity-row" key={item.order_id}>
                            <div>
                              <strong>{item.order_label || item.order_id}</strong>
                              <p>{formatOrderTypeLabel(item.order_type)} | {resolveOrderReferenceLabel(item, orderReferenceLookups)}</p>
                              <p>{item.order_id} | {Array.isArray(item.order_items) && item.order_items.length > 1 ? `${item.item_count || item.order_items.length || 0} items` : `qty ${item.qty || 0}`}</p>
                              <p>{formatDateTime(item.created_at || item.updated_at)}</p>
                            </div>
                            <div className="payment-meta">
                              <strong>{formatIdr(item.total_amount || 0)}</strong>
                              <span className={`status ${item.status}`}>{item.status || '-'}</span>
                              <small>{item.payment_status || 'no payment'}</small>
                              {String(item.payment_status || '').toLowerCase() !== 'confirmed'
                              && String(item.status || '').toLowerCase() !== 'deleted' ? (
                                <>
                                  <button className="btn ghost small" type="button" onClick={() => openOrderEditor(item)}>
                                    Edit pending
                                  </button>
                                  <button className="btn ghost small" type="button" disabled={actionSaving} onClick={() => deletePendingOrder(item)}>
                                    Delete pending
                                  </button>
                                </>
                                ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">Belum ada order untuk member ini.</p>
                    )}
                  </div>

                  <div className="payment-history" style={{ marginTop: '1rem' }}>
                    <h3>Payment history</h3>
                    {memberPaymentLoading ? (
                      <p className="feedback">Memuat payment member...</p>
                    ) : memberPaymentRows.length > 0 ? (
                      <div className="entity-list">
                        {memberPaymentRows.map((item) => (
                          <div className="entity-row" key={item.payment_id}>
                            <div>
                              <strong>{item.payment_id}</strong>
                              <p>{item.reference_type || '-'} | {item.reference_id || '-'}</p>
                              <p>{formatDateTime(item.recorded_at)}</p>
                            </div>
                            <div className="payment-meta">
                              <strong>{formatIdr(item.amount || 0)}</strong>
                              <span className={`status ${item.status}`}>{item.status || '-'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">Belum ada payment untuk member ini.</p>
                    )}
                  </div>
                </div>
              ) : null}

              {actionFeedback ? <p className="feedback" style={{ marginTop: '0.9rem' }}>{actionFeedback}</p> : null}
            </div>
          )}
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
              {selectedMember ? (
                <div className="card" style={{ marginBottom: '1rem', borderStyle: 'dashed' }}>
                  <p className="eyebrow">Quick check-in / check-out</p>
                  <p>
                    Member: <strong>{selectedMember.full_name || selectedMember.member_id}</strong>
                  </p>
                  <p>
                    Event: <strong>{selectedEvent.event_name || selectedEvent.event_id}</strong>
                  </p>
                  {selectedEventParticipantForMember ? (
                    <>
                      <p>
                        Status:
                        {' '}
                        {selectedEventParticipantForMember.checked_out_at
                          ? 'checked out'
                          : selectedEventParticipantForMember.checked_in_at
                            ? 'checked in'
                            : 'registered'}
                      </p>
                      <p>Participant no: {selectedEventParticipantForMember.participant_no || '-'}</p>
                      <div className="row-actions">
                        <button
                          className="btn ghost"
                          type="button"
                          disabled={actionSaving || (selectedEventParticipantForMember?.checked_in_at && !selectedEventParticipantForMember?.checked_out_at)}
                          onClick={() => checkinByIdentity({ member: selectedMember, participant: selectedEventParticipantForMember })}
                        >
                          Check-in selected member
                        </button>
                        <button
                          className="btn ghost"
                          type="button"
                          disabled={actionSaving || !selectedEventParticipantForMember.checked_in_at}
                          onClick={() => checkoutByIdentity({ member: selectedMember, participant: selectedEventParticipantForMember })}
                        >
                          Check-out selected member
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="feedback">Member ini belum terdaftar di event terpilih, jadi belum bisa check-in / check-out.</p>
                  )}
                </div>
              ) : null}
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
              <div className="row-actions" style={{ marginBottom: '0.75rem' }}>
                <button
                  className="btn ghost small"
                  type="button"
                  onClick={() => setCheckinCustomFieldsText('{"scanner":"front-desk","shift":"morning"}')}
                >
                  Fill check-in sample
                </button>
                <button
                  className="btn ghost small"
                  type="button"
                  onClick={() => setCheckoutCustomFieldsText('{"scanner":"front-desk","result":"completed"}')}
                >
                  Fill check-out sample
                </button>
              </div>
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
                        <button
                          className="btn ghost small"
                          type="button"
                          disabled={actionSaving || (participant?.checked_in_at && !participant?.checked_out_at)}
                          onClick={() => checkinByIdentity({ participant })}
                        >
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

          {selectedMember && selectedClass ? (
            <div className="card" style={{ marginTop: '1rem', borderStyle: 'dashed' }}>
              <p className="eyebrow">Quick class attendance</p>
              <p>
                Member: <strong>{selectedMember.full_name || selectedMember.member_id}</strong>
              </p>
              <p>
                Program: <strong>{selectedClass.class_name || selectedClass.class_id}</strong>
              </p>
              {selectedClassBookingForMember ? (
                <>
                  <p>Booking: {selectedClassBookingForMember.booking_id || '-'}</p>
                  <p>
                    Status attendance:
                    {' '}
                    {selectedClassBookingForMember.attendance_checked_out_at
                      ? 'checked out'
                      : selectedClassBookingForMember.attendance_checked_in_at || selectedClassBookingForMember.attendance_confirmed_at
                        ? 'checked in'
                        : 'booked'}
                  </p>
                  <div className="row-actions">
                    <button
                      className="btn ghost"
                      type="button"
                      disabled={actionSaving || ((selectedClassBookingForMember?.attendance_checked_in_at || selectedClassBookingForMember?.attendance_confirmed_at) && !selectedClassBookingForMember?.attendance_checked_out_at)}
                      onClick={() => checkinClassBooking(selectedClassBookingForMember)}
                    >
                      Check-in selected member
                    </button>
                    <button
                      className="btn ghost"
                      type="button"
                      disabled={actionSaving || !(selectedClassBookingForMember.attendance_checked_in_at || selectedClassBookingForMember.attendance_confirmed_at)}
                      onClick={() => checkoutClassBooking(selectedClassBookingForMember)}
                    >
                      Check-out selected member
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="feedback">
                    {selectedClassIsMembershipMode
                      ? 'Program membership ini tidak butuh booking untuk check-in.'
                      : 'Member ini belum punya booking di program terpilih.'}
                  </p>
                  {selectedClassIsMembershipMode ? (
                    <div className="row-actions">
                      <button
                        className="btn ghost"
                        type="button"
                        disabled={actionSaving || selectedMembershipCanCheckout}
                        onClick={() => checkinMembershipClassWithoutBooking()}
                      >
                        {selectedMembershipCanCheckout ? 'Checked-in' : 'Check-in selected member'}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

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
                          check-in: {booking.attendance_checked_in_at || booking.attendance_confirmed_at ? formatDateTime(booking.attendance_checked_in_at || booking.attendance_confirmed_at) : '-'}
                        </p>
                        <p>
                          check-out: {booking.attendance_checked_out_at ? formatDateTime(booking.attendance_checked_out_at) : '-'}
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
                            Boolean(booking.attendance_checked_out_at) ||
                            ((booking?.attendance_checked_in_at || booking?.attendance_confirmed_at) && !booking?.attendance_checked_out_at)
                          }
                          onClick={() => checkinClassBooking(booking)}
                        >
                          Check-in
                        </button>
                        <button
                          className="btn ghost small"
                          type="button"
                          disabled={
                            actionSaving ||
                            String(booking.status || '').toLowerCase() === 'canceled' ||
                            !(booking.attendance_checked_in_at || booking.attendance_confirmed_at)
                          }
                          onClick={() => checkoutClassBooking(booking)}
                        >
                          {booking.attendance_checked_out_at ? 'Refresh Check-out' : 'Check-out'}
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

      {workspaceTab === 'report' ? (
        <section className="card search-panel">
          <div className="panel-head" style={{ marginBottom: '0.5rem' }}>
            <div>
              <p className="eyebrow">Daily report</p>
              <h2>Ringkasan operasional hari ini</h2>
            </div>
            <button className="btn ghost small" type="button" onClick={exportDailyReportCsv}>
              Export CSV
            </button>
          </div>
          <div className="entity-list" style={{ marginTop: '0.75rem' }}>
            {dailyReportRows.map((item) => (
              <div className="entity-row" key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                </div>
                <span className="passport-chip">{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="dash-foot">
        <Link to="/">Kembali ke Home</Link>
      </footer>
    </BackendWorkspaceShell>
  );
}
