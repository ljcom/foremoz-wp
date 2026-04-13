import { Link, useLocation } from 'react-router-dom';
import { getVerticalConfig, getVerticalLabel, listVerticalConfigs } from '../industry-jargon.js';
import { getPublicHomePath, isPassportEventsEnabled } from '../stage.js';

const PRICING_BY_VERTICAL = {
  fitness: [
    {
      name: 'Free',
      price: 'Rp0 / bulan',
      note: 'Mulai sendiri',
      items: ['1 event', 'Check-in cepat']
    },
    {
      name: 'Starter',
      price: 'Rp149.000 - Rp499.000 / bulan',
      note: 'Untuk operasi harian',
      items: ['Event + program + produk', 'Check-in + check-out']
    },
    {
      name: 'Growth',
      price: 'Rp990.000 - Rp1.990.000 / bulan',
      note: 'Untuk tim berkembang',
      items: ['Tim multi role', 'Laporan performa']
    },
    {
      name: 'Institution',
      price: 'Mulai Rp3.490.000 / bulan',
      note: 'Untuk skala besar',
      items: ['Multi lokasi', 'Custom kebutuhan bisnis']
    }
  ],
  sport: [
    {
      name: 'Free',
      price: 'Rp0 / bulan',
      note: 'Mulai squad kecil',
      items: ['1 training calendar', 'Attendance dasar']
    },
    {
      name: 'Starter',
      price: 'Rp149.000 - Rp499.000 / bulan',
      note: 'Untuk latihan rutin',
      items: ['Training + camp + tryout', 'Roster dan check-in']
    },
    {
      name: 'Growth',
      price: 'Rp990.000 - Rp1.990.000 / bulan',
      note: 'Untuk klub berkembang',
      items: ['Tim multi role', 'Tracking performa atlet']
    },
    {
      name: 'Institution',
      price: 'Mulai Rp3.490.000 / bulan',
      note: 'Untuk akademi / klub besar',
      items: ['Multi lokasi', 'Operasional tim lebih rapi']
    }
  ],
  learning: [
    {
      name: 'Free',
      price: 'Rp0 / bulan',
      note: 'Mentor mulai publish kelas',
      items: ['Publish workshop', 'Attendance dasar']
    },
    {
      name: 'Starter',
      price: 'Rp129.000 - Rp399.000 / bulan',
      note: 'Untuk batch rutin',
      items: ['Kelas berulang', 'Progress peserta']
    },
    {
      name: 'Growth',
      price: 'Rp790.000 - Rp1.690.000 / bulan',
      note: 'Untuk banyak program',
      items: ['Multi program', 'Insight konversi']
    },
    {
      name: 'Institution',
      price: 'Mulai Rp2.990.000 / bulan',
      note: 'Untuk sekolah/lembaga',
      items: ['Tim admin', 'Kontrol operasional']
    }
  ],
  arts: [
    {
      name: 'Free',
      price: 'Rp0 / bulan',
      note: 'Untuk creator individu',
      items: ['Publish showcase', 'Booking + check-in']
    },
    {
      name: 'Starter',
      price: 'Rp149.000 - Rp499.000 / bulan',
      note: 'Untuk gig rutin',
      items: ['Run show lebih rapi', 'Pembayaran lebih mudah']
    },
    {
      name: 'Growth',
      price: 'Rp990.000 - Rp1.990.000 / bulan',
      note: 'Untuk kolaborasi komunitas',
      items: ['Kolaborator tim', 'Rangkuman pendapatan']
    },
    {
      name: 'Institution',
      price: 'Mulai Rp3.490.000 / bulan',
      note: 'Untuk penyelenggara venue',
      items: ['Multi venue', 'Kontrol akses tim']
    }
  ],
  performance: [
    {
      name: 'Free',
      price: 'Rp0 / bulan',
      note: 'Mulai show pertama',
      items: ['Publish show', 'Daftar peserta']
    },
    {
      name: 'Starter',
      price: 'Rp149.000 - Rp499.000 / bulan',
      note: 'Show mingguan',
      items: ['Manajemen jadwal', 'Tim operasional dasar']
    },
    {
      name: 'Growth',
      price: 'Rp990.000 - Rp1.990.000 / bulan',
      note: 'Show skala komunitas',
      items: ['Tim multi role', 'Insight audience']
    },
    {
      name: 'Institution',
      price: 'Mulai Rp3.490.000 / bulan',
      note: 'Event organizer',
      items: ['Multi venue', 'Kontrol lebih lengkap']
    }
  ],
  tourism: [
    {
      name: 'Free',
      price: 'Rp0 / bulan',
      note: 'Trip kecil',
      items: ['Publish trip', 'Registrasi peserta']
    },
    {
      name: 'Starter',
      price: 'Rp149.000 - Rp499.000 / bulan',
      note: 'Trip rutin',
      items: ['Jadwal itinerary', 'Check-in peserta']
    },
    {
      name: 'Growth',
      price: 'Rp990.000 - Rp1.990.000 / bulan',
      note: 'Operator travel berkembang',
      items: ['Tim guide + CS', 'Laporan trip']
    },
    {
      name: 'Institution',
      price: 'Mulai Rp3.490.000 / bulan',
      note: 'Operator multi destinasi',
      items: ['Multi lokasi', 'Custom kebutuhan']
    }
  ]
};

