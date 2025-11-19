// Assessment status types
// Flow: in_progress → submitted (finalized) → archived (FRC completed)
// Note: 'completed' status is deprecated and should not be used
// 'cancelled' status is used when assessment is cancelled at any stage
export type AssessmentStatus = 'in_progress' | 'completed' | 'submitted' | 'archived' | 'cancelled';

// Assessment stage types - NEW: Stage-based pipeline tracking
// Replaces status field with more granular workflow stages
export type AssessmentStage =
	| 'request_submitted' // Initial request created, assessment created
	| 'request_reviewed' // Admin reviewed request, ready for scheduling
	| 'inspection_scheduled' // Inspection scheduled with engineer
	| 'appointment_scheduled' // Appointment scheduled with engineer
	| 'assessment_in_progress' // Engineer started assessment (collecting data)
	| 'estimate_review' // Estimate under review
	| 'estimate_sent' // Estimate sent to client
	| 'estimate_finalized' // Estimate finalized, rates frozen
	| 'frc_in_progress' // Final Repair Costing started
	| 'archived' // Assessment archived/completed
	| 'cancelled'; // Cancelled at any stage

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
	appointment_id: string | null; // Now nullable - assessments can exist before appointments
	inspection_id: string | null; // Now nullable - assessments can exist before inspections
	request_id: string;
	status: AssessmentStatus; // Keep for backward compatibility
	stage: AssessmentStage; // NEW: Stage-based pipeline tracking
	current_tab: string;
	tabs_completed: string[];
	started_at: string;
	completed_at?: string | null;
	submitted_at?: string | null;
	cancelled_at?: string | null;
	created_at: string;
	updated_at: string;

	// Document generation fields
	report_pdf_url?: string | null;
	report_pdf_path?: string | null;
	estimate_pdf_url?: string | null;
	estimate_pdf_path?: string | null;
	photos_pdf_url?: string | null;
	photos_pdf_path?: string | null;
	photos_zip_url?: string | null;
	photos_zip_path?: string | null;
	documents_generated_at?: string | null;
	report_number?: string | null;
	assessor_name?: string | null;
	assessor_contact?: string | null;
	assessor_email?: string | null;

	// Estimate finalization
	estimate_finalized_at?: string | null;

	// Frozen rates and markups at finalization (for FRC consistency)
	finalized_labour_rate?: number | null;
	finalized_paint_rate?: number | null;
	finalized_oem_markup?: number | null;
	finalized_alt_markup?: number | null;
	finalized_second_hand_markup?: number | null;
	finalized_outwork_markup?: number | null;
}

// Vehicle identification interface
export interface VehicleIdentification {
	id: string;
	assessment_id: string;
	// Vehicle info (editable during assessment)
	vehicle_make?: string | null;
	vehicle_model?: string | null;
	vehicle_year?: number | null;
	// Identification details
	registration_number?: string | null;
	vin_number?: string | null;
	engine_number?: string | null;
	license_disc_expiry?: string | null;
	// Photos
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
	notes?: string | null;
	created_at: string;
	updated_at: string;
}

// Tyre photo interface
export interface TyrePhoto {
	id: string;
	tyre_id: string;
	assessment_id: string;
	photo_url: string;
	photo_path: string;
	label?: string | null;
	display_order: number;
	created_at: string;
	updated_at: string;
}

// Tyre photo input interfaces
export interface CreateTyrePhotoInput {
	tyre_id: string;
	assessment_id: string;
	photo_url: string;
	photo_path: string;
	label?: string;
	display_order?: number;
}

