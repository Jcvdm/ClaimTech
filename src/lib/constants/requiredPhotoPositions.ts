export interface RequiredPhotoPosition {
	id: string;
	label: string;
	/** Subcategory string used as a substring in storage path for matching photos to positions until DB column is added (Phase 4b) */
	subcategory: string;
}

export const ENGINE_BAY_POSITIONS: RequiredPhotoPosition[] = [
	{ id: 'engine-bay',  label: 'Engine Bay',  subcategory: 'engine_bay' },
	{ id: 'battery',     label: 'Battery',     subcategory: 'battery' },
	{ id: 'oil-level',   label: 'Oil Level',   subcategory: 'oil_level' },
	{ id: 'coolant',     label: 'Coolant',     subcategory: 'coolant' },
	{ id: 'brake-fluid', label: 'Brake Fluid', subcategory: 'brake_fluid' },
	{ id: 'belts',       label: 'Belts',       subcategory: 'belts' }
];
