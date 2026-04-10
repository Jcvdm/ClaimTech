<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Settings } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// ── Settings state ─────────────────────────────────────────────────────────
	let settings = $state(data.settings);

	// ── Shop info form ──────────────────────────────────────────────────────────
	let savingShopInfo = $state(false);
	let shopInfoSuccess = $state(false);
	let shopInfoError = $state('');

	// ── Pricing form ────────────────────────────────────────────────────────────
	let savingPricing = $state(false);
	let pricingSuccess = $state(false);
	let pricingError = $state('');

	// ── Terms form ──────────────────────────────────────────────────────────────
	let savingTerms = $state(false);
	let termsSuccess = $state(false);
	let termsError = $state('');

	// ── First-time setup form ───────────────────────────────────────────────────
	let savingSetup = $state(false);
	let setupError = $state('');

	// ── Banking details form ────────────────────────────────────────────────────
	let savingBank = $state(false);
	let bankSuccess = $state(false);
	let bankError = $state('');

</script>

<div class="space-y-6 p-4 md:p-8">
	<div class="flex items-center gap-3">
		<Settings class="h-6 w-6 text-gray-600" />
		<div>
			<h1 class="text-2xl font-semibold text-gray-900">Shop Settings</h1>
			<p class="text-sm text-gray-500">Manage your shop information, pricing, and labor rates.</p>
		</div>
	</div>

	<!-- ── First-time Setup ──────────────────────────────────────────────────── -->
	{#if !settings}
		<Card.Root>
			<Card.Header>
				<Card.Title>Setup Your Shop</Card.Title>
				<Card.Description>
					Welcome! Enter your shop name to get started. You can update all other details after setup.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					method="POST"
					action="?/createSettings"
					use:enhance={() => {
						savingSetup = true;
						setupError = '';
						return async ({ result, update }) => {
							savingSetup = false;
							if (result.type === 'failure') {
								setupError = (result.data?.error as string) ?? 'Something went wrong';
							}
							await update();
						};
					}}
					class="flex max-w-sm flex-col gap-4"
				>
					<div>
						<label for="setup_shop_name" class="block text-xs font-medium text-gray-500">
							Shop Name *
						</label>
						<Input
							id="setup_shop_name"
							name="shop_name"
							type="text"
							required
							placeholder="e.g. My Auto Body Shop"
							class="mt-1"
						/>
					</div>
					{#if setupError}
						<p class="text-sm text-red-600">{setupError}</p>
					{/if}
					<div>
						<Button type="submit" disabled={savingSetup}>
							{savingSetup ? 'Setting up...' : 'Create Shop Profile'}
						</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- ── Section 1: Shop Information ────────────────────────────────────── -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Shop Information</Card.Title>
				<Card.Description>Contact details and registration info displayed on estimates and invoices.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					method="POST"
					action="?/updateShopInfo"
					use:enhance={() => {
						savingShopInfo = true;
						shopInfoSuccess = false;
						shopInfoError = '';
						return async ({ result, update }) => {
							savingShopInfo = false;
							if (result.type === 'success') {
								shopInfoSuccess = true;
								setTimeout(() => (shopInfoSuccess = false), 3000);
							} else if (result.type === 'failure') {
								shopInfoError = (result.data?.error as string) ?? 'Failed to save';
							}
							await update({ reset: false });
						};
					}}
					class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
				>
					<input type="hidden" name="id" value={settings.id} />

					<div class="sm:col-span-2 lg:col-span-3">
						<label for="shop_name" class="block text-xs font-medium text-gray-500">Shop Name *</label>
						<Input
							id="shop_name"
							name="shop_name"
							type="text"
							required
							value={settings.shop_name}
							class="mt-1"
						/>
					</div>

					<div>
						<label for="phone" class="block text-xs font-medium text-gray-500">Phone</label>
						<Input
							id="phone"
							name="phone"
							type="tel"
							value={settings.phone ?? ''}
							class="mt-1"
						/>
					</div>
					<div>
						<label for="email" class="block text-xs font-medium text-gray-500">Email</label>
						<Input
							id="email"
							name="email"
							type="email"
							value={settings.email ?? ''}
							class="mt-1"
						/>
					</div>

					<div class="sm:col-span-2 lg:col-span-3">
						<label for="address" class="block text-xs font-medium text-gray-500">Address</label>
						<Input
							id="address"
							name="address"
							type="text"
							value={settings.address ?? ''}
							class="mt-1"
						/>
					</div>
					<div>
						<label for="city" class="block text-xs font-medium text-gray-500">City</label>
						<Input
							id="city"
							name="city"
							type="text"
							value={settings.city ?? ''}
							class="mt-1"
						/>
					</div>
					<div>
						<label for="province" class="block text-xs font-medium text-gray-500">Province</label>
						<Input
							id="province"
							name="province"
							type="text"
							value={settings.province ?? ''}
							class="mt-1"
						/>
					</div>
					<div>
						<label for="postal_code" class="block text-xs font-medium text-gray-500">Postal Code</label>
						<Input
							id="postal_code"
							name="postal_code"
							type="text"
							value={settings.postal_code ?? ''}
							class="mt-1"
						/>
					</div>

					<div>
						<label for="vat_number" class="block text-xs font-medium text-gray-500">VAT Number</label>
						<Input
							id="vat_number"
							name="vat_number"
							type="text"
							value={settings.vat_number ?? ''}
							class="mt-1"
						/>
					</div>
					<div>
						<label for="registration_number" class="block text-xs font-medium text-gray-500">
							Registration Number
						</label>
						<Input
							id="registration_number"
							name="registration_number"
							type="text"
							value={settings.registration_number ?? ''}
							class="mt-1"
						/>
					</div>

					<div class="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
						<Button type="submit" disabled={savingShopInfo}>
							{savingShopInfo ? 'Saving...' : 'Save Shop Info'}
						</Button>
						{#if shopInfoSuccess}
							<span class="text-sm text-green-600">Saved successfully.</span>
						{/if}
						{#if shopInfoError}
							<span class="text-sm text-red-600">{shopInfoError}</span>
						{/if}
					</div>
				</form>
			</Card.Content>
		</Card.Root>

		<!-- ── Section 2: Pricing Defaults ────────────────────────────────────── -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Pricing Defaults</Card.Title>
				<Card.Description>Default markup percentages and VAT rate applied to new estimates and jobs.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					method="POST"
					action="?/updatePricing"
					use:enhance={() => {
						savingPricing = true;
						pricingSuccess = false;
						pricingError = '';
						return async ({ result, update }) => {
							savingPricing = false;
							if (result.type === 'success') {
								pricingSuccess = true;
								setTimeout(() => (pricingSuccess = false), 3000);
							} else if (result.type === 'failure') {
								pricingError = (result.data?.error as string) ?? 'Failed to save';
							}
							await update({ reset: false });
						};
					}}
					class="grid grid-cols-1 gap-4 sm:grid-cols-3"
				>
					<input type="hidden" name="id" value={settings.id} />

					<div>
						<label for="default_markup_parts" class="block text-xs font-medium text-gray-500">
							Parts Markup (%)
						</label>
						<Input
							id="default_markup_parts"
							name="default_markup_parts"
							type="number"
							step="0.01"
							min="0"
							value={settings.default_markup_parts}
							class="mt-1"
						/>
					</div>
					<div>
						<label for="default_markup_labor" class="block text-xs font-medium text-gray-500">
							Labor Markup (%)
						</label>
						<Input
							id="default_markup_labor"
							name="default_markup_labor"
							type="number"
							step="0.01"
							min="0"
							value={settings.default_markup_labor}
							class="mt-1"
						/>
					</div>
					<div>
						<label for="default_vat_rate" class="block text-xs font-medium text-gray-500">
							VAT Rate (%)
						</label>
						<Input
							id="default_vat_rate"
							name="default_vat_rate"
							type="number"
							step="0.01"
							min="0"
							value={settings.default_vat_rate}
							class="mt-1"
						/>
					</div>

					<!-- Part-type specific markup percentages -->
					<div class="sm:col-span-3">
						<p class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Part-Type Markups</p>
						<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
							<div>
								<label for="oem_markup_percentage" class="block text-xs font-medium text-gray-500">
									OEM Markup (%)
								</label>
								<Input
									id="oem_markup_percentage"
									name="oem_markup_percentage"
									type="number"
									step="0.01"
									min="0"
									value={settings.oem_markup_percentage ?? 25}
									class="mt-1"
								/>
							</div>
							<div>
								<label for="alt_markup_percentage" class="block text-xs font-medium text-gray-500">
									ALT Markup (%)
								</label>
								<Input
									id="alt_markup_percentage"
									name="alt_markup_percentage"
									type="number"
									step="0.01"
									min="0"
									value={settings.alt_markup_percentage ?? 25}
									class="mt-1"
								/>
							</div>
							<div>
								<label for="second_hand_markup_percentage" class="block text-xs font-medium text-gray-500">
									Second Hand Markup (%)
								</label>
								<Input
									id="second_hand_markup_percentage"
									name="second_hand_markup_percentage"
									type="number"
									step="0.01"
									min="0"
									value={settings.second_hand_markup_percentage ?? 0}
									class="mt-1"
								/>
							</div>
							<div>
								<label for="outwork_markup_percentage" class="block text-xs font-medium text-gray-500">
									Outwork Markup (%)
								</label>
								<Input
									id="outwork_markup_percentage"
									name="outwork_markup_percentage"
									type="number"
									step="0.01"
									min="0"
									value={settings.outwork_markup_percentage ?? 25}
									class="mt-1"
								/>
							</div>
						</div>
					</div>

					<!-- Default rates -->
					<div>
						<label for="default_labour_rate" class="block text-xs font-medium text-gray-500">
							Default Labour Rate (R/hr)
						</label>
						<Input
							id="default_labour_rate"
							name="default_labour_rate"
							type="number"
							step="0.01"
							min="0"
							value={settings.default_labour_rate ?? 450}
							class="mt-1"
						/>
					</div>
					<div>
						<label for="default_paint_rate" class="block text-xs font-medium text-gray-500">
							Default Paint Rate (R/panel)
						</label>
						<Input
							id="default_paint_rate"
							name="default_paint_rate"
							type="number"
							step="0.01"
							min="0"
							value={settings.default_paint_rate ?? 350}
							class="mt-1"
						/>
					</div>

					<div class="flex items-center gap-3 sm:col-span-3">
						<Button type="submit" disabled={savingPricing}>
							{savingPricing ? 'Saving...' : 'Save Pricing'}
						</Button>
						{#if pricingSuccess}
							<span class="text-sm text-green-600">Saved successfully.</span>
						{/if}
						{#if pricingError}
							<span class="text-sm text-red-600">{pricingError}</span>
						{/if}
					</div>
				</form>
			</Card.Content>
		</Card.Root>

		<!-- ── Section 3: Terms & Conditions ────────────────────────────────────── -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Terms &amp; Conditions</Card.Title>
				<Card.Description>Default terms printed on estimates and invoices.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					method="POST"
					action="?/updateTerms"
					use:enhance={() => {
						savingTerms = true;
						termsSuccess = false;
						termsError = '';
						return async ({ result, update }) => {
							savingTerms = false;
							if (result.type === 'success') {
								termsSuccess = true;
								setTimeout(() => (termsSuccess = false), 3000);
							} else if (result.type === 'failure') {
								termsError = (result.data?.error as string) ?? 'Failed to save';
							}
							await update({ reset: false });
						};
					}}
					class="space-y-4"
				>
					<input type="hidden" name="id" value={settings.id} />

					<div>
						<label for="estimate_terms" class="block text-xs font-medium text-gray-500">
							Estimate Terms
						</label>
						<textarea
							id="estimate_terms"
							name="estimate_terms"
							rows="4"
							value={settings.estimate_terms ?? ''}
							class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
							placeholder="Terms and conditions printed on estimates..."
						></textarea>
					</div>

					<div>
						<label for="invoice_terms" class="block text-xs font-medium text-gray-500">
							Invoice Terms
						</label>
						<textarea
							id="invoice_terms"
							name="invoice_terms"
							rows="4"
							value={settings.invoice_terms ?? ''}
							class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
							placeholder="Terms and conditions printed on invoices..."
						></textarea>
					</div>

					<div class="max-w-xs">
						<label for="invoice_payment_days" class="block text-xs font-medium text-gray-500">
							Invoice Payment Days
						</label>
						<Input
							id="invoice_payment_days"
							name="invoice_payment_days"
							type="number"
							min="0"
							value={settings.invoice_payment_days}
							class="mt-1"
						/>
						<p class="mt-1 text-xs text-gray-400">Number of days before invoice payment is due.</p>
					</div>

					<div class="flex items-center gap-3">
						<Button type="submit" disabled={savingTerms}>
							{savingTerms ? 'Saving...' : 'Save Terms'}
						</Button>
						{#if termsSuccess}
							<span class="text-sm text-green-600">Saved successfully.</span>
						{/if}
						{#if termsError}
							<span class="text-sm text-red-600">{termsError}</span>
						{/if}
					</div>
				</form>
			</Card.Content>
		</Card.Root>

		<!-- ── Section 5: Banking Details ─────────────────────────────────────── -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Banking Details</Card.Title>
				<Card.Description>Bank details displayed on invoices for customer payments.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					method="POST"
					action="?/updateBankDetails"
					use:enhance={() => {
						savingBank = true;
						bankSuccess = false;
						bankError = '';
						return async ({ result, update }) => {
							savingBank = false;
							if (result.type === 'success') {
								bankSuccess = true;
								setTimeout(() => (bankSuccess = false), 3000);
							} else if (result.type === 'failure') {
								bankError = (result.data as { error?: string })?.error || 'Failed to save';
							}
							await update({ reset: false });
						};
					}}
				>
					<input type="hidden" name="id" value={settings.id} />
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div class="space-y-1">
							<label for="bank_name" class="block text-xs font-medium text-gray-500">Bank Name</label>
							<Input id="bank_name" name="bank_name" placeholder="e.g. FNB, ABSA, Standard Bank" value={settings.bank_name ?? ''} />
						</div>
						<div class="space-y-1">
							<label for="bank_account_number" class="block text-xs font-medium text-gray-500">Account Number</label>
							<Input id="bank_account_number" name="bank_account_number" placeholder="Account number" value={settings.bank_account_number ?? ''} />
						</div>
						<div class="space-y-1">
							<label for="bank_branch_code" class="block text-xs font-medium text-gray-500">Branch Code</label>
							<Input id="bank_branch_code" name="bank_branch_code" placeholder="e.g. 250655" value={settings.bank_branch_code ?? ''} />
						</div>
						<div class="space-y-1">
							<label for="bank_account_holder" class="block text-xs font-medium text-gray-500">Account Holder</label>
							<Input id="bank_account_holder" name="bank_account_holder" placeholder="Account holder name" value={settings.bank_account_holder ?? ''} />
						</div>
					</div>
					<div class="mt-4 flex items-center gap-3">
						<Button type="submit" size="sm" disabled={savingBank}>
							{savingBank ? 'Saving...' : 'Save Banking Details'}
						</Button>
						{#if bankSuccess}
							<span class="text-sm text-green-600">Saved successfully.</span>
						{/if}
						{#if bankError}
							<span class="text-sm text-red-600">{bankError}</span>
						{/if}
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
