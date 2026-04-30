# Landing Page Design — `/` as Marketing Surface

**Created**: 2026-04-30
**Status**: Awaiting user approval
**Complexity**: Moderate

## 1. Context

**Today**: `/` redirects unconditionally in `src/hooks.server.ts:113-115` — unauth users to `/auth/login`, authed users to `/dashboard`. The `+page.svelte` placeholder is never rendered. Public visitors never see ClaimTech as a product.

**Change**: `/` becomes a public marketing landing for prospective customers (insurers, fleet operators, repair shops). Authenticated users continue to redirect to their dashboard — they don't need re-marketing every visit, and the topbar already provides their workspace link.

**Sibling aesthetic**: The just-shipped `/auth/login` (commits `ee54421`, `d99420f`) established a "LoginMinimal" pattern — full-bleed flex column, hairline-bordered footer, italic `font-light` headline, eyebrow micro-label, single brand-rose CTA. The landing must read as a sibling page.

## 2. Design Recommendation — Editorial-Minimal Hybrid

Evaluated all four wireframe directions in `logins.jsx`:

| Direction | Verdict |
|---|---|
| **Editorial** | Strongest content frame. 3-prop footer maps cleanly to ClaimTech's three pillars. |
| **Technical** | Reads as developer tool, not insurance/fleet B2B. Wrong audience. |
| **Minimal** | Already shipped on login. No room for proof or product story. |
| **Narrative** | Powerful but requires real stats we don't have; 3-col is busy. |

**Pick**: Editorial layout language (eyebrow → giant italic-accented headline → quiet body → 3-pillar grid) + Minimal chrome (slim header, hairline footer). Translate dark + serif → light + sans-italic against `app.css` tokens. No new fonts — `italic font-light` already gave login its editorial feel.

**Why**: coheres with login (same eyebrow, same italic headline, same hairline, same `px-6 sm:px-14` rhythm); single Svelte file zero new deps; room for the two-workflow story without becoming a SaaS template.

## 3. Decisions Locked

1. **Authed users**: keep redirecting to `/dashboard` or `/shop/dashboard`. They don't need re-pitching.
2. **Header nav**: logo wordmark + "Sign in" text + brand "Request access" CTA. No fake Product/Pricing nav.
3. **Sections**: Header → Hero → Two-workflow split → Three-pillar grid → Footer-CTA band → Hairline footer.
4. **Two-audience**: single hero with broad value prop, then explicit two-column "For assessors / For workshops" block.
5. **CTA strategy**: Primary = "Request access" → `mailto:support@claimtech.co.za` (matches login footer). Secondary = "Sign in". Each workflow column has its own portal link. Strict "rule of one" filled CTA per section.
6. **Files to touch**:
   - `src/routes/+page.svelte` — full rewrite (currently a placeholder)
   - `src/hooks.server.ts` lines 113-115 — flip unauth branch from redirect to passthrough; keep authed redirect; add `/` to `publicRoutes`
   - No `+page.server.ts` needed — landing is fully static
7. **Reuse**: `Button` from `$lib/components/ui/button` (`variant="brand"` for primary CTAs). No new components.

## 4. Layout Spec

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button';
</script>

