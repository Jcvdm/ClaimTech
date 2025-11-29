import { browser } from '$app/environment';

let loadPromise: Promise<void> | null = null;
let isLoaded = false;

/**
 * Load Google Places API script dynamically
 * Only loads once, subsequent calls return cached promise
 */
export function loadGooglePlaces(): Promise<void> {
	if (!browser) {
		return Promise.reject(new Error('Google Places can only be loaded in browser'));
	}

	if (isLoaded) {
		return Promise.resolve();
	}

	if (loadPromise) {
		return loadPromise;
	}

	loadPromise = new Promise((resolve, reject) => {
		// Check if already loaded (e.g., via script tag)
		if (window.google?.maps?.places) {
			isLoaded = true;
			resolve();
			return;
		}

		const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

		if (!apiKey) {
			console.warn('VITE_GOOGLE_PLACES_API_KEY not configured - address autocomplete will be disabled');
			reject(new Error('Google Places API key not configured'));
			return;
		}

		const script = document.createElement('script');
		script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&region=ZA`;
		script.async = true;
		script.defer = true;

		script.onload = () => {
			isLoaded = true;
			resolve();
		};

		script.onerror = () => {
			loadPromise = null;
			reject(new Error('Failed to load Google Places API'));
		};

		document.head.appendChild(script);
	});

	return loadPromise;
}

/**
 * Check if Google Places API is available
 */
export function isGooglePlacesLoaded(): boolean {
	return browser && isLoaded && !!window.google?.maps?.places;
}

/**
 * Check if API key is configured
 */
export function isGooglePlacesConfigured(): boolean {
	return !!import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
}

/**
 * Create session token for autocomplete (reduces API costs)
 * Session tokens allow multiple autocomplete requests to be billed as a single session
 */
export function createSessionToken(): google.maps.places.AutocompleteSessionToken | null {
	if (!isGooglePlacesLoaded()) return null;
	return new google.maps.places.AutocompleteSessionToken();
}

/**
 * Debounce helper for autocomplete input
 */
export function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout>;
	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), delay);
	};
}
