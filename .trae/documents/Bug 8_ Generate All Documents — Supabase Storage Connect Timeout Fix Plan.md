## Summary of Findings

* Documentation index confirms architecture, storage buckets, and streaming approach for long-running tasks: `.agent/README/index.md:27–35`, `.agent/README/system_docs.md:21–31, 64–80`.

* Finalize tab triggers Generate All via a local handler and parent hook:

  * `src/lib/components/assessment/FinalizeTab.svelte:385–398`

  * `src/routes/(app)/work/assessments/[appointment_id]/+page.svelte:668–690`

* Client-side service orchestrates single and parallel generation:

  * `src/lib/services/document-generation.service.ts:50–165` (SSE progress), `170–203` (generate-all)

* Server endpoints stream progress and upload to Supabase Storage:

  * Aggregator: `src/routes/api/generate-all-documents/+server.ts:12–36, 45–99`

  * Report: `src/routes/api/generate-report/+server.ts:170–218` (storage upload), `223–252` (DB update)

  * Photos ZIP: `src/routes/api/generate-photos-zip/+server.ts:445–493` (storage upload), `494–538` (DB update)

* Supabase clients currently wrap fetch with a 30s AbortController timeout:

  * Browser: `src/lib/supabase.ts:15–33`

  * SSR per-request: `src/hooks.server.ts:47–61`

  * Server service-role: `src/lib/supabase-server.ts:30–44`

* Historical storage troubleshooting references policy/permission fixes: `.agent/Tasks/historical/FIX_STORAGE_UPLOAD_ERROR.md` and upload failure patterns in `.agent/Tasks/historical/PDF_TROUBLESHOOTING.md:145–183`.

## Problem Statement (Bug 8)

* Clicking "Generate All Documents" intermittently fails with Supabase Storage connection timeout, showing `UND_ERR_CONNECT_TIMEOUT` at 10,000ms.

* Error originates from `@supabase/storage-js` fetch layer; stream closes after timeout and user receives minimal feedback.

## Root Cause Hypothesis

* The 30s `AbortController` wrapper does not alter Undici’s socket connect timeout, which defaults to \~10s in some environments. Storage SDK’s internal fetch path hits the connect timeout before our 30s abort.

* Long-lived uploads (PDF/ZIP) and slow networks aggravate initial TLS connect timing, especially under load.

## Fix Strategy

1. Increase Node connect timeout and enable keep-alive via Undici Agent on all server-side Supabase clients.

   * Provide custom `dispatcher: new Agent({ connect: { timeout: 30000 }, keepAliveTimeout: 60000, headersTimeout: 30000 })` to the `fetch` override used by Supabase clients.

   * Apply in `src/hooks.server.ts` and `src/lib/supabase-server.ts` so `locals.supabase.storage` uses the longer connect timeout.
2. Add retry with exponential backoff around Storage upload/download calls.

   * Wrap `.upload()` / `.download()` in `retry(fn, { attempts: 3, baseDelay: 500 })`.

   * Propagate clear user-facing errors and continue partial successes in the generate-all aggregator.
3. Improve UI feedback during Generate All.

   * Show per-document progress and failures; keep overall action responsive.

   * Display actionable error with retry option and link to single-document generators.
4. Maintain SSE keep-alive pings already present for ZIP generation; ensure report/estimate endpoints yield regular progress.

## Implementation Steps

* Server clients (connect timeout):

  * Update `src/hooks.server.ts:51–60` fetch override to include Undici Agent `dispatcher` with `connect.timeout = 30000`, `keepAliveTimeout = 60000`, `headersTimeout = 30000`.

  * Update `src/lib/supabase-server.ts:35–43` similarly for service-role client.

* Storage retries:

  * Report upload: wrap `locals.supabase.storage.from('documents').upload(...)` in retry at `src/routes/api/generate-report/+server.ts:196–218`.

  * Photos ZIP upload: add retry at `src/routes/api/generate-photos-zip/+server.ts:468–474` and download retries in `downloadPhoto()`.

* Aggregator robustness:

  * `src/routes/api/generate-all-documents/+server.ts:37–99` — collect per-endpoint errors, return detailed `results` for UI.

* UI feedback:

  * `src/lib/components/assessment/FinalizeTab.svelte:385–398` — surface per-document statuses after aggregate call; allow targeted retries.

## Verification

* Simulate slow network (Chrome DevTools “Slow 3G”) and large photo sets; ensure no connect timeout at 10s.

* Confirm uploads succeed under high latency; observe retries in logs.

* Verify Finalize tab shows progress per document and retry paths.

* Regression check: Bug #7 fixes remain effective; dashboard and force finalize flows stable.

## Risks & Mitigations

* Longer connect timeouts can hold sockets longer under failure; mitigate with keep-alive and retries.

* Ensure no leakage of service-role client to browser; keep changes limited to server files.

## Next Actions

* Implement Agent-based fetch overrides and storage retries.

* Test on development server; capture logs for timeout and retry behavior.

* Roll out with monitoring of storage operations during Generate All.