export interface UpdateTyrePhotoInput {
	label?: string;
	display_order?: number;
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

// Assessment note types
export type AssessmentNoteType = 'manual' | 'betterment' | 'system';

// Assessment note interface (supports multiple notes per assessment)
export interface AssessmentNote {
	id: string;
	assessment_id: string;
	note_text: string;
	note_type: AssessmentNoteType;
	note_title?: string | null;
	source_tab?: string | null; // Tab ID where note was created (e.g., 'summary', 'identification', 'estimate')
	created_by?: string | null;
	created_at: string;
	updated_at: string;
	is_edited?: boolean;
	edited_at?: string | null;
	edited_by?: string | null;
}

// Input types for creating/updating records
export interface CreateAssessmentInput {
	appointment_id?: string | null; // Now optional - can be set later
	inspection_id?: string | null; // Now optional - can be set later
	request_id: string;
	stage?: AssessmentStage; // Optional - defaults to 'request_submitted'
}

export interface UpdateAssessmentInput {
	status?: AssessmentStatus;
	stage?: AssessmentStage; // NEW: Allow stage updates
	current_tab?: string;
	tabs_completed?: string[];
	completed_at?: string;
	submitted_at?: string;
	appointment_id?: string | null; // Allow updating appointment_id
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
	note_type?: AssessmentNoteType;
	note_title?: string;
	source_tab?: string; // Tab ID where note was created
	created_by?: string;
}

export interface UpdateAssessmentNoteInput {
	note_text?: string;
	note_title?: string;
	is_edited?: boolean;
	edited_at?: string;
	edited_by?: string;
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
	// Betterment fields - percentage deductions (0-100)
	betterment_part_percentage?: number | null; // Percentage deduction on part_price_nett
	betterment_sa_percentage?: number | null; // Percentage deduction on strip_assemble
	betterment_labour_percentage?: number | null; // Percentage deduction on labour_cost
	betterment_paint_percentage?: number | null; // Percentage deduction on paint_cost
	betterment_outwork_percentage?: number | null; // Percentage deduction on outwork_charge_nett
	betterment_total?: number | null; // Total betterment amount deducted (calculated)
}

// Assessment result type
export type AssessmentResultType = 'repair' | 'code_2' | 'code_3' | 'total_loss';

// Assessment result display info
export interface AssessmentResultInfo {
	value: AssessmentResultType;
	label: string;
	description: string;
	color: 'green' | 'yellow' | 'orange' | 'red';
	icon: 'check' | 'alert' | 'x' | 'ban';
}

// Estimate interface with rates
export interface Estimate {
	id: string;
	assessment_id: string;
	repairer_id?: string | null;
	labour_rate: number; // Cost per hour (e.g., 500)
	paint_rate: number; // Cost per panel (e.g., 2000)
	oem_markup_percentage: number; // Markup % for OEM parts (default 25%)
	alt_markup_percentage: number; // Markup % for Aftermarket parts (default 25%)
	second_hand_markup_percentage: number; // Markup % for Second Hand parts (default 25%)
	outwork_markup_percentage: number; // Markup % for outwork charges (default 25%)
	line_items: EstimateLineItem[];
	subtotal: number;
	sundries_percentage?: number;
	sundries_amount?: number;
	vat_percentage: number;
	vat_amount: number;
	total: number;
	assessment_result?: AssessmentResultType | null; // Final assessment outcome
	notes?: string | null;
	currency: string;
	created_at: string;
	updated_at: string;
}

export interface CreateEstimateInput {
	assessment_id: string;
	repairer_id?: string | null;
	labour_rate?: number;
	paint_rate?: number;
	oem_markup_percentage?: number;
	alt_markup_percentage?: number;
	second_hand_markup_percentage?: number;
	line_items?: EstimateLineItem[];
	assessment_result?: AssessmentResultType | null;
	notes?: string;
	vat_percentage?: number;
	sundries_percentage?: number;
	currency?: string;
}

export interface UpdateEstimateInput extends Partial<Omit<CreateEstimateInput, 'assessment_id'>> {
	subtotal?: number;
	sundries_amount?: number;
	vat_amount?: number;
	total?: number;
	repairer_id?: string | null;
	assessment_result?: AssessmentResultType | null;
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

// Pre-Incident Estimate interface (same structure as Estimate but for pre-existing damage)
export interface PreIncidentEstimate {
	id: string;
	assessment_id: string;
	labour_rate: number; // Cost per hour (e.g., 500)
	paint_rate: number; // Cost per panel (e.g., 2000)
	oem_markup_percentage: number; // Markup % for OEM parts (default 25%)
	alt_markup_percentage: number; // Markup % for Aftermarket parts (default 25%)
	second_hand_markup_percentage: number; // Markup % for Second Hand parts (default 25%)
	outwork_markup_percentage: number; // Markup % for outwork charges (default 25%)
	line_items: EstimateLineItem[]; // Reuse same line item type
	subtotal: number;
	vat_percentage: number;
	vat_amount: number;
	total: number;
	notes?: string | null;
	currency: string;
	created_at: string;
	updated_at: string;
}

export interface CreatePreIncidentEstimateInput {
	assessment_id: string;
	labour_rate?: number;
	paint_rate?: number;
	oem_markup_percentage?: number;
	alt_markup_percentage?: number;
	second_hand_markup_percentage?: number;
	outwork_markup_percentage?: number;
	line_items?: EstimateLineItem[];
	notes?: string;
	vat_percentage?: number;
	currency?: string;
}

export interface UpdatePreIncidentEstimateInput
	extends Partial<Omit<CreatePreIncidentEstimateInput, 'assessment_id'>> {
	subtotal?: number;
	vat_amount?: number;
	total?: number;
}

// Pre-Incident Estimate Photo interfaces
export interface PreIncidentEstimatePhoto {
	id: string;
	estimate_id: string;
	photo_url: string;
	photo_path: string;
	label?: string | null;
	display_order: number;
	created_at: string;
	updated_at: string;
}

export interface CreatePreIncidentEstimatePhotoInput {
	estimate_id: string;
	photo_url: string;
	photo_path: string;
	label?: string;
	display_order?: number;
}

export interface UpdatePreIncidentEstimatePhotoInput {
	label?: string;
	display_order?: number;
}

// Vehicle Values interfaces
export interface VehicleValueExtra {
	id: string;
	description: string;
	trade_value: number;
	market_value: number;
	retail_value: number;
}

export type WarrantyStatus = 'active' | 'expired' | 'void' | 'transferred' | 'unknown';
export type ServiceHistoryStatus =
	| 'checked'
	| 'not_checked'
	| 'incomplete'
	| 'up_to_date'
	| 'overdue'
	| 'unknown';

export interface VehicleValues {
	id: string;
	assessment_id: string;

