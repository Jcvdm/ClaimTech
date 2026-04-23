// Field kit — tablet + phone screens for engineers in the field.
// Priorities: huge hit targets, one-handed, offline, camera-first, sun-readable.
// No fluff. Light "field" theme (high contrast on bright days) + a dark variant for night/workshop.
//
// Uses U tokens from util-shell.jsx for continuity with the desktop app.

// ─── Tokens for field ─────────────────────────────────────────────
const F = {
  bg: '#f5f5f3',
  surface: '#ffffff',
  ink: '#111114',
  ink2: '#3f3f46',
  ink3: '#71717a',
  ink4: '#a1a1aa',
  line: '#e4e4e0',
  lineStrong: '#d1d1cc',
  acc: '#1d4ed8',
  accSoft: '#eef2ff',
  ok: '#15803d',
  warn: '#b45309',
  err: '#b91c1c',
  okSoft: '#ecfdf5',
  warnSoft: '#fef3c7',
  errSoft: '#fee2e2',
};

if (typeof document !== 'undefined' && !document.getElementById('ct-field-styles')) {
  const s = document.createElement('style');
  s.id = 'ct-field-styles';
  s.textContent = `
    .field { font-family: -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif;
      color: ${F.ink}; -webkit-font-smoothing: antialiased; }
    .field-mono { font-family: ui-monospace, "SF Mono", Menlo, monospace; }
    .field button { cursor: pointer; font-family: inherit; -webkit-tap-highlight-color: transparent; }
    .field .tap-lg { min-height: 56px; }
    .field .tap-xl { min-height: 72px; }
  `;
  document.head.appendChild(s);
}

// ─── Tablet shell (1024×768 landscape) ────────────────────────────
function FTabletShell({ title, step, totalSteps, subtitle, leftAction, rightAction, children, footer }) {
  return (
    <div className="field" style={{
      width: 1180, height: 820, background: F.bg, display: 'flex',
      flexDirection: 'column', fontSize: 16,
    }}>
      {/* Top bar: 64px — big back, title, huge primary */}
      <header style={{
        height: 64, background: F.surface, borderBottom: `1px solid ${F.line}`,
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0,
      }}>
        <button className="tap-lg" style={{
          width: 56, height: 56, border: `1px solid ${F.lineStrong}`, borderRadius: 8,
          background: F.surface, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M13 4l-7 7 7 7" stroke={F.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: F.ink3, fontWeight: 600, letterSpacing: 0.03, textTransform: 'uppercase' }}>
            {step != null && `Step ${step} of ${totalSteps} · `}{subtitle}
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 2, letterSpacing: -0.2 }}>{title}</div>
        </div>
        <button className="tap-lg" style={{
          height: 56, padding: '0 18px', border: `1px solid ${F.lineStrong}`, borderRadius: 8,
          background: F.surface, fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: F.ok }}/>Synced
        </button>
      </header>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>{children}</div>

      {/* Bottom action bar: 80px — prev / step pager / next */}
      {footer !== false && (
        <div style={{
          height: 80, background: F.surface, borderTop: `1px solid ${F.line}`,
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0,
        }}>
          <button className="tap-xl" style={{
            width: 180, height: 64, border: `1px solid ${F.lineStrong}`, borderRadius: 10,
            background: F.surface, fontSize: 17, fontWeight: 500, color: F.ink2,
          }}>← Previous</button>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 4 }}>
            {Array.from({ length: totalSteps || 13 }).map((_, i) => (
              <div key={i} style={{
                width: 22, height: 6, borderRadius: 3,
                background: i < (step || 0) ? F.ink : i === (step - 1) ? F.acc : F.line,
              }}/>
            ))}
          </div>
          <button className="tap-xl" style={{
            width: 280, height: 64, background: F.ink, color: '#fff', border: 'none',
            borderRadius: 10, fontSize: 18, fontWeight: 600, display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>Next: Vehicle values →</button>
        </div>
      )}
    </div>
  );
}

