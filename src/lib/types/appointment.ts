import type { Province } from './engineer';

export type AppointmentType = 'in_person' | 'digital';

export type AppointmentStatus =
	| 'scheduled' // Initial state when created
	| 'confirmed' // Engineer confirmed attendance
	| 'in_progress' // Appointment is happening now
	| 'completed' // Appointment finished
	| 'cancelled' // Appointment cancelled
	| 'rescheduled'; // Appointment rescheduled to new date

export interface Appointment {
	id: string;
	appointment_number: string;
	inspection_id: string;
	request_id: string;
	client_id: string;
	engineer_id: string;

	// Appointment details
	appointment_type: AppointmentType;
	appointment_date: string; // ISO date string
	appointment_time?: string | null; // HH:MM format
	duration_minutes: number;

	// Location (for in-person)
	location_address?: string | null;
	location_city?: string | null;
	location_province?: Province | null;
	location_notes?: string | null;

	// Status
	status: AppointmentStatus;

	// Vehicle info
	vehicle_make?: string | null;
	vehicle_model?: string | null;
	vehicle_year?: number | null;
	vehicle_registration?: string | null;

	// Notes
	notes?: string | null;
	special_instructions?: string | null;

	// Metadata
	created_by?: string | null;
	created_at: string;
	updated_at: string;
	completed_at?: string | null;
	cancelled_at?: string | null;
	cancellation_reason?: string | null;
}

export interface CreateAppointmentInput {
	inspection_id: string;
	request_id: string;
	client_id: string;
	engineer_id: string;
	appointment_type: AppointmentType;
	appointment_date: string;
	appointment_time?: string;
	duration_minutes?: number;
	location_address?: string;
	location_city?: string;
	location_province?: Province;
	location_notes?: string;
	notes?: string;
	special_instructions?: string;
	vehicle_make?: string;
	vehicle_model?: string;
	vehicle_year?: number;
	vehicle_registration?: string;
}

export interface UpdateAppointmentInput extends Partial<CreateAppointmentInput> {
	status?: AppointmentStatus;
	completed_at?: string;
	cancelled_at?: string;
	cancellation_reason?: string;
}

