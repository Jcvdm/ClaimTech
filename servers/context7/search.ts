/**
 * Context7 Documentation Search
 *
 * Functions for searching library documentation and API references.
 *
 * @module context7/search
 */

import { callMCPTool } from '../_shared/mcp-bridge';
import type { DocumentationSearchResult } from '../_shared/types';

/**
 * Search documentation across libraries
 *
 * @param params - Search parameters
 * @param params.query - Search query string
 * @param params.library - Optional library filter (e.g., 'svelte', 'playwright', 'supabase')
 * @returns Promise that resolves with search results
 * @throws Error if search fails
 *
 * @example
 * ```typescript
 * import { search } from '/servers/context7/search';
 *
 * // Search all libraries
 * const results = await search({
 *   query: 'form actions'
 * });
 *
 * // Search specific library
 * const svelteResults = await search({
 *   query: 'SvelteKit form actions',
 *   library: 'svelte'
 * });
 *
 * for (const result of svelteResults) {
 *   console.log(`${result.title}: ${result.url}`);
 *   console.log(`  ${result.excerpt}`);
 * }
 * ```
 */
export async function search(params: {
  query: string;
  library?: string;
}): Promise<DocumentationSearchResult[]> {
  return callMCPTool('mcp__context7__search', params);
}

/**
 * Get documentation for a specific library
 *
 * @param params - Library documentation parameters
 * @param params.libraryId - Library identifier (e.g., 'svelte', 'supabase-js')
 * @param params.topic - Optional topic within library
 * @returns Promise that resolves with documentation content
 * @throws Error if library not found or retrieval fails
 *
 * @example
 * ```typescript
 * import { getLibraryDocs } from '/servers/context7/search';
 *
 * // Get SvelteKit documentation
 * const svelteKitDocs = await getLibraryDocs({
 *   libraryId: 'svelte'
 * });
 *
 * // Get specific topic
 * const formActionsDocs = await getLibraryDocs({
 *   libraryId: 'svelte',
 *   topic: 'form-actions'
 * });
 * ```
 */
export async function getLibraryDocs(params: {
  libraryId: string;
  topic?: string;
}): Promise<string> {
  return callMCPTool('mcp__context7__get_library_docs', params);
}

/**
 * List available libraries in Context7
 *
 * @returns Promise that resolves with array of available library IDs
 * @throws Error if list retrieval fails
 *
 * @example
 * ```typescript
 * import { listLibraries } from '/servers/context7/search';
 *
 * const libraries = await listLibraries();
 * console.log('Available libraries:', libraries);
 * ```
 */
export async function listLibraries(): Promise<string[]> {
  return callMCPTool('mcp__context7__list_libraries', {});
}
