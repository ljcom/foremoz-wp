import { Link, useLocation } from 'react-router-dom';
import { describeVerticalByJargon, getVerticalConfig, getVerticalLabel, listVerticalConfigs } from '../industry-jargon.js';

const PRICING_BY_VERTICAL = {
  active: [
    {
      name: 'Free',
      price: 'Rp0 / bulan',
      note: 'Single operator',
      items: ['One-time event', 'Check-in + check-out']
    },
    {
      name: 'Starter',
      price: 'Rp149.000 - Rp499.000 / bulan',
      note: 'Operational starter',
      items: ['Event + class + CS + product', 'Check-in + check-out']
    },
    {
      name: 'Growth',
      price: 'Rp990.000 - Rp1.990.000 / bulan',
      note: 'Team mode',
      items: ['Multi coach/team operation', 'Sales workspace enabled']
    },
    {
      name: 'Institution',
      price: 'Mulai Rp3.490.000 / bulan',
      note: 'Scale operations',
      items: ['Multi location (multi branch)', 'Enterprise: customization']
    }
  ],
  learning: [
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
  ],
  arts: [
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
};

export default function VerticalLandingPage() {
  const location = useLocation();
  const slug = location.pathname.replace('/', '').trim().toLowerCase();
  const config = getVerticalConfig(slug) || getVerticalConfig('active');
  const activeSlug = getVerticalConfig(slug) ? slug : 'active';
  const label = getVerticalLabel(activeSlug, 'Active');
  const navVerticals = listVerticalConfigs();
  const pricing = PRICING_BY_VERTICAL[activeSlug] || null;
  const creator = config?.vocabulary?.creator || 'Creator';
  const participant = config?.vocabulary?.participant || 'Participant';
  const experience = config?.vocabulary?.experience || 'Experience';
  const place = config?.vocabulary?.place || 'Place';
  const features = [
    `Vocabulary: ${creator} -> ${experience} -> ${participant} di ${place}`,
    `Duration model: ${config?.duration_model || '-'}`,
    `Participation pattern: ${config?.participation_pattern || '-'}`,
    `Monetization pattern: ${config?.monetization_pattern || '-'}`,
    `Experience types: ${(config?.experience_types || []).join(', ') || '-'}`,
    `Offering examples: ${(config?.offering_examples || []).join(', ') || '-'}`
  ];

  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">{`Foremoz ${label}`}</div>
        <nav>
          <Link to="/web">Home</Link>
          {navVerticals.map((item) => (
            <Link key={item.slug} to={`/${item.slug}`}>
              {item.label}
            </Link>
          ))}
          <Link to="/signin">Sign in</Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">{`foremoz.com/${activeSlug}`}</p>
          <h1>{`${label} Experience Operations`}</h1>
          <p>{describeVerticalByJargon(activeSlug)}</p>
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
            {features.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </section>

      {pricing ? (
        <section className="landing-section">
          <p className="eyebrow">Pricing</p>
          <h2 className="landing-title">Pilih paket sesuai kematangan operasional</h2>
          <div className="pricing-grid">
            {pricing.map((plan) => (
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
        <p>Foremoz jalan di core engine yang sama, vertical hanya configuration + vocabulary.</p>
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
