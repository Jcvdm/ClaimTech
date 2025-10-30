# UI Loading Patterns - ClaimTech

**Last Updated:** January 30, 2025
**Status:** Active Standard
**Related Docs:** [navigation_based_state_transitions.md](../SOP/navigation_based_state_transitions.md), [creating-components.md](../SOP/creating-components.md), [table_utilities.md](./table_utilities.md)

---

## Overview

ClaimTech uses three standardized loading patterns to provide user feedback during asynchronous operations:

1. **Global Navigation Bar** - Automatic progress bar for all page navigations
2. **Table Row Loading** - Visual feedback when navigating from list pages (RECOMMENDED for navigation)
3. **Button Loading States** - Individual button spinners for non-navigation actions

---

## Pattern Decision Tree

```
Is the action a navigation to another page?
├─ YES → Use Pattern 2: Table Row Loading (useNavigationLoading)
│        Best for: List pages with row clicks, action buttons that navigate
│        Examples: Assessments list, Inspections list, Appointments list
│
└─ NO → Is it a form submission or API call?
         ├─ YES → Use Pattern 3: Button Loading (ActionIconButton prop)
         │        Best for: Delete actions, downloads, status updates
         │        Examples: Generate PDF, Archive record, Send email
         │
         └─ NO → Pattern 1: Global Navigation Bar (automatic)
                  Best for: Standard page navigation without specific triggers
                  Examples: Clicking navigation menu items, breadcrumbs
```

---

## Pattern 1: Global Navigation Bar

**Status:** ✅ Fully Implemented
**Scope:** Automatic - no configuration needed
**Location:** `src/lib/components/layout/NavigationLoadingBar.svelte`

### Description
A thin blue progress bar that appears at the top of the viewport during all SvelteKit page navigations. Automatically tracks the `$navigating` store.

### Implementation
```svelte
<!-- Already integrated in src/routes/+layout.svelte -->
<NavigationLoadingBar />
```

### When It Appears
- User clicks navigation menu items
- Browser back/forward buttons
- Programmatic `goto()` calls
- Form submissions with page redirects

### Styling
```css
.loading-bar {
  @apply fixed top-0 left-0 right-0 h-1 z-50;
  background: linear-gradient(to right, transparent, rgb(37, 99, 235), transparent);
  animation: loading-bar 1.5s ease-in-out infinite;
}
```

---

## Pattern 2: Table Row Loading (RECOMMENDED)

**Status:** ✅ Fully Implemented
**Scope:** List pages with navigation actions
**Utility:** `src/lib/utils/useNavigationLoading.svelte.ts`
**Component:** `src/lib/components/data/ModernDataTable.svelte`

### When to Use
- ✅ List pages where rows navigate to detail pages
- ✅ Action buttons in table cells that trigger navigation
- ✅ Any scenario where user clicks an item to see more details
- ✅ Prevents double-clicks during navigation

### When NOT to Use
- ❌ Non-navigation actions (use Pattern 3 instead)
- ❌ Simple page links (Pattern 1 is sufficient)
- ❌ Modal/dialog triggers (no navigation)

### Complete Implementation Example

```svelte
<script lang="ts">
  import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
  import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
  import ActionButtonGroup from '$lib/components/ui/ActionButtonGroup.svelte';
  import ActionIconButton from '$lib/components/ui/ActionIconButton.svelte';
  import { Eye, Play } from 'lucide-svelte';

  // 1. Initialize the utility
  const { loadingId, startNavigation } = useNavigationLoading();

  // Sample data
  let assessments = $state([
    { id: '123', name: 'Assessment 1', status: 'pending' },
    { id: '456', name: 'Assessment 2', status: 'completed' }
  ]);

  // 2. Use startNavigation() in click handlers
  function handleRowClick(row: typeof assessments[0]) {
    startNavigation(row.id, `/work/assessments/${row.id}`);
  }

  function handleStartAssessment(assessmentId: string) {
    // Note: Table handles row-level loading via loadingRowId
    // No need for button-level loading prop
    startNavigation(assessmentId, `/work/assessments/${assessmentId}/start`);
  }

  // Define columns
  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'actions', label: 'Actions' }
  ];
</script>

<!-- 3. Pass loadingId and rowIdKey to table -->
<ModernDataTable
  data={assessments}
  {columns}
  onRowClick={handleRowClick}
  loadingRowId={loadingId}
  rowIdKey="id"
  striped
>
  {#snippet cellContent(column, row)}
    {#if column.key === 'actions'}
      <ActionButtonGroup align="right">
        <ActionIconButton
          icon={Eye}
          label="View Details"
          onclick={() => handleRowClick(row)}
        />
        <ActionIconButton
          icon={Play}
          label="Start Assessment"
          onclick={() => handleStartAssessment(row.id)}
          variant="primary"
          <!-- NO loading prop needed - table handles it -->
        />
      </ActionButtonGroup>
    {:else}
      {row[column.key]}
    {/if}
  {/snippet}
</ModernDataTable>
```

