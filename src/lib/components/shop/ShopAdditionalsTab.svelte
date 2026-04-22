<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import AdditionalLineItemCard from '$lib/components/assessment/AdditionalLineItemCard.svelte';
	import QuickAddLineItem from '$lib/components/assessment/QuickAddLineItem.svelte';
	import DeclineReasonModal from '$lib/components/assessment/DeclineReasonModal.svelte';
	import ReversalReasonModal from '$lib/components/assessment/ReversalReasonModal.svelte';
	import { formatCurrency } from '$lib/utils/formatters';
	import { toast } from 'svelte-sonner';
	import {
		Plus,
		Trash2
	} from 'lucide-svelte';
	import type { ShopAdditionals, ShopAdditionalLineItem } from '$lib/types/shop-additionals';
	import type { EstimateLineItem } from '$lib/types/assessment';

	interface Props {
		jobId: string;
		additionals: ShopAdditionals | null;
		estimateLineItems: EstimateLineItem[];
		labourRate: number;
		paintRate: number;
		oemMarkup: number;
		altMarkup: number;
		secondHandMarkup: number;
		outworkMarkup: number;
		vatRate: number;
		estimateSubtotal: number;
		estimateVatAmount: number;
		estimateTotal: number;
		canEdit: boolean;
		onUpdate: () => Promise<void>;
	}

	let {
		jobId,
		additionals,
		estimateLineItems,
		labourRate,
		paintRate,
		oemMarkup,
		altMarkup,
		secondHandMarkup,
		outworkMarkup,
		vatRate,
		estimateSubtotal,
		estimateVatAmount,
		estimateTotal,
		canEdit,
		onUpdate
	}: Props = $props();

	// Modal state
	let showDeclineModal = $state(false);
	let selectedLineItemId = $state<string | null>(null);
	let showReversalModal = $state(false);
	let reversalAction = $state<'reverse' | 'reinstate' | 'reinstate-original' | null>(null);
	let reversalTargetId = $state<string | null>(null);

	// Derived sets for tracking removed and reversed items
	const removedOriginalIds = $derived(
		new Set(
			(additionals?.line_items ?? [])
				.filter((li) => li.action === 'removed' && li.original_line_id)
				.map((li) => li.original_line_id!)
		)
	);

	const reversedTargets = $derived(
		new Set(
			(additionals?.line_items ?? [])
				.filter((li) => li.action === 'reversal' && li.reverses_line_id)
				.map((li) => li.reverses_line_id!)
		)
	);

	const reversedBy = $derived(() => {
		const map = new Map<string, ShopAdditionalLineItem>();
		(additionals?.line_items ?? []).forEach((li) => {
			if (li.action === 'reversal' && li.reverses_line_id) {
				map.set(li.reverses_line_id, li);
			}
		});
		return map;
	});

	const statusCounts = $derived(() => {
		if (!additionals) return { pending: 0, approved: 0, declined: 0, reversed: 0 };

		const rset = reversedTargets;

		return (additionals.line_items ?? []).reduce(
			(acc, item) => {
				if (item.action === 'reversal' || (item.id && rset.has(item.id))) {
					acc.reversed++;
					return acc;
				}
				acc[item.status]++;
				return acc;
			},
			{ pending: 0, approved: 0, declined: 0, reversed: 0 }
		);
	});

	// Combined totals calculations
	const removedTotal = $derived(() => {
		if (!additionals) return 0;
		return (additionals.line_items ?? [])
			.filter((li) => li.action === 'removed')
			.reduce((sum, li) => sum + (li.total || 0), 0);
	});

	const approvedAdditionalsTotal = $derived(() => {
		if (!additionals) return 0;
		return additionals.subtotal_approved;
	});

	const combinedSubtotal = $derived(() => {
		return estimateSubtotal - removedTotal() + approvedAdditionalsTotal();
	});

	const combinedVat = $derived(() => {
		return combinedSubtotal() * (vatRate / 100);
	});

	const combinedTotal = $derived(() => {
		return combinedSubtotal() + combinedVat();
	});

	const originalTotal = $derived(() => {
		if (additionals?.original_total != null) return additionals.original_total;
		return estimateTotal;
	});

	const delta = $derived(() => {
		return combinedTotal() - originalTotal();
	});

	// ---- Server action helpers ----

	async function postAction(actionName: string, body: FormData): Promise<boolean> {
		const res = await fetch(`?/${actionName}`, { method: 'POST', body });
		return res.ok;
	}

	// ---- Create additionals ----

	async function handleCreate() {
		const formData = new FormData();
		const ok = await postAction('createAdditionals', formData);
		if (ok) {
			toast.success('Additionals record created');
			await onUpdate();
		} else {
			toast.error('Failed to create additionals');
		}
	}

	// ---- Original estimate line removal ----

	async function handleRemoveOriginal(item: EstimateLineItem) {
		const formData = new FormData();
		formData.set('line_item', JSON.stringify(item));
		const ok = await postAction('removeEstimateLineItem', formData);
		if (ok) {
			toast.success('Item marked as removed');
			await onUpdate();
		} else {
			toast.error('Failed to remove item');
		}
	}

	// ---- Add additional line item ----

	async function handleAddLineItem(item: EstimateLineItem) {
		const formData = new FormData();
		formData.set('line_item', JSON.stringify(item));
		const ok = await postAction('addAdditionalLineItem', formData);
		if (ok) {
			toast.success('Line item added');
			await onUpdate();
		} else {
			toast.error('Failed to add line item');
		}
	}

	// ---- Approve / Decline / Delete ----

	async function handleApprove(lineItemId: string) {
		const formData = new FormData();
		formData.set('line_item_id', lineItemId);
		const ok = await postAction('approveAdditionalLineItem', formData);
		if (ok) {
			toast.success('Item approved');
			await onUpdate();
		} else {
			toast.error('Failed to approve item');
		}
	}

	function handleDeclineClick(lineItemId: string) {
		selectedLineItemId = lineItemId;
		showDeclineModal = true;
	}

	async function handleDeclineConfirm(reason: string) {
		if (!selectedLineItemId) return;
		const formData = new FormData();
		formData.set('line_item_id', selectedLineItemId);
		formData.set('reason', reason);
		const ok = await postAction('declineAdditionalLineItem', formData);
		if (ok) {
			toast.success('Item declined');
			showDeclineModal = false;
			selectedLineItemId = null;
			await onUpdate();
		} else {
			toast.error('Failed to decline item');
		}
	}

	function handleDeclineCancel() {
		showDeclineModal = false;
		selectedLineItemId = null;
	}

	async function handleDelete(lineItemId: string) {
		if (!confirm('Delete this line item?')) return;
		const formData = new FormData();
		formData.set('line_item_id', lineItemId);
		const ok = await postAction('deleteAdditionalLineItem', formData);
		if (ok) {
			toast.success('Item deleted');
			await onUpdate();
		} else {
			toast.error('Failed to delete item');
		}
	}

	// ---- Reverse / Reinstate ----

	function handleReverseClick(lineItemId: string) {
		reversalAction = 'reverse';
		reversalTargetId = lineItemId;
		showReversalModal = true;
	}

	function handleReinstateClick(lineItemId: string) {
		reversalAction = 'reinstate';
		reversalTargetId = lineItemId;
		showReversalModal = true;
	}

	function handleReinstateOriginalClick(originalLineId: string) {
		reversalAction = 'reinstate-original';
		reversalTargetId = originalLineId;
		showReversalModal = true;
	}

	async function handleReversalConfirm(reason: string) {
		if (!reversalTargetId || !reversalAction) return;

		const formData = new FormData();
		formData.set('line_item_id', reversalTargetId);
		formData.set('reason', reason);

		let actionName: string;
		if (reversalAction === 'reverse') {
			actionName = 'reverseAdditionalLineItem';
		} else if (reversalAction === 'reinstate') {
			actionName = 'reinstateAdditionalLineItem';
		} else {
			actionName = 'reinstateOriginalLineItem';
		}

		const ok = await postAction(actionName, formData);
		if (ok) {
			toast.success('Action completed');
			showReversalModal = false;
			reversalAction = null;
			reversalTargetId = null;
			await onUpdate();
		} else {
			toast.error('Failed to process reversal');
		}
	}

	function handleReversalCancel() {
		showReversalModal = false;
		reversalAction = null;
		reversalTargetId = null;
	}

