import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { accountPath, getSession } from '../lib.js';

const ADMIN_TABS = [
  // { id: 'user', label: 'User' },
  { id: 'class', label: 'Class' },
  { id: 'trainer', label: 'Trainer' },
  { id: 'sales', label: 'Sales' },
  { id: 'member', label: 'Member' },
  { id: 'transaction', label: 'Transaction' },
  // { id: 'saas', label: 'SaaS' }
];

function DeleteButton({ onClick }) {
  return (
    <span
      role="button"
      tabIndex={0}
      style={{ cursor: 'pointer', background: '#fff', color: '#8f3f1e', border:'1px solid #d9bea0', margin: '2px', padding: '0.2rem 0.45rem', borderRadius: '10px' }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      delete
    </span>
  );
}

function ViewButton({ onClick }) {
  return (
    <span
      role="button"
      tabIndex={0}
      style={{ cursor: 'pointer', background: '#fff', color: '#8f3f1e', border:'1px solid #d9bea0', margin: '2px', padding: '0.2rem 0.45rem', borderRadius: '10px' }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      view
    </span>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [activeTab, setActiveTab] = useState('class');
  const [userMode, setUserMode] = useState('list');
  const [classMode, setClassMode] = useState('list');
  const [trainerMode, setTrainerMode] = useState('list');
  const [salesMode, setSalesMode] = useState('list');
  const [memberMode, setMemberMode] = useState('list');
  const [transactionMode, setTransactionMode] = useState('list');
  const [feedback, setFeedback] = useState('');
  const [classQuery, setClassQuery] = useState('');
  const [trainerQuery, setTrainerQuery] = useState('');
  const [salesQuery, setSalesQuery] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [transactionQuery, setTransactionQuery] = useState('');

  const [userForm, setUserForm] = useState({ full_name: '', email: '', role: 'staff' });
  const [classForm, setClassForm] = useState({ class_name: '', trainer_name: '', capacity: '20', start_at: '' });
  const [trainerForm, setTrainerForm] = useState({ trainer_name: '', phone: '', specialization: '' });
  const [salesForm, setSalesForm] = useState({ sales_name: '', channel: 'walkin', target_amount: '' });
  const [memberForm, setMemberForm] = useState({ member_name: '', phone: '', email: '' });
  const [transactionForm, setTransactionForm] = useState({ no_transaction: '', product: '', qty: '1', price: '' });
  const [saasForm, setSaasForm] = useState({ months: '1', note: '' });

  const [users, setUsers] = useState([
    { user_id: 'usr_001', full_name: 'Aulia Admin', email: 'aulia@foremoz.com', role: 'admin' }
  ]);
  const [classes, setClasses] = useState([
    { class_id: 'class_001', class_name: 'HIIT Morning', trainer_name: 'Raka', capacity: '20', start_at: '2026-03-03 07:00' }
  ]);
  const [trainers, setTrainers] = useState([
    { trainer_id: 'tr_001', trainer_name: 'Raka', phone: '081234555500', specialization: 'HIIT' }
  ]);
  const [sales, setSales] = useState([
    { sales_id: 'sales_001', sales_name: 'Nina', channel: 'instagram', target_amount: '20000000' }
  ]);
  const [members, setMembers] = useState([
    { member_id: 'member_001', member_name: 'Doni', phone: '081200001111', email: 'doni@foremoz.com' }
  ]);
  const [transactions, setTransactions] = useState([
    { transaction_id: 'trx_001', no_transaction: 'TRX-001', product: 'Monthly Membership', qty: '1', price: '350000' }
  ]);

  const namespace = session?.tenant?.namespace || '-';
  const chain = session?.branch?.chain || 'core';
  const filteredMembers = members.filter((item) =>
    item.member_name.toLowerCase().includes(memberQuery.toLowerCase())
  );
  const filteredClasses = classes.filter((item) =>
    item.class_name.toLowerCase().includes(classQuery.toLowerCase()) ||
    item.trainer_name.toLowerCase().includes(classQuery.toLowerCase()) ||
    item.start_at.toLowerCase().includes(classQuery.toLowerCase())
  );
  const filteredTrainers = trainers.filter((item) =>
    item.trainer_name.toLowerCase().includes(trainerQuery.toLowerCase()) ||
    item.phone.toLowerCase().includes(trainerQuery.toLowerCase()) ||
    item.specialization.toLowerCase().includes(trainerQuery.toLowerCase())
  );
  const filteredSales = sales.filter((item) =>
    item.sales_name.toLowerCase().includes(salesQuery.toLowerCase()) ||
    item.channel.toLowerCase().includes(salesQuery.toLowerCase()) ||
    item.target_amount.toLowerCase().includes(salesQuery.toLowerCase())
  );
  const filteredTransactions = transactions.filter((item) =>
    item.no_transaction.toLowerCase().includes(transactionQuery.toLowerCase()) ||
    item.product.toLowerCase().includes(transactionQuery.toLowerCase())
  );

  function addUser(e) {
    e.preventDefault();
    if (!userForm.full_name || !userForm.email) return;
    setUsers((prev) => [{ ...userForm, user_id: `usr_${Date.now()}` }, ...prev]);
    setFeedback(`user.created: ${userForm.full_name}`);
    setUserForm({ full_name: '', email: '', role: 'staff' });
    setUserMode('list');
  }

  function viewUser(item) {
    setUserForm({
      full_name: item.full_name || '',
      email: item.email || '',
      role: item.role || 'staff'
    });
    setUserMode('add');
  }

  function addClass(e) {
    e.preventDefault();
    if (!classForm.class_name || !classForm.trainer_name || !classForm.start_at) return;
    setClasses((prev) => [{ ...classForm, class_id: `class_${Date.now()}` }, ...prev]);
    setFeedback(`class.scheduled: ${classForm.class_name}`);
    setClassForm({ class_name: '', trainer_name: '', capacity: '20', start_at: '' });
    setClassMode('list');
  }

  function viewClass(item) {
    const normalizedStartAt = item.start_at?.includes(' ') ? item.start_at.replace(' ', 'T') : item.start_at;
    setClassForm({
      class_name: item.class_name || '',
      trainer_name: item.trainer_name || '',
      capacity: item.capacity || '20',
      start_at: normalizedStartAt || ''
    });
    setClassMode('add');
  }

  function addTrainer(e) {
    e.preventDefault();
    if (!trainerForm.trainer_name) return;
    setTrainers((prev) => [{ ...trainerForm, trainer_id: `tr_${Date.now()}` }, ...prev]);
    setFeedback(`trainer.created: ${trainerForm.trainer_name}`);
    setTrainerForm({ trainer_name: '', phone: '', specialization: '' });
    setTrainerMode('list');
  }

  function viewTrainer(item) {
    setTrainerForm({
      trainer_name: item.trainer_name || '',
      phone: item.phone || '',
      specialization: item.specialization || ''
    });
    setTrainerMode('add');
  }

  function addSales(e) {
    e.preventDefault();
    if (!salesForm.sales_name || !salesForm.target_amount) return;
    setSales((prev) => [{ ...salesForm, sales_id: `sales_${Date.now()}` }, ...prev]);
    setFeedback(`sales.target.set: ${salesForm.sales_name}`);
    setSalesForm({ sales_name: '', channel: 'walkin', target_amount: '' });
    setSalesMode('list');
  }

  function viewSales(item) {
    setSalesForm({
      sales_name: item.sales_name || '',
      channel: item.channel || 'walkin',
      target_amount: item.target_amount || ''
    });
    setSalesMode('add');
  }

  function addMember(e) {
    e.preventDefault();
    if (!memberForm.member_name || !memberForm.phone) return;
    setMembers((prev) => [{ ...memberForm, member_id: `member_${Date.now()}` }, ...prev]);
    setFeedback(`member.created: ${memberForm.member_name}`);
    setMemberForm({ member_name: '', phone: '', email: '' });
    setMemberMode('list');
  }

  function viewMember(item) {
    setMemberForm({
      member_name: item.member_name || '',
      phone: item.phone || '',
      email: item.email || ''
    });
    setMemberMode('add');
  }

  function addTransaction(e) {
    e.preventDefault();
    if (!transactionForm.no_transaction || !transactionForm.product || !transactionForm.qty || !transactionForm.price) return;
    setTransactions((prev) => [{ ...transactionForm, transaction_id: `trx_${Date.now()}` }, ...prev]);
    setFeedback(`transaction.created: ${transactionForm.no_transaction}`);
    setTransactionForm({ no_transaction: '', product: '', qty: '1', price: '' });
    setTransactionMode('list');
  }

  function viewTransaction(item) {
    setTransactionForm({
      no_transaction: item.no_transaction || '',
      product: item.product || '',
      qty: item.qty || '1',
      price: item.price || ''
    });
    setTransactionMode('add');
  }

  function extendSaas(e) {
    e.preventDefault();
    setFeedback(`saas.extended: +${saasForm.months} month(s)`);
    setSaasForm({ months: '1', note: '' });
  }

  return (
    <main className="dashboard">
      <header className="dash-head card">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>{session?.tenant?.gym_name || 'Foremoz Fitness Tenant'}</h1>
          <p>Tenant administration panel</p>
        </div>
        <div className="meta">
          <code>namespace: {namespace}</code>
          <code>chain: {chain}</code>
          <button className="btn ghost" onClick={() => navigate(accountPath(session, '/admin/dashboard'))}>
            Back to dashboard
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar card">
          <p className="eyebrow">Admin Menu</p>
          {ADMIN_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`side-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'class') {
                  setClassMode('list');
                }
                if (tab.id === 'user') {
                  setUserMode('list');
                }
                if (tab.id === 'trainer') {
                  setTrainerMode('list');
                }
                if (tab.id === 'sales') {
                  setSalesMode('list');
                }
                if (tab.id === 'member') {
                  setMemberMode('list');
                }
                if (tab.id === 'transaction') {
                  setTransactionMode('list');
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </aside>

        <article className="card admin-main">
          {activeTab === 'user' ? (
            <>
              <p className="eyebrow">User</p>
              {userMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>User list, delete</h2>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => {
                        setUserForm({ full_name: '', email: '', role: 'staff' });
                        setUserMode('add');
                      }}
                    >
                      Add New
                    </button>
                  </div>
                  <div className="entity-list">
                    {users.map((item) => (
                      <div className="entity-row" key={item.user_id}>
                        <div>
                          <strong>{item.full_name}</strong>
                          <p>{item.email} - {item.role}</p>
                        </div>
                        <div className="row-actions">
                          <ViewButton onClick={() => viewUser(item)} />
                          <DeleteButton onClick={() => setUsers((prev) => prev.filter((v) => v.user_id !== item.user_id))} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {userMode === 'add' ? (
                <>
                  <div className="panel-head">
                    <h2>Add user</h2>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        setUserMode('list');
                      }}
                    >
                      Back to list
                    </button>
                  </div>
                  <form className="form" onSubmit={addUser}>
                    <label>full_name<input value={userForm.full_name} onChange={(e) => setUserForm((p) => ({ ...p, full_name: e.target.value }))} /></label>
                    <label>email<input type="email" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} /></label>
                    <label>role<select value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}><option value="staff">staff</option><option value="manager">manager</option><option value="admin">admin</option></select></label>
                    <button className="btn" type="submit">Save user</button>
                  </form>
                </>
              ) : null}
            </>
          ) : null}

          {activeTab === 'class' ? (
            <>
              <p className="eyebrow">Class</p>
              {classMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>Class list, delete</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder="Cari class..."
                        value={classQuery}
                        onChange={(e) => setClassQuery(e.target.value)}
                      />
                      <button className="btn" type="button" onClick={() => setClassMode('add')}>
                        Add New
                      </button>
                    </div>
                  </div>
                  <div className="entity-list">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Class Name</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Trainer</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Capacity</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Start At</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredClasses.map((item, idx) => (
                          <tr key={item.class_id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f7efe6' }}>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.class_name}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.trainer_name}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.capacity}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.start_at}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                              <div className="row-actions">
                                <ViewButton onClick={() => viewClass(item)} />
                                <DeleteButton onClick={() => setClasses((prev) => prev.filter((v) => v.class_id !== item.class_id))} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="panel-head">
                    <h2>Add class</h2>
                    <button className="btn ghost" type="button" onClick={() => setClassMode('list')}>
                      Back to list
                    </button>
                  </div>
                  <form className="form" onSubmit={addClass}>
                    <label>class_name<input value={classForm.class_name} onChange={(e) => setClassForm((p) => ({ ...p, class_name: e.target.value }))} /></label>
                    <label>trainer_name<input value={classForm.trainer_name} onChange={(e) => setClassForm((p) => ({ ...p, trainer_name: e.target.value }))} /></label>
                    <label>capacity<input type="number" min="1" value={classForm.capacity} onChange={(e) => setClassForm((p) => ({ ...p, capacity: e.target.value }))} /></label>
                    <label>start_at<input type="datetime-local" value={classForm.start_at} onChange={(e) => setClassForm((p) => ({ ...p, start_at: e.target.value }))} /></label>
                    <button className="btn" type="submit">Save class</button>
                  </form>
                </>
              )}
            </>
          ) : null}

          {activeTab === 'trainer' ? (
            <>
              <p className="eyebrow">Trainer</p>
              {trainerMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>Trainer list, delete</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder="Cari trainer..."
                        value={trainerQuery}
                        onChange={(e) => setTrainerQuery(e.target.value)}
                      />
                      <button className="btn" type="button" onClick={() => setTrainerMode('add')}>
                        Add New
                      </button>
                    </div>
                  </div>
                  <div className="entity-list">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Nama Trainer</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>No. HP</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Specialization</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTrainers.map((item, idx) => (
                          <tr key={item.trainer_id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f7efe6' }}>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.trainer_name}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.phone}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.specialization || '-'}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                              <div className="row-actions">
                                <ViewButton onClick={() => viewTrainer(item)} />
                                <DeleteButton onClick={() => setTrainers((prev) => prev.filter((v) => v.trainer_id !== item.trainer_id))} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="panel-head">
                    <h2>Add trainer</h2>
                    <button className="btn ghost" type="button" onClick={() => setTrainerMode('list')}>
                      Back to list
                    </button>
                  </div>
                  <form className="form" onSubmit={addTrainer}>
                    <label>trainer_name<input value={trainerForm.trainer_name} onChange={(e) => setTrainerForm((p) => ({ ...p, trainer_name: e.target.value }))} /></label>
                    <label>phone<input value={trainerForm.phone} onChange={(e) => setTrainerForm((p) => ({ ...p, phone: e.target.value }))} /></label>
                    <label>specialization<input value={trainerForm.specialization} onChange={(e) => setTrainerForm((p) => ({ ...p, specialization: e.target.value }))} /></label>
                    <button className="btn" type="submit">Save trainer</button>
                  </form>
                </>
              )}
            </>
          ) : null}

          {activeTab === 'sales' ? (
            <>
              <p className="eyebrow">Sales</p>
              {salesMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>Sales list, delete</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder="Cari sales..."
                        value={salesQuery}
                        onChange={(e) => setSalesQuery(e.target.value)}
                      />
                      <button className="btn" type="button" onClick={() => setSalesMode('add')}>
                        Add New
                      </button>
                    </div>
                  </div>
                  <div className="entity-list">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Nama Sales</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Channel</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Target Amount</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSales.map((item, idx) => (
                          <tr key={item.sales_id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f7efe6' }}>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.sales_name}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.channel}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.target_amount}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                              <div className="row-actions">
                                <ViewButton onClick={() => viewSales(item)} />
                                <DeleteButton onClick={() => setSales((prev) => prev.filter((v) => v.sales_id !== item.sales_id))} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="panel-head">
                    <h2>Add sales</h2>
                    <button className="btn ghost" type="button" onClick={() => setSalesMode('list')}>
                      Back to list
                    </button>
                  </div>
                  <form className="form" onSubmit={addSales}>
                    <label>sales_name<input value={salesForm.sales_name} onChange={(e) => setSalesForm((p) => ({ ...p, sales_name: e.target.value }))} /></label>
                    <label>channel<select value={salesForm.channel} onChange={(e) => setSalesForm((p) => ({ ...p, channel: e.target.value }))}><option value="walkin">walkin</option><option value="instagram">instagram</option><option value="whatsapp">whatsapp</option><option value="referral">referral</option></select></label>
                    <label>target_amount<input type="number" min="0" value={salesForm.target_amount} onChange={(e) => setSalesForm((p) => ({ ...p, target_amount: e.target.value }))} /></label>
                    <button className="btn" type="submit">Save sales</button>
                  </form>
                </>
              )}
            </>
          ) : null}

          {activeTab === 'member' ? (
            <>
              <p className="eyebrow">Member</p>
              {memberMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>Member list, delete</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder="Cari member..."
                        value={memberQuery}
                        onChange={(e) => setMemberQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="entity-list">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Nama Member</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>No. HP</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Email Aktif</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((item, idx) => (
                          <tr key={item.member_id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f7efe6' }}>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.member_name}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.phone}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.email || '-'}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                              <div className="row-actions">
                                <ViewButton onClick={() => viewMember(item)} />
                                <DeleteButton onClick={() => setMembers((prev) => prev.filter((v) => v.member_id !== item.member_id))} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="panel-head">
                    <h2>Add member</h2>
                    <button className="btn ghost" type="button" onClick={() => setMemberMode('list')}>
                      Back to list
                    </button>
                  </div>
                  <form className="form" onSubmit={addMember}>
                    <label>member_name<input value={memberForm.member_name} onChange={(e) => setMemberForm((p) => ({ ...p, member_name: e.target.value }))} /></label>
                    <label>phone<input value={memberForm.phone} onChange={(e) => setMemberForm((p) => ({ ...p, phone: e.target.value }))} /></label>
                    <label>email<input type="email" value={memberForm.email} onChange={(e) => setMemberForm((p) => ({ ...p, email: e.target.value }))} /></label>
                    <button className="btn" type="submit">Save member</button>
                  </form>
                </>
              )}
            </>
          ) : null}

          {activeTab === 'transaction' ? (
            <>
              <p className="eyebrow">Transaction</p>
              {transactionMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>Transaction list, delete</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder="Cari transaction..."
                        value={transactionQuery}
                        onChange={(e) => setTransactionQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="entity-list">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>No Transaction</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Product</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Qty</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Price</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((item, idx) => (
                          <tr key={item.transaction_id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f7efe6' }}>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.no_transaction}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.product}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.qty}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.price}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                              <div className="row-actions" style={{ display: 'flex', gap: '0' }}>
                                <span
                                  role="button"
                                  tabIndex={0}
                                  style={{ cursor: 'pointer', background: '#fff', color: '#8f3f1e', border:'1px solid #d9bea0', margin: '2px', padding: '0.2rem 0.45rem', borderRadius: '10px' }}
                                  onClick={() => viewTransaction(item)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      viewTransaction(item);
                                    }
                                  }}
                                >
                                  view
                                </span>
                                <span
                                  role="button"
                                  tabIndex={0}
                                  style={{ cursor: 'pointer', background: '#fff', color: '#8f3f1e', border:'1px solid #d9bea0', margin: '2px', padding: '0.2rem 0.45rem', borderRadius: '10px' }}
                                  onClick={() => setTransactions((prev) => prev.filter((v) => v.transaction_id !== item.transaction_id))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      setTransactions((prev) => prev.filter((v) => v.transaction_id !== item.transaction_id));
                                    }
                                  }}
                                >
                                  delete
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="panel-head">
                    <h2>Add transaction</h2>
                    <button className="btn ghost" type="button" onClick={() => setTransactionMode('list')}>
                      Back to list
                    </button>
                  </div>
                  <form className="form" onSubmit={addTransaction}>
                    <label>no_transaction<input value={transactionForm.no_transaction} onChange={(e) => setTransactionForm((p) => ({ ...p, no_transaction: e.target.value }))} /></label>
                    <label>product<input value={transactionForm.product} onChange={(e) => setTransactionForm((p) => ({ ...p, product: e.target.value }))} /></label>
                    <label>qty<input type="number" min="1" value={transactionForm.qty} onChange={(e) => setTransactionForm((p) => ({ ...p, qty: e.target.value }))} /></label>
                    <label>price<input type="number" min="0" value={transactionForm.price} onChange={(e) => setTransactionForm((p) => ({ ...p, price: e.target.value }))} /></label>
                    <button className="btn" type="submit">Save transaction</button>
                  </form>
                </>
              )}
            </>
          ) : null}

          {activeTab === 'saas' ? (
            <>
              <p className="eyebrow">SaaS</p>
              <h2>Perpanjang sewa SaaS</h2>
              <form className="form" onSubmit={extendSaas}>
                <label>tambah_bulan<select value={saasForm.months} onChange={(e) => setSaasForm((p) => ({ ...p, months: e.target.value }))}><option value="1">1</option><option value="3">3</option><option value="6">6</option><option value="12">12</option></select></label>
                <label>note<input value={saasForm.note} onChange={(e) => setSaasForm((p) => ({ ...p, note: e.target.value }))} /></label>
                <button className="btn" type="submit">Perpanjang sewa</button>
              </form>
            </>
          ) : null}

          {feedback ? <p className="feedback">{feedback}</p> : null}
        </article>
      </section>

      <footer className="dash-foot">
        <Link to={accountPath(session, '/admin/dashboard')}>Back to search member</Link>
      </footer>
    </main>
  );
}
