// Login wireframe directions — dark-first, medium-fi, 4 distinct layouts.
// Each is 1280×800 (desktop viewport). Single-accent driven by --acc.

// ─── Direction 1: Editorial split. Big serif quote left, form right. ──
// The premium move — signals craft. Think Aesop/Apple luxury.
function LoginEditorial() {
  return (
    <div className="ct" style={{
      width: 1280, height: 800, background: '#0b0b0d', color: '#fff',
      display: 'grid', gridTemplateColumns: '1.15fr 1fr',
      fontFeatureSettings: '"ss01"',
    }}>
      {/* Left: hero panel */}
      <div style={{
        position: 'relative', padding: '40px 56px 40px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        background: 'radial-gradient(ellipse at top left, rgba(212,165,116,0.08), transparent 55%), #0b0b0d',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <CTWordmark />
          <StatusChip>System · Operational</StatusChip>
        </div>

        {/* Editorial block */}
        <div style={{ maxWidth: 560 }}>
          <div className="ct-mono" style={{
            fontSize: 11, letterSpacing: '0.32em', textTransform: 'uppercase',
            color: 'var(--acc)', marginBottom: 28,
          }}>— Assessment Intelligence</div>

          <h1 className="ct-serif" style={{
            fontSize: 72, lineHeight: 0.98, margin: 0, letterSpacing: '-0.02em',
            fontWeight: 400,
          }}>
            Every claim,<br/>
            <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.55)' }}>considered.</span>
          </h1>

          <p style={{
            fontSize: 15, lineHeight: 1.55, marginTop: 28, maxWidth: 440,
            color: 'rgba(255,255,255,0.55)',
          }}>
            The assessment platform built for engineers who hold themselves
            to a standard the industry forgot existed.
          </p>
        </div>

        {/* Footer grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
          paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          {[
            ['01', 'Audit-ready', 'Every data point timestamped and signed'],
            ['02', 'Engineer-first', 'Built with assessors, not marketed to them'],
            ['03', 'Zero friction', 'Field to report in minutes, not days'],
          ].map(([n, h, p], i) => (
            <div key={i} style={{
              paddingRight: 20, borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              paddingLeft: i > 0 ? 24 : 0,
            }}>
              <div className="ct-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>{n}</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{h}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{p}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: form */}
      <div style={{ padding: '40px 64px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'right' }}>
          <span className="ct-mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            Not on ClaimTech? <span style={{ color: 'var(--acc)' }}>Request access →</span>
          </span>
        </div>

        <div style={{ maxWidth: 380, width: '100%', margin: '0 auto' }}>
          <Eyebrow>Sign in</Eyebrow>
          <h2 className="ct-serif" style={{ fontSize: 42, margin: '14px 0 8px', letterSpacing: '-0.02em', fontWeight: 400 }}>
            Welcome back.
          </h2>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.5)', marginBottom: 36 }}>
            Continue to your workspace.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <TextRow label="Work email" placeholder="name@firm.co.za" />
            <TextRow label="Password" eye placeholder="••••••••••" />
            <div style={{ height: 4 }} />
            <PrimaryBtn>Continue</PrimaryBtn>
            <LinkRow left={<a>Forgot password?</a>} right={<a style={{ color: 'var(--acc)' }}>Workshop login →</a>} />
          </div>
        </div>

        <div className="ct-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'right', letterSpacing: '0.15em' }}>
          v3.6 · JHB.ZA
        </div>
      </div>
    </div>
  );
}


// ─── Direction 2: Centered on technical grid. Form + metadata frame. ──
// Engineering-tool feel. Monospace-forward, schematic energy.
function LoginTechnical() {
  const gridBg = `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px) 0 0 / 48px 48px, linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px) 0 0 / 48px 48px`;
  return (
    <div className="ct" style={{
      width: 1280, height: 800, background: '#08090b', color: '#fff',
      position: 'relative',
      backgroundImage: gridBg,
    }}>
      {/* corner brackets  */}
      {[
        { top: 24, left: 24, rot: 0 },
        { top: 24, right: 24, rot: 90 },
        { bottom: 24, right: 24, rot: 180 },
        { bottom: 24, left: 24, rot: 270 },
      ].map((p, i) => (
        <div key={i} style={{ position: 'absolute', ...p, width: 16, height: 16, transform: `rotate(${p.rot}deg)` }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--acc)" strokeWidth="1.2">
            <path d="M0 5V0h5" />
          </svg>
        </div>
      ))}

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 32, left: 48, right: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CTWordmark />
        <div style={{ display: 'flex', gap: 24, fontSize: 11 }} className="ct-mono">
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>SEC-TLS/1.3</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>NODE · JNB-01</span>
          <span style={{ color: '#6ad19a' }}>● OPERATIONAL</span>
        </div>
      </div>

      {/* Centered form card */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 480, background: '#0c0d0f', border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* Header strip */}
        <div className="ct-mono" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.45)',
        }}>
          <span>AUTH/SESSION</span>
          <span>ID · 0x4f8a...c291</span>
        </div>

        <div style={{ padding: '40px 48px 36px' }}>
          <h2 className="ct-serif" style={{ fontSize: 40, margin: 0, letterSpacing: '-0.02em' }}>
            Authenticate
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '6px 0 30px' }}>
            Engineer credentials required to access workspace.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <TextRow label="Identity / Email" placeholder="assessor@firm.co.za" />
            <TextRow label="Secret" eye placeholder="Passphrase" />
            <div style={{ height: 4 }} />
            <PrimaryBtn>Establish session</PrimaryBtn>
          </div>

          <div style={{
            marginTop: 28, paddingTop: 20, borderTop: '1px dashed rgba(255,255,255,0.08)',
            display: 'flex', justifyContent: 'space-between', fontSize: 12,
          }} className="ct-mono">
            <a style={{ color: 'rgba(255,255,255,0.55)' }}>→ reset credential</a>
            <a style={{ color: 'var(--acc)' }}>→ workshop portal</a>
          </div>
        </div>

        {/* Footer strip */}
        <div className="ct-mono" style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)',
        }}>
          <span>CLAIMTECH / v3.6.0</span>
          <span>ZA · {new Date().getFullYear()}</span>
        </div>
      </div>

      {/* Bottom caption */}
      <div style={{ position: 'absolute', bottom: 32, left: 48, right: 48, display: 'flex', justifyContent: 'space-between' }}>
        <span className="ct-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.18em' }}>
          BUILT FOR ASSESSORS. TRUSTED BY UNDERWRITERS.
        </span>
        <span className="ct-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.18em' }}>
          TERMS · PRIVACY
        </span>
      </div>
    </div>
  );
}


