// Assessment status types
export type AssessmentStatus = 'in_progress' | 'completed' | 'submitted';

// Vehicle condition types
export type VehicleCondition = 'excellent' | 'very_good' | 'good' | 'fair' | 'poor' | 'very_poor';

// System status types
export type SystemStatus = 'working' | 'not_working' | 'issues' | 'warning_light' | 'not_applicable';

// SRS system status types (includes deployed for airbags/seatbelts)
export type SRSSystemStatus = 'operational' | 'warning_light' | 'not_working' | 'deployed';

// Transmission types
export type TransmissionType = 'automatic' | 'manual';

// Tyre condition types
export type TyreCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'replace';

// Accessory condition types
export type AccessoryCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';

// Damage types
export type DamageArea = 'structural' | 'non_structural';
export type DamageType = 'collision' | 'fire' | 'hail' | 'theft' | 'vandalism' | 'weather' | 'mechanical' | 'other';
export type DamageSeverity = 'minor' | 'moderate' | 'severe' | 'total_loss';

// Estimate types
export type ProcessType = 'N' | 'R' | 'P' | 'B' | 'A' | 'O';
export type PartType = 'OEM' | 'ALT' | '2ND';

export interface ProcessTypeConfig {
	code: ProcessType;
	label: string;
	description: string;
	requiredFields: {
		part_price: boolean;
		strip_assemble: boolean;
		labour: boolean;
		paint: boolean;
		outwork: boolean;
	};
}

// Legacy type for backward compatibility
export type EstimateCategory = 'parts' | 'labour' | 'paint' | 'other';

// Accessory types
export type AccessoryType =
	| 'mags'
	| 'spotlights'
	| 'park_sensors'
	| 'tow_bar'
	| 'bull_bar'
	| 'roof_rack'
	| 'side_steps'
	| 'canopy'
	| 'tonneau_cover'
	| 'nudge_bar'
	| 'winch'
	| 'snorkel'
	| 'custom';

// Main assessment interface
export interface Assessment {
	id: string;
	assessment_number: string;
	appointment_id: string;
	inspection_id: string;
	request_id: string;
	status: AssessmentStatus;
	current_tab: string;
	tabs_completed: string[];
	started_at: string;
	completed_at?: string | null;
	submitted_at?: string | null;
	created_at: string;
	updated_at: string;
}

// Vehicle identification interface
export interface VehicleIdentification {
	id: string;
	assessment_id: string;
	registration_number?: string | null;
	vin_number?: string | null;
	engine_number?: string | null;
	license_disc_expiry?: string | null;
	registration_photo_url?: string | null;
	vin_photo_url?: string | null;
	engine_number_photo_url?: string | null;
	license_disc_photo_url?: string | null;
	driver_license_photo_url?: string | null;
	driver_license_number?: string | null;
	created_at: string;
	updated_at: string;
}

// 360 exterior interface
export interface Exterior360 {
	id: string;
	assessment_id: string;
	overall_condition?: VehicleCondition | null;
	vehicle_color?: string | null;
	front_photo_url?: string | null;
	front_left_photo_url?: string | null;
	left_photo_url?: string | null;
	rear_left_photo_url?: string | null;
	rear_photo_url?: string | null;
	rear_right_photo_url?: string | null;
	right_photo_url?: string | null;
	front_right_photo_url?: string | null;
	additional_photos: Array<{ url: string; description: string }>;
	created_at: string;
	updated_at: string;
}

// Vehicle accessory interface
export interface VehicleAccessory {
	id: string;
	assessment_id: string;
	accessory_type: AccessoryType;
	custom_name?: string | null;
	condition?: AccessoryCondition | null;
	notes?: string | null;
	photo_url?: string | null;
	created_at: string;
	updated_at: string;
}

// Interior and mechanical interface
export interface InteriorMechanical {
	id: string;
	assessment_id: string;
	engine_bay_photo_url?: string | null;
	battery_photo_url?: string | null;
	oil_level_photo_url?: string | null;
	coolant_photo_url?: string | null;
	mileage_photo_url?: string | null;
	interior_front_photo_url?: string | null;
	interior_rear_photo_url?: string | null;
	dashboard_photo_url?: string | null;
	gear_lever_photo_url?: string | null;
	mileage_reading?: number | null;
	interior_condition?: VehicleCondition | null;
	transmission_type?: TransmissionType | null;
	vehicle_has_power?: boolean | null;
	srs_system?: SRSSystemStatus | null;
	steering?: SystemStatus | null;
	brakes?: SystemStatus | null;
	handbrake?: SystemStatus | null;
	created_at: string;
	updated_at: string;
}