### API Reference

#### `useNavigationLoading()`

Returns an object with:

```typescript
{
  loadingId: string | null;           // ID of currently loading row
  startNavigation: (id: string, path: string) => void;  // Start navigation with loading
  isLoading: (id: string) => boolean; // Check if specific row is loading
}
```

**Features:**
- ✅ Automatic double-click prevention
- ✅ Auto-reset after navigation (300ms delay)
- ✅ Error handling with cleanup
- ✅ Compatible with `.svelte.ts` files (manual store subscription)
- ✅ Works seamlessly with SvelteKit's `goto()` function

**Implementation Notes:**
- Uses `navigating` store from `$app/stores`
- Subscribes when `startNavigation()` is called
- Automatically unsubscribes and resets on completion
- Cleans up on errors to prevent memory leaks

#### ModernDataTable Loading Props

```typescript
interface LoadingProps<T> {
  loadingRowId?: string | null;           // ID of row currently loading
  loadingIndicator?: 'spinner' | 'pulse' | 'none';  // Style (default: 'spinner')
  rowIdKey?: keyof T;                     // Row identifier property (default: 'id')
}
```

**Visual Behavior:**
- **Loading Row:** Blue background (`bg-blue-50`), pulse animation, spinner in first cell
- **Other Rows:** Faded to 60% opacity (`opacity-60`)
- **Row Clicks:** Disabled while any row is loading
- **Auto-Reset:** 300ms after navigation completes

### Common Row ID Keys by Page

| Page | `rowIdKey` Value | Data Type | Notes |
|------|-----------------|-----------|-------|
| Assessments | `"appointment_id"` | UUID | Links to appointment |
| Inspections | `"id"` | UUID | Direct record ID |
| Appointments | `"appointment_id"` | UUID | Primary identifier |
| Finalized Assessments | `"appointmentId"` | UUID | camelCase variant |
| FRC | `"id"` | UUID | Direct record ID |
| Additionals | `"id"` | UUID | Direct record ID |
| Requests | `"id"` | UUID | Direct record ID |

### Implementation Checklist

When adding loading states to a new list page:

- [ ] Import `useNavigationLoading` utility
- [ ] Destructure `{ loadingId, startNavigation }`
- [ ] Update `handleRowClick` to use `startNavigation(id, path)`
- [ ] Add `loadingRowId={loadingId}` to ModernDataTable
- [ ] Add `rowIdKey="appropriate_key"` to ModernDataTable (see table above)
- [ ] Remove any button-level `loading` props (table handles it)
- [ ] Test double-click prevention
- [ ] Test loading state auto-reset
- [ ] Test error handling

### Pages Using This Pattern

**Reference Implementations:**
- ✅ `src/routes/(app)/work/assessments/+page.svelte`
- ✅ `src/routes/(app)/work/inspections/+page.svelte`
- ✅ `src/routes/(app)/work/appointments/+page.svelte` (Fixed Jan 30, 2025)
- ✅ `src/routes/(app)/work/finalized-assessments/+page.svelte`
- ✅ `src/routes/(app)/work/frc/+page.svelte`
- ✅ `src/routes/(app)/work/additionals/+page.svelte`
- ✅ `src/routes/(app)/requests/+page.svelte`

---

## Pattern 3: Button Loading States

