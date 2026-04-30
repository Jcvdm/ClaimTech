// Utilitarian workflow — light UI, calm neutrals, high-contrast text,
// no serif in the working screens. Sized for dense data, long sessions,
// predictable layout. Tokens below.
//
// Base: #f7f7f5 canvas, #fff surfaces, #1a1a1e ink, single blue-ink accent
// for affordances. System font stack for readability at small sizes.
// Left nav persistent. Top breadcrumb + actions bar. Workspace 13.5–14px.

const U = {
  canvas: '#f6f6f4',
  surface: '#ffffff',
  surfaceAlt: '#fafaf8',
  ink: '#18181b',
  ink2: '#3f3f46',
  ink3: '#71717a',
  ink4: '#a1a1aa',
  line: '#e7e7e3',
  lineStrong: '#d4d4d0',
  acc: '#1d4ed8',       // working blue — affordance only, not decoration
  accSoft: '#eef2ff',
  ok: '#15803d',
  warn: '#b45309',
  err: '#b91c1c',
  okSoft: '#ecfdf5',
  warnSoft: '#fef3c7',
  errSoft: '#fee2e2',
};

// Inject utilitarian styles once
if (typeof document !== 'undefined' && !document.getElementById('ct-util-styles')) {
  const s = document.createElement('style');
  s.id = 'ct-util-styles';
  s.textContent = `
    .util { font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
      color: ${U.ink}; font-feature-settings: "ss01","cv11"; -webkit-font-smoothing: antialiased; }
    .util-mono { font-family: ui-monospace, "SF Mono", "Menlo", "Consolas", monospace; }
    .util button { cursor: pointer; font-family: inherit; }
    .util input, .util select, .util textarea { font-family: inherit; }
    .util a { color: ${U.acc}; text-decoration: none; }
    .util ::selection { background: ${U.accSoft}; }
    .u-row:hover { background: ${U.surfaceAlt}; }
    .u-tab { position: relative; }
    .u-tab-active::after { content:''; position:absolute; left:0; right:0; bottom:-1px; height:2px; background: ${U.ink}; }
  `;
  document.head.appendChild(s);
}

// Primitives -------------------------------------------------------
function UBadge({ children, tone = 'muted' }) {
  const t = {
    muted: { bg: U.surfaceAlt, bd: U.line, fg: U.ink2 },
    ok:    { bg: U.okSoft,    bd: '#bbf7d0', fg: U.ok },
    warn:  { bg: U.warnSoft,  bd: '#fde68a', fg: U.warn },
    err:   { bg: U.errSoft,   bd: '#fecaca', fg: U.err },
    info:  { bg: U.accSoft,   bd: '#c7d2fe', fg: U.acc },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5,
      padding: '2px 8px', background: t.bg, border: `1px solid ${t.bd}`,
      color: t.fg, borderRadius: 3, lineHeight: '18px', fontWeight: 500,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function UBtn({ children, variant = 'ghost', icon }) {
  const v = {
    primary: { bg: U.ink, fg: '#fff', bd: U.ink },
    secondary: { bg: U.surface, fg: U.ink, bd: U.lineStrong },
    ghost: { bg: 'transparent', fg: U.ink2, bd: 'transparent' },
    accent: { bg: U.acc, fg: '#fff', bd: U.acc },
  }[variant];
  return (
    <button style={{
      height: 30, padding: '0 12px', fontSize: 13, fontWeight: 500,
      background: v.bg, color: v.fg, border: `1px solid ${v.bd}`,
      borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>{icon}{children}</button>
  );
}

function ULabel({ children }) {
  return <div style={{ fontSize: 11.5, color: U.ink3, fontWeight: 500, letterSpacing: 0.02, marginBottom: 4 }}>{children}</div>;
}

// Shell ------------------------------------------------------------
function UShell({ active = 'Work', breadcrumb = ['Work'], title, subtitle, actions, children }) {
  const nav = [
    { g: 'Workspace', items: ['Dashboard'] },
    { g: 'Operations', items: ['Work', 'Requests', 'Assessments', 'Additionals', 'FRC', 'Finalized', 'Archive'] },
    { g: 'Directory', items: ['Clients', 'Repairers', 'Engineers'] },
    { g: 'Quotes',    items: ['Quotes'] },
  ];
  const counts = { Work: 47, Requests: 12, Assessments: 18, Additionals: 4, FRC: 6 };
  return (
    <div className="util" style={{
      width: 1440, height: 900, background: U.canvas, display: 'grid',
      gridTemplateColumns: '224px 1fr', fontSize: 14,
    }}>
      {/* Sidebar */}
      <aside style={{ background: U.surface, borderRight: `1px solid ${U.line}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${U.line}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, background: U.ink, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>C</div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.1 }}>ClaimTech</div>
            <div style={{ fontSize: 11, color: U.ink3 }}>JCVDM · Admin</div>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '10px 8px' }}>
          {nav.map((grp, gi) => (
            <div key={gi} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: U.ink4, fontWeight: 600, padding: '4px 10px 6px', letterSpacing: 0.02, textTransform: 'uppercase' }}>{grp.g}</div>
              {grp.items.map((it, i) => {
                const on = it === active;
                return (
                  <div key={i} style={{
                    padding: '6px 10px', fontSize: 13.5, borderRadius: 4, marginBottom: 1,
                    background: on ? U.surfaceAlt : 'transparent', color: on ? U.ink : U.ink2,
                    fontWeight: on ? 600 : 400, display: 'flex', alignItems: 'center', gap: 8,
                    borderLeft: on ? `2px solid ${U.ink}` : '2px solid transparent', paddingLeft: on ? 8 : 10,
                  }}>
                    <span style={{ flex: 1 }}>{it}</span>
                    {counts[it] != null && <span className="util-mono" style={{ fontSize: 11, color: U.ink3 }}>{counts[it]}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 14px', borderTop: `1px solid ${U.line}`, fontSize: 11.5, color: U.ink3, display: 'flex', justifyContent: 'space-between' }}>
          <span>v3.6.0</span><span style={{ color: U.ok }}>● Synced</span>
        </div>
      </aside>

      {/* Main */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ height: 44, background: U.surface, borderBottom: `1px solid ${U.line}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, flexShrink: 0 }}>
          <nav style={{ fontSize: 13, color: U.ink3, display: 'flex', gap: 6, alignItems: 'center' }}>
            <span>Home</span>
            {breadcrumb.map((b, i) => (
              <React.Fragment key={i}>
                <span style={{ color: U.ink4 }}>/</span>
                <span style={{ color: i === breadcrumb.length - 1 ? U.ink : U.ink3 }}>{b}</span>
              </React.Fragment>
            ))}
          </nav>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${U.line}`, borderRadius: 4, height: 28, padding: '0 10px', gap: 8, width: 280, fontSize: 13, color: U.ink3, background: U.surfaceAlt }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>
              <span>Search claims, vehicles, clients…</span>
              <span className="util-mono" style={{ marginLeft: 'auto', fontSize: 11, color: U.ink4 }}>⌘K</span>
            </div>
            <UBtn variant="secondary">Help</UBtn>
          </div>
        </header>

        {/* Page header */}
        {title && (
          <div style={{ background: U.surface, borderBottom: `1px solid ${U.line}`, padding: '16px 24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: -0.1 }}>{title}</h1>
              {subtitle && <div style={{ fontSize: 13, color: U.ink3, marginTop: 4 }}>{subtitle}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>{actions}</div>
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

Object.assign(window, { U, UBadge, UBtn, ULabel, UShell });