<div class="flex min-h-dvh flex-col bg-background text-foreground">
  <!-- Header -->
  <header class="flex items-center justify-between px-6 sm:px-14 py-9">
    <span class="text-sm font-medium tracking-wide">ClaimTech</span>
    <div class="flex items-center gap-6 text-sm">
      <a href="/auth/login" class="text-muted-foreground hover:text-foreground">Sign in</a>
      <a href="mailto:support@claimtech.co.za" class="text-brand hover:underline">Request access →</a>
    </div>
  </header>

  <!-- Hero -->
  <section class="px-6 sm:px-14 pt-12 pb-24 sm:pt-24 sm:pb-32">
    <div class="max-w-[860px]">
      <p class="mb-6 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        Assessment intelligence for South African insurers
      </p>
      <h1 class="mb-8 text-5xl sm:text-7xl font-light leading-[1.02] tracking-tight">
        Every claim,<br/>
        <span class="italic text-muted-foreground">considered.</span>
      </h1>
      <p class="mb-10 max-w-[560px] text-base sm:text-lg leading-relaxed text-muted-foreground">
        ClaimTech runs the full lifecycle — from first notification to signed-off invoice —
        on one auditable record. Built with assessors and workshops who hold themselves to
        a standard the industry forgot existed.
      </p>
      <div class="flex flex-wrap items-center gap-6">
        <Button variant="brand" size="lg" href="mailto:support@claimtech.co.za" class="h-11 px-6">
          Request access
        </Button>
        <a href="/auth/login" class="text-sm text-foreground hover:underline">
          Already a customer? Sign in →
        </a>
      </div>
    </div>
  </section>

  <!-- Two-workflow split -->
  <section class="border-t border-border/60 px-6 sm:px-14 py-20 sm:py-28">
    <p class="mb-12 text-xs uppercase tracking-[0.18em] text-muted-foreground">
      Two workflows, one record
    </p>
    <div class="grid gap-12 sm:grid-cols-2 sm:gap-16">
      <!-- Assessors -->
      <div class="border-l border-border pl-8">
        <p class="mb-3 text-xs uppercase tracking-[0.18em] text-brand">For assessors</p>
        <h2 class="mb-5 text-3xl font-light leading-tight">
          Field to report,<br/><span class="italic text-muted-foreground">in minutes.</span>
        </h2>
        <p class="mb-6 text-sm leading-relaxed text-muted-foreground max-w-[420px]">
          Schedule inspections, capture damage on a 360° guided walkthrough, build the estimate
          line-by-line, and produce a signed PDF report — all on one timestamped pipeline.
          Every photo, every revision, every authorisation traceable.
        </p>
        <a href="/auth/login" class="text-sm font-medium text-foreground hover:text-brand">
          Sign in to assessor portal →
        </a>
      </div>

      <!-- Workshops -->
      <div class="border-l border-border pl-8">
        <p class="mb-3 text-xs uppercase tracking-[0.18em] text-brand">For workshops</p>
        <h2 class="mb-5 text-3xl font-light leading-tight">
          Quote, repair,<br/><span class="italic text-muted-foreground">invoice.</span>
        </h2>
        <p class="mb-6 text-sm leading-relaxed text-muted-foreground max-w-[420px]">
          Receive jobs the moment an assessor authorises them. Quote against the agreed estimate,
          track the repair through to quality check, and invoice without a single re-keyed line.
          No spreadsheets, no email chains.
        </p>
        <a href="/auth/shop-login" class="text-sm font-medium text-foreground hover:text-brand">
          Sign in to workshop portal →
        </a>
      </div>
    </div>
  </section>

  <!-- Three-pillar grid -->
  <section class="border-t border-border/60 px-6 sm:px-14 py-20">
    <div class="grid gap-10 sm:grid-cols-3 sm:gap-0">
      {#each [
        ['01', 'Audit-ready', 'Every data point timestamped, every change attributed. Report exports include the full chain of custody.'],
        ['02', 'Engineer-first', 'Designed alongside practising assessors. No marketing screens — just the working surface they asked for.'],
        ['03', 'Zero re-keying', 'One record from FNOL to invoice. The workshop sees what the assessor authorised, exactly.']
      ] as [n, h, p], i}
        <div class="sm:px-8 {i > 0 ? 'sm:border-l border-border' : ''}">
          <p class="mb-4 font-mono-tabular text-xs text-subtle-foreground">{n}</p>
          <h3 class="mb-2 text-base font-semibold">{h}</h3>
          <p class="text-sm leading-relaxed text-muted-foreground">{p}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- Footer-CTA band -->
  <section class="border-t border-border/60 px-6 sm:px-14 py-20 sm:py-24">
    <div class="max-w-[640px]">
      <h2 class="mb-6 text-3xl sm:text-4xl font-light leading-tight">
        Ready to see the workspace?<br/>
        <span class="italic text-muted-foreground">We'll show you, not pitch you.</span>
      </h2>
      <Button variant="brand" size="lg" href="mailto:support@claimtech.co.za" class="h-11 px-6">
        Request access
      </Button>
    </div>
  </section>

  <!-- Hairline footer -->
  <footer class="border-t border-border/60 px-6 sm:px-14 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
    <span>© {new Date().getFullYear()} ClaimTech</span>
    <span class="font-mono-tabular tracking-[0.18em]">CLAIMTECH · ASSESSMENT PLATFORM</span>
  </footer>
