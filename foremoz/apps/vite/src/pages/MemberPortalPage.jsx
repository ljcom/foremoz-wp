import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiJson, clearSession, getSession, setSession } from '../lib.js';
import { getMemberPortalConfig } from '../config/app-config.js';
import { formatAppDateTime } from '../time.js';

const MEMBER_PORTAL_CONFIG = getMemberPortalConfig();
const MEMBER_PROGRAMS_CONFIG = MEMBER_PORTAL_CONFIG.programs || {};
const MEMBER_PROGRAM_SCHEDULE_FIELD_CONFIG = MEMBER_PROGRAMS_CONFIG.scheduleField || {};

function normalizeAttachmentUrls(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
}

function formatIdr(value) {
  return `IDR ${Number(value || 0).toLocaleString('id-ID')}`;
}

function resolveMemberInfo(customFields) {
  const source = customFields && typeof customFields === 'object' && !Array.isArray(customFields) ? customFields : {};
  return {
    preText: String(source.member_pre_info_text || '').trim(),
    preAttachments: normalizeAttachmentUrls(source.member_pre_info_attachments),
    postText: String(source.member_post_info_text || '').trim(),
    postAttachments: normalizeAttachmentUrls(source.member_post_info_attachments)
  };
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
    preAttachments: normalizeAttachmentUrls(customFields.member_pre_info_attachments),
    postText: String(customFields.member_post_info_text || '').trim(),
    postAttachments: normalizeAttachmentUrls(customFields.member_post_info_attachments)
  };
}

function formatRegistrationAnswers(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value)
    .map(([label, answer]) => ({
      label: String(label || '').trim(),
      answer: String(answer || '').trim()
    }))
    .filter((item) => item.label && item.answer);
}

function attachmentNameFromUrl(url) {
  const value = String(url || '').trim();
  if (!value) return 'Attachment';
  const [path] = value.split('?');
  const segments = path.split('/');
  return decodeURIComponent(segments[segments.length - 1] || 'Attachment');
}

function isImageAttachment(url) {
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(String(url || '').trim());
}

const WEEKDAY_LABELS = {
  sun: 'Minggu',
  mon: 'Senin',
  tue: 'Selasa',
  wed: 'Rabu',
  thu: 'Kamis',
  fri: 'Jumat',
  sat: 'Sabtu'
};

function getProgramScheduleOptions(classItem) {
  const scheduleMode = String(classItem?.schedule_mode || 'none').trim().toLowerCase();
  const weeklySchedule = classItem?.weekly_schedule || {};
  const startTime = String(weeklySchedule.start_time || '').trim();
  const endTime = String(weeklySchedule.end_time || '').trim();
  if (scheduleMode === 'manual') {
    return (Array.isArray(classItem?.manual_schedule) ? classItem.manual_schedule : []).map((item, index) => ({
      key: `manual:${item.start_at}:${item.end_at}:${index}`,
      label: `${formatAppDateTime(item.start_at)} - ${formatAppDateTime(item.end_at)}`,
      payload: {
        schedule_mode: 'manual',
        start_at: item.start_at,
        end_at: item.end_at
      }
    }));
  }
  if (scheduleMode === 'everyday') {
    return [{
      key: `everyday:${startTime}:${endTime}`,
      label: startTime && endTime ? `Setiap hari | ${startTime}-${endTime}` : 'Setiap hari',
      payload: {
        schedule_mode: 'everyday',
        start_time: startTime,
        end_time: endTime
      }
    }];
  }
  if (scheduleMode === 'weekly') {
    return (Array.isArray(weeklySchedule.weekdays) ? weeklySchedule.weekdays : [])
      .map((weekday) => String(weekday || '').trim().toLowerCase())
      .filter(Boolean)
      .map((weekday) => ({
        key: `weekly:${weekday}:${startTime}:${endTime}`,
        label: `${WEEKDAY_LABELS[weekday] || weekday.toUpperCase()} | ${startTime}-${endTime}`,
        payload: {
          schedule_mode: 'weekly',
          weekday,
          start_time: startTime,
          end_time: endTime
        }
      }));
  }
  return [];
}

function getProgramScheduleSummary(classItem) {
  const options = getProgramScheduleOptions(classItem);
  if (options.length === 0) return 'Schedule belum diatur';
  if (options.length === 1) return options[0].label;
  return `${options.length} opsi jadwal tersedia`;
}

function getBookingScheduleLabel(booking) {
  return String(booking?.schedule_label || '').trim();
}

