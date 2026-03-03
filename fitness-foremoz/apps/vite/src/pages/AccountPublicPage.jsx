import { Link, useParams } from 'react-router-dom';

export default function AccountPublicPage() {
  const { account } = useParams();

  return (
    <main className="landing">
      <header className="topbar">
        <div className="brand">{account}.fitness.foremoz.com</div>
        <nav>
          <Link to={`/a/${account}/member/signup`}>Member signup</Link>
          <Link className="btn small" to={`/a/${account}/member/signin`}>
            Member sign in
          </Link>
          <Link className="btn small ghost" to="/signin">
            Tenant sign in
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Public Account Page</p>
          <h1>{account} Fitness Studio</h1>
          <p>
            Promote class activities, trainer programs, and PT sessions for new and existing member conversion.
          </p>
          <div className="hero-actions">
            <Link className="btn" to={`/a/${account}/member/signup`}>
              Join as new member
            </Link>
            <Link className="btn ghost" to={`/a/${account}/member/signin`}>
              Member sign in
            </Link>
          </div>
        </div>

        <aside className="hero-card">
          <h2>Public Actions</h2>
          <ul>
            <li>new member registration</li>
            <li>buy membership package</li>
            <li>member self booking PT</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
