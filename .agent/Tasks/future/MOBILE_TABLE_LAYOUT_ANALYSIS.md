# Mobile Table Layout Improvements - Analysis & Recommendations

**Created**: 2025-12-04
**Status**: Analysis Complete - Awaiting Decision
**Scope**: EstimateTab, AdditionalsTab, FRCTab tables

---

## Current State Analysis

### EstimateTab Table (Line Items)

**Columns (12 total):**
| # | Column | Width | Mobile Priority |
|---|--------|-------|-----------------|
| 1 | Checkbox | 40px | Low - can hide |
| 2 | Type (N/R/P/O) | 50px | Medium |
| 3 | Part Type (OEM/ALT) | 60px | Medium |
| 4 | Description | 180px+ | **High** |
| 5 | Part Price | 120px | Medium |
| 6 | S&A | 100px | Low |
| 7 | Labour | 120px | Low |
| 8 | Paint | 100px | Low |
| 9 | Outwork | 120px | Low |
| 10 | Betterment % | 40px | Low |
| 11 | Total | 140px | **High** |
| 12 | Actions | 60px | **High** |

**Total minimum width: ~1,130px** (mobile screens: 320-428px)

**Current mobile experience:**
- Horizontal scroll required
- Can't see description and total at same time
- Hard to edit while scrolling
- Touch targets too small when zoomed out

### AdditionalsTab Table

**Columns (11 total):** Similar structure to Estimate
- Same horizontal scroll issues
- Additional complexity with status/actions columns

---

## Mobile Table Design Patterns

### Pattern 1: Responsive Card Layout ⭐ RECOMMENDED

**How it works:**
- Desktop: Traditional table layout
- Mobile: Each row becomes a card
- Card shows key info, tap to expand for details

**Pros:**
- No horizontal scroll
- Large touch targets
- Easy to scan
- Natural on mobile

**Cons:**
- Takes more vertical space
- Different visual experience

**Example Layout:**
```
┌─────────────────────────────────────┐
│ [N] Front Bumper Cover              │
│     OEM · Part: R12,450             │
│─────────────────────────────────────│
│ S&A: R850  Labour: R1,200  Paint: - │
│─────────────────────────────────────│
│                      Total: R14,500 │
│ [Edit] [Delete]                     │
└─────────────────────────────────────┘
```

### Pattern 2: Stacked Two-Row Layout

**How it works:**
- Each item spans 2 rows on mobile
- Row 1: Description, Type, Total
- Row 2: Cost breakdown (collapsible)

**Pros:**
- Still feels like a table
- Compact when collapsed

**Cons:**
- More complex to implement
- Odd visual rhythm

### Pattern 3: Column Priority with Hidden Columns

**How it works:**
- Show only essential columns on mobile
- Hide S&A, Labour, Paint, Outwork, Betterment
- Show in expandable "Details" section

**Mobile visible:** Type, Description, Total, Actions
**Hidden (tap to show):** Part, S&A, Labour, Paint, Outwork, Betterment

**Pros:**
- Keeps table familiar
- Less horizontal scroll

**Cons:**
- Still need some scroll
- Users may miss hidden data

### Pattern 4: Swipe-to-Reveal Columns

**How it works:**
- Pin Description column
- Swipe left to reveal cost columns
- Swipe right to reveal actions

**Pros:**
- Familiar mobile gesture
- Keeps table structure

**Cons:**
- Not discoverable
- Hard to compare rows

### Pattern 5: Horizontal Scroll with Sticky Column (Current + Enhancement)

**Enhancements:**
- Make Description sticky/pinned
- Add scroll indicators
- Larger touch targets

**Pros:**
- Minimal code changes
- Preserves current UX

**Cons:**
- Still requires scrolling
- Not ideal for editing

---

## Recommendation: Pattern 1 (Responsive Card Layout)

### Why Cards?

1. **No horizontal scroll** - Everything fits on screen
2. **Better for editing** - Larger input fields
3. **Familiar mobile pattern** - Like shopping carts, orders
4. **Touch-friendly** - Large tap targets
5. **Scannable** - Key info visible at glance

### Proposed Implementation

#### Desktop (>= 768px): Keep Current Table
No changes to existing table layout.

#### Mobile (< 768px): Card Layout

