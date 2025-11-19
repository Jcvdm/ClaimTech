import { companySettingsService } from '$lib/services/company-settings.service';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { sanitizeInput } from '$lib/utils/sanitize';

// Maximum length for T&Cs fields (10,000 characters)
const MAX_TCS_LENGTH = 10000;

export const load: PageServerLoad = async ({ locals }) => {
	const settings = await companySettingsService.getSettings(locals.supabase);

	return {
		settings
	};
};

export const actions: Actions = {
    update: async ({ request, locals }) => {
        const formData = await request.formData();

		// Get T&Cs fields and sanitize them
		const assessmentTCs = formData.get('assessment_terms_and_conditions') as string | null;
		const estimateTCs = formData.get('estimate_terms_and_conditions') as string | null;
		const frcTCs = formData.get('frc_terms_and_conditions') as string | null;
		const additionalsTCs = formData.get('additionals_terms_and_conditions') as string | null;

		// Validate T&Cs length
		if (assessmentTCs && assessmentTCs.length > MAX_TCS_LENGTH) {
			return fail(400, {
				error: `Assessment Terms & Conditions too long (max ${MAX_TCS_LENGTH} characters)`
			});
		}
		if (estimateTCs && estimateTCs.length > MAX_TCS_LENGTH) {
			return fail(400, {
				error: `Estimate Terms & Conditions too long (max ${MAX_TCS_LENGTH} characters)`
			});
		}
		if (frcTCs && frcTCs.length > MAX_TCS_LENGTH) {
			return fail(400, {
				error: `FRC Terms & Conditions too long (max ${MAX_TCS_LENGTH} characters)`
			});
		}
		if (additionalsTCs && additionalsTCs.length > MAX_TCS_LENGTH) {
			return fail(400, {
				error: `Additionals Terms & Conditions too long (max ${MAX_TCS_LENGTH} characters)`
			});
		}

        const input = {
            company_name: formData.get('company_name') as string,
            po_box: formData.get('po_box') as string,
            city: formData.get('city') as string,
            province: formData.get('province') as string,
            postal_code: formData.get('postal_code') as string,
            phone: formData.get('phone') as string,
            fax: formData.get('fax') as string,
            email: formData.get('email') as string,
            website: formData.get('website') as string,
            // Sanitize T&Cs (trim whitespace, normalize line breaks)
			assessment_terms_and_conditions: assessmentTCs ? sanitizeInput(assessmentTCs) : null,
			estimate_terms_and_conditions: estimateTCs ? sanitizeInput(estimateTCs) : null,
			frc_terms_and_conditions: frcTCs ? sanitizeInput(frcTCs) : null,
			additionals_terms_and_conditions: additionalsTCs ? sanitizeInput(additionalsTCs) : null,
            sundries_percentage: (() => {
                const raw = formData.get('sundries_percentage') as string | null;
                if (!raw) return undefined;
                const num = Number(raw);
                if (Number.isNaN(num)) return undefined;
                const clamped = Math.min(100, Math.max(0, num));
                return Number(clamped.toFixed(2));
            })()
        };

		try {
			const updated = await companySettingsService.updateSettings(input, locals.supabase);
			return { success: true, settings: updated };
		} catch (error) {
			console.error('Error updating settings:', error);
			return fail(500, { error: 'Failed to update settings' });
		}
	}
};

