import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountPath, getSession } from '../lib.js';

export default function SalesProspectNewPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    source: 'instagram',
    stage: 'new',
    goal: '',
    note: ''
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.full_name || !form.phone) return;
    navigate(accountPath(session, '/sales/dashboard'), { replace: true });
  }

  return (
    <main className="dashboard">
      <header className="dash-head card">
        <div>
          <p className="eyebrow">Sales Workspace</p>
          <h1>Add prospect</h1>
          <p>Input prospect information for CRM pipeline.</p>
        </div>
        <div className="meta">
          <code>role: sales</code>
          <button className="btn ghost" onClick={() => navigate(accountPath(session, '/sales/dashboard'))}>
            Back to list
          </button>
        </div>
      </header>

      <section className="card admin-main" style={{ marginTop: '1rem' }}>
        <form className="form" onSubmit={handleSubmit}>
          <label>
            full_name
            <input name="full_name" value={form.full_name} onChange={handleChange} />
          </label>
          <label>
            phone
            <input name="phone" value={form.phone} onChange={handleChange} />
          </label>
          <label>
            email
            <input name="email" type="email" value={form.email} onChange={handleChange} />
          </label>
          <label>
            source
            <select name="source" value={form.source} onChange={handleChange}>
              <option value="instagram">instagram</option>
              <option value="walkin">walkin</option>
              <option value="referral">referral</option>
              <option value="whatsapp">whatsapp</option>
            </select>
          </label>
          <label>
            stage
            <select name="stage" value={form.stage} onChange={handleChange}>
              <option value="new">new</option>
              <option value="follow_up">follow_up</option>
              <option value="qualified">qualified</option>
            </select>
          </label>
          <label>
            goal
            <input name="goal" value={form.goal} onChange={handleChange} placeholder="fat loss, strength, rehab, etc." />
          </label>
          <label>
            note
            <textarea name="note" value={form.note} onChange={handleChange} rows="4" />
          </label>
          <button className="btn" type="submit">Save prospect</button>
        </form>
      </section>
    </main>
  );
}
