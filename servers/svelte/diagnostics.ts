/**
 * Svelte Diagnostics
 *
 * Get diagnostics and type information for Svelte files.
 *
 * @module svelte/diagnostics
 */

import { callMCPTool } from '../_shared/mcp-bridge';
import type { Diagnostic } from '../_shared/types';

/**
 * Get diagnostics for Svelte files
 *
 * @param params - Diagnostic parameters
 * @param params.uri - Optional file URI to get diagnostics for
 * @returns Promise that resolves with array of diagnostics
 * @throws Error if diagnostics retrieval fails
 *
 * @example
 * ```typescript
 * import { getDiagnostics } from '/servers/svelte/diagnostics';
 *
 * // Get diagnostics for specific file
 * const diagnostics = await getDiagnostics({
 *   uri: 'file:///src/routes/assessments/+page.svelte'
 * });
 *
 * for (const diag of diagnostics) {
 *   console.log(`${diag.severity}: ${diag.message} at line ${diag.line}`);
 * }
 *
 * // Get all diagnostics
 * const allDiagnostics = await getDiagnostics({});
 * ```
 */
export async function getDiagnostics(params: {
  uri?: string;
}): Promise<Diagnostic[]> {
  return callMCPTool('mcp__svelte__get_diagnostics', params);
}
