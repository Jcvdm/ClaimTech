# Sync Pill — Topbar Compact Status

**Created**: 2026-04-25
**Status**: In Progress
**Complexity**: Moderate (1 new component + 2 file edits)
**Branch**: `claude/confident-mendel`
**Coder must NOT run any `git pull`/`git fetch --autostash`** — orchestrator handles git.

---

## Context

Today's offline status UI is `OfflineIndicator.svelte` — a fixed-position FULL-WIDTH BANNER mounted in the root layout (`src/routes/+layout.svelte:51`). It takes a lot of screen real estate even when there's nothing to show.

Per the design spec (`.agent/Design/design-system.md` §"Offline / sync"):

> **Sync pill in topbar**:
> - Online + queued 0 → `bg-success-soft` · green dot · "Synced"
> - Online + queued > 0 → `bg-warning-soft` · amber · "Syncing {n}"
> - Offline → `bg-warning-soft` · amber · "Offline · {n} queued"

Replace the banner with a compact pill in the (app)-route topbar. The 44px topbar (Phase 6) already has a flex row at `src/routes/(app)/+layout.svelte:73` (`<div class="ml-auto flex items-center gap-2">`) — the pill sits there.

---

## Existing plumbing (don't rebuild — read these)

- **`src/lib/offline/network-status.svelte.ts`** — singleton runes class. Exposes reactive `isOnline` (boolean), `connectionQuality` ('offline'/'slow'/'good'/'unknown'), `effectiveType`, `lastOnline`, `lastOffline`. This is the source of truth for online/offline state.
- **`src/lib/offline/services/sync-manager.svelte.ts`** — exposes reactive `pendingCount` and `failedCount`. Source of truth for "{n} queued."
- **`src/lib/offline/index.ts`** — barrel export. Use this for imports.
- **`src/lib/offline/components/OfflineIndicator.svelte`** — current banner. Will be retired (NOT deleted — it might be used elsewhere; check before deleting).
- **`src/lib/offline/components/SyncStatus.svelte`** + **`SyncProgress.svelte`** — separate components for richer "view all sync items" UI. Leave alone; the new pill is just a compact status indicator.

---

## Files to create

| Path | Purpose | ~Lines |
|---|---|---|
| `src/lib/offline/components/SyncPill.svelte` | Compact pill component. Reads `networkStatus` + `syncManager`, renders one of three states per spec. | ~80 |

## Files to modify

| Path | Change |
|---|---|
| `src/routes/+layout.svelte` | **Remove** `<OfflineIndicator position="top" showWhenOnline={true} />` line (~51). Drop the import. The pill will replace this in the (app) topbar. |
| `src/routes/(app)/+layout.svelte` | Add `<SyncPill />` inside the right-side actions flex row (the `<div class="ml-auto flex items-center gap-2">` near line 73). Place it before the user dropdown. Import from `$lib/offline`. |

## Files NOT to touch

- `OfflineIndicator.svelte` — leave it on disk for now. If it has other consumers, deletion is a separate task.
- `SyncStatus.svelte`, `SyncProgress.svelte` — out of scope.
- `network-status.svelte.ts`, `sync-manager.svelte.ts` — read-only, no changes.
- `package.json` — no new dependencies.

---

## SyncPill component contract

```svelte
<!-- src/lib/offline/components/SyncPill.svelte -->
<script lang="ts">
  import { networkStatus } from '$lib/offline/network-status.svelte';
  import { syncManager } from '$lib/offline/services/sync-manager.svelte';
  import { CheckCircle2, RefreshCw, CloudOff } from 'lucide-svelte';

  // Derive state per spec
  const queued = $derived(syncManager.pendingCount);
  const online = $derived(networkStatus.isOnline);

  // Three states: synced / syncing / offline
  const state = $derived.by(() => {
    if (!online) return 'offline';
    if (queued > 0) return 'syncing';
    return 'synced';
  });

  const label = $derived.by(() => {
    if (state === 'offline') return `Offline · ${queued} queued`;
    if (state === 'syncing') return `Syncing ${queued}`;
    return 'Synced';
  });
</script>

<div
  class="flex items-center gap-1.5 h-7 px-2.5 rounded-sm border text-[11.5px] font-medium
         {state === 'synced'  ? 'bg-success-soft border-success-border text-success' : ''}
         {state === 'syncing' ? 'bg-warning-soft border-warning-border text-warning' : ''}
         {state === 'offline' ? 'bg-warning-soft border-warning-border text-warning' : ''}"
  role="status"
  aria-live="polite"
  aria-label={label}
>
  {#if state === 'synced'}
    <CheckCircle2 class="size-3.5" stroke-width={1.5} />
  {:else if state === 'syncing'}
    <RefreshCw class="size-3.5 animate-spin" stroke-width={1.5} />
  {:else}
    <CloudOff class="size-3.5" stroke-width={1.5} />
  {/if}
  <span>{label}</span>
</div>
```

