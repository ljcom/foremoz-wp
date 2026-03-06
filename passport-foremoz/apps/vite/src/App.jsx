const subscriptions = [
  { coach: 'Coach Raka', studio: 'Forge Fitness Kuningan', plan: 'Strength Reset', status: 'active', next: '2026-03-20' },
  { coach: 'Coach Alia', studio: 'Pulse Yoga Kemang', plan: 'Mobility Flow', status: 'active', next: '2026-03-14' },
  { coach: 'Coach Fajar', studio: 'Arena Boxing Senayan', plan: 'Conditioning Camp', status: 'paused', next: '2026-04-02' }
];

const performance = [
  { metric: 'Weight', value: '68.4 kg', trend: '-1.6 kg / 30d' },
  { metric: 'Muscle Mass', value: '29.8 kg', trend: '+0.7 kg / 30d' },
  { metric: 'Body Fat', value: '18.1%', trend: '-1.2% / 30d' },
  { metric: 'Diet Adherence', value: '82%', trend: '+9% / 30d' }
];

const consents = [
  { coach: 'Coach Raka', weight: true, muscle: true, diet: true, workout: true },
  { coach: 'Coach Alia', weight: true, muscle: false, diet: true, workout: true },
  { coach: 'Coach Fajar', weight: false, muscle: false, diet: false, workout: true }
];

function statusPill(status) {
  if (status === 'active') return 'pill pill-active';
  if (status === 'paused') return 'pill pill-paused';
  return 'pill';
}

export default function App() {
  return (
    <main className="page">
      <section className="hero">
        <div className="hero-blur" />
        <p className="eyebrow">passport.foremoz.com</p>
        <h1>Your Fitness Identity, Across Every Coach.</h1>
        <p>
          Satu passport untuk join banyak coach dan studio, simpan progres personal,
          dan kontrol data mana yang boleh dibagikan.
        </p>
        <div className="hero-actions">
          <button className="btn primary">Join New Program</button>
          <button className="btn ghost">Open Privacy Settings</button>
        </div>
      </section>

      <section className="grid two-up">
        <article className="card spotlight">
          <h2>Subscription Portfolio</h2>
          <p className="sub">Multi-coach & multi-studio active from one passport.</p>
          <ul className="stack">
            {subscriptions.map((row) => (
              <li key={`${row.coach}-${row.plan}`} className="row">
                <div>
                  <strong>{row.plan}</strong>
                  <p>{row.coach} · {row.studio}</p>
                </div>
                <div className="row-right">
                  <span className={statusPill(row.status)}>{row.status}</span>
                  <small>Next {row.next}</small>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2>Performance Snapshot</h2>
          <p className="sub">Personal logs: diet, weight, muscle, body composition.</p>
          <div className="metrics">
            {performance.map((m) => (
              <div className="metric" key={m.metric}>
                <span>{m.metric}</span>
                <strong>{m.value}</strong>
                <small>{m.trend}</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid">
        <article className="card consent">
          <h2>Coach Data Consent</h2>
          <p className="sub">Only shared if you allow. Revoke anytime.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Coach</th>
                  <th>Weight</th>
                  <th>Muscle</th>
                  <th>Diet</th>
                  <th>Workout</th>
                </tr>
              </thead>
              <tbody>
                {consents.map((c) => (
                  <tr key={c.coach}>
                    <td>{c.coach}</td>
                    <td>{c.weight ? 'Yes' : 'No'}</td>
                    <td>{c.muscle ? 'Yes' : 'No'}</td>
                    <td>{c.diet ? 'Yes' : 'No'}</td>
                    <td>{c.workout ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="footer-note">
        <p>
          Mockup mode only. Consent updates, metrics logs, and subscriptions are visual placeholders.
        </p>
      </section>
    </main>
  );
}
