import { createAssessmentSubtableService } from './assessment-subtable-factory';
import type {
	Exterior360,
	CreateExterior360Input,
	UpdateExterior360Input
} from '$lib/types/assessment';

export const exterior360Service = createAssessmentSubtableService<
	'assessment_360_exterior',
	CreateExterior360Input,
	UpdateExterior360Input,
	Exterior360
>({
	table: 'assessment_360_exterior',
	entityType: 'exterior_360',
	label: '360 exterior'
});

export type {
	Exterior360,
	CreateExterior360Input,
	UpdateExterior360Input
} from '$lib/types/assessment';
