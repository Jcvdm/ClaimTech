<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { cn } from '$lib/utils';
	import { loadGooglePlaces, isGooglePlacesLoaded, createSessionToken, isGooglePlacesConfigured } from '$lib/utils/google-places';
	import { addressService } from '$lib/services/address.service';
	import type { StructuredAddress } from '$lib/types/address';
	import { PROVINCES } from '$lib/types/engineer';
	import { MapPin, Edit2, X, Loader2, Navigation } from 'lucide-svelte';

	type Props = {
		value: StructuredAddress | null;
		onchange?: (address: StructuredAddress | null) => void;
		required?: boolean;
		placeholder?: string;
		allowManualEntry?: boolean;
		label?: string;
		error?: string;
		disabled?: boolean;
		class?: string;
	};

	let {
		value = $bindable(null),
		onchange,
		required = false,
		placeholder = 'Start typing an address...',
		allowManualEntry = true,
		label = 'Address',
		error = '',
		disabled = false,
		class: className = ''
	}: Props = $props();

	// State
	let inputValue = $state(value?.formatted_address ?? '');
	let isLoading = $state(false);
	let apiError = $state<string | null>(null);
	let isManualMode = $state(false);
	let showSuggestions = $state(false);
	let suggestions = $state<google.maps.places.AutocompletePrediction[]>([]);
	let selectedIndex = $state(-1);
	let autocompleteService: google.maps.places.AutocompleteService | null = null;
	let placesService: google.maps.places.PlacesService | null = null;
	let sessionToken: google.maps.places.AutocompleteSessionToken | null = null;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	// Manual entry fields
	let manualStreet = $state(value?.street_address ?? '');
	let manualSuburb = $state(value?.suburb ?? '');
	let manualCity = $state(value?.city ?? '');
	let manualProvince = $state(value?.province ?? '');
	let manualPostalCode = $state(value?.postal_code ?? '');

	// Derived
	let hasValue = $derived(!!value && !!value.formatted_address);
	let hasCoordinates = $derived(addressService.hasCoordinates(value));

	// Sync input value when value prop changes externally
	$effect(() => {
		if (value?.formatted_address && value.formatted_address !== inputValue) {
			inputValue = value.formatted_address;
		}
	});

	// Initialize Google Places
	onMount(async () => {
		if (!browser) return;

		// Check if API key is configured
		if (!isGooglePlacesConfigured()) {
			apiError = 'Address autocomplete not configured';
			return;
		}

		try {
			isLoading = true;
			await loadGooglePlaces();

			if (isGooglePlacesLoaded()) {
				autocompleteService = new google.maps.places.AutocompleteService();
				// Create a dummy div for PlacesService (required)
				const dummyElement = document.createElement('div');
				placesService = new google.maps.places.PlacesService(dummyElement);
				sessionToken = createSessionToken();
			}
		} catch (err) {
			apiError = err instanceof Error ? err.message : 'Failed to load address service';
			console.error('Google Places load error:', err);
		} finally {
			isLoading = false;
		}
	});

	// Handle input changes with debounce
	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		inputValue = target.value;

		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		if (!inputValue || inputValue.length < 3) {
			suggestions = [];
			showSuggestions = false;
			return;
		}

		debounceTimer = setTimeout(() => {
			fetchSuggestions(inputValue);
		}, 300);
	}

	// Fetch autocomplete suggestions
	async function fetchSuggestions(query: string) {
		if (!autocompleteService || !query) return;

		try {
			const request: google.maps.places.AutocompletionRequest = {
				input: query,
				componentRestrictions: { country: 'za' }, // South Africa only
				sessionToken: sessionToken ?? undefined
			};

			autocompleteService.getPlacePredictions(request, (results, status) => {
				if (status === google.maps.places.PlacesServiceStatus.OK && results) {
					suggestions = results;
					showSuggestions = true;
					selectedIndex = -1;
				} else {
					suggestions = [];
					showSuggestions = false;
				}
			});
		} catch (err) {
			console.error('Autocomplete error:', err);
		}
	}

	// Handle suggestion selection
	async function selectSuggestion(prediction: google.maps.places.AutocompletePrediction) {
		if (!placesService) return;

		isLoading = true;
		showSuggestions = false;

		try {
			const request: google.maps.places.PlaceDetailsRequest = {
				placeId: prediction.place_id,
				fields: ['formatted_address', 'geometry', 'address_components', 'place_id'],
				sessionToken: sessionToken ?? undefined
			};

			placesService.getDetails(request, (place, status) => {
				if (status === google.maps.places.PlacesServiceStatus.OK && place) {
					const structuredAddress = addressService.parseGooglePlaceResult(place);

					// Validate SA address
					const validation = addressService.validateSAAddress(structuredAddress);
					if (!validation.valid) {
						console.warn('Address validation warnings:', validation.errors);
					}

					value = structuredAddress;
					inputValue = structuredAddress.formatted_address;
					onchange?.(structuredAddress);

					// Create new session token for next search
					sessionToken = createSessionToken();
				}
				isLoading = false;
			});
		} catch (err) {
			console.error('Place details error:', err);
			isLoading = false;
		}
	}

	// Keyboard navigation
	function handleKeydown(e: KeyboardEvent) {
		if (!showSuggestions || suggestions.length === 0) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				break;
			case 'Enter':
				e.preventDefault();
				if (selectedIndex >= 0) {
					selectSuggestion(suggestions[selectedIndex]);
				}
				break;
			case 'Escape':
				showSuggestions = false;
				selectedIndex = -1;
				break;
		}
	}

	// Clear address
	function clearAddress() {
		value = null;
		inputValue = '';
		suggestions = [];
		showSuggestions = false;
		onchange?.(null);
	}

	// Toggle manual entry mode
	function toggleManualMode() {
		isManualMode = !isManualMode;
		if (isManualMode && value) {
			// Populate manual fields from current value
			manualStreet = value.street_address ?? '';
			manualSuburb = value.suburb ?? '';
			manualCity = value.city ?? '';
			manualProvince = value.province ?? '';
			manualPostalCode = value.postal_code ?? '';
		}
	}

	// Handle manual entry save
	function saveManualEntry() {
		const formatted = [manualStreet, manualSuburb, manualCity, manualProvince, manualPostalCode].filter(Boolean).join(', ');

		if (!formatted) {
			clearAddress();
			isManualMode = false;
			return;
		}

		const manualAddress: StructuredAddress = {
			formatted_address: formatted,
			street_address: manualStreet || undefined,
			suburb: manualSuburb || undefined,
			city: manualCity || undefined,
			province: (manualProvince as StructuredAddress['province']) || undefined,
			postal_code: manualPostalCode || undefined,
			country: 'South Africa'
		};

		value = manualAddress;
		inputValue = formatted;
		onchange?.(manualAddress);
		isManualMode = false;
	}

	// Open in Google Maps
	function openInMaps() {
		if (!value) return;
		const url = addressService.getGoogleMapsUrl(value);
		window.open(url, '_blank');
	}

	// Handle blur to close suggestions
	function handleBlur() {
		// Delay to allow click on suggestion
		setTimeout(() => {
			showSuggestions = false;
		}, 200);
	}
