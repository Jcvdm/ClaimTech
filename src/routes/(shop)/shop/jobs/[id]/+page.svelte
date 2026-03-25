<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import type { ShopJobStatus } from '$lib/services/shop-job.service';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Camera, X, Image } from 'lucide-svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Status workflow order (excluding cancelled)
	const STATUS_STEPS: ShopJobStatus[] = [
		'quote_requested',
		'quoted',
		'approved',
		'checked_in',
		'in_progress',
		'quality_check',
		'ready_for_collection',
		'completed'
	];

	const STATUS_LABELS: Record<ShopJobStatus, string> = {
		quote_requested: 'Quote Requested',
		quoted: 'Quoted',
		approved: 'Approved',
		checked_in: 'Checked In',
		in_progress: 'In Progress',
		quality_check: 'Quality Check',
		ready_for_collection: 'Ready',
		completed: 'Completed',
		cancelled: 'Cancelled'
	};

	const VALID_TRANSITIONS: Record<ShopJobStatus, ShopJobStatus[]> = {
		quote_requested: ['quoted', 'cancelled'],
		quoted: ['approved', 'cancelled'],
		approved: ['checked_in', 'cancelled'],
		checked_in: ['in_progress', 'cancelled'],
		in_progress: ['quality_check', 'cancelled'],
		quality_check: ['ready_for_collection', 'in_progress'],
		ready_for_collection: ['completed'],
		completed: [],
		cancelled: []
	};

	type StatusVariant = 'default' | 'secondary' | 'destructive' | 'outline';

	const statusBadgeVariant: Record<ShopJobStatus, StatusVariant> = {
		quote_requested: 'secondary',
		quoted: 'default',
		approved: 'default',
		checked_in: 'secondary',
		in_progress: 'secondary',
		quality_check: 'default',
		ready_for_collection: 'default',
		completed: 'default',
		cancelled: 'destructive'
	};

	const jobTypeBadgeVariant: Record<string, StatusVariant> = {
		autobody: 'default',
		mechanical: 'secondary'
	};

	let job = $state(data.job);
	let saving = $state(false);
	let statusUpdating = $state(false);
	let creatingInvoice = $state(false);
	let uploadingPhoto = $state(false);

	const existingInvoice = $derived(data.existingInvoice);
	const canCreateInvoice = $derived(
		job.status === 'ready_for_collection' || job.status === 'completed'
	);

	let currentStepIndex = $derived(STATUS_STEPS.indexOf(job.status as ShopJobStatus));

	let nextStatus = $derived(
		VALID_TRANSITIONS[job.status as ShopJobStatus]?.find(
			(s) => s !== 'cancelled' && STATUS_STEPS.includes(s)
		) ?? null
	);

	// Tab visibility based on status
	const statusIndex = $derived(STATUS_STEPS.indexOf(job.status as ShopJobStatus));
	const showBooking = $derived(statusIndex >= STATUS_STEPS.indexOf('checked_in'));
	const showWork = $derived(statusIndex >= STATUS_STEPS.indexOf('in_progress'));
	const showInvoice = $derived(statusIndex >= STATUS_STEPS.indexOf('ready_for_collection'));

	let activeTab = $state('overview');

	// Photos from server
	const photos = $derived(data.photos ?? []);

	// Photo grouping by category and label prefix
	const vehicleIdPhotos = $derived(
		photos.filter((p: { category: string; label?: string }) =>
			p.category === 'before' && p.label?.startsWith('ID: ')
		)
	);
	const exteriorPhotos = $derived(
		photos.filter((p: { category: string; label?: string }) =>
			p.category === 'before' && p.label?.startsWith('360: ')
		)
	);
	const damagePhotos = $derived(
		photos.filter((p: { category: string }) => p.category === 'damage')
	);
	const workPhotos = $derived(
		photos.filter((p: { category: string }) => p.category === 'during')
	);

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-ZA', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	// Reactive local editable fields
	let notes = $state(job.notes ?? '');
	let datepromised = $state(job.date_promised ?? '');
	let damageDescription = $state(job.damage_description ?? '');
	let complaint = $state(job.complaint ?? '');
	let diagnosis = $state(job.diagnosis ?? '');
	let faultCodes = $state(job.fault_codes ?? '');

	// Linked estimates (array from join)
	let estimates = $derived(Array.isArray(job.shop_estimates) ? job.shop_estimates : []);

	// Photo URL helper - SVA Photos bucket uses /api/photo/{path} proxy
	function photoUrl(storagePath: string): string {
		return `/api/photo/${storagePath}`;
	}

	// Vehicle ID label options
	const vehicleIdLabels = [
		'ID: Registration Plate',
		'ID: VIN Plate',
		'ID: Odometer',
		'ID: Engine Number',
		'ID: Licence Disc'
	];

	// 360 Exterior label options
	const exteriorLabels = [
		'360: Front',
		'360: Rear',
		'360: Left Side',
		'360: Right Side',
		'360: Front Left',
		'360: Front Right',
		'360: Rear Left',
		'360: Rear Right'
	];