	// Source information
	sourced_from?: string | null;
	sourced_code?: string | null;
	sourced_date?: string | null;

	// Warranty / Service Details
	warranty_status?: WarrantyStatus | null;
	warranty_period_years?: number | null;
	warranty_start_date?: string | null;
	warranty_end_date?: string | null;
	warranty_expiry_mileage?: string | null;
	service_history_status?: ServiceHistoryStatus | null;
	warranty_notes?: string | null;

	// Base values
	trade_value?: number | null;
	market_value?: number | null;
	retail_value?: number | null;

	// Optional fields
	new_list_price?: number | null;
	depreciation_percentage?: number | null;

	// Adjustments
	valuation_adjustment?: number | null;
	valuation_adjustment_percentage?: number | null;
	condition_adjustment_value?: number | null; // User enters value, system calculates %

	// Adjusted values (calculated)
	trade_adjusted_value?: number | null;
	market_adjusted_value?: number | null;
	retail_adjusted_value?: number | null;

	// Extras
	extras?: VehicleValueExtra[] | null;
	trade_extras_total?: number | null;
	market_extras_total?: number | null;
	retail_extras_total?: number | null;

	// Total adjusted values (calculated)
	trade_total_adjusted_value?: number | null;
	market_total_adjusted_value?: number | null;
	retail_total_adjusted_value?: number | null;

	// Write-off calculations (calculated)
	borderline_writeoff_trade?: number | null;
	borderline_writeoff_market?: number | null;
	borderline_writeoff_retail?: number | null;

	total_writeoff_trade?: number | null;
	total_writeoff_market?: number | null;
	total_writeoff_retail?: number | null;

	salvage_trade?: number | null;
	salvage_market?: number | null;
	salvage_retail?: number | null;