**Notes for the coder**:
- Use `font-medium` and `text-[11.5px]` to match topbar density (Phase 6 conventions).
- `h-7` (28px) is shorter than the 44px topbar — vertically centered by the parent flex row.
- `stroke-width={1.5}` per design-system §Iconography.
- The "Offline" and "Syncing" states share the warning-soft tone per spec — don't try to differentiate with red/orange. The icon distinguishes them.
- `aria-live="polite"` so screen readers announce state changes without interrupting.

---

## Implementation steps

1. **Verify the imports in `network-status.svelte.ts` and `sync-manager.svelte.ts`** export the `networkStatus` and `syncManager` singletons (or named exports) the SyncPill needs. If the actual export names differ, adjust the SyncPill import accordingly.

2. **Create `SyncPill.svelte`** at the path above with the contract.

3. **Edit `src/routes/+layout.svelte`**:
   - Remove the `<OfflineIndicator>` line (~line 51).
   - Remove its import.
   - Leave everything else (NavigationLoadingBar, InstallPrompt, syncManager init, auth state listener) untouched.

4. **Edit `src/routes/(app)/+layout.svelte`**:
   - Add `import { SyncPill } from '$lib/offline';` (or `$lib/offline/components/SyncPill.svelte` if barrel export not yet wired).
   - Inside the right-side actions row (the `<div class="ml-auto flex items-center gap-2">` near line 73), add `<SyncPill />` BEFORE the user dropdown.

5. **Update `src/lib/offline/index.ts` barrel** to export `SyncPill` (so the import in step 4 works cleanly). Keep all existing exports.

6. **Run `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -20`** — must be 0 errors.

7. **Report back** with files modified, svelte-check tail, confirmation `OfflineIndicator.svelte` is still on disk (not deleted), confirmation `package.json` is unchanged, and the actual import paths used (in case the singleton export names differed from the contract).

8. **STOP** — no commit, no push, no `git pull`. Orchestrator handles git.

---

## Verification (orchestrator + user, on Vercel preview)

1. **Top of any (app) page** (e.g. `/work`): the old full-width banner is gone. A compact pill sits in the top-right next to the user avatar.
2. **Online, nothing queued**: pill is green, says "Synced", green tick icon.
3. **Trigger an offline state** (DevTools → Network → Offline): pill flips to amber "Offline · 0 queued" with cloud-off icon.
4. **Queue something** (edit an assessment field while offline, then save): pill shows "Offline · 1 queued."
5. **Go back online**: pill briefly shows "Syncing 1" with spinning refresh icon, then settles to "Synced."
6. **Mobile viewport**: pill still fits in the topbar, readable. Doesn't push the user avatar off-screen.
7. **Other routes** (e.g. `/auth/login`): no pill (it lives in the `(app)` layout, not the root layout). The old banner is gone there too — that's intentional; the auth flow doesn't need offline status.

---

## Risks / things to watch

- **`OfflineIndicator` may have other consumers**. Before deleting in a future task, grep for it. For NOW, just stop rendering it from the root layout — leave the file intact.
- **`InstallPrompt` and `NavigationLoadingBar` in the root layout** must stay. Don't accidentally remove them.
- **`SheetContent` was just modified** (scroll fix). The new SyncPill should not touch any sheet/dialog code.
- **Icon imports**: `CloudOff` and `RefreshCw` should already be available from `lucide-svelte` (it's installed). Don't add a new dependency.