</script>

<div class="space-y-6 pt-4">
	<!-- Header -->
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<div class="flex items-center gap-3">
				<Button variant="ghost" size="sm" href="/shop/jobs">&larr; Jobs</Button>
			</div>
			<div class="mt-2 flex flex-wrap items-center gap-3">
				<h1 class="text-2xl font-semibold text-gray-900">{job.job_number}</h1>
				<Badge variant={statusBadgeVariant[job.status as ShopJobStatus] ?? 'secondary'}>
					{STATUS_LABELS[job.status as ShopJobStatus] ?? job.status}
				</Badge>
				<Badge variant={jobTypeBadgeVariant[job.job_type] ?? 'secondary'}>
					{job.job_type === 'autobody' ? 'Autobody' : 'Mechanical'}
				</Badge>
			</div>
		</div>
	</div>

	<!-- Error message -->
	{#if form?.error}
		<p class="text-sm text-red-600">{form.error}</p>
	{/if}

	<!-- Tabbed layout -->
	<Tabs.Root bind:value={activeTab}>
		<Tabs.List class="w-full">
			<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
			{#if showBooking}
				<Tabs.Trigger value="booking">Booking</Tabs.Trigger>
			{/if}
			<Tabs.Trigger value="estimate">Estimate</Tabs.Trigger>
			{#if showWork}
				<Tabs.Trigger value="work">Work</Tabs.Trigger>
			{/if}
			{#if showInvoice}
				<Tabs.Trigger value="invoice">Invoice</Tabs.Trigger>
			{/if}
		</Tabs.List>

		<!-- OVERVIEW TAB -->
		<Tabs.Content value="overview">
			<div class="mt-4 space-y-6">
				<!-- Status Progression -->
				{#if job.status !== 'cancelled'}
					<Card.Root>
						<Card.Content class="pt-6">
							<div class="flex items-center justify-between">
								<h2 class="text-sm font-semibold text-gray-700">Workflow Status</h2>
								{#if nextStatus}
									<form
										method="POST"
										action="?/updateStatus"
										use:enhance={() => {
											statusUpdating = true;
											return async ({ result, update }) => {
												statusUpdating = false;
												if (result.type === 'success') {
													job = { ...job, status: nextStatus! };
												}
												await update();
											};
										}}
									>
										<input type="hidden" name="status" value={nextStatus} />
										<Button type="submit" size="sm" disabled={statusUpdating}>
											{statusUpdating ? 'Updating...' : `Advance to ${STATUS_LABELS[nextStatus]}`}
										</Button>
									</form>
								{/if}
							</div>

							<!-- Stepper -->
							<div class="mt-4 overflow-x-auto">
								<div class="flex min-w-max items-center gap-0">
									{#each STATUS_STEPS as step, i}
										{@const isPast = i < currentStepIndex}
										{@const isCurrent = i === currentStepIndex}
										{@const isFuture = i > currentStepIndex}
										<div class="flex items-center">
											<div class="flex flex-col items-center">
												<div
													class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold
													{isPast ? 'bg-green-500 text-white' : ''}
													{isCurrent ? 'bg-slate-900 text-white' : ''}
													{isFuture ? 'bg-gray-200 text-gray-400' : ''}"
												>
													{#if isPast}
														&#10003;
													{:else}
														{i + 1}
													{/if}
												</div>
												<span
													class="mt-1 max-w-[80px] text-center text-xs leading-tight
													{isCurrent ? 'font-semibold text-gray-900' : ''}
													{isPast ? 'text-green-600' : ''}
													{isFuture ? 'text-gray-400' : ''}"
												>
													{STATUS_LABELS[step]}
												</span>
											</div>
											{#if i < STATUS_STEPS.length - 1}
												<div
													class="mx-1 h-0.5 w-8 {isPast || isCurrent ? 'bg-slate-400' : 'bg-gray-200'}"
												></div>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/if}

				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<!-- Customer Card -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Customer</Card.Title>
						</Card.Header>
						<Card.Content>
							{#if job.shop_customers}
								<div class="space-y-2 text-sm">
									<p class="font-medium text-gray-900">{job.shop_customers.name}</p>
									{#if job.shop_customers.phone}
										<p class="text-gray-600">
											<span class="text-gray-400">Phone:</span>
											{job.shop_customers.phone}
										</p>
									{/if}
									{#if job.shop_customers.email}
										<p class="text-gray-600">
											<span class="text-gray-400">Email:</span>
											{job.shop_customers.email}
										</p>
									{/if}
									<Button
										variant="link"
										size="sm"
										href="/shop/customers/{job.customer_id}"
										class="mt-2 h-auto p-0 text-xs"
									>
										View customer profile &rarr;
									</Button>
								</div>
							{:else}
								<div class="space-y-2 text-sm">
									<p class="font-medium text-gray-900">{job.customer_name}</p>
									{#if job.customer_phone}
										<p class="text-gray-600">
											<span class="text-gray-400">Phone:</span>
											{job.customer_phone}
										</p>
									{/if}
									{#if job.customer_email}
										<p class="text-gray-600">
											<span class="text-gray-400">Email:</span>
											{job.customer_email}
										</p>
									{/if}
								</div>
							{/if}
						</Card.Content>
					</Card.Root>

					<!-- Vehicle Card -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Vehicle</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="space-y-2 text-sm">
								<p class="font-medium text-gray-900">
									{job.vehicle_year ? `${job.vehicle_year} ` : ''}{job.vehicle_make}
									{job.vehicle_model}
								</p>
								{#if job.vehicle_reg}
									<p class="text-gray-600">
										<span class="text-gray-400">Reg:</span>
										{job.vehicle_reg}
									</p>
								{/if}
								{#if job.vehicle_vin}
									<p class="text-gray-600">
										<span class="text-gray-400">VIN:</span>
										{job.vehicle_vin}
									</p>
								{/if}
								{#if job.vehicle_color}
									<p class="text-gray-600">
										<span class="text-gray-400">Color:</span>
										{job.vehicle_color}
									</p>
								{/if}
								{#if job.vehicle_mileage}
									<p class="text-gray-600">
										<span class="text-gray-400">Mileage:</span>
										{job.vehicle_mileage.toLocaleString()} km
									</p>
								{/if}
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Job Details Card -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Job Details</Card.Title>
						</Card.Header>
						<Card.Content>
							<form
								method="POST"
								action="?/update"
								use:enhance={() => {
									saving = true;
									return async ({ update }) => {
										saving = false;
										await update({ reset: false });
									};
								}}
								class="space-y-4 text-sm"
							>
								{#if job.job_type === 'autobody'}
									<div>
										<label for="damage_description" class="block text-xs font-medium text-gray-500">
											Damage Description
										</label>
										<textarea
											id="damage_description"
											name="damage_description"
											rows="3"
											bind:value={damageDescription}
											class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
										></textarea>
									</div>
								{:else}
									<div>
										<label for="complaint" class="block text-xs font-medium text-gray-500">
											Customer Complaint
										</label>
										<textarea
											id="complaint"
											name="complaint"
											rows="2"
											bind:value={complaint}
											class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
										></textarea>
									</div>
									<div>
										<label for="diagnosis" class="block text-xs font-medium text-gray-500">
											Diagnosis
										</label>
										<textarea
											id="diagnosis"
											name="diagnosis"
											rows="2"
											bind:value={diagnosis}
											class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
										></textarea>
									</div>
									<div>
										<label for="fault_codes" class="block text-xs font-medium text-gray-500">
											Fault Codes
										</label>
										<Input id="fault_codes" name="fault_codes" type="text" bind:value={faultCodes} />
									</div>
								{/if}
								<Button type="submit" size="sm" disabled={saving}>
									{saving ? 'Saving...' : 'Save Details'}
								</Button>
							</form>
						</Card.Content>
					</Card.Root>

					<!-- Dates Card -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Dates</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="space-y-3 text-sm">
								<div>
									<span class="text-xs font-medium text-gray-400">Date In</span>
									<p class="mt-0.5 text-gray-800">{formatDate(job.date_in)}</p>
								</div>
								<div>
									<span class="text-xs font-medium text-gray-400">Date Completed</span>
									<p class="mt-0.5 text-gray-800">{formatDate(job.date_completed)}</p>
								</div>
								<Separator />
								<form
									method="POST"
									action="?/update"
									use:enhance={() => {
										return async ({ update }) => {
											await update({ reset: false });
										};
									}}
								>
									<label for="date_promised" class="block text-xs font-medium text-gray-400">
										Date Promised
									</label>
									<div class="mt-1 flex items-center gap-2">
										<Input
											id="date_promised"
											name="date_promised"
											type="date"
											bind:value={datepromised}
											class="w-auto"
										/>
										<Button type="submit" size="sm">Save</Button>
									</div>
								</form>
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Notes Card -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Notes</Card.Title>
						</Card.Header>
						<Card.Content>
							<form
								method="POST"
								action="?/update"
								use:enhance={() => {
									saving = true;
									return async ({ update }) => {
										saving = false;
										await update({ reset: false });
									};
								}}
								class="space-y-3"
							>
								<textarea
									name="notes"
									rows="4"
									bind:value={notes}
									placeholder="Add notes about this job..."
									class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
								></textarea>
								<Button type="submit" size="sm" disabled={saving}>
									{saving ? 'Saving...' : 'Save Notes'}
								</Button>
							</form>
						</Card.Content>
					</Card.Root>
				</div>
			</div>
		</Tabs.Content>

		<!-- BOOKING TAB -->
		{#if showBooking}
			<Tabs.Content value="booking">
				<div class="mt-4 space-y-6">
					<!-- Vehicle ID Section -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Vehicle Identification</Card.Title>
							<p class="text-sm text-gray-500">
								Photos of registration plate, VIN, odometer, and other ID markers.
							</p>
						</Card.Header>
						<Card.Content>
							<!-- Photo grid -->
							{#if vehicleIdPhotos.length > 0}
								<div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
									{#each vehicleIdPhotos as photo}
										<div class="group relative aspect-square overflow-hidden rounded-lg bg-gray-100">
											<img
												src={photoUrl(photo.storage_path)}
												alt={photo.label}
												class="h-full w-full object-cover"
											/>
											<!-- Label overlay -->
											<div
												class="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-white"
											>
												{photo.label?.replace('ID: ', '') ?? ''}
											</div>
											<!-- Delete button -->
											<form
												method="POST"
												action="?/deletePhoto"
												use:enhance={() => {
													return async ({ update }) => {
														await update();
													};
												}}
												class="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
											>
												<input type="hidden" name="photo_id" value={photo.id} />
												<input type="hidden" name="storage_path" value={photo.storage_path} />
												<button
													type="submit"
													class="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
													title="Delete photo"
												>
													<X size={12} />
												</button>
											</form>
										</div>
									{/each}
								</div>
							{:else}
								<div
									class="mb-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-8 text-gray-400"
								>
									<Image size={32} class="mb-2" />
									<p class="text-sm">No vehicle ID photos yet</p>
								</div>
							{/if}

							<!-- Upload form -->
							<form
								method="POST"
								action="?/uploadPhoto"
								enctype="multipart/form-data"
								use:enhance={() => {
									uploadingPhoto = true;
									return async ({ update }) => {
										uploadingPhoto = false;
										await update();
									};
								}}
								class="flex flex-wrap items-end gap-3"
							>
								<input type="hidden" name="category" value="before" />
								<div>
									<label for="vehicle-id-label" class="block text-xs font-medium text-gray-500 mb-1">
										Photo Type
									</label>
									<select
										id="vehicle-id-label"
										name="label"
										class="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
									>
										{#each vehicleIdLabels as lbl}
											<option value={lbl}>{lbl.replace('ID: ', '')}</option>
										{/each}
									</select>
								</div>
								<div>
									<label
										for="vehicle-id-file"
										class="block text-xs font-medium text-gray-500 mb-1"
									>
										Photo
									</label>
									<input
										id="vehicle-id-file"
										name="file"
										type="file"
										accept="image/*"
										capture="environment"
										required
										class="text-sm text-gray-600"
									/>
								</div>
								<Button type="submit" size="sm" disabled={uploadingPhoto}>
									<Camera size={14} class="mr-1" />
									{uploadingPhoto ? 'Uploading...' : 'Upload'}
								</Button>
							</form>
						</Card.Content>
					</Card.Root>

					<!-- 360 Exterior Section -->
					<Card.Root>
						<Card.Header>
							<Card.Title>360° Exterior</Card.Title>
							<p class="text-sm text-gray-500">
								Photos of all sides of the vehicle at check-in.
							</p>
						</Card.Header>
						<Card.Content>
							{#if exteriorPhotos.length > 0}
								<div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
									{#each exteriorPhotos as photo}
										<div class="group relative aspect-square overflow-hidden rounded-lg bg-gray-100">
											<img
												src={photoUrl(photo.storage_path)}
												alt={photo.label}
												class="h-full w-full object-cover"
											/>
											<div
												class="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-white"
											>
												{photo.label?.replace('360: ', '') ?? ''}
											</div>
											<form
												method="POST"
												action="?/deletePhoto"
												use:enhance={() => {
													return async ({ update }) => {
														await update();
													};
												}}
												class="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
											>
												<input type="hidden" name="photo_id" value={photo.id} />
												<input type="hidden" name="storage_path" value={photo.storage_path} />
												<button
													type="submit"
													class="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
													title="Delete photo"
												>
													<X size={12} />
												</button>
											</form>
										</div>
									{/each}
								</div>
							{:else}
								<div
									class="mb-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-8 text-gray-400"
								>
									<Image size={32} class="mb-2" />
									<p class="text-sm">No exterior photos yet</p>
								</div>
							{/if}

							<form
								method="POST"
								action="?/uploadPhoto"
								enctype="multipart/form-data"
								use:enhance={() => {
									uploadingPhoto = true;
									return async ({ update }) => {
										uploadingPhoto = false;
										await update();
									};
								}}
								class="flex flex-wrap items-end gap-3"
							>
								<input type="hidden" name="category" value="before" />
								<div>
									<label for="exterior-label" class="block text-xs font-medium text-gray-500 mb-1">
										Position
									</label>
									<select
										id="exterior-label"
										name="label"
										class="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
									>
										{#each exteriorLabels as lbl}
											<option value={lbl}>{lbl.replace('360: ', '')}</option>
										{/each}
									</select>
								</div>
								<div>
									<label for="exterior-file" class="block text-xs font-medium text-gray-500 mb-1">
										Photo
									</label>
									<input
										id="exterior-file"
										name="file"
										type="file"
										accept="image/*"
										capture="environment"
										required
										class="text-sm text-gray-600"
									/>
								</div>
								<Button type="submit" size="sm" disabled={uploadingPhoto}>
									<Camera size={14} class="mr-1" />
									{uploadingPhoto ? 'Uploading...' : 'Upload'}
								</Button>
							</form>
						</Card.Content>
					</Card.Root>

					<!-- Pre-existing Damage Section -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Pre-existing Damage</Card.Title>
							<p class="text-sm text-gray-500">
								Document any existing damage at the time of check-in.
							</p>
						</Card.Header>
						<Card.Content>
							{#if damagePhotos.length > 0}
								<div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
									{#each damagePhotos as photo}
										<div class="group relative aspect-square overflow-hidden rounded-lg bg-gray-100">
											<img
												src={photoUrl(photo.storage_path)}
												alt={photo.label}
												class="h-full w-full object-cover"
											/>
											{#if photo.label}
												<div
													class="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-white"
												>
													{photo.label}
												</div>
											{/if}
											<form
												method="POST"
												action="?/deletePhoto"
												use:enhance={() => {
													return async ({ update }) => {
														await update();
													};
												}}
												class="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
											>
												<input type="hidden" name="photo_id" value={photo.id} />
												<input type="hidden" name="storage_path" value={photo.storage_path} />
												<button
													type="submit"
													class="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
													title="Delete photo"
												>
													<X size={12} />
												</button>
											</form>
										</div>
									{/each}
								</div>
							{:else}
								<div
									class="mb-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-8 text-gray-400"
								>
									<Image size={32} class="mb-2" />
									<p class="text-sm">No damage photos yet</p>
								</div>
							{/if}

							<form
								method="POST"
								action="?/uploadPhoto"
								enctype="multipart/form-data"
								use:enhance={() => {
									uploadingPhoto = true;
									return async ({ update }) => {
										uploadingPhoto = false;
										await update();
									};
								}}
								class="flex flex-wrap items-end gap-3"
							>
								<input type="hidden" name="category" value="damage" />
								<div>
									<label for="damage-label" class="block text-xs font-medium text-gray-500 mb-1">
										Description
									</label>
									<input
										id="damage-label"
										name="label"
										type="text"
										placeholder="e.g. Scratch on front bumper"
										class="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
									/>
								</div>
								<div>
									<label for="damage-file" class="block text-xs font-medium text-gray-500 mb-1">
										Photo
									</label>
									<input
										id="damage-file"
										name="file"
										type="file"
										accept="image/*"
										capture="environment"
										required
										class="text-sm text-gray-600"
									/>
								</div>
								<Button type="submit" size="sm" disabled={uploadingPhoto}>
									<Camera size={14} class="mr-1" />
									{uploadingPhoto ? 'Uploading...' : 'Upload'}
								</Button>
							</form>
						</Card.Content>
					</Card.Root>
				</div>
			</Tabs.Content>
		{/if}

		<!-- ESTIMATE TAB -->
		<Tabs.Content value="estimate">
			<div class="mt-4 space-y-4">
				{#if estimates.length > 0}
					<Card.Root>
						<Card.Header>
							<Card.Title>Estimates</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="divide-y divide-gray-100">
								{#each estimates as estimate}
									<div class="flex items-center justify-between py-2.5 text-sm">
										<div>
											<p class="font-medium text-gray-900">{estimate.estimate_number}</p>
											<p class="text-xs text-gray-500 capitalize">{estimate.status}</p>
										</div>
										<div class="flex items-center gap-4">
											{#if estimate.total != null}
												<span class="font-medium text-gray-800">
													R {Number(estimate.total).toLocaleString('en-ZA', {
														minimumFractionDigits: 2,
														maximumFractionDigits: 2
													})}
												</span>
											{/if}
											<Button
												variant="link"
												size="sm"
												href="/shop/estimates/{estimate.id}"
												class="h-auto p-0 text-xs"
											>
												View &rarr;
											</Button>
										</div>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{:else}
					<Card.Root>
						<Card.Content class="py-10 text-center text-sm text-gray-500">
							No estimates yet for this job.
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		</Tabs.Content>

		<!-- WORK TAB -->
		{#if showWork}
			<Tabs.Content value="work">
				<div class="mt-4 space-y-6">
					<Card.Root>
						<Card.Header>
							<Card.Title>Work in Progress Photos</Card.Title>
							<p class="text-sm text-gray-500">Document the repair work as it progresses.</p>
						</Card.Header>
						<Card.Content>
							{#if workPhotos.length > 0}
								<div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
									{#each workPhotos as photo}
										<div class="group relative aspect-square overflow-hidden rounded-lg bg-gray-100">
											<img
												src={photoUrl(photo.storage_path)}
												alt={photo.label}
												class="h-full w-full object-cover"
											/>
											{#if photo.label}
												<div
													class="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-white"
												>
													{photo.label}
												</div>
											{/if}
											<form
												method="POST"
												action="?/deletePhoto"
												use:enhance={() => {
													return async ({ update }) => {
														await update();
													};
												}}
												class="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
											>
												<input type="hidden" name="photo_id" value={photo.id} />
												<input type="hidden" name="storage_path" value={photo.storage_path} />
												<button
													type="submit"
													class="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
													title="Delete photo"
												>
													<X size={12} />
												</button>
											</form>
										</div>
									{/each}
								</div>
							{:else}
								<div
									class="mb-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-8 text-gray-400"
								>
									<Image size={32} class="mb-2" />
									<p class="text-sm">No work photos yet</p>
								</div>
							{/if}

							<form
								method="POST"
								action="?/uploadPhoto"
								enctype="multipart/form-data"
								use:enhance={() => {
									uploadingPhoto = true;
									return async ({ update }) => {
										uploadingPhoto = false;
										await update();
									};
								}}
								class="flex flex-wrap items-end gap-3"
							>
								<input type="hidden" name="category" value="during" />
								<div>
									<label for="work-label" class="block text-xs font-medium text-gray-500 mb-1">
										Description (optional)
									</label>
									<input
										id="work-label"
										name="label"
										type="text"
										placeholder="e.g. Panel after straightening"
										class="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
									/>
								</div>
								<div>
									<label for="work-file" class="block text-xs font-medium text-gray-500 mb-1">
										Photo
									</label>
									<input
										id="work-file"
										name="file"
										type="file"
										accept="image/*"
										capture="environment"
										required
										class="text-sm text-gray-600"
									/>
								</div>
								<Button type="submit" size="sm" disabled={uploadingPhoto}>
									<Camera size={14} class="mr-1" />
									{uploadingPhoto ? 'Uploading...' : 'Upload'}
								</Button>
							</form>
						</Card.Content>
					</Card.Root>
				</div>
			</Tabs.Content>
		{/if}

		<!-- INVOICE TAB -->
		{#if showInvoice}
			<Tabs.Content value="invoice">
				<div class="mt-4 space-y-4">
					{#if existingInvoice}
						<Card.Root>
							<Card.Header>
								<Card.Title>Invoice</Card.Title>
							</Card.Header>
							<Card.Content>
								<div class="flex items-center justify-between">
									<div>
										<p class="font-medium text-gray-900">{existingInvoice.invoice_number}</p>
										<p class="text-xs text-gray-500 capitalize">{existingInvoice.status ?? ''}</p>
									</div>
									<Button
										variant="outline"
										size="sm"
										href="/shop/invoices/{existingInvoice.id}"
									>
										View Invoice
									</Button>
								</div>
							</Card.Content>
						</Card.Root>
					{:else if canCreateInvoice}
						<Card.Root>
							<Card.Content class="py-8 text-center">
								<p class="mb-4 text-sm text-gray-500">No invoice has been created for this job yet.</p>
								{#if form?.error}
									<p class="mb-3 text-sm text-red-600">{form.error}</p>
								{/if}
								<form
									method="POST"
									action="?/createInvoice"
									use:enhance={() => {
										creatingInvoice = true;
										return async ({ update }) => {
											creatingInvoice = false;
											await update();
										};
									}}
								>
									<Button type="submit" variant="default" size="sm" disabled={creatingInvoice}>
										{creatingInvoice ? 'Creating...' : 'Create Invoice'}
									</Button>
								</form>
							</Card.Content>
						</Card.Root>
					{:else}
						<Card.Root>
							<Card.Content class="py-10 text-center text-sm text-gray-500">
								Invoice will be available once the job is ready for collection.
							</Card.Content>
						</Card.Root>
					{/if}
				</div>
			</Tabs.Content>
		{/if}
	</Tabs.Root>
</div>
