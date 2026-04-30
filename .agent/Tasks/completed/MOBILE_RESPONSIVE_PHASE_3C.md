# Mobile Responsiveness — Phase 3C: Dialog Migration (batch 1)

**Created**: 2026-04-17
**Status**: Planning → In Progress
**Complexity**: Simple
**Source Plan**: `C:\Users\Jcvdm\.claude\plans\validated-zooming-lampson.md`
**Depends on**: Phase 1 (`f27ca67`) + Phase 2 (`2ef4ebd`) + Phase 3A (`b3be12a`) + Phase 3B (`929789a`)

## Overview

Migrate 5 small-width dialogs (`max-w-md` / `sm:max-w-md` class) to `ResponsiveDialog` so they render as bottom sheets at <md. These are the lowest-risk callsites: standalone modal components + a couple of inline dialogs with straightforward form/confirm shapes.

**Intentionally out of scope**: the ~12 remaining dialog callsites with wider widths (`max-w-2xl`, `sm:max-w-[500px]`, `sm:max-w-[600px]`, `max-h-[90vh]` scrollable forms), inline row-action dialogs inside assessment components (EstimateTab, FRCTab, TyresTab, etc.), and dynamic-width dialogs (`PdfUpload`). Those deserve their own evaluation once the small-dialog pattern is proven.

## The migration shape

Every target file uses the standard shadcn pattern:

```svelte
import * as Dialog from '$lib/components/ui/dialog';
// or: import { Dialog, DialogContent, ... } from '$lib/components/ui/dialog';

<Dialog.Root bind:open={open}>
  <Dialog.Content class="...">
    <Dialog.Header>
      <Dialog.Title>...</Dialog.Title>
      <Dialog.Description>...</Dialog.Description>
    </Dialog.Header>
    <!-- body -->
    <Dialog.Footer>...</Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
```

Migration is a direct 1:1 swap:

```svelte
import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog';

<ResponsiveDialog.Root bind:open={open}>
  <ResponsiveDialog.Content class="...">
    <ResponsiveDialog.Header>
      <ResponsiveDialog.Title>...</ResponsiveDialog.Title>
      <ResponsiveDialog.Description>...</ResponsiveDialog.Description>
    </ResponsiveDialog.Header>
    <!-- body (UNCHANGED) -->
    <ResponsiveDialog.Footer>...</ResponsiveDialog.Footer>
  </ResponsiveDialog.Content>
</ResponsiveDialog.Root>
```

**Keep every `class=` passthrough exactly as-is.** `ResponsiveDialog.Content` forwards the class to both Dialog.Content (md+) and Sheet.Content (<md). `max-w-md` / `sm:max-w-md` are applied only at md+ where the Dialog renders; on mobile the Sheet ignores max-width since it's anchored bottom.

**`ResponsiveDialog.Footer` auto-applies `flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2`.** If the existing `Dialog.Footer` had its own class, keep it — ResponsiveDialog.Footer's classes layer on top via `cn()`. If the existing footer had `sm:justify-end` too, it's harmless duplication.

**If a file uses the named-import style** (e.g. `import { DialogContent, DialogHeader, ... } from '$lib/components/ui/dialog';`), prefer `import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog';` — consistent with the rest of the codebase, and the refactor becomes obvious: `<DialogContent>` → `<ResponsiveDialog.Content>`. But if changing the import style would make the diff noisy, you can also use the named aliases: `import { ResponsiveDialog, ResponsiveDialogContent, ... } from '$lib/components/ui/responsive-dialog';`. Pick the style that matches the local file's convention.

## Files to migrate

### 3C.1 — `src/lib/components/assessment/BettermentModal.svelte`

Single dialog. Content uses `Dialog.Content class="max-w-md"`. Keep that class. Swap.

### 3C.2 — `src/lib/components/assessment/FRCSignOffModal.svelte`

Single dialog. Content uses `DialogContent class="max-w-md"`. Swap. Check that the signature canvas / image inside the body still renders correctly at bottom-sheet width on mobile.

### 3C.3 — `src/lib/components/assessment/DeclineReasonModal.svelte`