</script>

<div class="space-y-6">
	<!-- Section 1: Create Additionals (if not yet created) -->
	{#if !additionals}
		<Card.Root>
			<Card.Content class="py-8 text-center">
				<p class="mb-4 text-sm text-gray-500">
					No additionals record exists yet. Create one to track additional work items
					and removals from the original estimate.
				</p>
				{#if canEdit}
					<Button onclick={handleCreate}>
						<Plus class="mr-2 h-4 w-4" />
						Create Additionals
					</Button>
				{/if}
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Section 2: Original Estimate Lines -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Original Estimate Lines</Card.Title>
				<Card.Description>
					Items from the original estimate. Remove items that are no longer applicable.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if estimateLineItems.length === 0}
					<p class="text-sm text-gray-500">No estimate line items found.</p>
				{:else}
					<div class="divide-y">
						{#each estimateLineItems as item (item.id)}
							{@const isRemoved = removedOriginalIds.has(item.id ?? '')}
							<div class="flex items-center justify-between py-2">
								<div class="flex min-w-0 flex-1 items-center gap-2">
									<Badge
										class={item.process_type === 'N'
											? 'bg-blue-500 text-white'
											: item.process_type === 'R'
												? 'bg-amber-500 text-white'
												: item.process_type === 'P'
													? 'bg-purple-500 text-white'
													: item.process_type === 'O'
														? 'bg-cyan-500 text-white'
														: item.process_type === 'A'
															? 'bg-slate-500 text-white'
															: 'bg-muted text-muted-foreground'}
									>
										{item.process_type}
									</Badge>
									<span
										class="truncate text-sm {isRemoved
											? 'text-gray-400 line-through'
											: ''}"
									>
										{item.description || 'No description'}
									</span>
								</div>
								<div class="flex shrink-0 items-center gap-2">
									<span class="text-sm font-medium">{formatCurrency(item.total || 0)}</span>
									{#if isRemoved}
										<Badge variant="destructive" class="text-xs">Removed</Badge>
									{:else if canEdit}
										<Button
											variant="ghost"
											size="sm"
											class="h-7 w-7 p-0"
											onclick={() => handleRemoveOriginal(item)}
											title="Remove from estimate"
										>
											<Trash2 class="h-3.5 w-3.5 text-red-500" />
										</Button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Section 3: Quick Add Line Item -->
		{#if canEdit}
			<Card.Root>
				<Card.Header>
					<Card.Title>Add Additional Item</Card.Title>
					<Card.Description>Add new repair items, parts, or outwork discovered during the job.</Card.Description>
				</Card.Header>
				<Card.Content>
					<QuickAddLineItem
						labourRate={additionals.labour_rate || labourRate}
						paintRate={additionals.paint_rate || paintRate}
						oemMarkup={additionals.oem_markup_pct || oemMarkup}
						altMarkup={additionals.alt_markup_pct || altMarkup}
						secondHandMarkup={additionals.second_hand_markup_pct || secondHandMarkup}
						outworkMarkup={additionals.outwork_markup_pct || outworkMarkup}
						onAddLineItem={handleAddLineItem}
					/>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Section 4: Additional Line Items -->
		<Card.Root>
			<Card.Header>
				<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<Card.Title>Additional Line Items</Card.Title>
					<!-- Section 5: Status Count Badges -->
					<div class="flex flex-wrap gap-1.5">
						<Badge class="bg-yellow-100 text-yellow-800 text-xs">
							{statusCounts().pending} Pending
						</Badge>
						<Badge class="bg-green-100 text-green-800 text-xs">
							{statusCounts().approved} Approved
						</Badge>
						<Badge class="bg-red-100 text-red-800 text-xs">
							{statusCounts().declined} Declined
						</Badge>
						<Badge class="bg-blue-100 text-blue-800 text-xs">
							{statusCounts().reversed} Reversed
						</Badge>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				{#if (additionals.line_items ?? []).length === 0}
					<div class="flex flex-col items-center justify-center py-10 text-center">
						<div class="mb-3 rounded-full bg-slate-100 p-3">
							<Plus class="h-6 w-6 text-slate-400" />
						</div>
						<p class="text-sm text-slate-600">No additional items yet.</p>
						<p class="mt-1 text-xs text-slate-500">Use the form above to add items.</p>
					</div>
				{:else}
					<!-- Card Layout (all screen sizes) -->
					<div class="space-y-3">
						{#each additionals.line_items as item (item.id)}
							{@const isRemoved = item.action === 'removed'}
							{@const isReversal = item.action === 'reversal'}
							{@const isReversed = !!(item.id && reversedTargets.has(item.id))}
							{@const reversalEntry = item.id ? reversedBy().get(item.id) : null}
							<AdditionalLineItemCard
								item={item as any}
								{isRemoved}
								{isReversal}
								{isReversed}
								reversalReason={reversalEntry?.reversal_reason}
								labourRate={additionals.labour_rate || labourRate}
								paintRate={additionals.paint_rate || paintRate}
								onUpdateDescription={() => {}}
								onUpdatePartType={() => {}}
								onEditPartPrice={() => {}}
								onEditSA={() => {}}
								onEditLabour={() => {}}
								onEditPaint={() => {}}
								onEditOutwork={() => {}}
								onApprove={() => handleApprove(item.id!)}
								onDecline={() => handleDeclineClick(item.id!)}
								onDelete={() => handleDelete(item.id!)}
								onReverse={() => handleReverseClick(item.id!)}
								onReinstate={() => handleReinstateClick(item.id!)}
								onReinstateOriginal={() => handleReinstateOriginalClick(item.original_line_id!)}
							/>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Section 6: Combined Totals -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Combined Totals</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="space-y-1.5 text-sm">
					<div class="flex justify-between">
						<span class="text-gray-600">Original Estimate Subtotal</span>
						<span class="font-medium">{formatCurrency(estimateSubtotal)}</span>
					</div>
					{#if removedTotal() > 0}
						<div class="flex justify-between text-red-600">
							<span>Removed Items</span>
							<span class="font-medium">- {formatCurrency(removedTotal())}</span>
						</div>
					{/if}
					{#if approvedAdditionalsTotal() > 0}
						<div class="flex justify-between text-green-600">
							<span>Approved Additionals</span>
							<span class="font-medium">+ {formatCurrency(approvedAdditionalsTotal())}</span>
						</div>
					{/if}

					<Separator class="my-2" />

					<div class="flex justify-between font-medium">
						<span>Combined Subtotal (Ex VAT)</span>
						<span>{formatCurrency(combinedSubtotal())}</span>
					</div>
					<div class="flex justify-between text-gray-600">
						<span>VAT ({vatRate}%)</span>
						<span>{formatCurrency(combinedVat())}</span>
					</div>

					<Separator class="my-2" />

					<div class="flex justify-between text-base font-bold">
						<span>Grand Total</span>
						<span>{formatCurrency(combinedTotal())}</span>
					</div>

					<Separator class="my-2" />

					<div class="flex justify-between text-gray-500">
						<span>Original Total (Snapshot)</span>
						<span>{formatCurrency(originalTotal())}</span>
					</div>
					<div
						class="flex justify-between font-medium {delta() > 0
							? 'text-green-600'
							: delta() < 0
								? 'text-red-600'
								: 'text-gray-500'}"
					>
						<span>Delta</span>
						<span>
							{delta() >= 0 ? '+' : ''}{formatCurrency(delta())}
						</span>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<!-- Section 7: Modals -->
{#if showDeclineModal}
	<DeclineReasonModal
		onConfirm={handleDeclineConfirm}
		onCancel={handleDeclineCancel}
	/>
{/if}

{#if showReversalModal}
	<ReversalReasonModal
		title={reversalAction === 'reverse'
			? 'Reverse Approved Item'
			: reversalAction === 'reinstate'
				? 'Reinstate Declined Item'
				: 'Reinstate Removed Line'}
		description={reversalAction === 'reverse'
			? 'Provide a reason for reversing this approved item.'
			: reversalAction === 'reinstate'
				? 'Provide a reason for reinstating this declined item.'
				: 'Provide a reason for reinstating this removed estimate line.'}
		onConfirm={handleReversalConfirm}
		onCancel={handleReversalCancel}
	/>
{/if}
