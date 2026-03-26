import { Link, useLocation } from 'react-router-dom';
import { getVerticalConfig, getVerticalLabel, listVerticalConfigs } from '../industry-jargon.js';

const PRICING_BY_VERTICAL = {
  active: [
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
      items: ['Event + class + produk', 'Check-in + check-out']
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
  if (key === 'active') {
    return {
      icon: 'fa-solid fa-dumbbell',
      image: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=1400&q=80'
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

export default function VerticalLandingPage() {
  const location = useLocation();
  const slug = location.pathname.replace('/', '').trim().toLowerCase();
  const config = getVerticalConfig(slug) || getVerticalConfig('active');
  const activeSlug = getVerticalConfig(slug) ? slug : 'active';
  const label = getVerticalLabel(activeSlug, 'Active');
  const navVerticals = listVerticalConfigs();
  const pricing = PRICING_BY_VERTICAL[activeSlug] || PRICING_BY_VERTICAL.active;
  const creator = config?.vocabulary?.creator || 'Creator';
  const participant = config?.vocabulary?.participant || 'Member';
  const experience = config?.vocabulary?.experience || 'Event';
  const visual = visualForVertical(activeSlug);

  const quickPoints = [
    { icon: 'fa-solid fa-bolt', title: `${experience} lebih cepat publish` },
    { icon: 'fa-solid fa-users', title: `${participant} lebih mudah join` },
    { icon: 'fa-solid fa-clipboard-check', title: 'Check-in lebih rapi' },
    { icon: 'fa-solid fa-chart-line', title: 'Progress lebih terlihat' }
  ];
  const whyCards = [
    {
      title: `${creator} tidak lagi kerja manual`,
      body: `Publish ${experience.toLowerCase()}, atur jadwal, dan buka registration tanpa lompat antar tool.`
    },
    {
      title: `${participant} masuk ke flow yang jelas`,
      body: `Dari discover, daftar, bayar, sampai hadir di hari H semuanya lebih konsisten.`
    },
    {
      title: 'Tim operasional punya audit trail',
      body: 'Payment, attendance, booking, dan outcome bisa direview tanpa bongkar chat atau sheet.'
    }
  ];
  const howFlow = [
    `${experience} dipublish dengan identitas brand`,
    'Audience register dan masuk ke payment flow',
    'Ops menjalankan attendance dan review transaksi',
    'Riwayat creator dan participant terbentuk di passport'
  ];

  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">{`Foremoz ${label}`}</div>
        <nav>
          <Link to="/newevent">Home</Link>
          <Link to="/events">Events</Link>
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
          <h1>{`${label} untuk ${creator} dan ${participant}`}</h1>
          <p>Kelola event dan class lebih mudah, biar kamu fokus ke pengalaman terbaik untuk komunitas.</p>
          <div className="hero-actions">
            <Link className="btn" to="/events">Lihat Events</Link>
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
        <h2>{`Mulai ${label} kamu hari ini`}</h2>
        <div className="hero-actions">
          <Link className="btn" to="/events">Explore Events</Link>
          <Link className="btn ghost" to="/signin">Sign In</Link>
        </div>
      </section>
    </main>
  );
}
