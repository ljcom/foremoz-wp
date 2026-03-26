import { useEffect, useRef } from 'react';

const TURNSTILE_SITE_KEY = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();

let scriptPromise = null;

function loadTurnstileScript() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-turnstile-script="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.turnstile || null), { once: true });
      existing.addEventListener('error', () => reject(new Error('failed to load turnstile script')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.setAttribute('data-turnstile-script', '1');
    script.onload = () => resolve(window.turnstile || null);
    script.onerror = () => reject(new Error('failed to load turnstile script'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export default function TurnstileWidget({ onToken, resetSignal = 0 }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!TURNSTILE_SITE_KEY || !containerRef.current) return undefined;

    loadTurnstileScript()
      .then((turnstile) => {
        if (cancelled || !turnstile || !containerRef.current) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => {
            if (typeof onToken === 'function') onToken(String(token || '').trim());
          },
          'expired-callback': () => {
            if (typeof onToken === 'function') onToken('');
          },
          'error-callback': () => {
            if (typeof onToken === 'function') onToken('');
          }
        });
      })
      .catch(() => {
        if (typeof onToken === 'function') onToken('');
      });

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined' && window.turnstile && widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup failure
        }
      }
      widgetIdRef.current = null;
    };
  }, [onToken]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    if (typeof window === 'undefined' || !window.turnstile || widgetIdRef.current === null) return;
    try {
      window.turnstile.reset(widgetIdRef.current);
      if (typeof onToken === 'function') onToken('');
    } catch {
      // ignore reset failure
    }
  }, [onToken, resetSignal]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={containerRef} />;
}
