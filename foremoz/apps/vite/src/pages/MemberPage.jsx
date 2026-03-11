import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { accountPath, apiJson, getSession } from '../lib.js';

export default function MemberPage() {
  const navigate = useNavigate();
  const session = getSession();
  const { memberId } = useParams();
  const tenantId = session?.tenant?.id || 'tn_001';
  const [memberRow, setMemberRow] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [activeMenu, setActiveMenu] = useState('checkin');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadMemberData() {
      try {
        setLoading(true);
        setLoadError('');
        const [membersRes, paymentsRes] = await Promise.all([
          apiJson(`/v1/read/members?tenant_id=${encodeURIComponent(tenantId)}&limit=1000`),
          apiJson(`/v1/read/payments/history?tenant_id=${encodeURIComponent(tenantId)}&member_id=${encodeURIComponent(memberId || '')}`)
        ]);
        if (cancelled) return;
        const memberFound = (membersRes.rows || []).find((row) => String(row.member_id || '') === String(memberId || '')) || null;
        setMemberRow(memberFound);
        setPaymentHistory(paymentsRes.rows || []);
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
  }, [tenantId, memberId]);

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
              <>
                <button className="btn" onClick={() => runAction('checkin')}>
                  Checkin
                </button>
                <button className="btn ghost" onClick={() => runAction('checkout')}>
                  Checkout
                </button>
              </>
            ) : null}

            {activeMenu === 'membership' ? (
              <button className="btn" onClick={() => runAction('membership')}>
                Buy membership package
              </button>
            ) : null}

            {activeMenu === 'pt' ? (
              <button className="btn" onClick={() => runAction('pt')}>
                Buy PT package
              </button>
            ) : null}

            {activeMenu === 'booking' ? (
              <button className="btn" onClick={() => runAction('booking')}>
                Open booking schedule
              </button>
            ) : null}
          </div>

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
                          {item.recorded_at} - {item.method} - {item.ref}
                        </p>
                      </div>
                      <div className="payment-meta">
                        <strong>IDR {item.amount.toLocaleString('id-ID')}</strong>
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
