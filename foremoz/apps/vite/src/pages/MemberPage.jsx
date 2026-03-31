import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { accountPath, apiJson, getSession } from '../lib.js';

function formatMemberPaymentReference(item, lookups = {}) {
  const referenceType = String(item?.reference_type || '').trim().toLowerCase();
  const referenceId = String(item?.reference_id || '').trim();
  const classesById = lookups.classesById || new Map();
  const packagesById = lookups.packagesById || new Map();
  const eventsById = lookups.eventsById || new Map();

  if (referenceType === 'membership_purchase') {
    return `Membership - ${packagesById.get(referenceId) || referenceId || '-'}`;
  }
  if (referenceType === 'pt_package' || referenceType === 'pt_package_purchase') {
    return `PT Package - ${packagesById.get(referenceId) || referenceId || '-'}`;
  }
  if (referenceType === 'class_booking') {
    return `Program Booking - ${classesById.get(referenceId) || referenceId || '-'}`;
  }
  if (referenceType === 'event_registration') {
    return `Event Registration - ${eventsById.get(referenceId) || referenceId || '-'}`;
  }
  if (referenceType === 'manual') {
    return `Manual - ${referenceId || '-'}`;
  }
  return referenceType || referenceId ? `${referenceType || 'payment'}:${referenceId || '-'}` : '-';
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

export default function MemberPage() {
  const navigate = useNavigate();
  const session = getSession();
  const { memberId } = useParams();
  const tenantId = session?.tenant?.id || 'tn_001';
  const branchId = session?.branch?.id || 'core';
  const [memberRow, setMemberRow] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [classes, setClasses] = useState([]);
  const [memberBookings, setMemberBookings] = useState([]);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [ptPackages, setPtPackages] = useState([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [ptBalanceRows, setPtBalanceRows] = useState([]);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState('-');
  const [remainingPtSessions, setRemainingPtSessions] = useState('-');
  const [memberEvents, setMemberEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEventParticipant, setSelectedEventParticipant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [membershipSaving, setMembershipSaving] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [ptSaving, setPtSaving] = useState(false);
  const [eventActionSaving, setEventActionSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [activeMenu, setActiveMenu] = useState('checkin');
  const [feedback, setFeedback] = useState('');
  const [bookingForm, setBookingForm] = useState({
    class_id: '',
    amount: '0',
    method: 'virtual_account',
    registration_answers: {}
  });
  const [membershipForm, setMembershipForm] = useState({
    plan_id: 'membership_monthly',
    months: '1',
    amount: '350000',
    method: 'virtual_account'
  });
  const [ptForm, setPtForm] = useState({
    package_id: '',
    total_sessions: '1',
    amount: '0',
    method: 'virtual_account'
  });

  useEffect(() => {
    let cancelled = false;
    async function loadMemberData() {
      try {
        setLoading(true);
        setLoadError('');
        await apiJson('/v1/projections/run', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: tenantId,
            branch_id: branchId
          })
        }).catch(() => {});
        const [membersRes, paymentsRes, classesRes, bookingsRes, packagesRes, subscriptionsRes, ptBalanceRes] = await Promise.all([
          apiJson(`/v1/read/members?tenant_id=${encodeURIComponent(tenantId)}&limit=1000`),
          apiJson(`/v1/read/payments/history?tenant_id=${encodeURIComponent(tenantId)}&member_id=${encodeURIComponent(memberId || '')}`),
          apiJson(`/v1/read/class-availability?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`).catch(() => ({ rows: [] })),
          apiJson(`/v1/read/bookings?tenant_id=${encodeURIComponent(tenantId)}`).catch(() => ({ rows: [] })),
          apiJson(`/v1/admin/packages?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`).catch(() => ({ rows: [] })),
          apiJson(`/v1/read/subscriptions/active?tenant_id=${encodeURIComponent(tenantId)}&member_id=${encodeURIComponent(memberId || '')}`).catch(() => ({ rows: [] })),
          apiJson(`/v1/read/pt-balance?tenant_id=${encodeURIComponent(tenantId)}&member_id=${encodeURIComponent(memberId || '')}`).catch(() => ({ rows: [] }))
        ]);
        if (cancelled) return;
        const memberFound = (membersRes.rows || []).find((row) => String(row.member_id || '') === String(memberId || '')) || null;
        setMemberRow(memberFound);
        setPaymentHistory(paymentsRes.rows || []);
        setClasses(classesRes.rows || []);
        const allBookings = Array.isArray(bookingsRes.rows) ? bookingsRes.rows : [];
        setMemberBookings(
          allBookings.filter((row) => String(row.member_id || '') === String(memberId || ''))
        );
        const packageRows = Array.isArray(packagesRes.rows) ? packagesRes.rows : [];
        setAvailablePackages(packageRows);
        const activePtPackages = packageRows.filter((row) => String(row.package_type || '').toLowerCase() === 'pt');
        setPtPackages(activePtPackages);
        if (activePtPackages.length > 0) {
          setPtForm((prev) => ({
            ...prev,
            package_id: prev.package_id || String(activePtPackages[0].package_id || ''),
            total_sessions:
              prev.total_sessions && Number(prev.total_sessions) > 0
                ? prev.total_sessions
                : String(activePtPackages[0].session_count || 1),
            amount:
              Number(prev.amount || 0) > 0
                ? prev.amount
                : String(activePtPackages[0].price || 0)
          }));
        }
        const activeSubscriptions = Array.isArray(subscriptionsRes.rows) ? subscriptionsRes.rows : [];
        setActiveSubscriptions(activeSubscriptions);
        const latestSubscriptionEnd = activeSubscriptions
          .map((row) => String(row?.end_date || '').trim())
          .filter(Boolean)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || '-';
        setSubscriptionEndDate(latestSubscriptionEnd);

        const ptBalances = Array.isArray(ptBalanceRes.rows) ? ptBalanceRes.rows : [];
        setPtBalanceRows(ptBalances);
        if (ptBalances.length > 0) {
          const totalRemaining = ptBalances.reduce((sum, row) => sum + Number(row?.remaining_sessions || 0), 0);
          setRemainingPtSessions(String(totalRemaining));
        } else {
          setRemainingPtSessions('-');
        }
        if (memberFound?.email || memberFound?.member_id) {
          const registrationRes = await apiJson(
            `/v1/read/event-registrations?passport_id=${encodeURIComponent(memberFound.member_id || '')}&email=${encodeURIComponent(memberFound.email || '')}&limit=300`
          ).catch(() => ({ event_ids: [] }));
          const eventIds = Array.isArray(registrationRes.event_ids) ? registrationRes.event_ids.map((v) => String(v)) : [];
          if (eventIds.length > 0) {
            const eventsRes = await apiJson('/v1/read/events?status=all&limit=400').catch(() => ({ rows: [] }));
            const rows = Array.isArray(eventsRes.rows) ? eventsRes.rows : [];
            setMemberEvents(rows.filter((item) => eventIds.includes(String(item.event_id || ''))));
          } else {
            setMemberEvents([]);
          }
        } else {
          setMemberEvents([]);
        }
      } catch (err) {
        if (cancelled) return;
        setLoadError(err.message || 'failed to load member');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadMemberData();
    return () => {
      cancelled = true;
    };
  }, [tenantId, branchId, memberId]);

  if (!memberRow && !loading && !loadError) {
    return <Navigate to={accountPath(session, '/cs/dashboard')} replace />;
  }
  const memberData = memberRow;

  async function refreshMemberOperationalData() {
    await apiJson('/v1/projections/run', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: tenantId,
        branch_id: branchId
      })
    }).catch(() => {});

    const [paymentsRes, bookingsRes, subscriptionsRes, ptBalanceRes] = await Promise.all([
      apiJson(`/v1/read/payments/history?tenant_id=${encodeURIComponent(tenantId)}&member_id=${encodeURIComponent(memberId || '')}`).catch(() => ({ rows: [] })),
      apiJson(`/v1/read/bookings?tenant_id=${encodeURIComponent(tenantId)}`).catch(() => ({ rows: [] })),
      apiJson(`/v1/read/subscriptions/active?tenant_id=${encodeURIComponent(tenantId)}&member_id=${encodeURIComponent(memberId || '')}`).catch(() => ({ rows: [] })),
      apiJson(`/v1/read/pt-balance?tenant_id=${encodeURIComponent(tenantId)}&member_id=${encodeURIComponent(memberId || '')}`).catch(() => ({ rows: [] }))
    ]);

    setPaymentHistory(Array.isArray(paymentsRes.rows) ? paymentsRes.rows : []);
    const allBookings = Array.isArray(bookingsRes.rows) ? bookingsRes.rows : [];
    setMemberBookings(allBookings.filter((row) => String(row.member_id || '') === String(memberId || '')));

    const activeSubscriptions = Array.isArray(subscriptionsRes.rows) ? subscriptionsRes.rows : [];
    setActiveSubscriptions(activeSubscriptions);
    const latestSubscriptionEnd = activeSubscriptions
      .map((row) => String(row?.end_date || '').trim())
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || '-';
    setSubscriptionEndDate(latestSubscriptionEnd);

    const ptBalances = Array.isArray(ptBalanceRes.rows) ? ptBalanceRes.rows : [];
    setPtBalanceRows(ptBalances);
    if (ptBalances.length > 0) {
      const totalRemaining = ptBalances.reduce((sum, row) => sum + Number(row?.remaining_sessions || 0), 0);
      setRemainingPtSessions(String(totalRemaining));
    } else {
      setRemainingPtSessions('-');
    }
  }

  async function submitPtPurchase() {
    if (!memberData?.member_id) return;
    if (!ptForm.package_id) {
      setFeedback('Pilih PT package terlebih dulu.');
      return;
    }
    const totalSessions = Math.max(1, Number(ptForm.total_sessions || 1));
    const amount = Math.max(0, Number(ptForm.amount || 0));
    if (!Number.isFinite(totalSessions) || totalSessions <= 0) {
      setFeedback('Total sesi PT tidak valid.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedback('Nominal PT package harus lebih dari 0.');
      return;
    }
    try {
      setPtSaving(true);
      const paymentId = `pay_pt_${Date.now()}`;
      const assignedId = `ptpkg_${Date.now()}`;
      await apiJson('/v1/payments/record', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          payment_id: paymentId,
          member_id: memberData.member_id,
          amount,
          currency: 'IDR',
          method: ptForm.method || 'virtual_account',
          reference_type: 'pt_package',
          reference_id: ptForm.package_id
        })
      });
      await apiJson(`/v1/payments/${encodeURIComponent(paymentId)}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId
        })
      });
      await apiJson('/v1/pt/packages/assign', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          pt_package_id: assignedId,
          package_id: ptForm.package_id,
          member_id: memberData.member_id,
          total_sessions: totalSessions,
          payment_id: paymentId
        })
      });
      await refreshMemberOperationalData();
      setFeedback(`pt.package.assigned: ${assignedId} (${totalSessions} sesi)`);
    } catch (error) {
      setFeedback(error.message || 'Gagal proses PT package.');
    } finally {
      setPtSaving(false);
    }
  }

  async function loadParticipantForSelectedEvent(eventId) {
    if (!eventId || (!memberData?.email && !memberData?.member_id)) {
      setSelectedEventParticipant(null);
      return;
    }
    try {
      const participantRes = await apiJson(
        `/v1/admin/events/${encodeURIComponent(eventId)}/participants?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}&limit=500`
      );
      const rows = Array.isArray(participantRes.rows) ? participantRes.rows : [];
      const emailCandidate = String(memberData.email || '').toLowerCase();
      const memberIdCandidate = String(memberData.member_id || '').toLowerCase();
      const row = rows.find((item) => {
        const emailMatch = emailCandidate && String(item?.email || '').toLowerCase() === emailCandidate;
        const passportMatch = memberIdCandidate && String(item?.passport_id || '').toLowerCase() === memberIdCandidate;
        const memberMatch = memberIdCandidate && String(item?.member_id || '').toLowerCase() === memberIdCandidate;
        return Boolean(emailMatch || passportMatch || memberMatch);
      }) || null;
      setSelectedEventParticipant(row);
    } catch {
      setSelectedEventParticipant(null);
    }
  }

  useEffect(() => {
    loadParticipantForSelectedEvent(selectedEventId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId, memberData?.email, tenantId, branchId]);

  async function checkinToSelectedEvent() {
    if (!selectedEventId || (!memberData?.email && !memberData?.member_id)) {
      setFeedback('Pilih event dulu sebelum check-in.');
      return;
    }
    try {
      setEventActionSaving(true);
      const result = await apiJson(`/v1/admin/events/${encodeURIComponent(selectedEventId)}/participants/checkin`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          registration_id: selectedEventParticipant?.registration_id || null,
          passport_id: selectedEventParticipant?.passport_id || memberData.member_id || null,
          email: memberData.email,
          full_name: memberData.full_name || memberData.member_name || memberData.member_id || memberId
        })
      });
      await loadParticipantForSelectedEvent(selectedEventId);
      if (result?.duplicate) {
        setFeedback(`checkin.skip: ${memberData.member_id} sudah check-in di event ini.`);
      } else {
        setFeedback(`checkin.success: ${memberData.member_id} -> ${selectedEventId}`);
      }
    } catch (error) {
      setFeedback(error.message || 'Gagal check-in event.');
    } finally {
      setEventActionSaving(false);
    }
  }

  async function checkoutFromSelectedEvent() {
    if (!selectedEventId || (!memberData?.email && !memberData?.member_id)) {
      setFeedback('Pilih event dulu sebelum check-out.');
      return;
    }
    try {
      setEventActionSaving(true);
      const result = await apiJson(`/v1/admin/events/${encodeURIComponent(selectedEventId)}/participants/checkout`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          registration_id: selectedEventParticipant?.registration_id || null,
          passport_id: selectedEventParticipant?.passport_id || memberData.member_id || null,
          email: memberData.email,
          full_name: memberData.full_name || memberData.member_name || memberData.member_id || memberId
        })
      });
      await loadParticipantForSelectedEvent(selectedEventId);
      if (result?.duplicate) {
        setFeedback(`checkout.skip: ${memberData.member_id} sudah checkout di event ini.`);
      } else {
        setFeedback(`checkout.success: ${memberData.member_id} -> ${selectedEventId}`);
      }
    } catch (error) {
      setFeedback(error.message || 'Gagal check-out event.');
    } finally {
      setEventActionSaving(false);
    }
  }

  const canCheckinSelectedEvent = Boolean(selectedEventId) && !eventActionSaving;
  const canCheckoutSelectedEvent = Boolean(selectedEventId) && !eventActionSaving && Boolean(selectedEventParticipant?.checked_in_at);
  const classNameById = new Map(
    classes
      .map((item) => [String(item?.class_id || ''), String(item?.class_name || '').trim()])
      .filter(([id]) => Boolean(id))
  );
  const selectedBookingClass = classes.find((item) => String(item?.class_id || '') === String(bookingForm.class_id || '')) || null;
  const selectedBookingRegistrationFields = getClassRegistrationFields(selectedBookingClass);
  const selectedBookingProgramInfo = resolveProgramInfo(selectedBookingClass);
  const packageNameById = new Map(
    availablePackages
      .map((item) => [String(item?.package_id || ''), String(item?.package_name || '').trim()])
      .filter(([id]) => Boolean(id))
  );
  const eventNameById = new Map(
    memberEvents
      .map((item) => [String(item?.event_id || ''), String(item?.event_name || '').trim()])
      .filter(([id]) => Boolean(id))
  );
  const currentSubscription = activeSubscriptions
    .slice()
    .sort((a, b) => new Date(b?.end_date || 0).getTime() - new Date(a?.end_date || 0).getTime())[0] || null;
  const latestPtBalance = ptBalanceRows
    .slice()
    .sort((a, b) => new Date(b?.updated_at || 0).getTime() - new Date(a?.updated_at || 0).getTime())[0] || null;

  function addMonths(date, months) {
    const next = new Date(date.getTime());
    next.setMonth(next.getMonth() + months);
    return next;
  }

  async function submitMembershipPurchase() {
    if (!memberData?.member_id) return;
    const months = Math.max(1, Number(membershipForm.months || 1));
    const amount = Math.max(0, Number(membershipForm.amount || 0));
    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedback('Nominal membership harus lebih dari 0.');
      return;
    }
    try {
      setMembershipSaving(true);
      const paymentId = `pay_sub_${Date.now()}`;
      const subscriptionId = `sub_${Date.now()}`;
      const start = new Date();
      const end = addMonths(start, months);
      await apiJson('/v1/payments/record', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          payment_id: paymentId,
          member_id: memberData.member_id,
          amount,
          currency: 'IDR',
          method: membershipForm.method || 'virtual_account',
          reference_type: 'membership_purchase',
          reference_id: membershipForm.plan_id || 'membership'
        })
      });
      await apiJson(`/v1/payments/${encodeURIComponent(paymentId)}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId
        })
      });
      await apiJson('/v1/subscriptions/activate', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          subscription_id: subscriptionId,
          member_id: memberData.member_id,
          plan_id: membershipForm.plan_id || 'membership',
          start_date: start.toISOString().slice(0, 10),
          end_date: end.toISOString().slice(0, 10),
          status: 'active',
          payment_id: paymentId
        })
      });
      await refreshMemberOperationalData();
      setFeedback(`membership.activated: ${subscriptionId} (${months} bulan)`);
    } catch (error) {
      setFeedback(error.message || 'Gagal proses membership.');
    } finally {
      setMembershipSaving(false);
    }
  }

  async function submitClassBooking() {
    if (!memberData?.member_id) return;
    if (!bookingForm.class_id) {
      setFeedback('Pilih program terlebih dulu.');
      return;
    }
    for (let index = 0; index < selectedBookingRegistrationFields.length; index += 1) {
      const field = selectedBookingRegistrationFields[index] || {};
      const fieldId = String(field.field_id || '');
      const label = String(field.label || `Field ${index + 1}`);
      const value = String(bookingForm.registration_answers[fieldId] || '').trim();
      if (field.required !== false && !value) {
        setFeedback(`${label} wajib diisi.`);
        return;
      }
    }
    const amount = Math.max(0, Number(bookingForm.amount || 0));
    if (!Number.isFinite(amount) || amount < 0) {
      setFeedback('Nominal payment program tidak valid.');
      return;
    }
    try {
      setBookingSaving(true);
      const bookingId = `book_${Date.now()}`;
      let paymentId = null;
      if (amount > 0) {
        paymentId = `pay_class_${Date.now()}`;
        await apiJson('/v1/payments/record', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: tenantId,
            branch_id: branchId,
            payment_id: paymentId,
            member_id: memberData.member_id,
            amount,
            currency: 'IDR',
            method: bookingForm.method || 'virtual_account',
            reference_type: 'class_booking',
            reference_id: bookingForm.class_id
          })
        });
        await apiJson(`/v1/payments/${encodeURIComponent(paymentId)}/confirm`, {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: tenantId,
            branch_id: branchId
          })
        });
      }
      await apiJson('/v1/bookings/classes/create', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          booking_id: bookingId,
          class_id: bookingForm.class_id,
          booking_kind: 'member',
          member_id: memberData.member_id,
          guest_name: memberData.full_name || null,
          registration_answers: bookingForm.registration_answers,
          status: 'booked',
          payment_id: paymentId
        })
      });
      await apiJson('/v1/projections/run', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId
        })
      }).catch(() => {});
      await refreshMemberOperationalData();
      setFeedback(`program.booking.created: ${memberData.member_id} -> ${bookingForm.class_id}${paymentId ? ` (payment ${paymentId})` : ''}`);
      setBookingForm({
        class_id: '',
        amount: '0',
        method: 'virtual_account',
        registration_answers: {}
      });
    } catch (error) {
      setFeedback(error.message || 'Gagal booking program.');
    } finally {
      setBookingSaving(false);
    }
  }

  return (
    <main className="dashboard">
      <header className="dash-head card">
        <div>
          <p className="eyebrow">Member</p>
          <h1>{memberData?.full_name || memberId}</h1>
          <p>{memberData?.member_id || memberId}</p>
        </div>
        <div className="meta">
          <button className="btn ghost" onClick={() => navigate(accountPath(session, '/cs/dashboard'))}>
            Back to dashboard
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar card">
          <p className="eyebrow">Member Actions</p>
          <button
            className={`side-item ${activeMenu === 'checkin' ? 'active' : ''}`}
            onClick={() => setActiveMenu('checkin')}
          >
            Checkin / Checkout
          </button>
          <button
            className={`side-item ${activeMenu === 'membership' ? 'active' : ''}`}
            onClick={() => setActiveMenu('membership')}
          >
            Buy membership
          </button>
          <button className={`side-item ${activeMenu === 'pt' ? 'active' : ''}`} onClick={() => setActiveMenu('pt')}>
            PT
          </button>
          <button
            className={`side-item ${activeMenu === 'booking' ? 'active' : ''}`}
            onClick={() => setActiveMenu('booking')}
          >
            Booking schedule
          </button>
          <button
            className={`side-item ${activeMenu === 'payment_history' ? 'active' : ''}`}
            onClick={() => setActiveMenu('payment_history')}
          >
            History payment
          </button>
        </aside>

        <article className="card membership-panel">
          <p className="eyebrow">Status</p>
          <h2>Member operational status</h2>

          {loading ? <p className="feedback">Loading member...</p> : null}
          {loadError ? <p className="error">{loadError}</p> : null}
          <div className="member-detail">
            <p>
              <strong>{memberData?.full_name || '-'}</strong>
            </p>
            <p>member_id: {memberData?.member_id || '-'}</p>
            <p>phone: {memberData?.phone || '-'}</p>
            <p>email: {memberData?.email || '-'}</p>
            <p>id_card: {memberData?.id_card || memberData?.ktp_number || '-'}</p>
            <p>
              status: <span className={`status ${memberData?.status}`}>{memberData?.status || '-'}</span>
            </p>
            <p>subscription_end: {subscriptionEndDate}</p>
            <p>subscription_plan: {currentSubscription?.plan_id || '-'}</p>
            <p>subscription_payment: {currentSubscription?.payment_id || '-'}</p>
            <p>remaining PT session: {remainingPtSessions}</p>
            <p>pt_package_id: {latestPtBalance?.pt_package_id || '-'}</p>
            <p>pt_payment: {latestPtBalance?.payment_id || '-'}</p>
          </div>

          <div className="member-actions">
            {activeMenu === 'checkin' ? (
              <div className="form" style={{ width: '100%' }}>
                <label>
                  event
                  <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
                    <option value="">Pilih event</option>
                    {memberEvents.map((event) => (
                      <option key={event.event_id} value={event.event_id}>
                        {event.event_name || event.event_id}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="sub">
                  status: checkin {selectedEventParticipant?.checked_in_at ? 'yes' : 'no'} | checkout {selectedEventParticipant?.checked_out_at ? 'yes' : 'no'}
                </p>
                <button className="btn" type="button" disabled={!canCheckinSelectedEvent} onClick={checkinToSelectedEvent}>
                  {eventActionSaving ? 'Processing...' : 'Checkin'}
                </button>
                <button className="btn ghost" type="button" disabled={!canCheckoutSelectedEvent} onClick={checkoutFromSelectedEvent}>
                  {eventActionSaving ? 'Processing...' : 'Checkout'}
                </button>
                {!selectedEventId ? <p className="sub">Pilih event terlebih dulu.</p> : null}
                {selectedEventId && !selectedEventParticipant?.checked_in_at ? (
                  <p className="sub">Checkout aktif setelah participant check-in.</p>
                ) : null}
              </div>
            ) : null}

            {activeMenu === 'membership' ? (
              <div className="form" style={{ width: '100%' }}>
                <label>
                  plan_id
                  <input
                    value={membershipForm.plan_id}
                    onChange={(e) => setMembershipForm((prev) => ({ ...prev, plan_id: e.target.value }))}
                  />
                </label>
                <label>
                  months
                  <input
                    type="number"
                    min="1"
                    value={membershipForm.months}
                    onChange={(e) => setMembershipForm((prev) => ({ ...prev, months: e.target.value }))}
                  />
                </label>
                <label>
                  amount
                  <input
                    type="number"
                    min="0"
                    value={membershipForm.amount}
                    onChange={(e) => setMembershipForm((prev) => ({ ...prev, amount: e.target.value }))}
                  />
                </label>
                <label>
                  method
                  <select
                    value={membershipForm.method}
                    onChange={(e) => setMembershipForm((prev) => ({ ...prev, method: e.target.value }))}
                  >
                    <option value="virtual_account">virtual_account</option>
                    <option value="bank_transfer">bank_transfer</option>
                    <option value="qris">qris</option>
                    <option value="ewallet">ewallet</option>
                    <option value="cash">cash</option>
                  </select>
                </label>
                <button className="btn" type="button" disabled={membershipSaving} onClick={submitMembershipPurchase}>
                  {membershipSaving ? 'Processing...' : 'Buy membership package'}
                </button>
              </div>
            ) : null}

            {activeMenu === 'pt' ? (
              <div className="form" style={{ width: '100%' }}>
                <label>
                  pt_package
                  <select
                    value={ptForm.package_id}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedPackage = ptPackages.find((item) => String(item.package_id || '') === String(selectedId));
                      setPtForm((prev) => ({
                        ...prev,
                        package_id: selectedId,
                        total_sessions: String(selectedPackage?.session_count || prev.total_sessions || 1),
                        amount: String(selectedPackage?.price || prev.amount || 0)
                      }));
                    }}
                  >
                    <option value="">Pilih PT package</option>
                    {ptPackages.map((item) => (
                      <option key={item.package_id} value={item.package_id}>
                        {item.package_name || item.package_id}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  total_sessions
                  <input
                    type="number"
                    min="1"
                    value={ptForm.total_sessions}
                    onChange={(e) => setPtForm((prev) => ({ ...prev, total_sessions: e.target.value }))}
                  />
                </label>
                <label>
                  amount
                  <input
                    type="number"
                    min="0"
                    value={ptForm.amount}
                    onChange={(e) => setPtForm((prev) => ({ ...prev, amount: e.target.value }))}
                  />
                </label>
                <label>
                  method
                  <select
                    value={ptForm.method}
                    onChange={(e) => setPtForm((prev) => ({ ...prev, method: e.target.value }))}
                  >
                    <option value="virtual_account">virtual_account</option>
                    <option value="bank_transfer">bank_transfer</option>
                    <option value="qris">qris</option>
                    <option value="ewallet">ewallet</option>
                    <option value="cash">cash</option>
                  </select>
                </label>
                <button className="btn" type="button" disabled={ptSaving} onClick={submitPtPurchase}>
                  {ptSaving ? 'Processing...' : 'Buy PT package'}
                </button>
              </div>
            ) : null}

            {activeMenu === 'booking' ? (
              <div className="form" style={{ width: '100%' }}>
                <label>
                  class_id
                  <select
                    value={bookingForm.class_id}
                    onChange={(e) =>
                      setBookingForm((prev) => ({
                        ...prev,
                        class_id: e.target.value,
                        registration_answers: {}
                      }))
                    }
                  >
                    <option value="">Pilih program</option>
                    {classes.map((item) => (
                      <option key={item.class_id} value={item.class_id}>
                        {item.class_name || item.class_id}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  amount
                  <input
                    type="number"
                    min="0"
                    value={bookingForm.amount}
                    onChange={(e) => setBookingForm((prev) => ({ ...prev, amount: e.target.value }))}
                  />
                </label>
                <label>
                  method
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
                {selectedBookingClass ? (
                  <div className="card" style={{ borderStyle: 'dashed' }}>
                    <p className="eyebrow">Program info</p>
                    <p><strong>{selectedBookingClass.class_name || selectedBookingClass.class_id}</strong></p>
                    <p>Mulai: {selectedBookingClass.start_at || '-'}</p>
                    {selectedBookingProgramInfo.preText ? <p><strong>Before program:</strong> {selectedBookingProgramInfo.preText}</p> : null}
                    {selectedBookingProgramInfo.postText ? <p><strong>After program:</strong> {selectedBookingProgramInfo.postText}</p> : null}
                  </div>
                ) : null}
                {selectedBookingRegistrationFields.length > 0 ? (
                  <div className="card" style={{ borderStyle: 'dashed' }}>
                    <p className="eyebrow">Custom fields</p>
                    <p className="feedback">Isi field yang diminta program ini sebelum booking dibuat.</p>
                    {selectedBookingRegistrationFields.map((field, index) => {
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
                <button className="btn" type="button" disabled={bookingSaving} onClick={submitClassBooking}>
                  {bookingSaving ? 'Booking...' : 'Book program'}
                </button>
              </div>
            ) : null}
          </div>

          {activeMenu === 'booking' ? (
            <section className="payment-history">
              <h3>My program bookings</h3>
              {memberBookings.length > 0 ? (
                <div className="entity-list">
                  {memberBookings.slice(0, 20).map((item) => (
                    <div className="entity-row" key={item.booking_id}>
                      <div>
                        <strong>{item.booking_id}</strong>
                        <p>{item.class_id} | {item.status || '-'}</p>
                        <p>booked: {item.booked_at || '-'}</p>
                        <p>payment: {item.payment_id || '-'}</p>
                        {formatAnswerEntries(item.registration_answers).length > 0 ? (
                          <p>
                            answers: {formatAnswerEntries(item.registration_answers).map((entry) => `${entry.label}: ${entry.answer}`).join(' | ')}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Belum ada booking program.</p>
              )}
            </section>
          ) : null}

          {activeMenu === 'payment_history' ? (
            <section className="payment-history">
              <h3>History payment</h3>
              {paymentHistory.length > 0 ? (
                <div className="entity-list">
                  {paymentHistory.map((item) => (
                    <div className="entity-row" key={item.payment_id}>
                      <div>
                        <strong>{item.payment_id}</strong>
                        <p>
                          {item.recorded_at} - {item.method} - {formatMemberPaymentReference(item, {
                            classesById: classNameById,
                            packagesById: packageNameById,
                            eventsById: eventNameById
                          })}
                        </p>
                      </div>
                      <div className="payment-meta">
                        <strong>IDR {Number(item.amount || 0).toLocaleString('id-ID')}</strong>
                        <span className={`status ${item.status}`}>{item.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No payment history.</p>
              )}
            </section>
          ) : null}

          {feedback ? <p className="feedback">{feedback}</p> : null}
        </article>
      </section>

      <footer className="dash-foot">
        <Link to={accountPath(session, '/cs/dashboard')}>Back to search</Link>
      </footer>
    </main>
  );
}
