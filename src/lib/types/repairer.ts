export interface Repairer {
	id: string;
	name: string;
	contact_name?: string | null;
	email?: string | null;
	phone?: string | null;
	address?: string | null;
	city?: string | null;
	province?: string | null;
	postal_code?: string | null;
	notes?: string | null;

	// Default rates for this repairer
	default_labour_rate: number;
	default_paint_rate: number;
	default_vat_percentage: number;
	default_oem_markup_percentage: number;
	default_alt_markup_percentage: number;
	default_second_hand_markup_percentage: number;
	default_outwork_markup_percentage: number;

	created_at: string;
	updated_at: string;
	is_active: boolean;
}

export interface CreateRepairerInput {
	name: string;
	contact_name?: string;
	email?: string;
	phone?: string;
	address?: string;
	city?: string;
	province?: string;
	postal_code?: string;
	notes?: string;
	default_labour_rate?: number;
	default_paint_rate?: number;
	default_vat_percentage?: number;
	default_oem_markup_percentage?: number;
	default_alt_markup_percentage?: number;
	default_second_hand_markup_percentage?: number;
	default_outwork_markup_percentage?: number;
}

export interface UpdateRepairerInput extends Partial<CreateRepairerInput> {}

