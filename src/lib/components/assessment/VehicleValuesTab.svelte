<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import FormField from '$lib/components/forms/FormField.svelte';
	import CompactCard from './compact/CompactCard.svelte';
	import CompactCardHeader from './compact/CompactCardHeader.svelte';
	import CompactField from './compact/CompactField.svelte';
	import CompactInput from './compact/CompactInput.svelte';
	import CompactSelect from './compact/CompactSelect.svelte';
	import CompactTextarea from './compact/CompactTextarea.svelte';
	import PdfUpload from '$lib/components/forms/PdfUpload.svelte';
	import VehicleValueExtrasTable from './VehicleValueExtrasTable.svelte';
	import RequiredFieldsWarning from './RequiredFieldsWarning.svelte';
	import { debounce } from '$lib/utils/useUnsavedChanges.svelte';
	import { useDraft } from '$lib/utils/useDraft.svelte';
	import { onMount } from 'svelte';
	import { formatDate } from '$lib/utils/formatters';
import type {
	VehicleValues,
	VehicleValueExtra,
	WarrantyStatus,
	ServiceHistoryStatus,
	VehicleIdentification,
	InteriorMechanical,
	VehicleAccessory
} from '$lib/types/assessment';
import type { Client } from '$lib/types/client';
import type { VehicleDetails } from '$lib/utils/report-data-helpers';
	import { validateVehicleValues, type TabValidation } from '$lib/utils/validation';
	import {
		formatCurrency,
		getMonthFromDate,
		createEmptyExtra,
		calculateConditionAdjustmentPercentage
	} from '$lib/utils/vehicleValuesCalculations';

	interface Props {
		data: VehicleValues | null;
		assessmentId: string;
		client: Client | null;
		vehicleIdentification: VehicleIdentification | null;
		interiorMechanical: InteriorMechanical | null;
		accessories: VehicleAccessory[];
		onUpdateAccessoryValue: (accessoryId: string, value: number | null) => void;
		requestInfo?: {
			request_number?: string;
			claim_number?: string | null;
			date_of_loss?: string | null;
			vehicle_make?: string | null;
			vehicle_model?: string | null;
			vehicle_year?: number | null;
			vehicle_vin?: string | null;
			vehicle_registration?: string | null;
			vehicle_mileage?: number | null;
		};
		onUpdate: (data: Partial<VehicleValues>) => void;
		vehicleDetails?: VehicleDetails | null;
		onValidationUpdate?: (validation: TabValidation) => void;
		onRegisterSave?: (saveFn: () => Promise<void>) => void;
	}

	// Make props reactive using $derived pattern
	// This ensures component reacts to parent prop updates without re-mount
	let props: Props = $props();

	const data = $derived(props.data);
	const assessmentId = $derived(props.assessmentId);
	const client = $derived(props.client);
	const vehicleIdentification = $derived(props.vehicleIdentification);
	const interiorMechanical = $derived(props.interiorMechanical);
	const requestInfo = $derived(props.requestInfo);
	const onUpdate = $derived(props.onUpdate);
	const vehicleDetails = $derived(props.vehicleDetails);

	// Initialize localStorage draft for critical fields
	let sourcedFromDraft = useDraft('');
	let sourcedDateDraft = useDraft('');
	let tradeValueDraft = useDraft('');
	let marketValueDraft = useDraft('');
	let retailValueDraft = useDraft('');

	// Update draft keys when assessmentId changes
	$effect(() => {
		sourcedFromDraft = useDraft(`assessment-${assessmentId}-sourced-from`);
		sourcedDateDraft = useDraft(`assessment-${assessmentId}-sourced-date`);
		tradeValueDraft = useDraft(`assessment-${assessmentId}-trade-value`);
		marketValueDraft = useDraft(`assessment-${assessmentId}-market-value`);
		retailValueDraft = useDraft(`assessment-${assessmentId}-retail-value`);
	});

	// Source information
	let sourcedFrom = $state('');
	let sourcedCode = $state('');
	let sourcedDate = $state('');

	// Warranty / Service Details
	let warrantyStatus = $state<WarrantyStatus | ''>('');
	let warrantyPeriodYears = $state<number | null>(null);
	let warrantyStartDate = $state('');
	let warrantyEndDate = $state('');
	let warrantyExpiryMileage = $state('');
	let serviceHistoryStatus = $state<ServiceHistoryStatus | ''>('');
	let warrantyNotes = $state('');

	// Base values
	let tradeValue = $state(0);
	let marketValue = $state(0);
	let retailValue = $state(0);

	// Optional fields
	let newListPrice = $state(0);
	let depreciationPercentage = $state(0);

	// Adjustments
	let valuationAdjustment = $state(0);
	let valuationAdjustmentPercentage = $state(0);
	let conditionAdjustmentValue = $state(0);


	// PDF
	let valuationPdfUrl = $state('');
	let valuationPdfPath = $state('');

	// Remarks
	let remarks = $state('');

	// Derived month from date
	const sourcedMonth = $derived(sourcedDate ? getMonthFromDate(sourcedDate) : '');

	// Write-off percentages from client
	const borderlinePercentage = $derived(client?.borderline_writeoff_percentage || 65);
	const totalWriteoffPercentage = $derived(client?.total_writeoff_percentage || 70);
	const salvagePercentage = $derived(client?.salvage_percentage || 28);

	// Calculate condition adjustment percentages for display
	const tradeConditionPercentage = $derived(
		calculateConditionAdjustmentPercentage(tradeValue, conditionAdjustmentValue)
	);
	const marketConditionPercentage = $derived(
		calculateConditionAdjustmentPercentage(marketValue, conditionAdjustmentValue)
	);
	const retailConditionPercentage = $derived(
		calculateConditionAdjustmentPercentage(retailValue, conditionAdjustmentValue)
	);

	// Calculated adjusted values
	const tradeAdjusted = $derived(
		calculateAdjustedValue(tradeValue, valuationAdjustment, valuationAdjustmentPercentage, conditionAdjustmentValue)
	);
	const marketAdjusted = $derived(
		calculateAdjustedValue(marketValue, valuationAdjustment, valuationAdjustmentPercentage, conditionAdjustmentValue)
	);
	const retailAdjusted = $derived(
		calculateAdjustedValue(retailValue, valuationAdjustment, valuationAdjustmentPercentage, conditionAdjustmentValue)
	);

	// Accessories total (applies equally to trade/market/retail)
	const accessoriesTotal = $derived(
		props.accessories.reduce((sum, acc) => sum + (acc.value || 0), 0)
	);

	// Total adjusted values
	const tradeTotalAdjusted = $derived(tradeAdjusted + accessoriesTotal);
	const marketTotalAdjusted = $derived(marketAdjusted + accessoriesTotal);
	const retailTotalAdjusted = $derived(retailAdjusted + accessoriesTotal);

	// Write-off calculations
	const borderlineWriteoffTrade = $derived(tradeTotalAdjusted * (borderlinePercentage / 100));
	const borderlineWriteoffMarket = $derived(marketTotalAdjusted * (borderlinePercentage / 100));
	const borderlineWriteoffRetail = $derived(retailTotalAdjusted * (borderlinePercentage / 100));

	const totalWriteoffTrade = $derived(tradeTotalAdjusted * (totalWriteoffPercentage / 100));
	const totalWriteoffMarket = $derived(marketTotalAdjusted * (totalWriteoffPercentage / 100));
	const totalWriteoffRetail = $derived(retailTotalAdjusted * (totalWriteoffPercentage / 100));

	const salvageTrade = $derived(tradeTotalAdjusted * (salvagePercentage / 100));
	const salvageMarket = $derived(marketTotalAdjusted * (salvagePercentage / 100));
	const salvageRetail = $derived(retailTotalAdjusted * (salvagePercentage / 100));

	// Sync local state with data prop when it changes (after save)
	// Bug 1 fix: use != null instead of truthiness check so that 0/"" values are preserved
	$effect(() => {
		if (data) {
			// Only update if there's no draft (draft takes precedence)
			if (!sourcedFromDraft.hasDraft() && data.sourced_from != null) {
				sourcedFrom = data.sourced_from;
			}
			if (!sourcedDateDraft.hasDraft() && data.sourced_date != null) {
				sourcedDate = data.sourced_date;
			}
			if (!tradeValueDraft.hasDraft() && data.trade_value != null) {
				tradeValue = data.trade_value;
			}
			if (!marketValueDraft.hasDraft() && data.market_value != null) {
				marketValue = data.market_value;
			}
			if (!retailValueDraft.hasDraft() && data.retail_value != null) {
				retailValue = data.retail_value;
			}

			// Always update other fields from data
			if (data.sourced_code != null) sourcedCode = data.sourced_code;
			if (data.warranty_status != null) warrantyStatus = data.warranty_status;
			if (data.warranty_period_years != null) warrantyPeriodYears = data.warranty_period_years;
			if (data.warranty_start_date != null) warrantyStartDate = data.warranty_start_date;
			if (data.warranty_end_date != null) warrantyEndDate = data.warranty_end_date;
			if (data.warranty_expiry_mileage != null) warrantyExpiryMileage = data.warranty_expiry_mileage;
			if (data.service_history_status != null) serviceHistoryStatus = data.service_history_status;
			if (data.warranty_notes != null) warrantyNotes = data.warranty_notes;
			if (data.new_list_price != null) newListPrice = data.new_list_price;
			if (data.depreciation_percentage != null) depreciationPercentage = data.depreciation_percentage;
			if (data.valuation_adjustment != null) valuationAdjustment = data.valuation_adjustment;
			if (data.valuation_adjustment_percentage != null) valuationAdjustmentPercentage = data.valuation_adjustment_percentage;
			if (data.condition_adjustment_value != null) conditionAdjustmentValue = data.condition_adjustment_value;
			if (data.valuation_pdf_url != null) valuationPdfUrl = data.valuation_pdf_url;
			if (data.valuation_pdf_path != null) valuationPdfPath = data.valuation_pdf_path;
			if (data.remarks != null) remarks = data.remarks;
		}
	});

	// Bug 4: saveNow — cancel any pending debounce then flush immediately
	async function saveNow() {
		if (typeof (debouncedSave as any).cancel === 'function') {
			(debouncedSave as any).cancel();
		}
		await handleSave();
		// Clear drafts (handleSave already clears them, but be explicit)
		sourcedFromDraft.clear();
		sourcedDateDraft.clear();
		tradeValueDraft.clear();
		marketValueDraft.clear();
		retailValueDraft.clear();
	}

	// Load draft values on mount if available, and register saveNow with parent
	onMount(() => {
		const sourcedFromDraftVal = sourcedFromDraft.get();
		const sourcedDateDraftVal = sourcedDateDraft.get();
		const tradeValueDraftVal = tradeValueDraft.get();
		const marketValueDraftVal = marketValueDraft.get();
		const retailValueDraftVal = retailValueDraft.get();

		if (sourcedFromDraftVal && !data?.sourced_from) sourcedFrom = sourcedFromDraftVal;
		if (sourcedDateDraftVal && !data?.sourced_date) sourcedDate = sourcedDateDraftVal;
		if (tradeValueDraftVal && !data?.trade_value) tradeValue = tradeValueDraftVal;
		if (marketValueDraftVal && !data?.market_value) marketValue = marketValueDraftVal;
		if (retailValueDraftVal && !data?.retail_value) retailValue = retailValueDraftVal;

		// Bug 4: register saveNow with parent so tab-change can flush pending saves
		props.onRegisterSave?.(saveNow);
	});

	function calculateAdjustedValue(
		baseValue: number,
		adjustment: number,
		adjustmentPercentage: number,
		conditionValue: number
	): number {
		let adjusted = baseValue + adjustment;
		if (adjustmentPercentage > 0) {
			adjusted += baseValue * (adjustmentPercentage / 100);
		}
		// Add condition adjustment value directly
		adjusted += conditionValue;
		return Math.round(adjusted * 100) / 100;
	}

	// Bug 2 fix: numeric fields use explicit null-coercion so entering 0 is preserved;
	// string/enum/date fields use ?? null so empty string clears the stored value.
	async function handleSave() {
		onUpdate({
			sourced_from: sourcedFrom !== '' ? sourcedFrom : null,
			sourced_code: sourcedCode !== '' ? sourcedCode : null,
			sourced_date: sourcedDate !== '' ? sourcedDate : null,
			warranty_status: warrantyStatus !== '' ? (warrantyStatus as WarrantyStatus) : null,
			warranty_period_years: warrantyPeriodYears ?? null,
			warranty_start_date: warrantyStartDate !== '' ? warrantyStartDate : null,
			warranty_end_date: warrantyEndDate !== '' ? warrantyEndDate : null,
			warranty_expiry_mileage: warrantyExpiryMileage !== '' ? warrantyExpiryMileage : null,
			service_history_status: serviceHistoryStatus !== '' ? (serviceHistoryStatus as ServiceHistoryStatus) : null,
			warranty_notes: warrantyNotes !== '' ? warrantyNotes : null,
			trade_value: tradeValue === 0 ? 0 : (tradeValue || null),
			market_value: marketValue === 0 ? 0 : (marketValue || null),
			retail_value: retailValue === 0 ? 0 : (retailValue || null),
			new_list_price: newListPrice === 0 ? 0 : (newListPrice || null),
			depreciation_percentage: depreciationPercentage === 0 ? 0 : (depreciationPercentage || null),
			valuation_adjustment: valuationAdjustment === 0 ? 0 : (valuationAdjustment || null),
			valuation_adjustment_percentage: valuationAdjustmentPercentage === 0 ? 0 : (valuationAdjustmentPercentage || null),
			condition_adjustment_value: conditionAdjustmentValue === 0 ? 0 : (conditionAdjustmentValue || null),
			valuation_pdf_url: valuationPdfUrl !== '' ? valuationPdfUrl : null,
			valuation_pdf_path: valuationPdfPath !== '' ? valuationPdfPath : null,
			remarks: remarks !== '' ? remarks : null
		});

		// Clear drafts after successful save
		sourcedFromDraft.clear();
		sourcedDateDraft.clear();
		tradeValueDraft.clear();
		marketValueDraft.clear();
		retailValueDraft.clear();
	}

	// Save drafts on input (throttled)
	function saveDrafts() {
		sourcedFromDraft.save(sourcedFrom);
		sourcedDateDraft.save(sourcedDate);
		tradeValueDraft.save(tradeValue);
		marketValueDraft.save(marketValue);
		retailValueDraft.save(retailValue);
	}

	// Create debounced save function (saves 2 seconds after user stops typing)
	const debouncedSave = debounce(() => {
		saveDrafts(); // Save to localStorage
		handleSave(); // Save to database
	}, 2000);

	function handlePdfUpload(url: string, path: string) {
		valuationPdfUrl = url;
		valuationPdfPath = path;
		// Auto-save immediately after PDF upload to persist to database
		handleSave();
	}

	function handlePdfRemove() {
		valuationPdfUrl = '';
		valuationPdfPath = '';
		// Auto-save immediately after PDF removal to persist to database
		handleSave();
	}

	// Validation for warning banner
	const validation = $derived.by(() => {
		return validateVehicleValues({
			trade_value: tradeValue,
			market_value: marketValue,
			retail_value: retailValue,
			sourced_from: sourcedFrom,
			sourced_code: sourcedCode,
			sourced_date: sourcedDate,
			warranty_status: warrantyStatus,
			valuation_pdf_url: valuationPdfUrl
		});
	});

	// Report validation to parent for immediate badge updates
	let lastValidationKey = '';

	$effect(() => {
		// Create stable key for semantic comparison
		const key = `${validation.isComplete}|${validation.missingFields.join(',')}`;

		// Only report if validation actually changed
		if (props.onValidationUpdate && key !== lastValidationKey) {
			lastValidationKey = key;
			props.onValidationUpdate(validation);
		}
	});
