<script lang="ts">
	import { enhance } from '$app/forms';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import FormField from '$lib/components/forms/FormField.svelte';
    import { Building2, Save, FileText, Loader2 } from 'lucide-svelte';
    import type { PageData, ActionData } from './$types';
    import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let loading = $state(false);

	// Maximum length for T&Cs fields
	const MAX_TCS_LENGTH = 10000;

	// Track T&Cs text for character counts
	let assessmentTCs = $state(data.settings?.assessment_terms_and_conditions || '');
	let estimateTCs = $state(data.settings?.estimate_terms_and_conditions || '');
let frcTCs = $state(data.settings?.frc_terms_and_conditions || '');

	// Derived character counts
	let assessmentTCsLength = $derived(assessmentTCs.length);
	let estimateTCsLength = $derived(estimateTCs.length);
let frcTCsLength = $derived(frcTCs.length);

$effect(() => {
	if (form?.success && (form as any)?.settings) {
		const s = (form as any).settings as any;
		assessmentTCs = s.assessment_terms_and_conditions || '';
		estimateTCs = s.estimate_terms_and_conditions || '';
		frcTCs = s.frc_terms_and_conditions || '';
	}
});
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
        class="relative"
        use:enhance={() => {
            loading = true;
            return async ({ update }) => {
                await update();
                await invalidateAll();
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

			<!-- Terms & Conditions -->
			<Card class="p-6">
				<div class="mb-4 flex items-center gap-3">
					<div class="rounded-lg bg-purple-50 p-2">
						<FileText class="h-5 w-5 text-purple-600" />
					</div>
					<h3 class="text-lg font-semibold text-gray-900">Terms & Conditions</h3>
				</div>
				<p class="mb-6 text-sm text-gray-600">
					Customize the terms and conditions that appear in each document type. These are optional
					and will only appear if filled in.
				</p>

				<div class="space-y-6">
					<!-- Assessment Report T&Cs -->
					<div class="space-y-2">
						<label for="assessment_terms_and_conditions" class="block text-sm font-medium text-gray-700">
							Assessment Report Terms & Conditions
						</label>
						<p class="text-xs text-gray-500">
							These terms will appear in the Assessment Report PDF
						</p>
						<textarea
							id="assessment_terms_and_conditions"
							name="assessment_terms_and_conditions"
							bind:value={assessmentTCs}
							maxlength={MAX_TCS_LENGTH}
							rows="10"
							class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
							placeholder="This assessment report has been compiled in accordance with the instructions received and represents our professional opinion based on the vehicle condition at the time of inspection.&#10;&#10;INSPECTION SCOPE:&#10;• Visual inspection only - no invasive testing performed&#10;• Assessment based on vehicle condition at time of inspection&#10;• Warranty and service history confirmed where available"
						></textarea>
						<p class="text-xs text-gray-500">
							{assessmentTCsLength.toLocaleString()} / {MAX_TCS_LENGTH.toLocaleString()} characters
						</p>
					</div>

					<!-- Estimate T&Cs -->
					<div class="space-y-2">
						<label for="estimate_terms_and_conditions" class="block text-sm font-medium text-gray-700">
							Estimate Terms & Conditions
						</label>
						<p class="text-xs text-gray-500">
							These terms will appear in the Estimate PDF
						</p>
						<textarea
							id="estimate_terms_and_conditions"
							name="estimate_terms_and_conditions"
							bind:value={estimateTCs}
							maxlength={MAX_TCS_LENGTH}
							rows="10"
							class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
							placeholder="THIS IS NOT AN AUTHORISATION FOR REPAIRS UNLESS ACCOMPANIED BY AN OFFICIAL AUTHORISATION.&#10;&#10;ESTIMATE VALIDITY:&#10;• This estimate is valid for 30 days from the date of issue&#10;• Prices subject to change after validity period&#10;&#10;SCOPE OF WORK:&#10;• Estimate covers only items listed above&#10;• Additional repairs not quoted for must be reported immediately"
						></textarea>
						<p class="text-xs text-gray-500">
							{estimateTCsLength.toLocaleString()} / {MAX_TCS_LENGTH.toLocaleString()} characters
						</p>
					</div>

					<!-- FRC Report T&Cs -->
					<div class="space-y-2">
						<label for="frc_terms_and_conditions" class="block text-sm font-medium text-gray-700">
							FRC Report Terms & Conditions
						</label>
						<p class="text-xs text-gray-500">
							These terms will appear in the Final Repair Costing (FRC) PDF
						</p>
						<textarea
							id="frc_terms_and_conditions"
							name="frc_terms_and_conditions"
							bind:value={frcTCs}
							maxlength={MAX_TCS_LENGTH}
							rows="10"
							class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
							placeholder="SCOPE OF FRC:&#10;• Final costing based on actual parts and labour used&#10;• Comparison against original estimate provided&#10;&#10;DOCUMENTATION REQUIREMENTS:&#10;✓ All parts invoices&#10;✓ All outwork invoices&#10;✓ Collection/Release Notice (signed)&#10;✓ Copy of workmanship warranty"
						></textarea>
						<p class="text-xs text-gray-500">
							{frcTCsLength.toLocaleString()} / {MAX_TCS_LENGTH.toLocaleString()} characters
						</p>
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

		{#if loading}
			<div class="absolute inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm">
				<div class="flex items-center gap-3 px-4 py-3 rounded-lg bg-white shadow border">
					<Loader2 class="h-6 w-6 animate-spin text-blue-600" />
					<span class="text-sm font-medium text-gray-700">Saving…</span>
				</div>
			</div>
		{/if}
	</form>
</div>

