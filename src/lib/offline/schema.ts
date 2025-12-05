/**
 * Offline Data Schema Types
 * Defines the structure of data stored in IndexedDB for offline support
 */

// Vehicle Identification Data
export interface VehicleIdData {
	registration_number?: string;
	vin_number?: string;
	engine_number?: string;
	make?: string;
	model?: string;
	year?: number;
	color?: string;
	license_disc_expiry?: string;
}

// Exterior 360 Data
export interface Exterior360Data {
	overall_condition?: string;
	vehicle_color?: string;
	photos?: string[]; // Photo IDs
}

// Damage Data
export interface DamageData {
	matches_description?: boolean;
	mismatch_notes?: string;
	damage_area?: string;
	damage_type?: string;
	severity?: string;
	damage_description?: string;
	estimated_repair_duration_days?: number;
	location_description?: string;
	affected_panels?: string[];
	photos?: string[];
}

// Tyres Data
export interface TyresData {
	front_left?: TyreCondition;
	front_right?: TyreCondition;
	rear_left?: TyreCondition;
	rear_right?: TyreCondition;
	spare?: TyreCondition;
}

export interface TyreCondition {
	condition?: string;
	tread_depth?: number;
	brand?: string;
	size?: string;
	photos?: string[];
}

// Mileage Data
export interface MileageData {
	odometer_reading?: number;
	photo_id?: string;
}

// Notes Data
export interface NotesData {
	general_notes?: string;
	internal_notes?: string;
}

// Estimate Data
export interface EstimateData {
	line_items?: EstimateLineItem[];
	total?: number;
	labour_rate?: number;
	vat_rate?: number;
}

export interface EstimateLineItem {
	id?: string;
	description: string;
	quantity: number;
	unit_price: number;
	total: number;
	category?: string;
}

// Interior Data
export interface InteriorData {
	overall_condition?: string;
	seats_condition?: string;
	dashboard_condition?: string;
	carpets_condition?: string;
	headliner_condition?: string;
	notes?: string;
	photos?: string[];
}

// Windows Data
export interface WindowsData {
	windscreen?: WindowCondition;
	rear_window?: WindowCondition;
	front_left?: WindowCondition;
	front_right?: WindowCondition;
	rear_left?: WindowCondition;
	rear_right?: WindowCondition;
}

export interface WindowCondition {
	condition?: string;
	damage_type?: string;
	notes?: string;
	photos?: string[];
}

// Accessories Data
export interface AccessoriesData {
	spare_wheel?: boolean;
	jack?: boolean;
	wheel_spanner?: boolean;
	triangle?: boolean;
	first_aid_kit?: boolean;
	fire_extinguisher?: boolean;
	radio?: boolean;
	speakers?: number;
	mats?: boolean;
	tools?: boolean;
	other?: string[];
}

// Combined Assessment Data
export interface AssessmentTabData {
	vehicle_id?: VehicleIdData;
	exterior_360?: Exterior360Data;
	damage?: DamageData;
	tyres?: TyresData;
	mileage?: MileageData;
	notes?: NotesData;
	estimate?: EstimateData;
	interior?: InteriorData;
	windows?: WindowsData;
	accessories?: AccessoriesData;
}

// Offline Assessment Status
export type OfflineAssessmentStatus = 'cached' | 'modified' | 'pending_sync' | 'synced';

// Offline Photo Status
export type OfflinePhotoStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

// Sync Queue Item Status
export type SyncQueueStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

// Sync Queue Item Type
export type SyncQueueType = 'assessment' | 'photo';

// Sync Queue Action
export type SyncQueueAction = 'create' | 'update' | 'delete';
