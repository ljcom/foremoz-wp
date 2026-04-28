import { useState } from 'react';
import LanguageSwitcher from './LanguageSwitcher.jsx';

const TIMEZONE_KEY = 'ff.backend.timezone';
const TIMEZONE_OPTIONS = [
  'Asia/Jakarta',
  'Asia/Makassar',
  'Asia/Jayapura',
  'UTC'
];

function getStoredTimezone() {
  if (typeof window === 'undefined') return 'Asia/Jakarta';
  return localStorage.getItem(TIMEZONE_KEY) || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
}

export default function BackendSidebarSettings() {
  const [open, setOpen] = useState(false);
  const [timezone, setTimezone] = useState(getStoredTimezone);

  function updateTimezone(value) {
    setTimezone(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(TIMEZONE_KEY, value);
    }
  }

  return (
    <>
      <button className="backend-sidebar-settings-btn" type="button" onClick={() => setOpen(true)} aria-label="Settings">
        <i className="fa-solid fa-gear" aria-hidden="true" />
      </button>
      {open ? (
        <div className="backend-settings-overlay" onClick={() => setOpen(false)}>
          <aside className="backend-settings-panel" onClick={(event) => event.stopPropagation()}>
            <div className="panel-head">
              <div>
                <p className="eyebrow">Settings</p>
                <h2>Preferences</h2>
              </div>
              <button className="btn ghost small" type="button" onClick={() => setOpen(false)}>Close</button>
            </div>
            <section className="backend-settings-section">
              <p className="eyebrow">Language</p>
              <LanguageSwitcher />
            </section>
            <section className="backend-settings-section">
              <p className="eyebrow">Time zone</p>
              <label>
                Time zone
                <select value={timezone} onChange={(event) => updateTimezone(event.target.value)}>
                  {TIMEZONE_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
            </section>
          </aside>
        </div>
      ) : null}
    </>
  );
}
