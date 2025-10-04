<script lang="ts">
	import FormField from './FormField.svelte';
	import { Card } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';

	type Props = {
		owner_name: string;
		owner_phone: string;
		owner_email: string;
		owner_address: string;
		third_party_name: string;
		third_party_phone: string;
		third_party_email: string;
		third_party_insurance: string;
	};

	let {
		owner_name = $bindable(),
		owner_phone = $bindable(),
		owner_email = $bindable(),
		owner_address = $bindable(),
		third_party_name = $bindable(),
		third_party_phone = $bindable(),
		third_party_email = $bindable(),
		third_party_insurance = $bindable()
	}: Props = $props();
</script>

<Card class="p-6">
	<h3 class="mb-4 text-lg font-semibold text-gray-900">Owner Details (Insured Party)</h3>
	<div class="grid gap-6">
		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				label="Owner Name"
				name="owner_name"
				type="text"
				bind:value={owner_name}
				placeholder="Full name of vehicle owner"
			/>

			<FormField
				label="Owner Phone"
				name="owner_phone"
				type="text"
				bind:value={owner_phone}
				placeholder="+27 82 123 4567"
			/>
		</div>

		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				label="Owner Email"
				name="owner_email"
				type="email"
				bind:value={owner_email}
				placeholder="owner@example.com"
			/>

			<FormField
				label="Owner Address"
				name="owner_address"
				type="text"
				bind:value={owner_address}
				placeholder="Full address"
			/>
		</div>
	</div>

	<Separator class="my-6" />

	<h3 class="mb-4 text-lg font-semibold text-gray-900">
		Third Party Details <span class="text-sm font-normal text-gray-500">(if applicable)</span>
	</h3>
	<div class="grid gap-6">
		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				label="Third Party Name"
				name="third_party_name"
				type="text"
				bind:value={third_party_name}
				placeholder="Name of other party involved"
			/>

			<FormField
				label="Third Party Phone"
				name="third_party_phone"
				type="text"
				bind:value={third_party_phone}
				placeholder="+27 82 123 4567"
			/>
		</div>

		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				label="Third Party Email"
				name="third_party_email"
				type="email"
				bind:value={third_party_email}
				placeholder="thirdparty@example.com"
			/>

			<FormField
				label="Third Party Insurance"
				name="third_party_insurance"
				type="text"
				bind:value={third_party_insurance}
				placeholder="Insurance company name"
			/>
		</div>
	</div>
</Card>

