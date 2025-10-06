// Assessment status types
export type AssessmentStatus = 'in_progress' | 'completed' | 'submitted';

// Vehicle condition types
export type VehicleCondition = 'excellent' | 'very_good' | 'good' | 'fair' | 'poor' | 'very_poor';

// System status types
export type SystemStatus = 'working' | 'not_working' | 'issues' | 'warning_light' | 'not_applicable';

// Tyre condition types
export type TyreCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'replace';

// Accessory condition types
export type AccessoryCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';

// Damage types
export type DamageArea = 'structural' | 'non_structural';
export type DamageType = 'collision' | 'fire' | 'hail' | 'theft' | 'vandalism' | 'weather' | 'mechanical' | 'other';
export type DamageSeverity = 'minor' | 'moderate' | 'severe' | 'total_loss';

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
	mileage_reading?: number | null;
	interior_condition?: VehicleCondition | null;
	srs_system?: SystemStatus | null;
	steering?: SystemStatus | null;
	brakes?: SystemStatus | null;
	handbrake?: SystemStatus | null;
	mechanical_notes?: string | null;
	interior_notes?: string | null;
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
	photo_url?: string | null;
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
	repair_method?: string | null;
	repair_duration_hours?: number | null;
	location_description?: string | null;
	photos: Array<{ url: string; description: string; panel?: string }>;
	damage_description?: string | null;
	repair_notes?: string | null;
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
	mileage_reading?: number;
	interior_condition?: VehicleCondition;
	srs_system?: SystemStatus;
	steering?: SystemStatus;
	brakes?: SystemStatus;
	handbrake?: SystemStatus;
	mechanical_notes?: string;
	interior_notes?: string;
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
	repair_method?: string;
	repair_duration_hours?: number;
	location_description?: string;
	photos?: Array<{ url: string; description: string; panel?: string }>;
	damage_description?: string;
	repair_notes?: string;
}

export interface UpdateDamageRecordInput
	extends Partial<Omit<CreateDamageRecordInput, 'assessment_id'>> {}

