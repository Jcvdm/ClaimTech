# Mobile Responsiveness Improvements - Sidebar & Assessment Page

**Created**: 2025-12-04
**Status**: Completed
**Complexity**: Moderate
**Branch**: `claude/mobile-setup-015X95Vmk6sHE6uzpqTRj182`

---

## Overview

Improve mobile responsiveness for the sidebar navigation and assessment page, particularly addressing issues with:
1. Sidebar behavior in landscape orientation on phones
2. Assessment page tabs layout on small screens
3. Assessment notes section taking too much vertical space
4. Header buttons and controls on mobile

---

## Issues Identified

### 1. Sidebar Issues

**Current Behavior:**
- Sidebar uses `md:block` (768px) breakpoint
- `IsMobile` class uses `max-width: 767px`
- Landscape phones (~850px wide) are treated as desktop → shows collapsed sidebar instead of drawer

**Problem:**
- On landscape phone, sidebar shows as fixed sidebar (not drawer)
- Takes up screen space or behaves unexpectedly
- Should remain as drawer/sheet on phones regardless of orientation

**Files:**
- `src/lib/hooks/is-mobile.svelte.ts` - Mobile breakpoint: 768px
- `src/lib/components/ui/sidebar/sidebar.svelte` - Uses `md:block`
- `src/lib/components/ui/sidebar/constants.ts` - Width definitions

### 2. Assessment Tabs Layout

**Current Behavior (AssessmentLayout.svelte:267-268):**
```svelte
<TabsList class="grid h-auto w-full grid-cols-2 gap-1.5 ... sm:grid-cols-4 ... md:grid-cols-6 lg:grid-cols-6">
```

**Problem:**
- 2 columns on mobile can show 10-13 tabs requiring lots of scrolling
- No horizontal scroll option
- Tabs can feel cramped

### 3. Assessment Notes Section

**Current Behavior (AssessmentNotes.svelte:91):**
```svelte
<div class="max-h-[500px] min-h-[200px] ...">
```

**Problem:**
- Takes up to 500px vertical space on mobile
- `min-h-[200px]` forces minimum height even when empty
- On small screens, notes can dominate the view

### 4. Assessment Header

**Current Behavior (AssessmentLayout.svelte:215-257):**
- Good responsive pattern with `flex-col sm:flex-row`
- Buttons use `flex-1 sm:flex-none` which is good

**Minor Issues:**
- "Last saved" timestamp could be hidden on very small screens
- Button text could be icons-only on mobile

---

## Implementation Plan

### Phase 1: Improve Sidebar Mobile Detection

**Goal:** Make sidebar always use drawer/sheet on phones, even in landscape

**Option A: Increase mobile breakpoint (Recommended)**
Change mobile breakpoint from 768px to 1024px (lg breakpoint):

```typescript
// src/lib/hooks/is-mobile.svelte.ts
const DEFAULT_MOBILE_BREAKPOINT = 1024; // Was 768
```

```svelte
<!-- src/lib/components/ui/sidebar/sidebar.svelte -->
<!-- Change md:block to lg:block -->
<div class="... hidden lg:block"> <!-- Was md:block -->
```

**Option B: Use device detection (Alternative)**
Detect actual device type vs just screen width.

**Recommended: Option A** - Simpler, uses standard Tailwind breakpoints, covers tablets too.

### Phase 2: Improve Assessment Tabs for Mobile

**Goal:** Make tabs scrollable horizontally on mobile instead of wrapping

**Changes to AssessmentLayout.svelte:**

```svelte
<!-- Current -->
<TabsList class="grid h-auto w-full grid-cols-2 gap-1.5 ... sm:grid-cols-4 md:grid-cols-6">

<!-- New: Horizontal scroll on mobile, grid on larger screens -->
<TabsList class="flex w-full gap-1.5 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0 md:grid-cols-6 lg:grid-cols-6">
```

Also add:
- Snap scrolling for better UX
- Hide scrollbar styling
- Minimum width per tab on mobile

### Phase 3: Make Assessment Notes Collapsible on Mobile

**Goal:** Notes section should be collapsible and take less space on mobile

**Changes:**
1. Add collapsible header (expand/collapse)
2. Reduce `max-h` on mobile
3. Make `min-h` responsive

```svelte
<!-- AssessmentNotes.svelte -->
<script>
  let isExpanded = $state(true);
  // On mobile, default to collapsed
  onMount(() => {
    if (window.innerWidth < 640) {
      isExpanded = false;
    }
  });
</script>

<Card class="...">
  <button onclick={() => isExpanded = !isExpanded}>
    <!-- Header with expand/collapse icon -->
  </button>

  {#if isExpanded}
    <div class="max-h-[300px] min-h-[100px] sm:max-h-[500px] sm:min-h-[200px]">
      <!-- Notes content -->
    </div>
  {/if}
</Card>
```

### Phase 4: Optimize Header for Mobile

**Goal:** More compact header on very small screens

**Changes:**
1. Hide "Last saved" text on xs screens, show icon only
2. Use icon-only buttons on xs screens
3. Smaller title on mobile

