# Refactor PR 6 — `usePhotoUpload` Composable

**Created**: 2026-04-18
**Status**: Planning → In Progress
**Complexity**: Moderate (1 composable + migration of 6-7 panels)
**Source plan**: `C:\Users\Jcvdm\.claude\plans\validated-zooming-lampson.md`
**Branch**: `claude/confident-mendel`
**Depends on**: PRs 1–5 (`e5bb64b`, `b4c5838`, `bd9d3a4`, `e0e6ed5`, `1f22b2f`)

## Overview

Extract the ~87 lines of drag/drop + file-input + upload-progress boilerplate shared across the assessment photo panels into a single Svelte 5 function-based composable. Each panel keeps its entity-specific props, service calls, and template — only the universal input plumbing moves.

**Explicit framing**: this is NOT the "90% duplication" consolidation from the earlier dumps. Audit 1B confirmed panels diverge 75–80% on entity-specific logic. PR 6 extracts only the verified-identical 20–25%.

## Verified duplication inventory

From Explore-agent audit 2026-04-18:

### State (~8 lines shared across all panels)
```ts
let uploading = $state(false);
let compressing = $state(false);
let uploadProgress = $state(0);
let compressionProgress = $state(0);
let isDragging = $state(false);
let fileInput: HTMLInputElement;
let cameraInput: HTMLInputElement;
```

### Drag handlers (~38 lines, BYTE-IDENTICAL across 5+ panels)
```ts
function handleDragEnter(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  isDragging = true;
}
function handleDragOver(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
}
function handleDragLeave(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  if (shouldResetDragState(event)) {
    isDragging = false;
  }
}
async function handleDrop(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  isDragging = false;
  const files = Array.from(event.dataTransfer?.files || []);
  if (files.length > 0) {
    await uploadFiles(files);
  }
}
```

### File-input handlers (~15 lines, BYTE-IDENTICAL)
```ts
function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files || []);
  if (files.length > 0) {
    uploadFiles(files);
  }
}
function triggerFileInput() { fileInput?.click(); }
function triggerCameraInput() { cameraInput?.click(); }
```

**Total shared boilerplate per panel: ~87 lines (state + drag + file-input).**

## Per-panel decisions

### MIGRATE (6-7 assessment panels)

The composable fits these — each passes its own `onFilesSelected` callback to handle the entity-specific service calls:

1. `src/lib/components/assessment/EstimatePhotosPanel.svelte` — 422 lines → ~335 lines
2. `src/lib/components/assessment/InteriorPhotosPanel.svelte` — 427 lines → ~340 lines
3. `src/lib/components/assessment/Exterior360PhotosPanel.svelte` — 421 lines → ~335 lines
4. `src/lib/components/assessment/PreIncidentPhotosPanel.svelte` — 401 lines → ~315 lines
5. `src/lib/components/assessment/AdditionalsPhotosPanel.svelte` — 389 lines → ~305 lines
6. `src/lib/components/assessment/TyrePhotosPanel.svelte` — 315 lines → ~235 lines
7. **Verify with Glob**: `src/lib/components/assessment/DamagePhotosPanel.svelte` — may or may not exist; if present, migrate

### SKIP (explicit out-of-scope)

- `src/lib/components/shop/ShopPhotosPanel.svelte` — uses `storageService.uploadPhoto()` with filesystem path (not `uploadAssessmentPhoto()`). Different storage backend. Would need its own composable; defer.
- `src/lib/components/forms/PhotoUpload.svelte` — single-file form field, not a multi-photo panel. Different layout + single-photo upload flow. Skip.
- `src/lib/components/forms/PhotoUploadV2.svelte` — already uses `FileDropzone` abstraction. Don't double-abstract.

## Composable API

File: `src/lib/hooks/use-photo-upload.svelte.ts`

**Function-based, storage-API-agnostic.** The composable owns drag state + file input refs + drag handlers. The panel's `onFilesSelected` callback does everything else (compression, upload call, optimistic array update).