</script>

<div class={cn('space-y-2', className)}>
	{#if label}
		<Label class="text-sm font-medium text-gray-700">
			{label}
			{#if required}
				<span class="text-red-500">*</span>
			{/if}
		</Label>
	{/if}

	<div class="relative">
		<!-- Main Input -->
		<div class="relative flex items-center">
			<MapPin class="pointer-events-none absolute left-3 h-4 w-4 text-gray-400" />

			<Input
				type="text"
				value={inputValue}
				{placeholder}
				{required}
				disabled={disabled || isLoading}
				oninput={handleInput}
				onkeydown={handleKeydown}
				onblur={handleBlur}
				onfocus={() => inputValue.length >= 3 && fetchSuggestions(inputValue)}
				class={cn('pl-10 pr-20', error && 'border-red-500 focus-visible:ring-red-500')}
				autocomplete="off"
			/>

			<!-- Action buttons -->
			<div class="absolute right-2 flex items-center gap-1">
				{#if isLoading}
					<Loader2 class="h-4 w-4 animate-spin text-gray-400" />
				{/if}

				{#if hasValue && !disabled}
					{#if hasCoordinates}
						<button type="button" onclick={openInMaps} class="rounded p-1 hover:bg-gray-100" title="Open in Google Maps">
							<Navigation class="h-4 w-4 text-gray-500" />
						</button>
					{/if}

					<button type="button" onclick={clearAddress} class="rounded p-1 hover:bg-gray-100" title="Clear address">
						<X class="h-4 w-4 text-gray-500" />
					</button>
				{/if}

				{#if allowManualEntry && !disabled}
					<button type="button" onclick={toggleManualMode} class="rounded p-1 hover:bg-gray-100" title={isManualMode ? 'Use autocomplete' : 'Enter manually'}>
						<Edit2 class="h-4 w-4 text-gray-500" />
					</button>
				{/if}
			</div>
		</div>

		<!-- Autocomplete Suggestions Dropdown -->
		{#if showSuggestions && suggestions.length > 0 && !isManualMode}
			<div class="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
				<ul class="max-h-60 overflow-auto py-1">
					{#each suggestions as suggestion, index}
						<li>
							<button type="button" class={cn('w-full px-4 py-2 text-left text-sm hover:bg-gray-100', index === selectedIndex && 'bg-gray-100')} onclick={() => selectSuggestion(suggestion)}>
								<div class="font-medium text-gray-900">
									{suggestion.structured_formatting?.main_text ?? suggestion.description}
								</div>
								{#if suggestion.structured_formatting?.secondary_text}
									<div class="text-xs text-gray-500">
										{suggestion.structured_formatting.secondary_text}
									</div>
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>

	<!-- API Error / Manual Entry Prompt -->
	{#if apiError && !isManualMode}
		<p class="text-xs text-amber-600">
			{apiError}.
			{#if allowManualEntry}
				<button type="button" class="underline" onclick={toggleManualMode}> Enter manually </button>
			{/if}
		</p>
	{/if}

	<!-- Validation Error -->
	{#if error}
		<p class="text-sm text-red-500">{error}</p>
	{/if}

	<!-- Address Details Preview (when has value) -->
	{#if hasValue && value && !isManualMode}
		<div class="rounded-md bg-gray-50 p-3 text-sm">
			<div class="flex items-start justify-between">
				<div class="space-y-1">
					{#if value.street_address}
						<div class="text-gray-700">{value.street_address}</div>
					{/if}
					{#if value.suburb}
						<div class="text-gray-600">{value.suburb}</div>
					{/if}
					{#if value.city || value.postal_code}
						<div class="text-gray-600">
							{[value.city, value.postal_code].filter(Boolean).join(', ')}
						</div>
					{/if}
					{#if value.province}
						<div class="text-gray-500">{value.province}</div>
					{/if}
				</div>
				{#if hasCoordinates}
					<div class="text-xs text-gray-400">GPS: {value.latitude?.toFixed(4)}, {value.longitude?.toFixed(4)}</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Manual Entry Form -->
	{#if isManualMode}
		<div class="space-y-3 rounded-md border border-gray-200 p-4">
			<div class="grid gap-3 sm:grid-cols-2">
				<div>
					<Label class="text-xs text-gray-600">Street Address</Label>
					<Input type="text" bind:value={manualStreet} placeholder="123 Main Street" class="mt-1" />
				</div>
				<div>
					<Label class="text-xs text-gray-600">Suburb</Label>
					<Input type="text" bind:value={manualSuburb} placeholder="Sandton" class="mt-1" />
				</div>
				<div>
					<Label class="text-xs text-gray-600">City</Label>
					<Input type="text" bind:value={manualCity} placeholder="Johannesburg" class="mt-1" />
				</div>
				<div>
					<Label class="text-xs text-gray-600">Province</Label>
					<select bind:value={manualProvince} class="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
						<option value="">Select province...</option>
						{#each PROVINCES as province}
							<option value={province}>{province}</option>
						{/each}
					</select>
				</div>
				<div>
					<Label class="text-xs text-gray-600">Postal Code</Label>
					<Input type="text" bind:value={manualPostalCode} placeholder="2196" maxlength={4} class="mt-1" />
				</div>
			</div>

			<div class="flex justify-end gap-2 pt-2">
				<button type="button" onclick={toggleManualMode} class="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"> Cancel </button>
				<button type="button" onclick={saveManualEntry} class="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"> Save Address </button>
			</div>
		</div>
	{/if}
</div>
