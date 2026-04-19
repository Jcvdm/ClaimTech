import { createAssessmentSubtableService } from './assessment-subtable-factory';
import type {
	VehicleIdentification,
	CreateVehicleIdentificationInput,
	UpdateVehicleIdentificationInput
} from '$lib/types/assessment';

export const vehicleIdentificationService = createAssessmentSubtableService<
	'assessment_vehicle_identification',
	CreateVehicleIdentificationInput,
	UpdateVehicleIdentificationInput,
	VehicleIdentification
>({
	table: 'assessment_vehicle_identification',
	entityType: 'vehicle_identification',
	label: 'vehicle identification'
});

export type {
	VehicleIdentification,
	CreateVehicleIdentificationInput,
	UpdateVehicleIdentificationInput
} from '$lib/types/assessment';
