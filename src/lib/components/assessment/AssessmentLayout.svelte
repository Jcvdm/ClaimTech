<script lang="ts">
	import { setContext } from 'svelte';
	import type { Snippet as SvelteSnippet } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import LoadingButton from '$lib/components/ui/button/LoadingButton.svelte';
	import AssessmentTopTabs from './layout/AssessmentTopTabs.svelte';
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
		Clock
	} from 'lucide-svelte';
	import CompactChip from './compact/CompactChip.svelte';
	import CompactButton from './compact/CompactButton.svelte';
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
		// Live validations forwarded from the page (react to user input immediately)
		liveValidations?: Record<string, TabValidation>;
		children?: any;
		rightPanel?: import('svelte').Snippet;
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
		liveValidations = {},
		children,
		rightPanel = undefined
	}: Props = $props();

	let bottomBarContent = $state<SvelteSnippet | null>(null);

	setContext('assessment-bottom-bar', {
		set: (s: SvelteSnippet | null) => { bottomBarContent = s; },
		clear: () => { bottomBarContent = null; }
	});

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

		// Override with live validations from the page (react to user input immediately)
		for (const [tabId, validation] of Object.entries(liveValidations)) {
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

	const vehicleSubtitle = $derived.by(() => {
		const v = vehicleIdentification;
		if (!v) return '';
		const parts: string[] = [];
		const yearMakeModel = [v.year, v.make, v.model].filter(Boolean).join(' ');
		if (yearMakeModel) parts.push(yearMakeModel);
		if (v.registration_number) parts.push(v.registration_number);
		return parts.join(' · ');
	});

	function relativeTime(iso: string | null): string {
		if (!iso) return '';
		const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
		if (seconds < 60) return 'just now';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		return new Date(iso).toLocaleDateString();
	}
</script>

<div class="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
	<!-- Two-row chrome header -->
	<div class="relative z-30 shrink-0">
		<!-- Row 1: HeaderBar -->
		<div class="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-2.5">
			<!-- Brand mark -->
			<div class="flex h-[26px] w-[26px] items-center justify-center rounded-[5px] bg-slate-900 text-[11px] font-extrabold text-white">
				CT
			</div>
			<!-- Breadcrumb -->
			<nav class="hidden truncate text-[12px] text-slate-400 sm:block">
				Home <span class="px-1">›</span> Work <span class="px-1">›</span> Assessments <span class="px-1">›</span>
				<span class="font-semibold text-slate-600">{assessment.assessment_number}</span>
			</nav>
			<!-- Spacer -->
			<div class="flex-1"></div>
			<!-- Sync chip -->
			{#if lastSaved}
				<CompactChip tone="green">
					<span class="text-[10px]">●</span>
					Synced {relativeTime(lastSaved)}
				</CompactChip>
			{:else}
				<CompactChip tone="gray">Not saved</CompactChip>
			{/if}
			<!-- Save -->
			<LoadingButton
				variant="outline"
				onclick={onSave}
				loading={saving}
				size="sm"
				class="h-8 px-3"
			>
				{#if !saving}<Save class="mr-1.5 h-4 w-4" />{/if}
				{saving ? 'Saving...' : 'Save'}
			</LoadingButton>
			<!-- Cancel (conditional) -->
			{#if onCancel && ['assessment_in_progress', 'estimate_review', 'estimate_sent'].includes(assessment.stage)}
				<CompactButton variant="danger" size="sm" onclick={onCancel}>
					{#snippet icon()}<Trash2 class="h-4 w-4" />{/snippet}
					Cancel
				</CompactButton>
			{/if}
			<!-- Exit -->
			<CompactButton variant="ghost" size="sm" onclick={onExit}>
				{#snippet icon()}<X class="h-4 w-4" />{/snippet}
				Exit
			</CompactButton>
		</div>

		<!-- Row 2: TitleBar -->
		<div class="flex items-baseline gap-3.5 border-b border-slate-200 bg-white px-5 py-3">
			<h1 class="text-[20px] font-extrabold leading-none tracking-tight text-slate-900">
				{assessment.assessment_number}
			</h1>
			{#if vehicleSubtitle}
				<p class="truncate text-[13px] text-slate-600">{vehicleSubtitle}</p>
			{:else}
				<p class="truncate text-[13px] text-slate-400">Complete the vehicle assessment</p>
			{/if}
			<div class="flex-1"></div>
			<!-- Right slot for future status chips -->
		</div>
	</div>

	<AssessmentTopTabs steps={steps} currentStep={currentTab} onStepChange={handleTabClick} />

	<!-- Body: main content -->
	<div class="flex min-h-0 flex-1">
		<main class={[
				'flex-1 overflow-y-auto pt-2 sm:pt-3',
				['estimate', 'additionals'].includes(currentTab)
					? 'px-1 sm:px-2 lg:px-3 pb-0'
					: 'p-2 sm:p-3 md:p-4 lg:p-6'
			].join(' ')}>
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
		{#if rightPanel}{@render rightPanel()}{/if}
	</div>

	<!-- Bottom bar slot — viewport-level footer, always visible when content registered -->
	{#if bottomBarContent}
		<div class="shrink-0 border-t border-slate-200 bg-white">
			{@render bottomBarContent()}
		</div>
	{/if}

</div>
