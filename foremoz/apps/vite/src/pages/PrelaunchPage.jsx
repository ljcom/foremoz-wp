import { useMemo, useState } from 'react';
import TurnstileWidget from '../components/TurnstileWidget.jsx';

const ROLE_OPTIONS = [
  'Coach',
  'Instructor',
  'Mentor',
  'Community Builder',
  'Gym / Studio Owner'
];

const IDEA_SNIPPETS = [
  {
    title: 'Foremoz sebagai Event OS lintas industri',
    excerpt:
      'Foremoz adalah multi-industry Event OS untuk Creator, Participant, dan Host. Event diposisikan sebagai unit ekonomi utama yang menghubungkan aktivitas, kolaborasi, dan monetisasi.',
    source: 'paper/whitepaper/core/01-whitepaper/00_summary.md',
    image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1400&q=80'
  },
  {
    title: 'Passport sebagai lapisan identitas portabel',
    excerpt:
      'Passport berfungsi sebagai lapisan identitas dan reputasi portabel lintas vertical, sehingga actor dapat membawa history, trust, dan network relationship antar konteks event.',
    source: 'paper/whitepaper/core/01-whitepaper/00_summary.md',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80'
  },
  {
    title: 'Masalah yang ingin diselesaikan',
    excerpt:
      'Industri pengalaman masih terfragmentasi: infrastruktur creator lemah, identity/reputation tersilo, kolaborasi creator-host belum terstruktur, dan monetisasi event belum terintegrasi end-to-end.',
    source: 'paper/whitepaper/core/01-whitepaper/00a_core_narrative.md',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=80'
  },
  {
    title: 'Operating thesis pada vertical Active',
    excerpt:
      'Default mental model Active: creator membuat event, membagikan link publik, participant mendaftar, hadir/check-in, event selesai, lalu Passport menyimpan histori untuk repeat conversion.',
    source: 'paper/whitepaper/industries/active/01-whitepaper/00_summary.md',
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1400&q=80'
  },
  {
    title: 'Model interaksi triadik',
    excerpt:
      'Paper conference mengusulkan model triadic interaction (provider, consumer, operator) dengan activity-verified identity untuk orkestrasi interaksi, evolusi identitas, dan partisipasi yang scalable.',
    source: 'paper/conference/01-whitepaper/00_abstract.md',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=80'
  }
];

function ReadMorePlaceholderPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-5 py-10 text-slate-100 sm:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=2200&q=80')"
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/85 via-slate-950/85 to-slate-950" />
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      </div>

      <section className="mx-auto max-w-6xl space-y-8">
        <article className="overflow-hidden rounded-3xl border border-white/15 bg-slate-900/60 shadow-2xl shadow-cyan-950/40 backdrop-blur">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-7 sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/80">Why Foremoz</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                Dari ide paper ke movement coach economy
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Foremoz dibangun sebagai Event OS untuk creator, participant, dan host. Ini bukan sekadar tools kelas,
                tapi fondasi untuk membangun bisnis coaching dan komunitas yang lebih berkelanjutan.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="rounded-full border border-white/20 px-3 py-1">Event as economic unit</span>
                <span className="rounded-full border border-white/20 px-3 py-1">Passport identity layer</span>
                <span className="rounded-full border border-white/20 px-3 py-1">Creator-led growth loop</span>
              </div>
            </div>
            <div
              className="min-h-[220px] bg-cover bg-center"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, rgba(2,6,23,0.2), rgba(2,6,23,0.8)), url('https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1600&q=80')"
              }}
            />
          </div>
        </article>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {IDEA_SNIPPETS.map((item) => (
            <article key={item.title} className="overflow-hidden rounded-2xl border border-white/15 bg-slate-900/65">
              <img src={item.image} alt={item.title} className="h-40 w-full object-cover" />
              <div className="p-4">
                <h2 className="text-base font-semibold text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.excerpt}</p>
                <p className="mt-3 text-xs text-cyan-200/80">Sumber: {item.source}</p>
              </div>
            </article>
          ))}
        </div>

        <article className="rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-5">
          <p className="text-sm leading-relaxed text-cyan-50">
            Arah besar Foremoz: menyatukan classes, events, communities, dan repeat journey dalam satu sistem yang
            terasa modern, premium, dan tetap human untuk pasar Indonesia.
          </p>
        </article>

        <div className="flex flex-wrap gap-3">
          <a
            href="/manifesto"
            className="inline-flex items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-400/10 px-5 py-2 text-sm font-medium text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-300/20"
          >
            Explore the Manifesto
          </a>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/50 hover:text-cyan-100"
          >
            Kembali ke prelaunch
          </a>
        </div>
      </section>
    </main>
  );
}

