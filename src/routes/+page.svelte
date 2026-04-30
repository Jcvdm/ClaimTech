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