**Status:** ✅ Fully Implemented
**Scope:** Individual actions that don't navigate
**Component:** `src/lib/components/ui/ActionIconButton.svelte`

### When to Use
- ✅ API calls that don't navigate (delete, update, download)
- ✅ Form submissions that stay on the same page
- ✅ Actions that show success/error toasts
- ✅ PDF generation, file downloads
- ✅ Email sending, notifications

### When NOT to Use
- ❌ Navigation actions (use Pattern 2 instead)
- ❌ Actions in table rows that navigate (use Pattern 2)
- ❌ Simple links to other pages (Pattern 1 is sufficient)

### Implementation Example

```svelte
<script lang="ts">
  import ActionIconButton from '$lib/components/ui/ActionIconButton.svelte';
  import { FileDown, Trash2 } from 'lucide-svelte';

  // Track loading state per action type
  let generatingPdf = $state<string | null>(null);
  let deletingRecord = $state<string | null>(null);

  async function handleGeneratePdf(recordId: string) {
    generatingPdf = recordId;
    try {
      const response = await fetch(`/api/reports/${recordId}/pdf`, {
        method: 'POST'
      });
      if (response.ok) {
        const blob = await response.blob();
        // Download logic...
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      generatingPdf = null;
    }
  }

  async function handleDelete(recordId: string) {
    deletingRecord = recordId;
    try {
      await fetch(`/api/records/${recordId}`, { method: 'DELETE' });
      // Remove from list, show toast, etc.
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      deletingRecord = null;
    }
  }
</script>

<ActionIconButton
  icon={FileDown}
  label="Generate PDF"
  onclick={() => handleGeneratePdf(record.id)}
  loading={generatingPdf === record.id}
/>

<ActionIconButton
  icon={Trash2}
  label="Delete"
  onclick={() => handleDelete(record.id)}
  loading={deletingRecord === record.id}
  variant="danger"
/>
```

### ActionIconButton Loading Prop

```typescript
interface ActionIconButtonProps {
  loading?: boolean;  // Shows spinner instead of icon when true
  // ... other props
}
```

**Visual Behavior:**
- Shows `<Loader2>` spinner with `animate-spin` class
- Replaces the normal icon while loading
- Button remains clickable (prevent in handler with early return)
- No automatic double-click prevention (handle manually)

### Best Practices

1. **One Loading State Per Action Type:**
   ```typescript
   // ✅ GOOD: Separate states for different actions
   let generatingPdf = $state<string | null>(null);
   let deletingRecord = $state<string | null>(null);

   // ❌ BAD: Single state for multiple action types
   let loading = $state<string | null>(null); // Ambiguous
   ```

2. **Always Reset in Finally Block:**
   ```typescript
   try {
     await performAction();
   } catch (error) {
     // Handle error
   } finally {
     loadingState = null; // ✅ Always reset
   }
   ```

3. **Track by ID for List Pages:**
   ```typescript
   // ✅ GOOD: Can load multiple records independently
   loading={generatingPdf === record.id}

   // ❌ BAD: All buttons show loading
   loading={generatingPdf === true}
   ```

---

## Common Bug: Missing Variable Declaration

### The Problem

**Symptom:** `Uncaught ReferenceError: [variable] is not defined`

**Example from appointments/+page.svelte (Fixed Jan 30, 2025):**

```svelte
<script lang="ts">
  // ❌ WRONG: Variable never declared
  // let startingAssessment = $state<string | null>(null); // Missing!

  async function handleStartAssessment(assessmentId: string) {
    startNavigation(assessmentId, `/work/assessments/${assessmentId}`);
  }
</script>

<!-- ❌ ERROR: startingAssessment is not defined -->
<ActionIconButton
  loading={startingAssessment === row.assessment_id}
  onclick={() => handleStartAssessment(row.id)}
/>
```

### The Root Cause

Developer tried to implement custom loading state for navigation action instead of using the standardized `useNavigationLoading()` utility. This creates:
- Undefined variable references
- Redundant loading state management
- Inconsistent patterns across pages
- No double-click prevention

### The Solution

