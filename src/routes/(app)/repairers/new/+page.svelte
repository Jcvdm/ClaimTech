<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import RepairerForm from '$lib/components/forms/RepairerForm.svelte';
	import { repairerService } from '$lib/services/repairer.service';
	import type { CreateRepairerInput } from '$lib/types/repairer';

	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(formData: FormData) {
		loading = true;
		error = null;

		try {
			const repairerData: CreateRepairerInput = {
				name: formData.get('name') as string,
				contact_name: formData.get('contact_name') as string,
				email: formData.get('email') as string,
				phone: formData.get('phone') as string,
				address: formData.get('address') as string,
				city: formData.get('city') as string,
				province: formData.get('province') as string,
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

			const newRepairer = await repairerService.createRepairer(repairerData);
			goto(`/repairers/${newRepairer.id}`);
		} catch (err) {
			console.error('Error creating repairer:', err);
			error = err instanceof Error ? err.message : 'Failed to create repairer';
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		goto('/repairers');
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader title="New Repairer" description="Add a new body shop or repair facility" />

	{#if error}
		<div class="rounded-md bg-red-50 p-4">
			<p class="text-sm text-red-800">{error}</p>
		</div>
	{/if}

	<RepairerForm onsubmit={handleSubmit} oncancel={handleCancel} {loading} />
</div>

