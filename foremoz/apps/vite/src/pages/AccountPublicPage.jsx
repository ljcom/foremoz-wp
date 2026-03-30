import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { useI18n } from '../i18n.js';
import { apiJson } from '../lib.js';
import { getVerticalConfig, getVerticalLabel, guessVerticalSlugByText } from '../industry-jargon.js';

function visualForVertical(slug) {
  const key = String(slug || '').toLowerCase();
  if (key === 'fitness') return 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80';
  if (key === 'sport') return 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1400&q=80';
  if (key === 'learning') return 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=80';
  if (key === 'arts') return 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1400&q=80';
  if (key === 'performance') return 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=1400&q=80';
  if (key === 'tourism') return 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80';
  return 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1400&q=80';
}

export default function AccountPublicPage() {
  const { language } = useI18n();
  const copy = language === 'en'
    ? {
        events: 'Events',
        signUp: 'Sign up',
        signIn: 'Sign in',
        heroTitle: '{creator} with proven experience, an active community, and visible progress.',
        heroDescriptionWithPlace: '{place} - A place where {participant} grow through consistent events and programs.',
        heroDescriptionNoPlace: 'A place where {participant} grow through consistent events and programs.',
        joinNow: 'Join Now',
        alreadyMember: 'I Am Already a Member',
        quickActions: 'Quick Actions',
        whyJoin: 'Why Join',
        whyJoinTitle: '{name} is built for conversion, not just a static profile.',
        program: 'Program',
        programTitle: 'Pick your favorite program',
        takeProgram: 'Choose Program',
        howToStart: 'How To Start',
        exploreEvents: 'Explore Events',
        startMembership: 'Start Membership',
        coach: 'Coach',
        coachTitle: 'Coaches selected for you',
        joinCoach: 'Join {coach}',
        startToday: 'Start Today',
        startTodayTitle: 'Bring your friends and start together today',
        registerMember: 'Register Member',
        quickJoinMember: 'Become a member',
        quickBook: 'Book event / program',
        quickCheckin: 'Fast check-in',
        quickProgress: 'See progress',
        reason1Title: 'Get into an active ecosystem fast',
        reason1Body: '{participant} can immediately pick an event, program, or package without confusing onboarding.',
        reason2Title: 'Clear creators and coaches',
        reason2Body: '{creator} show up as the face of the brand, so trust and expectations form earlier.',
        reason3Title: 'Shorter path from discovery to registration',
        reason3Body: 'Primary CTAs point directly to member signup, event listing, and repeat visits through sign in.',
        flow1: 'Find a brand and creator that fit you',
        flow2: 'See active events and programs',
        flow3: 'Sign up as a member',
        flow4: 'Come back for booking, check-in, and progress'
      }
    : {
        events: 'Events',
        signUp: 'Sign up',
        signIn: 'Sign in',
        heroTitle: '{creator} berpengalaman, komunitas aktif, progress nyata.',
        heroDescriptionWithPlace: '{place} - Tempat {participant} berkembang lewat event dan program yang konsisten.',
        heroDescriptionNoPlace: 'Tempat {participant} berkembang lewat event dan program yang konsisten.',
        joinNow: 'Join Sekarang',
        alreadyMember: 'Saya Sudah Member',
        quickActions: 'Quick Actions',
        whyJoin: 'Why Join',
        whyJoinTitle: '{name} dibuat untuk conversion, bukan sekadar profile statis.',
        program: 'Program',
        programTitle: 'Pilih program favoritmu',
        takeProgram: 'Ambil Program',
        howToStart: 'How To Start',
        exploreEvents: 'Explore Events',
        startMembership: 'Start Membership',
        coach: 'Coach',
        coachTitle: 'Coach pilihan untuk kamu',
        joinCoach: 'Join {coach}',
        startToday: 'Start Today',
        startTodayTitle: 'Ajak teman dan mulai bareng hari ini',
        registerMember: 'Daftar Member',
        quickJoinMember: 'Daftar member',
        quickBook: 'Booking event / program',
        quickCheckin: 'Check-in cepat',
        quickProgress: 'Lihat progress',
        reason1Title: 'Masuk cepat ke ekosistem yang aktif',
        reason1Body: '{participant} bisa langsung pilih event, program, atau package tanpa onboarding yang membingungkan.',
        reason2Title: 'Ada creator dan coach yang jelas',
        reason2Body: '{creator} tampil sebagai wajah utama brand, jadi trust dan expectation lebih kebentuk sejak awal.',
        reason3Title: 'Dari discover ke register lebih pendek',
        reason3Body: 'CTA utama diarahkan langsung ke member signup, event list, dan repeat visit lewat sign in.',
        flow1: 'Temukan brand dan creator yang cocok',
        flow2: 'Lihat event / program yang sedang aktif',
        flow3: 'Sign up sebagai member',
        flow4: 'Kembali untuk booking, check-in, dan progress'
      };
  const { account } = useParams();
  const [accountInfo, setAccountInfo] = useState(null);
  const verticalSlug = String(accountInfo?.industry_slug || '').trim().toLowerCase()
    || guessVerticalSlugByText(account, 'fitness');
  const verticalLabel = getVerticalLabel(verticalSlug, 'Fitness');
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
    { icon: 'fa-solid fa-user-plus', title: copy.quickJoinMember },
    { icon: 'fa-solid fa-calendar-check', title: copy.quickBook },
    { icon: 'fa-solid fa-qrcode', title: copy.quickCheckin },
    { icon: 'fa-solid fa-trophy', title: copy.quickProgress }
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
      title: copy.reason1Title,
      body: copy.reason1Body.replace('{participant}', participantLabel.toLowerCase())
    },
    {
      title: copy.reason2Title,
      body: copy.reason2Body.replace('{creator}', creatorLabel)
    },
    {
      title: copy.reason3Title,
      body: copy.reason3Body
    }
  ];
  const conversionFlow = [
    copy.flow1,
    copy.flow2,
    copy.flow3,
    copy.flow4
  ];

  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">{displayName || account}</div>
        <nav>
          <Link to={`/a/${account}/events`}>{copy.events}</Link>
          <Link to={`/a/${account}/member/signup`}>{copy.signUp}</Link>
          <LanguageSwitcher compact />
          <Link className="btn small" to={`/a/${account}/member/signin`}>
            {copy.signIn}
          </Link>
        </nav>
      </header>

      <section className="hero web-hero-visual">
        <div>
          <p className="eyebrow">{verticalLabel}</p>
          <h1>{copy.heroTitle.replace('{creator}', creatorLabel)}</h1>
          <p>
            {placeLabel
              ? copy.heroDescriptionWithPlace.replace('{place}', placeLabel).replace('{participant}', participantLabel.toLowerCase())
              : copy.heroDescriptionNoPlace.replace('{participant}', participantLabel.toLowerCase())}
          </p>
          <div className="hero-actions">
            <Link className="btn" to={`/a/${account}/member/signup`}>
              {copy.joinNow}
            </Link>
            <Link className="btn ghost" to={`/a/${account}/member/signin`}>
              {copy.alreadyMember}
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
        <p className="eyebrow">{copy.quickActions}</p>
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
        <p className="eyebrow">{copy.whyJoin}</p>
        <h2 className="landing-title">{copy.whyJoinTitle.replace('{name}', displayName || account)}</h2>
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
        <p className="eyebrow">{copy.program}</p>
        <h2 className="landing-title">{copy.programTitle}</h2>
        <div className="case-grid web-visual-grid">
          {promoPrograms.map((program) => (
            <article className="feature-card case-card web-visual-card" key={program.title}>
              <img className="web-visual-image" src={program.image} alt={program.title} />
              <div className="web-visual-body">
                <h3>{program.title}</h3>
                <div className="hero-actions">
                  <Link className="btn small" to={`/a/${account}/member/signup`}>
                    {copy.takeProgram}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">{copy.howToStart}</p>
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
              {copy.exploreEvents}
            </Link>
            <Link className="btn ghost" to={`/a/${account}/member/signup`}>
              {copy.startMembership}
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">{copy.coach}</p>
        <h2 className="landing-title">{copy.coachTitle}</h2>
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
                {copy.joinCoach.replace('{coach}', coach.name)}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="cta">
        <p className="eyebrow">{copy.startToday}</p>
        <h2>{copy.startTodayTitle}</h2>
        <div className="hero-actions">
          <Link className="btn" to={`/a/${account}/member/signup`}>
            {copy.registerMember}
          </Link>
          <Link className="btn ghost" to={`/a/${account}/member/signin`}>
            {copy.signIn}
          </Link>
        </div>
      </section>
    </main>
  );
}