Single dialog, no explicit max-w class on DialogContent. Swap. The default ResponsiveDialog.Content class from the underlying primitives should be fine — no class needed.

### 3C.4 — `src/routes/(app)/requests/new/+page.svelte` — Quick Add Client dialog

Single dialog at lines ~317–378. Content uses `DialogContent class="sm:max-w-md"`. Swap all 6 Dialog* tags. Keep everything else in the file untouched.

### 3C.5 — `src/routes/(shop)/shop/jobs/[id]/+page.svelte` — first dialog (line ~2311)

This file contains multiple dialogs. ONLY migrate the one at **line ~2311** with `Dialog.Content class="sm:max-w-md"`. Leave the second dialog at line ~2330 (`class="max-w-2xl"`) and any others in the file ALONE — they're out of scope.

Read the surrounding context carefully so you identify the right `Dialog.Root` opening tag. There may be multiple `Dialog.Root` instances in the file; the ones you migrate must map exactly to the `sm:max-w-md` content block.

## Implementation order

1. Read `src/lib/components/ui/responsive-dialog/index.ts` and `responsive-dialog.svelte` to confirm the API surface (already familiar — shipped in Phase 2).
2. Migrate in this order: 3C.3 (DeclineReasonModal — simplest, no widths) → 3C.1 (BettermentModal) → 3C.2 (FRCSignOffModal) → 3C.4 (Quick Add Client) → 3C.5 (Shop jobs single dialog).
3. After each file: quickly re-read the file to check the swap is clean (no stray `<Dialog.` left in the migrated block, no duplicate imports).

## Hard constraints

- Do NOT migrate any dialogs OTHER than the 5 listed. `EstimateTab`, `FRCTab`, `FRCLinesTable`, `TyresTab`, `RatesAndRepairerConfiguration`, `OriginalEstimateLinesPanel`, `FinalizeTab`, `PdfUpload`, `appointments/+page.svelte`, `inspections/[id]/+page.svelte`, `finalized-assessments/+page.svelte`, `shop/estimates/new/+page.svelte`, and the second dialog in `shop/jobs/[id]/+page.svelte` stay on Dialog for now.
- Do NOT change any dialog BEHAVIOUR (handlers, bindings, state, animations). Only the component namespace.
- Do NOT touch the dialog's inner body content. If the body had `space-y-4` on a wrapper, keep it.
- If a file also uses `Dialog` for a dialog that's NOT in the migration list (e.g. shop jobs file has a second `max-w-2xl` dialog), **keep both imports** — `Dialog` for the remaining dialog, and add `ResponsiveDialog` for the migrated one. Do NOT remove the `Dialog` import wholesale.

## Verification

1. `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -60` — no NEW errors in touched files. Pre-existing 29 warnings are baseline.
2. `npm run build 2>&1 | tail -15` — must succeed.
3. For each migrated file:
   - `grep -n 'Dialog\.\|DialogContent\|DialogHeader\|ResponsiveDialog' <path>` — sanity check: the migrated block should show `ResponsiveDialog.*`; any remaining `Dialog.*` must be for non-migrated dialogs in the same file (shop jobs) or a stray leftover.
4. `npm run dev` and on phone viewport (DevTools <768px): open each of the 5 migrated dialogs. They should slide up from the bottom as sheets, not appear as centered modals. On desktop viewport, they look identical to before.

## Report back

Tight summary (<250 words):
- Files modified + line-count delta per file.
- Any file where the import style was changed (and why).
- Any file where the Dialog import had to be KEPT for other dialogs in the same file.
- Build + svelte-check result.
- Deviations + justifications.

## Notes

- Branch: `claude/confident-mendel`. Append commits. No new branch.
- Do NOT commit or push — orchestrator handles.
- Phase 2's ResponsiveDialog was built specifically to be a drop-in swap — so the migration should be mechanical. If any callsite resists the swap because of an unusual pattern (e.g. Trigger-child slot, custom asChild pattern), STOP and note it in the report rather than adapting the ResponsiveDialog primitive. We'll address patterns in a follow-up if needed.
