# EstimateTab Save Race Condition Fix

**Created**: 2025-12-05
**Status**: In Progress
**Complexity**: Moderate

## Problem Summary

Data loss occurs in EstimateTab due to a race condition between:
1. The `$effect` that syncs parent props to local state (lines 119-131)
2. The blur-triggered `saveAll()` calls that set `dirty = false` after completion

### Race Condition Flow
```
T1: User edits field A → dirty = true
T2: User blurs → saveAll() starts (async)
T3: User edits field B while save is in-flight
T4: Save completes → dirty = false
T5: $effect runs → resyncs from parent → FIELD B EDIT LOST
```

## Solution: Debounced Save Queue

Implement a debounced save mechanism that:
1. **Debounces saves** - Wait 1 second after last edit before saving
2. **Tracks save state properly** - Don't resync while save in-flight
3. **Serializes saves** - Only one save at a time
4. **Protects pending changes** - Never overwrite unsaved local edits

## Files to Modify

### 1. `src/lib/components/assessment/EstimateTab.svelte`

#### Changes Required:

**A. Add new state variables** (after line 113):
```typescript
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let saveInFlight = $state(false);
```

**B. Modify the $effect resync guard** (lines 119-131):
Change from:
```typescript
$effect(() => {
    if (!dirty) {
        // resync logic
    }
});
```
To:
```typescript
$effect(() => {
    // Only resync when: not dirty AND no save in flight
    if (!dirty && !saveInFlight) {
        if (estimate) {
            const cloned = deepClone(estimate);
            cloned.line_items = ensureLineItemIds(cloned.line_items);
            localEstimate = cloned;
        } else {
            localEstimate = null;
        }
    }
});
```

**C. Create debounced save function** (after saveAll function ~line 155):
```typescript
function scheduleSave() {
    // Clear any pending save timeout
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    // Schedule save after 1 second of no activity
    saveTimeout = setTimeout(async () => {
        saveTimeout = null;
        if (dirty && !saveInFlight) {
            await saveAll();
        }
    }, 1000);
}

// Immediate save (for tab changes, etc.) - cancels debounce
async function saveNow() {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
    }
    if (dirty) {
        await saveAll();
    }
}
```

**D. Modify saveAll() to track in-flight state**:
```typescript
async function saveAll() {
    if (!localEstimate || saveInFlight) return;
    saveInFlight = true;
    saving = true;
    try {
        await onUpdateEstimate({
            line_items: localEstimate.line_items,
            labour_rate: localEstimate.labour_rate,
            paint_rate: localEstimate.paint_rate,
            vat_percentage: localEstimate.vat_percentage,
            oem_markup_percentage: localEstimate.oem_markup_percentage,
            alt_markup_percentage: localEstimate.alt_markup_percentage,
            second_hand_markup_percentage: localEstimate.second_hand_markup_percentage,
            outwork_markup_percentage: localEstimate.outwork_markup_percentage,
            repairer_id: localEstimate.repairer_id,
            assessment_result: localEstimate.assessment_result
        });
        dirty = false;
    } finally {
        saving = false;
        saveInFlight = false;
    }
}
```

**E. Update onRegisterSave to use saveNow** (line 158-162):
```typescript
$effect(() => {
    if (onRegisterSave) {
        onRegisterSave(saveNow);  // Use saveNow for immediate save on tab change
    }
});
```

**F. Change blur handlers to use scheduleSave instead of saveAll**:

For each handler (`handleSASave`, `handleLabourSave`, `handlePaintSave`, `handlePartPriceSave`, `handleOutworkSave`):
- Change `await saveAll()` to `scheduleSave()`
- Remove the `async` keyword since we're not awaiting

Example for `handleSASave` (lines 418-429):
```typescript
function handleSASave(itemId: string) {
    if (tempSAHours !== null && localEstimate) {
        const saCost = tempSAHours * localEstimate.labour_rate;
        updateLocalItem(itemId, {
            strip_assemble_hours: tempSAHours,
            strip_assemble: saCost
        });
        scheduleSave();  // Debounced save instead of immediate
    }
    editingSA = null;
    tempSAHours = null;
}
```

**G. Update handleUpdateLineItem to use scheduleSave** (line 361-364):
```typescript
function handleUpdateLineItem(itemId: string, field: keyof EstimateLineItem, value: any) {
    updateLocalItem(itemId, { [field]: value } as Partial<EstimateLineItem>);
    scheduleSave();  // Debounced instead of await saveAll()
}
```

**H. Add cleanup for timeout on component destroy**:
Add to script section (use onDestroy from svelte):
```typescript
import { onDestroy } from 'svelte';

onDestroy(() => {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
});
```

**I. Update discardAll to clear pending save**:
```typescript
function discardAll() {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
    }
    localEstimate = estimate ? deepClone(estimate) : null;
    dirty = false;
}
```

## Verification Steps

1. `npm run check` passes with no errors
2. Test: Edit field A, immediately edit field B, wait 1 second - both should be saved
3. Test: Edit field, switch tabs - should save immediately
4. Test: Rapid edits to multiple fields - all should be preserved
5. Test: Click "Discard" while edits pending - should revert correctly
6. Test: "Unsaved" badge appears during edits, disappears after auto-save

## Notes

- The 1 second debounce delay provides good UX balance
- Tab changes and exit use `saveNow()` for immediate persistence
- The `saveInFlight` flag prevents the $effect from overwriting during save
- The `dirty` flag still controls the "Unsaved" badge display