// ─── Direction 3: Minimal — just form, enormous whitespace, one accent. ─
// The "we're so confident we don't need marketing" move.
function LoginMinimal() {
  return (
    <div className="ct" style={{
      width: 1280, height: 800, background: '#0a0a0b', color: '#fff',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '36px 56px' }}>
        <CTWordmark />
        <div style={{ display: 'flex', gap: 32, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
          <a>Workshop login</a>
          <a>Contact</a>
          <a style={{ color: 'var(--acc)' }}>Request access →</a>
        </div>
      </div>

      {/* Centered form — deliberately off-center vertically, up top */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 420 }}>
          <div style={{ marginBottom: 42 }}>
            <Eyebrow>01 / Sign in</Eyebrow>
            <h2 className="ct-serif" style={{
              fontSize: 64, margin: '18px 0 0', lineHeight: 1, letterSpacing: '-0.03em', fontWeight: 400,
            }}>
              Welcome<br/>
              <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.5)' }}>back.</span>
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <TextRow label="Email" placeholder="you@claimtech.co.za" />
            <TextRow label="Password" eye placeholder="Enter password" />
            <div style={{ height: 2 }} />
            <PrimaryBtn>Sign in</PrimaryBtn>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 12.5, color: 'rgba(255,255,255,0.5)',
              paddingTop: 4,
            }}>
              <a>Forgot password?</a>
              <a>Need help?</a>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal footer */}
      <div className="ct-mono" style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '24px 56px', fontSize: 10, letterSpacing: '0.2em',
        color: 'rgba(255,255,255,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span>CLAIMTECH · ASSESSMENT PLATFORM</span>
        <span>v3.6 — OPERATIONAL</span>
      </div>
    </div>
  );
}


// ─── Direction 4: Horizontal three-column — narrative + form + stats. ──
// A confident "we have substance" move. Story on left, action center, proof right.
function LoginNarrative() {
  return (
    <div className="ct" style={{
      width: 1280, height: 800, background: '#0a0a0b', color: '#fff',
      display: 'grid', gridTemplateRows: 'auto 1fr auto',
    }}>
      {/* Top */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 56px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <CTWordmark />
        <StatusChip>v3.6 · Live</StatusChip>
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', alignItems: 'center', padding: '0 56px' }}>
        {/* Left: narrative */}
        <div style={{ paddingRight: 40, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <Eyebrow color="var(--acc)">Since 2019</Eyebrow>
          <p className="ct-serif" style={{
            fontSize: 30, lineHeight: 1.15, margin: '22px 0 0', letterSpacing: '-0.01em',
            fontWeight: 400,
          }}>
            We built the tool the automotive claims industry was too comfortable to build itself —
            <span style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}> because someone had to care.</span>
          </p>
          <div style={{ marginTop: 28, display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 32, height: 1, background: 'var(--acc)' }} />
            <span className="ct-mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.5)' }}>
              JCVDM · FOUNDER
            </span>
          </div>
        </div>

        {/* Center: form */}
        <div style={{ padding: '0 48px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Eyebrow>Secure sign-in</Eyebrow>
            <h2 className="ct-serif" style={{ fontSize: 36, margin: '10px 0 0', letterSpacing: '-0.02em', fontWeight: 400 }}>
              Enter workspace
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <TextRow placeholder="Email address" />
            <TextRow eye placeholder="Password" />
            <PrimaryBtn>Sign in</PrimaryBtn>
            <LinkRow left={<a>Forgot password?</a>} right={<a style={{ color: 'var(--acc)' }}>Workshop →</a>} />
          </div>
        </div>

        {/* Right: live stats */}
        <div style={{ paddingLeft: 40, borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          <Eyebrow>Today — Live</Eyebrow>
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 22 }}>
            {[
              ['2,847', 'Assessments this month'],
              ['43 min', 'Avg. field-to-report'],
              ['99.97%', 'Uptime, trailing 90d'],
            ].map(([n, l], i) => (
              <div key={i}>
                <div className="ct-serif" style={{ fontSize: 38, letterSpacing: '-0.02em', lineHeight: 1 }}>{n}</div>
                <div className="ct-mono" style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="ct-mono" style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '20px 56px', fontSize: 10, letterSpacing: '0.2em',
        color: 'rgba(255,255,255,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span>BUILT IN JOHANNESBURG</span>
        <span>TERMS · PRIVACY · STATUS</span>
      </div>
    </div>
  );
}

Object.assign(window, { LoginEditorial, LoginTechnical, LoginMinimal, LoginNarrative });
