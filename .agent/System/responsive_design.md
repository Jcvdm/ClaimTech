# Responsive Design Contract

**Added**: 2026-04-17 (Phase 1 mobile responsiveness)

## Breakpoints

| Breakpoint | Width | Use |
|------------|-------|-----|
| `lg` | 1024px | Sidebar mode toggle. Below = Sheet (mobile). Tablets in portrait get mobile sidebar — intentional. |
| `md` | 768px | Grids, dialogs-vs-sheets, form columns. Decoupled from sidebar mode. |

## Layout Rules

- Every page must sit inside `PageContainer` (or `AssessmentLayout`, which has its own container).
- `PageContainer` provides `mx-auto w-full min-w-0 max-w-[1600px] px-4 sm:px-6 lg:px-8`.
- Any `min-w-[Npx]` or `w-[Npx]` outside a narrow allowlist is a mobile bug — it defeats `min-w-0` containment.
- `SidebarInset`'s main content wrapper carries `min-w-0` to prevent children with fixed widths from pushing content over the sidebar on zoom.

## Touch Targets

- Minimum interactive touch target: 44×44 CSS px.
- Use `var(--touch-target-min)` (2.75rem) or Tailwind `min-h-11 min-w-11`.
- Default button height is `h-10` (40px); icon button is `size-10`.

## Viewport Units

- Full-height chrome uses `h-dvh` / `min-h-dvh` — never `h-screen` / `100vh`.
- `dvh` shrinks with mobile browser chrome (address bar); `svh` does not. Prefer `dvh` for login/landing pages.
- Exception: PDF templates (`src/lib/templates/*.ts`) use `100vh` — that's rendered by headless browser, not mobile.

## Overflow & Scroll

- `overflow-x: clip` on `html, body` (uses `clip` not `hidden` so `position: sticky` keeps working).
- Scrollable regions use `overscroll-behavior: contain` (global default in `app.css`).

## iOS Zoom Prevention

- All `input`, `select`, `textarea` have `font-size: max(16px, 1rem)` to prevent iOS auto-zoom on focus.

## CSS Custom Properties (design tokens)

```css
--touch-target-min: 2.75rem;
--page-px:          1rem;    /* mobile */
--page-px-sm:       1.5rem;  /* sm breakpoint */
--page-px-lg:       2rem;    /* lg breakpoint */
```
