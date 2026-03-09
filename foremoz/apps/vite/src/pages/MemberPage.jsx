import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { accountPath, getSession } from '../lib.js';
import { getMemberById } from '../member-data.js';

const PAYMENT_HISTORY = {
  mem_4471: [
    { payment_id: 'pay_90011', recorded_at: '2026-03-01', method: 'transfer', amount: 650000, status: 'confirmed', ref: 'sub_90021' },
    { payment_id: 'pay_88910', recorded_at: '2026-02-01', method: 'cash', amount: 650000, status: 'confirmed', ref: 'sub_88999' }
  ],
  mem_4472: [
    { payment_id: 'pay_88001', recorded_at: '2026-01-20', method: 'transfer', amount: 650000, status: 'confirmed', ref: 'sub_88001' }
  ],
  mem_4473: [
    { payment_id: 'pay_91010', recorded_at: '2026-02-27', method: 'qris', amount: 1200000, status: 'pending', ref: 'pt_pkg_3003' }
  ]
};

export default function MemberPage() {
  const navigate = useNavigate();
  const session = getSession();
  const { memberId } = useParams();
  const member = useMemo(() => getMemberById(memberId), [memberId]);
  const [activeMenu, setActiveMenu] = useState('checkin');
  const [feedback, setFeedback] = useState('');

  if (!member) {
    return <Navigate to={accountPath(session, '/cs/dashboard')} replace />;
  }

  const paymentHistory = PAYMENT_HISTORY[member.member_id] || [];

  function actionMessage(action) {
    if (action === 'checkin') {
      return `checkin.logged queued for ${member.member_id}`;
    }
    if (action === 'checkout') {
      return `checkout event queued for ${member.member_id}`;
    }
    if (action === 'membership') {
      return `subscription.activated draft created for ${member.member_id}`;
    }
    if (action === 'pt') {
      return `pt.package.assigned draft created for ${member.member_id}`;
    }
    return `class.booking.created draft opened for ${member.member_id}`;
  }

  function runAction(action) {
    setFeedback(actionMessage(action));
  }

  return (
    <main className="dashboard">
      <header className="dash-head card">
        <div>
          <p className="eyebrow">Member</p>
          <h1>{member.full_name}</h1>
          <p>{member.member_id}</p>
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

          <div className="member-detail">
            <p>
              <strong>{member.full_name}</strong>
            </p>
            <p>member_id: {member.member_id}</p>
            <p>phone: {member.phone}</p>
            <p>ktp_number: {member.ktp_number}</p>
            <p>
              status: <span className={`status ${member.status}`}>{member.status}</span>
            </p>
            <p>subscription_end: {member.subscription_end}</p>
            <p>remaining PT session: {member.pt_remaining_sessions}</p>
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
