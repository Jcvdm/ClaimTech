<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
	import FormField from '../forms/FormField.svelte';
	import { Settings, RefreshCw, ChevronDown, ChevronUp, Plus, Building2, Check } from 'lucide-svelte';
	import { repairerService } from '$lib/services/repairer.service';
	import type { Repairer } from '$lib/types/repairer';
	import { formatCurrency } from '$lib/utils/formatters';

	interface Props {
		repairerId?: string | null;
		repairers: Repairer[];
		labourRate: number;
		paintRate: number;
		vatPercentage: number;
		oemMarkup: number;
		altMarkup: number;
		secondHandMarkup: number;
		outworkMarkup: number;
		onUpdateRates: (
			labourRate: number,
			paintRate: number,
			vatPercentage: number,
			oemMarkup: number,
			altMarkup: number,
			secondHandMarkup: number,
			outworkMarkup: number
		) => void;
		onUpdateRepairer: (repairerId: string | null) => void;
		onRepairersUpdate: () => void;
		disabled?: boolean;
	}

	let {
		repairerId = null,
		repairers,
		labourRate,
		paintRate,
		vatPercentage,
		oemMarkup,
		altMarkup,
		secondHandMarkup,
		outworkMarkup,
		onUpdateRates,
		onUpdateRepairer,
		onRepairersUpdate,
		disabled = false
	}: Props = $props();

	let localRepairerId = $state(repairerId || '');
	let localLabourRate = $state(labourRate);
	let localPaintRate = $state(paintRate);
	let localVatPercentage = $state(vatPercentage);
	let localOemMarkup = $state(oemMarkup);
	let localAltMarkup = $state(altMarkup);
	let localSecondHandMarkup = $state(secondHandMarkup);
	let localOutworkMarkup = $state(outworkMarkup);
	let isExpanded = $state(false);
	let showQuickAddModal = $state(false);
	let showAutoPopulateNotification = $state(false);
	let quickAddLoading = $state(false);

	// Quick add form fields
	let newRepairerName = $state('');
	let newRepairerContactName = $state('');
	let newRepairerEmail = $state('');
	let newRepairerPhone = $state('');
	let newLabourRate = $state(500);
	let newPaintRate = $state(2000);
	let newVatPercentage = $state(15);
	let newOemMarkup = $state(25);
	let newAltMarkup = $state(25);
	let newSecondHandMarkup = $state(25);
	let newOutworkMarkup = $state(25);

	let hasChanges = $derived(
		localLabourRate !== labourRate ||
			localPaintRate !== paintRate ||
			localVatPercentage !== vatPercentage ||
			localOemMarkup !== oemMarkup ||
			localAltMarkup !== altMarkup ||
			localSecondHandMarkup !== secondHandMarkup ||
			localOutworkMarkup !== outworkMarkup
	);

	let hasRepairerChanged = $derived(localRepairerId !== (repairerId || ''));

	// Get selected repairer name for display
	let selectedRepairerName = $derived(
		repairers.find((r) => r.id === localRepairerId)?.name || 'None selected'
	);

	function handleUpdateRates() {
		onUpdateRates(
			localLabourRate,
			localPaintRate,
			localVatPercentage,
			localOemMarkup,
			localAltMarkup,
			localSecondHandMarkup,
			localOutworkMarkup
		);
	}

	function handleReset() {
		localLabourRate = labourRate;
		localPaintRate = paintRate;
		localVatPercentage = vatPercentage;
		localOemMarkup = oemMarkup;
		localAltMarkup = altMarkup;
		localSecondHandMarkup = secondHandMarkup;
		localOutworkMarkup = outworkMarkup;
	}

	function handleRepairerChange() {
		const selectedRepairer = repairers.find((r) => r.id === localRepairerId);
		if (selectedRepairer) {
			// Auto-populate rates from repairer's defaults
			localLabourRate = selectedRepairer.default_labour_rate;
			localPaintRate = selectedRepairer.default_paint_rate;
			localVatPercentage = selectedRepairer.default_vat_percentage;
			localOemMarkup = selectedRepairer.default_oem_markup_percentage;
			localAltMarkup = selectedRepairer.default_alt_markup_percentage;
			localSecondHandMarkup = selectedRepairer.default_second_hand_markup_percentage;
			localOutworkMarkup = selectedRepairer.default_outwork_markup_percentage;

			// Show notification
			showAutoPopulateNotification = true;
			setTimeout(() => {
				showAutoPopulateNotification = false;
			}, 3000);
		}
		onUpdateRepairer(localRepairerId || null);
		onUpdateRates(
			localLabourRate,
			localPaintRate,
			localVatPercentage,
			localOemMarkup,
			localAltMarkup,
			localSecondHandMarkup,
			localOutworkMarkup
		);
	}

	async function handleQuickAddRepairer() {
		if (!newRepairerName) {
			return;
		}

		quickAddLoading = true;

		try {
			const newRepairer = await repairerService.createRepairer({
				name: newRepairerName,
				contact_name: newRepairerContactName,
				email: newRepairerEmail,
				phone: newRepairerPhone,
				default_labour_rate: newLabourRate,
				default_paint_rate: newPaintRate,
				default_vat_percentage: newVatPercentage,
				default_oem_markup_percentage: newOemMarkup,
				default_alt_markup_percentage: newAltMarkup,
				default_second_hand_markup_percentage: newSecondHandMarkup,
				default_outwork_markup_percentage: newOutworkMarkup
			});

			// Refresh repairers list
			await onRepairersUpdate();

			// Select the new repairer
			localRepairerId = newRepairer.id;

			// Auto-populate rates
			localLabourRate = newRepairer.default_labour_rate;
			localPaintRate = newRepairer.default_paint_rate;
			localVatPercentage = newRepairer.default_vat_percentage;
			localOemMarkup = newRepairer.default_oem_markup_percentage;
			localAltMarkup = newRepairer.default_alt_markup_percentage;
			localSecondHandMarkup = newRepairer.default_second_hand_markup_percentage;
			localOutworkMarkup = newRepairer.default_outwork_markup_percentage;

			// Update repairer
			onUpdateRepairer(newRepairer.id);

			onUpdateRates(
				localLabourRate,
				localPaintRate,
				localVatPercentage,
				localOemMarkup,
				localAltMarkup,
				localSecondHandMarkup,
				localOutworkMarkup
			);

			// Close modal and reset form
			closeQuickAddModal();

			// Show notification
			showAutoPopulateNotification = true;
			setTimeout(() => {
				showAutoPopulateNotification = false;
			}, 3000);
		} catch (error) {
			console.error('Error creating repairer:', error);
		} finally {
			quickAddLoading = false;
		}
	}

	function closeQuickAddModal() {
		showQuickAddModal = false;
		newRepairerName = '';
		newRepairerContactName = '';
		newRepairerEmail = '';
		newRepairerPhone = '';
		newLabourRate = 500;
		newPaintRate = 2000;
		newVatPercentage = 15;
		newOemMarkup = 25;
		newAltMarkup = 25;
		newSecondHandMarkup = 25;
		newOutworkMarkup = 25;
	}

	// Update local values when props change
	$effect(() => {
		localRepairerId = repairerId || '';
		localLabourRate = labourRate;
		localPaintRate = paintRate;
		localVatPercentage = vatPercentage;
		localOemMarkup = oemMarkup;
		localAltMarkup = altMarkup;
		localSecondHandMarkup = secondHandMarkup;
		localOutworkMarkup = outworkMarkup;
	});

	// Repairer options for dropdown
	let repairerOptions = $derived([
		{ value: '', label: 'None selected' },
		...repairers.map((r) => ({ value: r.id, label: r.name }))
	]);
