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

function buildOrderTargetKey(sourceKind, sourceId) {
  return `${String(sourceKind || '').trim()}:${String(sourceId || '').trim()}`;
}

function normalizeOrderType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['membership', 'event', 'class', 'product'].includes(normalized) ? normalized : 'membership';
}

function formatOrderTypeLabel(value) {
  const normalized = normalizeOrderType(value);
  if (normalized === 'membership') return 'Membership';
  if (normalized === 'event') return 'Event';
  if (normalized === 'class') return 'Program';
  if (normalized === 'product') return 'Product';
  return 'Order';
}

function resolveOrderReferenceLabel(item, lookups = {}) {
  const referenceType = String(item?.reference_type || '').trim().toLowerCase();
  const referenceId = String(item?.reference_id || '').trim();
  const classesById = lookups.classesById || new Map();
  const eventsById = lookups.eventsById || new Map();
  const productsById = lookups.productsById || new Map();
  const membershipsById = lookups.membershipsById || new Map();
  if (referenceType === 'membership_purchase' || referenceType === 'open_access_purchase') {
    return membershipsById.get(referenceId) || referenceId || '-';
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
  const [participantSearchLoading, setParticipantSearchLoading] = useState(false);
  const [checkinCustomFieldsText, setCheckinCustomFieldsText] = useState('');
  const [checkoutCustomFieldsText, setCheckoutCustomFieldsText] = useState('');
  const [bookingRegistrationAnswers, setBookingRegistrationAnswers] = useState({});
  const [memberOrderRows, setMemberOrderRows] = useState([]);
  const [memberOrderLoading, setMemberOrderLoading] = useState(false);
  const [memberPaymentRows, setMemberPaymentRows] = useState([]);
  const [memberPaymentLoading, setMemberPaymentLoading] = useState(false);
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderForm, setOrderForm] = useState({
    order_type: 'membership',
    target_key: '',
    label: '',
    qty: '1',
    unit_price: '',
    method: 'cash',
    settlement: 'pending',
    notes: ''
  });
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

  function applyOrderTarget(target) {
    if (!target) return;
    setOrderForm((prev) => ({
      ...prev,
      target_key: target.key,
      label: target.order_label || prev.label,
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

  async function submitOrder() {
    if (!selectedMember) {
      setActionFeedback('Pilih member dulu sebelum membuat order.');
      return;
    }
    const orderType = normalizeOrderType(orderForm.order_type);
    if (!selectedOrderTarget) {
      setActionFeedback('Pilih target order sesuai tipenya terlebih dulu.');
      return;
    }
    const label = String(orderForm.label || '').trim() || selectedOrderTarget.order_label;
    if (!label) {
      setActionFeedback('Label order wajib diisi.');
      return;
    }
    const qty = Math.max(1, Number(orderForm.qty || 1));
    const resolvedQty = orderType === 'product' ? qty : 1;
    const unitPrice = Math.max(0, Number(orderForm.unit_price || selectedOrderTarget.unit_price || 0));
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      setActionFeedback('Harga order harus lebih besar dari 0.');
      return;
    }
    try {
      setOrderSaving(true);
      setActionFeedback('');
      const response = await apiJson('/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          member_id: selectedMember.member_id,
          order_label: label,
          order_type: orderType,
          qty: resolvedQty,
          unit_price: unitPrice,
          currency: 'IDR',
          payment_method: orderForm.method || 'cash',
          payment_settlement: orderForm.settlement || 'pending',
          reference_type: selectedOrderTarget.reference_type,
          reference_id: selectedOrderTarget.reference_id,
          notes: String(orderForm.notes || '').trim() || `CS dashboard order for ${selectedMember.full_name || selectedMember.member_id}`
        })
      });
      await loadDashboard();
      await loadSelectedMemberOrders(selectedMember.member_id);
      await loadSelectedMemberPayments(selectedMember.member_id);
      setOrderForm({
        order_type: orderType,
        target_key: '',
        label: '',
        qty: '1',
        unit_price: '',
        method: 'cash',
        settlement: 'pending',
        notes: ''
      });
      setActionFeedback(
        `order.created: ${selectedMember.full_name || selectedMember.member_id} -> ${response?.order?.order_id || '-'} (${response?.order?.payment_status || 'pending'})`
      );
    } catch (err) {
      setActionFeedback(err.message || 'failed to create order');
    } finally {
      setOrderSaving(false);
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
    const activityTargets = classes
      .filter((item) => String(item?.class_type || '').trim().toLowerCase() === 'open_access')
      .map((item) => ({
        key: buildOrderTargetKey('activity', item.class_id),
        source_kind: 'activity',
        source_id: String(item.class_id || ''),
        label: item.class_name || item.title || item.class_id || 'Membership',
        helper: 'activity / open access',
        unit_price: Number(item.price || 0),
        reference_type: 'open_access_purchase',
        reference_id: item.class_id || null,
        order_label: `Membership - ${item.class_name || item.title || item.class_id}`
      }));
    const packageTargets = packages
      .filter((item) => String(item?.package_type || '').trim().toLowerCase() === 'membership')
      .map((item) => ({
        key: buildOrderTargetKey('package', item.package_id),
        source_kind: 'package',
        source_id: String(item.package_id || ''),
        label: item.package_name || item.package_id || 'Membership Package',
        helper: 'legacy package',
        unit_price: Number(item.price || 0),
        reference_type: 'membership_purchase',
        reference_id: item.package_id || null,
        order_label: `Membership - ${item.package_name || item.package_id}`
      }));
    return [...activityTargets, ...packageTargets];
  }, [classes, packages]);
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
  const classOrderTargets = useMemo(() => (
    classes
      .filter((item) => String(item?.class_type || 'scheduled').trim().toLowerCase() === 'scheduled')
      .map((item) => ({
        key: buildOrderTargetKey('class', item.class_id),
        source_kind: 'class',
        source_id: String(item.class_id || ''),
        label: item.class_name || item.class_id || 'Program',
        helper: item.trainer_name || item.branch_id || 'program',
        unit_price: Number(item.price || 0),
        reference_type: 'class_booking',
        reference_id: item.class_id || null,
        order_label: `Program - ${item.class_name || item.class_id}`
      }))
  ), [classes]);
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
  const currentOrderTargets = useMemo(() => {
    const orderType = normalizeOrderType(orderForm.order_type);
    if (orderType === 'membership') return membershipOrderTargets;
    if (orderType === 'event') return eventOrderTargets;
    if (orderType === 'class') return classOrderTargets;
    if (orderType === 'product') return productOrderTargets;
    return [];
  }, [orderForm.order_type, membershipOrderTargets, eventOrderTargets, classOrderTargets, productOrderTargets]);
  const selectedOrderTarget = useMemo(
    () => currentOrderTargets.find((item) => item.key === orderForm.target_key) || null,
    [currentOrderTargets, orderForm.target_key]
  );
  const orderReferenceLookups = useMemo(() => {
    const membershipsById = new Map();
    membershipOrderTargets.forEach((item) => {
      if (item.reference_id) membershipsById.set(String(item.reference_id), item.label);
    });
    return {
      membershipsById,
      eventsById: new Map(activeEvents.map((item) => [String(item.event_id || ''), item.event_name || item.event_id || '-'])),
      classesById: new Map(classes.map((item) => [String(item.class_id || ''), item.class_name || item.class_id || '-'])),
      productsById: new Map(products.map((item) => [String(item.product_id || ''), item.product_name || item.product_id || '-']))
    };
  }, [membershipOrderTargets, activeEvents, classes, products]);

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
  const selectedClassBookingForMember = useMemo(() => {
    if (!selectedMember || !selectedClass) return null;
    return classBookings.find((booking) => isSameBookingMember(selectedMember, booking)) || null;
  }, [classBookings, selectedClass, selectedMember]);
  const selectedEventParticipantForMember = useMemo(() => {
    if (!selectedMember || !selectedEvent) return null;
    return eventParticipants.find((participant) => isSameParticipant(selectedMember, participant)) || null;
  }, [eventParticipants, selectedEvent, selectedMember]);
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

  async function checkinClassBooking(booking) {
    if (!booking?.booking_id) return;
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
      if (result?.duplicate) {
        setActionFeedback(`class.checkin.skip: ${booking.booking_id} sudah check-in sebelumnya.`);
      } else {
        setActionFeedback(`class.checkin.success: ${booking.booking_id}`);
      }
    } catch (err) {
      setActionFeedback(err.message || 'failed to check in class booking');
    } finally {
      setActionSaving(false);
    }
  }

  async function checkoutClassBooking(booking) {
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
      if (result?.duplicate) {
        setActionFeedback(`class.checkout.skip: ${booking.booking_id} sudah check-out sebelumnya.`);
      } else {
        setActionFeedback(`class.checkout.success: ${booking.booking_id}`);
      }
    } catch (err) {
      setActionFeedback(err.message || 'failed to check out class booking');
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

      <section className="ops-grid" style={{ marginTop: '1rem' }}>
        <article className="card">
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
        </article>
        <article className="card">
          <p className="eyebrow">CS start here</p>
          <h2>Entry flow staf hari ini</h2>
          <p className="feedback">1. Pilih member. 2. Pilih tipe order dan target. 3. Simulasikan payment bila perlu. 4. Lanjut ke event/program desk untuk check-in atau attendance.</p>
          <div className="row-actions" style={{ marginTop: '0.75rem' }}>
            <button className="btn ghost small" type="button" onClick={() => setWorkspaceTab('member')}>
              Member desk
            </button>
            <button
              className="btn ghost small"
              type="button"
              onClick={() => {
                setWorkspaceTab('event');
                setSelectedExperienceType('event');
              }}
            >
              Event desk
            </button>
            {showClassWorkspace ? (
              <button
                className="btn ghost small"
                type="button"
                onClick={() => {
                  setWorkspaceTab('class');
                  setSelectedExperienceType('class');
                }}
              >
                Program desk
              </button>
            ) : null}
          </div>
        </article>
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

          {selectedMember ? (
            <div className="ops-grid" style={{ marginTop: '1rem' }}>
              <article className="card">
                <p className="eyebrow">Selected member</p>
                <h3>{selectedMember.full_name || selectedMember.member_id}</h3>
                <p>member_id: {selectedMember.member_id || '-'}</p>
                <p>phone: {selectedMember.phone || '-'}</p>
                <p>email: {selectedMember.email || '-'}</p>
              </article>
              <article className="card">
                <p className="eyebrow">Create order</p>
                <p className="feedback">Order disusun per tipe supaya reference dan harga lebih konsisten. Payment tetap simulasi: bisa pending atau paid tanpa gateway asli.</p>
                <div className="form">
                  <label>
                    Order type
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
                      <option value="membership">membership</option>
                      <option value="event">event</option>
                      <option value="class">class</option>
                      <option value="product">product</option>
                    </select>
                  </label>
                  <label>
                    Target
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
                      <option value="">
                        {currentOrderTargets.length > 0
                          ? `Pilih ${formatOrderTypeLabel(orderForm.order_type).toLowerCase()}`
                          : `Belum ada ${formatOrderTypeLabel(orderForm.order_type).toLowerCase()} aktif`}
                      </option>
                      {currentOrderTargets.map((item) => (
                        <option key={item.key} value={item.key}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedOrderTarget ? (
                    <div className="card" style={{ borderStyle: 'dashed' }}>
                      <p className="eyebrow">Selected target</p>
                      <p><strong>{selectedOrderTarget.label}</strong></p>
                      <p>{selectedOrderTarget.helper}</p>
                      <p>Reference: {selectedOrderTarget.reference_type} / {selectedOrderTarget.reference_id || '-'}</p>
                      <p>Default price: {formatIdr(selectedOrderTarget.unit_price || 0)}</p>
                    </div>
                  ) : null}
                  <label>
                    Order label
                    <input
                      value={orderForm.label}
                      onChange={(e) => setOrderForm((prev) => ({ ...prev, label: e.target.value }))}
                      placeholder={
                        selectedOrderTarget?.order_label || 'Membership April / Event / Program / Product'
                      }
                    />
                  </label>
                  <label>
                    Qty
                    <input
                      type="number"
                      min="1"
                      value={orderForm.qty}
                      onChange={(e) => setOrderForm((prev) => ({ ...prev, qty: e.target.value }))}
                      disabled={normalizeOrderType(orderForm.order_type) !== 'product'}
                    />
                  </label>
                  <label>
                    Unit price
                    <input
                      type="number"
                      min="0"
                      value={orderForm.unit_price}
                      onChange={(e) => setOrderForm((prev) => ({ ...prev, unit_price: e.target.value }))}
                    />
                  </label>
                  <label>
                    Payment method
                    <select
                      value={orderForm.method}
                      onChange={(e) => setOrderForm((prev) => ({ ...prev, method: e.target.value }))}
                    >
                      <option value="cash">cash</option>
                      <option value="qris">qris</option>
                      <option value="virtual_account">virtual_account</option>
                      <option value="bank_transfer">bank_transfer</option>
                      <option value="ewallet">ewallet</option>
                    </select>
                  </label>
                  <label>
                    Payment result
                    <select
                      value={orderForm.settlement}
                      onChange={(e) => setOrderForm((prev) => ({ ...prev, settlement: e.target.value }))}
                    >
                      <option value="pending">pending</option>
                      <option value="paid">paid</option>
                    </select>
                  </label>
                  <label>
                    Notes
                    <input
                      value={orderForm.notes}
                      onChange={(e) => setOrderForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Catatan internal order untuk CS"
                    />
                  </label>
                  <div className="row-actions">
                    <button className="btn" type="button" disabled={orderSaving} onClick={submitOrder}>
                      {orderSaving ? 'Menyimpan...' : 'Create order'}
                    </button>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={applyCurrentContextToOrder}
                    >
                      Use current context
                    </button>
                  </div>
                </div>
              </article>
            </div>
          ) : null}

          {selectedMember ? (
            <div className="payment-history" style={{ marginTop: '1rem' }}>
              <h3>Member orders</h3>
              {memberOrderLoading ? (
                <p className="feedback">Memuat order member...</p>
              ) : memberOrderRows.length > 0 ? (
                <div className="entity-list">
                  {memberOrderRows.slice(0, 8).map((item) => (
                    <div className="entity-row" key={item.order_id}>
                      <div>
                        <strong>{item.order_label || item.order_id}</strong>
                        <p>{formatOrderTypeLabel(item.order_type)} | {resolveOrderReferenceLabel(item, orderReferenceLookups)}</p>
                        <p>{item.order_id} | qty {item.qty || 0}</p>
                        <p>{formatDateTime(item.created_at || item.updated_at)}</p>
                      </div>
                      <div className="payment-meta">
                        <strong>{formatIdr(item.total_amount || 0)}</strong>
                        <span className={`status ${item.status}`}>{item.status || '-'}</span>
                        <small>{item.payment_status || 'no payment'}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Belum ada order untuk member ini.</p>
              )}
            </div>
          ) : null}

          {selectedMember ? (
            <div className="payment-history" style={{ marginTop: '1rem' }}>
              <h3>Member payments</h3>
              {memberPaymentLoading ? (
                <p className="feedback">Memuat payment member...</p>
              ) : memberPaymentRows.length > 0 ? (
                <div className="entity-list">
                  {memberPaymentRows.slice(0, 8).map((item) => (
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
          ) : null}
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
                          disabled={actionSaving}
                          onClick={() => checkinByIdentity({ member: selectedMember, participant: selectedEventParticipantForMember })}
                        >
                          {selectedEventParticipantForMember.checked_in_at ? 'Refresh check-in' : 'Check-in selected member'}
                        </button>
                        <button
                          className="btn ghost"
                          type="button"
                          disabled={actionSaving || !selectedEventParticipantForMember.checked_in_at}
                          onClick={() => checkoutByIdentity({ member: selectedMember, participant: selectedEventParticipantForMember })}
                        >
                          {selectedEventParticipantForMember.checked_out_at ? 'Refresh check-out' : 'Check-out selected member'}
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
                      disabled={actionSaving}
                      onClick={() => checkinClassBooking(selectedClassBookingForMember)}
                    >
                      {selectedClassBookingForMember.attendance_checked_in_at || selectedClassBookingForMember.attendance_confirmed_at
                        ? 'Refresh check-in'
                        : 'Check-in selected member'}
                    </button>
                    <button
                      className="btn ghost"
                      type="button"
                      disabled={actionSaving || !(selectedClassBookingForMember.attendance_checked_in_at || selectedClassBookingForMember.attendance_confirmed_at)}
                      onClick={() => checkoutClassBooking(selectedClassBookingForMember)}
                    >
                      {selectedClassBookingForMember.attendance_checked_out_at
                        ? 'Refresh check-out'
                        : 'Check-out selected member'}
                    </button>
                  </div>
                </>
              ) : (
                <p className="feedback">Member ini belum punya booking di program terpilih.</p>
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
                            Boolean(booking.attendance_checked_out_at)
                          }
                          onClick={() => checkinClassBooking(booking)}
                        >
                          {booking.attendance_checked_in_at || booking.attendance_confirmed_at ? 'Refresh Check-in' : 'Check-in'}
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

      <footer className="dash-foot">
        <Link to="/">Kembali ke Home</Link>
      </footer>
    </main>
  );
}
