<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import StatusBadge from '$lib/components/data/StatusBadge.svelte';
	import { CircleCheck, CircleX, CircleAlert, Info, CircleOff } from 'lucide-svelte';
import type { Inspection } from '$lib/types/inspection';
import type { Request } from '$lib/types/request';
import type { Client } from '$lib/types/client';
import type { Assessment, VehicleValues, Estimate } from '$lib/types/assessment';
import type { VehicleDetails } from '$lib/utils/report-data-helpers';
	import {
		calculateEstimateThreshold,
		getThresholdColorClasses,
		formatWarrantyStatus,
		getWarrantyStatusClasses
	} from '$lib/utils/estimateThresholds';
	import {
		getAssessmentResultInfo,
		getAssessmentResultColorClasses
	} from '$lib/utils/assessmentResults';
	import { formatCurrency } from '$lib/utils/formatters';

	interface Props {
		// Primary: Assessment-centric (preferred)
		assessment?: Assessment | null;

		// Backward compatibility: Old inspection-centric props (deprecated)
		inspection?: Inspection | null;
		request?: Request | null;
		client?: Client | null;

		// Assessment detail data (when showing full assessment)
		vehicleValues?: VehicleValues | null;
		estimate?: Estimate | null;
		preIncidentEstimate?: Estimate | null;

		// Vehicle identification and interior mechanical data for comprehensive panel
		vehicleIdentification?: any | null;
		interiorMechanical?: any | null;
		vehicleDetails?: VehicleDetails | null;

		// Display options
		showAssessmentData?: boolean;
	}

	let {
		assessment = null,
		inspection = null,
		request = null,
		client = null,
		vehicleValues = null,
		estimate = null,
		preIncidentEstimate = null,
		vehicleIdentification = null,
		interiorMechanical = null,
		vehicleDetails = null,
		showAssessmentData = false
	}: Props = $props();

	// Derive request and client from props (assessment doesn't have request relationship)
	// Use explicit props for request and client
	const derivedRequest = $derived(request);
	const derivedClient = $derived(client);

	// Use inspection for backward compatibility (when assessment not provided)
	const derivedInspection = $derived(inspection);

	// Calculate threshold for estimate
	const estimateThreshold = $derived(() => {
		if (!estimate || !vehicleValues) return null;
		return calculateEstimateThreshold(estimate.total, vehicleValues.borderline_writeoff_retail);
	});

	// Calculate threshold for pre-incident estimate
	const preIncidentThreshold = $derived(() => {
		if (!preIncidentEstimate || !vehicleValues) return null;
		return calculateEstimateThreshold(
			preIncidentEstimate.total,
			vehicleValues.borderline_writeoff_retail
		);
	});

	// Format warranty info
	const warrantyInfo = $derived(() => {
		if (!vehicleValues) return null;
		return formatWarrantyStatus(vehicleValues.warranty_status);
	});
</script>

