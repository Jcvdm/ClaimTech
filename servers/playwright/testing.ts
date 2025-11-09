/**
 * Playwright E2E Testing Helpers
 *
 * Helper functions for writing end-to-end tests with Playwright.
 *
 * @module playwright/testing
 */

import { callMCPTool } from '../_shared/mcp-bridge';

/**
 * Assert element is visible
 *
 * @param params - Assertion parameters
 * @param params.selector - CSS selector for element
 * @param params.timeout - Maximum time to wait in ms (default: 5000)
 * @returns Promise that resolves if assertion passes
 * @throws Error if element is not visible
 *
 * @example
 * ```typescript
 * import { expectVisible } from '/servers/playwright/testing';
 *
 * await expectVisible({ selector: '.success-message' });
 * ```
 */
export async function expectVisible(params: {
  selector: string;
  timeout?: number;
}): Promise<void> {
  return callMCPTool('mcp__playwright__expect_visible', params);
}

/**
 * Assert element contains text
 *
 * @param params - Assertion parameters
 * @param params.selector - CSS selector for element
 * @param params.text - Expected text content
 * @returns Promise that resolves if assertion passes
 * @throws Error if text doesn't match
 *
 * @example
 * ```typescript
 * import { expectText } from '/servers/playwright/testing';
 *
 * await expectText({
 *   selector: '.status-badge',
 *   text: 'Completed'
 * });
 * ```
 */
export async function expectText(params: {
  selector: string;
  text: string;
}): Promise<void> {
  return callMCPTool('mcp__playwright__expect_text', params);
}

/**
 * Assert element has attribute with value
 *
 * @param params - Assertion parameters
 * @param params.selector - CSS selector for element
 * @param params.attribute - Attribute name
 * @param params.value - Expected attribute value
 * @returns Promise that resolves if assertion passes
 * @throws Error if attribute value doesn't match
 *
 * @example
 * ```typescript
 * import { expectAttribute } from '/servers/playwright/testing';
 *
 * await expectAttribute({
 *   selector: 'a.download',
 *   attribute: 'href',
 *   value: '/reports/assessment-123.pdf'
 * });
 * ```
 */
export async function expectAttribute(params: {
  selector: string;
  attribute: string;
  value: string;
}): Promise<void> {
  return callMCPTool('mcp__playwright__expect_attribute', params);
}

/**
 * Assert element count matches expected
 *
 * @param params - Assertion parameters
 * @param params.selector - CSS selector for elements
 * @param params.count - Expected number of elements
 * @returns Promise that resolves if assertion passes
 * @throws Error if count doesn't match
 *
 * @example
 * ```typescript
 * import { expectCount } from '/servers/playwright/testing';
 *
 * await expectCount({
 *   selector: '.assessment-card',
 *   count: 10
 * });
 * ```
 */
export async function expectCount(params: {
  selector: string;
  count: number;
}): Promise<void> {
  return callMCPTool('mcp__playwright__expect_count', params);
}

/**
 * Assert element is enabled
 *
 * @param params - Assertion parameters
 * @param params.selector - CSS selector for element
 * @returns Promise that resolves if assertion passes
 * @throws Error if element is disabled
 *
 * @example
 * ```typescript
 * import { expectEnabled } from '/servers/playwright/testing';
 *
 * await expectEnabled({ selector: 'button[type="submit"]' });
 * ```
 */
export async function expectEnabled(params: {
  selector: string;
}): Promise<void> {
  return callMCPTool('mcp__playwright__expect_enabled', params);
}

/**
 * Assert element is disabled
 *
 * @param params - Assertion parameters
 * @param params.selector - CSS selector for element
 * @returns Promise that resolves if assertion passes
 * @throws Error if element is enabled
 *
 * @example
 * ```typescript
 * import { expectDisabled } from '/servers/playwright/testing';
 *
 * await expectDisabled({ selector: 'button.save' });
 * ```
 */
export async function expectDisabled(params: {
  selector: string;
}): Promise<void> {
  return callMCPTool('mcp__playwright__expect_disabled', params);
}
