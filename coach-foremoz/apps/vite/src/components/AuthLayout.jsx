import { Link } from 'react-router-dom';

export default function AuthLayout({ title, subtitle, alternateHref, alternateText, children }) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">coach.foremoz.com</p>
        <h1>{title}</h1>
        <p className="subtext">{subtitle}</p>
        {children}
        {alternateHref ? (
          <p className="auth-alt">
            <Link to={alternateHref}>{alternateText}</Link>
          </p>
        ) : null}
      </section>
    </main>
  );
}
