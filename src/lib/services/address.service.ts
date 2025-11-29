import type { StructuredAddress } from '$lib/types/address';
import type { Province } from '$lib/types/engineer';
import { PROVINCES } from '$lib/types/engineer';
import { isValidSAPostalCode, isWithinSABounds, formatAddressOneLine, formatAddressMultiLine, hasCoordinates } from '$lib/types/address';

/**
 * Province mapping from Google's administrative_area_level_1 to our Province type
 */
const GOOGLE_PROVINCE_MAP: Record<string, Province> = {
	'Eastern Cape': 'Eastern Cape',
	'Free State': 'Free State',
	Gauteng: 'Gauteng',
	'KwaZulu-Natal': 'KwaZulu-Natal',
	Limpopo: 'Limpopo',
	Mpumalanga: 'Mpumalanga',
	'Northern Cape': 'Northern Cape',
	'North West': 'North West',
	'Western Cape': 'Western Cape'
};

export interface AddressValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

export class AddressService {
	/**
	 * Parse Google Places result into StructuredAddress
	 */
	parseGooglePlaceResult(place: google.maps.places.PlaceResult): StructuredAddress {
		const address: StructuredAddress = {
			formatted_address: place.formatted_address || '',
			latitude: place.geometry?.location?.lat(),
			longitude: place.geometry?.location?.lng(),
			place_id: place.place_id,
			country: 'South Africa'
		};

		// Parse address components
		if (place.address_components) {
			for (const component of place.address_components) {
				const types = component.types;

				if (types.includes('street_number')) {
					address.street_address = component.long_name;
				}
				if (types.includes('route')) {
					address.street_address = address.street_address ? `${address.street_address} ${component.long_name}` : component.long_name;
				}
				if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
					address.suburb = component.long_name;
				}
				if (types.includes('locality')) {
					address.city = component.long_name;
				}
				if (types.includes('administrative_area_level_1')) {
					const province = GOOGLE_PROVINCE_MAP[component.long_name];
					if (province) {
						address.province = province;
					}
				}
				if (types.includes('postal_code')) {
					address.postal_code = component.long_name;
				}
				if (types.includes('country')) {
					address.country = component.long_name;
				}
			}
		}

		return address;
	}

	/**
	 * Validate South African address
	 */
	validateSAAddress(address: StructuredAddress): AddressValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Check province
		if (address.province && !PROVINCES.includes(address.province)) {
			errors.push(`Invalid province: ${address.province}`);
		}

		// Check postal code format (4 digits for SA)
		if (address.postal_code && !isValidSAPostalCode(address.postal_code)) {
			warnings.push('Postal code should be 4 digits for South Africa');
		}

		// Check country
		if (address.country && address.country !== 'South Africa' && address.country !== 'ZA') {
			warnings.push('Address appears to be outside South Africa');
		}

		// Check coordinates are in SA bounds
		if (!isWithinSABounds(address.latitude, address.longitude)) {
			warnings.push('Coordinates appear to be outside South African boundaries');
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings
		};
	}

	/**
	 * Format address for display (one line)
	 */
	formatOneLine(address: StructuredAddress | null): string {
		return formatAddressOneLine(address);
	}

	/**
	 * Format address for display (multi-line)
	 */
	formatMultiLine(address: StructuredAddress | null): string[] {
		return formatAddressMultiLine(address);
	}

	/**
	 * Convert legacy text address to structured (best effort)
	 * Useful for displaying old data before user edits
	 */
	parseLegacyAddress(text: string | null): StructuredAddress | null {
		if (!text || text.trim() === '') return null;

		return {
			formatted_address: text
			// Other fields remain undefined until user edits with autocomplete
		};
	}

	/**
	 * Check if address has coordinates
	 */
	hasCoordinates(address: StructuredAddress | null): boolean {
		return hasCoordinates(address);
	}

	/**
	 * Get Google Maps URL for address
	 */
	getGoogleMapsUrl(address: StructuredAddress): string {
		if (address.latitude && address.longitude) {
			return `https://www.google.com/maps?q=${address.latitude},${address.longitude}`;
		}
		return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.formatted_address)}`;
	}

	/**
	 * Get directions URL (from user's location to address)
	 */
	getDirectionsUrl(address: StructuredAddress): string {
		if (address.latitude && address.longitude) {
			return `https://www.google.com/maps/dir/?api=1&destination=${address.latitude},${address.longitude}`;
		}
		return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address.formatted_address)}`;
	}

	/**
	 * Extract flat fields for database storage
	 * Used when saving to requests/appointments tables
	 */
	toFlatFields(address: StructuredAddress | null, prefix: string): Record<string, unknown> {
		if (!address) {
			return {
				[`${prefix}_street_address`]: null,
				[`${prefix}_suburb`]: null,
				[`${prefix}_city`]: null,
				[`${prefix}_province`]: null,
				[`${prefix}_postal_code`]: null,
				[`${prefix}_latitude`]: null,
				[`${prefix}_longitude`]: null,
				[`${prefix}_place_id`]: null
			};
		}

		return {
			[`${prefix}_street_address`]: address.street_address || null,
			[`${prefix}_suburb`]: address.suburb || null,
			[`${prefix}_city`]: address.city || null,
			[`${prefix}_province`]: address.province || null,
			[`${prefix}_postal_code`]: address.postal_code || null,
			[`${prefix}_latitude`]: address.latitude || null,
			[`${prefix}_longitude`]: address.longitude || null,
			[`${prefix}_place_id`]: address.place_id || null
		};
	}

	/**
	 * Create StructuredAddress from flat database fields
	 * Used when loading from requests/appointments tables
	 */
	fromFlatFields(
		data: Record<string, unknown>,
		prefix: string,
		legacyField?: string
	): StructuredAddress | null {
		const streetAddress = data[`${prefix}_street_address`] as string | null;
		const suburb = data[`${prefix}_suburb`] as string | null;
		const city = data[`${prefix}_city`] as string | null;
		const province = data[`${prefix}_province`] as Province | null;
		const postalCode = data[`${prefix}_postal_code`] as string | null;
		const latitude = data[`${prefix}_latitude`] as number | null;
		const longitude = data[`${prefix}_longitude`] as number | null;
		const placeId = data[`${prefix}_place_id`] as string | null;
		const legacyAddress = legacyField ? (data[legacyField] as string | null) : null;

		// Check if we have any structured data
		const hasStructuredData = streetAddress || suburb || city || province || postalCode || latitude || longitude;

		if (!hasStructuredData && !legacyAddress) {
			return null;
		}

		// Build formatted address from components if not using legacy
		let formattedAddress = legacyAddress || '';
		if (hasStructuredData && !formattedAddress) {
			formattedAddress = [streetAddress, suburb, city, province, postalCode].filter(Boolean).join(', ');
		}

		return {
			formatted_address: formattedAddress,
			street_address: streetAddress || undefined,
			suburb: suburb || undefined,
			city: city || undefined,
			province: province || undefined,
			postal_code: postalCode || undefined,
			latitude: latitude || undefined,
			longitude: longitude || undefined,
			place_id: placeId || undefined,
			country: 'South Africa'
		};
	}
}

// Export singleton instance
export const addressService = new AddressService();