export default function PrelaunchPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: ROLE_OPTIONS[0],
    whatsapp: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);

  const roleItems = useMemo(() => ROLE_OPTIONS, []);

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitError('');
    if (!turnstileToken) {
      setSubmitError('Verifikasi Turnstile wajib sebelum submit.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/v1/prelaunch/leads', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          role: form.role,
          whatsapp: form.whatsapp || null,
          turnstile_token: turnstileToken,
          source: typeof window !== 'undefined' ? window.location.host : 'foremoz.com',
          page_path: typeof window !== 'undefined' ? window.location.pathname : '/'
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.status === 'FAIL') {
        throw new Error(payload.message || 'Gagal mengirim data. Coba lagi.');
      }
      setSubmitted(true);
      setTurnstileResetSignal((value) => value + 1);
      setTurnstileToken('');
    } catch (error) {
      setSubmitted(false);
      setSubmitError(String(error?.message || 'Gagal mengirim data. Coba lagi.'));
      setTurnstileResetSignal((value) => value + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  function onChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=2200&q=80')"
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/80 to-slate-950/95" />
        <div className="absolute -left-24 top-0 h-[380px] w-[380px] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-[-80px] top-[20%] h-[320px] w-[320px] rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute bottom-[-120px] left-[30%] h-[360px] w-[360px] rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 pb-16 pt-8 sm:px-8 sm:pt-10">
        <header className="flex items-center justify-between">
          {/* TODO: brand copy bisa diganti sesuai guideline brand final. */}
          <p className="text-lg font-semibold tracking-[0.08em] text-slate-100">FOREMOZ</p>
          <a
            href="#early-access"
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-200 transition hover:border-cyan-300/50 hover:text-cyan-100"
          >
            Limited early access
          </a>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/80">Pre-launch invitation</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              The Coach Economy is Just Getting Started.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Build your coaching business, not just your classes. Foremoz helps coaches run classes, events, and
              communities in one elegant operating system.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {/* TODO: CTA text bisa disesuaikan saat campaign final. */}
              <a
                href="#early-access"
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-cyan-100"
              >
                Become a Founding Coach
              </a>
              <a
                // TODO: ganti URL manifesto jika sudah ada halaman final.
                href="/why-foremoz"
                className="inline-flex items-center justify-center rounded-full border border-cyan-300/45 bg-cyan-400/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-300/20"
              >
                Read the Idea
              </a>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Selected coaches only</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Limited spots</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Free for early adopters</span>
            </div>
          </div>

          <article className="overflow-hidden rounded-3xl border border-white/15 bg-white/5 shadow-2xl shadow-cyan-950/40 backdrop-blur">
            <img
              src="https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=1400&q=80"
              alt="Coach and community in training session"
              className="h-44 w-full object-cover sm:h-52"
            />
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">What we are building</p>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-slate-200">
                <li>Today, most coaches still run disconnected tools for classes, events, and communities.</li>
                <li>Growth, retention, and operations are often scattered across multiple systems.</li>
                <li>Foremoz is building one premium platform to unify coaching operations end to end.</li>
              </ul>
            </div>
          </article>
        </section>

        <section id="early-access" className="grid gap-6 rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Early adoption program</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Join selected early adopters</h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Selected registrants can get invited early access, try Foremoz first at no cost, and share direct
              product feedback as founding coaches.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/15 px-3 py-1">Founding coach track</span>
              <span className="rounded-full border border-white/15 px-3 py-1">Private onboarding wave</span>
              <span className="rounded-full border border-white/15 px-3 py-1">Invitation-based rollout</span>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-white/15 bg-slate-900/60 p-5">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-[0.1em] text-slate-300">Name</span>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={onChange}
                required
                className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-cyan-300/70 focus:outline-none"
                placeholder="Your full name"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-[0.1em] text-slate-300">Email</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                required
                className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-cyan-300/70 focus:outline-none"
                placeholder="name@email.com"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-[0.1em] text-slate-300">Role</span>
              <select
                name="role"
                value={form.role}
                onChange={onChange}
                required
                className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-cyan-300/70 focus:outline-none"
              >
                {roleItems.map((role) => (
                  <option key={role} value={role} className="text-slate-900">
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-[0.1em] text-slate-300">
                WhatsApp (optional)
              </span>
              <input
                type="tel"
                name="whatsapp"
                value={form.whatsapp}
                onChange={onChange}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-cyan-300/70 focus:outline-none"
                placeholder="08xxxxxxxxxx"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-cyan-100"
            >
              {isSubmitting ? 'Mengirim...' : 'Join Early Access'}
            </button>
            <TurnstileWidget onToken={setTurnstileToken} resetSignal={turnstileResetSignal} />

            {submitted ? (
              <p className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
                Thanks. If you’re selected for early access, we’ll reach out first.
              </p>
            ) : submitError ? (
              <p className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
                {submitError}
              </p>
            ) : (
              <p className="text-xs text-slate-400">Limited spots. Selected coaches only.</p>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}

export { ReadMorePlaceholderPage };
