# Refactor PR 2 — Adopt `table-helpers.ts` at Bypass Sites

**Created**: 2026-04-18
**Status**: Planning → In Progress
**Complexity**: Simple (mechanical import + replace; no new code)
**Source plan**: `C:\Users\Jcvdm\.claude\plans\validated-zooming-lampson.md` (PR 2)
**Branch**: `claude/confident-mendel`
**Depends on**: PR 1 (commit `e5bb64b`)

## Overview

Audit 2C found **`src/lib/utils/table-helpers.ts` has 1 self-reference and 34 inline bypass sites** across `src/` — the utility was written and then forgotten. This PR adopts it.

**Zero new code.** Pure `import + replace`. The 9 helpers already exist:
- `getStageVariant(stage)` → BadgeVariant color for assessment stage
- `getStageLabel(stage)` → human-readable stage label
- `getTypeVariant(type)` → BadgeVariant for 'insurance' | 'private'
- `getTypeLabel(type)` → 'Insurance' | 'Private'
- `formatVehicleDisplay(make, model)` → "Make Model" or '-'
- `formatDateDisplay(iso)` → locale short date (en-ZA)
- `formatTimeDisplay(time, duration?)` → time range or "No time set"
- `isAppointmentOverdue(date, time?)` → boolean
- `formatDateTimeDisplay(date, time?)` → date + time string

All live in `src/lib/utils/table-helpers.ts`.

## Scope

### IN scope: inline implementations that duplicate a helper

Patterns to hunt + replace:

1. **Hardcoded stage labels**. Any `switch`/`if`/object literal that maps `AssessmentStage` values to user-facing strings like `'Assessment In Progress'`, `'Request Submitted'`, `'FRC In Progress'`, `'Estimate Review'`, etc. If the mapping matches `getStageLabel`, replace.

2. **Hardcoded stage → badge variant mappings**. Any `switch`/`if`/object literal mapping stages to color strings (`'blue'`, `'green'`, `'yellow'`, `'purple'`, `'indigo'`, `'pink'`, `'red'`, `'gray'`). If the mapping matches `getStageVariant`, replace.

3. **Hardcoded request type labels**. Ternaries or switches on `'insurance'` / `'private'` producing `'Insurance'` / `'Private'`.

4. **Hardcoded request type variant**. `type === 'insurance' ? 'blue' : 'purple'` or equivalent.

5. **Inline vehicle make+model joins**. Patterns like `${vehicle.make} ${vehicle.model}`, `vehicle.make + ' ' + vehicle.model`, or `[make, model].filter(Boolean).join(' ')`. If the fallback on missing data is '-' (matching `formatVehicleDisplay`), replace.

6. **Inline date formatting matching `formatDateDisplay`**. Any `new Date(x).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })` — replace with `formatDateDisplay(x)`.

7. **Inline time-range formatting** matching `formatTimeDisplay` (parse HH:MM + optional duration minutes → "HH:MM - HH:MM"). If a component has this pattern, replace.

8. **Inline appointment-overdue checks** matching `isAppointmentOverdue` (comparing now to a date+time, falling through to end-of-day on missing time).

### OUT of scope

**DO NOT replace** bypasses that are semantically different from the helper:
- **Different label mapping** — if a file has custom stage labels for UI context (e.g. shorter abbreviations, different phrasing for a PDF template), LEAVE IT and flag the file in your report.
- **Different color mapping** — same rule. If some component maps stages to different colors deliberately, don't force the `getStageVariant` variants.
- **Different vehicle formatting** — if a file shows `YYYY Make Model` (includes year) or `Make Model Variant`, that's NOT `formatVehicleDisplay`. Skip.
- **Different date formatting** — if a file uses a different locale or format (e.g. `{ weekday: 'long' }`, `toLocaleString()`, `Intl.DateTimeFormat` with different options), DON'T force it into `formatDateDisplay`. That's a job for PR 5 (`formatters.ts` adoption), not this PR.
- **Currency/percentage formatting** — out of scope entirely. This PR is table-helpers only.

## Approach

1. **Grep in categories** — don't do all 34 at once blindly. Work through one helper at a time so the diff stays reviewable.
2. **For each pattern**: grep, read each match in context, decide REPLACE or SKIP, apply the edit.
3. **After replacing a match**: confirm the import is added (or already present), no redundant imports, and the original inline logic is fully deleted (no dead variables or orphan objects).

