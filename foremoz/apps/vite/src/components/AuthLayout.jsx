import { Link } from 'react-router-dom';
import { getSession } from '../lib.js';
import { getVerticalLabel, normalizeVerticalSlug } from '../industry-jargon.js';

export default function AuthLayout({ title, subtitle, alternateHref, alternateText, children }) {
  const industrySlug = normalizeVerticalSlug(getSession()?.tenant?.industry_slug, 'fitness');
  const brand = `Foremoz ${getVerticalLabel(industrySlug, 'Fitness')}`;
  return (
    <main className="auth-shell">
      <section className="auth-left">
        <p className="eyebrow">{brand}</p>
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
