import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import { auditService } from '$lib/services/audit.service';

/**
 * POST /api/frc/[id]/reopen
 * Reopens a completed FRC record, resetting it to in_progress status
 * and moving the assessment back to 'submitted' status (Finalized Assessments)
 */
export const POST: RequestHandler = async ({ params }) => {
	const frcId = params.id;

	if (!frcId) {
		return json({ error: 'FRC ID is required' }, { status: 400 });
	}

	try {
		// 1. Fetch the FRC record to validate it exists and is completed
		const { data: frc, error: fetchError } = await supabase
			.from('assessment_frc')
			.select('id, assessment_id, status, signed_off_by_name')
			.eq('id', frcId)
			.single();

		if (fetchError || !frc) {
			console.error('Error fetching FRC:', fetchError);
			return json({ error: 'FRC not found' }, { status: 404 });
		}

		// 2. Validate that FRC is completed (can only reopen completed FRCs)
		if (frc.status !== 'completed') {
			return json(
				{ error: `Cannot reopen FRC with status '${frc.status}'. Only completed FRCs can be reopened.` },
				{ status: 400 }
			);
		}

		const now = new Date().toISOString();

		// 3. Update FRC status to in_progress and clear sign-off fields
		const { error: updateFrcError } = await supabase
			.from('assessment_frc')
			.update({
				status: 'in_progress',
				completed_at: null,
				signed_off_at: null,
				signed_off_by_name: null,
				signed_off_by_email: null,
				signed_off_by_role: null,
				sign_off_notes: null,
				updated_at: now
			})
			.eq('id', frcId);

		if (updateFrcError) {
			console.error('Error updating FRC status:', updateFrcError);
			return json({ error: 'Failed to reopen FRC' }, { status: 500 });
		}

		// 4. Update assessment status from 'archived' back to 'submitted'
		const { error: updateAssessmentError } = await supabase
			.from('assessments')
			.update({
				status: 'submitted',
				updated_at: now
			})
			.eq('id', frc.assessment_id);

		if (updateAssessmentError) {
			console.error('Error updating assessment status:', updateAssessmentError);
			// Don't fail the request - FRC is already reopened
			// Just log the error
		}

		// 5. Log audit trail for FRC status change
		await auditService.logChange({
			entity_type: 'frc',
			entity_id: frcId,
			action: 'status_changed',
			field_name: 'status',
			old_value: 'completed',
			new_value: 'in_progress',
			metadata: {
				reason: 'FRC reopened for corrections',
				previous_sign_off_by: frc.signed_off_by_name
			}
		});

		// 6. Log audit trail for assessment status change
		if (!updateAssessmentError) {
			await auditService.logChange({
				entity_type: 'assessment',
				entity_id: frc.assessment_id,
				action: 'status_changed',
				field_name: 'status',
				old_value: 'archived',
				new_value: 'submitted',
				metadata: {
					reason: 'FRC reopened',
					frc_id: frcId
				}
			});
		}

		return json({
			success: true,
			message: 'FRC reopened successfully',
			frc_id: frcId,
			assessment_id: frc.assessment_id
		});
	} catch (error) {
		console.error('Error in FRC reopen endpoint:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to reopen FRC' },
			{ status: 500 }
		);
	}
};