```ts
// src/lib/hooks/use-photo-upload.svelte.ts
import { shouldResetDragState } from '$lib/utils/drag-helpers';

export interface UsePhotoUploadConfig {
  /** Called when files are picked via drag/drop or file input. Panel owns the full upload flow. */
  onFilesSelected: (files: File[]) => Promise<void>;
  /** Optional — panel-level flag to disable drag target (e.g. during save). Default false. */
  disabled?: boolean;
}

export function usePhotoUpload(config: UsePhotoUploadConfig) {
  let uploading = $state(false);
  let compressing = $state(false);
  let uploadProgress = $state(0);
  let compressionProgress = $state(0);
  let isDragging = $state(false);
  let fileInput: HTMLInputElement | undefined = $state();
  let cameraInput: HTMLInputElement | undefined = $state();

  function handleDragEnter(event: DragEvent) {
    if (config.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    isDragging = true;
  }

  function handleDragOver(event: DragEvent) {
    if (config.disabled) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDragLeave(event: DragEvent) {
    if (config.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    if (shouldResetDragState(event)) {
      isDragging = false;
    }
  }

  async function handleDrop(event: DragEvent) {
    if (config.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    isDragging = false;
    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length > 0) {
      await config.onFilesSelected(files);
    }
  }

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files || []);
    if (files.length > 0) {
      await config.onFilesSelected(files);
    }
    // Reset so the same file can be re-selected
    target.value = '';
  }

  function triggerFileInput() {
    fileInput?.click();
  }

  function triggerCameraInput() {
    cameraInput?.click();
  }

  return {
    // Reactive state — expose as getters so consumers don't need $derived
    get uploading() { return uploading; },
    set uploading(v: boolean) { uploading = v; },
    get compressing() { return compressing; },
    set compressing(v: boolean) { compressing = v; },
    get uploadProgress() { return uploadProgress; },
    set uploadProgress(v: number) { uploadProgress = v; },
    get compressionProgress() { return compressionProgress; },
    set compressionProgress(v: number) { compressionProgress = v; },
    get isDragging() { return isDragging; },

    // DOM refs — panel binds these to its hidden <input> elements
    get fileInput() { return fileInput; },
    set fileInput(v: HTMLInputElement | undefined) { fileInput = v; },
    get cameraInput() { return cameraInput; },
    set cameraInput(v: HTMLInputElement | undefined) { cameraInput = v; },

    // Handlers
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    triggerFileInput,
    triggerCameraInput,
  };
}
```

**Design rationale**:
- **Getters + setters** on state let the panel mutate `upload.uploading = true` during its flow (pattern matches current inline code). Also lets Svelte track reactivity properly across the `.svelte.ts` boundary.
- `onFilesSelected` is the single extension point. Panel decides compression / storage / service / optimistic updates. Composable is storage-backend-agnostic.
- `fileInput` / `cameraInput` as bindable refs: panel uses `<input bind:this={upload.fileInput} ...>`.
- `target.value = ''` after file-select prevents the "can't re-select same file" browser quirk. Minor improvement over current inline code — flag in report if panels have a different pattern.

## Per-panel migration shape

### Pattern (example — EstimatePhotosPanel)

**Before** (representative block, lines 33–96 in the current file):
```ts
let uploading = $state(false);
let compressing = $state(false);
let uploadProgress = $state(0);
let compressionProgress = $state(0);
let isDragging = $state(false);
let fileInput: HTMLInputElement;
let cameraInput: HTMLInputElement;
let selectedPhotoIndex = $state<number | null>(null);

function handleDragEnter(event) { /* 4 lines */ }
function handleDragOver(event) { /* 3 lines */ }
function handleDragLeave(event) { /* 5 lines */ }
async function handleDrop(event) { /* 9 lines */ }
function handleFileSelect(event) { /* 6 lines */ }
function triggerFileInput() { /* 1 line */ }
function triggerCameraInput() { /* 1 line */ }

async function uploadFiles(files: File[]) {
  uploading = false;
  compressing = true;
  uploadProgress = 0;
  compressionProgress = 0;
  // ... panel-specific: compression, storage call, service call, optimistic array update
}
```

**After**:
```ts
import { usePhotoUpload } from '$lib/hooks/use-photo-upload.svelte';

const upload = usePhotoUpload({
  onFilesSelected: uploadFiles,
});
let selectedPhotoIndex = $state<number | null>(null);  // panel-specific, keeps in panel

async function uploadFiles(files: File[]) {
  upload.uploading = false;
  upload.compressing = true;
  upload.uploadProgress = 0;
  upload.compressionProgress = 0;
  // ... panel-specific logic UNCHANGED: compression, storage call, service call, optimistic array update
  // Reference upload.uploadProgress / upload.compressionProgress in the loop for progress updates
}
```

**Template changes**: `isDragging` → `upload.isDragging`, `fileInput` → `upload.fileInput`, handlers prefixed with `upload.` (`upload.handleDragEnter`, etc.).

### Variance notes per panel

