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

	// Default rates for this repairer (nullable from Supabase)
	default_labour_rate: number | null;
	default_paint_rate: number | null;
	default_vat_percentage: number | null;
	default_oem_markup_percentage: number | null;
	default_alt_markup_percentage: number | null;
	default_second_hand_markup_percentage: number | null;
	default_outwork_markup_percentage: number | null;

	created_at: string | null;
	updated_at: string | null;
	is_active: boolean | null;
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

