/**
 * Playwright Browser Automation
 *
 * Functions for browser navigation, interaction, and manipulation.
 *
 * @module playwright/browser
 */

import { callMCPTool } from '../_shared/mcp-bridge';

/**
 * Navigate browser to URL
 *
 * @param params - Navigation parameters
 * @param params.url - URL to navigate to
 * @returns Promise that resolves when navigation is complete
 * @throws Error if navigation fails
 *
 * @example
 * ```typescript
 * import { navigate } from '/servers/playwright/browser';
 *
 * await navigate({ url: 'http://localhost:5173/login' });
 * ```
 */
export async function navigate(params: {
  url: string;
}): Promise<void> {
  return callMCPTool('mcp__playwright__navigate', params);
}

/**
 * Click an element
 *
 * @param params - Click parameters
 * @param params.selector - CSS selector for element to click
 * @returns Promise that resolves when click is complete
 * @throws Error if element not found or click fails
 *
 * @example
 * ```typescript
 * import { click } from '/servers/playwright/browser';
 *
 * await click({ selector: 'button[type="submit"]' });
 * ```
 */
export async function click(params: {
  selector: string;
}): Promise<void> {
  return callMCPTool('mcp__playwright__click', params);
}

/**
 * Type text into an element
 *
 * @param params - Type parameters
 * @param params.selector - CSS selector for input element
 * @param params.text - Text to type
 * @returns Promise that resolves when typing is complete
 * @throws Error if element not found or typing fails
 *
 * @example
 * ```typescript
 * import { type } from '/servers/playwright/browser';
 *
 * await type({
 *   selector: 'input[name="email"]',
 *   text: 'user@example.com'
 * });
 * ```
 */
export async function type(params: {
  selector: string;
  text: string;
}): Promise<void> {
  return callMCPTool('mcp__playwright__type', params);
}

/**
 * Fill an input element (clears then types)
 *
 * @param params - Fill parameters
 * @param params.selector - CSS selector for input element
 * @param params.value - Value to fill
 * @returns Promise that resolves when fill is complete
 * @throws Error if element not found or fill fails
 *
 * @example
 * ```typescript
 * import { fill } from '/servers/playwright/browser';
 *
 * await fill({
 *   selector: 'input[name="password"]',
 *   value: 'secret123'
 * });
 * ```
 */
export async function fill(params: {
  selector: string;
  value: string;
}): Promise<void> {
  return callMCPTool('mcp__playwright__fill', params);
}

/**
 * Wait for selector to be visible
 *
 * @param params - Wait parameters
 * @param params.selector - CSS selector to wait for
 * @param params.timeout - Maximum time to wait in ms (default: 30000)
 * @returns Promise that resolves when element is visible
 * @throws Error if timeout or element not found
 *
 * @example
 * ```typescript
 * import { waitForSelector } from '/servers/playwright/browser';
 *
 * await waitForSelector({
 *   selector: '.success-message',
 *   timeout: 5000
 * });
 * ```
 */
export async function waitForSelector(params: {
  selector: string;
  timeout?: number;
}): Promise<void> {
  return callMCPTool('mcp__playwright__wait_for_selector', params);
}

/**
 * Get text content of an element
 *
 * @param params - Get text parameters
 * @param params.selector - CSS selector for element
 * @returns Promise that resolves with element text
 * @throws Error if element not found
 *
 * @example
 * ```typescript
 * import { getText } from '/servers/playwright/browser';
 *
 * const message = await getText({ selector: '.status' });
 * console.log('Status:', message);
 * ```
 */
export async function getText(params: {
  selector: string;
}): Promise<string> {
  return callMCPTool('mcp__playwright__get_text', params);
}

/**
 * Get attribute value of an element
 *
 * @param params - Get attribute parameters
 * @param params.selector - CSS selector for element
 * @param params.attribute - Attribute name to get
 * @returns Promise that resolves with attribute value
 * @throws Error if element not found
 *
 * @example
 * ```typescript
 * import { getAttribute } from '/servers/playwright/browser';
 *
 * const href = await getAttribute({
 *   selector: 'a.download-link',
 *   attribute: 'href'
 * });
 * ```
 */
export async function getAttribute(params: {
  selector: string;
  attribute: string;
}): Promise<string | null> {
  return callMCPTool('mcp__playwright__get_attribute', params);
}

/**
 * Select option from dropdown
 *
 * @param params - Select parameters
 * @param params.selector - CSS selector for select element
 * @param params.value - Option value to select
 * @returns Promise that resolves when selection is complete
 * @throws Error if element not found or option doesn't exist
 *
 * @example
 * ```typescript
 * import { selectOption } from '/servers/playwright/browser';
 *
 * await selectOption({
 *   selector: 'select[name="status"]',
 *   value: 'completed'
 * });
 * ```
 */
export async function selectOption(params: {
  selector: string;
  value: string;
}): Promise<void> {
  return callMCPTool('mcp__playwright__select_option', params);
}

/**
 * Check a checkbox
 *
 * @param params - Check parameters
 * @param params.selector - CSS selector for checkbox
 * @returns Promise that resolves when check is complete
 * @throws Error if element not found
 *
 * @example
 * ```typescript
 * import { check } from '/servers/playwright/browser';
 *
 * await check({ selector: 'input[type="checkbox"][name="agree"]' });
 * ```
 */
export async function check(params: {
  selector: string;
}): Promise<void> {
  return callMCPTool('mcp__playwright__check', params);
}

/**
 * Uncheck a checkbox
 *
 * @param params - Uncheck parameters
 * @param params.selector - CSS selector for checkbox
 * @returns Promise that resolves when uncheck is complete
 * @throws Error if element not found
 *
 * @example
 * ```typescript
 * import { uncheck } from '/servers/playwright/browser';
 *
 * await uncheck({ selector: 'input[type="checkbox"][name="subscribe"]' });
 * ```
 */
export async function uncheck(params: {
  selector: string;
}): Promise<void> {
  return callMCPTool('mcp__playwright__uncheck', params);
}
