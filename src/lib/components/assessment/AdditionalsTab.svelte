<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import RatesAndRepairerConfiguration from './RatesAndRepairerConfiguration.svelte';
	import QuickAddLineItem from './QuickAddLineItem.svelte';
	import DeclineReasonModal from './DeclineReasonModal.svelte';
	import CombinedTotalsSummary from './CombinedTotalsSummary.svelte';
	import OriginalEstimateLinesPanel from './OriginalEstimateLinesPanel.svelte';
	import AdditionalsPhotosPanel from './AdditionalsPhotosPanel.svelte';
	import { Check, X, Clock, Trash2 } from 'lucide-svelte';
	import type {
		AssessmentAdditionals,
		AdditionalLineItem,
		Estimate,
		EstimateLineItem,
		Repairer,
		VehicleValues,
		AdditionalsPhoto
	} from '$lib/types/assessment';
	import { additionalsService } from '$lib/services/additionals.service';
	import { additionalsPhotosService } from '$lib/services/additionals-photos.service';

	interface Props {
		assessmentId: string;
		estimate: Estimate;
		vehicleValues: VehicleValues | null;
		repairers: Repairer[];
		onUpdate: () => Promise<void>;
	}

	let { assessmentId, estimate, vehicleValues, repairers, onUpdate }: Props = $props();

	let additionals = $state<AssessmentAdditionals | null>(null);
	let additionalsPhotos = $state<AdditionalsPhoto[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showDeclineModal = $state(false);
	let selectedLineItemId = $state<string | null>(null);

	// Removed original line IDs (from additionals line_items with action='removed')
	let removedOriginalLineIds = $derived(() =>
		(additionals?.line_items || [])
			.filter((item) => item.action === 'removed' && item.original_line_id)
			.map((item) => item.original_line_id!)
	);

	// Load or create additionals
	async function loadAdditionals() {
		loading = true;
		error = null;
		try {
			let data = await additionalsService.getByAssessment(assessmentId);

			// Create if doesn't exist (snapshot rates from estimate)
			if (!data) {
				data = await additionalsService.createDefault(assessmentId, estimate);
			}

			additionals = data;

			// Load additionals photos
			if (data.id) {
				additionalsPhotos = await additionalsPhotosService.getPhotosByAdditionals(data.id);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load additionals';
		} finally {
			loading = false;
		}
	}

	// Add line item
	async function handleAddLineItem(item: any) {
		if (!additionals) return;

		try {
			error = null;
			await additionalsService.addLineItem(assessmentId, item);
			await loadAdditionals();
			await onUpdate();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to add line item';
		}
	}

	// Approve line item
	async function handleApprove(lineItemId: string) {
		try {
			error = null;
			await additionalsService.approveLineItem(assessmentId, lineItemId);
			await loadAdditionals();
			await onUpdate();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to approve item';
		}
	}

	// Open decline modal
	function handleDeclineClick(lineItemId: string) {
		selectedLineItemId = lineItemId;
		showDeclineModal = true;
	}

	// Decline line item with reason
	async function handleDecline(reason: string) {
		if (!selectedLineItemId) return;

		try {
			error = null;
			await additionalsService.declineLineItem(assessmentId, selectedLineItemId, reason);
			await loadAdditionals();
			await onUpdate();
			showDeclineModal = false;
			selectedLineItemId = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to decline item';
		}
	}

	// Delete line item (pending only)
	async function handleDelete(lineItemId: string) {
		if (!confirm('Delete this line item?')) return;

		try {
			error = null;
			await additionalsService.deleteLineItem(assessmentId, lineItemId);
			await loadAdditionals();
			await onUpdate();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete item';
		}
	}

	// Remove original estimate line (creates negative line item in additionals)
	async function handleRemoveOriginal(originalItem: EstimateLineItem) {
		if (!additionals) return;

		try {
			error = null;
			await additionalsService.addRemovedLineItem(assessmentId, originalItem);
			await loadAdditionals();
			await onUpdate();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to remove original line';
		}
	}

	// Refresh photos
	async function handlePhotosUpdate() {
		if (additionals?.id) {
			additionalsPhotos = await additionalsPhotosService.getPhotosByAdditionals(additionals.id);
		}
		await onUpdate();
	}

	// Get status badge
	function getStatusBadge(status: string) {
		switch (status) {
			case 'approved':
				return { variant: 'default', class: 'bg-green-100 text-green-800', icon: Check };
			case 'declined':
				return { variant: 'secondary', class: 'bg-red-100 text-red-800', icon: X };
			default:
				return { variant: 'secondary', class: 'bg-yellow-100 text-yellow-800', icon: Clock };
		}
	}

	// Count by status
	const statusCounts = $derived(() => {
		if (!additionals) return { pending: 0, approved: 0, declined: 0 };
		return additionals.line_items.reduce(
			(acc, item) => {
				acc[item.status]++;
				return acc;
			},
			{ pending: 0, approved: 0, declined: 0 }
		);
	});

	$effect(() => {
		loadAdditionals();
	});
</script>

<div class="space-y-6">
	{#if loading}
		<Card class="p-6">
			<p class="text-center text-gray-600">Loading additionals...</p>
		</Card>
	{:else if error}
		<Card class="p-6 border-red-200 bg-red-50">
			<p class="text-red-800">{error}</p>
		</Card>
	{:else if additionals}
		<!-- Info Banner -->
		<Card class="p-4 bg-blue-50 border-blue-200">
			<p class="text-sm text-blue-900">
				<strong>Additionals:</strong> Add new line items to this finalized estimate. Rates and repairer
				are locked from the original estimate. You can exclude lines from the original estimate or
				replace them with repair items.
			</p>
		</Card>

		<!-- Combined Totals Summary with Risk Indicator -->
		<CombinedTotalsSummary
			{estimate}
			{additionals}
			{vehicleValues}
		/>

		<!-- Original Estimate Lines Management -->
		<OriginalEstimateLinesPanel
			{estimate}
			removedOriginalLineIds={removedOriginalLineIds()}
			onRemoveOriginal={handleRemoveOriginal}
		/>

		<!-- Rates Display (Read-only) -->
		<RatesAndRepairerConfiguration
			estimate={additionals}
			repairers={repairers}
			disabled={true}
			onUpdate={() => {}}
		/>

		<!-- Quick Add Line Item -->
		<QuickAddLineItem
			labourRate={additionals.labour_rate}
			paintRate={additionals.paint_rate}
			oemMarkup={additionals.oem_markup_percentage}
			altMarkup={additionals.alt_markup_percentage}
			secondHandMarkup={additionals.second_hand_markup_percentage}
			outworkMarkup={additionals.outwork_markup_percentage}
			onAddLineItem={handleAddLineItem}
		/>

		<!-- Line Items Table -->
		<Card class="p-6">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-semibold">Additional Line Items</h3>
				<div class="flex gap-2">
					<Badge class="bg-yellow-100 text-yellow-800">
						{statusCounts().pending} Pending
					</Badge>
					<Badge class="bg-green-100 text-green-800">
						{statusCounts().approved} Approved
					</Badge>
					<Badge class="bg-red-100 text-red-800">
						{statusCounts().declined} Declined
					</Badge>
				</div>
			</div>

			{#if additionals.line_items.length === 0}
				<p class="text-center text-gray-500 py-8">No additional items yet</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead class="border-b">
							<tr class="text-left">
								<th class="pb-2 font-medium">Type</th>
								<th class="pb-2 font-medium">Description</th>
								<th class="pb-2 font-medium text-right">Part</th>
								<th class="pb-2 font-medium text-right">S&A</th>
								<th class="pb-2 font-medium text-right">Labour</th>
								<th class="pb-2 font-medium text-right">Paint</th>
								<th class="pb-2 font-medium text-right">Outwork</th>
								<th class="pb-2 font-medium text-right">Total</th>
								<th class="pb-2 font-medium">Status</th>
								<th class="pb-2 font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each additionals.line_items as item (item.id)}
								{@const statusBadge = getStatusBadge(item.status)}
								{@const isRemoved = item.action === 'removed'}
								<tr class="border-b hover:bg-gray-50 {isRemoved ? 'bg-red-50' : ''}">
									<td class="py-2">{item.process_type}</td>
									<td class="py-2">
										<span class={isRemoved ? 'line-through text-red-600' : ''}>
											{item.description}
										</span>
										{#if item.decline_reason}
											<p class="text-xs text-red-600 mt-1">Reason: {item.decline_reason}</p>
										{/if}
									</td>
									<td class="py-2 text-right {isRemoved ? 'text-red-600' : ''}">R {(item.part_price || 0).toFixed(2)}</td>
									<td class="py-2 text-right {isRemoved ? 'text-red-600' : ''}">R {(item.strip_assemble || 0).toFixed(2)}</td>
									<td class="py-2 text-right {isRemoved ? 'text-red-600' : ''}">R {(item.labour_cost || 0).toFixed(2)}</td>
									<td class="py-2 text-right {isRemoved ? 'text-red-600' : ''}">R {(item.paint_cost || 0).toFixed(2)}</td>
									<td class="py-2 text-right {isRemoved ? 'text-red-600' : ''}">R {(item.outwork_charge || 0).toFixed(2)}</td>
									<td class="py-2 text-right font-medium {isRemoved ? 'text-red-600' : ''}">R {item.total.toFixed(2)}</td>
									<td class="py-2">
										{#if isRemoved}
											<Badge class="bg-red-100 text-red-800">
												<Trash2 class="h-3 w-3 mr-1" />
												Removed
											</Badge>
										{:else}
											<Badge class={statusBadge.class}>
												<svelte:component this={statusBadge.icon} class="h-3 w-3 mr-1" />
												{item.status}
											</Badge>
										{/if}
									</td>
									<td class="py-2">
										<div class="flex gap-1">
											{#if !isRemoved && item.status === 'pending' && item.id}
												<Button
													size="sm"
													onclick={() => handleApprove(item.id!)}
													class="h-7 px-2"
													title="Approve"
												>
													<Check class="h-3 w-3" />
												</Button>
												<Button
													size="sm"
													variant="outline"
													onclick={() => handleDeclineClick(item.id!)}
													class="h-7 px-2"
													title="Decline"
												>
													<X class="h-3 w-3" />
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onclick={() => handleDelete(item.id!)}
													class="h-7 px-2 text-red-600"
													title="Delete"
												>
													<Trash2 class="h-3 w-3" />
												</Button>
											{:else if isRemoved}
												<span class="text-xs text-gray-500 italic">Auto-approved</span>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</Card>

		<!-- Totals (Approved Only) -->
		<Card class="p-6 bg-green-50 border-green-200">
			<h3 class="text-lg font-semibold mb-4">Approved Additionals Total</h3>
			<div class="space-y-2">
				<div class="flex justify-between">
					<span>Subtotal (Approved):</span>
					<span class="font-medium">R {additionals.subtotal_approved.toFixed(2)}</span>
				</div>
				<div class="flex justify-between">
					<span>VAT ({additionals.vat_percentage}%):</span>
					<span class="font-medium">R {additionals.vat_amount_approved.toFixed(2)}</span>
				</div>
				<div class="flex justify-between text-lg font-bold border-t pt-2">
					<span>Total (Approved):</span>
					<span>R {additionals.total_approved.toFixed(2)}</span>
				</div>
			</div>
		</Card>

		<!-- Additional Photos -->
		<AdditionalsPhotosPanel
			additionalsId={additionals.id}
			{assessmentId}
			photos={additionalsPhotos}
			onUpdate={handlePhotosUpdate}
		/>
	{/if}
</div>

<!-- Decline Reason Modal -->
{#if showDeclineModal}
	<DeclineReasonModal
		onConfirm={handleDecline}
		onCancel={() => {
			showDeclineModal = false;
			selectedLineItemId = null;
		}}
	/>
{/if}

