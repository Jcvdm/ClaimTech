## Scope
Align documentation with the latest changes and add concise SOPs per `/c:/Users/Jcvdm/Desktop/Jaco/Programming/sites/Claimtech/.claude/commands/update_doc.md`.

## System Updates
- Architecture: Document FRC snapshot mechanics, refresh flow, merge normalization (auto-agree removals), and Baseline vs New Total semantics.
- Data: Extend FRC line item schema details (is_removal_additional, removal_for_source_line_id, linked_document_id, matched). Update where totals are computed and what lines are included/excluded.

## SOPs
- FRC Refresh: How and when to use Refresh Snapshot; optimistic locking and expected outcomes.
- FRC Decisions: What gets decided vs auto-agreed; removed/declined behaviors and UI expectations.
- Additionals Editing: Part type editing in Additionals (OEM/ALT/2ND) with Svelte 5 events; persistence on blur.

## Tasks Docs
- FRC UI/Logic Refinement: Describe removal grouping, auto-agree normalization, Baseline/New/Delta replacement of Combined, and invoice attach/match UI.
- Additionals Part-Type Badges: Document UI and persistence changes.

## README Index
- Update `.agent/README/index.md` to include new/updated docs under System and SOP sections; cross-link tasks.

## Deliverables
- `system/project_architecture.md` updated (FRC mechanics and totals semantics).
- `system/database_quick_ref.md` updated (FRC line item fields additions).
- `sop/frc_refresh.md`, `sop/frc_decisions.md`, `sop/additionals_editing.md`.
- `tasks/FRC_refinement.md`, `tasks/additionals_part_type.md`.

## Verification
- Docs reference concrete code paths (file_path:line_number) and match current UI/behavior; README index navigable.