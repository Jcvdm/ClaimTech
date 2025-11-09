/**
 * Chrome DevTools Console
 *
 * Functions for accessing browser console logs and errors.
 *
 * @module chrome/console
 */

import { callMCPTool } from '../_shared/mcp-bridge';

/**
 * Console log entry
 */
export interface ConsoleLog {
  type: 'log' | 'warning' | 'error' | 'info' | 'debug';
  message: string;
  timestamp: number;
  source?: string;
  lineNumber?: number;
  columnNumber?: number;
  stackTrace?: string;
}

/**
 * Get console logs from browser
 *
 * @returns Promise that resolves with array of console logs
 * @throws Error if console log retrieval fails
 *
 * @example
 * ```typescript
 * import { getConsoleLogs } from '/servers/chrome/console';
 *
 * const logs = await getConsoleLogs();
 *
 * // Filter errors
 * const errors = logs.filter(log => log.type === 'error');
 * console.log(`Found ${errors.length} console errors`);
 *
 * // Check for specific error
 * const hasAuthError = logs.some(log =>
 *   log.type === 'error' && log.message.includes('Authentication')
 * );
 * ```
 */
export async function getConsoleLogs(): Promise<ConsoleLog[]> {
  return callMCPTool('mcp__chrome__get_console_logs', {});
}

/**
 * Clear console logs
 *
 * @returns Promise that resolves when console is cleared
 * @throws Error if clear operation fails
 *
 * @example
 * ```typescript
 * import { clearConsole } from '/servers/chrome/console';
 *
 * await clearConsole();
 * ```
 */
export async function clearConsole(): Promise<void> {
  return callMCPTool('mcp__chrome__clear_console', {});
}
