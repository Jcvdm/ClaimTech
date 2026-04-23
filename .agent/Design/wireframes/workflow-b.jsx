// Assessment detail screens — Direction C (Minimal)
// The core workflow: full assessment page with tab sidebar, damage grid, estimate.

function AssessSidebar({ active = 'damage' }) {
  const tabs = [
    ['summary', 'Summary', 100],
    ['identification', 'Identification', 100],
    ['exterior', 'Exterior 360°', 100],
    ['interior', 'Interior / Mech', 80],
    ['tyres', 'Tyres', 100],
    ['damage', 'Damage', 64],
    ['values', 'Vehicle values', 0],
    ['pre-incident', 'Pre-incident', 0],
    ['estimate', 'Estimate', 0],
    ['finalize', 'Finalize', 0],
    ['additionals', 'Additionals', 0],
    ['frc', 'FRC', 0],
    ['audit', 'Audit', 0],
  ];
  return (
    <div style={{
      width: 240, borderRight: '1px solid rgba(255,255,255,0.06)',
      padding: '20px 0', background: '#08090a', overflow: 'auto',
    }}>
      <div style={{ padding: '0 20px 16px' }}>
        <Eyebrow>Assessment · CT-4812</Eyebrow>
        <div className="ct-serif" style={{ fontSize: 22, letterSpacing: '-0.02em', marginTop: 8, lineHeight: 1.15 }}>
          Toyota Hilux<br/>
          <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.5)', fontSize: 18 }}>2.4 GD-6</span>
        </div>
      </div>
      <div style={{ padding: '0 8px' }}>
        {tabs.map(([id, l, pct]) => {
          const on = id === active, done = pct === 100;
          return (
            <div key={id} style={{
              padding: '10px 12px', fontSize: 13, marginBottom: 1, position: 'relative',
              display: 'flex', alignItems: 'center', gap: 10,
              background: on ? 'rgba(255,255,255,0.04)' : 'transparent',
              color: on ? '#fff' : done ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)',
            }}>
              {on && <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 2, background: 'var(--acc)' }} />}
              {done ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--acc)" strokeWidth="1.6">
                  <path d="M2 5l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <div style={{ width: 10, height: 10, borderRadius: 5, border: `1.5px solid ${on ? 'var(--acc)' : 'rgba(255,255,255,0.2)'}`, background: pct > 0 && !on ? 'conic-gradient(var(--acc) ' + (pct*3.6) + 'deg, transparent 0)' : 'transparent' }} />
              )}
              <span style={{ flex: 1 }}>{l}</span>
              {pct > 0 && pct < 100 && (
                <span className="ct-mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{pct}%</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 3. Damage tab ────────────────────────────────────────────────
function ScreenDamage() {
  const zones = [
    ['Front bumper', 'Dented', 'Replace', 'R 4,800'],
    ['Left headlight', 'Cracked', 'Replace', 'R 3,200'],
    ['Left fender', 'Creased', 'Repair & paint', 'R 2,650'],
    ['Left door', 'Scuffed', 'Paint', 'R 1,400'],
    ['Bonnet', 'Minor dent', 'PDR + paint', 'R 1,950'],
  ];
  return (
    <WorkShell active="Assessments" breadcrumb={['Home', 'Work', 'Assessments', 'CT-4812', 'Damage']}>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', height: '100%' }}>
        <AssessSidebar active="damage" />
        <div style={{ padding: '28px 36px', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
            <div>
              <Eyebrow>Step 6 of 13 · Damage</Eyebrow>
              <h2 className="ct-serif" style={{ fontSize: 40, margin: '10px 0 4px', letterSpacing: '-0.02em', fontWeight: 400 }}>
                Document <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.5)' }}>impact.</span>
              </h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>5 zones captured · 18 photos attached.</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ height: 34, padding: '0 14px', background: 'transparent', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 12.5 }}>+ Add zone</button>
              <button style={{ height: 34, padding: '0 14px', background: 'transparent', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 12.5 }}>Auto-save ●</button>
              <button style={{ height: 34, padding: '0 16px', background: 'var(--acc)', color: '#0a0a0a', border: 'none', fontSize: 12.5, fontWeight: 600 }}>Next: Values →</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28 }}>
            {/* Left: vehicle schematic + zone list */}
            <div>
              {/* Schematic */}
              <div style={{
                border: '1px solid rgba(255,255,255,0.06)', padding: 28,
                background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.02), transparent 70%)',
                marginBottom: 20, height: 260, position: 'relative',
              }}>
                <div style={{ position: 'absolute', top: 16, left: 20 }}>
                  <ColHeader>Vehicle schematic · tap zones</ColHeader>
                </div>
                {/* Simple rectangular vehicle outline */}
                <svg width="100%" height="100%" viewBox="0 0 600 200" fill="none" style={{ maxHeight: 200, display: 'block', margin: '20px auto 0' }}>
                  <rect x="80" y="60" width="440" height="100" rx="14" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
                  <rect x="140" y="40" width="320" height="40" rx="8" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
                  <circle cx="170" cy="170" r="18" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
                  <circle cx="430" cy="170" r="18" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
                  {/* damage markers */}
                  {[[90, 100, 1], [115, 65, 2], [180, 80, 3], [240, 72, 4], [200, 110, 5]].map(([cx, cy, n], i) => (
                    <g key={i}>
                      <circle cx={cx} cy={cy} r="11" fill="var(--acc)" opacity="0.18" />
                      <circle cx={cx} cy={cy} r="5" fill="var(--acc)" />
                      <text x={cx} y={cy + 2.5} textAnchor="middle" fontSize="8" fontFamily="Geist Mono, monospace" fontWeight="600" fill="#0a0a0a">{n}</text>
                    </g>
                  ))}
                </svg>
              </div>

              {/* Zone table */}
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '40px 1.4fr 1fr 1fr 110px 40px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', gap: 14 }}>
                  <ColHeader>#</ColHeader>
                  <ColHeader>Zone</ColHeader>
                  <ColHeader>Condition</ColHeader>
                  <ColHeader>Action</ColHeader>
                  <ColHeader>Labour</ColHeader>
                  <span />
                </div>
                {zones.map((z, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '40px 1.4fr 1fr 1fr 110px 40px',
                    padding: '14px 0', gap: 14, alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13,
                  }}>
                    <span className="ct-mono" style={{ fontSize: 11, color: 'var(--acc)' }}>0{i+1}</span>
                    <span>{z[0]}</span>
                    <span style={{ color: 'rgba(255,255,255,0.75)' }}>{z[1]}</span>
                    <Pill>{z[2]}</Pill>
                    <span className="ct-mono" style={{ fontSize: 12 }}>{z[3]}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>⋯</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: photos + notes */}
            <div>
              <Eyebrow>Zone 01 · Photos</Eyebrow>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 14 }}>
                {[0,1,2,3,4,5].map(i => (
                  <div key={i} style={{
                    aspectRatio: '1', background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
                    border: '1px solid rgba(255,255,255,0.06)', position: 'relative',
                  }}>
                    <div style={{ position: 'absolute', bottom: 6, left: 6, fontSize: 10, fontFamily: 'Geist Mono, monospace', color: 'rgba(255,255,255,0.4)' }}>IMG_0{i+1}</div>
                  </div>
                ))}
                <div style={{
                  aspectRatio: '1', border: '1px dashed rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: 'rgba(255,255,255,0.4)',
                }}>+ Add</div>
              </div>
              <div style={{ marginTop: 24 }}>
                <Eyebrow>Notes</Eyebrow>
                <div style={{
                  marginTop: 10, border: '1px solid rgba(255,255,255,0.08)',
                  padding: 14, fontSize: 13, color: 'rgba(255,255,255,0.8)', minHeight: 120,
                  lineHeight: 1.5,
                }}>
                  Front bumper dented in from impact with stationary bollard. Clip points intact; replacement recommended over repair due to structural deformation of absorber foam.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WorkShell>
  );
}