</script>

<div class="space-y-6">
	<!-- Warning Banner -->
	<RequiredFieldsWarning missingFields={validation.missingFields} />
	<!-- Section 1: Vehicle & Request Information -->
	<!-- Shows current assessment data with fallback to original request data -->
	{#if requestInfo}
		<CompactCard class="bg-blue-50">
			<CompactCardHeader title="Vehicle & Request Information" />
			<div class="grid gap-3.5 md:grid-cols-3">
				<div>
					<p class="text-sm text-gray-600">Report No.</p>
					<p class="font-medium text-gray-900">{requestInfo.request_number || 'N/A'}</p>
				</div>
				<div>
					<p class="text-sm text-gray-600">Insurer</p>
					<p class="font-medium text-gray-900">{client?.name || 'N/A'}</p>
				</div>
				<div>
					<p class="text-sm text-gray-600">Date of Loss</p>
					<p class="font-medium text-gray-900">
						{requestInfo.date_of_loss
							? formatDate(requestInfo.date_of_loss)
							: 'N/A'}
					</p>
				</div>
			</div>
			<div class="mt-4 grid gap-3.5 md:grid-cols-4">
				<div>
					<p class="text-sm text-gray-600">Make</p>
					<!-- Normalized from vehicleDetails -->
					<p class="font-medium text-gray-900">{vehicleDetails?.make || 'N/A'}</p>
				</div>
				<div>
					<p class="text-sm text-gray-600">Model</p>
					<!-- Normalized from vehicleDetails -->
					<p class="font-medium text-gray-900">{vehicleDetails?.model || 'N/A'}</p>
				</div>
				<div>
					<p class="text-sm text-gray-600">Year</p>
					<!-- Normalized from vehicleDetails -->
					<p class="font-medium text-gray-900">{vehicleDetails?.year || 'N/A'}</p>
				</div>
				<div>
					<p class="text-sm text-gray-600">Mileage</p>
					<!-- Prefer interior mechanical data over vehicleDetails -->
					<p class="font-medium text-gray-900">
						{interiorMechanical?.mileage_reading
							? interiorMechanical.mileage_reading.toLocaleString() + ' km'
							: vehicleDetails?.mileage
								? vehicleDetails.mileage.toLocaleString() + ' km'
								: 'N/A'}
					</p>
				</div>
			</div>
			<div class="mt-4">
				<p class="text-sm text-gray-600">VIN</p>
				<!-- Normalized from vehicleDetails -->
				<p class="font-medium text-gray-900">{vehicleDetails?.vin || 'N/A'}</p>
			</div>
			<div class="mt-4">
				<p class="text-sm text-gray-600">Registration</p>
				<!-- Normalized from vehicleDetails -->
				<p class="font-medium text-gray-900">{vehicleDetails?.registration || 'N/A'}</p>
			</div>
		</CompactCard>
	{/if}

	<!-- Valuation Source -->
	<CompactCard>
		<CompactCardHeader title="Valuation Source" required />
		<div class="grid gap-3.5 md:grid-cols-2">
			<CompactField label="Sourced From" htmlFor="sourced_from" required>
				<CompactInput
					id="sourced_from"
					bind:value={sourcedFrom}
					placeholder="e.g., TransUnion - iCheck, Lightstone Auto"
					oninput={debouncedSave}
				/>
			</CompactField>
			<CompactField label="Source Code" htmlFor="sourced_code" required>
				<CompactInput
					id="sourced_code"
					bind:value={sourcedCode}
					placeholder="e.g., 22035630"
					oninput={debouncedSave}
				/>
			</CompactField>
		</div>
		<div class="mt-3 grid gap-3.5 md:grid-cols-2">
			<CompactField label="Sourced Date" htmlFor="sourced_date" required>
				<input
					id="sourced_date"
					type="date"
					bind:value={sourcedDate}
					oninput={debouncedSave}
					class="w-full px-2.5 py-2 text-[13px] text-slate-900 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
				/>
			</CompactField>
			<div>
				<div class="mb-2 block text-sm font-medium text-gray-700">Month (Auto-calculated)</div>
				<div class="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">
					{sourcedMonth || 'Select a date'}
				</div>
			</div>
		</div>
	</CompactCard>

	<!-- Warranty / Service Details -->
	<CompactCard>
		<CompactCardHeader title="Warranty / Service Details" />

		<div class="space-y-3">
			<!-- Status -->
			<CompactField label="Status" htmlFor="warranty_status" required>
				<CompactSelect
					id="warranty_status"
					bind:value={warrantyStatus}
					onchange={debouncedSave}
					options={[
						{ value: '', label: 'Select status...' },
						{ value: 'active', label: 'Active' },
						{ value: 'expired', label: 'Expired' },
						{ value: 'void', label: 'Void' },
						{ value: 'transferred', label: 'Transferred' },
						{ value: 'unknown', label: 'Unknown' }
					]}
				/>
			</CompactField>

			<!-- Period (Years) — raw select (bind:value with null option) -->
			<CompactField label="Period (Years)" htmlFor="warranty_period_years">
				<select
					id="warranty_period_years"
					name="warranty_period_years"
					bind:value={warrantyPeriodYears}
					onchange={debouncedSave}
					class="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<option value={null}>Select period...</option>
					<option value={1}>1 Year</option>
					<option value={2}>2 Years</option>
					<option value={3}>3 Years</option>
					<option value={4}>4 Years</option>
					<option value={5}>5 Years</option>
					<option value={6}>6 Years</option>
					<option value={7}>7 Years</option>
				</select>
			</CompactField>

			<!-- Date Range: From - To -->
			<fieldset>
				<legend class="mb-2 block text-sm font-medium text-gray-700">Date</legend>
				<div class="grid gap-3.5 md:grid-cols-2">
					<CompactField label="From" htmlFor="warranty_start_date">
						<input
							id="warranty_start_date"
							type="date"
							bind:value={warrantyStartDate}
							oninput={debouncedSave}
							class="w-full px-2.5 py-2 text-[13px] text-slate-900 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
						/>
					</CompactField>
					<CompactField label="To" htmlFor="warranty_end_date">
						<input
							id="warranty_end_date"
							type="date"
							bind:value={warrantyEndDate}
							oninput={debouncedSave}
							class="w-full px-2.5 py-2 text-[13px] text-slate-900 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
						/>
					</CompactField>
				</div>
			</fieldset>

			<!-- Expiry Mileage -->
			<CompactField label="Expiry Mileage" htmlFor="warranty_expiry_mileage">
				<CompactSelect
					id="warranty_expiry_mileage"
					bind:value={warrantyExpiryMileage}
					onchange={debouncedSave}
					options={[
						{ value: '', label: 'Select mileage...' },
						{ value: 'unlimited', label: 'Unlimited' },
						{ value: '50000', label: '50,000 km' },
						{ value: '100000', label: '100,000 km' },
						{ value: '120000', label: '120,000 km' },
						{ value: '150000', label: '150,000 km' },
						{ value: '200000', label: '200,000 km' }
					]}
				/>
			</CompactField>

			<!-- Service History -->
			<CompactField label="Service History" htmlFor="service_history_status">
				<CompactSelect
					id="service_history_status"
					bind:value={serviceHistoryStatus}
					onchange={debouncedSave}
					options={[
						{ value: '', label: 'Select status...' },
						{ value: 'checked', label: 'Checked' },
						{ value: 'not_checked', label: 'Not Checked' },
						{ value: 'incomplete', label: 'Incomplete' },
						{ value: 'up_to_date', label: 'Up to Date' },
						{ value: 'overdue', label: 'Overdue' },
						{ value: 'unknown', label: 'Unknown' }
					]}
				/>
			</CompactField>

			<!-- Additional Notes -->
			<CompactField label="Additional Notes" htmlFor="warranty_notes">
				<CompactTextarea
					id="warranty_notes"
					bind:value={warrantyNotes}
					placeholder="Additional warranty or service information..."
					rows={3}
					oninput={debouncedSave}
				/>
			</CompactField>
		</div>
	</CompactCard>

	<!-- Section 2: Base Values & Adjustments -->
	<CompactCard>
		<CompactCardHeader title="Vehicle Values" required />

		<!-- Optional fields -->
		<div class="mb-3.5 grid gap-3.5 md:grid-cols-2">
			<CompactField label="New List Price" htmlFor="new_list_price">
				<CompactInput
					id="new_list_price"
					type="number"
					mono
					bind:value={newListPrice}
					placeholder="0.00"
					step="0.01"
					oninput={debouncedSave}
				/>
			</CompactField>
			<CompactField label="Depreciation %" htmlFor="depreciation_percentage">
				<CompactInput
					id="depreciation_percentage"
					type="number"
					mono
					bind:value={depreciationPercentage}
					placeholder="0.00"
					step="0.01"
					oninput={debouncedSave}
				/>
			</CompactField>
		</div>

		<!-- Base values -->
		<div class="mb-3.5 grid gap-3.5 md:grid-cols-3">
			<CompactField label="Trade Value" htmlFor="trade_value">
				<CompactInput
					id="trade_value"
					type="number"
					mono
					bind:value={tradeValue}
					placeholder="0.00"
					step="0.01"
					oninput={debouncedSave}
				/>
			</CompactField>
			<CompactField label="Market Value" htmlFor="market_value">
				<CompactInput
					id="market_value"
					type="number"
					mono
					bind:value={marketValue}
					placeholder="0.00"
					step="0.01"
					oninput={debouncedSave}
				/>
			</CompactField>
			<CompactField label="Retail Value" htmlFor="retail_value">
				<CompactInput
					id="retail_value"
					type="number"
					mono
					bind:value={retailValue}
					placeholder="0.00"
					step="0.01"
					oninput={debouncedSave}
				/>
			</CompactField>
		</div>

		<!-- Adjustments -->
		<div class="mb-3.5 space-y-3">
			<h4 class="text-sm font-semibold text-gray-700">Adjustments</h4>
			<div class="grid gap-3.5 md:grid-cols-2">
				<CompactField label="Valuation Adjustment (Amount)" htmlFor="valuation_adjustment">
					<CompactInput
						id="valuation_adjustment"
						type="number"
						mono
						bind:value={valuationAdjustment}
						placeholder="0.00"
						step="0.01"
						oninput={debouncedSave}
					/>
				</CompactField>
				<CompactField label="Valuation Adjustment %" htmlFor="valuation_adjustment_percentage">
					<CompactInput
						id="valuation_adjustment_percentage"
						type="number"
						mono
						bind:value={valuationAdjustmentPercentage}
						placeholder="0.00"
						step="0.01"
						oninput={debouncedSave}
					/>
				</CompactField>
			</div>
			<div class="space-y-2">
				<CompactField label="Condition Adjustment Value" htmlFor="condition_adjustment_value">
					<CompactInput
						id="condition_adjustment_value"
						type="number"
						mono
						bind:value={conditionAdjustmentValue}
						placeholder="0.00"
						step="0.01"
						oninput={debouncedSave}
					/>
				</CompactField>
				<!-- Display calculated percentages -->
				<div class="rounded-md bg-blue-50 p-3">
					<p class="text-xs font-medium text-blue-900 mb-1">Calculated Percentages:</p>
					<div class="grid grid-cols-3 gap-2 text-xs text-blue-700">
						<div>
							<span class="font-medium">Trade:</span> {tradeConditionPercentage.toFixed(2)}%
						</div>
						<div>
							<span class="font-medium">Market:</span> {marketConditionPercentage.toFixed(2)}%
						</div>
						<div>
							<span class="font-medium">Retail:</span> {retailConditionPercentage.toFixed(2)}%
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Adjusted Values Display -->
		<div class="rounded-lg bg-gray-50 p-4">
			<h4 class="mb-3 text-sm font-semibold text-gray-700">Adjusted Values</h4>
			<div class="grid gap-3.5 md:grid-cols-3">
				<div>
					<p class="text-xs text-gray-600">Trade</p>
					<p class="text-lg font-semibold text-gray-900 font-mono-tabular">{formatCurrency(tradeAdjusted)}</p>
				</div>
				<div>
					<p class="text-xs text-gray-600">Market</p>
					<p class="text-lg font-semibold text-gray-900 font-mono-tabular">{formatCurrency(marketAdjusted)}</p>
				</div>
				<div>
					<p class="text-xs text-gray-600">Retail</p>
					<p class="text-lg font-semibold text-gray-900 font-mono-tabular">{formatCurrency(retailAdjusted)}</p>
				</div>
			</div>
		</div>
	</CompactCard>

	<!-- Section 3: Accessories -->
	<VehicleValueExtrasTable
		accessories={props.accessories}
		onUpdateAccessoryValue={props.onUpdateAccessoryValue}
	/>

	<!-- Section 4: Total Adjusted Values -->
	<CompactCard>
		<CompactCardHeader title="Total Adjusted Values" />
		<div class="grid gap-3.5 md:grid-cols-3">
			<div class="rounded-lg bg-blue-50 p-4">
				<p class="text-sm text-gray-600">Trade Total</p>
				<p class="text-xl font-bold text-blue-900 font-mono-tabular">{formatCurrency(tradeTotalAdjusted)}</p>
				<p class="mt-1 text-xs text-gray-500">
					Adjusted: <span class="font-mono-tabular">{formatCurrency(tradeAdjusted)}</span> + Accessories: <span class="font-mono-tabular">{formatCurrency(accessoriesTotal)}</span>
				</p>
			</div>
			<div class="rounded-lg bg-blue-50 p-4">
				<p class="text-sm text-gray-600">Market Total</p>
				<p class="text-xl font-bold text-blue-900 font-mono-tabular">{formatCurrency(marketTotalAdjusted)}</p>
				<p class="mt-1 text-xs text-gray-500">
					Adjusted: <span class="font-mono-tabular">{formatCurrency(marketAdjusted)}</span> + Accessories: <span class="font-mono-tabular">{formatCurrency(accessoriesTotal)}</span>
				</p>
			</div>
			<div class="rounded-lg bg-blue-50 p-4">
				<p class="text-sm text-gray-600">Retail Total</p>
				<p class="text-xl font-bold text-blue-900 font-mono-tabular">{formatCurrency(retailTotalAdjusted)}</p>
				<p class="mt-1 text-xs text-gray-500">
					Adjusted: <span class="font-mono-tabular">{formatCurrency(retailAdjusted)}</span> + Accessories: <span class="font-mono-tabular">{formatCurrency(accessoriesTotal)}</span>
				</p>
			</div>
		</div>
	</CompactCard>

	<!-- Section 5: Write-Off Calculations -->
	<CompactCard>
		<CompactCardHeader title="Write-Off Calculations" />
		<div class="mb-4 rounded-lg bg-yellow-50 p-3">
			<p class="text-sm text-gray-700">
				Using client's write-off percentages: Borderline ({borderlinePercentage}%), Total Write-Off
				({totalWriteoffPercentage}%), Salvage ({salvagePercentage}%)
			</p>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full">
				<thead>
					<tr class="border-b border-gray-200 bg-gray-50">
						<th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Value Type</th>
						<th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">
							Borderline ({borderlinePercentage}%)
						</th>
						<th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">
							Write-Off ({totalWriteoffPercentage}%)
						</th>
						<th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">
							Salvage ({salvagePercentage}%)
						</th>
					</tr>
				</thead>
				<tbody>
					<tr class="border-b border-gray-100">
						<td class="px-4 py-3 font-medium text-gray-900">Trade</td>
						<td class="px-4 py-3 text-right text-gray-900 font-mono-tabular">
							{formatCurrency(borderlineWriteoffTrade)}
						</td>
						<td class="px-4 py-3 text-right text-gray-900 font-mono-tabular">
							{formatCurrency(totalWriteoffTrade)}
						</td>
						<td class="px-4 py-3 text-right text-gray-900 font-mono-tabular">{formatCurrency(salvageTrade)}</td>
					</tr>
					<tr class="border-b border-gray-100">
						<td class="px-4 py-3 font-medium text-gray-900">Market</td>
						<td class="px-4 py-3 text-right text-gray-900 font-mono-tabular">
							{formatCurrency(borderlineWriteoffMarket)}
						</td>
						<td class="px-4 py-3 text-right text-gray-900 font-mono-tabular">
							{formatCurrency(totalWriteoffMarket)}
						</td>
						<td class="px-4 py-3 text-right text-gray-900 font-mono-tabular">{formatCurrency(salvageMarket)}</td>
					</tr>
					<tr class="border-b border-gray-100">
						<td class="px-4 py-3 font-medium text-gray-900">Retail</td>
						<td class="px-4 py-3 text-right text-gray-900 font-mono-tabular">
							{formatCurrency(borderlineWriteoffRetail)}
						</td>
						<td class="px-4 py-3 text-right text-gray-900 font-mono-tabular">
							{formatCurrency(totalWriteoffRetail)}
						</td>
						<td class="px-4 py-3 text-right text-gray-900 font-mono-tabular">{formatCurrency(salvageRetail)}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</CompactCard>

	<!-- Section 6: Supporting Documents -->
	<CompactCard>
		<CompactCardHeader title="Supporting Documents" required />

		<div class="mb-3.5">
			<PdfUpload
				value={valuationPdfUrl}
				label="Valuation Report (PDF)"
				{assessmentId}
				category="values"
				onUpload={handlePdfUpload}
				onRemove={handlePdfRemove}
			/>
		</div>

		<CompactField label="Remarks" htmlFor="remarks">
			<CompactTextarea id="remarks" bind:value={remarks} rows={4} oninput={debouncedSave} />
		</CompactField>
	</CompactCard>
</div>

