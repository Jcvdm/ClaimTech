# Smart Layout System

**Created**: 2026-01-16
**Status**: In Progress
**Developer**: Claude
**Branch**: `claude/fix-ipad-sidebar-layout-FkQTZ`

## Overview

Implement a comprehensive, device-agnostic layout system that properly handles all screen sizes (mobile, tablet, desktop) with special attention to iPad/tablet devices. This addresses the current issues:

1. **Sidebar white block at bottom** on iPad landscape when scrolling
2. **Header label overlap** and compressed spacing on tablets
3. **Inconsistent responsive behavior** across the app
4. **Hardcoded z-index values** causing layering issues
5. **Missing tablet-specific breakpoints** (768-1024px gap)

## Current Problems

### Problem 1: Sidebar Height Issue
- **File**: `src/lib/components/ui/sidebar/sidebar-provider.svelte` line 45
- **Issue**: `min-h-svh` conflicts with iOS Safari dynamic viewport
- **Effect**: White block at bottom when scrolling on iPad

### Problem 2: Mobile Breakpoint Too High
- **File**: `src/lib/hooks/is-mobile.svelte.ts` line 3
- **Issue**: `DEFAULT_MOBILE_BREAKPOINT = 1024` treats iPad landscape as mobile
- **Effect**: iPad gets mobile-optimized (cramped) layouts

### Problem 3: Missing Tablet Styles
- **File**: `src/lib/components/assessment/AssessmentLayout.svelte` lines 216, 275
- **Issue**: Jumps from `sm:` (640px) to `lg:` (1024px), skipping `md:` (768px)
- **Effect**: Compressed spacing and 4-column tabs on iPad

### Problem 4: Inconsistent Z-Index
- **Files**: Various (NavigationLoadingBar, PhotoViewer, modals)
- **Issue**: Hardcoded z-10, z-50, z-1000, z-10000 scattered everywhere
- **Effect**: Unpredictable layering, potential conflicts

## Requirements

### Functional Requirements
- Sidebar fills full viewport height on ALL devices during scroll
- Proper spacing/padding on tablet devices (768-1024px)
- Consistent z-index layering across all components
- Touch-friendly interactions on tablets
- Safe area support for notched devices

### Non-Functional Requirements
- Performance: No layout thrashing or reflows
- Compatibility: Works in Chrome, Safari (including iOS), Firefox
- Maintainability: Centralized tokens, easy to update

## Implementation Plan

### Phase 1: Foundation - Layout Tokens
Add CSS custom properties to `app.css` for consistent values.

**Files to modify:**
- `src/app.css`

**Changes:**
```css
:root {
  /* Spacing Scale */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-12: 3rem;

  /* Z-Index Scale */
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-fixed: 300;
  --z-sidebar: 400;
  --z-header: 500;
  --z-modal-backdrop: 600;
  --z-modal: 700;
  --z-popover: 800;
  --z-tooltip: 900;
  --z-toast: 1000;

  /* Layout Dimensions */
  --header-height: 4rem;
  --header-height-compact: 3rem;
  --content-max-width: 80rem;

  /* Safe Areas */
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
}
```

### Phase 2: Smart Device Detection
Create enhanced device detection with tablet support.

**Files to create:**
- `src/lib/hooks/use-device.svelte.ts`

**Files to modify:**
- `src/lib/hooks/is-mobile.svelte.ts` (update breakpoint or deprecate)

### Phase 3: Fix Sidebar Height
Fix the viewport height issue in sidebar components.

**Files to modify:**
- `src/lib/components/ui/sidebar/sidebar-provider.svelte` - change `min-h-svh` to proper value
- `src/app.css` - add dvh support with fallbacks

### Phase 4: Fix Assessment Layout
Add tablet-specific responsive styles.

**Files to modify:**
- `src/lib/components/assessment/AssessmentLayout.svelte`
  - Line 216: Add `md:` breakpoint for header padding
  - Line 275: Adjust grid columns for tablet
  - Line 302: Use full labels on tablet, not abbreviated

### Phase 5: Z-Index Standardization
Replace hardcoded z-index values with CSS variables.

**Files to audit and update:**
- `src/lib/components/layout/NavigationLoadingBar.svelte`
- `src/lib/components/photo-viewer/PhotoViewer.svelte`
- `src/lib/components/ui/sidebar/sidebar.svelte`
- Any component using z-10, z-50, z-100, z-1000, etc.

### Phase 6: Testing & Verification
Test on multiple devices and browsers.

**Test Matrix:**
- [ ] Desktop Chrome (1920x1080)
- [ ] Desktop Firefox
- [ ] iPad Landscape Chrome (1024x768)
- [ ] iPad Portrait Chrome (768x1024)
- [ ] iPhone Safari (390x844)
- [ ] Android Chrome

## Step-by-Step Execution

### Step 1: Add Layout Tokens to app.css
- Add spacing scale CSS variables
- Add z-index scale CSS variables
- Add layout dimension variables
- Add safe area variables
- Add dvh viewport height support

### Step 2: Create use-device.svelte.ts
- Create new device detection hook with breakpoint queries
- Add deviceType getter (mobile/tablet/desktop)
- Add touch detection
- Add orientation detection
- Export singleton instance

### Step 3: Fix sidebar-provider.svelte
- Change `min-h-svh` to use dvh with fallback
- Ensure proper height calculation for iOS Safari

### Step 4: Update AssessmentLayout.svelte
- Add `md:` breakpoint to header padding (line 216)
- Add `md:` breakpoint to flex gap (line 217)
- Adjust TabsList grid columns (line 275)
- Update label logic to show full labels on tablet (line 302)

### Step 5: Update z-index values
- Replace z-50 with z-[var(--z-header)] in NavigationLoadingBar
- Replace z-10 with z-[var(--z-sidebar)] in sidebar
- Update PhotoViewer z-index values
- Audit other components

### Step 6: Test and verify
- Test sidebar scrolling on iPad
- Test assessment header spacing on iPad
- Verify z-index layering works correctly
- Check all breakpoints

## Files Modified Summary

| File | Changes |
|------|---------|
| `src/app.css` | Add layout tokens, dvh support |
| `src/lib/hooks/use-device.svelte.ts` | NEW - Smart device detection |
| `src/lib/hooks/is-mobile.svelte.ts` | Update or deprecate |
| `src/lib/components/ui/sidebar/sidebar-provider.svelte` | Fix min-h-svh |
| `src/lib/components/assessment/AssessmentLayout.svelte` | Add md: breakpoints |
| `src/lib/components/layout/NavigationLoadingBar.svelte` | Use z-index variables |
| `src/lib/components/photo-viewer/PhotoViewer.svelte` | Use z-index variables |
| `src/lib/components/ui/sidebar/sidebar.svelte` | Use z-index variables |

## Testing Plan

- [ ] Sidebar fills viewport on iPad landscape scroll
- [ ] Assessment header has proper spacing on iPad
- [ ] Tab labels are readable on iPad (not abbreviated)
- [ ] Z-index layering works (dropdowns over content, modals over everything)
- [ ] No white gaps or layout shifts on any device
- [ ] Safe areas respected on notched devices

## Rollback Plan

If issues arise:
1. Revert to previous commit
2. The changes are isolated to CSS and hooks, no database changes

## References

- MDN: CSS Viewport Units (dvh, svh, lvh): https://developer.mozilla.org/en-US/docs/Web/CSS/length#viewport-percentage_lengths
- MDN: Safe Area Insets: https://developer.mozilla.org/en-US/docs/Web/CSS/env
- Tailwind Breakpoints: https://tailwindcss.com/docs/responsive-design
