import type { Province } from './engineer';

/**
 * Structured address format for South African addresses
 * Used for incident locations, owner addresses, and appointment locations
 */
export interface StructuredAddress {
	// Display/input field
	formatted_address: string; // Full formatted string for display

	// Structured components
	street_address?: string; // Street number + name
	suburb?: string; // Suburb/neighborhood
	city?: string; // City/town
	province?: Province; // SA province
	postal_code?: string; // SA postal code (4 digits)
	country?: string; // Default 'South Africa'

	// Coordinates
	latitude?: number;
	longitude?: number;

	// Metadata
	place_id?: string; // Google Places ID for reference
	notes?: string; // Additional location notes
}

/**
 * Props interface for AddressInput component
 */
export interface AddressInputProps {
	value: StructuredAddress | null;
	onchange: (address: StructuredAddress | null) => void;
	required?: boolean;
	placeholder?: string;
	showMap?: boolean; // Show mini-map preview
	allowManualEntry?: boolean; // Allow bypassing autocomplete
	label?: string;
	error?: string;
	disabled?: boolean;
}

// Validation constants
export const SA_POSTAL_CODE_REGEX = /^\d{4}$/;

// South Africa geographic bounds (roughly)
export const SA_BOUNDS = {
	lat: { min: -35, max: -22 },
	lng: { min: 16, max: 33 }
};

/**
 * Validate South African postal code format (4 digits)
 */
export function isValidSAPostalCode(code: string | undefined | null): boolean {
	if (!code) return true; // Optional field
	return SA_POSTAL_CODE_REGEX.test(code);
}

/**
 * Check if coordinates are within South African bounds
 */
export function isWithinSABounds(lat: number | undefined, lng: number | undefined): boolean {
	if (lat === undefined || lng === undefined) return true; // Optional
	return lat >= SA_BOUNDS.lat.min && lat <= SA_BOUNDS.lat.max && lng >= SA_BOUNDS.lng.min && lng <= SA_BOUNDS.lng.max;
}

/**
 * Format address as single line string
 */
export function formatAddressOneLine(address: StructuredAddress | null): string {
	if (!address) return '';
	if (address.formatted_address) return address.formatted_address;

	const parts = [address.street_address, address.suburb, address.city, address.province, address.postal_code].filter(Boolean);

	return parts.join(', ');
}

/**
 * Format address as multiple lines for display
 */
export function formatAddressMultiLine(address: StructuredAddress | null): string[] {
	if (!address) return [];

	const lines: string[] = [];

	if (address.street_address) lines.push(address.street_address);
	if (address.suburb) lines.push(address.suburb);
	if (address.city && address.postal_code) {
		lines.push(`${address.city}, ${address.postal_code}`);
	} else if (address.city) {
		lines.push(address.city);
	}
	if (address.province) lines.push(address.province);

	return lines;
}

/**
 * Create empty structured address
 */
export function createEmptyAddress(): StructuredAddress {
	return {
		formatted_address: '',
		country: 'South Africa'
	};
}

/**
 * Check if address has meaningful content
 */
export function hasAddressContent(address: StructuredAddress | null): boolean {
	if (!address) return false;
	return !!(address.formatted_address || address.street_address || address.city || address.suburb);
}

/**
 * Check if address has GPS coordinates
 */
export function hasCoordinates(address: StructuredAddress | null): boolean {
	return address?.latitude !== undefined && address?.longitude !== undefined;
}
