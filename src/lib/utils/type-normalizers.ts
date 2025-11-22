import type { Estimate, CompanySettings, VehicleIdentification, Assessment, AssessmentStatus } from '$lib/types/assessment';
import type { Database } from '$lib/types/database.generated';

type DatabaseEstimate = Database['public']['Tables']['assessment_estimates']['Row'];
type DatabaseCompanySettings = Database['public']['Tables']['company_settings']['Row'];
type DatabaseVehicleIdentification = Database['public']['Tables']['assessment_vehicle_identification']['Row'];
type DatabaseAssessment = Database['public']['Tables']['assessments']['Row'];

/**
 * Normalize database estimate to domain type with sensible defaults
 */
export function normalizeEstimate(dbEstimate: DatabaseEstimate | null): Estimate | null {
	if (!dbEstimate) return null;

	return {
		...dbEstimate,
		labour_rate: dbEstimate.labour_rate ?? 0,
		paint_rate: dbEstimate.paint_rate ?? 0,
		oem_markup_percentage: dbEstimate.oem_markup_percentage ?? 25,
		alt_markup_percentage: dbEstimate.alt_markup_percentage ?? 25,
		second_hand_markup_percentage: dbEstimate.second_hand_markup_percentage ?? 25,
		outwork_markup_percentage: dbEstimate.outwork_markup_percentage ?? 25,
		subtotal: dbEstimate.subtotal ?? 0,
		vat_percentage: dbEstimate.vat_percentage ?? 15,
		currency: dbEstimate.currency ?? 'ZAR',
		created_at: dbEstimate.created_at ?? new Date().toISOString(),
		updated_at: dbEstimate.updated_at ?? new Date().toISOString(),
	} as unknown as Estimate;
}

/**
 * Normalize database company settings to domain type with sensible defaults
 */
export function normalizeCompanySettings(dbSettings: DatabaseCompanySettings | null): CompanySettings | null {
	if (!dbSettings) return null;

	return {
		...dbSettings,
		po_box: dbSettings.po_box ?? '',
		city: dbSettings.city ?? '',
		province: dbSettings.province ?? '',
		postal_code: dbSettings.postal_code ?? '',
		phone: dbSettings.phone ?? '',
		fax: dbSettings.fax ?? '',
		email: dbSettings.email ?? '',
		website: dbSettings.website ?? '',
		created_at: dbSettings.created_at ?? new Date().toISOString(),
		updated_at: dbSettings.updated_at ?? new Date().toISOString(),
	} as unknown as CompanySettings;
}

/**
 * Normalize database vehicle identification to domain type
 */
export function normalizeVehicleIdentification(
	dbVehicle: DatabaseVehicleIdentification | null
): VehicleIdentification | null {
	if (!dbVehicle) return null;

	return {
		...dbVehicle,
		driver_license_number: dbVehicle.driver_license_number ?? null,
		driver_license_photo_url: dbVehicle.driver_license_photo_url ?? null,
		created_at: dbVehicle.created_at ?? new Date().toISOString(),
		updated_at: dbVehicle.updated_at ?? new Date().toISOString(),
	} as unknown as VehicleIdentification;
}

/**
 * Normalize database assessment to domain type with status coercion
 */
export function normalizeAssessment(dbAssessment: DatabaseAssessment | null): Assessment | null {
	if (!dbAssessment) return null;

	return {
		...dbAssessment,
		status: dbAssessment.status as AssessmentStatus,
	} as unknown as Assessment;
}

