import type { Province } from './engineer';
import type { StructuredAddress } from './address';

export type RequestType = 'insurance' | 'private';
export type RequestStatus = 'draft' | 'submitted' | 'in_progress' | 'completed' | 'cancelled';
export type RequestStep = 'request' | 'assessment' | 'quote' | 'approval';

export interface Request {
	id: string;
	request_number: string;
	client_id: string;
	type: RequestType;
	claim_number?: string | null;
	status: RequestStatus;
	description?: string | null;

	// Incident Details
	date_of_loss?: string | null;
	insured_value?: number | null;
	excess_amount?: number | null;
	incident_type?: string | null;
	incident_description?: string | null;

	// Legacy incident location (backward compatibility)
	incident_location?: string | null;
	// Structured incident location fields
	incident_street_address?: string | null;
	incident_suburb?: string | null;
	incident_city?: string | null;
	incident_province?: Province | null;
	incident_postal_code?: string | null;
	incident_latitude?: number | null;
	incident_longitude?: number | null;
	incident_place_id?: string | null;
	incident_location_notes?: string | null;

	// Vehicle Information
	vehicle_make?: string | null;
	vehicle_model?: string | null;
	vehicle_year?: number | null;
	vehicle_vin?: string | null;
	vehicle_registration?: string | null;
	vehicle_color?: string | null;
	vehicle_mileage?: number | null;
	vehicle_province?: Province | null;

	// Owner Details
	owner_name?: string | null;
	owner_phone?: string | null;
	owner_email?: string | null;
	// Legacy owner address (backward compatibility)
	owner_address?: string | null;
	// Structured owner address fields
	owner_street_address?: string | null;
	owner_suburb?: string | null;
	owner_city?: string | null;
	owner_province?: Province | null;
	owner_postal_code?: string | null;
	owner_latitude?: number | null;
	owner_longitude?: number | null;
	owner_place_id?: string | null;

	// Third Party Details
	third_party_name?: string | null;
	third_party_phone?: string | null;
	third_party_email?: string | null;
	third_party_insurance?: string | null;

	// Workflow
	current_step: RequestStep;
	assigned_engineer_id?: string | null;

	created_at: string;
	updated_at: string;
}

export interface CreateRequestInput {
	client_id: string;
	type: RequestType;
	claim_number?: string;
	description?: string;
	date_of_loss?: string;
	insured_value?: number;
	excess_amount?: number;
	incident_type?: string;
	incident_description?: string;
	// Legacy incident location
	incident_location?: string;
	// Structured incident location
	incident_street_address?: string;
	incident_suburb?: string;
	incident_city?: string;
	incident_province?: Province;
	incident_postal_code?: string;
	incident_latitude?: number;
	incident_longitude?: number;
	incident_place_id?: string;
	incident_location_notes?: string;
	// Vehicle
	vehicle_make?: string;
	vehicle_model?: string;
	vehicle_year?: number;
	vehicle_vin?: string;
	vehicle_registration?: string;
	vehicle_color?: string;
	vehicle_mileage?: number;
	vehicle_province?: Province;
	// Owner
	owner_name?: string;
	owner_phone?: string;
	owner_email?: string;
	// Legacy owner address
	owner_address?: string;
	// Structured owner address
	owner_street_address?: string;
	owner_suburb?: string;
	owner_city?: string;
	owner_province?: Province;
	owner_postal_code?: string;
	owner_latitude?: number;
	owner_longitude?: number;
	owner_place_id?: string;
	// Third party
	third_party_name?: string;
	third_party_phone?: string;
	third_party_email?: string;
	third_party_insurance?: string;
}

export interface UpdateRequestInput extends Partial<CreateRequestInput> {
	status?: RequestStatus;
	current_step?: RequestStep;
	assigned_engineer_id?: string | null;
}

/**
 * Convert Request incident fields to StructuredAddress
 */
export function getIncidentAddress(request: Request): StructuredAddress | null {
	// Check if we have any structured data
	const hasStructured =
		request.incident_street_address ||
		request.incident_suburb ||
		request.incident_city ||
		request.incident_province ||
		request.incident_postal_code ||
		request.incident_latitude ||
		request.incident_longitude;

	if (!hasStructured && !request.incident_location) return null;

	// Build formatted address
	let formatted = request.incident_location || '';
	if (hasStructured && !formatted) {
		formatted = [request.incident_street_address, request.incident_suburb, request.incident_city, request.incident_province, request.incident_postal_code].filter(Boolean).join(', ');
	}

	return {
		formatted_address: formatted,
		street_address: request.incident_street_address || undefined,
		suburb: request.incident_suburb || undefined,
		city: request.incident_city || undefined,
		province: request.incident_province || undefined,
		postal_code: request.incident_postal_code || undefined,
		latitude: request.incident_latitude || undefined,
		longitude: request.incident_longitude || undefined,
		place_id: request.incident_place_id || undefined,
		notes: request.incident_location_notes || undefined,
		country: 'South Africa'
	};
}

/**
 * Convert Request owner fields to StructuredAddress
 */
export function getOwnerAddress(request: Request): StructuredAddress | null {
	// Check if we have any structured data
	const hasStructured =
		request.owner_street_address ||
		request.owner_suburb ||
		request.owner_city ||
		request.owner_province ||
		request.owner_postal_code ||
		request.owner_latitude ||
		request.owner_longitude;

	if (!hasStructured && !request.owner_address) return null;

	// Build formatted address
	let formatted = request.owner_address || '';
	if (hasStructured && !formatted) {
		formatted = [request.owner_street_address, request.owner_suburb, request.owner_city, request.owner_province, request.owner_postal_code].filter(Boolean).join(', ');
	}

	return {
		formatted_address: formatted,
		street_address: request.owner_street_address || undefined,
		suburb: request.owner_suburb || undefined,
		city: request.owner_city || undefined,
		province: request.owner_province || undefined,
		postal_code: request.owner_postal_code || undefined,
		latitude: request.owner_latitude || undefined,
		longitude: request.owner_longitude || undefined,
		place_id: request.owner_place_id || undefined,
		country: 'South Africa'
	};
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

export interface RequestTask {
	id: string;
	request_id: string;
	step: RequestStep;
	title: string;
	description?: string | null;
	status: TaskStatus;
	assigned_to?: string | null;
	due_date?: string | null;
	completed_at?: string | null;
	created_at: string;
	updated_at: string;
}

export interface CreateTaskInput {
	request_id: string;
	step: RequestStep;
	title: string;
	description?: string;
	assigned_to?: string;
	due_date?: string;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
	status?: TaskStatus;
	completed_at?: string;
}