// ─── 4. Estimate tab ──────────────────────────────────────────────
function ScreenEstimate() {
  const lines = [
    ['BUM-F-REP', 'Front bumper — replace', 'Part', 1, 'R 4,800', 'R 4,800'],
    ['HL-L-REP', 'Left headlight assy — replace', 'Part', 1, 'R 3,200', 'R 3,200'],
    ['FND-L-RP', 'Left fender — repair & paint', 'Labour', 4.5, 'R 420', 'R 1,890'],
    ['DR-L-P', 'Left door — paint only', 'Paint', 2.0, 'R 380', 'R 760'],
    ['BNT-PDR', 'Bonnet — PDR', 'Labour', 1.5, 'R 420', 'R 630'],
    ['CSMB-F', 'Front consumables', 'Consumable', 1, 'R 650', 'R 650'],
  ];
  return (
    <WorkShell active="Assessments" breadcrumb={['Home', 'Work', 'Assessments', 'CT-4812', 'Estimate']}>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', height: '100%' }}>
        <AssessSidebar active="estimate" />
        <div style={{ padding: '28px 36px', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
            <div>
              <Eyebrow>Step 9 of 13 · Estimate</Eyebrow>
              <h2 className="ct-serif" style={{ fontSize: 40, margin: '10px 0 4px', letterSpacing: '-0.02em', fontWeight: 400 }}>
                Build the <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.5)' }}>quote.</span>
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ height: 34, padding: '0 14px', background: 'transparent', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 12.5 }}>Import from catalogue</button>
              <button style={{ height: 34, padding: '0 14px', background: 'transparent', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 12.5 }}>Generate PDF</button>
              <button style={{ height: 34, padding: '0 16px', background: 'var(--acc)', color: '#0a0a0a', border: 'none', fontSize: 12.5, fontWeight: 600 }}>Submit for auth →</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>
            <div>
              {/* Line items */}
              <div style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 2fr 100px 60px 110px 110px', padding: '12px 16px', gap: 14, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Code', 'Description', 'Type', 'Qty', 'Rate', 'Total'].map((h,i)=>(<ColHeader key={i}>{h}</ColHeader>))}
                </div>
                {lines.map((l, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '110px 2fr 100px 60px 110px 110px',
                    padding: '14px 16px', gap: 14, alignItems: 'center', fontSize: 13,
                    borderBottom: i < lines.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    <span className="ct-mono" style={{ fontSize: 11, color: 'var(--acc)' }}>{l[0]}</span>
                    <span>{l[1]}</span>
                    <Pill>{l[2]}</Pill>
                    <span className="ct-mono" style={{ fontSize: 12 }}>{l[3]}</span>
                    <span className="ct-mono" style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{l[4]}</span>
                    <span className="ct-mono" style={{ fontSize: 12 }}>{l[5]}</span>
                  </div>
                ))}
                <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                  + Add line
                </div>
              </div>
            </div>

            {/* Right: totals + policy */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', padding: 24 }}>
                <Eyebrow>Total</Eyebrow>
                <div style={{ marginTop: 16 }}>
                  {[
                    ['Parts', 'R 8,000'],
                    ['Labour', 'R 2,520'],
                    ['Paint', 'R 760'],
                    ['Consumables', 'R 650'],
                    ['Subtotal', 'R 11,930'],
                    ['VAT 15%', 'R 1,790'],
                  ].map((r,i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: i >= 4 ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                      <span>{r[0]}</span>
                      <span className="ct-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>{r[1]}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 12, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="ct-mono" style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Grand total</span>
                      <span className="ct-serif" style={{ fontSize: 32, letterSpacing: '-0.02em' }}>R 13,720</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ border: '1px solid rgba(255,255,255,0.06)', padding: 20 }}>
                <Eyebrow>Policy check</Eyebrow>
                <div style={{ marginTop: 14, fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    ['✓', 'Under sum insured (R 385k)', '#6ad19a'],
                    ['✓', 'Within excess threshold', '#6ad19a'],
                    ['!', 'Uses non-OEM headlight — flag', '#e4a86a'],
                  ].map(([i, t, c], k) => (
                    <div key={k} style={{ display: 'flex', gap: 10 }}>
                      <span className="ct-mono" style={{ color: c, width: 14 }}>{i}</span>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WorkShell>
  );
}

Object.assign(window, { AssessSidebar, ScreenDamage, ScreenEstimate });
