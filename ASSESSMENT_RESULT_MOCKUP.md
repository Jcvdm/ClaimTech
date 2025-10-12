# Assessment Result Feature - Visual Mockup

## Component Placement on Estimate Tab

```
┌─────────────────────────────────────────────────────────────────┐
│ Estimate Tab                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ [Rates & Repairer Configuration] (collapsible)                  │
│                                                                   │
│ [Quick Add Line Item] (form)                                    │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Line Items Table                                            │ │
│ │ ┌──┬────────┬─────────┬──────────┬────────┬─────┬────────┐ │ │
│ │ │☐│Process │Part Type│Description│Part $  │S&A  │Labour  │ │ │
│ │ ├──┼────────┼─────────┼──────────┼────────┼─────┼────────┤ │ │
│ │ │☐│N - New │OEM      │Front Bumper│R2,500 │R550 │R1,100 │ │ │
│ │ │☐│P - Paint│-       │Paint bumper│-      │-    │R2,200 │ │ │
│ │ └──┴────────┴─────────┴──────────┴────────┴─────┴────────┘ │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Totals Summary                                              │ │
│ │                                                             │ │
│ │ Parts Total:              R 2,500.00                        │ │
│ │ Markup Total:             R   625.00                        │ │
│ │ S&A Total:                R   550.00                        │ │
│ │ Labour Total:             R 1,100.00                        │ │
│ │ Paint Total:              R 2,200.00                        │ │
│ │ Outwork Total:            R     0.00                        │ │
│ │ ─────────────────────────────────────                       │ │
│ │ Subtotal:                 R 6,975.00                        │ │
│ │ VAT (15%):                R 1,046.25                        │ │
│ │ ═════════════════════════════════════                       │ │
│ │ Total (Inc VAT):          R 8,021.25  🟢                    │ │
│ │                                                             │ │
│ │ ℹ️ Estimate is 8.02% of borderline write-off value         │ │
│ │    Well below threshold - economical to repair              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🎯 Assessment Result                                        │ │ ← NEW SECTION
│ │                                                             │ │
│ │ Select the final outcome of this assessment:               │ │
│ │                                                             │ │
│ │ ┌──────────────────────┐  ┌──────────────────────┐        │ │
│ │ │ ● Repair             │  │ ○ Code 2             │        │ │
│ │ │ ✓ Economic to repair │  │ ⚠ Repairable write-off│       │ │
│ │ │ Vehicle can be       │  │ Salvage title        │        │ │
│ │ │ returned to service  │  │                      │        │ │
│ │ └──────────────────────┘  └──────────────────────┘        │ │
│ │                                                             │ │
│ │ ┌──────────────────────┐  ┌──────────────────────┐        │ │
│ │ │ ○ Code 3             │  │ ○ Total Loss         │        │ │
│ │ │ ✗ Non-repairable     │  │ ⊗ Complete loss      │        │ │
│ │ │ write-off (scrap)    │  │ Vehicle is written off│       │ │
│ │ │                      │  │                      │        │ │
│ │ └──────────────────────┘  └──────────────────────┘        │ │
│ │                                                             │ │
│ │ [Clear Selection]                                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ [Incident Photos] (panel)                                       │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Save Progress]                    [✓ Complete Estimate]    │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component States

### 1. **No Selection (Default)**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Assessment Result                                        │
│                                                             │
│ Select the final outcome of this assessment:               │
│                                                             │
│ ┌──────────────────────┐  ┌──────────────────────┐        │
│ │ ○ Repair             │  │ ○ Code 2             │        │
│ │ ✓ Economic to repair │  │ ⚠ Repairable write-off│       │
│ └──────────────────────┘  └──────────────────────┘        │
│ ┌──────────────────────┐  ┌──────────────────────┐        │
│ │ ○ Code 3             │  │ ○ Total Loss         │        │
│ │ ✗ Non-repairable     │  │ ⊗ Complete loss      │        │
│ └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 2. **Repair Selected (Green)**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Assessment Result                                        │
│                                                             │
│ Select the final outcome of this assessment:               │
│                                                             │
│ ┌──────────────────────┐  ┌──────────────────────┐        │
│ │ ● Repair         ✓   │  │ ○ Code 2             │        │
│ │ ✓ Economic to repair │  │ ⚠ Repairable write-off│       │
│ │ 🟢 SELECTED          │  │                      │        │
│ └──────────────────────┘  └──────────────────────┘        │
│ ┌──────────────────────┐  ┌──────────────────────┐        │
│ │ ○ Code 3             │  │ ○ Total Loss         │        │
│ │ ✗ Non-repairable     │  │ ⊗ Complete loss      │        │
│ └──────────────────────┘  └──────────────────────┘        │
│                                                             │
│ [Clear Selection]                                           │
└─────────────────────────────────────────────────────────────┘
```

