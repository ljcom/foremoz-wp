import { Link, useLocation } from 'react-router-dom';

const VERTICALS = {
  active: {
    title: 'Foremoz Active',
    subtitle: 'Fitness + Sport Operations',
    description:
      'Foremoz Active fokus pada operasi active center end-to-end: membership, booking, PT session, team, tournament, dan ranking.',
    features: [
      'Membership lifecycle (signup, subscription, freeze/unfreeze)',
      'Class/PT booking + attendance + payment queue',
      'Team, match, tournament, dan leaderboard',
      'Sales pipeline + owner setup + gov controls'
    ]
  },
  learning: {
    title: 'Foremoz Learning',
    subtitle: 'Learning Program Operations',
    description:
      'Foremoz Learning mendukung operasi program belajar berbasis cohort dan sesi terstruktur dengan alur mentor dan participant.',
    features: [
      'Enrollment, batch/cohort setup, dan class scheduling',
      'Attendance, assignment/progress checkpoints',
      'Mentor workspace + participant workspace',
      'Program analytics dan retention loop'
    ]
  },
  arts: {
    title: 'Foremoz Arts',
    subtitle: 'Creative & Performance Gig Operations',
    description:
      'Foremoz Arts untuk creator dan komunitas kreatif menjalankan sesi, showcase, performance, dan kolaborasi secara terstruktur.',
    features: [
      'Session/showcase booking dan run-of-show workflow',
      'Creator collaboration + invitation network',
      'Ticketing baseline + participant check-in',
      'Post-event engagement dan recurring gig loops'
    ]
  },
  tourism: {
    title: 'Foremoz Tourism',
    subtitle: 'Experience-Led Tourism Operations',
    description:
      'Foremoz Tourism untuk operator experience travel dengan pola event-driven: booking, participant handling, dan service orchestration.',
    features: [
      'Package/experience booking flow',
      'Guide-role workspace untuk operasi lapangan',
      'Participant and schedule checkpoints',
      'Operational reporting untuk quality control'
    ]
  },
  performance: {
    title: 'Foremoz Performance',
    subtitle: 'Entertainment Event Operations',
    description:
      'Foremoz Performance melayani creator-led entertainment events dengan kebutuhan lineup, production, fan engagement, dan merch loops.',
    features: [
      'Event lifecycle + lineup + production notes',
      'Fan participation and engagement flow',
      'Collaboration antara performer, host, dan operator',
      'Commercial loop per event untuk creator economy'
    ]
  }
};

export default function VerticalLandingPage() {
  const location = useLocation();
  const slug = location.pathname.replace('/', '').trim().toLowerCase();
  const vertical = VERTICALS[slug] || VERTICALS.active;

  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">{vertical.title}</div>
        <nav>
          <Link to="/web">General</Link>
          <Link to="/active">Active</Link>
          <Link to="/learning">Learning</Link>
          <Link to="/arts">Arts</Link>
          <Link to="/signin">Sign in</Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">foremoz.com/{slug}</p>
          <h1>{vertical.subtitle}</h1>
          <p>{vertical.description}</p>
          <div className="hero-actions">
            <Link className="btn" to="/signin">
              Open Workspace
            </Link>
            <Link className="btn ghost" to="/web">
              Back to Foremoz
            </Link>
          </div>
        </div>

        <aside className="hero-card">
          <h2>Feature Scope</h2>
          <ul>
            {vertical.features.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="cta">
        <p className="eyebrow">Next Step</p>
        <h2>Pilih flow kategori ini sebagai baseline operasionalmu</h2>
        <p>Foremoz akan jalan sebagai event-driven operating layer untuk actor, role, dan event lifecycle kategori ini.</p>
        <div className="hero-actions">
          <Link className="btn" to="/web/owner">
            Configure Tenant
          </Link>
          <Link className="btn ghost" to="/signup">
            Create Account
          </Link>
        </div>
      </section>
    </main>
  );
}