function visualForVertical(slug) {
  const key = String(slug || '').toLowerCase();
  if (key === 'fitness') {
    return {
      icon: 'fa-solid fa-dumbbell',
      image: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=1400&q=80'
    };
  }
  if (key === 'sport') {
    return {
      icon: 'fa-solid fa-futbol',
      image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1400&q=80'
    };
  }
  if (key === 'learning') {
    return {
      icon: 'fa-solid fa-book-open-reader',
      image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=80'
    };
  }
  if (key === 'performance') {
    return {
      icon: 'fa-solid fa-microphone-lines',
      image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=1400&q=80'
    };
  }
  if (key === 'arts') {
    return {
      icon: 'fa-solid fa-palette',
      image: 'https://images.unsplash.com/photo-1459908676235-d5f02a50184b?auto=format&fit=crop&w=1400&q=80'
    };
  }
  if (key === 'tourism') {
    return {
      icon: 'fa-solid fa-route',
      image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80'
    };
  }
  return {
    icon: 'fa-solid fa-calendar-star',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80'
  };
}

function operatorAudienceForVertical(slug, creator) {
  const key = String(slug || '').toLowerCase();
  if (key === 'fitness') return 'gym dan coach';
  if (key === 'sport') return 'klub dan coach';
  if (key === 'learning') return 'lembaga dan instructor';
  if (key === 'performance') return 'venue dan performer';
  if (key === 'arts') return 'galeri dan artist';
  if (key === 'tourism') return 'operator dan guide';
  return `tim operasional dan ${String(creator || 'creator').toLowerCase()}`;
}