**Option 1: Remove Button Loading (RECOMMENDED):**
```svelte
<script lang="ts">
  const { loadingId, startNavigation } = useNavigationLoading();

  function handleStartAssessment(assessmentId: string) {
    // Note: Table handles row-level loading via loadingRowId
    startNavigation(assessmentId, `/work/assessments/${assessmentId}`);
  }
</script>

<ModernDataTable loadingRowId={loadingId} rowIdKey="id" />

<!-- ✅ CORRECT: No loading prop - table handles it -->
<ActionIconButton
  onclick={() => handleStartAssessment(row.id)}
/>
```

**Option 2: Add Custom State (NOT RECOMMENDED):**
```svelte
<script lang="ts">
  const { loadingId, startNavigation } = useNavigationLoading();
  let startingAssessment = $state<string | null>(null); // ✅ Now declared

  async function handleStartAssessment(assessmentId: string) {
    startingAssessment = assessmentId;
    try {
      startNavigation(assessmentId, `/work/assessments/${assessmentId}`);
    } finally {
      setTimeout(() => { startingAssessment = null; }, 300);
    }
  }
</script>

<!-- ✅ Works but redundant with table loading -->
<ActionIconButton
  loading={startingAssessment === row.assessment_id}
  onclick={() => handleStartAssessment(row.id)}
/>
```

**Why Option 1 is Better:**
- ✅ Simpler code (no extra state management)
- ✅ Consistent with other pages (inspections, FRC, etc.)
- ✅ Less redundancy (table already handles loading)
- ✅ Better UX (entire row highlights)
- ✅ Proper double-click prevention

---

## Troubleshooting

### Loading State Doesn't Appear

**Symptoms:**
- No visual feedback when clicking row/button
- Navigation happens but no loading animation

**Checklist:**
1. ✅ Verify `loadingRowId={loadingId}` is passed to ModernDataTable
2. ✅ Check that `rowIdKey` matches actual property name in data
3. ✅ Ensure `startNavigation()` is called (not bare `goto()`)
4. ✅ Check browser console for errors
5. ✅ Verify data items have the ID property specified in `rowIdKey`

### Double-Clicks Still Navigate Twice

**Symptoms:**
- Clicking quickly navigates to same page twice
- Browser history has duplicate entries
- Loading state shows briefly then repeats

**Solutions:**
1. ✅ Use `startNavigation()` not `goto()` directly
2. ✅ Ensure `useNavigationLoading()` is properly imported
3. ✅ Verify `loadingId` is passed to ModernDataTable
4. ✅ Check no other click handlers are calling navigation

### Loading State Doesn't Reset

**Symptoms:**
- Row stays in loading state after navigation
- Blue background and spinner persist
- Have to refresh page to clear

**Checklist:**
1. ✅ Verify navigation actually completes (check URL)
2. ✅ Check browser console for JavaScript errors
3. ✅ Ensure `$navigating` store is working (SvelteKit feature)
4. ✅ Check that 300ms timeout isn't being interrupted
5. ✅ Verify no errors in navigation target page

### Wrong Row Shows Loading

**Symptoms:**
- Different row lights up than the one clicked
- Multiple rows show loading state
- No rows show loading state

**Solution:**
Verify `rowIdKey` matches the actual property name:

```svelte
<!-- ❌ WRONG: rowIdKey doesn't match data -->
<ModernDataTable
  data={appointments}
  rowIdKey="id"  <!-- But data has "appointment_id"! -->
/>

<!-- ✅ CORRECT: rowIdKey matches data property -->
<ModernDataTable
  data={appointments}
  rowIdKey="appointment_id"
/>
```

### Button Loading Prop Has No Effect

**Symptoms:**
- `loading={true}` but button still shows icon
- Spinner never appears

**Checklist:**
1. ✅ Verify using `ActionIconButton` not regular `<button>`
2. ✅ Check that `loading` prop is actually `true` (use console.log)
3. ✅ Ensure Loader2 icon is available (from lucide-svelte)
4. ✅ Check no CSS overrides hiding the spinner
5. ✅ Verify component is latest version with loading support

---

## Technical Implementation Details

### Why Manual Store Subscription?

The `useNavigationLoading` utility uses manual store subscription instead of Svelte 5 runes because:

