// Utilitarian work screens — for daily use.
// Calm, light, dense, predictable. Reuses UShell + primitives.

// ─── Work queue · utilitarian ─────────────────────────────────────
function UWorkQueue() {
  const rows = [
    ['CT-4812', 'Toyota Hilux 2.4 GD-6', 'ABC 123 GP', 'Hatfield Auto', 'Assessment', 'Van der Merwe', '21 Apr', 67, 'In progress', 'info'],
    ['CT-4811', 'VW Polo Vivo 1.4',      'XYZ 987 GP', 'Menlyn Body',   'Assessment', 'Nkosi',          '21 Apr', 42, 'Waiting photos', 'warn'],
    ['CT-4810', 'Ford Ranger 2.2 XLT',   'DEF 456 MP', 'Rosebank Panel','Quote',      'Van der Merwe', '20 Apr', 100,'Quoted', 'ok'],
    ['CT-4809', 'BMW 320i F30',          'GHI 789 GP', 'Sandton Motors','Authorisation','Mokoena',     '20 Apr', 100,'Authorised', 'ok'],
    ['CT-4808', 'Isuzu D-Max 2.5',       'JKL 012 FS', 'Bloem Auto',    'FRC',        'Smith',          '19 Apr', 85, 'FRC pending', 'warn'],
    ['CT-4807', 'Mazda CX-5 2.0',        'MNO 345 GP', 'Randburg Panel','Invoice',    'Nkosi',          '18 Apr', 100,'Invoiced', 'muted'],
    ['CT-4806', 'Hyundai i20 1.4',       'PQR 678 WC', 'Cape Panel',    'Assessment', 'Van der Merwe', '18 Apr', 34, 'In progress', 'info'],
    ['CT-4805', 'Mercedes C200',         'STU 901 GP', 'Sandton Motors','Additionals','Mokoena',        '17 Apr', 72, 'Additionals', 'warn'],
    ['CT-4804', 'Nissan Navara 2.5',     'VWX 234 GP', 'Midrand Panel', 'Assessment', 'Smith',          '17 Apr', 18, 'Started', 'info'],
    ['CT-4803', 'Kia Picanto 1.2',       'YZA 567 GP', 'Centurion Body','Quote',      'Nkosi',          '16 Apr', 100,'Quoted', 'ok'],
  ];
  const tabs = [['All', 47, false], ['Inspections', 8], ['Appointments', 12], ['Assessments', 14, true], ['Additionals', 4], ['FRC', 6], ['Finalized', 3]];
  return (
    <UShell
      active="Work"
      breadcrumb={['Work']}
      title="Work queue"
      subtitle="47 active items · 18 assigned to you"
      actions={<>
        <UBtn variant="secondary">Export</UBtn>
        <UBtn variant="secondary">Filter</UBtn>
        <UBtn variant="primary">+ New request</UBtn>
      </>}
    >
      {/* Tab row */}
      <div style={{ background: U.surface, borderBottom: `1px solid ${U.line}`, padding: '0 24px', display: 'flex', gap: 24 }}>
        {tabs.map(([l, c, on], i) => (
          <div key={i} className={on ? 'u-tab u-tab-active' : 'u-tab'} style={{
            padding: '10px 0', fontSize: 13.5, color: on ? U.ink : U.ink2,
            fontWeight: on ? 600 : 500, display: 'flex', gap: 7, alignItems: 'center',
          }}>
            {l}
            <span className="util-mono" style={{
              fontSize: 11, padding: '1px 6px', borderRadius: 3,
              background: on ? U.ink : U.surfaceAlt, color: on ? '#fff' : U.ink3,
              border: `1px solid ${on ? U.ink : U.line}`,
            }}>{c}</span>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div style={{ background: U.surface, borderBottom: `1px solid ${U.line}`, padding: '10px 24px', display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
        <span style={{ color: U.ink3 }}>Showing:</span>
        <UBadge tone="muted">Assigned: Me</UBadge>
        <UBadge tone="muted">Stage: Any</UBadge>
        <UBadge tone="muted">Last 30 days</UBadge>
        <span style={{ marginLeft: 'auto', color: U.ink3, fontSize: 12.5 }}>Sorted: <span style={{ color: U.ink, fontWeight: 500 }}>Date ↓</span></span>
      </div>

      {/* Table */}
      <div style={{ padding: '0 24px 24px' }}>
        <div style={{ background: U.surface, border: `1px solid ${U.line}`, borderRadius: 4, marginTop: 16 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '24px 96px 1.4fr 120px 1.2fr 120px 130px 80px 140px 100px',
            padding: '10px 16px', gap: 12, fontSize: 11.5, color: U.ink3, fontWeight: 600,
            borderBottom: `1px solid ${U.line}`, background: U.surfaceAlt, letterSpacing: 0.02, textTransform: 'uppercase',
            position: 'sticky', top: 0,
          }}>
            <input type="checkbox" style={{ margin: 0 }} />
            <span>Ref</span><span>Vehicle</span><span>Plate</span><span>Shop</span>
            <span>Stage</span><span>Status</span><span>Date</span><span>Engineer</span><span>Progress</span>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="u-row" style={{
              display: 'grid', gridTemplateColumns: '24px 96px 1.4fr 120px 1.2fr 120px 130px 80px 140px 100px',
              padding: '11px 16px', gap: 12, fontSize: 13.5, alignItems: 'center',
              borderBottom: i < rows.length - 1 ? `1px solid ${U.line}` : 'none',
            }}>
              <input type="checkbox" style={{ margin: 0 }} />
              <span className="util-mono" style={{ fontSize: 12.5, color: U.acc, fontWeight: 500 }}>{r[0]}</span>
              <span style={{ fontWeight: 500 }}>{r[1]}</span>
              <span className="util-mono" style={{ fontSize: 12.5, color: U.ink2 }}>{r[2]}</span>
              <span style={{ color: U.ink2 }}>{r[3]}</span>
              <span style={{ color: U.ink2 }}>{r[4]}</span>
              <UBadge tone={r[9]}>{r[8]}</UBadge>
              <span className="util-mono" style={{ fontSize: 12, color: U.ink3 }}>{r[6]}</span>
              <span style={{ color: U.ink2 }}>{r[5]}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 4, background: U.line, borderRadius: 2 }}>
                  <div style={{ width: `${r[7]}%`, height: '100%', background: r[7] === 100 ? U.ok : U.ink, borderRadius: 2 }} />
                </div>
                <span className="util-mono" style={{ fontSize: 11, color: U.ink3, minWidth: 24, textAlign: 'right' }}>{r[7]}%</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 4px', fontSize: 12.5, color: U.ink3 }}>
          <span>1–10 of 47</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <UBtn variant="secondary">Prev</UBtn>
            <UBtn variant="secondary">Next</UBtn>
          </div>
        </div>
      </div>
    </UShell>
  );
}


// ─── Assessment · Damage (utilitarian) ────────────────────────────
function UAssessSidebar({ active = 'damage' }) {
  const tabs = [
    ['summary', 'Summary', 100], ['identification', 'Identification', 100],
    ['exterior', 'Exterior 360°', 100], ['interior', 'Interior / Mech', 80],
    ['tyres', 'Tyres', 100], ['damage', 'Damage', 64],
    ['values', 'Vehicle values', 0], ['pre-incident', 'Pre-incident', 0],
    ['estimate', 'Estimate', 0], ['finalize', 'Finalize', 0],
    ['additionals', 'Additionals', 0], ['frc', 'FRC', 0], ['audit', 'Audit', 0],
  ];
  return (
    <aside style={{
      width: 232, background: U.surface, borderRight: `1px solid ${U.line}`,
      overflow: 'auto', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${U.line}` }}>
        <div style={{ fontSize: 11, color: U.ink3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.03 }}>Assessment</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>CT-4812 · Hilux</div>
        <div style={{ fontSize: 12, color: U.ink3, marginTop: 2 }}>ABC 123 GP · Santam</div>
      </div>
      <div style={{ padding: '4px 8px', borderBottom: `1px solid ${U.line}` }}>
        <div style={{ padding: '8px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 4, background: U.line, borderRadius: 2 }}>
            <div style={{ width: '54%', height: '100%', background: U.ink, borderRadius: 2 }} />
          </div>
          <span className="util-mono" style={{ fontSize: 11, color: U.ink3 }}>7 / 13</span>
        </div>
      </div>
      <nav style={{ padding: '6px 0', flex: 1, overflow: 'auto' }}>
        {tabs.map(([id, l, pct]) => {
          const on = id === active, done = pct === 100;
          return (
            <div key={id} style={{
              padding: '7px 16px', fontSize: 13.5,
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              background: on ? U.surfaceAlt : 'transparent',
              color: on ? U.ink : done ? U.ink : U.ink2,
              fontWeight: on ? 600 : 400,
              borderLeft: on ? `2px solid ${U.ink}` : '2px solid transparent',
              paddingLeft: on ? 14 : 16,
            }}>
              {done ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" fill={U.ok} />
                  <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : pct > 0 ? (
                <svg width="14" height="14" viewBox="0 0 14 14">
                  <circle cx="7" cy="7" r="6" fill="none" stroke={U.line} strokeWidth="1.5" />
                  <circle cx="7" cy="7" r="6" fill="none" stroke={U.ink} strokeWidth="1.5"
                    strokeDasharray={`${(pct/100)*37.7} 37.7`} transform="rotate(-90 7 7)" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="none" stroke={U.lineStrong} strokeWidth="1.5" /></svg>
              )}
              <span style={{ flex: 1 }}>{l}</span>
              {pct > 0 && pct < 100 && <span className="util-mono" style={{ fontSize: 10.5, color: U.ink3 }}>{pct}%</span>}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function UDamage() {
  const zones = [
    ['FB', 'Front bumper', 'Dented',   'Replace',        'R 4,800',  6, true],
    ['HL', 'Left headlight','Cracked', 'Replace',        'R 3,200',  3, true],
    ['FD', 'Left fender',  'Creased',  'Repair & paint', 'R 2,650',  4, true],
    ['DR', 'Left door',    'Scuffed',  'Paint',          'R 1,400',  3, false],
    ['BN', 'Bonnet',       'Minor dent','PDR + paint',   'R 1,950',  2, false],
  ];
  return (
    <UShell active="Assessments" breadcrumb={['Work','Assessment','CT-4812','Damage']}>
      <div style={{ display: 'grid', gridTemplateColumns: '232px 1fr', height: '100%' }}>
        <UAssessSidebar active="damage" />
        <div style={{ overflow: 'auto' }}>
          {/* Page header bar */}
          <div style={{ background: U.surface, borderBottom: `1px solid ${U.line}`, padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11.5, color: U.ink3, fontWeight: 500 }}>Step 6 of 13</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>Damage</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: U.ink3 }}>Autosaved 2s ago</span>
              <UBtn variant="secondary">Previous</UBtn>
              <UBtn variant="primary">Next: Vehicle values →</UBtn>
            </div>
          </div>

          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
            {/* Left col */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Schematic card */}
              <div style={{ background: U.surface, border: `1px solid ${U.line}`, borderRadius: 4 }}>
                <div style={{ padding: '10px 16px', borderBottom: `1px solid ${U.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Vehicle schematic</div>
                  <div style={{ fontSize: 12, color: U.ink3 }}>Tap a zone to add · 5 captured</div>
                </div>
                <div style={{ padding: 20, background: U.surfaceAlt }}>
                  <svg width="100%" viewBox="0 0 600 200" fill="none" style={{ maxHeight: 180, display: 'block', margin: '0 auto' }}>
                    <rect x="80" y="60" width="440" height="100" rx="14" stroke={U.lineStrong} strokeWidth="1.2" fill={U.surface}/>
                    <rect x="140" y="40" width="320" height="40" rx="8" stroke={U.lineStrong} strokeWidth="1.2" fill={U.surface}/>
                    <circle cx="170" cy="170" r="18" stroke={U.lineStrong} strokeWidth="1.2" fill={U.surface}/>
                    <circle cx="430" cy="170" r="18" stroke={U.lineStrong} strokeWidth="1.2" fill={U.surface}/>
                    {[[100, 105, 1], [125, 65, 2], [195, 80, 3], [255, 75, 4], [215, 110, 5]].map(([cx, cy, n], i) => (
                      <g key={i}>
                        <circle cx={cx} cy={cy} r="11" fill={U.acc} />
                        <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize="10" fontFamily="ui-monospace,monospace" fontWeight="600" fill="#fff">{n}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* Zones table */}
              <div style={{ background: U.surface, border: `1px solid ${U.line}`, borderRadius: 4 }}>
                <div style={{ padding: '10px 16px', borderBottom: `1px solid ${U.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Damage zones <span style={{ color: U.ink3, fontWeight: 400 }}>· 5</span></div>
                  <UBtn variant="secondary">+ Add zone</UBtn>
                </div>
                <div style={{
                  display: 'grid', gridTemplateColumns: '40px 56px 1.4fr 1fr 1.2fr 110px 90px 40px',
                  padding: '8px 16px', gap: 12, fontSize: 11.5, color: U.ink3, fontWeight: 600,
                  borderBottom: `1px solid ${U.line}`, background: U.surfaceAlt, textTransform: 'uppercase', letterSpacing: 0.03,
                }}>
                  <span>#</span><span>Code</span><span>Zone</span><span>Condition</span><span>Action</span><span>Est.</span><span>Photos</span><span></span>
                </div>
                {zones.map((z, i) => (
                  <div key={i} className="u-row" style={{
                    display: 'grid', gridTemplateColumns: '40px 56px 1.4fr 1fr 1.2fr 110px 90px 40px',
                    padding: '12px 16px', gap: 12, alignItems: 'center', fontSize: 13.5,
                    borderBottom: i < zones.length - 1 ? `1px solid ${U.line}` : 'none',
                    background: i === 0 ? U.accSoft : 'transparent',
                  }}>
                    <span className="util-mono" style={{ fontSize: 12, color: U.ink3 }}>{String(i+1).padStart(2,'0')}</span>
                    <span className="util-mono" style={{ fontSize: 12, color: U.acc, fontWeight: 600 }}>{z[0]}</span>
                    <span style={{ fontWeight: 500 }}>{z[1]}</span>
                    <span style={{ color: U.ink2 }}>{z[2]}</span>
                    <UBadge tone="muted">{z[3]}</UBadge>
                    <span className="util-mono" style={{ fontSize: 12.5, fontWeight: 500 }}>{z[4]}</span>
                    <span style={{ fontSize: 12.5, color: z[6] ? U.ok : U.warn, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 3, background: z[6] ? U.ok : U.warn }} />
                      {z[5]}
                    </span>
                    <span style={{ color: U.ink3, textAlign: 'center', cursor: 'pointer' }}>⋯</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right col */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: U.surface, border: `1px solid ${U.line}`, borderRadius: 4 }}>
                <div style={{ padding: '10px 16px', borderBottom: `1px solid ${U.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Zone 01 · Front bumper</div>
                  <UBadge tone="info">Editing</UBadge>
                </div>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <ULabel>Condition</ULabel>
                    <select style={{ width: '100%', height: 30, padding: '0 8px', fontSize: 13.5, border: `1px solid ${U.lineStrong}`, borderRadius: 4, background: U.surface }}>
                      <option>Dented</option>
                    </select>
                  </div>
                  <div>
                    <ULabel>Repair action</ULabel>
                    <select style={{ width: '100%', height: 30, padding: '0 8px', fontSize: 13.5, border: `1px solid ${U.lineStrong}`, borderRadius: 4, background: U.surface }}>
                      <option>Replace</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><ULabel>Labour (hrs)</ULabel><input defaultValue="2.5" style={{ width: '100%', height: 30, padding: '0 8px', border: `1px solid ${U.lineStrong}`, borderRadius: 4, fontSize: 13.5 }}/></div>
                    <div><ULabel>Part (R)</ULabel><input defaultValue="4800" style={{ width: '100%', height: 30, padding: '0 8px', border: `1px solid ${U.lineStrong}`, borderRadius: 4, fontSize: 13.5 }}/></div>
                  </div>
                  <div>
                    <ULabel>Notes</ULabel>
                    <textarea rows={3} defaultValue="Impact with bollard. Clip points intact, absorber foam deformed — replace."
                      style={{ width: '100%', padding: 8, border: `1px solid ${U.lineStrong}`, borderRadius: 4, fontSize: 13, resize: 'none', lineHeight: 1.4 }}/>
                  </div>
                </div>
              </div>

              <div style={{ background: U.surface, border: `1px solid ${U.line}`, borderRadius: 4 }}>
                <div style={{ padding: '10px 16px', borderBottom: `1px solid ${U.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Photos <span style={{ color: U.ink3, fontWeight: 400 }}>· 6</span></div>
                  <UBtn variant="secondary">+ Upload</UBtn>
                </div>
                <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} style={{ aspectRatio: '1', background: `repeating-linear-gradient(45deg, ${U.surfaceAlt}, ${U.surfaceAlt} 6px, #f0f0ec 6px, #f0f0ec 12px)`, border: `1px solid ${U.line}`, borderRadius: 3, position: 'relative' }}>
                      <div className="util-mono" style={{ position: 'absolute', bottom: 4, left: 6, fontSize: 10, color: U.ink3, background: U.surface, padding: '1px 4px', borderRadius: 2 }}>IMG_0{i+1}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UShell>
  );
}


// ─── Assessment · Estimate (utilitarian) ──────────────────────────
function UEstimate() {
  const lines = [
    ['BUM-F-REP', 'Front bumper — replace',        'Part',       1,   4800, 4800],
    ['HL-L-REP',  'Left headlight assy — replace', 'Part',       1,   3200, 3200],
    ['FND-L-RP',  'Left fender — repair & paint',  'Labour',     4.5, 420,  1890],
    ['DR-L-P',    'Left door — paint only',        'Paint',      2.0, 380,  760],
    ['BNT-PDR',   'Bonnet — PDR',                  'Labour',     1.5, 420,  630],
    ['CSMB-F',    'Front consumables',             'Consumable', 1,   650,  650],
  ];
  const fmt = (n) => 'R ' + n.toLocaleString('en-ZA');
  return (
    <UShell active="Assessments" breadcrumb={['Work','Assessment','CT-4812','Estimate']}>
      <div style={{ display: 'grid', gridTemplateColumns: '232px 1fr', height: '100%' }}>
        <UAssessSidebar active="estimate" />
        <div style={{ overflow: 'auto' }}>
          <div style={{ background: U.surface, borderBottom: `1px solid ${U.line}`, padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11.5, color: U.ink3, fontWeight: 500 }}>Step 9 of 13</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>Estimate</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <UBtn variant="secondary">Import from catalogue</UBtn>
              <UBtn variant="secondary">Preview PDF</UBtn>
              <UBtn variant="primary">Submit for authorisation →</UBtn>
            </div>
          </div>

          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
            <div style={{ background: U.surface, border: `1px solid ${U.line}`, borderRadius: 4 }}>
              <div style={{ padding: '10px 16px', borderBottom: `1px solid ${U.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Line items <span style={{ color: U.ink3, fontWeight: 400 }}>· 6</span></div>
                <UBtn variant="secondary">+ Add line</UBtn>
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: '110px 2fr 100px 60px 100px 110px 40px',
                padding: '8px 16px', gap: 12, fontSize: 11.5, color: U.ink3, fontWeight: 600,
                borderBottom: `1px solid ${U.line}`, background: U.surfaceAlt, textTransform: 'uppercase', letterSpacing: 0.03,
              }}>
                <span>Code</span><span>Description</span><span>Type</span><span>Qty</span><span>Rate</span><span>Total</span><span></span>
              </div>
              {lines.map((l, i) => (
                <div key={i} className="u-row" style={{
                  display: 'grid', gridTemplateColumns: '110px 2fr 100px 60px 100px 110px 40px',
                  padding: '12px 16px', gap: 12, alignItems: 'center', fontSize: 13.5,
                  borderBottom: `1px solid ${U.line}`,
                }}>
                  <span className="util-mono" style={{ fontSize: 12, color: U.acc, fontWeight: 600 }}>{l[0]}</span>
                  <span>{l[1]}</span>
                  <UBadge tone="muted">{l[2]}</UBadge>
                  <span className="util-mono" style={{ fontSize: 12.5 }}>{l[3]}</span>
                  <span className="util-mono" style={{ fontSize: 12.5, color: U.ink2 }}>{fmt(l[4])}</span>
                  <span className="util-mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{fmt(l[5])}</span>
                  <span style={{ color: U.ink3, textAlign: 'center' }}>⋯</span>
                </div>
              ))}
              <div style={{ padding: '10px 16px', fontSize: 13, color: U.ink3, background: U.surfaceAlt }}>
                Subtotals: Parts R 8,000 · Labour R 2,520 · Paint R 760 · Consumables R 650
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: U.surface, border: `1px solid ${U.line}`, borderRadius: 4 }}>
                <div style={{ padding: '10px 16px', borderBottom: `1px solid ${U.line}`, fontSize: 13, fontWeight: 600 }}>Totals</div>
                <div style={{ padding: 14 }}>
                  {[['Subtotal','R 11,930'],['VAT 15%','R 1,790']].map(r => (
                    <div key={r[0]} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', color: U.ink2 }}>
                      <span>{r[0]}</span><span className="util-mono">{r[1]}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10, paddingTop: 10, borderTop: `1px solid ${U.line}` }}>
                    <span style={{ fontSize: 12.5, color: U.ink3, fontWeight: 500 }}>Grand total</span>
                    <span className="util-mono" style={{ fontSize: 22, fontWeight: 700 }}>R 13,720</span>
                  </div>
                </div>
              </div>

              <div style={{ background: U.surface, border: `1px solid ${U.line}`, borderRadius: 4 }}>
                <div style={{ padding: '10px 16px', borderBottom: `1px solid ${U.line}`, fontSize: 13, fontWeight: 600 }}>Policy checks</div>
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  {[
                    ['ok',   'Under sum insured (R 385,000)'],
                    ['ok',   'Within excess threshold'],
                    ['warn', 'Non-OEM headlight — requires client sign-off'],
                    ['ok',   'Repairer within panel network'],
                  ].map(([tone, text], i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      {tone === 'ok' ? (
                        <svg width="15" height="15" viewBox="0 0 14 14" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="7" cy="7" r="6" fill={U.ok}/><path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 14 14" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="7" cy="7" r="6" fill={U.warn}/><path d="M7 4v3.5M7 10v.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/></svg>
                      )}
                      <span style={{ color: U.ink2 }}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: U.surface, border: `1px solid ${U.line}`, borderRadius: 4 }}>
                <div style={{ padding: '10px 16px', borderBottom: `1px solid ${U.line}`, fontSize: 13, fontWeight: 600 }}>Claim</div>
                <div style={{ padding: 14, fontSize: 13 }}>
                  {[
                    ['Client', 'Santam'],
                    ['Policy', 'POL-882-4471'],
                    ['Excess', 'R 5,500'],
                    ['Sum insured', 'R 385,000'],
                  ].map(r => (
                    <div key={r[0]} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: U.ink2 }}>
                      <span style={{ color: U.ink3 }}>{r[0]}</span>
                      <span>{r[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UShell>
  );
}

Object.assign(window, { UWorkQueue, UAssessSidebar, UDamage, UEstimate });
