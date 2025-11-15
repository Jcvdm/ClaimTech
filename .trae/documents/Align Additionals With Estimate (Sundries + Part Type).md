## Goals
- Reuse Estimate part-type UI in Additionals to edit `part_type` (OEM/ALT/2ND) for parts lines.
- Clarify and align totals behavior so users understand sundries are included in Estimate totals but not in Additionals; removed lines appear negative and new lines add to Additionals total.

## Research Summary
- Estimate totals: `total = subtotal + sundries + VAT(subtotal + sundries)`.
- Additionals totals: `total_approved = subtotal + VAT(subtotal)` (no sundries).
- Removed original line: creates an auto-approved negative Additional that mirrors component amounts; difference vs Estimate line total is due to Estimate sundries being global (expected).
- Part-type UI exists in `EstimateTab.svelte` and `PreIncidentEstimateTab.svelte` as inline `select`; no reusable component currently.

## Design Decisions
- Keep sundries Estimate-only to avoid double-counting. Use CombinedTotals (`estimate.total + additionals.total_approved`) for a consistent user-facing total.
- Introduce a reusable `PartTypeSelect` and use it in Additionals for parts lines (`process_type === 'N'`).

## Implementation Steps
1) Create `PartTypeSelect` (shared)
- Props: `value: 'OEM' | 'ALT' | '2ND' | null`, `disabled?: boolean`, `showBadge?: boolean`.
- Events: `oninput` for immediate local update; `onblur` signals persistence.
- Visuals: optional badge+icon set mirroring Estimate.

2) Wire into Additionals
- Add a `Part Type` column in `AdditionalsTab.svelte` for pending, non-removed/non-reversal parts lines.
- Local update on input; persist on blur via `updatePending(lineItemId, { part_type })`.
- Ensure `updatePendingLineItem(...)` recalculates parts amount using the correct markup percentage (`oem/alt/second_hand`).

3) Totals & Removal Flow
- No code change to sundries. Confirm removed lines render negative amounts and reduce approved totals.
- Add a small note near CombinedTotals or OriginalLines panel: "Estimate totals include sundries; Additionals totals exclude sundries. Combined reflects both."

4) Verification
- Scenario A: Remove an original parts line; check Additional negative matches component totals; CombinedTotals equals Estimate total (with sundries) minus removed component plus any Additionals.
- Scenario B: Add a new Additional parts line; change `part_type`; verify subtotal and total adjust according to markup; blur persists and survives reload.
- Scenario C: Mixed lines (labour/paint/outwork) to confirm totals and VAT are correct.

## Risks & Mitigations
- Confusion around sundries: mitigate with UI copy and consistent CombinedTotals presentation.
- Event consistency: use Svelte 5 `oninput/onblur`; write small tests around service recomputation when `part_type` changes.

## Deliverables
- Reusable `PartTypeSelect` component.
- Additionals integration with editable part-type and correct persistence/recalculation.
- Verification notes and a short doc update in `.agent` to explain sundries alignment and part-type behavior.