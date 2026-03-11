import { Link } from 'react-router-dom';

export default function AuthLayout({ title, subtitle, alternateHref, alternateText, children }) {
  return (
    <main className="auth-shell">
      <section className="auth-left">
        <p className="eyebrow">Foremoz Industries</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {alternateHref && alternateText ? (
          <Link className="link-inline" to={alternateHref}>
            {alternateText}
          </Link>
        ) : null}
      </section>
      <section className="auth-right">{children}</section>
    </main>
  );
}
