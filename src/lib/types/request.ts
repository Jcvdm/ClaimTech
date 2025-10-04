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
	incident_type?: string | null;
	incident_description?: string | null;
	incident_location?: string | null;

	// Vehicle Information
	vehicle_make?: string | null;
	vehicle_model?: string | null;
	vehicle_year?: number | null;
	vehicle_vin?: string | null;
	vehicle_registration?: string | null;
	vehicle_color?: string | null;
	vehicle_mileage?: number | null;

	// Owner Details
	owner_name?: string | null;
	owner_phone?: string | null;
	owner_email?: string | null;
	owner_address?: string | null;

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
	incident_type?: string;
	incident_description?: string;
	incident_location?: string;
	vehicle_make?: string;
	vehicle_model?: string;
	vehicle_year?: number;
	vehicle_vin?: string;
	vehicle_registration?: string;
	vehicle_color?: string;
	vehicle_mileage?: number;
	owner_name?: string;
	owner_phone?: string;
	owner_email?: string;
	owner_address?: string;
	third_party_name?: string;
	third_party_phone?: string;
	third_party_email?: string;
	third_party_insurance?: string;
}

export interface UpdateRequestInput extends Partial<CreateRequestInput> {
	status?: RequestStatus;
	current_step?: RequestStep;
	assigned_engineer_id?: string;
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

