<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import RepairerForm from '$lib/components/forms/RepairerForm.svelte';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { repairerService } from '$lib/services/repairer.service';
	import type { UpdateRepairerInput } from '$lib/types/repairer';
	import type { PageData } from './$types';
	import { Pencil, Trash2 } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	let editing = $state(false);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(formData: FormData) {
		loading = true;
		error = null;

		try {
			const updateData: UpdateRepairerInput = {
				name: formData.get('name') as string,
				contact_name: formData.get('contact_name') as string,
				email: formData.get('email') as string,
				phone: formData.get('phone') as string,
				address: formData.get('address') as string,
				city: formData.get('city') as string,
				postal_code: formData.get('postal_code') as string,
				notes: formData.get('notes') as string,
				default_labour_rate: parseFloat(formData.get('default_labour_rate') as string),
				default_paint_rate: parseFloat(formData.get('default_paint_rate') as string),
				default_vat_percentage: parseFloat(formData.get('default_vat_percentage') as string),
				default_oem_markup_percentage: parseFloat(
					formData.get('default_oem_markup_percentage') as string
				),
				default_alt_markup_percentage: parseFloat(
					formData.get('default_alt_markup_percentage') as string
				),
				default_second_hand_markup_percentage: parseFloat(
					formData.get('default_second_hand_markup_percentage') as string
				),
				default_outwork_markup_percentage: parseFloat(
					formData.get('default_outwork_markup_percentage') as string
				)
			};

			await repairerService.updateRepairer(data.repairer.id, updateData);
			editing = false;
			// Reload the page to get fresh data
			window.location.reload();
		} catch (err) {
			console.error('Error updating repairer:', err);
			error = err instanceof Error ? err.message : 'Failed to update repairer';
		} finally {
			loading = false;
		}
	}

	async function handleDelete() {
		if (
			!confirm('Are you sure you want to delete this repairer? This action cannot be undone.')
		) {
			return;
		}

		loading = true;
		error = null;

		try {
			await repairerService.deleteRepairer(data.repairer.id);
			goto('/repairers');
		} catch (err) {
			console.error('Error deleting repairer:', err);
			error = err instanceof Error ? err.message : 'Failed to delete repairer';
			loading = false;
		}
	}

	function handleCancel() {
		editing = false;
		error = null;
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-ZA', {
			style: 'currency',
			currency: 'ZAR',
			minimumFractionDigits: 2
		}).format(amount);
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader title={data.repairer.name} description="Repairer details and settings">
		{#snippet actions()}
			{#if !editing}
				<Button variant="outline" onclick={() => (editing = true)}>
					<Pencil class="mr-2 h-4 w-4" />
					Edit
				</Button>
				<Button variant="destructive" onclick={handleDelete} disabled={loading}>
					<Trash2 class="mr-2 h-4 w-4" />
					Delete
				</Button>
			{/if}
		{/snippet}
	</PageHeader>

	{#if error}
		<div class="rounded-md bg-red-50 p-4">
			<p class="text-sm text-red-800">{error}</p>
		</div>
	{/if}

	{#if editing}
		<RepairerForm
			repairer={data.repairer}
			onsubmit={handleSubmit}
			oncancel={handleCancel}
			{loading}
		/>
	{:else}
		<!-- View Mode -->
		<Card class="p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Basic Information</h3>
			<div class="grid gap-6 md:grid-cols-2">
				<div>
					<p class="text-sm font-medium text-gray-500">Repairer Name</p>
					<p class="mt-1 text-sm text-gray-900">{data.repairer.name}</p>
				</div>
				<div>
					<p class="text-sm font-medium text-gray-500">Contact Name</p>
					<p class="mt-1 text-sm text-gray-900">{data.repairer.contact_name || '-'}</p>
				</div>
			</div>
		</Card>

		<Card class="p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Contact Information</h3>
			<div class="grid gap-6 md:grid-cols-2">
				<div>
					<p class="text-sm font-medium text-gray-500">Email</p>
					<p class="mt-1 text-sm text-gray-900">{data.repairer.email || '-'}</p>
				</div>
				<div>
					<p class="text-sm font-medium text-gray-500">Phone</p>
					<p class="mt-1 text-sm text-gray-900">{data.repairer.phone || '-'}</p>
				</div>
			</div>
		</Card>

		<Card class="p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Address</h3>
			<div class="grid gap-6">
				<div>
					<p class="text-sm font-medium text-gray-500">Street Address</p>
					<p class="mt-1 text-sm text-gray-900">{data.repairer.address || '-'}</p>
				</div>
				<div class="grid gap-6 md:grid-cols-3">
					<div>
						<p class="text-sm font-medium text-gray-500">City</p>
						<p class="mt-1 text-sm text-gray-900">{data.repairer.city || '-'}</p>
					</div>
					<div>
						<p class="text-sm font-medium text-gray-500">Province</p>
						<p class="mt-1 text-sm text-gray-900">{data.repairer.province || '-'}</p>
					</div>
					<div>
						<p class="text-sm font-medium text-gray-500">Postal Code</p>
						<p class="mt-1 text-sm text-gray-900">{data.repairer.postal_code || '-'}</p>
					</div>
				</div>
			</div>
		</Card>

		<Card class="p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Default Rates</h3>
			<div class="grid gap-6 md:grid-cols-3">
				<div>
					<p class="text-sm font-medium text-gray-500">Labour Rate (per hour)</p>
					<p class="mt-1 text-sm text-gray-900">
						{formatCurrency(data.repairer.default_labour_rate)}
					</p>
				</div>
				<div>
					<p class="text-sm font-medium text-gray-500">Paint Rate (per panel)</p>
					<p class="mt-1 text-sm text-gray-900">
						{formatCurrency(data.repairer.default_paint_rate)}
					</p>
				</div>
				<div>
					<p class="text-sm font-medium text-gray-500">VAT %</p>
					<p class="mt-1 text-sm text-gray-900">{data.repairer.default_vat_percentage}%</p>
				</div>
			</div>
		</Card>

		<Card class="p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Default Markup Percentages</h3>
			<div class="grid gap-6 md:grid-cols-4">
				<div>
					<p class="text-sm font-medium text-gray-500">OEM Markup</p>
					<p class="mt-1 text-sm text-gray-900">{data.repairer.default_oem_markup_percentage}%</p>
				</div>
				<div>
					<p class="text-sm font-medium text-gray-500">Aftermarket Markup</p>
					<p class="mt-1 text-sm text-gray-900">{data.repairer.default_alt_markup_percentage}%</p>
				</div>
				<div>
					<p class="text-sm font-medium text-gray-500">Second Hand Markup</p>
					<p class="mt-1 text-sm text-gray-900">
						{data.repairer.default_second_hand_markup_percentage}%
					</p>
				</div>
				<div>
					<p class="text-sm font-medium text-gray-500">Outwork Markup</p>
					<p class="mt-1 text-sm text-gray-900">
						{data.repairer.default_outwork_markup_percentage}%
					</p>
				</div>
			</div>
		</Card>

		{#if data.repairer.notes}
			<Card class="p-6">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Additional Information</h3>
				<p class="text-sm text-gray-900 whitespace-pre-wrap">{data.repairer.notes}</p>
			</Card>
		{/if}
	{/if}
</div>

