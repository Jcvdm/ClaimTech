## Goal
Align documentation with `.claude/commands/update_doc.md` by updating `.agent` docs to reference the Bugs list and record the recent fix.

## Changes
- `.agent/README/index.md` (Master Index):
  - Add a "Bugs & Issues" entry linking to `.agent/Tasks/bugs.md` for quick navigation.
- `.agent/README/changelog.md`:
  - Append a dated entry for Bug 5 fix (repairer defaults propagation, rate auto-apply, loading overlay) with concise summary and code references:
    - `src/lib/components/assessment/RatesAndRepairerConfiguration.svelte:117–136, 166–177, 306–314, 328–336, 349–357, 379–388, 403–411, 426–434, 449–457`
    - `src/lib/components/assessment/EstimateTab.svelte:620–644, 668–669, 1258–1265`
- Optional cross-link in `.agent/README/task_guides.md` (light touch):
  - Under troubleshooting, add a pointer to "Bugs & Issues" for current open/closed bugs.

## Notes
- No new docs created; only updates to existing indexes as per command guidance.
- Keep entries concise and avoid overlap.

## Verification
- Master Index shows a quick link to Bugs.
- Changelog reflects Bug 5 fix with date and summary.