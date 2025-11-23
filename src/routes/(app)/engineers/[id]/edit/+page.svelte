<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import FormField from '$lib/components/forms/FormField.svelte';
	import { Card } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import LoadingButton from '$lib/components/ui/button/LoadingButton.svelte';
	import { getProvinceOptions, type Province, type CompanyType } from '$lib/types/engineer';
	import { Mail } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();

	let name = $state(data.engineer.name || '');
	let phone = $state(data.engineer.phone || '');
	let province = $state<Province | ''>(data.engineer.province || '');
	let specialization = $state(data.engineer.specialization || '');
	let company_name = $state(data.engineer.company_name || '');
	let company_type = $state<CompanyType | ''>(data.engineer.company_type || 'internal');
	let loading = $state(false);
	let passwordResetLoading = $state(false);

	const provinceOptions = getProvinceOptions();

	function handleCancel() {
		goto(`/engineers/${data.engineer.id}`);
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader
		title="Edit Engineer"
		description="Update engineer details and manage password reset"
	/>

	{#if form?.error}
		<div class="rounded-md bg-red-50 p-4">
			<p class="text-sm text-red-800">{form.error}</p>
		</div>
	{/if}

	<!-- Main Update Form -->
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

				<div>
					<Label>Email Address</Label>
					<p class="mb-2 text-xs text-gray-500">Email cannot be changed (linked to auth account)</p>
					<input
						type="email"
						value={data.engineer.email}
						disabled
						class="w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500"
					/>
				</div>

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
			<Button
				type="button"
				variant="outline"
				onclick={handleCancel}
				disabled={loading}
			>
				Cancel
			</Button>
			<LoadingButton
				type="submit"
				loading={loading}
			>
				Update Engineer
			</LoadingButton>
		</div>
	</form>

	<!-- Password Reset Section -->
	<Card class="border-orange-200 bg-orange-50 p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Password Management</h3>
		<p class="mb-4 text-sm text-gray-600">
			Send a password reset email to <span class="font-medium">{data.engineer.email}</span>. The
			engineer will receive an email with instructions to set a new password.
		</p>

		{#if form?.success}
			<div class="mb-4 rounded-md bg-green-50 p-4">
				<p class="text-sm text-green-800">{form.message}</p>
			</div>
		{/if}

		<form
			method="POST"
			action="?/resendPassword"
			use:enhance={() => {
				passwordResetLoading = true;
				return async ({ update }) => {
					await update();
					passwordResetLoading = false;
				};
			}}
		>
			<Button
				type="submit"
				variant="outline"
				disabled={passwordResetLoading}
				class="border-orange-300 text-orange-700 hover:bg-orange-100"
			>
				<Mail class="mr-2 h-4 w-4" />
				{passwordResetLoading ? 'Sending...' : 'Resend Password Reset Email'}
			</Button>
		</form>
	</Card>
</div>
