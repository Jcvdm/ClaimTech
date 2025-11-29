<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import LoadingButton from '$lib/components/ui/button/LoadingButton.svelte';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { TabLoadingIndicator } from '$lib/components/ui/tab-loading';
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
		tabLoading?: boolean;
		userRole?: string;
		// Assessment data for validation
		vehicleIdentification?: any;
		exterior360?: any;
		interiorMechanical?: any;
		interiorPhotos?: any[];
		exterior360Photos?: any[];
		tyres?: any[];
		damageRecord?: any;
		vehicleValues?: any;
		preIncidentEstimate?: any;
		estimate?: any;
		// Callback for child tabs to report their validation state
		onValidationUpdate?: (tabId: string, validation: TabValidation) => void;
		children?: any;
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
		tabLoading = false,
		userRole = 'engineer',
		vehicleIdentification = null,
		exterior360 = null,
		interiorMechanical = null,
		interiorPhotos = [],
		exterior360Photos = [],
		tyres = [],
		damageRecord = null,
		vehicleValues = null,
		preIncidentEstimate = null,
		estimate = null,
		onValidationUpdate = undefined,
		children
	}: Props = $props();

	// Track child-reported validations (these are more current than prop-based validations)
	let childValidations = $state<Record<string, TabValidation>>({});

	// Handle validation updates from child tabs
	function handleChildValidationUpdate(tabId: string, validation: TabValidation) {
		childValidations[tabId] = validation;
		// Also forward to parent if callback provided
		if (onValidationUpdate) {
			onValidationUpdate(tabId, validation);
		}
	}

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
	// Prefer child-reported validations (from local state) over prop-based validations
	const tabValidations = $derived.by(() => {
		const validations: Record<string, TabValidation> = {};

		// Start with prop-based validations as fallback
		if (vehicleIdentification) {
			validations['identification'] = validateVehicleIdentification(vehicleIdentification);
		}
		if (exterior360) {
			validations['360'] = validateExterior360(exterior360, exterior360Photos || []);
		}
		if (interiorMechanical) {
			validations['interior'] = validateInteriorMechanical(
				interiorMechanical,
				interiorPhotos || []
			);
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

		// Override with child-reported validations (these react to local state immediately)
		for (const [tabId, validation] of Object.entries(childValidations)) {
			validations[tabId] = validation;
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
			Summary: 'Sum',
			'Vehicle ID': 'ID',
			'360° Exterior': '360°',
			'Interior & Mechanical': 'Int',
			Tyres: 'Tyre',
			'Damage ID': 'Dmg',
			Values: 'Val',
			'Pre-Incident': 'Pre',
			Estimate: 'Est',
			Finalize: 'Fin',
			Additionals: 'Add'
		};
		return shortLabels[label] || label;
	}
</script>

<div class="flex h-full flex-col bg-gray-50">
	<!-- Sticky Header Container -->
	<div class="relative z-30 flex flex-col bg-gray-50 shadow-sm">
		<!-- Header -->
		<div class="border-b bg-white px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
			<div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
				<div class="min-w-0 flex-1">
					<h1 class="truncate text-xl font-bold text-gray-900 sm:text-2xl">
						Assessment {assessment.assessment_number}
					</h1>
					<p class="mt-1 text-xs text-gray-500 sm:text-sm">
						Complete the vehicle assessment by filling in all required sections
					</p>
				</div>
				<div
					class="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3"
				>
					{#if lastSaved}
						<span class="text-center text-xs text-gray-500 sm:text-left sm:text-sm">
							Last saved: {new Date(lastSaved).toLocaleTimeString()}
						</span>
					{/if}
					<div class="flex gap-2">
						<LoadingButton
							variant="outline"
							onclick={onSave}
							loading={saving}
							class="flex-1 sm:flex-none"
						>
							{#if !saving}
								<Save class="mr-2 h-4 w-4" />
							{/if}
							{saving ? 'Saving...' : 'Save'}
						</LoadingButton>
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
		<div class="border-b bg-white px-4 py-2 sm:px-6 lg:px-8">
			<Tabs
				bind:value={currentTab}
				class="w-full"
				onValueChange={(value: string) => onTabChange(value)}
			>
				<TabsList
					class="grid h-auto w-full grid-cols-2 gap-1.5 bg-transparent p-0 sm:grid-cols-4 sm:gap-2 md:grid-cols-6 lg:grid-cols-6"
				>
					{#each tabs() as tab}
						{@const missingCount = getMissingFieldsCount(tab.id)}
						<TabsTrigger
							value={tab.id}
							disabled={tabLoading}
							class="relative flex h-8 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1.5 text-xs font-medium text-muted-foreground ring-offset-background transition-all hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-sm sm:h-9 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
						>
							<TabLoadingIndicator
								isLoading={tabLoading && currentTab === tab.id}
								icon={tab.icon}
							/>
							<span class="hidden sm:inline">{tab.label}</span>
							<span class="sm:hidden">{getShortLabel(tab.label)}</span>
							{#if missingCount > 0}
								<Badge variant="destructive" class="ml-1 h-5 min-w-5 px-1.5 text-[10px] font-bold">
									{missingCount}
								</Badge>
							{/if}
						</TabsTrigger>
					{/each}
				</TabsList>
			</Tabs>
		</div>
	</div>

	<!-- Content Area -->
	<div class="flex-1 overflow-y-auto p-2 pt-2 sm:p-3 sm:pt-3 md:p-4 lg:p-6 lg:pt-4">
		<div class="mx-auto w-[98%] max-w-[1600px] sm:w-[95%] md:w-[92%] lg:w-[90%]">
			{#if children}
				{@render children()}
			{/if}
		</div>
	</div>
</div>
