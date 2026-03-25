import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { accountPath, apiJson, getSession } from '../lib.js';

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
  const [memberEvents, setMemberEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEventParticipant, setSelectedEventParticipant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [membershipSaving, setMembershipSaving] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [eventActionSaving, setEventActionSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [activeMenu, setActiveMenu] = useState('checkin');
  const [feedback, setFeedback] = useState('');
  const [bookingForm, setBookingForm] = useState({ class_id: '' });
  const [membershipForm, setMembershipForm] = useState({
    plan_id: 'membership_monthly',
    months: '1',
    amount: '350000',
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
        const [membersRes, paymentsRes, classesRes, bookingsRes] = await Promise.all([
          apiJson(`/v1/read/members?tenant_id=${encodeURIComponent(tenantId)}&limit=1000`),
          apiJson(`/v1/read/payments/history?tenant_id=${encodeURIComponent(tenantId)}&member_id=${encodeURIComponent(memberId || '')}`),
          apiJson(`/v1/read/class-availability?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`).catch(() => ({ rows: [] })),
          apiJson(`/v1/read/bookings?tenant_id=${encodeURIComponent(tenantId)}`).catch(() => ({ rows: [] }))
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

  function actionMessage(action) {
    if (action === 'checkin') {
      return `checkin.logged queued for ${memberData?.member_id || memberId}`;
    }
    if (action === 'checkout') {
      return `checkout event queued for ${memberData?.member_id || memberId}`;
    }
    if (action === 'membership') {
      return `subscription.activated draft created for ${memberData?.member_id || memberId}`;
    }
    if (action === 'pt') {
      return `pt.package.assigned draft created for ${memberData?.member_id || memberId}`;
    }
    return `class.booking.created draft opened for ${memberData?.member_id || memberId}`;
  }

  function runAction(action) {
    setFeedback(actionMessage(action));
  }

  async function loadParticipantForSelectedEvent(eventId) {
    if (!eventId || !memberData?.email) {
      setSelectedEventParticipant(null);
      return;
    }
    try {
      const participantRes = await apiJson(
        `/v1/admin/events/${encodeURIComponent(eventId)}/participants?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}&limit=500`
      );
      const rows = Array.isArray(participantRes.rows) ? participantRes.rows : [];
      const row = rows.find((item) => String(item?.email || '').toLowerCase() === String(memberData.email || '').toLowerCase()) || null;
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
    if (!selectedEventId || !memberData?.email) {
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
    if (!selectedEventId || !memberData?.email) {
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
      setFeedback(`membership.activated: ${subscriptionId} (${months} bulan)`);
      const paymentsRes = await apiJson(`/v1/read/payments/history?tenant_id=${encodeURIComponent(tenantId)}&member_id=${encodeURIComponent(memberId || '')}`);
      setPaymentHistory(paymentsRes.rows || []);
    } catch (error) {
      setFeedback(error.message || 'Gagal proses membership.');
    } finally {
      setMembershipSaving(false);
    }
  }

  async function submitClassBooking() {
    if (!memberData?.member_id) return;
    if (!bookingForm.class_id) {
      setFeedback('Pilih class terlebih dulu.');
      return;
    }
    try {
      setBookingSaving(true);
      await apiJson('/v1/bookings/classes/create', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          booking_id: `book_${Date.now()}`,
          class_id: bookingForm.class_id,
          booking_kind: 'member',
          member_id: memberData.member_id,
          guest_name: memberData.full_name || null,
          status: 'booked'
        })
      });
      await apiJson('/v1/projections/run', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId
        })
      }).catch(() => {});
      const bookingsRes = await apiJson(`/v1/read/bookings?tenant_id=${encodeURIComponent(tenantId)}`);
      const allBookings = Array.isArray(bookingsRes.rows) ? bookingsRes.rows : [];
      setMemberBookings(allBookings.filter((row) => String(row.member_id || '') === String(memberId || '')));
      setFeedback(`class.booking.created: ${memberData.member_id} -> ${bookingForm.class_id}`);
    } catch (error) {
      setFeedback(error.message || 'Gagal booking class.');
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
            <p>subscription_end: -</p>
            <p>remaining PT session: -</p>
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
              <button className="btn" onClick={() => runAction('pt')}>
                Buy PT package
              </button>
            ) : null}

            {activeMenu === 'booking' ? (
              <div className="form" style={{ width: '100%' }}>
                <label>
                  class_id
                  <select
                    value={bookingForm.class_id}
                    onChange={(e) => setBookingForm((prev) => ({ ...prev, class_id: e.target.value }))}
                  >
                    <option value="">Pilih class</option>
                    {classes.map((item) => (
                      <option key={item.class_id} value={item.class_id}>
                        {item.class_name || item.class_id}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="btn" type="button" disabled={bookingSaving} onClick={submitClassBooking}>
                  {bookingSaving ? 'Booking...' : 'Book class'}
                </button>
              </div>
            ) : null}
          </div>

          {activeMenu === 'booking' ? (
            <section className="payment-history">
              <h3>My class bookings</h3>
              {memberBookings.length > 0 ? (
                <div className="entity-list">
                  {memberBookings.slice(0, 20).map((item) => (
                    <div className="entity-row" key={item.booking_id}>
                      <div>
                        <strong>{item.booking_id}</strong>
                        <p>{item.class_id} | {item.status || '-'}</p>
                        <p>booked: {item.booked_at || '-'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Belum ada booking class.</p>
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
                          {item.recorded_at} - {item.method} - {item.reference_type || '-'}:{item.reference_id || '-'}
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
