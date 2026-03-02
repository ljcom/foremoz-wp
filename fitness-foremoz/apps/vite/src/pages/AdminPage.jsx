import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSession } from '../lib.js';

const ADMIN_TABS = [
  { id: 'user', label: 'User' },
  { id: 'class', label: 'Class' },
  { id: 'trainer', label: 'Trainer' },
  { id: 'sales', label: 'Sales' },
  { id: 'saas', label: 'SaaS' }
];

function DeleteButton({ onClick }) {
  return (
    <button className="btn ghost" type="button" onClick={onClick}>
      Delete
    </button>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [activeTab, setActiveTab] = useState('user');
  const [feedback, setFeedback] = useState('');

  const [userForm, setUserForm] = useState({ full_name: '', email: '', role: 'staff' });
  const [classForm, setClassForm] = useState({ class_name: '', trainer_name: '', capacity: '20', start_at: '' });
  const [trainerForm, setTrainerForm] = useState({ trainer_name: '', phone: '', specialization: '' });
  const [salesForm, setSalesForm] = useState({ sales_name: '', channel: 'walkin', target_amount: '' });
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

  const namespace = session?.tenant?.namespace || '-';
  const chain = session?.branch?.chain || 'core';

  function addUser(e) {
    e.preventDefault();
    if (!userForm.full_name || !userForm.email) return;
    setUsers((prev) => [{ ...userForm, user_id: `usr_${Date.now()}` }, ...prev]);
    setFeedback(`user.created: ${userForm.full_name}`);
    setUserForm({ full_name: '', email: '', role: 'staff' });
  }

  function addClass(e) {
    e.preventDefault();
    if (!classForm.class_name || !classForm.trainer_name || !classForm.start_at) return;
    setClasses((prev) => [{ ...classForm, class_id: `class_${Date.now()}` }, ...prev]);
    setFeedback(`class.scheduled: ${classForm.class_name}`);
    setClassForm({ class_name: '', trainer_name: '', capacity: '20', start_at: '' });
  }

  function addTrainer(e) {
    e.preventDefault();
    if (!trainerForm.trainer_name) return;
    setTrainers((prev) => [{ ...trainerForm, trainer_id: `tr_${Date.now()}` }, ...prev]);
    setFeedback(`trainer.created: ${trainerForm.trainer_name}`);
    setTrainerForm({ trainer_name: '', phone: '', specialization: '' });
  }

  function addSales(e) {
    e.preventDefault();
    if (!salesForm.sales_name || !salesForm.target_amount) return;
    setSales((prev) => [{ ...salesForm, sales_id: `sales_${Date.now()}` }, ...prev]);
    setFeedback(`sales.target.set: ${salesForm.sales_name}`);
    setSalesForm({ sales_name: '', channel: 'walkin', target_amount: '' });
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
          <button className="btn ghost" onClick={() => navigate('/dashboard')}>
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
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </aside>

        <article className="card admin-main">
          {activeTab === 'user' ? (
            <>
              <p className="eyebrow">User</p>
              <h2>User list, add, delete</h2>
              <div className="entity-list">
                {users.map((item) => (
                  <div className="entity-row" key={item.user_id}>
                    <div>
                      <strong>{item.full_name}</strong>
                      <p>{item.email} - {item.role}</p>
                    </div>
                    <DeleteButton onClick={() => setUsers((prev) => prev.filter((v) => v.user_id !== item.user_id))} />
                  </div>
                ))}
              </div>
              <form className="form" onSubmit={addUser}>
                <label>full_name<input value={userForm.full_name} onChange={(e) => setUserForm((p) => ({ ...p, full_name: e.target.value }))} /></label>
                <label>email<input type="email" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} /></label>
                <label>role<select value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}><option value="staff">staff</option><option value="manager">manager</option><option value="admin">admin</option></select></label>
                <button className="btn" type="submit">Add user</button>
              </form>
            </>
          ) : null}

          {activeTab === 'class' ? (
            <>
              <p className="eyebrow">Class</p>
              <h2>Class list, add, delete</h2>
              <div className="entity-list">
                {classes.map((item) => (
                  <div className="entity-row" key={item.class_id}>
                    <div>
                      <strong>{item.class_name}</strong>
                      <p>{item.trainer_name} - cap {item.capacity} - {item.start_at}</p>
                    </div>
                    <DeleteButton onClick={() => setClasses((prev) => prev.filter((v) => v.class_id !== item.class_id))} />
                  </div>
                ))}
              </div>
              <form className="form" onSubmit={addClass}>
                <label>class_name<input value={classForm.class_name} onChange={(e) => setClassForm((p) => ({ ...p, class_name: e.target.value }))} /></label>
                <label>trainer_name<input value={classForm.trainer_name} onChange={(e) => setClassForm((p) => ({ ...p, trainer_name: e.target.value }))} /></label>
                <label>capacity<input type="number" min="1" value={classForm.capacity} onChange={(e) => setClassForm((p) => ({ ...p, capacity: e.target.value }))} /></label>
                <label>start_at<input type="datetime-local" value={classForm.start_at} onChange={(e) => setClassForm((p) => ({ ...p, start_at: e.target.value }))} /></label>
                <button className="btn" type="submit">Add class</button>
              </form>
            </>
          ) : null}

          {activeTab === 'trainer' ? (
            <>
              <p className="eyebrow">Trainer</p>
              <h2>Trainer list, add, delete</h2>
              <div className="entity-list">
                {trainers.map((item) => (
                  <div className="entity-row" key={item.trainer_id}>
                    <div>
                      <strong>{item.trainer_name}</strong>
                      <p>{item.phone} - {item.specialization || '-'}</p>
                    </div>
                    <DeleteButton onClick={() => setTrainers((prev) => prev.filter((v) => v.trainer_id !== item.trainer_id))} />
                  </div>
                ))}
              </div>
              <form className="form" onSubmit={addTrainer}>
                <label>trainer_name<input value={trainerForm.trainer_name} onChange={(e) => setTrainerForm((p) => ({ ...p, trainer_name: e.target.value }))} /></label>
                <label>phone<input value={trainerForm.phone} onChange={(e) => setTrainerForm((p) => ({ ...p, phone: e.target.value }))} /></label>
                <label>specialization<input value={trainerForm.specialization} onChange={(e) => setTrainerForm((p) => ({ ...p, specialization: e.target.value }))} /></label>
                <button className="btn" type="submit">Add trainer</button>
              </form>
            </>
          ) : null}

          {activeTab === 'sales' ? (
            <>
              <p className="eyebrow">Sales</p>
              <h2>Sales list, add, delete</h2>
              <div className="entity-list">
                {sales.map((item) => (
                  <div className="entity-row" key={item.sales_id}>
                    <div>
                      <strong>{item.sales_name}</strong>
                      <p>{item.channel} - target {item.target_amount}</p>
                    </div>
                    <DeleteButton onClick={() => setSales((prev) => prev.filter((v) => v.sales_id !== item.sales_id))} />
                  </div>
                ))}
              </div>
              <form className="form" onSubmit={addSales}>
                <label>sales_name<input value={salesForm.sales_name} onChange={(e) => setSalesForm((p) => ({ ...p, sales_name: e.target.value }))} /></label>
                <label>channel<select value={salesForm.channel} onChange={(e) => setSalesForm((p) => ({ ...p, channel: e.target.value }))}><option value="walkin">walkin</option><option value="instagram">instagram</option><option value="whatsapp">whatsapp</option><option value="referral">referral</option></select></label>
                <label>target_amount<input type="number" min="0" value={salesForm.target_amount} onChange={(e) => setSalesForm((p) => ({ ...p, target_amount: e.target.value }))} /></label>
                <button className="btn" type="submit">Add sales</button>
              </form>
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
        <Link to="/dashboard">Back to search member</Link>
      </footer>
    </main>
  );
}
