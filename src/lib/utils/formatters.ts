/**
 * Centralized formatting utilities for currency, dates, and other common formats
 * Used across the Claimtech application for consistent display
 */

/**
 * Format currency value (ZAR - South African Rand)
 * @param value - The numeric value to format (can be null or undefined)
 * @param currency - Currency code (default: 'ZAR')
 * @returns Formatted currency string (e.g., "R1,234.56")
 */
export function formatCurrency(value: number | null | undefined, currency = 'ZAR'): string {
	if (value === null || value === undefined) return 'R0.00';
	return new Intl.NumberFormat('en-ZA', {
		style: 'currency',
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(value);
}

/**
 * Format date string to localized short format
 * @param dateString - ISO date string or null/undefined
 * @returns Formatted date string (e.g., "15 Jan 2025") or fallback
 */
export function formatDate(dateString: string | null | undefined): string {
	if (!dateString) return 'N/A';
	return new Date(dateString).toLocaleDateString('en-ZA', {
		day: '2-digit',
		month: 'short',
		year: 'numeric'
	});
}

/**
 * Format date string to localized long format
 * @param dateString - ISO date string or null/undefined
 * @returns Formatted date string (e.g., "15 January 2025") or fallback
 */
export function formatDateLong(dateString: string | null | undefined): string {
	if (!dateString) return 'N/A';
	return new Date(dateString).toLocaleDateString('en-ZA', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}

/**
 * Format date and time string to localized format
 * @param dateString - ISO date string or null/undefined
 * @returns Formatted date-time string (e.g., "15 Jan 2025, 14:30") or fallback
 */
export function formatDateTime(dateString: string | null | undefined): string {
	if (!dateString) return 'N/A';
	return new Date(dateString).toLocaleString('en-ZA', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/**
 * Format date for PDF templates (numeric format)
 * @param dateString - ISO date string or null/undefined
 * @returns Formatted date string (e.g., "15/01/2025") or fallback
 */
export function formatDateNumeric(dateString: string | null | undefined): string {
	if (!dateString) return 'N/A';
	return new Date(dateString).toLocaleDateString('en-ZA', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});
}

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 * Used in activity timelines and audit logs
 * @param dateString - ISO date string
 * @returns Relative time string or formatted date if older than 7 days
 */
export function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return 'Just now';
	if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
	if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
	if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

	return date.toLocaleDateString('en-ZA', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/**
 * Format date with weekday (e.g., "Monday, 15 January 2025")
 * Used for appointment displays
 * @param dateString - ISO date string or null/undefined
 * @returns Formatted date string with weekday or fallback
 */
export function formatDateWithWeekday(dateString: string | null | undefined): string {
	if (!dateString) return 'N/A';
	return new Date(dateString).toLocaleDateString('en-ZA', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}