Suggested order (shortest helper first, so you warm up):

1. `getTypeLabel` / `getTypeVariant` — usually 1-line ternaries. Low risk.
2. `formatVehicleDisplay` — ~3–5 sites.
3. `getStageLabel` — look for `switch (stage)` / big objects mapping ~11 stages to labels.
4. `getStageVariant` — similar switches mapping stages to colors.
5. `formatDateDisplay` / `formatDateTimeDisplay` — only if the options `{ year: 'numeric', month: 'short', day: 'numeric' }` match.
6. `formatTimeDisplay` / `isAppointmentOverdue` — rarer, likely in appointments pages.

## Grep patterns (starting points)

```bash
# Stage labels
grep -rn "'Assessment In Progress'\|'Request Submitted'\|'FRC In Progress'\|'Estimate Review'\|'Inspection Scheduled'" src --include='*.svelte' --include='*.ts'

# Stage → color mappings
grep -rn "case 'assessment_in_progress'\|case 'request_submitted'\|case 'frc_in_progress'" src --include='*.svelte' --include='*.ts'

# Type label ternaries
grep -rn "=== 'insurance' ? 'Insurance'\|=== 'insurance' ? 'blue'" src --include='*.svelte' --include='*.ts'

# Vehicle joins
grep -rn '\.make.*\.model\|\${.*make.*}.*\${.*model' src --include='*.svelte' --include='*.ts' | head -20

# Date formatting with the specific options
grep -rn "toLocaleDateString('en-ZA'" src --include='*.svelte' --include='*.ts'
```

Don't treat those as exhaustive — they're starting points to branch from.

## Hard rules

1. **Don't touch `table-helpers.ts` itself** — it's the source of truth.
2. **Don't change any logic.** If replacing an inline with a helper changes observable behavior (different output for same input), STOP and skip that site; flag in report.
3. **Don't add new helpers** — if a site has unique logic that doesn't match any helper, leave it. Propose it as a future addition in the report.
4. **Don't touch PR 1 output** — `assessment-subtable-factory.ts` and the 3 service files.
5. **Don't touch files in `src/lib/templates/`** (PDF templates) — they may have intentionally different formatting for print rendering. Flag if you find matches there.
6. **Don't commit or push.** Orchestrator handles.

## Verification

After completing all replacements:

1. `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -60` — 0 new errors. Baseline: 0 errors + 29 pre-existing warnings.
2. `npm run build 2>&1 | tail -15` — succeeds.
3. **Adoption metric**: `grep -rn 'getStageLabel\|getStageVariant\|getTypeLabel\|getTypeVariant\|formatVehicleDisplay\|formatDateDisplay\|formatTimeDisplay\|isAppointmentOverdue\|formatDateTimeDisplay' src --include='*.svelte' --include='*.ts' | wc -l` — should increase substantially from the previous ~1 call site.
4. **Bypass reduction**: pick 2-3 of the grep queries above and verify they return fewer matches than before.

## Report back (≤500 words)

- **Files modified**: count.
- **Replacements by category**: e.g. "7× `getStageLabel`, 6× `getStageVariant`, 3× `getTypeLabel`, 3× `getTypeVariant`, 4× `formatVehicleDisplay`, 2× `formatDateDisplay`, 0× `formatTimeDisplay`/`isAppointmentOverdue`/`formatDateTimeDisplay`".
- **Sites intentionally SKIPPED** and why: quote the file:line and one-line reason. Expected skips include PDF templates, anywhere logic differed from the helper.
- **Sites that hinted at a missing helper** (inline logic that wasn't quite any helper but looked like a candidate for `table-helpers.ts`). Don't add them; just flag for future.
- Build + svelte-check result.
- Net line delta (expected: several dozen lines removed, no additions beyond imports).

## Notes

- This is PR 2 of 6 in the refactor plan.
- If total replacements end up <15, we probably over-counted bypasses — don't force it. Report the real number.
- If total replacements end up >40, flag; the audit may have been conservative or we found more than expected.
- Branch: `claude/confident-mendel`. Append commits.
