/**
 * HTML Sanitization Utilities
 *
 * Provides functions for escaping HTML to prevent XSS attacks in PDF templates
 * and other user-generated content contexts.
 */

/**
 * Escapes HTML special characters to prevent XSS injection
 *
 * @param text - The text to escape
 * @returns HTML-safe string with special characters escaped
 *
 * @example
 * ```typescript
 * escapeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * ```
 */
export function escapeHtml(text: string): string {
	if (!text) return '';

	const htmlEscapeMap: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;'
	};

	return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char]);
}

/**
 * Preserves line breaks in HTML-escaped text by converting them to <br> tags
 *
 * @param text - The text to format
 * @returns HTML-safe string with line breaks preserved
 *
 * @example
 * ```typescript
 * escapeHtmlWithLineBreaks('Line 1\nLine 2')
 * // Returns: 'Line 1<br>Line 2'
 * ```
 */
export function escapeHtmlWithLineBreaks(text: string): string {
	if (!text) return '';

	return escapeHtml(text).replace(/\n/g, '<br>');
}

/**
 * Validates and truncates text to a maximum length
 *
 * @param text - The text to validate
 * @param maxLength - Maximum allowed length
 * @returns Truncated text if needed
 */
export function truncateText(text: string, maxLength: number): string {
	if (!text) return '';
	return text.length > maxLength ? text.substring(0, maxLength) : text;
}

/**
 * Sanitizes user input for storage in database
 * Trims whitespace and normalizes line breaks
 *
 * @param text - The text to sanitize
 * @returns Sanitized text
 */
export function sanitizeInput(text: string): string {
	if (!text) return '';

	return text
		.trim()
		.replace(/\r\n/g, '\n') // Normalize Windows line breaks
		.replace(/\r/g, '\n'); // Normalize old Mac line breaks
}
