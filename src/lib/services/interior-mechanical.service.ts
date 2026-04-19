import { createAssessmentSubtableService } from './assessment-subtable-factory';
import type {
	InteriorMechanical,
	CreateInteriorMechanicalInput,
	UpdateInteriorMechanicalInput
} from '$lib/types/assessment';

export const interiorMechanicalService = createAssessmentSubtableService<
	'assessment_interior_mechanical',
	CreateInteriorMechanicalInput,
	UpdateInteriorMechanicalInput,
	InteriorMechanical
>({
	table: 'assessment_interior_mechanical',
	entityType: 'interior_mechanical',
	label: 'interior/mechanical'
});

export type {
	InteriorMechanical,
	CreateInteriorMechanicalInput,
	UpdateInteriorMechanicalInput
} from '$lib/types/assessment';
