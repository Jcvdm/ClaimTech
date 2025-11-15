## Goals
- Follow `.claude/commands/update_doc.md` to add/update documentation accurately, without replacing existing indexes.
- Keep edits non-destructive: append new links/sections; do not overwrite master index content.

## What I’ll Add
- System: `System/frc_mechanics.md` — snapshot/merge flow, Baseline vs New Total semantics, line metadata (`is_removal_additional`, `removal_for_source_line_id`).
- SOP: `SOP/frc_refresh.md` — Refresh Snapshot usage and optimistic locking; `SOP/frc_decisions.md` — agree/adjust rules, auto-agree removals.
- Tasks: `Tasks/FRC_UI_logic_refinement.md` — changes, files touched, verification steps.

## How I’ll Update Indexes
- `.agent/README/system_docs.md`: add links to `frc_mechanics.md` under appropriate section; append only.
- `.agent/README/sops.md`: add links to `frc_refresh.md` and `frc_decisions.md`; append only.
- `.agent/README/index.md`: append a small “Recent Docs” subsection with these links; no wholesale replacement.

## Conventions
- Each new doc includes a “Related Docs” section linking to relevant existing docs.
- Use code references with `file_path:line_number` for accuracy.

## Verification
- Open the three indexes and confirm existing content preserved and new links present.
- Ensure new docs compile to current behavior and match code changes.

## Safety
- No deletions of existing docs; all changes are additive.
- Keep changes confined to `.agent` folder.