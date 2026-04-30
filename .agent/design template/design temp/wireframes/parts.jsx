// Shared wireframe primitives — medium-fi, dark-first, grayscale with
// single-accent slots so we can see the composition without committing
// to the final palette. Type commits: Instrument Serif (display) +
// Geist Mono (micro) + Inter (UI). One accent hue swapped via --acc.

// Global style + font loader (idempotent).
if (typeof document !== 'undefined' && !document.getElementById('ct-wf-styles')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);

  const s = document.createElement('style');
  s.id = 'ct-wf-styles';
  s.textContent = `
    .ct { font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    .ct-serif { font-family: 'Instrument Serif', 'Times New Roman', serif; font-weight: 400; letter-spacing: -0.01em; }
    .ct-mono { font-family: 'Geist Mono', ui-monospace, monospace; }
    .ct input { font-family: inherit; }
    .ct button { font-family: inherit; cursor: pointer; }
    .ct ::selection { background: var(--acc, #d4a574); color: #0a0a0a; }
    .ct a { color: inherit; text-decoration: none; }
    .ct-field {
      background: transparent; border: none; outline: none; color: inherit;
      width: 100%; font-size: 15px; font-family: inherit;
    }
    .ct-btn-press:active { transform: scale(0.985); }
  `;
  document.head.appendChild(s);
}

// Logo mark — simple monogram using the "C" + target ring motif.
// Two variants: mono (white on dark) or accent.
function CTMark({ size = 28, accent = false, color = '#fff' }) {
  const fg = accent ? 'var(--acc)' : color;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14.5" stroke={fg} strokeWidth="1" opacity="0.35" />
      <path d="M22 10.5a8 8 0 1 0 0 11" stroke={fg} strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2" fill={fg} />
    </svg>
  );
}

function CTWordmark({ color = '#fff' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <CTMark size={22} color={color} />
      <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: 0.2, color }}>
        claim<span style={{ opacity: 0.55, fontWeight: 400 }}>tech</span>
      </span>
    </div>
  );
}

// Micro-label / eyebrow — mono, uppercase, spaced
function Eyebrow({ children, color = 'rgba(255,255,255,0.5)', size = 10 }) {
  return (
    <div className="ct-mono" style={{
      fontSize: size, letterSpacing: '0.24em', textTransform: 'uppercase',
      color, fontWeight: 500,
    }}>{children}</div>
  );
}

// Text input row — darker track with focus glow
function TextRow({ label, placeholder, type = 'text', bg = 'rgba(255,255,255,0.035)', border = 'rgba(255,255,255,0.09)', fg = '#fff', muted = 'rgba(255,255,255,0.35)', eye }) {
  const [focused, setFocused] = React.useState(false);
  const [show, setShow] = React.useState(false);
  return (
    <div>
      {label && (
        <div className="ct-mono" style={{
          fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
          color: muted, marginBottom: 8, fontWeight: 500,
        }}>{label}</div>
      )}
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center',
        background: bg, border: `1px solid ${focused ? 'var(--acc)' : border}`,
        height: 46, padding: '0 14px', borderRadius: 2,
        boxShadow: focused ? '0 0 0 3px color-mix(in oklab, var(--acc) 18%, transparent)' : 'none',
        transition: 'border-color .15s, box-shadow .15s',
      }}>
        <input
          className="ct-field"
          type={eye && !show ? 'password' : type}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ color: fg }}
        />
        {eye && (
          <button onClick={() => setShow(s => !s)} style={{
            border: 'none', background: 'transparent', color: muted,
            padding: 4, display: 'flex', alignItems: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M1.5 10s3-6 8.5-6 8.5 6 8.5 6-3 6-8.5 6S1.5 10 1.5 10Z"/>
              <circle cx="10" cy="10" r="2.5"/>
              {!show && <path d="M3 3l14 14" stroke="currentColor" strokeWidth="1.4"/>}
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// Primary CTA — accent fill
function PrimaryBtn({ children, arrow = true }) {
  return (
    <button className="ct-btn-press" style={{
      width: '100%', height: 48, border: 'none',
      background: 'var(--acc)', color: '#0a0a0a',
      fontSize: 14, fontWeight: 600, letterSpacing: 0.1,
      borderRadius: 2, display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 10, transition: 'filter .15s',
    }}
    onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.08)'}
    onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}>
      <span>{children}</span>
      {arrow && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M2 7h10M8 3l4 4-4 4"/>
        </svg>
      )}
    </button>
  );
}

// Subtle secondary link
function LinkRow({ left, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'rgba(255,255,255,0.55)' }}>
      <span>{left}</span>
      <span style={{ color: 'rgba(255,255,255,0.8)' }}>{right}</span>
    </div>
  );
}

// Tiny status chip (e.g., "LIVE · v3.6")
function StatusChip({ children }) {
  return (
    <div className="ct-mono" style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.7)', padding: '5px 10px 5px 8px',
      border: '1px solid rgba(255,255,255,0.12)', borderRadius: 2,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: '#6ad19a', boxShadow: '0 0 8px #6ad19a' }} />
      {children}
    </div>
  );
}

Object.assign(window, { CTMark, CTWordmark, Eyebrow, TextRow, PrimaryBtn, LinkRow, StatusChip });
