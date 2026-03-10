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
    ],
    pricing: [
      {
        name: 'Free',
        price: 'Rp0 / bulan',
        note: 'Untuk creator yang baru mulai',
        items: ['Publish event & halaman publik', 'Booking + check-in baseline']
      },
      {
        name: 'Starter',
        price: 'Rp149.000 - Rp499.000 / bulan',
        note: 'Creator mode berbayar',
        items: ['Payment recording', 'Passport linkage participant history']
      },
      {
        name: 'Growth',
        price: 'Rp990.000 - Rp1.990.000 / bulan',
        note: 'Tim dan kolaborasi host',
        items: ['Multiple event orchestration', 'Revenue split baseline']
      },
      {
        name: 'Institution',
        price: 'Mulai Rp3.490.000 / bulan',
        note: 'Multi-branch operations',
        items: ['Membership + CRM + staff controls', 'Owner setup + governance controls']
      }
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
    ],
    pricing: [
      {
        name: 'Free',
        price: 'Rp0 / bulan',
        note: 'Untuk educator/mentor tahap awal',
        items: ['Cohort & session publishing', 'Enrollment + attendance baseline']
      },
      {
        name: 'Starter',
        price: 'Rp129.000 - Rp399.000 / bulan',
        note: 'Operasi kelas berulang',
        items: ['Progress checkpoint dasar', 'Participant workspace baseline']
      },
      {
        name: 'Growth',
        price: 'Rp790.000 - Rp1.690.000 / bulan',
        note: 'Kolaborasi mentor dan batch multi program',
        items: ['Multi-program orchestration', 'Analytics & conversion tracking']
      },
      {
        name: 'Institution',
        price: 'Mulai Rp2.990.000 / bulan',
        note: 'Operasi lembaga multi tim',
        items: ['Staff/admin control', 'Governance & operational policy']
      }
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
    ],
    pricing: [
      {
        name: 'Free',
        price: 'Rp0 / bulan',
        note: 'Untuk creator/performer individu',
        items: ['Publish session/showcase', 'Booking + participant check-in']
      },
      {
        name: 'Starter',
        price: 'Rp149.000 - Rp499.000 / bulan',
        note: 'Gig operation berulang',
        items: ['Run-of-show baseline', 'Basic payment recording']
      },
      {
        name: 'Growth',
        price: 'Rp990.000 - Rp1.990.000 / bulan',
        note: 'Kolaborasi komunitas kreatif',
        items: ['Collaborator roles', 'Revenue split & sponsor baseline']
      },
      {
        name: 'Institution',
        price: 'Mulai Rp3.490.000 / bulan',
        note: 'Organizer multi venue',
        items: ['Staff/admin controls', 'Governance controls & reporting']
      }
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
          <Link to="/web">Home</Link>
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

      {vertical.pricing ? (
        <section className="landing-section">
          <p className="eyebrow">Pricing</p>
          <h2 className="landing-title">Pilih paket sesuai kematangan operasional</h2>
          <div className="pricing-grid">
            {vertical.pricing.map((plan) => (
              <article key={plan.name} className="pricing-card">
                <h3>{plan.name}</h3>
                <p className="pricing-price">{plan.price}</p>
                <p className="pricing-note">{plan.note}</p>
                <ul>
                  {plan.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : null}

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
