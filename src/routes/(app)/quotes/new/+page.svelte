<script lang="ts">
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import FormField from '$lib/components/forms/FormField.svelte';
	import ItemTable, { type LineItem } from '$lib/components/forms/ItemTable.svelte';
	import FileUpload from '$lib/components/forms/FileUpload.svelte';
	import FormActions from '$lib/components/forms/FormActions.svelte';
	import { Card } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Button } from '$lib/components/ui/button';

	let customerName = $state('');
	let quoteNumber = $state('');
	let orderNumber = $state('');
	let quoteDate = $state(new Date().toISOString().split('T')[0]);
	let expiryDate = $state('');
	let items: LineItem[] = $state([]);
	let notes = $state('');
	let termsAndConditions = $state('');
	let files = $state<File[]>([]);
	let loading = $state(false);

	const customerOptions = [
		{ value: '', label: 'Select a customer...' },
		{ value: 'cust1', label: 'ABC Insurance Co.' },
		{ value: 'cust2', label: 'XYZ Motors' },
		{ value: 'cust3', label: 'Premium Auto Body' }
	];

	function handleSaveDraft() {
		loading = true;
		console.log('Saving draft...', {
			customerName,
			quoteNumber,
			orderNumber,
			quoteDate,
			expiryDate,
			items,
			notes,
			termsAndConditions,
			files
		});
		setTimeout(() => {
			loading = false;
			alert('Draft saved successfully!');
		}, 1000);
	}

	function handleSaveAndSend() {
		loading = true;
		console.log('Saving and sending...', {
			customerName,
			quoteNumber,
			orderNumber,
			quoteDate,
			expiryDate,
			items,
			notes,
			termsAndConditions,
			files
		});
		setTimeout(() => {
			loading = false;
			alert('Quote sent successfully!');
		}, 1000);
	}

	function handleCancel() {
		if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
			window.history.back();
		}
	}
</script>

<div class="mx-auto max-w-5xl space-y-6">
	<PageHeader title="New Quote" description="Create a new quote for vehicle repair estimate">
		{#snippet actions()}
			<Button variant="outline" onclick={handleCancel}>Cancel</Button>
		{/snippet}
	</PageHeader>

	<Card class="p-6">
		<div class="space-y-6">
			<!-- Customer Information -->
			<div>
				<h2 class="mb-4 text-lg font-semibold text-gray-900">Customer Information</h2>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormField
						label="Customer Name"
						name="customerName"
						type="select"
						bind:value={customerName}
						options={customerOptions}
						required
					/>
					<FormField
						label="Quote Number"
						name="quoteNumber"
						bind:value={quoteNumber}
						placeholder="Auto-generated"
					/>
					<FormField
						label="Order Number"
						name="orderNumber"
						bind:value={orderNumber}
						placeholder="Optional"
					/>
					<FormField
						label="Quote Date"
						name="quoteDate"
						type="date"
						bind:value={quoteDate}
						required
					/>
					<FormField
						label="Expiry Date"
						name="expiryDate"
						type="date"
						bind:value={expiryDate}
					/>
				</div>
			</div>

			<Separator />

			<!-- Line Items -->
			<div>
				<h2 class="mb-4 text-lg font-semibold text-gray-900">Items</h2>
				<ItemTable bind:items currency="R" />
			</div>

			<Separator />

			<!-- Notes and Terms -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				<FormField
					label="Customer Notes"
					name="notes"
					type="textarea"
					bind:value={notes}
					placeholder="Add any notes for the customer..."
					rows={4}
				/>
				<FormField
					label="Terms & Conditions"
					name="termsAndConditions"
					type="textarea"
					bind:value={termsAndConditions}
					placeholder="Add terms and conditions..."
					rows={4}
				/>
			</div>

			<Separator />

			<!-- File Upload -->
			<div>
				<h2 class="mb-4 text-lg font-semibold text-gray-900">Attachments</h2>
				<FileUpload
					label="Upload Photos & Documents"
					acceptedFileTypes={['image/*', 'application/pdf']}
					maxFiles={20}
					maxFileSize="10MB"
					onupdatefiles={(updatedFiles) => (files = updatedFiles)}
				/>
			</div>
		</div>
	</Card>

	<!-- Form Actions -->
	<Card class="overflow-hidden p-0">
		<FormActions
			primaryLabel="Save and Send"
			secondaryLabel="Save as Draft"
			cancelLabel="Cancel"
			onPrimary={handleSaveAndSend}
			onSecondary={handleSaveDraft}
			onCancel={handleCancel}
			{loading}
		/>
	</Card>
</div>

