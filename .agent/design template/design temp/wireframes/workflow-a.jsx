// Assessment workflow screens — Direction C (Minimal) language.
// Near-black base, off-white single accent, generous whitespace,
// Instrument Serif display + Geist Mono micro-labels + Inter UI.

// ─── Shared workspace shell (sidebar + topbar) ────────────────────
function WorkShell({ active = 'Assessments', breadcrumb = ['Home', 'Work', 'Assessments'], children }) {
  const nav = [
    ['Dashboard', 'Dashboard'],
    ['Work queue', 'Work queue'],
    ['Requests', 'Requests'],
    ['Assessments', 'Assessments'],
    ['Clients', 'Clients'],
    ['Repairers', 'Repairers'],
    ['Quotes', 'Quotes'],
    ['Engineers', 'Engineers'],
  ];
  return (
    <div className="ct" style={{
      width: 1440, height: 900, background: '#0a0a0b', color: '#fff',
      display: 'grid', gridTemplateColumns: '220px 1fr',
    }}>
      <div style={{
        background: '#08090a', borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', padding: '24px 0',
      }}>
        <div style={{ padding: '0 22px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <CTWordmark />
        </div>
        <div style={{ padding: '16px 12px' }}>
          <div className="ct-mono" style={{ fontSize: 9, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.3)', padding: '6px 10px 10px', textTransform: 'uppercase' }}>
            Workspace
          </div>
          {nav.map(([l, key], i) => {
            const on = key === active;
            return (
              <div key={i} style={{
                padding: '9px 12px', fontSize: 13, borderRadius: 2, marginBottom: 2,
                display: 'flex', alignItems: 'center', gap: 10, position: 'relative',
                background: on ? 'rgba(255,255,255,0.04)' : 'transparent',
                color: on ? '#fff' : 'rgba(255,255,255,0.65)',
              }}>
                {on && <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 2, background: 'var(--acc)' }} />}
                <div style={{ width: 6, height: 6, borderRadius: 1, background: on ? 'var(--acc)' : 'rgba(255,255,255,0.2)' }} />
                {l}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: 2, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--acc)' }}>J</div>
            <div><div style={{ fontSize: 12, fontWeight: 500 }}>JCVDM</div>
              <div className="ct-mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Admin</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          height: 48, padding: '0 28px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div className="ct-mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
            {breadcrumb.map((b, i) => (
              <span key={i}>{i > 0 && <span style={{ margin: '0 8px', opacity: 0.4 }}>/</span>}{b}</span>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
            <div style={{
              width: 240, height: 28, border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8,
              fontSize: 12, color: 'rgba(255,255,255,0.45)',
            }}>
              <span>Search…</span>
              <span className="ct-mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>⌘K</span>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

// Tiny helpers
function Pill({ children, tone = 'muted' }) {
  const tones = {
    muted: { bg: 'rgba(255,255,255,0.04)', bd: 'rgba(255,255,255,0.1)', fg: 'rgba(255,255,255,0.75)' },
    live: { bg: 'transparent', bd: 'rgba(106,209,154,0.3)', fg: '#6ad19a' },
    warn: { bg: 'transparent', bd: 'rgba(228,168,106,0.3)', fg: '#e4a86a' },
    accent: { bg: 'var(--acc)', bd: 'var(--acc)', fg: '#0a0a0a' },
  };
  const t = tones[tone];
  return <span className="ct-mono" style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
    padding: '3px 8px', border: `1px solid ${t.bd}`, background: t.bg, color: t.fg,
  }}>{children}</span>;
}

function ColHeader({ children }) {
  return <div className="ct-mono" style={{
    fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)', fontWeight: 500,
  }}>{children}</div>;
}


// ─── 1. Work queue (list view) ───────────────────────────────────
function ScreenWorkQueue() {
  const tabs = [
    ['All', 47, false], ['Inspections', 8, false], ['Appointments', 12, false],
    ['Assessments', 14, true], ['Additionals', 4, false], ['FRC', 6, false],
    ['Finalized', 3, false],
  ];
  const rows = [
    ['CT-4812', 'Toyota Hilux 2.4 GD-6', 'ABC 123 GP', 'Hatfield Auto', 'In assessment', '21 Apr', 'J. van der Merwe', 67, 'live'],
    ['CT-4811', 'VW Polo Vivo 1.4', 'XYZ 987 GP', 'Menlyn Body', 'Awaiting photos', '21 Apr', 'K. Nkosi', 42, 'warn'],
    ['CT-4810', 'Ford Ranger 2.2 XLT', 'DEF 456 MP', 'Rosebank Panel', 'Quoted', '20 Apr', 'J. van der Merwe', 100, 'live'],
    ['CT-4809', 'BMW 320i F30', 'GHI 789 GP', 'Sandton Motors', 'Authorised', '20 Apr', 'L. Mokoena', 100, 'live'],
    ['CT-4808', 'Isuzu D-Max 2.5', 'JKL 012 FS', 'Bloem Auto', 'FRC pending', '19 Apr', 'T. Smith', 85, 'warn'],
    ['CT-4807', 'Mazda CX-5 2.0', 'MNO 345 GP', 'Randburg Panel', 'Invoiced', '18 Apr', 'K. Nkosi', 100, 'muted'],
    ['CT-4806', 'Hyundai i20 1.4', 'PQR 678 WC', 'Cape Panel', 'In assessment', '18 Apr', 'J. van der Merwe', 34, 'live'],
    ['CT-4805', 'Mercedes C200', 'STU 901 GP', 'Sandton Motors', 'Additionals', '17 Apr', 'L. Mokoena', 72, 'warn'],
  ];
  return (
    <WorkShell active="Assessments" breadcrumb={['Home', 'Work']}>
      <div style={{ padding: '32px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36 }}>
          <div>
            <Eyebrow>Workspace · {new Date().toDateString()}</Eyebrow>
            <h1 className="ct-serif" style={{ fontSize: 48, margin: '12px 0 6px', letterSpacing: '-0.02em', fontWeight: 400, lineHeight: 1 }}>
              Work <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.45)' }}>queue.</span>
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>47 active items across 5 stages.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{
              height: 36, padding: '0 14px', background: 'transparent', color: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(255,255,255,0.12)', fontSize: 12.5, letterSpacing: 0.1,
            }}>Filter</button>
            <button style={{
              height: 36, padding: '0 16px', background: 'var(--acc)', color: '#0a0a0a',
              border: 'none', fontSize: 12.5, fontWeight: 600, letterSpacing: 0.1,
            }}>+ New request</button>
          </div>
        </div>

        {/* Stage tabs */}
        <div style={{ display: 'flex', gap: 28, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 0 }}>
          {tabs.map(([l, c, on], i) => (
            <div key={i} style={{
              padding: '14px 0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
              color: on ? '#fff' : 'rgba(255,255,255,0.55)',
              borderBottom: on ? '1.5px solid var(--acc)' : '1.5px solid transparent',
              marginBottom: -1,
            }}>
              {l}
              <span className="ct-mono" style={{
                fontSize: 10, color: on ? 'var(--acc)' : 'rgba(255,255,255,0.35)',
                padding: '2px 6px', border: '1px solid rgba(255,255,255,0.1)',
              }}>{c}</span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div>
          <div style={{
            display: 'grid', gridTemplateColumns: '110px 1.4fr 130px 1.2fr 140px 80px 140px 110px',
            padding: '14px 0', gap: 16,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {['Ref', 'Vehicle', 'Plate', 'Shop', 'Stage', 'Date', 'Engineer', 'Progress'].map((h, i) => (
              <ColHeader key={i}>{h}</ColHeader>
            ))}
          </div>
          {rows.map((r, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '110px 1.4fr 130px 1.2fr 140px 80px 140px 110px',
              padding: '16px 0', gap: 16, alignItems: 'center', fontSize: 13,
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              <span className="ct-mono" style={{ fontSize: 12, color: 'var(--acc)' }}>{r[0]}</span>
              <span>{r[1]}</span>
              <span className="ct-mono" style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{r[2]}</span>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{r[3]}</span>
              <Pill tone={r[8]}>{r[4]}</Pill>
              <span className="ct-mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{r[5]}</span>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{r[6]}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.06)' }}>
                  <div style={{ width: `${r[7]}%`, height: '100%', background: 'var(--acc)' }} />
                </div>
                <span className="ct-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', minWidth: 26, textAlign: 'right' }}>{r[7]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </WorkShell>
  );
}


// ─── 2. Request detail ───────────────────────────────────────────
function ScreenRequestDetail() {
  const steps = [
    ['Request', 'done'], ['Inspection', 'done'], ['Appointment', 'done'],
    ['Assessment', 'current'], ['Quote', 'pending'], ['Authorisation', 'pending'], ['FRC', 'pending'],
  ];
  return (
    <WorkShell active="Requests" breadcrumb={['Home', 'Requests', 'CT-4812']}>
      <div style={{ padding: '32px 40px' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <span className="ct-mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.2em' }}>← BACK</span>
            <span className="ct-mono" style={{ fontSize: 11, color: 'var(--acc)', letterSpacing: '0.2em' }}>CT-4812</span>
            <Pill tone="live">Active</Pill>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <h1 className="ct-serif" style={{ fontSize: 48, margin: 0, letterSpacing: '-0.02em', fontWeight: 400, lineHeight: 1 }}>
                Toyota Hilux 2.4 GD-6 <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.45)' }}>Raider.</span>
              </h1>
              <p className="ct-mono" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '14px 0 0', letterSpacing: '0.1em' }}>
                ABC 123 GP · AHTFR22G70 7012847 · 67,420 km
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ height: 36, padding: '0 14px', background: 'transparent', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 12.5 }}>Edit</button>
              <button style={{ height: 36, padding: '0 16px', background: 'var(--acc)', color: '#0a0a0a', border: 'none', fontSize: 12.5, fontWeight: 600 }}>Continue assessment →</button>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div style={{ border: '1px solid rgba(255,255,255,0.06)', padding: '24px 28px', marginBottom: 32 }}>
          <Eyebrow>Claim progression</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, 1fr)`, marginTop: 18, gap: 0 }}>
            {steps.map(([l, s], i) => {
              const done = s === 'done', cur = s === 'current';
              return (
                <div key={i} style={{ position: 'relative', paddingRight: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: 5,
                      background: done ? 'var(--acc)' : cur ? 'transparent' : 'rgba(255,255,255,0.1)',
                      border: cur ? '1.5px solid var(--acc)' : 'none',
                    }} />
                    {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: done ? 'var(--acc)' : 'rgba(255,255,255,0.08)' }} />}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: cur ? 600 : 400, color: cur || done ? '#fff' : 'rgba(255,255,255,0.5)' }}>{l}</div>
                  <div className="ct-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', marginTop: 3, textTransform: 'uppercase' }}>
                    {done ? 'Complete' : cur ? 'In progress' : 'Pending'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Two column: details + timeline */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32 }}>
          <div>
            <Eyebrow>Request details</Eyebrow>
            <div style={{ marginTop: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                ['Client', 'Santam Insurance'], ['Policy', 'POL-882-4471'],
                ['Insured', 'M. Dlamini'], ['Contact', '+27 82 555 0191 · mdlamini@gmail.com'],
                ['Loss date', '18 April 2026'], ['Type', 'Collision · front-left quarter'],
                ['Excess', 'R 5,500'], ['Location', 'Hatfield, Pretoria'],
              ].map(([k, v], i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '140px 1fr', padding: '14px 18px',
                  fontSize: 13, borderBottom: i < 7 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <span className="ct-mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Eyebrow>Activity</Eyebrow>
            <div style={{ marginTop: 16, borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: 20 }}>
              {[
                ['21 Apr · 14:22', 'Assessment started', 'J. van der Merwe'],
                ['21 Apr · 09:08', 'Appointment confirmed at Hatfield Auto', 'System'],
                ['20 Apr · 16:45', 'Inspection photos uploaded · 24 files', 'K. Nkosi'],
                ['20 Apr · 10:12', 'Request assigned', 'L. Mokoena'],
                ['19 Apr · 11:30', 'Request created', 'Santam API'],
              ].map(([t, l, who], i) => (
                <div key={i} style={{ position: 'relative', paddingBottom: 20 }}>
                  <div style={{ position: 'absolute', left: -25, top: 5, width: 9, height: 9, border: '1.5px solid var(--acc)', borderRadius: 5, background: '#0a0a0b' }} />
                  <div className="ct-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{t}</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>{l}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{who}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WorkShell>
  );
}

Object.assign(window, { WorkShell, Pill, ColHeader, ScreenWorkQueue, ScreenRequestDetail });
