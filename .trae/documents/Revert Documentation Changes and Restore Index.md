## Goal
Undo the last documentation edits: restore `.agent/README/index.md` to its previous content and remove newly added docs under `.agent/System`, `.agent/SOP`, and `.agent/Tasks`.

## Approach
- If the repository is under Git, retrieve the previous version of `.agent/README/index.md` from the last commit and restore it verbatim.
- Delete the newly added files that were not intended.
- If Git history is unavailable, reconstruct the index from existing files in `.agent/README/` to minimize disruption.

## Steps
1) Read previous content via Git (preferred):
- Use `git show HEAD~1:.agent/README/index.md` to get the last committed content.
2) Restore file:
- Replace current `.agent/README/index.md` with the retrieved content.
3) Remove added files:
- `.agent/System/project_architecture.md`
- `.agent/System/database_quick_ref.md`
- `.agent/SOP/frc_refresh.md`
- `.agent/SOP/frc_decisions.md`
- `.agent/SOP/additionals_editing.md`
- `.agent/Tasks/FRC_refinement.md`
- `.agent/Tasks/additionals_part_type.md`

## Verification
- Open `.agent/README/index.md` to confirm original content is restored.
- Ensure no unintended new files remain.
- No other files modified.