<div class="space-y-4">
	<!-- Claim Information -->
	<Card class="p-4">
		<h3 class="mb-3 text-sm font-semibold text-gray-900">Claim Information</h3>
		<dl class="grid gap-3 text-sm">
			{#if assessment}
				<div class="grid grid-cols-3 gap-2">
					<dt class="font-medium text-gray-500">Assessment #:</dt>
					<dd class="col-span-2 text-gray-900">{assessment.assessment_number}</dd>
				</div>
			{:else if derivedInspection}
				<div class="grid grid-cols-3 gap-2">
					<dt class="font-medium text-gray-500">Inspection #:</dt>
					<dd class="col-span-2 text-gray-900">{derivedInspection.inspection_number}</dd>
				</div>
			{/if}
			{#if derivedRequest}
				<div class="grid grid-cols-3 gap-2">
					<dt class="font-medium text-gray-500">Request #:</dt>
					<dd class="col-span-2 text-gray-900">{derivedRequest.request_number}</dd>
				</div>
				{#if derivedRequest.claim_number}
					<div class="grid grid-cols-3 gap-2">
						<dt class="font-medium text-gray-500">Claim #:</dt>
						<dd class="col-span-2 text-gray-900">{derivedRequest.claim_number}</dd>
					</div>
				{/if}
				<div class="grid grid-cols-3 gap-2">
					<dt class="font-medium text-gray-500">Type:</dt>
					<dd class="col-span-2">
						<Badge variant={derivedRequest.type === 'insurance' ? 'default' : 'secondary'}>
							{derivedRequest.type === 'insurance' ? 'Insurance' : 'Private'}
						</Badge>
					</dd>
				</div>
			{/if}
			{#if assessment}
				<div class="grid grid-cols-3 gap-2">
					<dt class="font-medium text-gray-500">Stage:</dt>
					<dd class="col-span-2">
						<StatusBadge status={assessment.stage} />
					</dd>
				</div>
			{:else if derivedInspection}
				<div class="grid grid-cols-3 gap-2">
					<dt class="font-medium text-gray-500">Status:</dt>
					<dd class="col-span-2">
						<StatusBadge status={derivedInspection.status} />
					</dd>
				</div>
			{/if}
		</dl>
	</Card>

	<!-- Client Contact Details -->
	<Card class="p-4">
		<h3 class="mb-3 text-sm font-semibold text-gray-900">Client Contact Details</h3>
		{#if derivedClient}
			<dl class="grid gap-3 text-sm">
				<div class="grid grid-cols-3 gap-2">
					<dt class="font-medium text-gray-500">Name:</dt>
					<dd class="col-span-2 text-gray-900">{derivedClient.name}</dd>
				</div>
				{#if derivedClient.contact_name}
					<div class="grid grid-cols-3 gap-2">
						<dt class="font-medium text-gray-500">Contact:</dt>
						<dd class="col-span-2 text-gray-900">{derivedClient.contact_name}</dd>
					</div>
				{/if}
				{#if derivedClient.email}
					<div class="grid grid-cols-3 gap-2">
						<dt class="font-medium text-gray-500">Email:</dt>
						<dd class="col-span-2">
							<a href="mailto:{derivedClient.email}" class="text-blue-600 hover:underline">
								{derivedClient.email}
							</a>
						</dd>
					</div>
				{/if}
				{#if derivedClient.phone}
					<div class="grid grid-cols-3 gap-2">
						<dt class="font-medium text-gray-500">Phone:</dt>
						<dd class="col-span-2">
							<a href="tel:{derivedClient.phone}" class="text-blue-600 hover:underline">
								{derivedClient.phone}
							</a>
						</dd>
					</div>
				{/if}
			</dl>
		{:else}
			<p class="text-sm text-gray-500">Client information not available</p>
		{/if}
	</Card>

	<!-- Vehicle & Request Information -->
	<Card class="bg-blue-50 p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Vehicle & Request Information</h3>

		<!-- Row 1: Report No., Insurer, Date of Loss -->
		<div class="grid gap-4 md:grid-cols-3">
			<div>
				<p class="text-sm text-gray-600">Report No.</p>
				<p class="font-medium text-gray-900">{derivedRequest?.request_number || 'N/A'}</p>
			</div>
			<div>
				<p class="text-sm text-gray-600">Insurer</p>
				<p class="font-medium text-gray-900">{derivedClient?.name || 'N/A'}</p>
			</div>
			<div>
				<p class="text-sm text-gray-600">Date of Loss</p>
				<p class="font-medium text-gray-900">
					{derivedRequest?.date_of_loss
						? new Date(derivedRequest.date_of_loss).toLocaleDateString()
						: 'N/A'}
				</p>
			</div>
		</div>

		<!-- Row 2: Make, Model, Year, Mileage -->
		<div class="mt-4 grid gap-4 md:grid-cols-4">
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

		<!-- Row 3: VIN -->
		<div class="mt-4">
			<p class="text-sm text-gray-600">VIN</p>
			<!-- Normalized from vehicleDetails -->
			<p class="font-medium text-gray-900">{vehicleDetails?.vin || 'N/A'}</p>
		</div>

		<!-- Row 4: Registration -->
		<div class="mt-4">
			<p class="text-sm text-gray-600">Registration</p>
			<!-- Normalized from vehicleDetails -->
			<p class="font-medium text-gray-900">{vehicleDetails?.registration || 'N/A'}</p>
		</div>
	</Card>

	<!-- Assessment Data (only shown when showAssessmentData is true) -->
	{#if showAssessmentData}
		<!-- Vehicle Values Summary -->
		{#if vehicleValues}
			<Card class="p-4">
				<h3 class="mb-3 text-sm font-semibold text-gray-900">Vehicle Values</h3>
				<dl class="grid gap-3 text-sm">
					{#if vehicleValues.trade_value}
						<div class="grid grid-cols-3 gap-2">
							<dt class="font-medium text-gray-500">Trade Value:</dt>
							<dd class="col-span-2 text-gray-900">
								{formatCurrency(vehicleValues.trade_value)}
								{#if vehicleValues.trade_total_adjusted_value && vehicleValues.trade_total_adjusted_value !== vehicleValues.trade_value}
									→ {formatCurrency(vehicleValues.trade_total_adjusted_value)}
								{/if}
							</dd>
						</div>
					{/if}
					{#if vehicleValues.market_value}
						<div class="grid grid-cols-3 gap-2">
							<dt class="font-medium text-gray-500">Market Value:</dt>
							<dd class="col-span-2 text-gray-900">
								{formatCurrency(vehicleValues.market_value)}
								{#if vehicleValues.market_total_adjusted_value && vehicleValues.market_total_adjusted_value !== vehicleValues.market_value}
									→ {formatCurrency(vehicleValues.market_total_adjusted_value)}
								{/if}
							</dd>
						</div>
					{/if}
					{#if vehicleValues.retail_value}
						<div class="grid grid-cols-3 gap-2">
							<dt class="font-medium text-gray-500">Retail Value:</dt>
							<dd class="col-span-2 text-gray-900">
								{formatCurrency(vehicleValues.retail_value)}
								{#if vehicleValues.retail_total_adjusted_value && vehicleValues.retail_total_adjusted_value !== vehicleValues.retail_value}
									→ {formatCurrency(vehicleValues.retail_total_adjusted_value)}
								{/if}
							</dd>
						</div>
					{/if}
					{#if vehicleValues.borderline_writeoff_retail}
						<div class="grid grid-cols-3 gap-2">
							<dt class="font-medium text-gray-500">Borderline Write-off:</dt>
							<dd class="col-span-2 font-semibold text-orange-600">
								{formatCurrency(vehicleValues.borderline_writeoff_retail)}
							</dd>
						</div>
					{/if}
				</dl>
			</Card>
		{/if}

		<!-- Pre-Incident Estimate -->
		{#if preIncidentEstimate && preIncidentEstimate.total > 0}
			<Card class="p-4">
				<h3 class="mb-3 text-sm font-semibold text-gray-900">Pre-Incident Estimate</h3>
				<dl class="grid gap-3 text-sm">
					<div class="grid grid-cols-3 gap-2">
						<dt class="font-medium text-gray-500">Subtotal:</dt>
						<dd class="col-span-2 text-gray-900">{formatCurrency(preIncidentEstimate.subtotal)}</dd>
					</div>
					<div class="grid grid-cols-3 gap-2">
						<dt class="font-medium text-gray-500">VAT ({preIncidentEstimate.vat_percentage}%):</dt>
						<dd class="col-span-2 text-gray-900">
							{formatCurrency(preIncidentEstimate.vat_amount)}
						</dd>
					</div>
					<div class="grid grid-cols-3 gap-2">
						<dt class="font-medium text-gray-500">Total:</dt>
						<dd class="col-span-2 font-bold text-gray-900">
							{formatCurrency(preIncidentEstimate.total)}
						</dd>
					</div>
				</dl>
			</Card>
		{/if}

		<!-- Repair Estimate with Color Coding -->
		{#if estimate && estimate.total > 0}
			{@const threshold = estimateThreshold()}
			{@const colorClasses = threshold ? getThresholdColorClasses(threshold.color) : null}
			<Card class="p-4">
				<h3 class="mb-3 text-sm font-semibold text-gray-900">Repair Estimate</h3>
				<dl class="grid gap-3 text-sm">
					<div class="grid grid-cols-3 gap-2">
						<dt class="font-medium text-gray-500">Subtotal:</dt>
						<dd class="col-span-2 text-gray-900">{formatCurrency(estimate.subtotal)}</dd>
					</div>
					<div class="grid grid-cols-3 gap-2">
						<dt class="font-medium text-gray-500">VAT ({estimate.vat_percentage}%):</dt>
						<dd class="col-span-2 text-gray-900">{formatCurrency(estimate.vat_amount)}</dd>
					</div>
					<div class="grid grid-cols-3 gap-2">
						<dt class="font-medium text-gray-500">Total:</dt>
						<dd
							class="col-span-2 font-bold {threshold?.color === 'red'
								? 'text-red-600'
								: threshold?.color === 'orange'
									? 'text-orange-600'
									: threshold?.color === 'yellow'
										? 'text-yellow-600'
										: threshold?.color === 'green'
											? 'text-green-600'
											: 'text-gray-900'}"
						>
							{formatCurrency(estimate.total)}
						</dd>
					</div>
					{#if threshold && threshold.message}
						<div class="col-span-3 mt-2 rounded-md border p-2 {colorClasses?.bg} {colorClasses?.border}">
							<p class="text-xs {colorClasses?.text}">
								{threshold.message}
							</p>
						</div>
					{/if}
				</dl>
			</Card>
		{/if}

		<!-- Assessment Result -->
		{#if estimate && estimate.assessment_result}
			{@const resultInfo = getAssessmentResultInfo(estimate.assessment_result)}
			{@const colorClasses = getAssessmentResultColorClasses(resultInfo.color)}
			<Card class="p-4 {colorClasses.bg} border-2 {colorClasses.border}">
				<div class="flex items-center gap-3">
					<div class="flex-shrink-0">
						{#if resultInfo.icon === 'check'}
							<CircleCheck class="h-6 w-6 {colorClasses.text}" />
						{:else if resultInfo.icon === 'alert'}
							<CircleAlert class="h-6 w-6 {colorClasses.text}" />
						{:else if resultInfo.icon === 'x'}
							<CircleX class="h-6 w-6 {colorClasses.text}" />
						{:else if resultInfo.icon === 'ban'}
							<CircleOff class="h-6 w-6 {colorClasses.text}" />
						{/if}
					</div>
					<div class="flex-1">
						<h3 class="text-sm font-semibold {colorClasses.text}">
							Assessment Result: {resultInfo.label}
						</h3>
						<p class="mt-1 text-xs {colorClasses.text} opacity-90">
							{resultInfo.description}
						</p>
					</div>
				</div>
			</Card>
		{/if}

		<!-- Warranty Status -->
		{#if vehicleValues && warrantyInfo()}
			{@const warranty = warrantyInfo() || { color: 'gray', icon: 'info', label: 'Unknown' }}
			{@const statusClasses = getWarrantyStatusClasses(warranty.color)}
			<Card class="p-4 {statusClasses.bg} border-2 {statusClasses.border}">
				<div class="flex items-start gap-3">
					<div class="mt-0.5">
						{#if warranty.icon === 'check'}
							<CircleCheck class="h-5 w-5 {statusClasses.text}" />
						{:else if warranty.icon === 'x'}
							<CircleX class="h-5 w-5 {statusClasses.text}" />
						{:else if warranty.icon === 'info'}
							<Info class="h-5 w-5 {statusClasses.text}" />
						{:else}
							<CircleAlert class="h-5 w-5 {statusClasses.text}" />
						{/if}
					</div>
					<div class="flex-1">
						<h4 class="text-sm font-semibold {statusClasses.text}">
							Warranty Status: {warranty.label}
						</h4>
						{#if vehicleValues.warranty_start_date && vehicleValues.warranty_end_date}
							<p class="mt-1 text-xs {statusClasses.text}">
								Valid from {new Date(vehicleValues.warranty_start_date).toLocaleDateString()} to {new Date(
									vehicleValues.warranty_end_date
								).toLocaleDateString()}
							</p>
						{/if}
						{#if vehicleValues.warranty_expiry_mileage}
							<p class="mt-0.5 text-xs {statusClasses.text}">
								Mileage limit: {vehicleValues.warranty_expiry_mileage === 'unlimited'
									? 'Unlimited'
									: `${parseInt(vehicleValues.warranty_expiry_mileage).toLocaleString()} km`}
							</p>
						{/if}
					</div>
				</div>
			</Card>
		{/if}
	{/if}
</div>

