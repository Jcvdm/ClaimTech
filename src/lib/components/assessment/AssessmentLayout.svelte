<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Save,
		X,
		FileText,
		Camera,
		Car,
		Gauge,
		AlertTriangle,
		DollarSign,
		ClipboardList,
		FileCheck,
		Plus,
		Trash2,
		History
	} from 'lucide-svelte';
	import type { Assessment } from '$lib/types/assessment';
	import {
		validateVehicleIdentification,
		validateExterior360,
		validateInteriorMechanical,
		validateTyres,
		validateDamage,
		validateVehicleValues,
		validatePreIncidentEstimate,
		validateEstimate,
		type TabValidation
	} from '$lib/utils/validation';

	interface Tab {
		id: string;
		label: string;
		icon: any;
	}

	interface Props {
		assessment: Assessment;
		currentTab: string;
		onTabChange: (tabId: string) => void;
		onSave: () => void;
		onExit: () => void;
		onCancel?: () => void;
		saving?: boolean;
		lastSaved?: string | null;
		userRole?: string;
		// Assessment data for validation
		vehicleIdentification?: any;
		exterior360?: any;
		interiorMechanical?: any;
		tyres?: any[];
		damageRecord?: any;
		vehicleValues?: any;
		preIncidentEstimate?: any;
		estimate?: any;
	}

	let {
		assessment,
		currentTab = $bindable(),
		onTabChange,
		onSave,
		onExit,
		onCancel = undefined,
		saving = false,
		lastSaved = null,
		userRole = 'engineer',
		vehicleIdentification = null,
		exterior360 = null,
		interiorMechanical = null,
		tyres = [],
		damageRecord = null,
		vehicleValues = null,
		preIncidentEstimate = null,
		estimate = null
	}: Props = $props();

	// Build tabs array dynamically based on finalization status
	const tabs = $derived(() => {
		const baseTabs: Tab[] = [
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

		// Add Additionals tab if estimate is finalized
		if (assessment?.estimate_finalized_at) {
			baseTabs.push({ id: 'additionals', label: 'Additionals', icon: Plus });
		}

		// Add FRC tab if assessment is submitted or archived (FRC in progress or completed)
		// Keep tab visible for archived assessments so completed FRCs can be viewed and reopened
		if (assessment?.status === 'submitted' || assessment?.status === 'archived') {
			baseTabs.push({ id: 'frc', label: 'FRC', icon: FileCheck });
		}

		// Add audit tab for admin users only
		if (userRole === 'admin') {
			baseTabs.push({ id: 'audit', label: 'Audit Trail', icon: History });
		}

		return baseTabs;
	});

	// Validate tabs and get missing fields count
	const tabValidations = $derived.by(() => {
		const validations: Record<string, TabValidation> = {};

		// Only validate tabs that have data
		if (vehicleIdentification) {
			validations['identification'] = validateVehicleIdentification(vehicleIdentification);
		}
		if (exterior360) {
			validations['360'] = validateExterior360(exterior360);
		}
		if (interiorMechanical) {
			validations['interior'] = validateInteriorMechanical(interiorMechanical);
		}
		if (tyres && tyres.length > 0) {
			validations['tyres'] = validateTyres(tyres);
		}
		if (damageRecord) {
			validations['damage'] = validateDamage([damageRecord]);
		}
		if (vehicleValues) {
			validations['values'] = validateVehicleValues(vehicleValues);
		}
		if (preIncidentEstimate) {
			validations['pre-incident'] = validatePreIncidentEstimate(preIncidentEstimate);
		}
		if (estimate) {
			validations['estimate'] = validateEstimate(estimate);
		}

		return validations;
	});

	// Get missing fields count for a tab
	function getMissingFieldsCount(tabId: string): number {
		const validation = tabValidations[tabId];
		return validation?.missingFields?.length || 0;
	}

	function handleTabClick(tabId: string) {
		if (currentTab !== tabId) {
			onTabChange(tabId);
		}
	}

	function getShortLabel(label: string): string {
		const shortLabels: Record<string, string> = {
			'Summary': 'Sum',
			'Vehicle ID': 'ID',
			'360° Exterior': '360°',
			'Interior & Mechanical': 'Int',
			'Tyres': 'Tyre',
			'Damage ID': 'Dmg',
			'Values': 'Val',
			'Pre-Incident': 'Pre',
			'Estimate': 'Est',
			'Finalize': 'Fin',
			'Additionals': 'Add'
		};
		return shortLabels[label] || label;
	}
</script>

<div class="flex h-full flex-col bg-gray-50">
	<!-- Header -->
	<div class="border-b bg-white px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
		<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
			<div class="flex-1 min-w-0">
				<h1 class="text-xl sm:text-2xl font-bold text-gray-900 truncate">
					Assessment {assessment.assessment_number}
				</h1>
				<p class="mt-1 text-xs sm:text-sm text-gray-500">
					Complete the vehicle assessment by filling in all required sections
				</p>
			</div>
			<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
				{#if lastSaved}
					<span class="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
						Last saved: {new Date(lastSaved).toLocaleTimeString()}
					</span>
				{/if}
				<div class="flex gap-2">
					<Button variant="outline" onclick={onSave} disabled={saving} class="flex-1 sm:flex-none">
						<Save class="mr-2 h-4 w-4" />
						{saving ? 'Saving...' : 'Save'}
					</Button>
					{#if onCancel && ['assessment_in_progress', 'estimate_review', 'estimate_sent'].includes(assessment.stage)}
						<Button variant="destructive" onclick={onCancel} class="flex-1 sm:flex-none">
							<Trash2 class="mr-2 h-4 w-4" />
							Cancel
						</Button>
					{/if}
					<Button variant="outline" onclick={onExit} class="flex-1 sm:flex-none">
						<X class="mr-2 h-4 w-4" />
						Exit
					</Button>
				</div>
			</div>
		</div>

	</div>

	<!-- Tabs -->
	<div class="border-b bg-white px-4 sm:px-6 lg:px-8">
		<div class="flex flex-wrap gap-1">
			{#each tabs() as tab}
				{@const isActive = currentTab === tab.id}
				{@const missingCount = getMissingFieldsCount(tab.id)}
				<button
					onclick={() => handleTabClick(tab.id)}
					class="relative flex items-center gap-1 sm:gap-2 border-b-2 px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap {isActive
						? 'border-blue-600 text-blue-600'
						: 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'}"
				>
					<svelte:component this={tab.icon} class="h-3 w-3 sm:h-4 sm:w-4" />
					<span class="hidden sm:inline">{tab.label}</span>
					<span class="sm:hidden">{getShortLabel(tab.label)}</span>
					{#if missingCount > 0}
						<Badge variant="destructive" class="ml-1 h-4 min-w-4 px-1 text-[10px] font-bold">
							{missingCount}
						</Badge>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Content Area -->
	<div class="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 lg:p-6">
		<div class="mx-auto w-[98%] sm:w-[95%] md:w-[92%] lg:w-[90%] max-w-[1600px]">
			<slot />
		</div>
	</div>
</div>