</script>

<Card class="border-blue-200 bg-blue-50">
	<button
		onclick={() => (isExpanded = !isExpanded)}
		class="flex w-full items-center justify-between p-4 text-left hover:bg-blue-100 transition-colors"
		type="button"
	>
		<div class="flex items-center gap-3">
			<Settings class="h-5 w-5 text-blue-600" />
			<div>
				<h3 class="text-base font-semibold text-gray-900">Rates & Repairer Configuration</h3>
				<p class="text-sm text-gray-600">
					Repairer: {selectedRepairerName}
				</p>
				<p class="text-sm text-gray-600">
					Labour: {formatCurrency(labourRate)}/hr • Paint: {formatCurrency(paintRate)}/panel • VAT: {vatPercentage}%
				</p>
				<p class="text-xs text-gray-500 mt-1">
					Markup: OEM {oemMarkup}% • ALT {altMarkup}% • 2ND {secondHandMarkup}% • Outwork {outworkMarkup}%
				</p>
			</div>
		</div>
		{#if isExpanded}
			<ChevronUp class="h-5 w-5 text-gray-500" />
		{:else}
			<ChevronDown class="h-5 w-5 text-gray-500" />
		{/if}
	</button>

	{#if isExpanded}
		<div class="border-t border-blue-200 p-4 space-y-4">
			<!-- Auto-populate notification -->
			{#if showAutoPopulateNotification}
				<div class="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
					<Check class="h-4 w-4 text-green-600" />
					<span class="text-sm text-green-800">
						Rates auto-populated from repairer defaults
					</span>
				</div>
			{/if}

			<!-- Repairer Selection -->
			<div class="border-b border-gray-200 pb-4">
				<div class="flex items-center gap-2 mb-3">
					<Building2 class="h-5 w-5 text-gray-600" />
					<h4 class="text-sm font-semibold text-gray-900">Repairer</h4>
				</div>
				<div class="flex gap-2">
					<div class="flex-1">
						<FormField
							label=""
							name="repairer_id"
							type="select"
							bind:value={localRepairerId}
							options={repairerOptions}
							onchange={handleRepairerChange}
						/>
					</div>
					<div class="flex items-end">
						<Button type="button" variant="outline" onclick={() => (showQuickAddModal = true)}>
							<Plus class="mr-2 h-4 w-4" />
							Quick Add
						</Button>
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">
					Select a repairer to auto-populate rates with their defaults
				</p>
			</div>

			<!-- Rates Section -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<!-- Labour Rate -->
				<div>
					<label for="labour-rate" class="block text-sm font-medium text-gray-700 mb-2">
						Labour Rate (per hour)
					</label>
					<div class="flex items-center gap-2">
						<span class="text-gray-500">R</span>
		<Input
			id="labour-rate"
			type="number"
			min="0"
			step="0.01"
			bind:value={localLabourRate}
			{disabled}
			onblur={handleUpdateRates}
			class="flex-1"
		/>
					</div>
					<p class="mt-1 text-xs text-gray-500">
						Cost per hour of labour (e.g., R500.00)
					</p>
				</div>

				<!-- Paint Rate -->
				<div>
					<label for="paint-rate" class="block text-sm font-medium text-gray-700 mb-2">
						Paint Rate (per panel)
					</label>
					<div class="flex items-center gap-2">
						<span class="text-gray-500">R</span>
		<Input
			id="paint-rate"
			type="number"
			min="0"
			step="0.01"
			bind:value={localPaintRate}
			{disabled}
			onblur={handleUpdateRates}
			class="flex-1"
		/>
					</div>
					<p class="mt-1 text-xs text-gray-500">
						Cost per panel painted (e.g., R2000.00)
					</p>
				</div>

				<!-- VAT Percentage -->
				<div>
					<label for="vat-percentage" class="block text-sm font-medium text-gray-700 mb-2">
						VAT Percentage
					</label>
					<div class="flex items-center gap-2">
		<Input
			id="vat-percentage"
			type="number"
			min="0"
			max="100"
			step="0.1"
			bind:value={localVatPercentage}
			{disabled}
			onblur={handleUpdateRates}
			class="flex-1"
		/>
						<span class="text-gray-500">%</span>
					</div>
					<p class="mt-1 text-xs text-gray-500">
						VAT percentage (e.g., 15%)
					</p>
				</div>
			</div>

			<!-- Markup Percentages Section -->
			<div class="border-t border-gray-200 pt-4">
				<h4 class="text-sm font-semibold text-gray-900 mb-3">Markup Percentages</h4>
				<p class="text-xs text-gray-600 mb-4">
					Markup is applied to nett prices. Selling Price = Nett Price × (1 + Markup%)
				</p>
				<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
					<!-- OEM Markup -->
					<div>
						<label for="oem-markup" class="block text-sm font-medium text-gray-700 mb-2">
							OEM Markup
						</label>
						<div class="flex items-center gap-2">
				<Input
					id="oem-markup"
					type="number"
					min="0"
					max="100"
					step="0.1"
					bind:value={localOemMarkup}
					{disabled}
					onblur={handleUpdateRates}
					class="flex-1"
				/>
							<span class="text-gray-500">%</span>
						</div>
						<p class="mt-1 text-xs text-gray-500">
							Original Equipment Manufacturer
						</p>
					</div>

					<!-- Aftermarket Markup -->
					<div>
						<label for="alt-markup" class="block text-sm font-medium text-gray-700 mb-2">
							Aftermarket Markup
						</label>
						<div class="flex items-center gap-2">
				<Input
					id="alt-markup"
					type="number"
					min="0"
					max="100"
					step="0.1"
					bind:value={localAltMarkup}
					{disabled}
					onblur={handleUpdateRates}
					class="flex-1"
				/>
							<span class="text-gray-500">%</span>
						</div>
						<p class="mt-1 text-xs text-gray-500">
							Alternative/Aftermarket parts
						</p>
					</div>

					<!-- Second Hand Markup -->
					<div>
						<label for="second-hand-markup" class="block text-sm font-medium text-gray-700 mb-2">
							Second Hand Markup
						</label>
						<div class="flex items-center gap-2">
				<Input
					id="second-hand-markup"
					type="number"
					min="0"
					max="100"
					step="0.1"
					bind:value={localSecondHandMarkup}
					{disabled}
					onblur={handleUpdateRates}
					class="flex-1"
				/>
							<span class="text-gray-500">%</span>
						</div>
						<p class="mt-1 text-xs text-gray-500">
							Used/Second Hand parts
						</p>
					</div>

					<!-- Outwork Markup -->
					<div>
						<label for="outwork-markup" class="block text-sm font-medium text-gray-700 mb-2">
							Outwork Markup
						</label>
						<div class="flex items-center gap-2">
				<Input
					id="outwork-markup"
					type="number"
					min="0"
					max="100"
					step="0.1"
					bind:value={localOutworkMarkup}
					{disabled}
					onblur={handleUpdateRates}
					class="flex-1"
				/>
							<span class="text-gray-500">%</span>
						</div>
						<p class="mt-1 text-xs text-gray-500">
							Outsourced work charges
						</p>
					</div>
				</div>
			</div>

			{#if hasChanges}
				<div class="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-md">
					<div class="flex items-center gap-2">
						<RefreshCw class="h-4 w-4 text-yellow-600" />
						<span class="text-sm text-yellow-800">
							Rates have changed. Click "Update Rates" to recalculate all line items.
						</span>
					</div>
				<div class="flex gap-2">
					<Button variant="outline" size="sm" onclick={handleReset}>
						Cancel
					</Button>
					<Button size="sm" onclick={handleUpdateRates} disabled={disabled}>
						Update Rates
					</Button>
				</div>
				</div>
			{/if}

			<div class="text-xs text-gray-600 bg-white p-3 rounded border border-gray-200">
				<p class="font-medium mb-1">How rates work:</p>
				<ul class="list-disc list-inside space-y-1">
					<li>Labour: Enter hours (e.g., 1.5) × Labour Rate = Labour Cost</li>
					<li>Paint: Enter panels (e.g., 2) × Paint Rate = Paint Cost</li>
					<li>VAT: Applied to subtotal to calculate final total</li>
					<li>Changing rates will recalculate all existing line items</li>
				</ul>
			</div>
		</div>
	{/if}
</Card>

<!-- Quick Add Repairer Modal -->
<Dialog.Root open={showQuickAddModal} onOpenChange={(open) => !open && closeQuickAddModal()}>
	<Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Quick Add Repairer</Dialog.Title>
		</Dialog.Header>

		<div class="space-y-4">
			<div class="grid gap-4 md:grid-cols-2">
				<FormField
					label="Repairer Name"
					name="new_repairer_name"
					type="text"
					bind:value={newRepairerName}
					required
					placeholder="e.g., ABC Body Shop"
				/>

				<FormField
					label="Contact Name"
					name="new_repairer_contact_name"
					type="text"
					bind:value={newRepairerContactName}
					placeholder="Primary contact"
				/>

				<FormField
					label="Email"
					name="new_repairer_email"
					type="email"
					bind:value={newRepairerEmail}
					placeholder="contact@example.com"
				/>

				<FormField
					label="Phone"
					name="new_repairer_phone"
					type="text"
					bind:value={newRepairerPhone}
					placeholder="+27 11 123 4567"
				/>
			</div>

			<div class="border-t pt-4">
				<h4 class="font-semibold mb-3 text-sm">Default Rates</h4>
				<div class="grid gap-4 md:grid-cols-3">
					<FormField
						label="Labour Rate"
						name="new_labour_rate"
						type="number"
						bind:value={newLabourRate}
						step="0.01"
						min="0"
					/>

					<FormField
						label="Paint Rate"
						name="new_paint_rate"
						type="number"
						bind:value={newPaintRate}
						step="0.01"
						min="0"
					/>

					<FormField
						label="VAT %"
						name="new_vat_percentage"
						type="number"
						bind:value={newVatPercentage}
						step="0.01"
						min="0"
						max="100"
					/>
				</div>
			</div>

			<div class="border-t pt-4">
				<h4 class="font-semibold mb-3 text-sm">Default Markup Percentages</h4>
				<div class="grid gap-4 md:grid-cols-4">
					<FormField
						label="OEM %"
						name="new_oem_markup"
						type="number"
						bind:value={newOemMarkup}
						step="0.01"
						min="0"
						max="100"
					/>

					<FormField
						label="Aftermarket %"
						name="new_alt_markup"
						type="number"
						bind:value={newAltMarkup}
						step="0.01"
						min="0"
						max="100"
					/>

					<FormField
						label="Second Hand %"
						name="new_second_hand_markup"
						type="number"
						bind:value={newSecondHandMarkup}
						step="0.01"
						min="0"
						max="100"
					/>

					<FormField
						label="Outwork %"
						name="new_outwork_markup"
						type="number"
						bind:value={newOutworkMarkup}
						step="0.01"
						min="0"
						max="100"
					/>
				</div>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={closeQuickAddModal}>Cancel</Button>
			<Button onclick={handleQuickAddRepairer} disabled={quickAddLoading || !newRepairerName}>
				{quickAddLoading ? 'Adding...' : 'Add Repairer'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