// Tyre interface
export interface Tyre {
	id: string;
	assessment_id: string;
	position: string;
	position_label?: string | null;
	tyre_make?: string | null;
	tyre_size?: string | null;
	load_index?: string | null;
	speed_rating?: string | null;
	tread_depth_mm?: number | null;
	condition?: TyreCondition | null;
	face_photo_url?: string | null;
	tread_photo_url?: string | null;
	measurement_photo_url?: string | null;
	notes?: string | null;
	created_at: string;
	updated_at: string;
}

// Damage record interface
export interface DamageRecord {
	id: string;
	assessment_id: string;
	matches_description?: boolean | null;
	mismatch_notes?: string | null;
	damage_area: DamageArea;
	damage_type: DamageType;
	affected_panels: string[];
	severity?: DamageSeverity | null;
	estimated_repair_duration_days?: number | null;
	location_description?: string | null;
	photos: Array<{ url: string; description: string; panel?: string }>;
	damage_description?: string | null;
	created_at: string;
	updated_at: string;
}

// Assessment note interface (global notes visible across all tabs)
export interface AssessmentNote {
	id: string;
	assessment_id: string;
	note_text: string;
	created_by?: string | null;
	created_at: string;
	updated_at: string;
}

// Input types for creating/updating records
export interface CreateAssessmentInput {
	appointment_id: string;
	inspection_id: string;
	request_id: string;
}

export interface UpdateAssessmentInput {
	status?: AssessmentStatus;
	current_tab?: string;
	tabs_completed?: string[];
	completed_at?: string;
	submitted_at?: string;
}

export interface CreateVehicleIdentificationInput {
	assessment_id: string;
	registration_number?: string;
	vin_number?: string;
	engine_number?: string;
	license_disc_expiry?: string;
	registration_photo_url?: string;
	vin_photo_url?: string;
	engine_number_photo_url?: string;
	license_disc_photo_url?: string;
	driver_license_photo_url?: string;
	driver_license_number?: string;
}

export interface UpdateVehicleIdentificationInput
	extends Partial<Omit<CreateVehicleIdentificationInput, 'assessment_id'>> {}

export interface CreateExterior360Input {
	assessment_id: string;
	overall_condition?: VehicleCondition;
	vehicle_color?: string;
	front_photo_url?: string;
	front_left_photo_url?: string;
	left_photo_url?: string;
	rear_left_photo_url?: string;
	rear_photo_url?: string;
	rear_right_photo_url?: string;
	right_photo_url?: string;
	front_right_photo_url?: string;
	additional_photos?: Array<{ url: string; description: string }>;
}

export interface UpdateExterior360Input
	extends Partial<Omit<CreateExterior360Input, 'assessment_id'>> {}

export interface CreateAccessoryInput {
	assessment_id: string;
	accessory_type: AccessoryType;
	custom_name?: string;
	condition?: AccessoryCondition;
	notes?: string;
	photo_url?: string;
}

export interface UpdateAccessoryInput extends Partial<Omit<CreateAccessoryInput, 'assessment_id'>> {}

export interface CreateInteriorMechanicalInput {
	assessment_id: string;
	engine_bay_photo_url?: string;
	battery_photo_url?: string;
	oil_level_photo_url?: string;
	coolant_photo_url?: string;
	mileage_photo_url?: string;
	interior_front_photo_url?: string;
	interior_rear_photo_url?: string;
	dashboard_photo_url?: string;
	gear_lever_photo_url?: string;
	mileage_reading?: number;
	interior_condition?: VehicleCondition;
	transmission_type?: TransmissionType;
	vehicle_has_power?: boolean;
	srs_system?: SRSSystemStatus;
	steering?: SystemStatus;
	brakes?: SystemStatus;
	handbrake?: SystemStatus;
}

