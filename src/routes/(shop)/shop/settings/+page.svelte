<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import type { ShopLaborRate } from '$lib/services/shop-settings.service';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Settings, Plus, Pencil, Trash2 } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// ── Settings state ─────────────────────────────────────────────────────────
	let settings = $state(data.settings);
	let laborRates = $state(data.laborRates ?? []);

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

	// ── Labor rates state ───────────────────────────────────────────────────────
	let showAddRateForm = $state(false);
	let savingAddRate = $state(false);
	let addRateError = $state('');

	// For inline editing
	let editingRateId = $state<string | null>(null);
	let savingEditRate = $state(false);
	let editRateError = $state('');

	// Delete confirmation
	let deletingRateId = $state<string | null>(null);
	let savingDeleteRate = $state(false);

	// New rate form fields
	let newRateJobType = $state<'autobody' | 'mechanical'>('autobody');
	let newRateName = $state('');
	let newRateHourly = $state('');
	let newRateDescription = $state('');
	let newRateIsDefault = $state(false);

	function resetAddRateForm() {
		newRateJobType = 'autobody';
		newRateName = '';
		newRateHourly = '';
		newRateDescription = '';
		newRateIsDefault = false;
		addRateError = '';
		showAddRateForm = false;
	}

	// Edit rate fields (populated when editing starts)
	let editRateName = $state('');
	let editRateHourly = $state('');
	let editRateDescription = $state('');
	let editRateIsDefault = $state(false);

	function startEditRate(rate: ShopLaborRate) {
		editingRateId = rate.id;
		editRateName = rate.rate_name;
		editRateHourly = String(rate.hourly_rate);
		editRateDescription = rate.description ?? '';
		editRateIsDefault = rate.is_default;
		editRateError = '';
	}

	function cancelEditRate() {
		editingRateId = null;
		editRateError = '';
	}

	function formatCurrency(value: number) {
		return `R ${value.toFixed(2)}`;
	}
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

		<!-- ── Section 3: Labor Rates ──────────────────────────────────────────── -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between">
				<div>
					<Card.Title>Labor Rates</Card.Title>
					<Card.Description>Hourly rates used when adding labor lines to estimates and jobs.</Card.Description>
				</div>
				{#if !showAddRateForm}
					<Button
						variant="outline"
						size="sm"
						onclick={() => { showAddRateForm = true; addRateError = ''; }}
					>
						<Plus class="mr-1.5 h-4 w-4" />
						Add Rate
					</Button>
				{/if}
			</Card.Header>
			<Card.Content>
				<!-- Add Rate inline form -->
				{#if showAddRateForm}
					<form
						method="POST"
						action="?/addLaborRate"
						use:enhance={() => {
							savingAddRate = true;
							addRateError = '';
							return async ({ result, update }) => {
								savingAddRate = false;
								if (result.type === 'success') {
									resetAddRateForm();
								} else if (result.type === 'failure') {
									addRateError = (result.data?.error as string) ?? 'Failed to add rate';
								}
								await update({ reset: false });
							};
						}}
						class="mb-6 rounded-lg border border-dashed border-gray-300 p-4"
					>
						<input type="hidden" name="shop_id" value={settings.id} />
						<p class="mb-3 text-sm font-medium text-gray-700">New Labor Rate</p>
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
							<div>
								<label for="new_job_type" class="block text-xs font-medium text-gray-500">
									Job Type *
								</label>
								<select
									id="new_job_type"
									name="job_type"
									bind:value={newRateJobType}
									class="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
								>
									<option value="autobody">Autobody</option>
									<option value="mechanical">Mechanical</option>
								</select>
							</div>
							<div>
								<label for="new_rate_name" class="block text-xs font-medium text-gray-500">
									Rate Name *
								</label>
								<Input
									id="new_rate_name"
									name="rate_name"
									type="text"
									placeholder="e.g. Standard Rate"
									bind:value={newRateName}
									class="mt-1"
								/>
							</div>
							<div>
								<label for="new_hourly_rate" class="block text-xs font-medium text-gray-500">
									Hourly Rate (R) *
								</label>
								<Input
									id="new_hourly_rate"
									name="hourly_rate"
									type="number"
									step="0.01"
									min="0"
									placeholder="0.00"
									bind:value={newRateHourly}
									class="mt-1"
								/>
							</div>
							<div>
								<label for="new_description" class="block text-xs font-medium text-gray-500">
									Description
								</label>
								<Input
									id="new_description"
									name="description"
									type="text"
									placeholder="Optional"
									bind:value={newRateDescription}
									class="mt-1"
								/>
							</div>
						</div>
						<div class="mt-3 flex items-center gap-4">
							<label class="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
								<input
									type="checkbox"
									name="is_default"
									value="true"
									checked={newRateIsDefault}
									onchange={(e) => {
										newRateIsDefault = (e.target as HTMLInputElement).checked;
									}}
									class="rounded"
								/>
								Set as default for job type
							</label>
						</div>
						{#if addRateError}
							<p class="mt-2 text-sm text-red-600">{addRateError}</p>
						{/if}
						<div class="mt-3 flex gap-2">
							<Button type="submit" size="sm" disabled={savingAddRate}>
								{savingAddRate ? 'Saving...' : 'Save Rate'}
							</Button>
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onclick={resetAddRateForm}
							>
								Cancel
							</Button>
						</div>
					</form>
				{/if}

				<!-- Labor Rates Table -->
				{#if laborRates.length === 0 && !showAddRateForm}
					<p class="py-4 text-center text-sm text-gray-400">
						No labor rates configured yet. Click "Add Rate" to create your first rate.
					</p>
				{:else if laborRates.length > 0}
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b border-gray-100 text-left">
									<th class="pb-2 text-xs font-medium text-gray-500">Job Type</th>
									<th class="pb-2 text-xs font-medium text-gray-500">Rate Name</th>
									<th class="pb-2 text-xs font-medium text-gray-500">Hourly Rate</th>
									<th class="pb-2 text-xs font-medium text-gray-500">Default?</th>
									<th class="pb-2 text-xs font-medium text-gray-500">Actions</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-50">
								{#each laborRates as rate (rate.id)}
									{#if editingRateId === rate.id}
										<!-- Inline edit row -->
										<tr class="bg-slate-50">
											<td class="py-2 pr-4">
												<Badge variant={rate.job_type === 'autobody' ? 'default' : 'secondary'}>
													{rate.job_type}
												</Badge>
											</td>
											<td colspan="4" class="py-2">
												<form
													method="POST"
													action="?/updateLaborRate"
													use:enhance={() => {
														savingEditRate = true;
														editRateError = '';
														return async ({ result, update }) => {
															savingEditRate = false;
															if (result.type === 'success') {
																editingRateId = null;
															} else if (result.type === 'failure') {
																editRateError = (result.data?.error as string) ?? 'Failed to update';
															}
															await update({ reset: false });
														};
													}}
												>
													<input type="hidden" name="rate_id" value={rate.id} />
													<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
														<div>
															<label for="edit_rate_name" class="block text-xs font-medium text-gray-500">Rate Name *</label>
															<Input
																id="edit_rate_name"
																name="rate_name"
																type="text"
																bind:value={editRateName}
																class="mt-0.5"
															/>
														</div>
														<div>
															<label for="edit_hourly_rate" class="block text-xs font-medium text-gray-500">Hourly Rate (R) *</label>
															<Input
																id="edit_hourly_rate"
																name="hourly_rate"
																type="number"
																step="0.01"
																min="0"
																bind:value={editRateHourly}
																class="mt-0.5"
															/>
														</div>
														<div>
															<label for="edit_description" class="block text-xs font-medium text-gray-500">Description</label>
															<Input
																id="edit_description"
																name="description"
																type="text"
																bind:value={editRateDescription}
																class="mt-0.5"
															/>
														</div>
													</div>
													<div class="mt-2 flex items-center gap-4">
														<label class="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
															<input
																type="checkbox"
																name="is_default"
																value="true"
																checked={editRateIsDefault}
																onchange={(e) => {
																	editRateIsDefault = (e.target as HTMLInputElement).checked;
																}}
																class="rounded"
															/>
															Set as default
														</label>
													</div>
													{#if editRateError}
														<p class="mt-1 text-xs text-red-600">{editRateError}</p>
													{/if}
													<div class="mt-2 flex gap-2">
														<Button type="submit" size="sm" disabled={savingEditRate}>
															{savingEditRate ? 'Saving...' : 'Save'}
														</Button>
														<Button
															type="button"
															size="sm"
															variant="ghost"
															onclick={cancelEditRate}
														>
															Cancel
														</Button>
													</div>
												</form>
											</td>
										</tr>
									{:else}
										<!-- Normal display row -->
										<tr class="hover:bg-gray-50">
											<td class="py-2.5 pr-4">
												<Badge
													variant={rate.job_type === 'autobody' ? 'default' : 'secondary'}
												>
													{rate.job_type}
												</Badge>
											</td>
											<td class="py-2.5 pr-4 font-medium text-gray-900">
												{rate.rate_name}
												{#if rate.description}
													<p class="text-xs font-normal text-gray-400">{rate.description}</p>
												{/if}
											</td>
											<td class="py-2.5 pr-4 text-gray-700">{formatCurrency(rate.hourly_rate)}</td>
											<td class="py-2.5 pr-4">
												{#if rate.is_default}
													<Badge variant="outline">Default</Badge>
												{/if}
											</td>
											<td class="py-2.5">
												<div class="flex items-center gap-1">
													<Button
														variant="ghost"
														size="sm"
														onclick={() => startEditRate(rate)}
														class="h-7 w-7 p-0"
													>
														<Pencil class="h-3.5 w-3.5" />
													</Button>
													{#if deletingRateId === rate.id}
														<form
															method="POST"
															action="?/deleteLaborRate"
															use:enhance={() => {
																savingDeleteRate = true;
																return async ({ result, update }) => {
																	savingDeleteRate = false;
																	deletingRateId = null;
																	await update();
																};
															}}
															class="inline-flex items-center gap-1"
														>
															<input type="hidden" name="rate_id" value={rate.id} />
															<span class="text-xs text-red-600">Delete?</span>
															<Button
																type="submit"
																variant="destructive"
																size="sm"
																class="h-6 px-2 text-xs"
																disabled={savingDeleteRate}
															>
																Yes
															</Button>
															<Button
																type="button"
																variant="ghost"
																size="sm"
																class="h-6 px-2 text-xs"
																onclick={() => (deletingRateId = null)}
															>
																No
															</Button>
														</form>
													{:else}
														<Button
															variant="ghost"
															size="sm"
															onclick={() => (deletingRateId = rate.id)}
															class="h-7 w-7 p-0 text-red-400 hover:text-red-600"
														>
															<Trash2 class="h-3.5 w-3.5" />
														</Button>
													{/if}
												</div>
											</td>
										</tr>
									{/if}
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- ── Section 4: Terms & Conditions ──────────────────────────────────── -->
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
	{/if}
</div>