</div>
```

**Token discipline**:
- Backgrounds only `bg-background` (no card surface needed).
- Borders only `border-border` and `border-border/60`.
- Brand rose used 4× total: header CTA, hero CTA, two `For X` eyebrows, footer CTA. Nowhere else.
- `font-light` + `italic` headline echo locks sibling-with-login feel.
- No `font-serif`, no custom fonts, no gradients, no shadows, no SVG decoration.

## 5. Routing Change — `src/hooks.server.ts`

**Current** (lines 112-115):
```ts
// Explicit root route handling
if (event.url.pathname === '/') {
  redirect(303, session ? '/dashboard' : '/auth/login')
}
```

**Replace with**:
```ts
// Explicit root route handling — landing is public, authed users go to their dashboard
if (event.url.pathname === '/') {
  if (session) {
    // Determine shop vs assessor by querying shop_users
    const { data: shopUser } = await event.locals.supabase
      .from('shop_users')
      .select('id')
      .eq('user_id', user!.id)
      .maybeSingle()
    redirect(303, shopUser ? '/shop/dashboard' : '/dashboard')
  }
  // unauthenticated → fall through, render landing
}
```

**Also**: add `'/'` to `publicRoutes` (line 118) so the existing protected-route guard doesn't redirect unauth visitors back to `/auth/login`:

```ts
const publicRoutes = ['/', '/auth/login', '/auth/shop-login', '/auth/callback', '/auth/confirm', '/auth/forgot-password']
```

**Note for coder**: the shop-vs-assessor lookup may already exist as a helper in `src/lib/services/`. Coder should grep for `shop_users` queries first; if a helper like `getUserPortal(user)` exists, use it. Otherwise inline the query above with a `// TODO: extract to service` comment — refactor is out of scope.

## 6. Acceptance Criteria + Verification

**Manual checks**:
1. `/` while signed out → landing renders.
2. `/` signed in as assessor → redirects to `/dashboard`.
3. `/` signed in as shop user → redirects to `/shop/dashboard`.
4. Header "Sign in" → `/auth/login`.
5. All "Request access" → opens `mailto:support@claimtech.co.za`.
6. Two-workflow links → `/auth/login` and `/auth/shop-login`.
7. 375px viewport: no overflow; grids stack to single column; CTAs reachable.
8. 1440px viewport: max-widths feel intentional; not stretched.
9. Sibling-check: `/` and `/auth/login` side-by-side share header rhythm + eyebrow + italic headline + hairline footer.

**Commands**:
```bash
npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -5    # 0 errors
grep -E '(bg|text|border)-(slate|gray|red|blue|green|yellow|orange|amber|purple|pink)-[0-9]+' src/routes/+page.svelte    # 0 matches
npm run dev    # manual visual + redirect tests
```

## 7. Out of Scope

Do NOT build:
- Pricing, product page, blog, customer logos, testimonials.
- Animations beyond CSS hover (no Framer Motion, no scroll triggers, no parallax).
- A real "Request access" form — `mailto:` is deliberate.
- Dark-mode visual override — inherits from `prefers-color-scheme`; QA in dark is nice-to-have, not blocking.
- Changes to `/auth/login`, `/auth/shop-login`, dashboards, app chrome.
- Refactoring `hooks.server.ts` beyond the lines specified.
- New `+page.server.ts`.
- SEO meta-tag work (title, OG image, sitemap) — separate task.

## Execution

Per CLAUDE.md orchestrator policy:
1. Dispatch Haiku coder-agent with this task doc
2. Coder rewrites `+page.svelte`, edits `hooks.server.ts`, verifies
3. Orchestrator commits + pushes
4. Sonnet reviewer-agent over the diff
5. If reviewer flags issues → Haiku → Sonnet fallback