```svelte
<!-- Mobile: Card Layout -->
<div class="space-y-3 md:hidden">
  {#each lineItems as item}
    <Card class="p-3">
      <!-- Header Row -->
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2">
          <Badge>{item.process_type}</Badge>
          {#if item.part_type}
            <Badge variant="outline">{item.part_type}</Badge>
          {/if}
        </div>
        <span class="text-lg font-bold">{formatCurrency(item.total)}</span>
      </div>

      <!-- Description -->
      <Input
        value={item.description}
        class="mt-2"
        placeholder="Description"
      />

      <!-- Cost Breakdown (Collapsible) -->
      <Collapsible class="mt-2">
        <CollapsibleTrigger class="text-sm text-blue-600">
          View cost breakdown
        </CollapsibleTrigger>
        <CollapsibleContent class="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div>Part: {formatCurrency(item.part_price_nett)}</div>
          <div>S&A: {formatCurrency(item.strip_assemble)}</div>
          <div>Labour: {formatCurrency(item.labour_cost)}</div>
          <div>Paint: {formatCurrency(item.paint_cost)}</div>
          <div>Outwork: {formatCurrency(item.outwork_charge)}</div>
          {#if item.betterment_total}
            <div class="text-red-600">Betterment: -{formatCurrency(item.betterment_total)}</div>
          {/if}
        </CollapsibleContent>
      </Collapsible>

      <!-- Actions -->
      <div class="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="outline" onclick={() => handleEdit(item)}>
          Edit
        </Button>
        <Button size="sm" variant="destructive" onclick={() => handleDelete(item.id)}>
          <Trash2 class="h-4 w-4" />
        </Button>
      </div>
    </Card>
  {/each}
</div>

<!-- Desktop: Keep existing Table -->
<div class="hidden md:block">
  <!-- Current Table.Root implementation -->
</div>
```

### Alternative: Enhanced Horizontal Scroll (Lower Effort)

If cards feel too different, enhance current table:

1. **Pin Description column**
2. **Add visual scroll indicator**
3. **Increase row height on mobile**
4. **Add "swipe to see more" hint**

```svelte
<div class="relative">
  <!-- Scroll hint -->
  <div class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white pointer-events-none md:hidden" />

  <div class="overflow-x-auto">
    <Table.Root class="min-w-[800px]"> <!-- Force minimum width -->
      <!-- Sticky first column -->
      <Table.Cell class="sticky left-0 bg-white z-10">
        {item.description}
      </Table.Cell>
    </Table.Root>
  </div>
</div>
```

---

## Implementation Effort Comparison

| Approach | Effort | Mobile UX | Desktop Impact |
|----------|--------|-----------|----------------|
| **Cards (Recommended)** | 2-3 days | ⭐⭐⭐⭐⭐ | None |
| Enhanced Scroll | 0.5-1 day | ⭐⭐⭐ | None |
| Column Hiding | 1-2 days | ⭐⭐⭐⭐ | None |
| Swipe Columns | 2-3 days | ⭐⭐⭐ | None |

---

## Files to Modify

| File | Changes |
|------|---------|
| `EstimateTab.svelte` | Add mobile card layout |
| `AdditionalsTab.svelte` | Add mobile card layout |
| `FRCTab.svelte` | Add mobile card layout (if applicable) |
| `QuickAddLineItem.svelte` | Mobile-friendly form |

---

## Decision Points

Before implementation, decide:

1. **Which pattern?**
   - [ ] Cards (recommended)
   - [ ] Enhanced scroll (quick win)
   - [ ] Column hiding
   - [ ] Other

2. **Which tables?**
   - [ ] EstimateTab only (start here)
   - [ ] All tables at once

3. **Edit behavior on mobile?**
   - [ ] Inline edit in cards
   - [ ] Tap to open edit modal
   - [ ] Swipe to reveal edit button

4. **Cost breakdown visibility?**
   - [ ] Always visible
   - [ ] Collapsible (save space)
   - [ ] Only show non-zero values

---

## Next Steps

1. **User decides on approach** (Cards vs Enhanced Scroll)
2. Create implementation task
3. Start with EstimateTab as proof of concept
4. Apply pattern to other tables

---

## Visual Mockups

### Card Layout - Collapsed
```
┌─────────────────────────────────────┐
│ [N] [OEM]                   R14,500 │
│ Front Bumper Cover Assembly         │
│ ▼ Cost breakdown                    │
│                      [Edit] [Delete]│
└─────────────────────────────────────┘
```

### Card Layout - Expanded
```
┌─────────────────────────────────────┐
│ [N] [OEM]                   R14,500 │
│ Front Bumper Cover Assembly         │
│ ▲ Cost breakdown                    │
│ ┌─────────────────────────────────┐ │
│ │ Part:    R12,450                │ │
│ │ S&A:     R850 (1.0 hrs)         │ │
│ │ Labour:  R1,200 (1.5 hrs)       │ │
│ │ Paint:   -                      │ │
│ │ Outwork: -                      │ │
│ └─────────────────────────────────┘ │
│                      [Edit] [Delete]│
└─────────────────────────────────────┘
```

### Enhanced Scroll - With Sticky Column
```
┌──────────────────────┬──────────────┐
│ Description          │ ← scroll →   │
├──────────────────────┼──────────────┤
│ Front Bumper (sticky)│ R12k │ R850 →│
│ Rear Door (sticky)   │ R8k  │ R600 →│
└──────────────────────┴──────────────┘
            ▲ Scroll indicator
```
