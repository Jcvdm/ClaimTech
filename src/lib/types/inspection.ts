export type InspectionStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Inspection {
	id: string;
	inspection_number: string;
	request_id: string;
	client_id: string;
	type: 'insurance' | 'private';
	claim_number?: string | null;
	request_number: string;
	status: InspectionStatus;

	// Vehicle info
	vehicle_make?: string | null;
	vehicle_model?: string | null;
	vehicle_year?: number | null;
	vehicle_vin?: string | null;
	vehicle_registration?: string | null;
	vehicle_color?: string | null;
	vehicle_mileage?: number | null;

	// Inspection details
	scheduled_date?: string | null;
	inspection_location?: string | null;
	assigned_engineer_id?: string | null;
	notes?: string | null;

	// Metadata
	accepted_by?: string | null;
	accepted_at: string;
	created_at: string;
	updated_at: string;
}

export interface CreateInspectionInput {
	request_id: string;
	client_id: string;
	type: 'insurance' | 'private';
	claim_number?: string;
	request_number: string;
	vehicle_make?: string;
	vehicle_model?: string;
	vehicle_year?: number;
	vehicle_vin?: string;
	vehicle_registration?: string;
	vehicle_color?: string;
	vehicle_mileage?: number;
	inspection_location?: string;
	notes?: string;
	accepted_by?: string;
}

export interface UpdateInspectionInput extends Partial<CreateInspectionInput> {
	status?: InspectionStatus;
	scheduled_date?: string;
	assigned_engineer_id?: string;
}

