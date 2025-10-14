<script lang="ts">
	import { enhance } from '$app/forms';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import FormField from '$lib/components/forms/FormField.svelte';
	import { Building2, Save } from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let loading = $state(false);
</script>

<div class="space-y-6">
	<PageHeader
		title="Company Settings"
		description="Manage your company information for document generation"
	/>

	{#if form?.success}
		<div class="rounded-md bg-green-50 p-4">
			<p class="text-sm text-green-800">Settings updated successfully!</p>
		</div>
	{/if}

	{#if form?.error}
		<div class="rounded-md bg-red-50 p-4">
			<p class="text-sm text-red-800">{form.error}</p>
		</div>
	{/if}

	<form
		method="POST"
		action="?/update"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}
	>
		<div class="space-y-6">
			<!-- Company Information -->
			<Card class="p-6">
				<div class="mb-4 flex items-center gap-3">
					<div class="rounded-lg bg-blue-50 p-2">
						<Building2 class="h-5 w-5 text-blue-600" />
					</div>
					<h3 class="text-lg font-semibold text-gray-900">Company Information</h3>
				</div>
				<p class="mb-6 text-sm text-gray-600">
					This information will appear on all generated documents (reports, estimates, etc.)
				</p>

				<div class="space-y-6">
					<FormField
						label="Company Name"
						name="company_name"
						type="text"
						value={data.settings?.company_name || ''}
						placeholder="Claimtech"
						required
					/>

					<div class="grid gap-6 md:grid-cols-2">
						<FormField
							label="P.O. Box"
							name="po_box"
							type="text"
							value={data.settings?.po_box || ''}
							placeholder="P.O. Box 12345"
						/>

						<FormField
							label="City"
							name="city"
							type="text"
							value={data.settings?.city || ''}
							placeholder="Johannesburg"
						/>
					</div>

					<div class="grid gap-6 md:grid-cols-2">
						<FormField
							label="Province"
							name="province"
							type="text"
							value={data.settings?.province || ''}
							placeholder="Gauteng"
						/>

						<FormField
							label="Postal Code"
							name="postal_code"
							type="text"
							value={data.settings?.postal_code || ''}
							placeholder="2000"
						/>
					</div>
				</div>
			</Card>

			<!-- Contact Information -->
			<Card class="p-6">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Contact Information</h3>
				<div class="space-y-6">
					<div class="grid gap-6 md:grid-cols-2">
						<FormField
							label="Phone"
							name="phone"
							type="tel"
							value={data.settings?.phone || ''}
							placeholder="+27 (0) 11 123 4567"
						/>

						<FormField
							label="Fax"
							name="fax"
							type="tel"
							value={data.settings?.fax || ''}
							placeholder="+27 (0) 86 123 4567"
						/>
					</div>

					<div class="grid gap-6 md:grid-cols-2">
						<FormField
							label="Email"
							name="email"
							type="email"
							value={data.settings?.email || ''}
							placeholder="info@claimtech.co.za"
						/>

						<FormField
							label="Website"
							name="website"
							type="text"
							value={data.settings?.website || ''}
							placeholder="www.claimtech.co.za"
						/>
					</div>
				</div>
			</Card>

			<!-- Actions -->
			<div class="flex justify-end gap-3">
				<Button type="submit" disabled={loading}>
					<Save class="mr-2 h-4 w-4" />
					{loading ? 'Saving...' : 'Save Settings'}
				</Button>
			</div>
		</div>
	</form>
</div>

