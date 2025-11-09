/**
 * Chrome DevTools Network
 *
 * Functions for monitoring network requests and responses.
 *
 * @module chrome/network
 */

import { callMCPTool } from '../_shared/mcp-bridge';

/**
 * Network request entry
 */
export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestTime: number;
  responseTime: number;
  duration: number;
  size: number;
  type: string;
}

/**
 * Get network requests from browser
 *
 * @returns Promise that resolves with array of network requests
 * @throws Error if network request retrieval fails
 *
 * @example
 * ```typescript
 * import { getNetworkRequests } from '/servers/chrome/network';
 *
 * const requests = await getNetworkRequests();
 *
 * // Filter failed requests
 * const failed = requests.filter(req => req.status >= 400);
 * console.log(`Found ${failed.length} failed requests`);
 *
 * // Find slow requests
 * const slow = requests.filter(req => req.duration > 1000);
 * console.log(`Found ${slow.length} slow requests (>1s)`);
 *
 * // Check for API calls
 * const apiCalls = requests.filter(req =>
 *   req.url.includes('/api/')
 * );
 * ```
 */
export async function getNetworkRequests(): Promise<NetworkRequest[]> {
  return callMCPTool('mcp__chrome__get_network_requests', {});
}

/**
 * Clear network request log
 *
 * @returns Promise that resolves when network log is cleared
 * @throws Error if clear operation fails
 *
 * @example
 * ```typescript
 * import { clearNetwork } from '/servers/chrome/network';
 *
 * await clearNetwork();
 * ```
 */
export async function clearNetwork(): Promise<void> {
  return callMCPTool('mcp__chrome__clear_network', {});
}

/**
 * Enable network request monitoring
 *
 * @returns Promise that resolves when monitoring is enabled
 * @throws Error if enable operation fails
 *
 * @example
 * ```typescript
 * import { enableNetwork } from '/servers/chrome/network';
 *
 * await enableNetwork();
 * ```
 */
export async function enableNetwork(): Promise<void> {
  return callMCPTool('mcp__chrome__enable_network', {});
}

/**
 * Disable network request monitoring
 *
 * @returns Promise that resolves when monitoring is disabled
 * @throws Error if disable operation fails
 *
 * @example
 * ```typescript
 * import { disableNetwork } from '/servers/chrome/network';
 *
 * await disableNetwork();
 * ```
 */
export async function disableNetwork(): Promise<void> {
  return callMCPTool('mcp__chrome__disable_network', {});
}
