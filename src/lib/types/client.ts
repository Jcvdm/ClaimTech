export type ClientType = 'insurance' | 'private';

export interface Client {
	id: string;
	name: string;
	type: ClientType;
	contact_name?: string | null;
	email?: string | null;
	phone?: string | null;
	address?: string | null;
	city?: string | null;
	postal_code?: string | null;
	notes?: string | null;

	// Write-off percentages for vehicle valuation
	borderline_writeoff_percentage: number; // Default 65.00
	total_writeoff_percentage: number; // Default 70.00
	salvage_percentage: number; // Default 28.00

	created_at: string;
	updated_at: string;
	is_active: boolean;
}

export interface CreateClientInput {
	name: string;
	type: ClientType;
	contact_name?: string;
	email?: string;
	phone?: string;
	address?: string;
	city?: string;
	postal_code?: string;
	notes?: string;
	borderline_writeoff_percentage?: number;
	total_writeoff_percentage?: number;
	salvage_percentage?: number;
}

export interface UpdateClientInput extends Partial<CreateClientInput> {}

