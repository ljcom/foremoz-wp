import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiJson } from '../lib.js';
import { getVerticalConfig, getVerticalLabel, guessVerticalSlugByText } from '../industry-jargon.js';

function visualForVertical(slug) {
  const key = String(slug || '').toLowerCase();
  if (key === 'active') return 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80';
  if (key === 'learning') return 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=80';
  if (key === 'arts') return 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1400&q=80';
  if (key === 'performance') return 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=1400&q=80';
  if (key === 'tourism') return 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80';
  return 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1400&q=80';
}

export default function AccountPublicPage() {
  const { account } = useParams();
  const [accountInfo, setAccountInfo] = useState(null);
  const verticalSlug = String(accountInfo?.industry_slug || '').trim().toLowerCase()
    || guessVerticalSlugByText(account, 'active');
  const verticalLabel = getVerticalLabel(verticalSlug, 'Active');
  const vocabulary = getVerticalConfig(verticalSlug)?.vocabulary || {};
  const creatorLabel = vocabulary.creator || 'Coach';
  const participantLabel = vocabulary.participant || 'Member';
  const heroImage = String(accountInfo?.photo_url || '').trim() || visualForVertical(verticalSlug);
  const placeLabel = String(accountInfo?.city || '').trim();
  const displayName = String(accountInfo?.gym_name || '').trim() || String(account || '');

  useEffect(() => {
    let active = true;
    async function loadAccountInfo() {
      try {
        const result = await apiJson(`/v1/public/account/resolve?account_slug=${encodeURIComponent(String(account || ''))}`);
        if (!active) return;
        setAccountInfo(result.row || null);
      } catch {
        if (!active) return;
        setAccountInfo(null);
      }
    }
    loadAccountInfo();
    return () => {
      active = false;
    };
  }, [account]);

  const quickActions = [
    { icon: 'fa-solid fa-user-plus', title: 'Daftar member' },
    { icon: 'fa-solid fa-calendar-check', title: 'Booking event / class' },
    { icon: 'fa-solid fa-qrcode', title: 'Check-in cepat' },
    { icon: 'fa-solid fa-trophy', title: 'Lihat progress' }
  ];

  const promoPrograms = [
    {
      title: 'Starter 30 Hari',
      image: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=900&q=80'
    },
    {
      title: 'Duo Package',
      image: 'https://images.unsplash.com/photo-1571019613576-2b22c76fd955?auto=format&fit=crop&w=900&q=80'
    },
    {
      title: 'Weekend Blast',
      image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=900&q=80'
    },
    {
      title: 'PT Kickstart',
      image: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=80'
    }
  ];

  const coachProfiles = [
    {
      name: 'Coach Raka',
      role: 'Strength',
      schedule: 'Mon, Wed, Fri',
      photo: 'https://images.unsplash.com/photo-1550345332-09e3ac987658?auto=format&fit=crop&w=600&q=80'
    },
    {
      name: 'Coach Alia',
      role: 'Mobility',
      schedule: 'Tue, Thu, Sat',
      photo: 'https://images.unsplash.com/photo-1549476464-37392f717541?auto=format&fit=crop&w=600&q=80'
    },
    {
      name: 'Coach Fajar',
      role: 'Conditioning',
      schedule: 'Tue, Thu, Sun',
      photo: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80'
    }
  ];
  const conversionReasons = [
    {
      title: 'Masuk cepat ke ekosistem yang aktif',
      body: `${participantLabel} bisa langsung pilih event, class, atau package tanpa onboarding yang membingungkan.`
    },
    {
      title: 'Ada creator dan coach yang jelas',
      body: `${creatorLabel} tampil sebagai wajah utama brand, jadi trust dan expectation lebih kebentuk sejak awal.`
    },
    {
      title: 'Dari discover ke register lebih pendek',
      body: 'CTA utama diarahkan langsung ke member signup, event list, dan repeat visit lewat sign in.'
    }
  ];
  const conversionFlow = [
    'Temukan brand dan creator yang cocok',
    'Lihat event / class / program yang sedang aktif',
    'Sign up sebagai member',
    'Kembali untuk booking, check-in, dan progress'
  ];

  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">{displayName || account}</div>
        <nav>
          <Link to={`/a/${account}/events`}>Events</Link>
          <Link to={`/a/${account}/member/signup`}>Sign up</Link>
          <Link className="btn small" to={`/a/${account}/member/signin`}>
            Sign in
          </Link>
        </nav>
      </header>

      <section className="hero web-hero-visual">
        <div>
          <p className="eyebrow">{verticalLabel}</p>
          <h1>{`${creatorLabel} berpengalaman, komunitas aktif, progress nyata.`}</h1>
          <p>
            {placeLabel
              ? `${placeLabel} - Tempat ${participantLabel.toLowerCase()} berkembang lewat event dan class yang konsisten.`
              : `Tempat ${participantLabel.toLowerCase()} berkembang lewat event dan class yang konsisten.`}
          </p>
          <div className="hero-actions">
            <Link className="btn" to={`/a/${account}/member/signup`}>
              Join Sekarang
            </Link>
            <Link className="btn ghost" to={`/a/${account}/member/signin`}>
              Saya Sudah Member
            </Link>
          </div>
        </div>

        <div className="vertical-hero-image-wrap">
          <img className="vertical-hero-image" src={heroImage} alt={verticalLabel} />
          <span className="vertical-hero-badge">
            <i className="fa-solid fa-star" />
            {verticalLabel}
          </span>
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">Quick Actions</p>
        <div className="feature-grid web-icon-grid">
          {quickActions.map((item) => (
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
        <p className="eyebrow">Why Join</p>
        <h2 className="landing-title">{`${displayName || account} dibuat untuk conversion, bukan sekadar profile statis.`}</h2>
        <div className="feature-grid">
          {conversionReasons.map((item) => (
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
        <p className="eyebrow">Program</p>
        <h2 className="landing-title">Pilih program favoritmu</h2>
        <div className="case-grid web-visual-grid">
          {promoPrograms.map((program) => (
            <article className="feature-card case-card web-visual-card" key={program.title}>
              <img className="web-visual-image" src={program.image} alt={program.title} />
              <div className="web-visual-body">
                <h3>{program.title}</h3>
                <div className="hero-actions">
                  <Link className="btn small" to={`/a/${account}/member/signup`}>
                    Ambil Program
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">How To Start</p>
        <div className="card">
          <div className="entity-list">
            {conversionFlow.map((item, index) => (
              <div className="entity-row" key={`${index + 1}-${item}`}>
                <div>
                  <strong>{`0${index + 1}`}</strong>
                  <p>{item}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="hero-actions" style={{ marginTop: '1rem' }}>
            <Link className="btn" to={`/a/${account}/events`}>
              Explore Events
            </Link>
            <Link className="btn ghost" to={`/a/${account}/member/signup`}>
              Start Membership
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">Coach</p>
        <h2 className="landing-title">Coach pilihan untuk kamu</h2>
        <div className="coach-grid">
          {coachProfiles.map((coach) => (
            <article className="coach-card" key={coach.name}>
              <img src={coach.photo} alt={coach.name} className="coach-photo" />
              <div>
                <h3>{coach.name}</h3>
                <p className="coach-role">{coach.role}</p>
                <p className="coach-schedule">{coach.schedule}</p>
              </div>
              <Link className="btn small" to={`/a/${account}/member/signup`}>
                Join {coach.name}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="cta">
        <p className="eyebrow">Start Today</p>
        <h2>Ajak teman dan mulai bareng hari ini</h2>
        <div className="hero-actions">
          <Link className="btn" to={`/a/${account}/member/signup`}>
            Daftar Member
          </Link>
          <Link className="btn ghost" to={`/a/${account}/member/signin`}>
            Sign In
          </Link>
        </div>
      </section>
    </main>
  );
}
