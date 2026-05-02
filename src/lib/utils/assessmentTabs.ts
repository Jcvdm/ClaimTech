import type { ComponentType } from 'svelte';
import type { Assessment } from '$lib/types/assessment';
import {
	ClipboardList,
	FileText,
	Camera,
	Car,
	Gauge,
	AlertTriangle,
	DollarSign,
	FileCheck,
	Plus,
	History
} from 'lucide-svelte';

export type AssessmentTabId =
	| 'summary'
	| 'identification'
	| '360'
	| 'interior'
	| 'tyres'
	| 'damage'
	| 'values'
	| 'pre-incident'
	| 'estimate'
	| 'finalize'
	| 'additionals'
	| 'frc'
	| 'audit';

export interface AssessmentTab {
	id: AssessmentTabId;
	label: string;
	shortLabel?: string;
	icon: ComponentType;
}

export const BASE_ASSESSMENT_TABS: readonly AssessmentTab[] = [
	{ id: 'summary', label: 'Summary', icon: ClipboardList },
	{ id: 'identification', label: 'Vehicle ID', icon: FileText },
	{ id: '360', label: '360° Exterior', icon: Camera },
	{ id: 'interior', label: 'Interior & Mechanical', icon: Car },
	{ id: 'tyres', label: 'Tyres', icon: Gauge },
	{ id: 'damage', label: 'Damage ID', icon: AlertTriangle },
	{ id: 'values', label: 'Values', icon: DollarSign },
	{ id: 'pre-incident', label: 'Pre-Incident', icon: DollarSign },
	{ id: 'estimate', label: 'Estimate', icon: DollarSign },
	{ id: 'finalize', label: 'Finalize', icon: FileCheck }
];

export function buildAssessmentTabs(opts: {
	assessment: Pick<Assessment, 'estimate_finalized_at' | 'status'>;
	userRole?: string;
}): AssessmentTab[] {
	const { assessment, userRole } = opts;
	const result = [...BASE_ASSESSMENT_TABS];

	// Add Additionals tab if estimate is finalized
	if (assessment?.estimate_finalized_at) {
		result.push({ id: 'additionals', label: 'Additionals', icon: Plus });
	}

	// Add FRC tab if assessment is submitted or archived (FRC in progress or completed)
	// Keep tab visible for archived assessments so completed FRCs can be viewed and reopened
	if (assessment?.status === 'submitted' || assessment?.status === 'archived') {
		result.push({ id: 'frc', label: 'FRC', icon: FileCheck });
	}

	// Add audit tab for admin users only
	if (userRole === 'admin') {
		result.push({ id: 'audit', label: 'Audit Trail', icon: History });
	}

	return result;
}
