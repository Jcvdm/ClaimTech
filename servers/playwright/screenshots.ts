/**
 * Playwright Screenshot Capture
 *
 * Functions for capturing screenshots during testing and automation.
 *
 * @module playwright/screenshots
 */

import { callMCPTool } from '../_shared/mcp-bridge';

/**
 * Take a screenshot of the current page
 *
 * @param params - Screenshot parameters
 * @param params.fullPage - Capture full scrollable page (default: false)
 * @param params.path - Optional path to save screenshot
 * @returns Promise that resolves with screenshot buffer
 * @throws Error if screenshot capture fails
 *
 * @example
 * ```typescript
 * import { screenshot } from '/servers/playwright/screenshots';
 *
 * // Capture viewport
 * const img = await screenshot({});
 *
 * // Capture full page and save
 * await screenshot({
 *   fullPage: true,
 *   path: '.agent/Logs/screenshots/assessment-page.png'
 * });
 * ```
 */
export async function screenshot(params: {
  fullPage?: boolean;
  path?: string;
}): Promise<Buffer> {
  return callMCPTool('mcp__playwright__screenshot', params);
}

/**
 * Take a screenshot of a specific element
 *
 * @param params - Element screenshot parameters
 * @param params.selector - CSS selector for element
 * @param params.path - Optional path to save screenshot
 * @returns Promise that resolves with screenshot buffer
 * @throws Error if element not found or screenshot fails
 *
 * @example
 * ```typescript
 * import { screenshotElement } from '/servers/playwright/screenshots';
 *
 * await screenshotElement({
 *   selector: '.assessment-card',
 *   path: '.agent/Logs/screenshots/assessment-card.png'
 * });
 * ```
 */
export async function screenshotElement(params: {
  selector: string;
  path?: string;
}): Promise<Buffer> {
  return callMCPTool('mcp__playwright__screenshot_element', params);
}