	// Documents
	valuation_pdf_url?: string | null;
	valuation_pdf_path?: string | null;

	// Notes
	remarks?: string | null;

	created_at: string;
	updated_at: string;
}

export interface CreateVehicleValuesInput {
	assessment_id: string;
	sourced_from?: string;
	sourced_code?: string;
	sourced_date?: string;
	trade_value?: number;
	market_value?: number;
	retail_value?: number;
	new_list_price?: number;
	depreciation_percentage?: number;
	valuation_adjustment?: number;
	valuation_adjustment_percentage?: number;
	condition_adjustment_percentage?: number;
	extras?: VehicleValueExtra[];
	valuation_pdf_url?: string;
	valuation_pdf_path?: string;
	remarks?: string;
}

export interface UpdateVehicleValuesInput extends Partial<CreateVehicleValuesInput> {}

// Company settings for document headers
export interface CompanySettings {
	id: string;
	company_name: string;
	po_box: string;
	city: string;
	province: string;
	postal_code: string;
	phone: string;
	fax: string;
	email: string;
	website: string;
	logo_url?: string | null;
	// Terms and Conditions fields for each document type
		assessment_terms_and_conditions?: string | null;
		estimate_terms_and_conditions?: string | null;
		frc_terms_and_conditions?: string | null;
		additionals_terms_and_conditions?: string | null;
		sundries_percentage?: number;
		created_at: string;
		updated_at: string;
}

// Document generation status
export interface DocumentGenerationStatus {
		report_generated: boolean;
		estimate_generated: boolean;
		photos_pdf_generated: boolean;
		photos_zip_generated: boolean;
		frc_report_generated?: boolean;
		additionals_letter_generated?: boolean;
		all_generated: boolean;
		generated_at?: string | null;
}

// Document types
export type DocumentType =
	| 'report'
	| 'estimate'
	| 'photos_pdf'
	| 'photos_zip'
	| 'frc_report'
	| 'additionals_letter'
	| 'complete';

// Input types for company settings
export interface UpdateCompanySettingsInput {
	company_name?: string;
	po_box?: string;
	city?: string;
	province?: string;
	postal_code?: string;
	phone?: string;
	fax?: string;
	email?: string;
	website?: string;
	logo_url?: string;
		// Terms and Conditions fields
		assessment_terms_and_conditions?: string | null;
		estimate_terms_and_conditions?: string | null;
		frc_terms_and_conditions?: string | null;
		additionals_terms_and_conditions?: string | null;
		sundries_percentage?: number;
}

// Additional line item status
export type AdditionalLineItemStatus = 'pending' | 'approved' | 'declined';

// Additional line item action types
export type AdditionalLineItemAction = 'added' | 'removed' | 'reversal';

// Additional line item (extends EstimateLineItem with approval workflow)
export interface AdditionalLineItem extends EstimateLineItem {
	status: AdditionalLineItemStatus;
	action?: AdditionalLineItemAction; // 'added' for new items, 'removed' for original estimate lines removed, 'reversal' for reversing previous actions
	original_line_id?: string | null; // ID of the original estimate line if this is a removal
	reverses_line_id?: string | null; // ID of the line item being reversed (for action='reversal')
	reversal_reason?: string | null; // Reason for reversal (for action='reversal')
	decline_reason?: string | null;
	approved_at?: string | null;
	declined_at?: string | null;
	approved_by?: string | null; // For future auth integration
}

// Assessment additionals interface
export interface AssessmentAdditionals {
	id: string;
	assessment_id: string;
	repairer_id?: string | null;
	labour_rate: number;
	paint_rate: number;
	vat_percentage: number;
	oem_markup_percentage: number;
	alt_markup_percentage: number;
	second_hand_markup_percentage: number;
	outwork_markup_percentage: number;
	line_items: AdditionalLineItem[];
	excluded_line_item_ids?: string[]; // DEPRECATED: Use action='removed' line items instead. Kept for backward compatibility.
	subtotal_approved: number;
	vat_amount_approved: number;
	total_approved: number;
	created_at: string;
	updated_at: string;
}

// Input types for additionals
export interface CreateAssessmentAdditionalsInput {
	assessment_id: string;
	repairer_id?: string | null;
	labour_rate: number;
	paint_rate: number;
	vat_percentage: number;
	oem_markup_percentage: number;
	alt_markup_percentage: number;
	second_hand_markup_percentage: number;
	outwork_markup_percentage: number;
}

// Additionals Photo interfaces
export interface AdditionalsPhoto {
	id: string;
	additionals_id: string;
	photo_url: string;
	photo_path: string;
	label?: string | null;
	display_order: number;
	created_at: string;
	updated_at: string;
}

export interface CreateAdditionalsPhotoInput {
	additionals_id: string;
	photo_url: string;
	photo_path: string;
	label?: string | null;
	display_order?: number;
}

export interface UpdateAdditionalsPhotoInput {
	label?: string | null;
	display_order?: number;
}

// Interior Photo interfaces
export interface InteriorPhoto {
	id: string;
	assessment_id: string;
	photo_url: string;
	photo_path: string;
	label?: string | null;
	display_order: number;
	created_at: string;
	updated_at: string;
}

export interface CreateInteriorPhotoInput {
	assessment_id: string;
	photo_url: string;
	photo_path: string;
	label?: string | null;
	display_order?: number;
}

export interface UpdateInteriorPhotoInput {
	label?: string | null;
	display_order?: number;
}

// Exterior 360 Photo interfaces (additional photos beyond required 8-position 360° photos)
export interface Exterior360Photo {
	id: string;
	assessment_id: string;
	photo_url: string;
	photo_path: string;
	label?: string | null;
	display_order: number;
	created_at: string;
	updated_at: string;
}

export interface CreateExterior360PhotoInput {
	assessment_id: string;
	photo_url: string;
	photo_path: string;
	label?: string | null;
	display_order?: number;
}

export interface UpdateExterior360PhotoInput {
	label?: string | null;
	display_order?: number;
}

// Damage Photo interfaces (photos of vehicle damage)
export interface DamagePhoto {
	id: string;
	assessment_id: string;
	photo_url: string;
	photo_path: string;
	label?: string | null;
	panel?: string | null; // Which panel this damage photo shows
	display_order: number;
	created_at: string;
	updated_at: string;
}

export interface CreateDamagePhotoInput {
	assessment_id: string;
	photo_url: string;
	photo_path: string;
	label?: string | null;
	panel?: string | null;
	display_order?: number;
}

export interface UpdateDamagePhotoInput {
	label?: string | null;
	panel?: string | null;
	display_order?: number;
}

// Final Repair Costing (FRC) types
export type FRCStatus = 'not_started' | 'in_progress' | 'completed';
export type FRCDecision = 'pending' | 'agree' | 'adjust' | 'declined';
export type FRCLineSource = 'estimate' | 'additional';

export interface FRCLineItem {
	id: string;
	source: FRCLineSource;
	source_line_id: string;
	process_type: ProcessType;
	description: string;
	quoted_total: number;
	actual_total: number | null;
	decision: FRCDecision;
	adjust_reason?: string | null; // Required when decision = 'adjust'

