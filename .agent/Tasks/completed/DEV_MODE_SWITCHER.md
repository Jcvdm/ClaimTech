# Dev Mode Switcher Dropdown

**Created**: 2026-01-17
**Status**: Completed
**Complexity**: Moderate

## Overview

Add a dev mode dropdown to the app header that allows admin users to switch between app modes (Insurance, Autobody, Mechanical) for testing the shop expansion features.

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/stores/app-mode.svelte.ts` | Create | App mode store with localStorage persistence |
| `src/lib/components/layout/DevModeSwitcher.svelte` | Create | Dropdown component for mode switching |
| `src/routes/(app)/+layout.svelte` | Modify | Add DevModeSwitcher to header |

---

## Implementation Steps

### Step 1: Create App Mode Store
**File**: `src/lib/stores/app-mode.svelte.ts` (new file)

Create a singleton store using Svelte 5 runes pattern:
- Type: `'insurance' | 'autobody' | 'mechanical'`
- Default: `'insurance'`
- Persist to localStorage with key `'dev:app-mode'`
- Follow pattern from `src/lib/offline/network-status.svelte.ts`

### Step 2: Create Dev Mode Switcher Component
**File**: `src/lib/components/layout/DevModeSwitcher.svelte` (new file)

- Use shadcn-ui DropdownMenu components from `$lib/components/ui/dropdown-menu`
- 3 options: Insurance, Autobody, Mechanical
- Show current mode with visual indicator (badge/icon)
- Accept `role` prop, only render if `role === 'admin'`
- Look at existing dropdowns in the codebase for styling consistency

### Step 3: Add to App Layout Header
**File**: `src/routes/(app)/+layout.svelte`

- Import DevModeSwitcher component
- Add before user dropdown in header (in the `ml-auto` flex container, around line 73)
- Pass `data.profile.role` as the role prop

---

## Key Patterns

### Admin Check Pattern
```svelte
{#if role === 'admin'}
  <!-- admin-only content -->
{/if}
```

### Svelte 5 Store Pattern
```typescript
class SomeStore {
  value = $state<Type>(defaultValue);

  setValue(v: Type) {
    this.value = v;
  }
}
export const someStore = new SomeStore();
```

---

## Verification

- [x] Dropdown appears in header for admin users only
- [x] Mode persists across page refreshes (localStorage)
- [x] Non-admin users (engineers) don't see the dropdown
- [x] All 3 modes selectable: Insurance, Autobody, Mechanical
- [x] Current mode visually indicated
- [x] `npm run check` passes