### 3. **Code 2 Selected (Yellow)**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Assessment Result                                        │
│                                                             │
│ ┌──────────────────────┐  ┌──────────────────────┐        │
│ │ ○ Repair             │  │ ● Code 2         ⚠   │        │
│ │ ✓ Economic to repair │  │ ⚠ Repairable write-off│       │
│ │                      │  │ 🟡 SELECTED          │        │
│ └──────────────────────┘  └──────────────────────┘        │
│ ┌──────────────────────┐  ┌──────────────────────┐        │
│ │ ○ Code 3             │  │ ○ Total Loss         │        │
│ └──────────────────────┘  └──────────────────────┘        │
│                                                             │
│ [Clear Selection]                                           │
└─────────────────────────────────────────────────────────────┘
```

### 4. **Code 3 Selected (Orange)**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Assessment Result                                        │
│                                                             │
│ ┌──────────────────────┐  ┌──────────────────────┐        │
│ │ ○ Repair             │  │ ○ Code 2             │        │
│ └──────────────────────┘  └──────────────────────┘        │
│ ┌──────────────────────┐  ┌──────────────────────┐        │
│ │ ● Code 3         ✗   │  │ ○ Total Loss         │        │
│ │ ✗ Non-repairable     │  │ ⊗ Complete loss      │        │
│ │ 🟠 SELECTED          │  │                      │        │
│ └──────────────────────┘  └──────────────────────┘        │
│                                                             │
│ [Clear Selection]                                           │
└─────────────────────────────────────────────────────────────┘
```

### 5. **Total Loss Selected (Red)**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Assessment Result                                        │
│                                                             │
│ ┌──────────────────────┐  ┌──────────────────────┐        │
│ │ ○ Repair             │  │ ○ Code 2             │        │
│ └──────────────────────┘  └──────────────────────┘        │
│ ┌──────────────────────┐  ┌──────────────────────┐        │
│ │ ○ Code 3             │  │ ● Total Loss     ⊗   │        │
│ │ ✗ Non-repairable     │  │ ⊗ Complete loss      │        │
│ │                      │  │ 🔴 SELECTED          │        │
│ └──────────────────────┘  └──────────────────────┘        │
│                                                             │
│ [Clear Selection]                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary Component Display

### When Result is Selected

```
┌─────────────────────────────────────────────────────────────┐
│ Summary                                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Vehicle Information                                      ││
│ │ Make: Toyota | Model: Corolla | Year: 2020              ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Repair Estimate                                          ││
│ │ Subtotal:  R 6,975.00                                    ││
│ │ VAT (15%): R 1,046.25                                    ││
│ │ Total:     R 8,021.25                                    ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ ✓ Assessment Result: Repair                          🟢 ││ ← NEW
│ │ Vehicle can be economically repaired                     ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Different Results in Summary

**Repair (Green)**
```
┌──────────────────────────────────────────────────────────┐
│ ✓ Assessment Result: Repair                          🟢 │
│ Vehicle can be economically repaired                     │
└──────────────────────────────────────────────────────────┘
```

**Code 2 (Yellow)**
```
┌──────────────────────────────────────────────────────────┐
│ ⚠ Assessment Result: Code 2                          🟡 │
│ Repairable write-off (salvage title)                    │
└──────────────────────────────────────────────────────────┘
```

**Code 3 (Orange)**
```
┌──────────────────────────────────────────────────────────┐
│ ✗ Assessment Result: Code 3                          🟠 │
│ Non-repairable write-off (scrap)                        │
└──────────────────────────────────────────────────────────┘
```

**Total Loss (Red)**
```
┌──────────────────────────────────────────────────────────┐
│ ⊗ Assessment Result: Total Loss                      🔴 │
│ Complete loss of vehicle                                 │
└──────────────────────────────────────────────────────────┘
```

---

## Mobile Responsive Layout

### Desktop (2x2 Grid)
```
┌──────────────┐  ┌──────────────┐
│ ● Repair     │  │ ○ Code 2     │
│ ✓ Economic   │  │ ⚠ Repairable │
└──────────────┘  └──────────────┘
┌──────────────┐  ┌──────────────┐
│ ○ Code 3     │  │ ○ Total Loss │
│ ✗ Non-repair │  │ ⊗ Complete   │
└──────────────┘  └──────────────┘
```

### Mobile (Stacked)
```
┌────────────────────────┐
│ ● Repair               │
│ ✓ Economic to repair   │
└────────────────────────┘
┌────────────────────────┐
│ ○ Code 2               │
│ ⚠ Repairable write-off │
└────────────────────────┘
┌────────────────────────┐
│ ○ Code 3               │
│ ✗ Non-repairable       │
└────────────────────────┘
┌────────────────────────┐
│ ○ Total Loss           │
│ ⊗ Complete loss        │
└────────────────────────┘
```

---

## Color Palette

| Result | Background | Border | Text | Icon |
|--------|-----------|--------|------|------|
| **Repair** | `bg-green-50` | `border-green-200` | `text-green-700` | CheckCircle (green) |
| **Code 2** | `bg-yellow-50` | `border-yellow-200` | `text-yellow-700` | AlertCircle (yellow) |
| **Code 3** | `bg-orange-50` | `border-orange-200` | `text-orange-700` | XCircle (orange) |
| **Total Loss** | `bg-red-50` | `border-red-200` | `text-red-700` | Ban (red) |
| **Unselected** | `bg-white` | `border-gray-200` | `text-gray-700` | - |
| **Hover** | `bg-gray-50` | `border-gray-300` | `text-gray-900` | - |

---

## Interaction Flow

1. **User completes estimate** → Line items added, totals calculated
2. **User scrolls to bottom** → Sees "Assessment Result" section
3. **User clicks radio button** → Option highlights with color
4. **System auto-saves** → Result saved to database
5. **User can change selection** → Click different option
6. **User can clear** → Click "Clear Selection" button
7. **Result appears in summary** → Color-coded card with icon

---

**Status**: Mockup Complete - Ready for Implementation  
**Design System**: Tailwind CSS + shadcn-svelte + Lucide Icons  
**Responsive**: Mobile-first, 2x2 grid on desktop, stacked on mobile

