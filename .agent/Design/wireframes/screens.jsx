// Auxiliary auth screens + dashboard shell — in the Editorial + Minimal
// languages so we can see the system extend beyond one screen.

// Shop-login variant (same Editorial shell, copy differentiated only)
function ShopLoginEditorial() {
  return (
    <div className="ct" style={{
      width: 1280, height: 800, background: '#0b0b0d', color: '#fff',
      display: 'grid', gridTemplateColumns: '1.15fr 1fr',
    }}>
      <div style={{
        position: 'relative', padding: '40px 56px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        background: 'radial-gradient(ellipse at top left, rgba(212,165,116,0.08), transparent 55%), #0b0b0d',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <CTWordmark />
          <StatusChip>Workshop Portal</StatusChip>
        </div>

        <div style={{ maxWidth: 560 }}>
          <div className="ct-mono" style={{ fontSize: 11, letterSpacing: '0.32em', color: 'var(--acc)', marginBottom: 28, textTransform: 'uppercase' }}>
            — Workshop Access
          </div>
          <h1 className="ct-serif" style={{ fontSize: 72, lineHeight: 0.98, margin: 0, letterSpacing: '-0.02em', fontWeight: 400 }}>
            Quotes in,<br/>
            <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.55)' }}>cars out.</span>
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.55, marginTop: 28, maxWidth: 440, color: 'rgba(255,255,255,0.55)' }}>
            Accept work, upload estimates, and invoice — without the fax machines, WhatsApp groups, or lost emails.
          </p>
        </div>

        <div className="ct-mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
          Need the assessor portal? <a style={{ color: 'var(--acc)' }}>/auth/login →</a>
        </div>
      </div>

      <div style={{ padding: '40px 64px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ maxWidth: 380, width: '100%', margin: '0 auto' }}>
          <Eyebrow>Workshop sign in</Eyebrow>
          <h2 className="ct-serif" style={{ fontSize: 42, margin: '14px 0 8px', letterSpacing: '-0.02em', fontWeight: 400 }}>
            Start the job.
          </h2>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.5)', marginBottom: 36 }}>
            Sign in to your workshop workspace.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <TextRow label="Workshop email" placeholder="shop@firm.co.za" />
            <TextRow label="Password" eye placeholder="••••••••••" />
            <div style={{ height: 4 }} />
            <PrimaryBtn>Continue</PrimaryBtn>
            <LinkRow left={<a>Forgot password?</a>} right={<a style={{ color: 'var(--acc)' }}>Assessor login →</a>} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Forgot password
function ForgotEditorial() {
  return (
    <div className="ct" style={{
      width: 1280, height: 800, background: '#0b0b0d', color: '#fff',
      display: 'grid', gridTemplateColumns: '1.15fr 1fr',
    }}>
      <div style={{
        position: 'relative', padding: '40px 56px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        background: 'radial-gradient(ellipse at top left, rgba(212,165,116,0.08), transparent 55%), #0b0b0d',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        <CTWordmark />
        <div style={{ maxWidth: 560 }}>
          <div className="ct-mono" style={{ fontSize: 11, letterSpacing: '0.32em', color: 'var(--acc)', marginBottom: 28, textTransform: 'uppercase' }}>
            — Recovery
          </div>
          <h1 className="ct-serif" style={{ fontSize: 72, lineHeight: 0.98, margin: 0, letterSpacing: '-0.02em', fontWeight: 400 }}>
            Happens<br/>
            <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.55)' }}>to us all.</span>
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.55, marginTop: 28, maxWidth: 440, color: 'rgba(255,255,255,0.55)' }}>
            Drop your email — we'll send a one-time reset link. Valid for 30 minutes.
          </p>
        </div>
        <div />
      </div>

      <div style={{ padding: '40px 64px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ maxWidth: 380, width: '100%', margin: '0 auto' }}>
          <Eyebrow>Reset password</Eyebrow>
          <h2 className="ct-serif" style={{ fontSize: 42, margin: '14px 0 8px', letterSpacing: '-0.02em', fontWeight: 400 }}>
            Send reset link.
          </h2>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.5)', marginBottom: 36 }}>
            We'll email you instructions to create a new password.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <TextRow label="Email" placeholder="you@firm.co.za" />
            <div style={{ height: 4 }} />
            <PrimaryBtn>Send reset link</PrimaryBtn>
            <LinkRow left={<a>← Back to sign in</a>} right={<a>Contact support</a>} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Set password / activation screen
function SetPasswordEditorial() {
  return (
    <div className="ct" style={{
      width: 1280, height: 800, background: '#0b0b0d', color: '#fff',
      display: 'grid', gridTemplateColumns: '1.15fr 1fr',
    }}>
      <div style={{
        position: 'relative', padding: '40px 56px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        background: 'radial-gradient(ellipse at top left, rgba(212,165,116,0.08), transparent 55%), #0b0b0d',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        <CTWordmark />
        <div style={{ maxWidth: 560 }}>
          <div className="ct-mono" style={{ fontSize: 11, letterSpacing: '0.32em', color: 'var(--acc)', marginBottom: 28, textTransform: 'uppercase' }}>
            — Activate account
          </div>
          <h1 className="ct-serif" style={{ fontSize: 72, lineHeight: 0.98, margin: 0, letterSpacing: '-0.02em', fontWeight: 400 }}>
            One last<br/>
            <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.55)' }}>step.</span>
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.55, marginTop: 28, maxWidth: 440, color: 'rgba(255,255,255,0.55)' }}>
            Set a password to secure your ClaimTech account. Minimum 10 characters, one number, one symbol.
          </p>
        </div>
        <div />
      </div>

      <div style={{ padding: '40px 64px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ maxWidth: 380, width: '100%', margin: '0 auto' }}>
          <Eyebrow>Welcome · set password</Eyebrow>
          <h2 className="ct-serif" style={{ fontSize: 42, margin: '14px 0 8px', letterSpacing: '-0.02em', fontWeight: 400 }}>
            Secure it.
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 28 }}>
            <TextRow label="New password" eye placeholder="At least 10 characters" />
            <TextRow label="Confirm password" eye placeholder="Re-enter password" />
            {/* strength meter */}
            <div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1,1,1,0].map((a, i) => (
                  <div key={i} style={{ flex: 1, height: 3, background: a ? 'var(--acc)' : 'rgba(255,255,255,0.08)' }} />
                ))}
              </div>
              <div className="ct-mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', marginTop: 8, textTransform: 'uppercase' }}>
                Strong
              </div>
            </div>
            <div style={{ height: 4 }} />
            <PrimaryBtn>Activate account</PrimaryBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard shell — the real app wrapper restyled
function DashboardShell() {
  const navItems = [
    ['Dashboard', true], ['Work queue', false], ['Requests', false],
    ['Assessments', false], ['Clients', false], ['Repairers', false],
    ['Quotes', false], ['Engineers', false],
  ];
  const metrics = [
    ['Open assessments', '47', '+12%'],
    ['Awaiting authorisation', '18', '−4%'],
    ['Completed this week', '132', '+8%'],
    ['Avg. turnaround', '1.8d', '−11%'],
  ];
  const rows = [
    ['CT-4812', 'Toyota Hilux · ABC123GP', 'Hatfield Auto', 'In assessment', 'J. van der Merwe'],
    ['CT-4811', 'VW Polo · XYZ987GP', 'Menlyn Body', 'Awaiting photos', 'K. Nkosi'],
    ['CT-4810', 'Ford Ranger · DEF456MP', 'Rosebank Panel', 'Quoted', 'J. van der Merwe'],
    ['CT-4809', 'BMW 320i · GHI789GP', 'Sandton Motors', 'Authorised', 'L. Mokoena'],
    ['CT-4808', 'Isuzu D-Max · JKL012FS', 'Bloem Auto', 'FRC pending', 'T. Smith'],
    ['CT-4807', 'Mazda CX-5 · MNO345GP', 'Randburg Panel', 'Invoiced', 'K. Nkosi'],
  ];

  return (
    <div className="ct" style={{
      width: 1280, height: 800, background: '#0a0a0b', color: '#fff',
      display: 'grid', gridTemplateColumns: '220px 1fr',
    }}>
      {/* Sidebar */}
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
          {navItems.map(([l, active], i) => (
            <div key={i} style={{
              padding: '9px 12px', fontSize: 13, borderRadius: 2, marginBottom: 2,
              display: 'flex', alignItems: 'center', gap: 10,
              background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
              color: active ? '#fff' : 'rgba(255,255,255,0.65)',
              position: 'relative',
            }}>
              {active && <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 2, background: 'var(--acc)' }} />}
              <div style={{ width: 6, height: 6, borderRadius: 1, background: active ? 'var(--acc)' : 'rgba(255,255,255,0.2)' }} />
              {l}
              {l === 'Work queue' && <span style={{ marginLeft: 'auto', fontSize: 10 }} className="ct-mono">12</span>}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: 2, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--acc)' }}>J</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>JCVDM</div>
              <div className="ct-mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Admin</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{
          height: 56, padding: '0 32px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div className="ct-mono" style={{ fontSize: 11, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
            Home <span style={{ margin: '0 8px', opacity: 0.4 }}>/</span> Dashboard
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 260, height: 32, border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8,
              fontSize: 12, color: 'rgba(255,255,255,0.45)',
            }}>
              <span>Search claims, vehicles…</span>
              <span className="ct-mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>⌘K</span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding: '28px 32px', overflow: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
            <div>
              <Eyebrow>Tuesday · 21 April</Eyebrow>
              <h1 className="ct-serif" style={{ fontSize: 40, margin: '10px 0 4px', letterSpacing: '-0.02em', fontWeight: 400 }}>
                Good morning, <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.55)' }}>JCVDM.</span>
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>18 items need your attention today.</p>
            </div>
            <button style={{
              background: 'var(--acc)', color: '#0a0a0a', border: 'none',
              padding: '10px 20px', fontSize: 13, fontWeight: 600, borderRadius: 2,
            }}>+ New request</button>
          </div>

          {/* Metrics row */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            border: '1px solid rgba(255,255,255,0.06)', marginBottom: 28,
          }}>
            {metrics.map(([l, v, d], i) => (
              <div key={i} style={{
                padding: '20px 22px',
                borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <div className="ct-mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>{l}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10 }}>
                  <div className="ct-serif" style={{ fontSize: 36, letterSpacing: '-0.02em', lineHeight: 1 }}>{v}</div>
                  <div className="ct-mono" style={{ fontSize: 11, color: d.startsWith('+') ? '#6ad19a' : '#d4a574' }}>{d}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Active work queue</div>
              <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                <a>All</a>
                <a style={{ color: '#fff' }}>Mine</a>
                <a>Urgent</a>
                <a>Archived</a>
              </div>
            </div>
            <div className="ct-mono" style={{
              display: 'grid', gridTemplateColumns: '110px 1.3fr 1fr 140px 140px',
              padding: '10px 20px', fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)',
              borderBottom: '1px solid rgba(255,255,255,0.06)', textTransform: 'uppercase',
            }}>
              <span>Ref</span><span>Vehicle</span><span>Shop</span><span>Status</span><span>Engineer</span>
            </div>
            {rows.map((r, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '110px 1.3fr 1fr 140px 140px',
                padding: '14px 20px', fontSize: 13,
                borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                alignItems: 'center',
              }}>
                <span className="ct-mono" style={{ fontSize: 12, color: 'var(--acc)' }}>{r[0]}</span>
                <span>{r[1]}</span>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>{r[2]}</span>
                <span>
                  <span style={{
                    fontSize: 11, padding: '3px 8px', border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.75)',
                  }}>{r[3]}</span>
                </span>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>{r[4]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ShopLoginEditorial, ForgotEditorial, SetPasswordEditorial, DashboardShell });
