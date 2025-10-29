import type { AssessmentStage } from '$lib/types/assessment';

/**
 * Badge variant type for GradientBadge component
 */
export type BadgeVariant =
	| 'blue'
	| 'green'
	| 'yellow'
	| 'red'
	| 'purple'
	| 'indigo'
	| 'pink'
	| 'gray';

/**
 * Get badge variant for assessment stage
 * @param stage - Assessment stage
 * @returns Badge variant color
 */
export function getStageVariant(stage: AssessmentStage): BadgeVariant {
	switch (stage) {
		case 'request_submitted':
		case 'request_reviewed':
			return 'gray';
		case 'inspection_scheduled':
			return 'yellow';
		case 'appointment_scheduled':
			return 'blue';
		case 'assessment_in_progress':
			return 'indigo';
		case 'estimate_review':
		case 'estimate_sent':
			return 'purple';
		case 'estimate_finalized':
			return 'green';
		case 'frc_in_progress':
			return 'pink';
		case 'archived':
			return 'gray';
		case 'cancelled':
			return 'red';
		default:
			return 'gray';
	}
}

/**
 * Get human-readable label for assessment stage
 * @param stage - Assessment stage
 * @returns Human-readable label
 */
export function getStageLabel(stage: AssessmentStage): string {
	switch (stage) {
		case 'request_submitted':
			return 'Request Submitted';
		case 'request_reviewed':
			return 'Request Reviewed';
		case 'inspection_scheduled':
			return 'Inspection Scheduled';
		case 'appointment_scheduled':
			return 'Appointment Scheduled';
		case 'assessment_in_progress':
			return 'Assessment In Progress';
		case 'estimate_review':
			return 'Estimate Review';
		case 'estimate_sent':
			return 'Estimate Sent';
		case 'estimate_finalized':
			return 'Estimate Finalized';
		case 'frc_in_progress':
			return 'FRC In Progress';
		case 'archived':
			return 'Archived';
		case 'cancelled':
			return 'Cancelled';
		default:
			return stage;
	}
}

/**
 * Get badge variant for request type
 * @param type - Request type ('insurance' or 'private')
 * @returns Badge variant color
 */
export function getTypeVariant(type: 'insurance' | 'private'): BadgeVariant {
	return type === 'insurance' ? 'blue' : 'purple';
}

/**
 * Get human-readable label for request type
 * @param type - Request type
 * @returns Human-readable label
 */
export function getTypeLabel(type: 'insurance' | 'private'): string {
	return type === 'insurance' ? 'Insurance' : 'Private';
}

/**
 * Format vehicle display (Make Model)
 * @param make - Vehicle make
 * @param model - Vehicle model
 * @returns Formatted vehicle string or '-'
 */
export function formatVehicleDisplay(make?: string | null, model?: string | null): string {
	const display = `${make || ''} ${model || ''}`.trim();
	return display || '-';
}

/**
 * Format date with locale
 * @param date - ISO date string
 * @returns Formatted date string
 */
export function formatDateDisplay(date: string): string {
	return new Date(date).toLocaleDateString('en-ZA', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

/**
 * Format time display with duration
 * @param time - Time string (HH:MM)
 * @param duration - Duration in minutes
 * @returns Formatted time range or 'No time set'
 */
export function formatTimeDisplay(time?: string | null, duration?: number): string {
	if (!time) return 'No time set';

	const [hours, minutes] = time.split(':');
	const startTime = `${hours}:${minutes}`;

	if (!duration) return startTime;

	// Calculate end time
	const startDate = new Date();
	startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
	const endDate = new Date(startDate.getTime() + duration * 60000);
	const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

	return `${startTime} - ${endTime}`;
}

/**
 * Check if appointment is overdue
 * @param date - Appointment date (ISO string)
 * @param time - Appointment time (HH:MM)
 * @returns True if appointment is overdue
 */
export function isAppointmentOverdue(date: string, time?: string | null): boolean {
	const now = new Date();
	const appointmentDate = new Date(date);

	if (time) {
		const [hours, minutes] = time.split(':').map(Number);
		appointmentDate.setHours(hours, minutes, 0, 0);
	} else {
		// If no time, consider overdue if date has passed (end of day)
		appointmentDate.setHours(23, 59, 59, 999);
	}

	return now > appointmentDate;
}

/**
 * Format datetime display (date + time)
 * @param date - ISO date string
 * @param time - Time string (HH:MM)
 * @returns Formatted datetime string
 */
export function formatDateTimeDisplay(date: string, time?: string | null): string {
	const formattedDate = formatDateDisplay(date);
	if (!time) return formattedDate;

	const [hours, minutes] = time.split(':');
	return `${formattedDate} at ${hours}:${minutes}`;
}
