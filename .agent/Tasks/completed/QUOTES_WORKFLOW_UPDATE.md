# Quotes Workflow Update

**Created**: 2026-01-17
**Status**: Completed
**Complexity**: Moderate

## Overview
Implement quotes workflow improvements:
1. Update new quote form to conditionally show client dropdown based on quote type
2. Create quotes list page with ModernDataTable
3. Add "Open Quotes" to sidebar navigation

## Files to Modify
- `src/routes/(app)/quotes/new/+page.svelte` - Conditional client dropdown
- `src/routes/(app)/quotes/+page.svelte` - New list page (create)
- `src/routes/(app)/quotes/+page.server.ts` - New server load (create)
- `src/lib/components/layout/Sidebar.svelte` - Add navigation item

## Implementation Steps

### 1. Update New Quote Form
- Show client dropdown ONLY when `clientType === 'insurance'`
- Hide client dropdown for Private quotes (owner details only)
- Update validation - client only required for insurance type

### 2. Create Quotes List Page
- Copy pattern from inspections list (`src/routes/(app)/work/inspections/+page.svelte`)
- Use ModernDataTable component
- Columns: Quote #, Vehicle, Owner/Client, Type (Private/Insurance), Created, Status
- Title: "Open Quotes"
- Row click navigation → `/work/assessments/[id]?tab=estimate`

### 3. Create Server Load Function
- Pattern from `src/routes/(app)/work/inspections/+page.server.ts`
- Load assessments created via createQuoteJob
- Join with requests for vehicle/owner info
- Filter appropriately

### 4. Update Sidebar Navigation
- Add "Open Quotes" item in Work section
- Show only when `appModeStore.mode !== 'insurance'`
- Use FileText icon or similar
- Link to `/quotes`

## Reference Files
- `src/routes/(app)/work/inspections/+page.svelte` - List page pattern
- `src/routes/(app)/work/inspections/+page.server.ts` - Server load pattern
- `src/lib/components/data/ModernDataTable.svelte` - Table component

## Verification
- [x] npm run check passes (0 errors, 13 pre-existing warnings)
- [x] Client dropdown shows/hides correctly based on quote type
- [x] Quotes list page displays correctly
- [x] Navigation to estimate tab works
- [x] Sidebar shows "Open Quotes" in appropriate mode

## Notes
- Follow existing ClaimTech patterns for consistency
- Use established ModernDataTable component
- Ensure proper TypeScript typing