```svelte
<!-- Title -->
<h1 class="text-lg font-bold sm:text-xl lg:text-2xl">

<!-- Last saved - icon only on xs -->
<span class="hidden sm:inline">Last saved: {time}</span>
<span class="sm:hidden" title="Last saved: {time}">
  <Clock class="h-4 w-4 text-gray-400" />
</span>

<!-- Buttons - icons only on xs -->
<Button class="...">
  <Save class="h-4 w-4 sm:mr-2" />
  <span class="hidden sm:inline">Save</span>
</Button>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/hooks/is-mobile.svelte.ts` | Increase breakpoint to 1024px |
| `src/lib/components/ui/sidebar/sidebar.svelte` | Change `md:` to `lg:` for desktop sidebar |
| `src/lib/components/assessment/AssessmentLayout.svelte` | Horizontal scroll tabs, compact header |
| `src/lib/components/assessment/AssessmentNotes.svelte` | Collapsible, responsive heights |

---

## Implementation Details

### 1. Mobile Breakpoint Change

```typescript
// src/lib/hooks/is-mobile.svelte.ts
import { MediaQuery } from "svelte/reactivity";

const DEFAULT_MOBILE_BREAKPOINT = 1024; // Changed from 768

export class IsMobile extends MediaQuery {
  constructor(breakpoint: number = DEFAULT_MOBILE_BREAKPOINT) {
    super(`max-width: ${breakpoint - 1}px`);
  }
}
```

### 2. Sidebar Desktop Threshold

```svelte
<!-- src/lib/components/ui/sidebar/sidebar.svelte line 61 -->
<!-- Change: -->
class="text-sidebar-foreground group peer hidden md:block"
<!-- To: -->
class="text-sidebar-foreground group peer hidden lg:block"

<!-- Also line 83 -->
<!-- Change: -->
class="... hidden h-svh ... md:flex"
<!-- To: -->
class="... hidden h-svh ... lg:flex"
```

### 3. Horizontal Scroll Tabs

```svelte
<!-- src/lib/components/assessment/AssessmentLayout.svelte -->
<div class="border-b bg-white px-2 py-2 sm:px-6 lg:px-8">
  <Tabs ...>
    <TabsList
      class="flex w-full snap-x snap-mandatory gap-1.5 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:snap-none sm:grid-cols-4 sm:overflow-visible sm:pb-0 md:grid-cols-6 lg:grid-cols-6"
    >
      {#each tabs() as tab}
        <TabsTrigger
          value={tab.id}
          class="... min-w-[4.5rem] shrink-0 snap-start sm:min-w-0 sm:shrink"
        >
          <!-- Tab content -->
        </TabsTrigger>
      {/each}
    </TabsList>
  </Tabs>
</div>

<style>
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
</style>
```

### 4. Collapsible Notes

```svelte
<!-- src/lib/components/assessment/AssessmentNotes.svelte -->
<script lang="ts">
  import { ChevronDown, ChevronUp } from 'lucide-svelte';
  import { browser } from '$app/environment';

  let isExpanded = $state(true);

  // Default to collapsed on mobile
  $effect(() => {
    if (browser && window.innerWidth < 640) {
      isExpanded = false;
    }
  });
</script>

<Card class="border-blue-200 bg-blue-50/50">
  <!-- Header - now clickable -->
  <button
    onclick={() => isExpanded = !isExpanded}
    class="flex w-full items-center justify-between border-b border-blue-200 p-3 sm:p-4 hover:bg-blue-100/50 transition-colors"
  >
    <div class="flex items-center gap-2">
      <StickyNote class="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
      <h3 class="text-base sm:text-lg font-semibold text-gray-900">Notes</h3>
      <span class="text-xs sm:text-sm text-gray-500">({notes.length})</span>
    </div>
    {#if isExpanded}
      <ChevronUp class="h-4 w-4 text-gray-500" />
    {:else}
      <ChevronDown class="h-4 w-4 text-gray-500" />
    {/if}
  </button>

  {#if isExpanded}
    <!-- Notes content with responsive heights -->
    <div class="max-h-[250px] min-h-[100px] sm:max-h-[400px] sm:min-h-[150px] ...">
      <!-- Notes list -->
    </div>

    <div class="border-t border-blue-200 bg-white p-3 sm:p-4">
      <AddNoteInput onAdd={handleAddNote} />
    </div>
  {/if}
</Card>
```

---

## Verification Checklist

- [ ] Sidebar shows as drawer on phones in portrait mode
- [ ] Sidebar shows as drawer on phones in landscape mode
- [ ] Sidebar shows as collapsible sidebar on tablets/desktop
- [ ] Assessment tabs scroll horizontally on mobile
- [ ] Tabs snap to position when scrolling
- [ ] Notes section is collapsible
- [ ] Notes section defaults to collapsed on mobile
- [ ] Header buttons are compact on small screens
- [ ] `npm run check` passes

---

## Testing Viewports

| Device | Width | Expected Sidebar |
|--------|-------|------------------|
| iPhone SE | 375px | Drawer |
| iPhone 14 | 393px | Drawer |
| iPhone landscape | ~850px | Drawer |
| iPad Mini | 768px | Drawer |
| iPad | 1024px | Collapsible Sidebar |
| Desktop | 1280px+ | Collapsible Sidebar |

---

## Notes

- Using lg (1024px) breakpoint ensures tablets also get drawer experience
- Horizontal scroll tabs with snap provides native-like feel
- Collapsible notes saves vertical space without losing functionality
- Changes are backwards compatible with existing desktop layout
