## Project Context (.agent Folder Overview)
- Documentation hub with structured indices:
  - `README/` contains master navigation: `index.md`, `system_docs.md`, `sops.md`, `changelog.md`, plus quick refs.
  - `System/` houses architecture, security, stage transitions, loading patterns, and bug postmortems.
  - `SOP/` includes execution guides for migrations, routes, services, auth debugging, and patterns.
  - `Tasks/` maintains active/completed bug and feature docs, including `bugs.md` as the canonical bug tracker.
- Version control awareness: bug states are tracked in `Tasks/bugs.md` (Open/Resolved). Documentation changes should update both the bug list and relevant indices.

## Bug 7 Details (Extracted from .agent/Tasks/bugs.md)
- Title: Finalize Force Click - Supabase Auth Connection Timeout
- Status: Open
- Severity: High
- Component: Finalization Tab / Force Finalize Action
- Error Description:
  - `TypeError: fetch failed`
  - `ConnectTimeoutError: Connect Timeout Error`
  - Attempted: `cfblmkzleqtvtfxujikf.supabase.co:443`, timeout: `10000ms`
  - `code: 'UND_ERR_CONNECT_TIMEOUT'`
- Stack Trace (as documented):
  - Error originates from `FRCService.getCountByStatus()`
  - Called during dashboard page load (`+page.server.ts:30`)
  - Supabase Auth attempting to validate user via `getUser()`
- Expected Behavior:
  - Force finalize action completes without connection errors
  - Dashboard loads successfully with FRC counts
- Current Behavior:
  - Connection timeout reaching Supabase Auth server
  - FRC count fails to load
  - Dashboard page load fails
- Affected Pages:
  - `/work/assessments/[id]` (Assessment page, Finalization Tab force finalize action)
  - `/dashboard` (FRC count loading)
- Related Code Areas:
  - FinalizeTab force finalize handler
  - `FRCService.getCountByStatus()`
  - Dashboard `+page.server.ts`
  - Supabase Auth client configuration / network
- Notes:
  - Warning: prefer `getSession()` over `getUser()` for SSR validation
  - Likely network connectivity or endpoint configuration issue
  - Consider retry/timeout handling

## Code References (Current Repository)
- Finalize Tab handlers:
  - Force finalize (passes authenticated server client): `src/lib/components/assessment/FinalizeTab.svelte:178–207`
  - Non-force finalize flow: `src/lib/components/assessment/FinalizeTab.svelte:147–172`
- Dashboard counts (FRC):
  - Uses `frcService.getCountByStatus(...)`: `src/routes/(app)/dashboard/+page.server.ts:33–45`
- FRC count service logic:
  - Engineer/Admin counting via `assessments` with deep filter joins: `src/lib/services/frc.service.ts:938–974`

## Reproduction Steps (Derived)
- Finalization:
  - Navigate to an assessment Finalize tab and click the force finalize button.
  - Observe connection timeout error after ~10s.
- Dashboard:
  - Navigate to `/dashboard`.
  - Observe failure during initial load of counts, specifically FRC counts.

## Impact
- Critical user flow blocked during forced finalization.
- Dashboard unavailable or partially unavailable due to failed counts.
- Perceived instability from timeouts on core operations.

## Potential Root Causes
- Network/connectivity issue to Supabase endpoints (auth/storage) causing `UND_ERR_CONNECT_TIMEOUT` from undici.
- SSR auth validation inadvertently calling `supabase.auth.getUser()` (client-side oriented) instead of relying on session in SSR; increases chance of auth endpoint calls under load.
- Misconfigured Supabase client or environment variables for server-side requests (e.g., wrong project URL, key, region latency).
- Long deep-join queries (`assessments` + `appointments` + `assessment_frc`) increasing response time; combined with network issues trigger timeout windows.

## Suggested Remediation Approaches
- Auth usage hardening (SSR):
  - Prefer server-side `locals.supabase` with session derived from cookies; avoid explicit `getUser()` in SSR.
  - If user identity needs verification, use `getSession()` or rely on `parent()` role derivation already present.
- Retry/timeout strategy:
  - Wrap critical service calls (`getCountByStatus`, finalize handlers) with retry logic (e.g., 3 attempts, exponential backoff, jitter).
  - Provide user-facing fallback (cached counts or “temporarily unavailable”) instead of hard failure.
- Defensive loading for dashboard:
  - Defer FRC counts or load them independently; if they fail, render dashboard minus FRC with a warning.
  - Add granular try/catch around each count call; do not fail whole page if one count times out.
- Service query optimization:
  - Review deep join paths in `getCountByStatus` (`assessments` -> `appointments` -> `assessment_frc`) to ensure index coverage and minimal payload.
  - Consider precomputed counters or materialized views for counts under load.
- Network configuration:
  - Verify Supabase project URL and keys in environment; confirm region proximity.
  - Increase connect timeout if permissible, or ensure client keepalive settings; however prefer retry + fallback.

## Dependencies Across Docs and Code
- This bug is documented in `.agent/Tasks/bugs.md` and ties into FinalizeTab and dashboard code paths.
- Resolution should be reflected in:
  - `.agent/README/changelog.md` for tracking fixes
  - `.agent/README/system_docs.md` for session/auth usage patterns (see `session_management_security.md`)
  - SOPs for error handling patterns (e.g., `page_updates_and_badge_refresh.md` for non-blocking UI updates)

## Next Steps
- Audit repository for any `getUser()` usage on server routes.
- Implement retry/fallback in `dashboard/+page.server.ts` around counts.
- If force finalize is surfaced elsewhere (API route or service), add resilient error handling and user feedback.
- After fixes, update `.agent/Tasks/bugs.md` (Bug 7) to RESOLVED with code references and testing steps.