export interface UpdateInteriorMechanicalInput
	extends Partial<Omit<CreateInteriorMechanicalInput, 'assessment_id'>> {}

export interface CreateTyreInput {
	assessment_id: string;
	position: string;
	position_label?: string;
	tyre_make?: string;
	tyre_size?: string;
	load_index?: string;
	speed_rating?: string;
	tread_depth_mm?: number;
	condition?: TyreCondition;
	photo_url?: string;
	notes?: string;
}

export interface UpdateTyreInput extends Partial<Omit<CreateTyreInput, 'assessment_id'>> {}

export interface CreateDamageRecordInput {
	assessment_id: string;
	matches_description?: boolean;
	mismatch_notes?: string;
	damage_area: DamageArea;
	damage_type: DamageType;
	affected_panels?: string[];
	severity?: DamageSeverity;
	estimated_repair_duration_days?: number;
	location_description?: string;
	photos?: Array<{ url: string; description: string; panel?: string }>;
	damage_description?: string;
}

export interface UpdateDamageRecordInput
	extends Partial<Omit<CreateDamageRecordInput, 'assessment_id'>> {}

export interface CreateAssessmentNoteInput {
	assessment_id: string;
	note_text: string;
	created_by?: string;
}

export interface UpdateAssessmentNoteInput {
	note_text?: string;
}

// Estimate line item interface with process-based fields
export interface EstimateLineItem {
	id?: string;
	process_type: ProcessType;
	part_type?: PartType | null; // Only for process_type='N' (OEM=Original, ALT=Alternative, 2ND=Second Hand)
	description: string;
	// Conditional fields based on process_type
	part_price_nett?: number | null; // N only - Nett price without markup (user input)
	part_price?: number | null; // N only - Selling price with markup (calculated)
	strip_assemble_hours?: number | null; // N, R, P, B - Hours for S&A (user input)
	strip_assemble?: number | null; // N, R, P, B - S&A cost = hours × labour_rate (calculated)
	labour_hours?: number | null; // N, R, A
	labour_cost?: number; // Calculated: labour_hours × labour_rate
	paint_panels?: number | null; // N, R, P, B
	paint_cost?: number; // Calculated: paint_panels × paint_rate
	outwork_charge_nett?: number | null; // O only - Nett outwork cost without markup (user input)
	outwork_charge?: number | null; // O only - Selling price with markup (calculated)
	total: number; // Sum of applicable costs
}

// Estimate interface with rates
export interface Estimate {
	id: string;
	assessment_id: string;
	labour_rate: number; // Cost per hour (e.g., 500)
	paint_rate: number; // Cost per panel (e.g., 2000)
	oem_markup_percentage: number; // Markup % for OEM parts (default 25%)
	alt_markup_percentage: number; // Markup % for Aftermarket parts (default 25%)
	second_hand_markup_percentage: number; // Markup % for Second Hand parts (default 25%)
	outwork_markup_percentage: number; // Markup % for outwork charges (default 25%)
	line_items: EstimateLineItem[];
	subtotal: number;
	vat_percentage: number;
	vat_amount: number;
	total: number;
	notes?: string | null;
	currency: string;
	created_at: string;
	updated_at: string;
}

export interface CreateEstimateInput {
	assessment_id: string;
	labour_rate?: number;
	paint_rate?: number;
	oem_markup_percentage?: number;
	alt_markup_percentage?: number;
	second_hand_markup_percentage?: number;
	line_items?: EstimateLineItem[];
	notes?: string;
	vat_percentage?: number;
	currency?: string;
}

export interface UpdateEstimateInput extends Partial<Omit<CreateEstimateInput, 'assessment_id'>> {
	subtotal?: number;
	vat_amount?: number;
	total?: number;
}

// Estimate Photo interfaces
export interface EstimatePhoto {
	id: string;
	estimate_id: string;
	photo_url: string;
	photo_path: string;
	label?: string | null;
	display_order: number;
	created_at: string;
	updated_at: string;
}

export interface CreateEstimatePhotoInput {
	estimate_id: string;
	photo_url: string;
	photo_path: string;
	label?: string | null;
	display_order?: number;
}

export interface UpdateEstimatePhotoInput {
	label?: string | null;
	display_order?: number;
}