// ─── Tablet · Damage capture (landscape) ──────────────────────────
function FieldTabletDamage() {
  const zones = [
    [1, 'FB', 'Front bumper',  'Replace',        6, true],
    [2, 'HL', 'Left headlight','Replace',        3, true],
    [3, 'FD', 'Left fender',   'Repair & paint', 4, true],
    [4, 'DR', 'Left door',     'Paint',          3, false],
    [5, 'BN', 'Bonnet',        'PDR + paint',    2, false],
  ];
  return (
    <FTabletShell
      title="Damage capture"
      subtitle="CT-4812 · Toyota Hilux · ABC 123 GP"
      step={6} totalSteps={13}
    >
      {/* Left: schematic — touch targets */}
      <div style={{ flex: 1.3, display: 'flex', flexDirection: 'column', padding: 16, gap: 12 }}>
        <div style={{ background: F.surface, border: `1px solid ${F.line}`, borderRadius: 10, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${F.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Tap a zone to mark damage</div>
            <div style={{ fontSize: 14, color: F.ink3 }}>5 captured</div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: F.bg }}>
            <svg width="100%" viewBox="0 0 600 280" style={{ maxHeight: 360, padding: 20 }}>
              <rect x="70" y="80" width="460" height="130" rx="18" stroke={F.lineStrong} strokeWidth="1.5" fill={F.surface}/>
              <rect x="140" y="55" width="320" height="50" rx="10" stroke={F.lineStrong} strokeWidth="1.5" fill={F.surface}/>
              <circle cx="160" cy="230" r="24" stroke={F.lineStrong} strokeWidth="1.5" fill={F.surface}/>
              <circle cx="440" cy="230" r="24" stroke={F.lineStrong} strokeWidth="1.5" fill={F.surface}/>
              {[[95,140,1],[130,85,2],[200,100,3],[265,95,4],[225,145,5]].map(([cx,cy,n], i) => (
                <g key={i}>
                  <circle cx={cx} cy={cy} r="22" fill={n === 1 ? F.acc : F.ink} opacity={n === 1 ? 1 : 0.88}/>
                  <text x={cx} y={cy + 6} textAnchor="middle" fontSize="17" fontFamily="ui-monospace,monospace" fontWeight="700" fill="#fff">{n}</text>
                </g>
              ))}
              {/* Empty tap targets */}
              {[[380,95],[420,140],[320,170]].map(([cx,cy], i) => (
                <circle key={'e'+i} cx={cx} cy={cy} r="18" fill="none" stroke={F.lineStrong} strokeWidth="1.5" strokeDasharray="4 4"/>
              ))}
            </svg>
          </div>
        </div>

        {/* Camera roll */}
        <div style={{ background: F.surface, border: `1px solid ${F.line}`, borderRadius: 10 }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${F.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Photos · 6 captured for Zone 1</div>
            <button style={{
              height: 48, padding: '0 18px', background: F.acc, color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1.5" y="4" width="15" height="11" rx="2" stroke="#fff" strokeWidth="1.6"/><circle cx="9" cy="9.5" r="3" stroke="#fff" strokeWidth="1.6"/><path d="M6 4l1-1.5h4L12 4" stroke="#fff" strokeWidth="1.6"/></svg>
              Take photo
            </button>
          </div>
          <div style={{ padding: 12, display: 'flex', gap: 8, overflow: 'auto' }}>
            {[0,1,2,3,4,5].map(i => (
              <div key={i} style={{
                width: 110, height: 82, flexShrink: 0,
                background: `repeating-linear-gradient(45deg, ${F.bg}, ${F.bg} 6px, #ededea 6px, #ededea 12px)`,
                border: `1px solid ${F.line}`, borderRadius: 6, position: 'relative',
              }}>
                <div className="field-mono" style={{ position: 'absolute', bottom: 4, left: 6, fontSize: 10, color: F.ink3, background: F.surface, padding: '1px 5px', borderRadius: 2 }}>IMG_0{i+1}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: zone list (huge rows) */}
      <div style={{ width: 420, borderLeft: `1px solid ${F.line}`, background: F.surface, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${F.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Zones · 5</div>
          <button style={{
            height: 44, padding: '0 14px', background: F.surface, border: `1px solid ${F.lineStrong}`,
            borderRadius: 8, fontSize: 14, fontWeight: 500,
          }}>+ Add</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {zones.map((z, i) => (
            <div key={i} className="tap-xl" style={{
              padding: '14px 18px', borderBottom: `1px solid ${F.line}`, display: 'flex',
              gap: 14, alignItems: 'center', background: i === 0 ? F.accSoft : 'transparent',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: i === 0 ? F.acc : F.ink, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'ui-monospace,monospace', fontSize: 17, fontWeight: 700,
              }}>{z[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{z[2]}</div>
                <div style={{ fontSize: 13.5, color: F.ink3, marginTop: 2 }}>{z[3]} · {z[4]} photos</div>
              </div>
              <div style={{
                width: 10, height: 10, borderRadius: 5,
                background: z[5] ? F.ok : F.warn,
              }}/>
            </div>
          ))}
        </div>
      </div>
    </FTabletShell>
  );
}

// ─── Tablet · Exterior 360° (photo grid) ──────────────────────────
function FieldTablet360() {
  const angles = [
    ['Front 3/4',       true],
    ['Front',           true],
    ['Driver front',    true],
    ['Driver side',     true],
    ['Driver rear',     true],
    ['Rear',            false],
    ['Passenger rear',  false],
    ['Passenger side',  false],
    ['Passenger front', false],
    ['VIN plate',       true],
    ['Licence disc',    true],
    ['Odometer',        false],
  ];
  return (
    <FTabletShell title="Exterior 360°" subtitle="CT-4812 · Toyota Hilux" step={3} totalSteps={13}>
      <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
        <div style={{
          background: F.surface, border: `1px solid ${F.line}`, borderRadius: 10,
          padding: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 64, height: 64, background: F.accSoft, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="14" rx="2" stroke={F.acc} strokeWidth="1.8"/><circle cx="12" cy="13" r="4" stroke={F.acc} strokeWidth="1.8"/><path d="M8 6l1-2h6l1 2" stroke={F.acc} strokeWidth="1.8"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 600 }}>Capture 12 required angles</div>
            <div style={{ fontSize: 14, color: F.ink3, marginTop: 2 }}>7 of 12 captured · tap any frame to retake · long-press to reorder</div>
          </div>
          <button style={{
            height: 56, padding: '0 22px', background: F.acc, color: '#fff', border: 'none',
            borderRadius: 10, fontSize: 16, fontWeight: 600,
          }}>Guided capture</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {angles.map(([label, done], i) => (
            <div key={i} style={{
              aspectRatio: '4/3', background: done
                ? `repeating-linear-gradient(45deg, #e9e9e6, #e9e9e6 8px, #e2e2df 8px, #e2e2df 16px)`
                : F.surface,
              border: done ? `1px solid ${F.line}` : `2px dashed ${F.lineStrong}`,
              borderRadius: 10, position: 'relative', display: 'flex',
              alignItems: 'flex-end', padding: 10, overflow: 'hidden',
            }}>
              {!done && (
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: 44, height: 44, borderRadius: 22, background: F.surface,
                  border: `1px solid ${F.lineStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke={F.ink2} strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
              )}
              <div style={{
                background: done ? 'rgba(255,255,255,0.92)' : 'transparent', padding: '4px 8px',
                borderRadius: 4, fontSize: 13, fontWeight: 500, color: F.ink,
              }}>{label}</div>
              {done && (
                <div style={{ position: 'absolute', top: 8, right: 8,
                  width: 24, height: 24, borderRadius: 12, background: F.ok,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </FTabletShell>
  );
}

// ─── Phone · Today (offline-aware) ────────────────────────────────
function PhoneContainer({ children, dark = false }) {
  return (
    <div style={{
      width: 390, height: 780, background: dark ? '#09090b' : F.bg,
      borderRadius: 44, overflow: 'hidden', position: 'relative',
      boxShadow: '0 30px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, system-ui', color: dark ? '#fff' : F.ink,
    }}>
      {/* Dynamic island */}
      <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 118, height: 34, borderRadius: 22, background: '#000', zIndex: 50 }}/>
      {/* Status bar */}
      <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', fontSize: 15, fontWeight: 600, paddingTop: 16 }}>
        <span>09:41</span>
        <span style={{ display: 'flex', gap: 4 }}>
          <svg width="17" height="11"><rect x="0" y="6" width="3" height="4" rx="0.5" fill="currentColor"/><rect x="4.5" y="4" width="3" height="6" rx="0.5" fill="currentColor"/><rect x="9" y="2" width="3" height="8" rx="0.5" fill="currentColor"/><rect x="13.5" y="0" width="3" height="10" rx="0.5" fill="currentColor"/></svg>
        </span>
      </div>
      <div style={{ height: 'calc(100% - 48px)', overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

function FieldPhoneToday() {
  const today = [
    ['08:30', 'Inspection', 'Hatfield Auto',     'Toyota Hilux · ABC 123', 'now',       'acc'],
    ['10:00', 'Assessment', 'Menlyn Body',       'VW Polo · XYZ 987',      '1h 30m',    'ink'],
    ['13:00', 'Inspection', 'Rosebank Panel',    'Ford Ranger · DEF 456',  '4h 30m',    'ink'],
    ['15:30', 'Follow-up',  'Sandton Motors',    'BMW 320i · GHI 789',     '7h',        'ink'],
  ];
  return (
    <PhoneContainer>
      <div style={{ padding: '8px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, color: F.ink3, fontWeight: 500 }}>Monday, 21 April</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, marginTop: 2 }}>Today</div>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 20, background: F.acc, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700,
        }}>JS</div>
      </div>

      {/* Offline banner */}
      <div style={{
        margin: '0 16px 12px', padding: '10px 14px', background: F.warnSoft,
        border: `1px solid #fde68a`, borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" fill={F.warn}/><path d="M9 5v4M9 12v.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>
        <div style={{ flex: 1, fontSize: 13 }}>
          <div style={{ fontWeight: 600, color: F.warn }}>Working offline</div>
          <div style={{ color: F.ink2, fontSize: 12, marginTop: 1 }}>3 items queued · will sync when back online</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px' }}>
        {[['4','Assignments'],['2','In progress'],['11','Photos']].map(([n, l], i) => (
          <div key={i} style={{ flex: 1, background: F.surface, borderRadius: 12, padding: '10px 12px', border: `1px solid ${F.line}` }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>{n}</div>
            <div style={{ fontSize: 11, color: F.ink3, fontWeight: 500, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Agenda list */}
      <div style={{ padding: '0 16px', fontSize: 12, color: F.ink3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.03, marginBottom: 8 }}>Schedule</div>
      <div style={{ padding: '0 16px' }}>
        {today.map((t, i) => {
          const active = t[5] === 'acc';
          return (
            <div key={i} style={{
              background: F.surface, borderRadius: 12, padding: 14, marginBottom: 8,
              border: `1px solid ${active ? F.acc : F.line}`,
              boxShadow: active ? '0 0 0 3px rgba(29,78,216,0.08)' : 'none',
              display: 'flex', gap: 12, alignItems: 'center',
            }}>
              <div style={{
                width: 62, flexShrink: 0,
                borderRight: `1px solid ${F.line}`, paddingRight: 12, textAlign: 'center',
              }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{t[0]}</div>
                <div style={{ fontSize: 10.5, color: active ? F.acc : F.ink3, fontWeight: 600, marginTop: 2 }}>{active ? 'NOW' : `in ${t[4]}`}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: F.ink3, fontWeight: 500 }}>{t[1]} · {t[2]}</div>
                <div style={{ fontSize: 14.5, fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t[3]}</div>
              </div>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M6 3l6 6-6 6" stroke={F.ink4} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          );
        })}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 82,
        background: F.surface, borderTop: `1px solid ${F.line}`,
        display: 'flex', paddingBottom: 24,
      }}>
        {[['Today','home',true],['Queue','list',false],['Capture','cam',false],['More','dots',false]].map(([l, k, on], i) => (
          <div key={i} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: on ? F.ink : F.ink3, gap: 4,
          }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: on ? F.accSoft : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {k === 'home' && <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 8l6-5 6 5v7a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" stroke={on ? F.acc : F.ink3} strokeWidth="1.6" strokeLinejoin="round"/></svg>}
              {k === 'list' && <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M6 4h10M6 9h10M6 14h10M3 4h.5M3 9h.5M3 14h.5" stroke={F.ink3} strokeWidth="1.6" strokeLinecap="round"/></svg>}
              {k === 'cam' && <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="6" width="16" height="11" rx="2" stroke={F.ink3} strokeWidth="1.6"/><circle cx="10" cy="11.5" r="3" stroke={F.ink3} strokeWidth="1.6"/><path d="M7 6l1-2h4l1 2" stroke={F.ink3} strokeWidth="1.6"/></svg>}
              {k === 'dots' && <svg width="18" height="18" viewBox="0 0 18 18"><circle cx="4" cy="9" r="1.5" fill={F.ink3}/><circle cx="9" cy="9" r="1.5" fill={F.ink3}/><circle cx="14" cy="9" r="1.5" fill={F.ink3}/></svg>}
            </div>
            <span style={{ fontSize: 10, fontWeight: on ? 600 : 500 }}>{l}</span>
          </div>
        ))}
      </div>
    </PhoneContainer>
  );
}

// ─── Phone · Photo capture (camera screen) ────────────────────────
function FieldPhoneCapture() {
  return (
    <PhoneContainer dark>
      {/* Camera viewfinder — simulated */}
      <div style={{ position: 'relative', height: '100%', background: '#111' }}>
        {/* Fake scene gradient */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #2d2d30 0%, #1a1a1c 50%, #0a0a0b 100%)' }}/>
        {/* Faint vehicle silhouette */}
        <svg style={{ position: 'absolute', top: '32%', left: 0, right: 0, margin: '0 auto', opacity: 0.35 }} width="280" height="160" viewBox="0 0 280 160">
          <rect x="40" y="70" width="200" height="50" rx="8" fill="#444"/>
          <rect x="75" y="50" width="135" height="30" rx="6" fill="#555"/>
          <circle cx="85" cy="120" r="14" fill="#333"/>
          <circle cx="200" cy="120" r="14" fill="#333"/>
        </svg>

        {/* Guide overlay */}
        <div style={{ position: 'absolute', top: 80, left: 24, right: 24, bottom: 220, border: '2px dashed rgba(255,255,255,0.4)', borderRadius: 8 }}/>
        <div style={{ position: 'absolute', top: 50, left: 24, right: 24, textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500 }}>
            3 of 12 · <span style={{ fontWeight: 600 }}>Driver side</span>
          </div>
        </div>

        {/* Top hint */}
        <div style={{ position: 'absolute', top: 210, left: 24, right: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Fill the frame with the driver side</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Stand 2–3 metres back · hold steady</div>
        </div>

        {/* Bottom filmstrip */}
        <div style={{ position: 'absolute', bottom: 180, left: 16, right: 16, display: 'flex', gap: 6, overflow: 'hidden' }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{
              width: 50, height: 50, borderRadius: 6, flexShrink: 0,
              background: i < 2 ? `repeating-linear-gradient(45deg, #444, #444 4px, #333 4px, #333 8px)` : 'rgba(255,255,255,0.1)',
              border: i === 2 ? `2px solid ${F.acc}` : `1px solid rgba(255,255,255,0.15)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600,
            }}>{i >= 2 ? i + 1 : ''}</div>
          ))}
        </div>

        {/* Shutter bar */}
        <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 32px' }}>
          <button style={{
            width: 56, height: 56, borderRadius: 28, background: 'rgba(255,255,255,0.12)',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 7l8 8 8-8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button style={{
            width: 76, height: 76, borderRadius: 38,
            background: '#fff', border: '4px solid rgba(255,255,255,0.4)',
            boxShadow: '0 0 0 4px rgba(0,0,0,0.2)',
          }}/>
          <button style={{
            width: 56, height: 56, borderRadius: 28, background: F.acc,
            border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
          }}>Done</button>
        </div>
      </div>
    </PhoneContainer>
  );
}

// ─── Phone · Quick zone add (form) ────────────────────────────────
function FieldPhoneZone() {
  return (
    <PhoneContainer>
      {/* Header */}
      <div style={{ padding: '8px 16px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={{
          width: 44, height: 44, borderRadius: 10, background: F.surface,
          border: `1px solid ${F.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4l-5 5 5 5" stroke={F.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11.5, color: F.ink3, fontWeight: 600, textTransform: 'uppercase' }}>Damage zone · new</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 1, letterSpacing: -0.3 }}>Zone 06</div>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Zone picker */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: F.ink3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.03 }}>Where on the vehicle?</div>
          <div style={{ background: F.surface, border: `1px solid ${F.line}`, borderRadius: 12, padding: 12 }}>
            <svg width="100%" viewBox="0 0 300 140">
              <rect x="40" y="45" width="220" height="60" rx="10" stroke={F.lineStrong} strokeWidth="1.2" fill="none"/>
              <rect x="80" y="30" width="140" height="28" rx="6" stroke={F.lineStrong} strokeWidth="1.2" fill="none"/>
              <circle cx="90" cy="115" r="12" stroke={F.lineStrong} strokeWidth="1.2" fill="none"/>
              <circle cx="210" cy="115" r="12" stroke={F.lineStrong} strokeWidth="1.2" fill="none"/>
              {[[60,75,1],[90,45,2],[140,55,3],[180,50,4],[155,80,5]].map(([cx,cy,n]) => (
                <g key={n}><circle cx={cx} cy={cy} r="11" fill={F.ink}/><text x={cx} y={cy+4} textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="700" fill="#fff">{n}</text></g>
              ))}
              {/* New zone — pulsing */}
              <circle cx="230" cy="80" r="14" fill={F.acc}/>
              <circle cx="230" cy="80" r="22" fill="none" stroke={F.acc} strokeWidth="1.5" opacity="0.4"/>
              <text x="230" y="84" textAnchor="middle" fontSize="11" fontFamily="monospace" fontWeight="700" fill="#fff">6</text>
            </svg>
          </div>
        </div>

        {/* Condition chips */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: F.ink3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.03 }}>Condition</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Dented','Scuffed','Cracked','Creased','Scratched','Broken','Missing'].map((c, i) => (
              <button key={i} style={{
                height: 40, padding: '0 14px', borderRadius: 8,
                background: i === 0 ? F.ink : F.surface, color: i === 0 ? '#fff' : F.ink,
                border: `1px solid ${i === 0 ? F.ink : F.lineStrong}`, fontSize: 14, fontWeight: 500,
              }}>{c}</button>
            ))}
          </div>
        </div>

        {/* Action chips */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: F.ink3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.03 }}>Repair action</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Replace','Repair','Paint','PDR','R&R'].map((c, i) => (
              <button key={i} style={{
                height: 40, padding: '0 14px', borderRadius: 8,
                background: i === 1 ? F.ink : F.surface, color: i === 1 ? '#fff' : F.ink,
                border: `1px solid ${i === 1 ? F.ink : F.lineStrong}`, fontSize: 14, fontWeight: 500,
              }}>{c}</button>
            ))}
          </div>
        </div>

        {/* Photo row */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: F.ink3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.03 }}>Photos</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{
              width: 64, height: 64, borderRadius: 10, background: F.acc, border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="15" rx="2" stroke="#fff" strokeWidth="1.8"/><circle cx="12" cy="13.5" r="4" stroke="#fff" strokeWidth="1.8"/><path d="M8 6l1-2h6l1 2" stroke="#fff" strokeWidth="1.8"/></svg>
            </button>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 64, height: 64, borderRadius: 10,
                background: `repeating-linear-gradient(45deg, #e9e9e6, #e9e9e6 5px, #dcdcd8 5px, #dcdcd8 10px)`,
                border: `1px solid ${F.line}`,
              }}/>
            ))}
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px 28px',
        background: F.surface, borderTop: `1px solid ${F.line}`,
      }}>
        <button style={{
          width: '100%', height: 54, background: F.ink, color: '#fff',
          border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600,
        }}>Save zone</button>
      </div>
    </PhoneContainer>
  );
}

// ─── Tablet · Estimate (landscape, split-pane) ───────────────────
// Redesign of the estimate screen the user showed — same data,
// tablet-native layout: sticky totals rail, big lines, fat hit targets.
function FieldTabletEstimate() {
  const lines = [
    ['Part', 'Front bumper cover',           'Replace', 1,   2850, 2850, 'warn'],
    ['Part', 'Left headlight assembly',      'Replace', 1,   3120, 3120, 'ok'],
    ['Lab',  'Left fender — strip & refit',  'R&R',     2.5, 420,  1050, 'ok'],
    ['Pnt',  'Left fender — blend',          'Paint',   1.8, 380,  684,  'ok'],
    ['Lab',  'Bonnet PDR',                   'Repair',  1.5, 420,  630,  'ok'],
    ['Part', 'Bumper grille (non-OEM)',      'Replace', 1,   845,  845,  'warn'],
    ['Csm',  'Consumables (front)',          '-',       1,   650,  650,  'ok'],
  ];
  const fmt = (n) => 'R ' + n.toLocaleString('en-ZA');
  const typeColor = { Part: F.acc, Lab: '#0f766e', Pnt: '#7c3aed', Csm: F.ink3 };
  return (
    <FTabletShell title="Estimate" subtitle="ASM-2025-023 · Toyota Corolla · KDH 849 MP" step={9} totalSteps={13}>
      {/* Left: line items */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Action row */}
        <div style={{
          height: 64, background: F.surface, borderBottom: `1px solid ${F.line}`,
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, flexShrink: 0,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>Line items · {lines.length}</div>
          <button style={{ height: 44, padding: '0 16px', border: `1px solid ${F.lineStrong}`, borderRadius: 8, background: F.surface, fontSize: 14, fontWeight: 500 }}>Catalogue</button>
          <button style={{ height: 44, padding: '0 16px', border: `1px solid ${F.lineStrong}`, borderRadius: 8, background: F.surface, fontSize: 14, fontWeight: 500 }}>Import from zones</button>
          <button style={{ height: 44, padding: '0 18px', background: F.acc, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>+ Add line</button>
        </div>

        {/* Lines */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {lines.map((l, i) => {
            const sel = i === 0;
            return (
              <div key={i} style={{
                background: F.surface, border: `1px solid ${sel ? F.acc : F.line}`,
                borderRadius: 10, marginBottom: 8, padding: 14,
                display: 'grid', gridTemplateColumns: '48px 1fr 80px 70px 90px 110px 44px',
                gap: 14, alignItems: 'center',
                boxShadow: sel ? '0 0 0 3px rgba(29,78,216,0.08)' : 'none',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 8, background: F.bg,
                  color: typeColor[l[0]], display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'ui-monospace,monospace', fontSize: 12, fontWeight: 700,
                  border: `1px solid ${F.line}`,
                }}>{l[0]}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l[1]}</div>
                  <div style={{ fontSize: 12, color: F.ink3, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>{l[2]}</span>
                    {l[6] === 'warn' && <>
                      <span style={{ color: F.ink4 }}>·</span>
                      <span style={{ color: F.warn, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: 3, background: F.warn }}/>
                        Non-OEM — sign-off required
                      </span>
                    </>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="field-mono" style={{ fontSize: 15 }}>{l[3]}</div>
                  <div style={{ fontSize: 11, color: F.ink3 }}>qty</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="field-mono" style={{ fontSize: 15 }}>{l[4]}</div>
                  <div style={{ fontSize: 11, color: F.ink3 }}>rate</div>
                </div>
                <div className="field-mono" style={{ fontSize: 17, fontWeight: 700, textAlign: 'right' }}>{fmt(l[5])}</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button style={{
                    width: 44, height: 44, borderRadius: 8, background: F.surface,
                    border: `1px solid ${F.line}`, fontSize: 18, color: F.ink3,
                  }}>⋯</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: sticky totals rail */}
      <div style={{
        width: 360, background: F.surface, borderLeft: `1px solid ${F.line}`,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${F.line}` }}>
          <div style={{ fontSize: 11.5, color: F.ink3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.03 }}>Grand total (incl. VAT)</div>
          <div className="field-mono" style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1, marginTop: 4 }}>R 11 259.07</div>
          <div style={{ fontSize: 12, color: F.ink3, marginTop: 4 }}>Saved 4s ago · synced</div>
        </div>

        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${F.line}` }}>
          {[['Parts','R 6,815.00'],['Labour','R 1,680.00'],['Paint','R 684.00'],['Consumables','R 650.00'],['Sundries','R 562.50'],['VAT 15%','R 1,467.57']].map(r => (
            <div key={r[0]} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
              <span style={{ color: F.ink3 }}>{r[0]}</span>
              <span className="field-mono">{r[1]}</span>
            </div>
          ))}
        </div>

        {/* Delta vs baseline */}
        <div style={{ padding: '14px 20px', background: F.okSoft, borderBottom: `1px solid #bbf7d0` }}>
          <div style={{ fontSize: 11.5, color: F.ok, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.03 }}>Delta vs baseline</div>
          <div className="field-mono" style={{ fontSize: 20, fontWeight: 700, color: F.ok, marginTop: 2 }}>– R 5 692.00</div>
          <div style={{ fontSize: 12, color: F.ink2, marginTop: 2 }}>Settlement: repairer preferred</div>
        </div>

        {/* Policy checks */}
        <div style={{ padding: '14px 20px', flex: 1, overflow: 'auto' }}>
          <div style={{ fontSize: 11.5, color: F.ink3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.03, marginBottom: 10 }}>Policy checks</div>
          {[
            ['ok',   'Under sum insured (R 385 000)'],
            ['ok',   'Within excess threshold (R 5 500)'],
            ['warn', '2 non-OEM parts — client sign-off'],
            ['ok',   'Repairer in panel network'],
            ['ok',   '12/12 exterior photos attached'],
          ].map(([tone, text], i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0' }}>
              {tone === 'ok' ? (
                <svg width="18" height="18" viewBox="0 0 14 14" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="7" cy="7" r="6" fill={F.ok}/><path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 14 14" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="7" cy="7" r="6" fill={F.warn}/><path d="M7 4v3.5M7 10v.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/></svg>
              )}
              <span style={{ fontSize: 13.5, color: F.ink2, lineHeight: 1.4 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </FTabletShell>
  );
}

Object.assign(window, { FTabletShell, FieldTabletDamage, FieldTablet360, FieldTabletEstimate, FieldPhoneToday, FieldPhoneCapture, FieldPhoneZone });
