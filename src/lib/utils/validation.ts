// Validation utilities for assessment forms

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

export interface TabValidation {
	tabId: string;
	isComplete: boolean;
	missingFields: string[];
}

/**
 * Validate Vehicle Identification tab
 */
export function validateVehicleIdentification(data: any): TabValidation {
	const missingFields: string[] = [];

	if (!data?.registration_number) missingFields.push('Registration Number');
	if (!data?.vin_number) missingFields.push('VIN Number');
	if (!data?.engine_number) missingFields.push('Engine Number');
	if (!data?.registration_photo_url) missingFields.push('Registration Photo');
	if (!data?.vin_photo_url) missingFields.push('VIN Photo');

	return {
		tabId: 'identification',
		isComplete: missingFields.length === 0,
		missingFields
	};
}

/**
 * Validate 360 Exterior tab
 */
export function validateExterior360(data: any): TabValidation {
	const missingFields: string[] = [];

	if (!data?.overall_condition) missingFields.push('Overall Condition');
	if (!data?.vehicle_color) missingFields.push('Vehicle Color');
	
	// Check for at least 4 photos (front, rear, left, right)
	const requiredPhotos = ['front_photo_url', 'rear_photo_url', 'left_photo_url', 'right_photo_url'];
	const missingPhotos = requiredPhotos.filter(photo => !data?.[photo]);
	
	if (missingPhotos.length > 0) {
		missingFields.push(`${missingPhotos.length} required photos`);
	}

	return {
		tabId: '360',
		isComplete: missingFields.length === 0,
		missingFields
	};
}

/**
 * Validate Interior & Mechanical tab
 */
export function validateInteriorMechanical(data: any): TabValidation {
	const missingFields: string[] = [];

	if (!data?.mileage_reading) missingFields.push('Mileage Reading');
	if (!data?.interior_condition) missingFields.push('Interior Condition');
	if (!data?.srs_system) missingFields.push('SRS System Status');
	if (!data?.steering) missingFields.push('Steering Status');
	if (!data?.brakes) missingFields.push('Brakes Status');
	if (!data?.handbrake) missingFields.push('Handbrake Status');

	return {
		tabId: 'interior',
		isComplete: missingFields.length === 0,
		missingFields
	};
}

/**
 * Validate Tyres tab
 */
export function validateTyres(tyres: any[]): TabValidation {
	const missingFields: string[] = [];

	if (!tyres || tyres.length === 0) {
		missingFields.push('No tyres added');
		return {
			tabId: 'tyres',
			isComplete: false,
			missingFields
		};
	}

	// Check each tyre has minimum required fields
	tyres.forEach((tyre, index) => {
		const tyreLabel = tyre.position_label || `Tyre ${index + 1}`;
		
		if (!tyre.condition) missingFields.push(`${tyreLabel}: Condition`);
		if (!tyre.tread_depth_mm) missingFields.push(`${tyreLabel}: Tread Depth`);
	});

	return {
		tabId: 'tyres',
		isComplete: missingFields.length === 0,
		missingFields
	};
}

/**
 * Validate Damage tab
 */
export function validateDamage(damageRecords: any[]): TabValidation {
	const missingFields: string[] = [];

	// Check if matches_description is set
	if (damageRecords.length > 0) {
		const firstRecord = damageRecords[0];
		if (firstRecord.matches_description === null || firstRecord.matches_description === undefined) {
			missingFields.push('Damage matches description (Yes/No)');
		}
	}

	// Check each damage record has required fields
	damageRecords.forEach((record, index) => {
		if (!record.damage_area) missingFields.push(`Damage ${index + 1}: Area`);
		if (!record.damage_type) missingFields.push(`Damage ${index + 1}: Type`);
		if (!record.severity) missingFields.push(`Damage ${index + 1}: Severity`);
	});

	return {
		tabId: 'damage',
		isComplete: missingFields.length === 0,
		missingFields
	};
}

/**
 * Validate entire assessment
 */
