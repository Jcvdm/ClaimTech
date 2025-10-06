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
 * Get completion status for all tabs
 */
export function getTabCompletionStatus(assessmentData: {
	vehicleIdentification: any;
	exterior360: any;
	interiorMechanical: any;
	tyres: any[];
	damageRecords: any[];
}): TabValidation[] {
	return [
		validateVehicleIdentification(assessmentData.vehicleIdentification),
		validateExterior360(assessmentData.exterior360),
		validateInteriorMechanical(assessmentData.interiorMechanical),
		validateTyres(assessmentData.tyres),
		validateDamage(assessmentData.damageRecords)
	];
}

