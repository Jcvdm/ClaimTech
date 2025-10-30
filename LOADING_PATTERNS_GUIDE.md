# Loading Animations Patterns Guide

## Quick Reference

### Global Navigation Loading Bar
Automatically shows when navigating between pages. No configuration needed.

```svelte
<!-- Already integrated in src/routes/+layout.svelte -->
<NavigationLoadingBar />
```

### Table Row Loading States
Use the `useNavigationLoading` utility with `ModernDataTable`:

```svelte
<script lang="ts">
  import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
  
  const { loadingId, startNavigation } = useNavigationLoading();
  
  function handleRowClick(row: any) {
    startNavigation(row.id, `/path/${row.id}`);
  }
</script>

<ModernDataTable
  data={items}
  {columns}
  onRowClick={handleRowClick}
  loadingRowId={loadingId}
  rowIdKey="id"  <!-- or "appointment_id", "appointmentId", etc. -->
  striped
/>
```

## API Reference

### useNavigationLoading()

**Returns:**
```typescript
{
  loadingId: string | null;           // ID of currently loading row
  startNavigation(id: string, path: string): void;  // Start navigation with loading state
  isLoading(id: string): boolean;     // Check if specific row is loading
}
```

**Features:**
- Automatic double-click prevention
- Automatic loading state reset after navigation (300ms delay)
- Error handling with graceful fallback
- Works with SvelteKit's `goto()` function
- Uses manual store subscription (compatible with `.svelte.ts` files)

**Implementation Details:**
- Uses `navigating` store from `$app/stores` to track navigation state
- Subscribes to store changes when `startNavigation()` is called
- Automatically resets `loadingId` to `null` when navigation completes
- Cleans up subscriptions on error to prevent memory leaks

### ModernDataTable Props

**New Loading Props:**
```typescript
loadingRowId?: string | null;           // ID of row currently loading
loadingIndicator?: 'spinner' | 'pulse' | 'none';  // Loading style (default: 'spinner')
rowIdKey?: keyof T;                     // Which property to use as row ID (default: 'id')
```

**Loading State Behavior:**
- Loading row: Blue background, pulse animation, spinner in first cell
- Other rows: Fade to 60% opacity
- Row clicks: Disabled while loading
- Auto-reset: 300ms after navigation completes

## Implementation Checklist

When adding loading states to a new list page:

- [ ] Import `useNavigationLoading` utility
- [ ] Destructure `{ loadingId, startNavigation }` from utility
- [ ] Update `handleRowClick` to use `startNavigation(id, path)`
- [ ] Add `loadingRowId={loadingId}` to ModernDataTable
- [ ] Add `rowIdKey="appropriate_key"` to ModernDataTable
- [ ] Test double-click prevention
- [ ] Test loading state reset
- [ ] Test error handling

## Common Row ID Keys

| Page | rowIdKey | Example |
|------|----------|---------|
| Assessments | `"appointment_id"` | UUID |
| Inspections | `"id"` | UUID |
| Appointments | `"appointment_id"` | UUID |
| Finalized Assessments | `"appointmentId"` | camelCase UUID |
| FRC | `"id"` | UUID |
| Additionals | `"id"` | UUID |
| Requests | `"id"` | UUID |

## Styling Reference

### Loading Row Styles
```css
/* Applied when row is loading */
.loading-row {
  @apply bg-blue-50 border-blue-200 animate-pulse;
}

/* Applied to other rows when any row is loading */
.dimmed-row {
  @apply opacity-60;
}
```

### Navigation Bar Styles
```css
/* Global loading bar at top of viewport */
.loading-bar {
  @apply fixed top-0 left-0 right-0 h-1 z-50;
  background: linear-gradient(to right, transparent, rgb(37, 99, 235), transparent);
  animation: loading-bar 1.5s ease-in-out infinite;
}
```

## Implementation Notes

### Why Manual Store Subscription?
The `useNavigationLoading` utility uses manual store subscription instead of Svelte 5 runes (`$effect`, `$state`) because:
1. The utility is in a `.svelte.ts` file, not a `.svelte` component
2. Store auto-subscription syntax (`$navigating`) only works in `.svelte` files
3. `$effect` requires component context to run properly
4. Manual subscription with `navigating.subscribe()` works reliably in utility functions

### Store Subscription Lifecycle
```typescript
// Subscription is created when startNavigation() is called
unsubscribe = navigating.subscribe((nav) => {
  if (nav === null && loadingId) {
    // Navigation completed, reset loading state after 300ms
    resetTimeout = setTimeout(() => {
      loadingId = null;
    }, 300);
  }
});

// Subscription is cleaned up on error
if (unsubscribe) {
  unsubscribe();
  unsubscribe = null;
}
```

## Troubleshooting

### Loading state doesn't appear
- Verify `loadingRowId={loadingId}` is passed to ModernDataTable
- Check that `rowIdKey` matches the actual property name in your data
- Ensure `startNavigation()` is called instead of `goto()`
- Check browser console for any errors

### Double-clicks still navigate twice
- Verify you're using `startNavigation()` not `goto()`
- Check that the utility is properly imported
- Ensure no other navigation logic is running
- Verify `loadingId` is being passed to ModernDataTable

### Loading state doesn't reset
- Verify navigation actually completes
- Check browser console for errors
- Ensure `$navigating` store is working (SvelteKit feature)
- Check that the 300ms timeout isn't being interrupted

### Spinner doesn't show
- Verify `loadingIndicator` prop is not set to `'none'`
- Check that ModernDataTable is rendering the spinner
- Ensure CSS animations are enabled in browser
- Verify the row's `loadingId` matches the data's ID property

## Performance Considerations

1. **Memory**: Loading state is automatically cleaned up after navigation
2. **CPU**: Animations use CSS (GPU-accelerated), minimal JavaScript overhead
3. **Bundle Size**: ~2KB gzipped for utility + component updates
4. **Network**: No additional network requests, uses existing SvelteKit navigation

## Accessibility

- Loading state is visual only (no ARIA announcements yet)
- Disabled row clicks prevent accidental double-submissions
- Spinner uses inline SVG (accessible to screen readers)
- Future: Add `aria-busy` and `aria-label` for better a11y

## Future Enhancements

1. Add toast notifications for navigation errors
2. Implement skeleton screens during loading
3. Add loading state to action buttons
4. Track navigation timing for analytics
5. Add accessibility announcements
6. Support for custom loading indicators
7. Configurable loading state duration