function getBookingAttendanceStatus(booking) {
  if (booking?.attendance_checked_out_at) return 'completed';
  if (booking?.attendance_checked_in_at || booking?.attendance_confirmed_at) return 'checked_in';
  return String(booking?.status || 'booked').trim().toLowerCase() || 'booked';
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
  const [classes, setClasses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [ptBalances, setPtBalances] = useState([]);
  const [packages, setPackages] = useState([]);
  const [portalLoading, setPortalLoading] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    class_id: '',
    schedule_key: '',
    amount: '0',
    method: 'virtual_account',
    registration_answers: {}
  });
  const accountSlug = account || session?.tenant?.account_slug || 'tn_001';
  const memberEmail = String(session?.user?.email || '').trim().toLowerCase();
  const memberId = String(session?.user?.memberId || '').trim();
  const tenantId = session?.tenant?.id || 'tn_001';
  const branchId = session?.branch?.id || 'core';

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
  const nextUpcomingEvent = useMemo(() => {
    const now = Date.now();
    return [...orderedMyEvents]
      .filter((item) => new Date(item?.start_at || 0).getTime() >= now)
      .sort((a, b) => new Date(a.start_at || 0).getTime() - new Date(b.start_at || 0).getTime())[0] || null;
  }, [orderedMyEvents]);
  const availablePrograms = useMemo(
    () => {
      const allowedClassTypes = new Set(['scheduled', 'session_pack']);
      const allowedReferenceTypes = new Set([
        'class_booking',
        'open_access_purchase',
        'activity_purchase',
        'session_pack_purchase',
        'pt_package_purchase'
      ]);
      const membershipClassIds = new Set(
        packages
          .filter((item) => String(item?.package_type || '').trim().toLowerCase() === 'membership')
          .map((item) => String(item?.class_id || '').trim())
          .filter(Boolean)
      );
      const packageClassIdByPackageId = new Map(
        packages
          .map((item) => [String(item?.package_id || '').trim(), String(item?.class_id || '').trim()])
          .filter(([packageId, classId]) => packageId && classId)
      );
      const purchasedProgramIds = new Set();
      orders.forEach((order) => {
        const orderStatus = String(order?.status || '').trim().toLowerCase();
        const paymentStatus = String(order?.payment_status || '').trim().toLowerCase();
        const isPurchased = orderStatus === 'paid' || paymentStatus === 'confirmed';
        if (!isPurchased) return;
        const items = Array.isArray(order?.order_items) && order.order_items.length > 0
          ? order.order_items
          : [order];
        items.forEach((item) => {
          const referenceType = String(item?.reference_type || '').trim().toLowerCase();
          const referenceId = String(item?.reference_id || '').trim();
          if (!referenceId || !allowedReferenceTypes.has(referenceType)) return;
          if (referenceType === 'session_pack_purchase' || referenceType === 'pt_package_purchase') {
            const mappedClassId = packageClassIdByPackageId.get(referenceId);
            if (mappedClassId) purchasedProgramIds.add(mappedClassId);
            purchasedProgramIds.add(referenceId);
            return;
          }
          purchasedProgramIds.add(referenceId);
        });
      });
      return classes.filter((item) => {
        const classType = String(item?.class_type || 'scheduled').trim().toLowerCase();
        const classId = String(item?.class_id || '').trim();
        return allowedClassTypes.has(classType)
          && classId
          && purchasedProgramIds.has(classId)
          && !membershipClassIds.has(classId);
      });
    },
    [classes, orders, packages]
  );
  const selectedProgram = useMemo(
    () => availablePrograms.find((item) => String(item?.class_id || '') === String(bookingForm.class_id || '')) || null,
    [availablePrograms, bookingForm.class_id]
  );
  const selectedProgramRegistrationFields = useMemo(
    () => getClassRegistrationFields(selectedProgram),
    [selectedProgram]
  );
  const selectedProgramInfo = useMemo(
    () => resolveProgramInfo(selectedProgram),
    [selectedProgram]
  );
  const selectedProgramScheduleOptions = useMemo(
    () => getProgramScheduleOptions(selectedProgram),
    [selectedProgram]
  );
  const bookingPerformance = useMemo(() => {
    const total = orderedBookings.length;
    const canceled = orderedBookings.filter((item) => String(item?.status || '').toLowerCase() === 'canceled').length;
    const checkedIn = orderedBookings.filter((item) => item?.attendance_checked_in_at || item?.attendance_confirmed_at).length;
    const completed = orderedBookings.filter((item) => item?.attendance_checked_out_at).length;
    const active = total - canceled;
    const attendanceRate = active > 0 ? Math.round((checkedIn / active) * 100) : 0;
    return { total, active, canceled, checkedIn, completed, attendanceRate };
  }, [orderedBookings]);
  const nextUpcomingProgramBooking = useMemo(() => {
    const now = Date.now();
    return orderedBookings
      .filter((item) => String(item?.status || '').toLowerCase() !== 'canceled')
      .map((item) => {
        const scheduleStart = item?.schedule_choice?.start_at || item?.class_detail?.start_at || null;
        return {
          ...item,
          schedule_start_at: scheduleStart
        };
      })
      .filter((item) => !item.schedule_start_at || new Date(item.schedule_start_at).getTime() >= now)
      .sort((left, right) => new Date(left.schedule_start_at || left.booked_at || 0).getTime() - new Date(right.schedule_start_at || right.booked_at || 0).getTime())[0] || null;
  }, [orderedBookings]);

  useEffect(
    () => () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    },
    [photoPreviewUrl]
  );

  async function refreshPortalData() {
    if (!memberEmail && !memberId) {
      setMyEvents([]);
      setClasses([]);
      setPayments([]);
      setOrders([]);
      setBookings([]);
      setSubscriptions([]);
      setPtBalances([]);
      setPackages([]);
      return;
    }
    setMyEventsLoading(true);
    setPortalLoading(true);
    setMyEventsError('');
    try {
      await apiJson('/v1/projections/run', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId
        })
      }).catch(() => {});
      const [registrationRes, eventRes, paymentRes, bookingRes, subscriptionRes, ptBalanceRes] = await Promise.all([
        apiJson(`/v1/read/event-registrations?email=${encodeURIComponent(memberEmail)}&passport_id=${encodeURIComponent(memberId)}&limit=400`),
        apiJson('/v1/read/events?status=all&limit=400'),
        apiJson(`/v1/read/payments/history?tenant_id=${encodeURIComponent(tenantId)}&member_id=${encodeURIComponent(memberId)}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/read/bookings?tenant_id=${encodeURIComponent(tenantId)}&member_id=${encodeURIComponent(memberId)}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/read/subscriptions/active?tenant_id=${encodeURIComponent(tenantId)}&member_id=${encodeURIComponent(memberId)}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/read/pt-balance?tenant_id=${encodeURIComponent(tenantId)}&member_id=${encodeURIComponent(memberId)}`).catch(() => ({ rows: [] }))
      ]);
      const [classScopedRes, packageScopedRes, orderScopedRes] = await Promise.all([
        apiJson(`/v1/read/class-availability?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/admin/packages?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/read/orders?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}&member_id=${encodeURIComponent(memberId)}&limit=100`).catch(() => ({ rows: [] }))
      ]);
      let classRows = Array.isArray(classScopedRes?.rows) ? classScopedRes.rows : [];
      let packageRows = Array.isArray(packageScopedRes?.rows) ? packageScopedRes.rows : [];
      let orderRows = Array.isArray(orderScopedRes?.rows) ? orderScopedRes.rows : [];
      if (classRows.length === 0 || packageRows.length === 0 || orderRows.length === 0) {
        const [classGlobalRes, packageGlobalRes, orderGlobalRes] = await Promise.all([
          apiJson(`/v1/read/class-availability?tenant_id=${encodeURIComponent(tenantId)}`).catch(() => ({ rows: [] })),
          apiJson(`/v1/admin/packages?tenant_id=${encodeURIComponent(tenantId)}`).catch(() => ({ rows: [] })),
          apiJson(`/v1/read/orders?tenant_id=${encodeURIComponent(tenantId)}&member_id=${encodeURIComponent(memberId)}&limit=100`).catch(() => ({ rows: [] }))
        ]);
        if (classRows.length === 0) classRows = Array.isArray(classGlobalRes?.rows) ? classGlobalRes.rows : [];
        if (packageRows.length === 0) packageRows = Array.isArray(packageGlobalRes?.rows) ? packageGlobalRes.rows : [];
        if (orderRows.length === 0) orderRows = Array.isArray(orderGlobalRes?.rows) ? orderGlobalRes.rows : [];
      }
      const registrationRows = Array.isArray(registrationRes?.rows) ? registrationRes.rows : [];
      const registrationByEventId = new Map(
        registrationRows
          .map((item) => [String(item?.event_id || '').trim(), item])
          .filter(([eventId]) => eventId)
      );
      const joinedIds = new Set(
        (Array.isArray(registrationRes?.event_ids) ? registrationRes.event_ids : []).map((id) => String(id))
      );
      const eventRows = Array.isArray(eventRes?.rows) ? eventRes.rows : [];
      const joinedEvents = eventRows
        .filter((row) => joinedIds.has(String(row?.event_id || '')))
        .map((row) => ({
          ...row,
          member_registration: registrationByEventId.get(String(row?.event_id || '').trim()) || null
        }));
      const classById = new Map(
        classRows
          .map((item) => [String(item?.class_id || '').trim(), item])
          .filter(([classId]) => classId)
      );
      const enrichedBookings = (Array.isArray(bookingRes?.rows) ? bookingRes.rows : []).map((item) => ({
        ...item,
        class_detail: classById.get(String(item?.class_id || '').trim()) || null
      }));
      setMyEvents(joinedEvents);
      setClasses(classRows);
      setPayments(Array.isArray(paymentRes?.rows) ? paymentRes.rows : []);
      setOrders(orderRows);
      setBookings(enrichedBookings);
      setSubscriptions(Array.isArray(subscriptionRes?.rows) ? subscriptionRes.rows : []);
      setPtBalances(Array.isArray(ptBalanceRes?.rows) ? ptBalanceRes.rows : []);
      setPackages(packageRows);
    } catch (error) {
      setMyEvents([]);
      setClasses([]);
      setPayments([]);
      setOrders([]);
      setBookings([]);
      setSubscriptions([]);
      setPtBalances([]);
      setPackages([]);
      setMyEventsError(error.message || 'Gagal memuat portal member.');
    } finally {
      setMyEventsLoading(false);
      setPortalLoading(false);
    }
  }

  useEffect(() => {
    if (!bookingForm.class_id) return;
    const stillAvailable = availablePrograms.some((item) => String(item?.class_id || '') === String(bookingForm.class_id || ''));
    if (stillAvailable) return;
    setBookingForm((prev) => ({
      ...prev,
      class_id: '',
      schedule_key: '',
      amount: '0',
      registration_answers: {}
    }));
  }, [availablePrograms, bookingForm.class_id]);

  useEffect(() => {
    refreshPortalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberEmail, memberId, tenantId, branchId]);

  useEffect(() => {
    if (!selectedProgram) return;
    setBookingForm((prev) => {
      const nextAmount = Number(prev.amount || 0) > 0 ? prev.amount : String(selectedProgram.price || 0);
      const nextScheduleKey = prev.schedule_key || (selectedProgramScheduleOptions.length === 1 ? selectedProgramScheduleOptions[0].key : '');
      return {
        ...prev,
        amount: nextAmount,
        schedule_key: nextScheduleKey
      };
    });
  }, [selectedProgram, selectedProgramScheduleOptions]);

  async function submitProgramBooking() {
    if (!memberId) {
      setFeedback('Member ID belum tersedia untuk booking program.');
      return;
    }
    if (!selectedProgram?.class_id) {
      setFeedback('Pilih program terlebih dulu.');
      return;
    }
    const scheduleOptions = selectedProgramScheduleOptions;
    const chosenSchedule = scheduleOptions.find((item) => item.key === bookingForm.schedule_key) || (scheduleOptions.length === 1 ? scheduleOptions[0] : null);
    if (scheduleOptions.length > 0 && !chosenSchedule) {
      setFeedback(MEMBER_PROGRAM_SCHEDULE_FIELD_CONFIG.requiredFeedback);
      return;
    }
    for (let index = 0; index < selectedProgramRegistrationFields.length; index += 1) {
      const field = selectedProgramRegistrationFields[index] || {};
      const fieldId = String(field.field_id || '');
      const label = String(field.label || `Field ${index + 1}`);
      const value = String(bookingForm.registration_answers[fieldId] || '').trim();
      if (field.required !== false && !value) {
        setFeedback(`${label} wajib diisi.`);
        return;
      }
    }

    try {
      setBookingSaving(true);
      setFeedback('');

      await apiJson('/v1/bookings/classes/create', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: selectedProgram.branch_id || branchId,
          booking_id: `book_${Date.now()}`,
          class_id: selectedProgram.class_id,
          booking_kind: 'member',
          member_id: memberId,
          guest_name: session?.user?.fullName || null,
          registration_answers: bookingForm.registration_answers,
          schedule_choice: chosenSchedule?.key || null,
          schedule_label: chosenSchedule?.label || null
        })
      });

      await refreshPortalData();
      setBookingForm({
        class_id: '',
        schedule_key: '',
        amount: '0',
        method: 'virtual_account',
        registration_answers: {}
      });
      setFeedback(`program.booking.created: ${selectedProgram.class_name || selectedProgram.class_id}`);
      setTab('programs');
    } catch (error) {
      setFeedback(error.message || 'Gagal booking program.');
    } finally {
      setBookingSaving(false);
    }
  }

  async function cancelProgramBooking(booking) {
    if (!booking?.booking_id) return;
    try {
      setBookingSaving(true);
      setFeedback('');
      const result = await apiJson(`/v1/bookings/classes/${encodeURIComponent(booking.booking_id)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: booking.branch_id || booking.class_detail?.branch_id || branchId
        })
      });
      await refreshPortalData();
      if (result?.duplicate) {
        setFeedback(`booking.skip: ${booking.booking_id} sudah canceled.`);
      } else {
        setFeedback(`booking.canceled: ${booking.booking_id}`);
      }
    } catch (error) {
      setFeedback(error.message || 'Gagal cancel booking program.');
    } finally {
      setBookingSaving(false);
    }
  }

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
          <button className={`landing-tab ${tab === 'programs' ? 'active' : ''}`} onClick={() => setTab('programs')}>
            Programs
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
                  <button className="btn ghost" type="button" onClick={() => setTab('programs')}>Book program</button>
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
              <section className="card">
                <p className="eyebrow">Program Performance</p>
                <p><strong>Total bookings:</strong> {bookingPerformance.total}</p>
                <p><strong>Active bookings:</strong> {bookingPerformance.active}</p>
                <p><strong>Checked in:</strong> {bookingPerformance.checkedIn}</p>
                <p><strong>Completed:</strong> {bookingPerformance.completed}</p>
                <p><strong>Cancellation:</strong> {bookingPerformance.canceled}</p>
                <p><strong>Attendance rate:</strong> {bookingPerformance.attendanceRate}%</p>
              </section>
            </div>
            <section className="card">
              <p className="eyebrow">Pre-event info</p>
              {nextUpcomingEvent ? (() => {
                const memberInfo = resolveMemberInfo(nextUpcomingEvent.custom_fields);
                const registrationAnswers = formatRegistrationAnswers(nextUpcomingEvent.member_registration?.registration_answers);
                return (
                  <>
                    <h3>{nextUpcomingEvent.event_name || 'Upcoming event'}</h3>
                    <p>{formatAppDateTime(nextUpcomingEvent.start_at)} | {nextUpcomingEvent.location || '-'}</p>
                    {memberInfo.preText ? <p>{memberInfo.preText}</p> : <p className="sub">Belum ada briefing sebelum event.</p>}
                    {memberInfo.preAttachments.length > 0 ? (
                      <div className="entity-list">
                        {memberInfo.preAttachments.map((url) => (
                          <div className="entity-row" key={`overview-pre-${url}`}>
                            <div>
                              <strong>{attachmentNameFromUrl(url)}</strong>
                              <p>{isImageAttachment(url) ? 'Image attachment' : 'File attachment'}</p>
                            </div>
                            <a className="btn ghost small" href={url} target="_blank" rel="noreferrer">
                              Open
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {registrationAnswers.length > 0 ? (
                      <div className="entity-list" style={{ marginTop: '1rem' }}>
                        {registrationAnswers.map((item) => (
                          <div className="entity-row" key={`overview-answer-${item.label}`}>
                            <div>
                              <strong>{item.label}</strong>
                              <p>{item.answer}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                );
              })() : (
                <p className="sub">Belum ada event mendatang yang kamu join.</p>
              )}
            </section>
            <section className="card">
              <p className="eyebrow">Pre-program info</p>
              {nextUpcomingProgramBooking ? (() => {
                const programInfo = resolveProgramInfo(nextUpcomingProgramBooking.class_detail);
                return (
                  <>
                    <h3>{nextUpcomingProgramBooking.class_detail?.class_name || nextUpcomingProgramBooking.class_id || 'Upcoming program'}</h3>
                    <p>{getBookingScheduleLabel(nextUpcomingProgramBooking) || getProgramScheduleSummary(nextUpcomingProgramBooking.class_detail)}</p>
                    <p>Status: {getBookingAttendanceStatus(nextUpcomingProgramBooking)}</p>
                    {programInfo.preText ? <p>{programInfo.preText}</p> : <p className="sub">Belum ada briefing sebelum program.</p>}
                    {programInfo.preAttachments.length > 0 ? (
                      <div className="entity-list">
                        {programInfo.preAttachments.map((url) => (
                          <div className="entity-row" key={`overview-program-pre-${url}`}>
                            <div>
                              <strong>{attachmentNameFromUrl(url)}</strong>
                              <p>{isImageAttachment(url) ? 'Image attachment' : 'File attachment'}</p>
                            </div>
                            <a className="btn ghost small" href={url} target="_blank" rel="noreferrer">
                              Open
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                );
              })() : (
                <p className="sub">Belum ada booking program aktif.</p>
              )}
            </section>
            <section className="card">
              <p className="eyebrow">Recent Activity</p>
              <div className="entity-list">
                {orderedPayments.slice(0, 3).map((item) => (
                  <div className="entity-row" key={item.payment_id}>
                    <div>
                      <strong>{item.payment_id}</strong>
                      <p>{item.reference_type || '-'}:{item.reference_id || '-'}</p>
                      <p>{formatAppDateTime(item.recorded_at)}</p>
                    </div>
                    <span className={`status ${item.status}`}>{item.status || '-'}</span>
                  </div>
                ))}
                {orderedPayments.length === 0 ? <p className="sub">Belum ada aktivitas payment.</p> : null}
              </div>
            </section>
          </>
        ) : null}

        {tab === 'programs' ? (
          <>
            <p className="eyebrow">Programs</p>
            <h2>Book program, pilih jadwal, dan cek performa</h2>
            {portalLoading ? <p className="feedback">Loading program data...</p> : null}
            <div className="ops-grid">
              <section className="card">
                <p className="eyebrow">Book Program</p>
                <div className="form">
                  <label>
                    Program
                    <select
                      value={bookingForm.class_id}
                      onChange={(e) =>
                        setBookingForm((prev) => ({
                          ...prev,
                          class_id: e.target.value,
                          schedule_key: '',
                          amount: '0',
                          registration_answers: {}
                        }))
                      }
                    >
                      <option value="">Pilih program</option>
                      {availablePrograms.map((item) => (
                        <option key={item.class_id} value={item.class_id}>
                          {item.class_name || item.class_id}
                        </option>
                      ))}
                    </select>
                  </label>
                  {availablePrograms.length === 0 ? (
                    <p className="sub">
                      Belum ada program `scheduled` atau `session_pack` yang sudah dibeli (order `paid` / payment `confirmed`).
                    </p>
                  ) : null}
                  {selectedProgram ? (
                    <div className="card" style={{ borderStyle: 'dashed' }}>
                      <p className="eyebrow">Program summary</p>
                      <p><strong>{selectedProgram.class_name || selectedProgram.class_id}</strong></p>
                      <p>{selectedProgram.description || 'Belum ada deskripsi program.'}</p>
                      <p>Coach: {selectedProgram.has_coach ? (selectedProgram.trainer_name || selectedProgram.coach_id || 'assigned') : 'No coach required'}</p>
                      <p>Schedule: {getProgramScheduleSummary(selectedProgram)}</p>
                      <p>Price: {formatIdr(selectedProgram.price || 0)}</p>
                    </div>
                  ) : null}
                  {selectedProgramScheduleOptions.length > 0 ? (
                    <label>
                      {MEMBER_PROGRAM_SCHEDULE_FIELD_CONFIG.label}
                      <select
                        value={bookingForm.schedule_key}
                        onChange={(e) => setBookingForm((prev) => ({ ...prev, schedule_key: e.target.value }))}
                      >
                        <option value="">{MEMBER_PROGRAM_SCHEDULE_FIELD_CONFIG.placeholder}</option>
                        {selectedProgramScheduleOptions.map((item) => (
                          <option key={item.key} value={item.key}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label>
                    Amount
                    <input
                      type="number"
                      min="0"
                      value={bookingForm.amount}
                      onChange={(e) => setBookingForm((prev) => ({ ...prev, amount: e.target.value }))}
                    />
                  </label>
                  <label>
                    Payment method
                    <select
                      value={bookingForm.method}
                      onChange={(e) => setBookingForm((prev) => ({ ...prev, method: e.target.value }))}
                    >
                      <option value="virtual_account">virtual_account</option>
                      <option value="bank_transfer">bank_transfer</option>
                      <option value="qris">qris</option>
                      <option value="ewallet">ewallet</option>
                      <option value="cash">cash</option>
                    </select>
                  </label>
                  {selectedProgramInfo.preText || selectedProgramInfo.postText || selectedProgramInfo.preAttachments.length > 0 || selectedProgramInfo.postAttachments.length > 0 ? (
                    <div className="card" style={{ borderStyle: 'dashed' }}>
                      <p className="eyebrow">Program info</p>
                      {selectedProgramInfo.preText ? <p><strong>Before program:</strong> {selectedProgramInfo.preText}</p> : null}
                      {selectedProgramInfo.preAttachments.length > 0 ? (
                        <div className="entity-list">
                          {selectedProgramInfo.preAttachments.map((url) => (
                            <div className="entity-row" key={`program-pre-${url}`}>
                              <div>
                                <strong>{attachmentNameFromUrl(url)}</strong>
                                <p>{isImageAttachment(url) ? 'Image attachment' : 'File attachment'}</p>
                              </div>
                              <a className="btn ghost small" href={url} target="_blank" rel="noreferrer">
                                Open
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {selectedProgramInfo.postText ? <p><strong>After program:</strong> {selectedProgramInfo.postText}</p> : null}
                      {selectedProgramInfo.postAttachments.length > 0 ? (
                        <div className="entity-list">
                          {selectedProgramInfo.postAttachments.map((url) => (
                            <div className="entity-row" key={`program-post-${url}`}>
                              <div>
                                <strong>{attachmentNameFromUrl(url)}</strong>
                                <p>{isImageAttachment(url) ? 'Image attachment' : 'File attachment'}</p>
                              </div>
                              <a className="btn ghost small" href={url} target="_blank" rel="noreferrer">
                                Open
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {selectedProgramRegistrationFields.length > 0 ? (
                    <div className="card" style={{ borderStyle: 'dashed' }}>
                      <p className="eyebrow">Custom fields</p>
                      <p className="feedback">Isi data yang diminta program sebelum booking dibuat.</p>
                      {selectedProgramRegistrationFields.map((field, index) => {
                        const fieldId = String(field?.field_id || `field_${index}`);
                        const type = String(field?.type || 'free_type');
                        const label = String(field?.label || `Field ${index + 1}`);
                        const isRequired = field?.required !== false;
                        const value = String(bookingForm.registration_answers[fieldId] || '');
                        if (type === 'date') {
                          return (
                            <label key={fieldId}>
                              {label}{isRequired ? ' *' : ''}
                              <input
                                type="date"
                                value={value}
                                onChange={(e) =>
                                  setBookingForm((prev) => ({
                                    ...prev,
                                    registration_answers: { ...prev.registration_answers, [fieldId]: e.target.value }
                                  }))
                                }
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
                                onChange={(e) =>
                                  setBookingForm((prev) => ({
                                    ...prev,
                                    registration_answers: { ...prev.registration_answers, [fieldId]: e.target.value }
                                  }))
                                }
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
                              onChange={(e) =>
                                setBookingForm((prev) => ({
                                  ...prev,
                                  registration_answers: { ...prev.registration_answers, [fieldId]: e.target.value }
                                }))
                              }
                            />
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                  <button className="btn" type="button" disabled={bookingSaving} onClick={submitProgramBooking}>
                    {bookingSaving ? 'Booking...' : 'Book program'}
                  </button>
                </div>
              </section>

              <section className="card">
                <p className="eyebrow">Performance</p>
                <p><strong>Total bookings:</strong> {bookingPerformance.total}</p>
                <p><strong>Active:</strong> {bookingPerformance.active}</p>
                <p><strong>Checked in:</strong> {bookingPerformance.checkedIn}</p>
                <p><strong>Completed:</strong> {bookingPerformance.completed}</p>
                <p><strong>Canceled:</strong> {bookingPerformance.canceled}</p>
                <p><strong>Attendance rate:</strong> {bookingPerformance.attendanceRate}%</p>
              </section>

              <section className="card">
                <p className="eyebrow">Next booked schedule</p>
                {nextUpcomingProgramBooking ? (
                  <>
                    <p><strong>{nextUpcomingProgramBooking.class_detail?.class_name || nextUpcomingProgramBooking.class_id}</strong></p>
                    <p>{getBookingScheduleLabel(nextUpcomingProgramBooking) || getProgramScheduleSummary(nextUpcomingProgramBooking.class_detail)}</p>
                    <p>Status: {getBookingAttendanceStatus(nextUpcomingProgramBooking)}</p>
                  </>
                ) : (
                  <p className="sub">Belum ada booking aktif.</p>
                )}
              </section>
            </div>

            <section className="card" style={{ marginTop: '1rem' }}>
              <p className="eyebrow">My Program Bookings</p>
              <div className="entity-list">
                {orderedBookings.map((item) => {
                  const attendanceStatus = getBookingAttendanceStatus(item);
                  const canCancel = String(item?.status || '').toLowerCase() === 'booked'
                    && !item?.attendance_checked_in_at
                    && !item?.attendance_confirmed_at
                    && !item?.attendance_checked_out_at;
                  return (
                    <div className="entity-row" key={item.booking_id}>
                      <div>
                        <strong>{item.class_detail?.class_name || item.class_id || item.booking_id}</strong>
                        <p>{item.booking_id}</p>
                        <p>Schedule: {getBookingScheduleLabel(item) || getProgramScheduleSummary(item.class_detail)}</p>
                        <p>Status: {item.status || '-'} | Attendance: {attendanceStatus}</p>
                        <p>Booked at: {formatAppDateTime(item.booked_at)}</p>
                        {formatRegistrationAnswers(item.registration_answers).length > 0 ? (
                          <p>
                            Answers: {formatRegistrationAnswers(item.registration_answers).map((entry) => `${entry.label}: ${entry.answer}`).join(' | ')}
                          </p>
                        ) : null}
                        {item.class_detail?.custom_fields ? (
                          <>
                            {resolveProgramInfo(item.class_detail).preText ? <p><strong>Before:</strong> {resolveProgramInfo(item.class_detail).preText}</p> : null}
                            {resolveProgramInfo(item.class_detail).postText ? <p><strong>After:</strong> {resolveProgramInfo(item.class_detail).postText}</p> : null}
                          </>
                        ) : null}
                      </div>
                      <div className="payment-meta">
                        <span className={`status ${item.status}`}>{item.status || '-'}</span>
                        <span className="passport-chip">{item.payment_id || 'no payment link'}</span>
                        <button
                          className="btn ghost small"
                          type="button"
                          disabled={bookingSaving || !canCancel}
                          onClick={() => cancelProgramBooking(item)}
                        >
                          {String(item?.status || '').toLowerCase() === 'canceled' ? 'Canceled' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {orderedBookings.length === 0 ? <p className="sub">Belum ada booking program.</p> : null}
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
              {orderedMyEvents.map((event) => {
                const memberInfo = resolveMemberInfo(event.custom_fields);
                const registrationAnswers = formatRegistrationAnswers(event.member_registration?.registration_answers);
                return (
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
                      Mulai {formatAppDateTime(event.start_at)}
                    </p>
                    <p className="passport-live-host">{event.location || '-'}</p>
                    {registrationAnswers.length > 0 ? (
                      <div className="entity-list" style={{ marginTop: '1rem' }}>
                        {registrationAnswers.map((item) => (
                          <div className="entity-row" key={`${event.event_id}-answer-${item.label}`}>
                            <div>
                              <strong>{item.label}</strong>
                              <p>{item.answer}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {memberInfo.preText ? (
                      <div className="card" style={{ marginTop: '1rem', borderStyle: 'dashed' }}>
                        <p className="eyebrow">Before event</p>
                        <p>{memberInfo.preText}</p>
                      </div>
                    ) : null}
                    {memberInfo.preAttachments.length > 0 ? (
                      <div className="entity-list" style={{ marginTop: '0.75rem' }}>
                        {memberInfo.preAttachments.map((url) => (
                          <div className="entity-row" key={`${event.event_id}-pre-${url}`}>
                            <div>
                              <strong>{attachmentNameFromUrl(url)}</strong>
                              <p>{isImageAttachment(url) ? 'Image attachment' : 'File attachment'}</p>
                            </div>
                            <a className="btn ghost small" href={url} target="_blank" rel="noreferrer">
                              Open
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {memberInfo.postText ? (
                      <div className="card" style={{ marginTop: '1rem', borderStyle: 'dashed' }}>
                        <p className="eyebrow">After event</p>
                        <p>{memberInfo.postText}</p>
                      </div>
                    ) : null}
                    {memberInfo.postAttachments.length > 0 ? (
                      <div className="entity-list" style={{ marginTop: '0.75rem' }}>
                        {memberInfo.postAttachments.map((url) => (
                          <div className="entity-row" key={`${event.event_id}-post-${url}`}>
                            <div>
                              <strong>{attachmentNameFromUrl(url)}</strong>
                              <p>{isImageAttachment(url) ? 'Image attachment' : 'File attachment'}</p>
                            </div>
                            <a className="btn ghost small" href={url} target="_blank" rel="noreferrer">
                              Open
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div style={{ marginTop: '1rem' }}>
                      <Link
                        className="btn ghost small"
                        to={event.account_slug
                          ? `/a/${encodeURIComponent(event.account_slug)}/e/${encodeURIComponent(event.event_id)}`
                          : `/e/${encodeURIComponent(event.event_id)}`}
                      >
                        Open event
                      </Link>
                    </div>
                  </article>
                );
              })}
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
                      <p>{item.class_detail?.class_name || item.class_id || '-'} | {item.status || '-'}</p>
                      <p>{formatAppDateTime(item.booked_at)}</p>
                      {resolveProgramInfo(item.class_detail).preText ? (
                        <p><strong>Before:</strong> {resolveProgramInfo(item.class_detail).preText}</p>
                      ) : null}
                      {resolveProgramInfo(item.class_detail).postText ? (
                        <p><strong>After:</strong> {resolveProgramInfo(item.class_detail).postText}</p>
                      ) : null}
                      {formatRegistrationAnswers(item.registration_answers).length > 0 ? (
                        <p>
                          Answers: {formatRegistrationAnswers(item.registration_answers).map((entry) => `${entry.label}: ${entry.answer}`).join(' | ')}
                        </p>
                      ) : null}
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