1. **File Type:** Utility is in `.svelte.ts` file, not `.svelte` component
2. **Auto-Subscription:** `$navigating` syntax only works in `.svelte` files
3. **Effect Context:** `$effect` requires component context to run
4. **Reliability:** Manual `subscribe()` works in utility functions

### Store Subscription Lifecycle

```typescript
export function useNavigationLoading() {
  let loadingId = $state<string | null>(null);
  let unsubscribe: (() => void) | null = null;
  let resetTimeout: ReturnType<typeof setTimeout> | null = null;

  function startNavigation(id: string, path: string) {
    if (loadingId === id) return; // Prevent double-click

    loadingId = id;

    // Clean up previous subscription
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    // Subscribe to navigation state changes
    unsubscribe = navigating.subscribe((nav) => {
      if (nav === null && loadingId) {
        // Navigation completed, reset after delay
        resetTimeout = setTimeout(() => {
          loadingId = null;
        }, 300);
      }
    });

    // Navigate
    try {
      goto(path);
    } catch (error) {
      console.error('Navigation error:', error);
      loadingId = null;
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    }
  }

  return {
    get loadingId() { return loadingId; },
    startNavigation,
    isLoading: (id: string) => loadingId === id
  };
}
```

### ModernDataTable Integration

The table component applies loading styles based on `loadingRowId`:

```svelte
<script lang="ts">
  let { loadingRowId, rowIdKey = 'id', ... } = $props();

  function getRowId(item: T): string {
    return String(item[rowIdKey]);
  }

  function isRowLoading(item: T): boolean {
    return loadingRowId !== null && getRowId(item) === loadingRowId;
  }
</script>

<tr
  class:loading-row={isRowLoading(item)}
  class:dimmed-row={loadingRowId !== null && !isRowLoading(item)}
>
  {#if isRowLoading(item)}
    <!-- Show spinner in first cell -->
  {/if}
  <!-- ... rest of row -->
</tr>
```

---

## Performance Considerations

### Memory
- Loading state is automatically cleaned up after navigation
- Store subscriptions are properly unsubscribed
- Timeouts are cleared on unmount

### CPU
- CSS animations are GPU-accelerated
- Minimal JavaScript overhead (subscribe/unsubscribe)
- No polling or intervals

### Bundle Size
- ~2KB gzipped for utility + component updates
- Leverages existing SvelteKit navigation infrastructure
- No additional dependencies

### Network
- No extra API calls
- Uses standard SvelteKit navigation
- No additional requests for loading states

---

## Accessibility

**Current State:**
- ✅ Loading state is visual
- ✅ Disabled row clicks prevent double-submission
- ✅ Spinner uses inline SVG (visible to screen readers)
- ✅ Color contrast meets WCAG AA standards

**Future Enhancements:**
- ⏳ Add `aria-busy="true"` to loading rows
- ⏳ Add `aria-label` describing loading state
- ⏳ Announce navigation start/completion to screen readers
- ⏳ Add keyboard shortcuts for navigation

---

## Related Documentation

- **[navigation_based_state_transitions.md](../SOP/navigation_based_state_transitions.md)** - Server-side state changes during navigation
- **[creating-components.md](../SOP/creating-components.md)** - ActionIconButton component API
- **[table_utilities.md](./table_utilities.md)** - Table formatting and utility functions
- **[project_architecture.md](./project_architecture.md)** - Overall system architecture

---

## Reference Files

### Source Code
- `src/lib/utils/useNavigationLoading.svelte.ts` - Loading utility implementation
- `src/lib/components/layout/NavigationLoadingBar.svelte` - Global progress bar
- `src/lib/components/data/ModernDataTable.svelte` - Table component with loading support
- `src/lib/components/ui/ActionIconButton.svelte` - Button with loading prop

### Historical Documentation
- `LOADING_PATTERNS_GUIDE.md` (root) - Original comprehensive guide
- `LOADING_ANIMATIONS_DEPLOYMENT.md` (root) - Deployment history
- `LOADING_ANIMATIONS_TESTING.md` (root) - Testing procedures
- `LOADING_ANIMATIONS_FIXES.md` (root) - Technical fixes log

---

**Document Version:** 1.0
**Last Reviewed:** January 30, 2025
**Next Review:** February 2025 or when patterns change
