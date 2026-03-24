import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createShopJobService } from '$lib/services/shop-job.service';
import type { ShopJobStatus } from '$lib/services/shop-job.service';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { supabase } = locals;
	const jobService = createShopJobService(supabase);

	const { data: job, error: jobError } = await jobService.getJob(params.id);

	if (jobError || !job) {
		error(404, 'Job not found');
	}

	return { job };
};

export const actions: Actions = {
	updateStatus: async ({ params, request, locals }) => {
		const { supabase } = locals;
		const jobService = createShopJobService(supabase);

		const formData = await request.formData();
		const newStatus = formData.get('status') as ShopJobStatus;

		if (!newStatus) {
			return fail(400, { error: 'Status is required' });
		}

		const { error: updateError } = await jobService.updateJobStatus(params.id, newStatus);

		if (updateError) {
			return fail(400, { error: updateError.message ?? 'Failed to update status' });
		}

		return { success: true };
	},

	update: async ({ params, request, locals }) => {
		const { supabase } = locals;
		const jobService = createShopJobService(supabase);

		const formData = await request.formData();

		const updateData: Record<string, unknown> = {};

		const notes = formData.get('notes');
		if (notes !== null) updateData.notes = notes || null;

		const datepromised = formData.get('date_promised');
		if (datepromised !== null) updateData.date_promised = datepromised || null;

		const damage = formData.get('damage_description');
		if (damage !== null) updateData.damage_description = damage || null;

		const complaint = formData.get('complaint');
		if (complaint !== null) updateData.complaint = complaint || null;

		const diagnosis = formData.get('diagnosis');
		if (diagnosis !== null) updateData.diagnosis = diagnosis || null;

		const faultCodes = formData.get('fault_codes');
		if (faultCodes !== null) updateData.fault_codes = faultCodes || null;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { error: updateError } = await jobService.updateJob(params.id, updateData as any);

		if (updateError) {
			return fail(400, { error: updateError.message ?? 'Failed to update job' });
		}

		return { success: true };
	}
};
