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
	// Engine number is optional (may not be visible on some vehicles)
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
export function validateExterior360(data: any, exterior360Photos: any[] = []): TabValidation {
	const missingFields: string[] = [];

	if (!data?.overall_condition) missingFields.push('Overall Condition');
	if (!data?.vehicle_color) missingFields.push('Vehicle Color');
	
	// Require at least 4 exterior photos (similar to old requirement of front, rear, left, right)
	if (exterior360Photos.length < 4) {
		missingFields.push(`At least 4 exterior photos (currently ${exterior360Photos.length})`);
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
export function validateInteriorMechanical(data: any, interiorPhotos: any[] = []): TabValidation {
	const missingFields: string[] = [];

	if (!data?.mileage_reading) missingFields.push('Mileage Reading');
	if (!data?.interior_condition) missingFields.push('Interior Condition');
	if (!data?.srs_system) missingFields.push('SRS System Status');
	if (!data?.steering) missingFields.push('Steering Status');
	if (!data?.brakes) missingFields.push('Brakes Status');
	if (!data?.handbrake) missingFields.push('Handbrake Status');
	
	// Require at least 2 interior photos
	if (interiorPhotos.length < 2) {
		missingFields.push('At least 2 interior photos');
	}

	return {
		tabId: 'interior',
		isComplete: missingFields.length === 0,
		missingFields
	};
}

/**
 * Validate Tyres tab
 * Requires at least 1 photo per tyre
 * Condition and tread depth are optional
 */
export function validateTyres(tyres: any[], tyrePhotosMap?: Map<string, any[]>): TabValidation {
	const missingFields: string[] = [];

	if (!tyres || tyres.length === 0) {
		missingFields.push('No tyres added');
		return {
			tabId: 'tyres',
			isComplete: false,
			missingFields
		};
	}

	// Check each tyre has at least 1 photo
	tyres.forEach((tyre, index) => {
		const tyreLabel = tyre.position_label || `Tyre ${index + 1}`;

		// Photo requirement check
		if (tyrePhotosMap) {
			const photos = tyrePhotosMap.get(tyre.id) || [];
			if (photos.length === 0) {
				missingFields.push(`${tyreLabel}: At least 1 photo required`);
			}
		}
	});

	return {
		tabId: 'tyres',
		isComplete: missingFields.length === 0,
		missingFields
	};
}

/**
 * Validate Damage tab
 * Requires: matches_description (Yes/No), severity
 * Note: damage_area and damage_type are NOT NULL in database, always have default values
 */
export function validateDamage(damageRecords: any[]): TabValidation {
	const missingFields: string[] = [];

	// Check if matches_description is set (user must explicitly choose Yes/No)
	if (damageRecords.length > 0) {
		const firstRecord = damageRecords[0];
		if (firstRecord.matches_description === null || firstRecord.matches_description === undefined) {
			missingFields.push('Damage matches description (Yes/No)');
		}

		// Check severity is set (explicit null/undefined/empty check, not falsy)
		if (
			firstRecord.severity === null ||
			firstRecord.severity === undefined ||
			firstRecord.severity === ''
		) {
			missingFields.push('Severity');
		}
	}

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
	interiorPhotos?: any[];
	exterior360Photos?: any[];
	tyres: any[];
	tyrePhotos?: any[];
	damageRecords: any[];
}): ValidationResult {
	// Build tyrePhotosMap from tyrePhotos array
	const tyrePhotosMap = new Map<string, any[]>();
	if (assessmentData.tyrePhotos) {
		assessmentData.tyres.forEach(tyre => {
			const photos = assessmentData.tyrePhotos?.filter(p => p.tyre_id === tyre.id) || [];
			tyrePhotosMap.set(tyre.id, photos);
		});
	}

	const validations = [
		validateVehicleIdentification(assessmentData.vehicleIdentification),
		validateExterior360(assessmentData.exterior360, assessmentData.exterior360Photos || []),
		validateInteriorMechanical(assessmentData.interiorMechanical, assessmentData.interiorPhotos || []),
		validateTyres(assessmentData.tyres, tyrePhotosMap),
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
	// Normalize to TabValidation with missingFields (interface contract)
	const missingFields: string[] = [];

	if (!vehicleValues) {
		missingFields.push('Vehicle values data not found');
		return {
			tabId: 'values',
			isComplete: false,
			missingFields
		};
	}

	// Required: At least one value type must be entered
	if (!vehicleValues.trade_value && !vehicleValues.market_value && !vehicleValues.retail_value) {
		missingFields.push('At least one vehicle value (Trade, Market, or Retail) is required');
	}

	// Required: Valuation source
	if (!vehicleValues.sourced_from) {
		missingFields.push('Valuation source is required');
	}

	// Required: Source code
	if (!vehicleValues.sourced_code) {
		missingFields.push('Source code is required');
	}

	// Required: Sourced date
	if (!vehicleValues.sourced_date) {
		missingFields.push('Sourced date is required');
	}

	// Required: Warranty status
	if (!vehicleValues.warranty_status) {
		missingFields.push('Warranty status is required');
	}

	// Required: PDF proof
	if (!vehicleValues.valuation_pdf_url) {
		missingFields.push('Valuation report PDF is required');
	}

	return {
		tabId: 'values',
		isComplete: missingFields.length === 0,
		missingFields
	};
}

/**
 * Get completion status for all tabs
 */
export function getTabCompletionStatus(assessmentData: {
	vehicleIdentification: any;
	exterior360: any;
	interiorMechanical: any;
	interiorPhotos?: any[];
	exterior360Photos?: any[];
	tyres: any[];
	tyrePhotos?: any[];
	damageRecord: any;
	vehicleValues: any;
	preIncidentEstimate: any;
	estimate: any;
}): TabValidation[] {
	// Build tyrePhotosMap from tyrePhotos array
	const tyrePhotosMap = new Map<string, any[]>();
	if (assessmentData.tyrePhotos) {
		assessmentData.tyres.forEach(tyre => {
			const photos = assessmentData.tyrePhotos?.filter(p => p.tyre_id === tyre.id) || [];
			tyrePhotosMap.set(tyre.id, photos);
		});
	}

	return [
		validateVehicleIdentification(assessmentData.vehicleIdentification),
		validateExterior360(assessmentData.exterior360, assessmentData.exterior360Photos || []),
		validateInteriorMechanical(assessmentData.interiorMechanical, assessmentData.interiorPhotos || []),
		validateTyres(assessmentData.tyres, tyrePhotosMap),
		validateDamage(assessmentData.damageRecord ? [assessmentData.damageRecord] : []),
		validateVehicleValues(assessmentData.vehicleValues),
		validatePreIncidentEstimate(assessmentData.preIncidentEstimate),
		validateEstimate(assessmentData.estimate)
	];
}