- **InteriorPhotosPanel, TyrePhotosPanel** — both initialize `uploading = true` instead of `false` at the start of `uploadFiles`. This looks like a bug (you want to be in "compressing" state first, not "uploading" yet), but preserve current behavior: just set `upload.uploading = true` inside their `uploadFiles`. Flag in report as a potential follow-up.
- **AdditionalsPhotosPanel** — uses `onUpdate()` callback (no args) instead of `onPhotosUpdate(array)`. That's inside the panel's `uploadFiles` flow; the composable doesn't care. No change needed.
- **TyrePhotosPanel** — `subcategory` depends on `tyrePosition` prop. That's inside the panel's `uploadFiles` flow (when calling `storageService.uploadAssessmentPhoto`). Composable doesn't care.
- **DamagePhotosPanel** — if present, should follow the same pattern. Verify.

## Use Serena MCP

Per PR-3 / PR-5 pattern:
- `mcp__serena__get_symbols_overview` on each panel BEFORE reading — gets the function list + line ranges.
- `mcp__serena__find_symbol` with `include_body=True` on only the functions being replaced (the 7 shared ones) — confirms they match the expected pattern before blind-replacing.
- Don't read entire panel files unless necessary. Most panels will have the shared block concentrated in lines ~30–100.

## Implementation order

1. `mcp__serena__get_symbols_overview` on all 6-7 panels to confirm scope + exact function locations.
2. Write `src/lib/hooks/use-photo-upload.svelte.ts` (~100-120 lines).
3. **Pilot**: migrate `EstimatePhotosPanel.svelte` only. Type-check + build. Confirm the composable's getter/setter pattern works cleanly with reactive updates inside the panel's `uploadFiles`.
4. If pilot succeeds, batch-migrate: Interior, Exterior360, PreIncident, Additionals, Tyre, (Damage if present). One at a time, type-check after each.
5. Final verification (svelte-check + build).

If the pilot surfaces an unexpected issue with Svelte 5 reactivity across the composable boundary, STOP and report — don't force a fix under deadline.

## Hard constraints

1. **Zero behavior change.** The composable is a pure extraction of shared plumbing. Panel's `uploadFiles` logic, service calls, optimistic array, PhotoViewer integration all stay IN the panel.
2. **Don't touch out-of-scope panels** (ShopPhotosPanel, PhotoUpload, PhotoUploadV2).
3. **Don't extract PhotoViewer state** (`selectedPhotoIndex`, `openPhotoViewer`, `closePhotoViewer`) — separate concern.
4. **Don't introduce compression inside the composable** — `imageCompressionService` calls stay in each panel's `uploadFiles`.
5. **Don't change the `uploading = true` init quirk** in Interior/Tyre — preserve current behavior; flag for follow-up.
6. **Don't commit or push** — orchestrator handles.

## Verification

1. `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -80` — 0 new errors (baseline 0 + 29 pre-existing warnings).
2. `npm run build 2>&1 | tail -15` — succeeds.
3. **Adoption metric**: `grep -rn "from '\\$lib/hooks/use-photo-upload" src --include='*.svelte' | wc -l` — should equal the number of panels migrated (6 or 7).
4. **Duplication reduction**: `grep -rn "function handleDragEnter" src/lib/components --include='*.svelte' | wc -l` should drop from ~8 callsites to ~1-2 (only remaining: ShopPhotosPanel + PhotoUpload which are intentionally kept).

## Report back (≤500 words)

Structure:
- **Composable file**: final line count. Any API decisions you made beyond the spec (e.g., added a config option, different ref binding style).
- **Per panel**: name + before/after line count + any variance you had to preserve (e.g. Interior's `uploading = true` init stayed as-is).
- **Panel scope actually migrated**: 6 or 7 depending on whether DamagePhotosPanel exists.
- **Files touched count** + **net line delta** (projected ~−500 to −600 lines).
- **svelte-check + build results** (NEW errors only).
- **Any deviations from spec** with justification.
- **Any pilot-phase issue** with Svelte 5 reactivity across the composable boundary — quote the error if any.
- **Flag**: anything in the panels that's duplicated but didn't fit the composable (e.g. a 7th shared helper like `handleUploadZoneKeydown` — audit mentioned this in Exterior360 + ShopPhotosPanel).

## Notes

- Target: ~7 files (1 new composable + 6 panels migrated).
- Total projected delta: ~−500 to −600 lines net.
- If net drops below −400, that's still fine — some panels might have less variance-free boilerplate than expected.
- If you can't find `DamagePhotosPanel.svelte` via Glob, report it and skip — don't invent.
- Branch: `claude/confident-mendel`. Append commits. No new branch.