	// Metadata for removed/declined lines from additionals workflow
	removed_via_additionals?: boolean; // Line was removed from estimate via additionals
	declined_via_additionals?: boolean; // Line was declined via additionals
	decline_reason?: string; // Reason for decline (if applicable)

	// Quoted component breakdown (snapshot from estimate/additional)
	quoted_part_price_nett?: number | null; // Nett part price without markup
	quoted_part_price?: number | null; // Selling price with markup
	quoted_strip_assemble?: number | null; // S&A cost
	quoted_labour_cost?: number | null; // Labour cost
	quoted_paint_cost?: number | null; // Paint cost
	quoted_outwork_charge_nett?: number | null; // Nett outwork cost without markup
	quoted_outwork_charge?: number | null; // Outwork selling price with markup

	// Quantities and rates snapshot (for traceability)
	part_type?: PartType | null; // OEM/ALT/2ND
	strip_assemble_hours?: number | null; // S&A hours
	labour_hours?: number | null; // Labour hours
	paint_panels?: number | null; // Paint panels
	labour_rate_snapshot?: number; // Labour rate at time of FRC creation
	paint_rate_snapshot?: number; // Paint rate at time of FRC creation

	// Actual component breakdown (from invoice)
	actual_part_price_nett?: number | null; // Actual nett part price from invoice
	actual_strip_assemble?: number | null; // Actual S&A cost
	actual_strip_assemble_hours?: number | null; // Actual S&A hours
	actual_labour_cost?: number | null; // Actual labour cost
	actual_labour_hours?: number | null; // Actual labour hours
	actual_paint_cost?: number | null; // Actual paint cost
	actual_paint_panels?: number | null; // Actual paint panels
    actual_outwork_charge?: number | null; // Actual outwork charge
    linked_document_id?: string | null;
    matched?: boolean | null;
    is_removal_additional?: boolean;
    removal_for_source_line_id?: string | null;
}

export interface FinalRepairCosting {
	id: string;
	assessment_id: string;
	status: FRCStatus;
	line_items: FRCLineItem[];
	line_items_version?: number; // Optimistic locking version counter
	last_merge_at?: string | null; // Timestamp of last additionals merge
	needs_sync?: boolean; // Flag indicating if merge needed
	vat_percentage: number;
	// Quoted estimate breakdown (original estimate only)
	quoted_estimate_parts_nett: number;
	quoted_estimate_labour: number;
	quoted_estimate_paint: number;
	quoted_estimate_outwork_nett: number;
	quoted_estimate_markup: number;
	quoted_estimate_subtotal: number;
	// Quoted additionals breakdown (approved additionals only)
	quoted_additionals_parts_nett: number;
	quoted_additionals_labour: number;
	quoted_additionals_paint: number;
	quoted_additionals_outwork_nett: number;
	quoted_additionals_markup: number;
	quoted_additionals_subtotal: number;
	// Quoted combined breakdown (for backward compatibility)
	quoted_parts_total: number;
	quoted_labour_total: number;
	quoted_paint_total: number;
	quoted_outwork_total: number;
	quoted_subtotal: number;
	quoted_vat_amount: number;
	quoted_total: number;
	// Actual estimate breakdown (original estimate only)
	actual_estimate_parts_nett: number;
	actual_estimate_labour: number;
	actual_estimate_paint: number;
	actual_estimate_outwork_nett: number;
	actual_estimate_markup: number;
	actual_estimate_subtotal: number;
	// Actual additionals breakdown (approved additionals only)
	actual_additionals_parts_nett: number;
	actual_additionals_labour: number;
	actual_additionals_paint: number;
	actual_additionals_outwork_nett: number;
	actual_additionals_markup: number;
	actual_additionals_subtotal: number;
	// Actual combined breakdown (for backward compatibility)
	actual_parts_total: number;
	actual_labour_total: number;
	actual_paint_total: number;
	actual_outwork_total: number;
	actual_subtotal: number;
	actual_vat_amount: number;
	actual_total: number;
	// Timestamps
	started_at?: string | null;
	completed_at?: string | null;
	created_at: string;
	updated_at: string;
	// Sign-off details
	signed_off_by_name?: string | null;
	signed_off_by_email?: string | null;
	signed_off_by_role?: string | null;
	signed_off_at?: string | null;
	sign_off_notes?: string | null;
	// Generated report URL
	frc_report_url?: string | null;
}

export interface FRCDocument {
	id: string;
	frc_id: string;
	document_url: string;
	document_path: string;
	label?: string | null;
	document_type: 'invoice' | 'attachment';
	file_size_bytes?: number | null;
	created_at: string;
	updated_at: string;
}

export interface CreateFRCDocumentInput {
	frc_id: string;
	document_url: string;
	document_path: string;
	label?: string | null;
	document_type?: 'invoice' | 'attachment';
	file_size_bytes?: number | null;
}
