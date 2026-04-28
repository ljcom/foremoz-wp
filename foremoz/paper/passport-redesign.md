Berikut instruksi Codex (langsung bisa kamu kasih ke AI dev) untuk redesign Passport Foremoz jadi social-style + visual-heavy + empty state menarik.

⸻

🧠 CONTEXT

Redesign halaman Passport menjadi:
	•	Mirip social media (IG/Strava hybrid)
	•	Fokus: identity + activity + credibility
	•	Hindari feel “admin dashboard”
	•	Gunakan icon + visual + empty state

Modern dashboard harus clean, intuitive, dan story-driven  ￼

⸻

🎯 OBJECTIVE

Transform:

dashboard → social passport profile

Menjadi:

identity + feed + event history + achievements


⸻

🧱 TASK STRUCTURE

1. Buat layout baru (replace existing)

passport-social
 ├── hero (cover + profile)
 ├── stats (inline)
 ├── tabs (sticky)
 ├── layout (sidebar + feed)


⸻

2. CREATE COMPONENTS

A. PassportHero.tsx

<section className="passport-hero">
  <div className="passport-cover" />

  <div className="passport-profile-row">
    <div className="passport-avatar">SA</div>

    <div className="passport-identity">
      <h1>{name}</h1>
      <p className="handle">@{username}</p>
      <p className="bio">{status || "No status yet"}</p>

      <div className="interest-tags">
        {interests.map(tag => <span>{tag}</span>)}
      </div>
    </div>

    <div className="passport-actions">
      <button className="btn">Edit Profile</button>
      <button className="btn ghost">Preview</button>
    </div>
  </div>

  <div className="passport-social-stats">
    <span><strong>{joined}</strong> Joined</span>
    <span><strong>{following}</strong> Following</span>
    <span><strong>{posts}</strong> Posts</span>
    <span><strong>{badges}</strong> Badges</span>
  </div>
</section>


⸻

B. PassportTabs.tsx

<nav className="passport-tabs">
  <button className="active">Feed</button>
  <button>Events</button>
  <button>Passport</button>
  <button>Following</button>
  <button>Settings</button>
</nav>


⸻

C. PassportFeed.tsx

<section className="passport-feed">
  <Composer />

  {activities.length === 0 ? <EmptyFeed /> : activities.map(renderCard)}
</section>


⸻

D. Composer (social feel)

<div className="composer card">
  <div className="mini-avatar">SA</div>
  <button className="composer-input">
    Share your progress...
  </button>
</div>


⸻

3. EMPTY STATE SYSTEM (MANDATORY)

Buat reusable:

function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="empty-state">
      <div className="empty-visual">
        <i className={`fa-solid ${icon}`} />
      </div>

      <h3>{title}</h3>
      <p>{desc}</p>

      {action && <button className="btn">{action}</button>}
    </div>
  )
}


⸻

USE CASES

Feed kosong

<EmptyState
  icon="fa-camera-retro"
  title="No posts yet"
  desc="Share your fitness journey, event moments, or progress."
  action="Create Post"
/>

Event kosong

<EmptyState
  icon="fa-calendar-plus"
  title="No events joined"
  desc="Join your first class or bootcamp."
  action="Explore Events"
/>

Achievement kosong

<EmptyState
  icon="fa-trophy"
  title="No badges yet"
  desc="Earn badges from verified participation."
  action="View Challenges"
/>


⸻

4. SIDEBAR CONTENT

<aside className="passport-sidebar">
  <div className="card">
    <h3>Passport</h3>
    <p>ID: {passportId}</p>
    <p>Plan: {plan}</p>
  </div>

  <div className="card">
    <h3>Achievements</h3>
    {badges.length === 0 ? (
      <EmptyState icon="fa-medal" title="No achievements" />
    ) : renderBadges()}
  </div>
</aside>


⸻

5. STYLE REQUIREMENTS

Theme:
	•	Clean white + soft green/teal
	•	Rounded (20–28px)
	•	Shadow soft
	•	Gradient hero

⸻

CSS CORE

.passport-hero {
  border-radius: 28px;
  overflow: hidden;
  background: white;
}

.passport-cover {
  height: 220px;
  background:
    radial-gradient(circle at 20% 20%, rgba(20,184,166,.4), transparent),
    linear-gradient(135deg, #0f766e, #111827);
}

.passport-avatar {
  width: 110px;
  height: 110px;
  border-radius: 30px;
  background: #111827;
  color: white;
  border: 4px solid white;
}

.passport-tabs {
  position: sticky;
  top: 0;
  backdrop-filter: blur(12px);
}

.empty-state {
  text-align: center;
  padding: 32px;
  border: 1px dashed #dfe7e2;
  border-radius: 20px;
}

.empty-visual {
  width: 80px;
  height: 80px;
  margin: auto;
  display: grid;
  place-items: center;
  border-radius: 20px;
  background: #ecfdf5;
  font-size: 28px;
  color: #047857;
}


⸻

6. UX RULES (IMPORTANT)
	•	❌ Jangan tampilkan form default (harus modal)
	•	❌ Jangan tampilkan “No data”
	•	❌ Jangan banyak card kecil (terlalu admin feel)
	•	✅ Selalu ada icon
	•	✅ Selalu ada CTA
	•	✅ Selalu ada visual (gradient / illustration)
	•	✅ Fokus ke storytelling (activity timeline)

⸻

7. DATA STRUCTURE (IMPORTANT FOR FUTURE)

passport {
  profile
  stats
  activities[]
  events[]
  badges[]
  following[]
}


⸻

8. FUTURE EXTENSION (JANGAN BUILD SEKARANG)
	•	Verified badge
	•	Activity timeline (Strava style)
	•	Social interaction (like/comment)
	•	Public passport URL

⸻

🚀 FINAL RESULT TARGET

Passport harus terasa seperti:
	•	IG profile + Strava + LinkedIn badge
	•	bukan admin panel
	•	bukan CRUD form

