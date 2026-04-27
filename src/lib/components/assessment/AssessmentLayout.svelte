<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import LoadingButton from '$lib/components/ui/button/LoadingButton.svelte';
	import { Sheet, SheetContent } from '$lib/components/ui/sheet';
	import { StepRail } from '$lib/components/ui/step-rail';
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
		History,
		Clock,
		Menu
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

	// Mobile drawer state
	let drawerOpen = $state(false);

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

	// Build steps array for StepRail from tabs + validations
	const steps = $derived.by(() => {
		return tabs().map((tab) => {
			const validation = tabValidations[tab.id];
			if (!validation) {
				return { id: tab.id, label: tab.label, status: 'not-started' as const };
			}
			if (validation.isComplete) {
				return { id: tab.id, label: tab.label, status: 'complete' as const };
			}
			const total = validation.totalFields ?? 0;
			const missing = validation.missingFields.length;
			const progress = total > 0 ? Math.max(0, Math.min(1, (total - missing) / total)) : 0;
			return {
				id: tab.id,
				label: tab.label,
				status: 'in-progress' as const,
				progress,
				missingCount: missing
			};
		});
	});

	function handleTabClick(tabId: string) {
		if (currentTab !== tabId) {
			onTabChange(tabId);
		}
	}
</script>

<div class="flex h-screen flex-col overflow-hidden bg-gray-50">
	<!-- Sticky Header -->
	<div class="relative z-30 bg-gray-50 shadow-sm">
		<div class="border-b bg-white px-3 py-2 sm:px-6 sm:py-4 lg:px-8">
			<div class="flex items-center justify-between gap-2 sm:gap-3">
				<!-- Title Section -->
				<div class="min-w-0 flex-1">
					<h1 class="truncate text-base font-bold text-gray-900 sm:text-xl lg:text-2xl">
						{assessment.assessment_number}
					</h1>
					<p class="mt-0.5 hidden text-xs text-gray-500 sm:block sm:text-sm">
						Complete the vehicle assessment
					</p>
				</div>

				<!-- Actions Section -->
				<div class="flex items-center gap-1.5 sm:gap-2">
					<!-- Last saved indicator -->
					{#if lastSaved}
						<div
							class="hidden items-center gap-1 text-xs text-gray-500 sm:flex sm:text-sm"
							title="Last saved: {new Date(lastSaved).toLocaleTimeString()}"
						>
							<Clock class="h-3.5 w-3.5" />
							<span class="hidden md:inline">Saved {new Date(lastSaved).toLocaleTimeString()}</span>
						</div>
					{/if}

					<!-- Hamburger — mobile/tablet only (hidden on lg+) -->
					<Button
						variant="ghost"
						size="icon"
						class="h-8 w-8 lg:hidden"
						onclick={() => (drawerOpen = true)}
						aria-label="Open navigation"
					>
						<Menu class="h-4 w-4" />
					</Button>

					<!-- Save / Cancel / Exit — icon only on xs, with text on sm+ -->
					<LoadingButton
						variant="outline"
						onclick={onSave}
						loading={saving}
						size="sm"
						class="h-8 px-2 sm:h-9 sm:px-3"
					>
						{#if !saving}
							<Save class="h-4 w-4 sm:mr-1.5" />
						{/if}
						<span class="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
					</LoadingButton>

					{#if onCancel && ['assessment_in_progress', 'estimate_review', 'estimate_sent'].includes(assessment.stage)}
						<Button
							variant="destructive"
							onclick={onCancel}
							size="sm"
							class="h-8 px-2 sm:h-9 sm:px-3"
						>
							<Trash2 class="h-4 w-4 sm:mr-1.5" />
							<span class="hidden sm:inline">Cancel</span>
						</Button>
					{/if}

					<Button variant="outline" onclick={onExit} size="sm" class="h-8 px-2 sm:h-9 sm:px-3">
						<X class="h-4 w-4 sm:mr-1.5" />
						<span class="hidden sm:inline">Exit</span>
					</Button>
				</div>
			</div>
		</div>
	</div>

	<!-- Body: aside rail + main content -->
	<div class="flex min-h-0 flex-1">
		<!-- Desktop step rail (lg+) -->
		<aside
			class="hidden w-[232px] shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar lg:flex"
		>
			<StepRail {steps} currentStep={currentTab} onStepChange={handleTabClick} />
		</aside>

		<!-- Main content area -->
		<main class="flex-1 overflow-y-auto p-2 pt-2 sm:p-3 sm:pt-3 md:p-4 lg:p-6 lg:pt-4">
			<div
				class={['estimate', 'additionals'].includes(currentTab)
					? 'mx-auto w-full max-w-none'
					: 'mx-auto w-[98%] max-w-[1600px] sm:w-[95%] md:w-[92%] lg:w-[90%]'}
			>
				{#if children}
					{@render children()}
				{/if}
			</div>
		</main>
	</div>

	<!-- Mobile drawer (Sheet) -->
	<Sheet bind:open={drawerOpen}>
		<SheetContent side="left" class="scroll-isolate w-[280px] p-0">
			<StepRail
				{steps}
				currentStep={currentTab}
				onStepChange={(id) => {
					handleTabClick(id);
					drawerOpen = false;
				}}
			/>
		</SheetContent>
	</Sheet>
</div>