export default function VerticalLandingPage() {
  const eventsEnabled = isPassportEventsEnabled();
  const publicHome = getPublicHomePath();
  const location = useLocation();
  const slug = location.pathname.replace('/', '').trim().toLowerCase();
  const config = getVerticalConfig(slug) || getVerticalConfig('fitness');
  const activeSlug = getVerticalConfig(slug) ? slug : 'fitness';
  const label = getVerticalLabel(activeSlug, 'Fitness');
  const navVerticals = listVerticalConfigs();
  const pricing = PRICING_BY_VERTICAL[activeSlug] || PRICING_BY_VERTICAL.fitness;
  const creator = config?.vocabulary?.creator || 'Creator';
  const experience = config?.vocabulary?.experience || 'Event';
  const visual = visualForVertical(activeSlug);
  const creatorLabelLower = String(creator || 'creator').toLowerCase();
  const experienceLabelLower = String(experience || 'event').toLowerCase();
  const operatorAudience = operatorAudienceForVertical(activeSlug, creator);
  const heroTitle = `Tools operasional untuk ${operatorAudience}`;
  const heroDescription = `Kelola ${experienceLabelLower}, offering, jadwal, check-in, dan transaksi dari satu workspace yang dipakai owner, admin, dan ${creatorLabelLower}.`;
  const quickPoints = [
    { icon: visual.icon, title: `${label} ops lebih rapi` },
    { icon: 'fa-solid fa-user-group', title: `${creator} punya alur kerja yang jelas` },
    { icon: 'fa-solid fa-clipboard-check', title: 'Check-in, booking, dan attendance lebih cepat' },
    { icon: 'fa-solid fa-chart-line', title: 'Transaksi dan performa lebih terkontrol' }
  ];
  const whyCards = [
    {
      title: `${label} tidak lagi kerja manual`,
      body: `Kelola ${experienceLabelLower}, offering, jadwal, dan transaksi tanpa pecah di chat, sheet, dan form.`
    },
    {
      title: `${creator} punya workspace operasional yang jelas`,
      body: 'Jadwal, daftar peserta, attendance, dan catatan pelaksanaan bisa dilihat dari panel yang sama.'
    },
    {
      title: 'Owner dan tim ops punya audit trail',
      body: 'Booking, attendance, payment, dan aktivitas tim bisa direview tanpa bongkar data satu per satu.'
    }
  ];
  const howFlow = [
    `Setup akun, cabang, staff, dan ${creatorLabelLower}`,
    `Atur ${experienceLabelLower}, jadwal, offering, dan kapasitas`,
    'Jalankan attendance, booking, dan review transaksi',
    'Pantau performa operasional tim dan unit bisnis'
  ];
  const ctaTitle = `Mulai workspace ${label.toLowerCase()} kamu hari ini`;

  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">{`Foremoz ${label}`}</div>
        <nav>
          <Link to="/host">Home</Link>
          {eventsEnabled ? <Link to="/events">Events</Link> : null}
          {navVerticals.map((item) => (
            <Link key={item.slug} to={`/${item.slug}`}>
              {item.label}
            </Link>
          ))}
          <Link className="btn small" to="/signin">Sign In</Link>
        </nav>
      </header>

      <section className="hero web-hero-visual">
        <div>
          <p className="eyebrow">{label}</p>
          <h1>{heroTitle}</h1>
          <p>{heroDescription}</p>
          <div className="hero-actions">
            {eventsEnabled ? <Link className="btn" to={publicHome}>Lihat Events</Link> : null}
            <Link className="btn ghost" to={`/signup?industry=${activeSlug}`}>Mulai Sekarang</Link>
          </div>
        </div>

        <div className="vertical-hero-image-wrap">
          <img className="vertical-hero-image" src={visual.image} alt={label} />
          <span className="vertical-hero-badge">
            <i className={visual.icon} />
            {label}
          </span>
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">Highlights</p>
        <div className="feature-grid web-icon-grid">
          {quickPoints.map((item) => (
            <article className="feature-card" key={item.title}>
              <div className="feature-head">
                <span className="feature-icon"><i className={item.icon} /></span>
                <h3>{item.title}</h3>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">Why {label}</p>
        <h2 className="landing-title">{`${label} butuh flow yang terasa spesifik, bukan template umum.`}</h2>
        <div className="feature-grid">
          {whyCards.map((item) => (
            <article className="feature-card" key={item.title}>
              <div className="feature-head">
                <h3>{item.title}</h3>
              </div>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">How It Runs</p>
        <div className="card">
          <div className="entity-list">
            {howFlow.map((item, index) => (
              <div className="entity-row" key={`${index + 1}-${item}`}>
                <div>
                  <strong>{`0${index + 1}`}</strong>
                  <p>{item}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">Pricing</p>
        <h2 className="landing-title">Pilih paket sesuai kebutuhan</h2>
        <div className="pricing-grid">
          {pricing.map((plan) => (
            <article key={plan.name} className="pricing-card">
              <h3>{plan.name}</h3>
              <p className="pricing-price">{plan.price}</p>
              <p className="pricing-note">{plan.note}</p>
              <p className="sub">{plan.name === 'Free' ? 'Untuk validasi demand' : plan.name === 'Starter' ? 'Untuk operasi aktif harian' : plan.name === 'Growth' ? 'Untuk tim yang mulai kompleks' : 'Untuk organisasi multi lokasi'}</p>
              <div className="passport-badge-list">
                {plan.items.map((item) => (
                  <span key={item} className="passport-chip">{item}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cta">
        <p className="eyebrow">Start</p>
        <h2>{ctaTitle}</h2>
        <div className="hero-actions">
          {eventsEnabled ? <Link className="btn" to={publicHome}>Explore Events</Link> : null}
          <Link className="btn ghost" to="/signin">Sign In</Link>
        </div>
      </section>
    </main>
  );
}
