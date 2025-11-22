/**
 * Centralized data normalization helpers for reports and assessment tabs
 * Handles inconsistent column names across tables:
 * - assessment_vehicle_identification: registration_number, vin_number
 * - requests/inspections: vehicle_registration, vehicle_vin
 */

import type { Database } from '$lib/types/database';

type VehicleIdentification = Database['public']['Tables']['assessment_vehicle_identification']['Row'];
type Request = Database['public']['Tables']['requests']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];
type Inspection = Database['public']['Tables']['inspections']['Row'];

/**
 * Normalized vehicle details for consistent display
 */
export interface VehicleDetails {
	make: string | null;
	model: string | null;
	year: number | null;
	registration: string | null;
	vin: string | null;
	color: string | null;
	mileage: number | null;
	province: string | null;
}

/**
 * Normalized client (insurance company) details
 */
export interface ClientDetails {
	name: string;
	address: string | null;
	city: string | null;
	postalCode: string | null;
	phone: string | null;
	email: string | null;
	contactName: string | null;
}

/**
 * Normalized insured (vehicle owner) details
 */
export interface InsuredDetails {
	ownerName: string | null;
	ownerPhone: string | null;
	ownerEmail: string | null;
	ownerAddress: string | null;
	claimNumber: string | null;
	dateOfLoss: string | null;
	incidentType: string | null;
	incidentDescription: string | null;
}

/**
 * Get normalized vehicle details with 3-level fallback
 * Priority: vehicleIdentification > inspection > request
 */
export function getVehicleDetails(
	vehicleIdentification: VehicleIdentification | null,
	request: Request | null,
	inspection: Inspection | null = null
): VehicleDetails {
	return {
		make:
			vehicleIdentification?.vehicle_make ||
			inspection?.vehicle_make ||
			request?.vehicle_make ||
			null,
		model:
			vehicleIdentification?.vehicle_model ||
			inspection?.vehicle_model ||
			request?.vehicle_model ||
			null,
		year:
			vehicleIdentification?.vehicle_year ||
			inspection?.vehicle_year ||
			request?.vehicle_year ||
			null,
		registration:
			vehicleIdentification?.registration_number ||
			inspection?.vehicle_registration ||
			request?.vehicle_registration ||
			null,
		vin:
			vehicleIdentification?.vin_number ||
			inspection?.vehicle_vin ||
			request?.vehicle_vin ||
			null,
		color: inspection?.vehicle_color || request?.vehicle_color || null,
		mileage: inspection?.vehicle_mileage || request?.vehicle_mileage || null,
		province: inspection?.vehicle_province || request?.vehicle_province || null
	};
}

/**
 * Get normalized client (insurance company) details
 */
export function getClientDetails(client: Client | null): ClientDetails {
	return {
		name: client?.name || 'N/A',
		address: client?.address || null,
		city: client?.city || null,
		postalCode: client?.postal_code || null,
		phone: client?.phone || null,
		email: client?.email || null,
		contactName: client?.contact_name || null
	};
}

/**
 * Get normalized insured (vehicle owner) details
 */
export function getInsuredDetails(request: Request | null): InsuredDetails {
	return {
		ownerName: request?.owner_name || null,
		ownerPhone: request?.owner_phone || null,
		ownerEmail: request?.owner_email || null,
		ownerAddress: request?.owner_address || null,
		claimNumber: request?.claim_number || null,
		dateOfLoss: request?.date_of_loss || null,
		incidentType: request?.incident_type || null,
		incidentDescription: request?.incident_description || null
	};
}
