# ClaimTech Design Reference

Source artifacts for the utilitarian-v2 restyle. Captured 2026-04-23 from the user's claude.ai design canvas.

## Files

- `design-system.md` — the written spec (colors, typography, component rules, 10-phase migration priority)
- `Claimtech Restyle.html` — canvas index that loads all JSX wireframes
- `wireframes/` — individual JSX wireframes
  - `design-canvas.jsx` — viewport / pan-zoom (infra, not UI)
  - `parts.jsx` — shared primitives for login: `CTMark`, `CTWordmark`, `TextRow`, `PrimaryBtn`, `Eyebrow`, `StatusChip`
  - `logins.jsx` — four login directions (A Editorial, B Technical, C Minimal, D Narrative), all **dark-first**
  - `screens.jsx` — auth extensions (shop login, forgot, set-password) + `DashboardShell` (dark)
  - `util-screens.jsx` — **THE TARGET FOR THE APP** (`UWorkQueue`, `UAssessSidebar`, `UDamage`, `UEstimate`) — light, dense, monochrome
  - `field.jsx` — tablet + phone kit (`FTabletShell`, `FieldTabletDamage`, `FieldTablet360`, `FieldTabletEstimate`, `FieldPhoneToday`, `FieldPhoneCapture`, `FieldPhoneZone`)
  - `ios-frame.jsx` — iOS device shell (not needed for app work)

## Color tokens in the wireframes (util-screens.jsx + field.jsx)

```js
const U = {                     const F = {
  canvas:     '#f6f6f4',          bg:         '#f5f5f3',
  surface:    '#ffffff',          surface:    '#ffffff',
  surfaceAlt: '#fafaf8',          ink:        '#111114',
  ink:        '#18181b',          ink2:       '#3f3f46',
  ink2:       '#3f3f46',          ink3:       '#71717a',
  ink3:       '#71717a',          ink4:       '#a1a1aa',
  ink4:       '#a1a1aa',          line:       '#e4e4e0',
  line:       '#e7e7e3',          lineStrong: '#d1d1cc',
  lineStrong: '#d4d4d0',          acc:        '#1d4ed8',  // BLUE in wireframe
  acc:        '#1d4ed8',          accSoft:    '#eef2ff',
  accSoft:    '#eef2ff',          ok:         '#15803d',
  ok:         '#15803d',          warn:       '#b45309',
  warn:       '#b45309',          err:        '#b91c1c',
  err:        '#b91c1c',          okSoft:     '#ecfdf5',
  okSoft:     '#ecfdf5',          warnSoft:   '#fef3c7',
  warnSoft:   '#fef3c7',          errSoft:    '#fee2e2',
  errSoft:    '#fee2e2',
};                              };
```

## How accent is actually used in the wireframes

The "accent" color (blue in reference, rose/black in our retune) appears in:

- Ref column IDs in tables (`CT-4812`, zone codes `FB` `HL`)
- Selected row soft tint (`accSoft` background on the focused row)
- Specific "capture mode" CTAs (Take photo, Guided capture buttons)
- Active step-pager dot (the current step in the 13-dot pager)
- Focus rings and hover emphasis
- The selected damage zone circle on the schematic
- The "Editing" state badge

## How PRIMARY (dominant CTA color) is actually used in the wireframes

Primary in the wireframe is **BLACK** (`U.ink` / `F.ink`), not blue. Used in:

- Main CTAs like "Next: Vehicle values →" (wireframe uses black button, white text)
- "Save zone" primary button (phone)
- Selected tab's count pill (black bg, white text)
- Progress bar fill for incomplete progress (changes to green at 100%)
- Active condition/action chip (black bg on phone zone screen)
- 2px left bar on the active assessment step in the sidebar

## Mapping this to our Tailwind tokens

| Wireframe | Role | Our token |
|---|---|---|
| `U.ink` (`#18181b`) | Dominant CTAs, active states, progress bar, headings | `--foreground` AND `--primary` (both should be black) |
| `U.acc` (`#1d4ed8`) | Ref text, selected row tint, capture-mode CTAs | User's direction: replace blue with rose-brand OR keep as neutral |
| `U.accSoft` (`#eef2ff`) | Selected row background, focus shadow tint | `--accent` |

## User's stylistic direction (2026-04-23 feedback after Vercel preview)

- Primary should be **BLACK**, not blue (matches wireframe `U.ink`)
- Rose (ClaimTech brand) can be used as **light accent** — e.g. ref text color, specific CTAs
- "Black and white" feel — monochrome canvas with rose for brand emphasis

## Out-of-scope for current app work

- `logins.jsx` (dark-first editorial/technical/minimal/narrative) — separate auth-redesign phase, not now
- `screens.jsx` DashboardShell — dark variant, not our current direction
- `ios-frame.jsx` — infrastructure, not our UI
