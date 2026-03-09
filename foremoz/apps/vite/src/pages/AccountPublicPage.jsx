import { Link, useParams } from 'react-router-dom';

export default function AccountPublicPage() {
  const { account } = useParams();
  const promoPrograms = [
    {
      title: 'Starter Transformation 30 Hari',
      body: 'Kombinasi class + gym access + check-in challenge untuk bangun konsistensi latihan dari minggu pertama.'
    },
    {
      title: 'Duo Strong Package',
      body: 'Datang berdua lebih hemat. Cocok untuk pasangan, sahabat workout, atau rekan kantor yang mau mulai bareng.'
    },
    {
      title: 'Weekend Fat Burn Blast',
      body: 'Program high-energy Sabtu-Minggu untuk yang sibuk weekday tapi tetap ingin progress body composition.'
    },
    {
      title: 'PT Kickstart Session',
      body: 'Sesi PT awal untuk assessment, setup goal, dan personal roadmap latihan sesuai level kebugaran kamu.'
    }
  ];
  const coachProfiles = [
    {
      name: 'Coach Raka',
      role: 'Strength & Conditioning',
      focus: 'Muscle gain, fat loss, progressive overload.',
      schedule: 'Mon, Wed, Fri - 06:30 & 18:30',
      photo:
        'https://images.unsplash.com/photo-1550345332-09e3ac987658?auto=format&fit=crop&w=600&q=80'
    },
    {
      name: 'Coach Alia',
      role: 'Mobility & Functional Training',
      focus: 'Mobility flow, posture correction, core stability.',
      schedule: 'Tue, Thu, Sat - 07:00 & 17:00',
      photo:
        'https://images.unsplash.com/photo-1549476464-37392f717541?auto=format&fit=crop&w=600&q=80'
    },
    {
      name: 'Coach Fajar',
      role: 'Combat Conditioning',
      focus: 'Boxing drills, cardio endurance, agility work.',
      schedule: 'Tue, Thu - 19:00, Sun - 09:00',
      photo:
        'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80'
    }
  ];

  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">{account}.fitness.foremoz.com</div>
        <nav>
          <Link to={`/a/${account}/member/signup`}>Member signup</Link>
          <Link className="btn small" to={`/a/${account}/member/signin`}>
            Member sign in
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Public Fitness Landing</p>
          <h1>Level Up Your Fitness Journey at {account}.</h1>
          <p>
            Tempat latihan dengan program terstruktur, komunitas suportif, dan coach berpengalaman
            untuk bantu kamu capai goal lebih cepat dan lebih konsisten.
          </p>
          <div className="hero-actions">
            <Link className="btn" to={`/a/${account}/member/signup`}>
              Join as New Member
            </Link>
            <Link className="btn ghost" to={`/a/${account}/member/signin`}>
              Member Sign In
            </Link>
          </div>
          <p className="local-note">Mulai dari paket trial, lanjut ke program sesuai goal kamu.</p>
        </div>

        <aside className="public-hero-image">
          <div className="public-hero-overlay">
            <p className="eyebrow">Member Favorite</p>
            <h2>Train Smart, Feel Strong.</h2>
            <p>Class energy tinggi, progress terukur, dan schedule fleksibel untuk lifestyle aktif.</p>
          </div>
        </aside>
      </section>

      <section className="landing-section">
        <p className="eyebrow">Program Promo</p>
        <h2 className="landing-title">Promo yang Bisa Kamu Ambil Minggu Ini</h2>
        <div className="feature-grid">
          {promoPrograms.map((program) => (
            <article className="feature-card" key={program.title}>
              <h3>{program.title}</h3>
              <p>{program.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cta">
        <p className="eyebrow">CTA</p>
        <h2>Undang Teman dan Join Bareng Sekarang</h2>
        <p>
          Ajak rekan latihan kamu untuk daftar, pilih program promo, lalu mulai progres bersama di {account} Fitness Studio.
        </p>
        <div className="hero-actions">
          <Link className="btn" to={`/a/${account}/member/signup`}>
            Undang & Join Member
          </Link>
          <Link className="btn ghost" to={`/a/${account}/member/signin`}>
            Saya Sudah Member
          </Link>
        </div>
      </section>

      <section className="landing-section">
        <aside className="hero-card">
          <h2>Public Actions</h2>
          <ul>
            <li>registrasi member baru</li>
            <li>pilih paket membership dan promo</li>
            <li>akses booking class dan PT session</li>
          </ul>
        </aside>
      </section>

      <section className="landing-section">
        <p className="eyebrow">Coach & PT Profile</p>
        <h2 className="landing-title">Kenalan dengan Coach Kami</h2>
        <div className="coach-grid">
          {coachProfiles.map((coach) => (
            <article className="coach-card" key={coach.name}>
              <img src={coach.photo} alt={coach.name} className="coach-photo" />
              <div>
                <h3>{coach.name}</h3>
                <p className="coach-role">{coach.role}</p>
                <p>{coach.focus}</p>
                <p className="coach-schedule">{coach.schedule}</p>
              </div>
              <Link className="btn small" to={`/a/${account}/member/signup`}>
                Join with {coach.name.split(' ')[1]}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <footer className="public-footer">
        <p>Powered by foremoz.com</p>
        <Link to={`/a/${account}/signin`}>Login as tenant</Link>
      </footer>
    </main>
  );
}