export function validateAssessment(assessmentData: {
	vehicleIdentification: any;
	exterior360: any;
	interiorMechanical: any;
	tyres: any[];
	damageRecords: any[];
}): ValidationResult {
	const validations = [
		validateVehicleIdentification(assessmentData.vehicleIdentification),
		validateExterior360(assessmentData.exterior360),
		validateInteriorMechanical(assessmentData.interiorMechanical),
		validateTyres(assessmentData.tyres),
		validateDamage(assessmentData.damageRecords)
	];

	const allErrors = validations.flatMap(v => 
		v.missingFields.map(field => `${v.tabId}: ${field}`)
	);

	return {
		isValid: allErrors.length === 0,
		errors: allErrors
	};
}

/**
 * Validate Estimate tab
 */
export function validateEstimate(data: any): TabValidation {
	const missingFields: string[] = [];

	if (!data) {
		missingFields.push('Estimate data');
		return {
			tabId: 'estimate',
			isComplete: false,
			missingFields
		};
	}

	// Must have rates configured
	if (!data.labour_rate || data.labour_rate <= 0) {
		missingFields.push('Labour rate must be set');
	}
	if (!data.paint_rate || data.paint_rate <= 0) {
		missingFields.push('Paint rate must be set');
	}

	// Must have at least one line item
	if (!data.line_items || data.line_items.length === 0) {
		missingFields.push('At least one line item');
	}

	// NOTE: All line item fields are now optional to allow users to add empty lines
	// and fill values later. No field-level validation is performed.

	// Only validate that we have line items, not their content
	// This gives users freedom to add placeholder lines and complete them incrementally

	return {
		tabId: 'estimate',
		isComplete: missingFields.length === 0,
		missingFields
	};
}

/**
 * Validate Pre-Incident Estimate tab
 */
export function validatePreIncidentEstimate(data: any): TabValidation {
	const missingFields: string[] = [];

	if (!data) {
		missingFields.push('Pre-incident estimate data');
		return {
			tabId: 'pre-incident',
			isComplete: false,
			missingFields
		};
	}

	// Must have rates configured
	if (!data.labour_rate || data.labour_rate <= 0) {
		missingFields.push('Labour rate must be set');
	}

	if (!data.paint_rate || data.paint_rate <= 0) {
		missingFields.push('Paint rate must be set');
	}

	// Must have at least one line item
	if (!data.line_items || data.line_items.length === 0) {
		missingFields.push('At least one line item required');
	}

	// Total must be greater than 0
	if (!data.total || data.total <= 0) {
		missingFields.push('Total must be greater than 0');
	}

	return {
		tabId: 'pre-incident',
		isComplete: missingFields.length === 0,
		missingFields
	};
}

/**
 * Validate vehicle values tab
 */
export function validateVehicleValues(vehicleValues: any): TabValidation {
	if (!vehicleValues) {
		return {
			tabId: 'values',
			isComplete: false,
			errors: ['Vehicle values data not found']
		};
	}

	const errors: string[] = [];

	// Required: At least one value type must be entered
	if (!vehicleValues.trade_value && !vehicleValues.market_value && !vehicleValues.retail_value) {
		errors.push('At least one vehicle value (Trade, Market, or Retail) is required');
	}

	// Required: Valuation source
	if (!vehicleValues.sourced_from) {
		errors.push('Valuation source is required');
	}

	// Required: Sourced date
	if (!vehicleValues.sourced_date) {
		errors.push('Sourced date is required');
	}

	// Required: PDF proof
	if (!vehicleValues.valuation_pdf_url) {
		errors.push('Valuation report PDF is required');
	}

	return {
		tabId: 'values',
		isComplete: errors.length === 0,
		errors
	};
}

/**
 * Get completion status for all tabs
 */
export function getTabCompletionStatus(assessmentData: {
	vehicleIdentification: any;
	exterior360: any;
	interiorMechanical: any;
	tyres: any[];
	damageRecord: any;
	vehicleValues: any;
	preIncidentEstimate: any;
	estimate: any;
}): TabValidation[] {
	return [
		validateVehicleIdentification(assessmentData.vehicleIdentification),
		validateExterior360(assessmentData.exterior360),
		validateInteriorMechanical(assessmentData.interiorMechanical),
		validateTyres(assessmentData.tyres),
		validateDamage(assessmentData.damageRecord ? [assessmentData.damageRecord] : []),
		validateVehicleValues(assessmentData.vehicleValues),
		validatePreIncidentEstimate(assessmentData.preIncidentEstimate),
		validateEstimate(assessmentData.estimate)
	];
}

