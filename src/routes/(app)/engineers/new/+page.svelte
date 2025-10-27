<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import FormField from '$lib/components/forms/FormField.svelte';
	import { Card } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { getProvinceOptions, type Province, type CompanyType } from '$lib/types/engineer';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let province = $state<Province | ''>('');
	let specialization = $state('');
	let company_name = $state('');
	let company_type = $state<CompanyType | ''>('internal');
	let loading = $state(false);

	const provinceOptions = getProvinceOptions();

	function handleCancel() {
		goto('/engineers');
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader title="New Engineer" description="Add a new engineer or assessor to your team. An email with password reset instructions will be sent." />

	{#if form?.error}
		<div class="rounded-md bg-red-50 p-4">
			<p class="text-sm text-red-800">{form.error}</p>
		</div>
	{/if}

	<form
		method="POST"
		class="space-y-6"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}
	>
		<!-- Basic Information -->
		<Card class="p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Basic Information</h3>
			<div class="grid gap-6 md:grid-cols-2">
				<FormField
					label="Full Name"
					name="name"
					type="text"
					bind:value={name}
					required
					placeholder="e.g., John Smith"
				/>

				<FormField
					label="Email Address"
					name="email"
					type="email"
					bind:value={email}
					required
					placeholder="john.smith@example.com"
				/>

				<FormField
					label="Phone Number"
					name="phone"
					type="text"
					bind:value={phone}
					placeholder="+27 82 123 4567"
				/>

				<FormField
					label="Province"
					name="province"
					type="select"
					bind:value={province}
					options={provinceOptions}
				/>
			</div>
		</Card>

		<!-- Professional Details -->
		<Card class="p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Professional Details</h3>
			<div class="grid gap-6 md:grid-cols-2">
				<FormField
					label="Specialization"
					name="specialization"
					type="text"
					bind:value={specialization}
					placeholder="e.g., Collision Assessment, Hail Damage"
				/>

				<FormField
					label="Company Name"
					name="company_name"
					type="text"
					bind:value={company_name}
					placeholder="e.g., Claimtech, ABC Assessors"
				/>
			</div>

			<div class="mt-6">
				<Label>Company Type</Label>
				<div class="mt-2 flex gap-4">
					<label class="flex items-center gap-2">
						<input
							type="radio"
							name="company_type"
							value="internal"
							bind:group={company_type}
							class="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
						/>
						<span class="text-sm text-gray-700">Internal (Employee)</span>
					</label>
					<label class="flex items-center gap-2">
						<input
							type="radio"
							name="company_type"
							value="external"
							bind:group={company_type}
							class="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
						/>
						<span class="text-sm text-gray-700">External (Contractor)</span>
					</label>
				</div>
			</div>
		</Card>

		<div class="flex justify-end gap-4">
			<button
				type="button"
				onclick={handleCancel}
				class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
			>
				Cancel
			</button>
			<button
				type="submit"
				disabled={loading}
				class="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{loading ? 'Creating Engineer...' : 'Create Engineer'}
			</button>
		</div>
	</form>
</div>

