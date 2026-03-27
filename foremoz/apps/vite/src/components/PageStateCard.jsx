import { Link } from 'react-router-dom';

export default function PageStateCard({
  shellClassName = 'dashboard',
  withBackdrop = false,
  eyebrow = 'Status',
  title,
  description = '',
  actions = [],
  children = null
}) {
  return (
    <main className={shellClassName}>
      {withBackdrop ? <div className="passport-bg-orbs" aria-hidden="true" /> : null}
      <section className="card wide page-state-card">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p className="sub">{description}</p> : null}
        {children}
        {actions.length > 0 ? (
          <div className="hero-actions page-state-actions">
            {actions.map((action, index) => {
              const className = action.variant === 'ghost' ? 'btn ghost' : 'btn';
              const key = `${action.label}-${index}`;
              if (action.to) {
                return (
                  <Link key={key} className={className} to={action.to}>
                    {action.label}
                  </Link>
                );
              }
              return (
                <button key={key} className={className} type="button" onClick={action.onClick}>
                  {action.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </section>
    </main>
  );
}
