import { supabase } from '$lib/supabase';
import type {
	Assessment,
	CreateAssessmentInput,
	UpdateAssessmentInput
} from '$lib/types/assessment';
import { auditService } from './audit.service';

export class AssessmentService {
	/**
	 * Generate unique assessment number (ASM-2025-001)
	 */
	private async generateAssessmentNumber(): Promise<string> {
		const year = new Date().getFullYear();

		const { count, error } = await supabase
			.from('assessments')
			.select('*', { count: 'exact', head: true })
			.like('assessment_number', `ASM-${year}-%`);

		if (error) {
			console.error('Error counting assessments:', error);
			throw new Error(`Failed to generate assessment number: ${error.message}`);
		}

		const nextNumber = (count || 0) + 1;
		return `ASM-${year}-${String(nextNumber).padStart(3, '0')}`;
	}

	/**
	 * Create new assessment from appointment
	 */
	async createAssessment(input: CreateAssessmentInput): Promise<Assessment> {
		const assessmentNumber = await this.generateAssessmentNumber();

		const { data, error } = await supabase
			.from('assessments')
			.insert({
				...input,
				assessment_number: assessmentNumber,
				status: 'in_progress',
				current_tab: 'identification',
				tabs_completed: []
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating assessment:', error);
			throw new Error(`Failed to create assessment: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'assessment',
				entity_id: data.id,
				action: 'created',
				new_value: assessmentNumber
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data;
	}

	/**
	 * Get assessment by ID
	 */
	async getAssessment(id: string): Promise<Assessment | null> {
		const { data, error } = await supabase
			.from('assessments')
			.select('*')
			.eq('id', id)
			.maybeSingle();

		if (error) {
			console.error('Error fetching assessment:', error);
			return null;
		}

		return data;
	}

	/**
	 * Get assessment by appointment ID
	 */
	async getAssessmentByAppointment(appointmentId: string): Promise<Assessment | null> {
		const { data, error } = await supabase
			.from('assessments')
			.select('*')
			.eq('appointment_id', appointmentId)
			.maybeSingle();

		if (error) {
			console.error('Error fetching assessment:', error);
			return null;
		}

		return data;
	}

	/**
	 * Get assessment by inspection ID
	 */
	async getAssessmentByInspection(inspectionId: string): Promise<Assessment | null> {
		const { data, error } = await supabase
			.from('assessments')
			.select('*')
			.eq('inspection_id', inspectionId)
			.maybeSingle();

		if (error) {
			console.error('Error fetching assessment:', error);
			return null;
		}

		return data;
	}

	/**
	 * Get all in-progress assessments with related data (for Open Assessments list)
	 */
	async getInProgressAssessments(): Promise<any[]> {
		const { data, error } = await supabase
			.from('assessments')
			.select(
				`
				*,
				requests:request_id (
					request_number,
					vehicle_make,
					vehicle_model,
					vehicle_year,
					vehicle_registration
				),
				inspections:inspection_id (
					inspection_number
				),
				appointments:appointment_id (
					appointment_number,
					engineer_id,
					engineers:engineer_id (
						name
					)
				)
			`
			)
			.eq('status', 'in_progress')
			.order('updated_at', { ascending: false });

		if (error) {
			console.error('Error fetching in-progress assessments:', error);
			throw new Error(`Failed to fetch in-progress assessments: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Get count of in-progress assessments
	 */
	async getInProgressCount(): Promise<number> {
		const { count, error } = await supabase
			.from('assessments')
			.select('*', { count: 'exact', head: true })
			.eq('status', 'in_progress');

		if (error) {
			console.error('Error counting in-progress assessments:', error);
			return 0;
		}

		return count || 0;
	}

	/**
	 * Get count of finalized assessments (submitted status)
	 */
	async getFinalizedCount(): Promise<number> {
		const { count, error } = await supabase
			.from('assessments')
			.select('*', { count: 'exact', head: true })
			.eq('status', 'submitted');

		if (error) {
			console.error('Error counting finalized assessments:', error);
			return 0;
		}

		return count || 0;
	}

	/**
	 * Update assessment
	 */
	async updateAssessment(id: string, input: UpdateAssessmentInput): Promise<Assessment> {
		// Get current assessment for audit trail
		const current = await this.getAssessment(id);

		const { data, error } = await supabase
			.from('assessments')
			.update(input)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Error updating assessment:', error);
			throw new Error(`Failed to update assessment: ${error.message}`);
		}

		// Log audit trail for status changes
		if (current && input.status && current.status !== input.status) {
			try {
				await auditService.logChange({
					entity_type: 'assessment',
					entity_id: id,
					action: 'status_changed',
					field_name: 'status',
					old_value: current.status,
					new_value: input.status
				});
			} catch (auditError) {
				console.error('Error logging audit change:', auditError);
			}
		}

		return data;
	}

	/**
	 * Update assessment status
	 */
	async updateAssessmentStatus(
		id: string,
		status: 'in_progress' | 'completed' | 'submitted' | 'archived' | 'cancelled'
	): Promise<Assessment> {
		const updateData: UpdateAssessmentInput = { status };

		if (status === 'completed') {
			updateData.completed_at = new Date().toISOString();
		} else if (status === 'submitted') {
			updateData.submitted_at = new Date().toISOString();
		} else if (status === 'cancelled') {
			updateData.cancelled_at = new Date().toISOString();
		}
		// Note: 'archived' status is set when FRC is completed
		// No specific timestamp field needed as FRC has completed_at

		return this.updateAssessment(id, updateData);
	}

	/**
	 * Mark estimate as finalized and sent
	 * Sets status to 'submitted' and records timestamp
	 * Snapshots rates and markups for FRC consistency
	 *
	 * @param id - Assessment ID
	 * @param options - Optional parameters for forced finalization
	 */
	async finalizeEstimate(
		id: string,
		options?: {
			forcedFinalization?: boolean;
			missingFields?: Array<{ tab: string; fields: string[] }>;
		}
	): Promise<Assessment> {
		const timestamp = new Date().toISOString();

		// Fetch the estimate to snapshot rates and markups
		const { data: estimate, error: estimateError } = await supabase
			.from('assessment_estimates')
			.select('labour_rate, paint_rate, oem_markup_percentage, alt_markup_percentage, second_hand_markup_percentage, outwork_markup_percentage')
			.eq('assessment_id', id)
			.maybeSingle();

		if (estimateError) {
			console.error('Error fetching estimate for finalization:', estimateError);
			throw estimateError;
		}

		if (!estimate) {
			throw new Error('No estimate found for this assessment');
		}

		const { data, error } = await supabase
			.from('assessments')
			.update({
				estimate_finalized_at: timestamp,
				status: 'submitted',
				submitted_at: timestamp,
				// Snapshot rates and markups at finalization
				finalized_labour_rate: estimate.labour_rate,
				finalized_paint_rate: estimate.paint_rate,
				finalized_oem_markup: estimate.oem_markup_percentage,
				finalized_alt_markup: estimate.alt_markup_percentage,
				finalized_second_hand_markup: estimate.second_hand_markup_percentage,
				finalized_outwork_markup: estimate.outwork_markup_percentage
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Error finalizing estimate:', error);
			throw error;
		}

		// Log audit trail
		await auditService.logChange({
			entity_type: 'assessment',
			entity_id: id,
			action: 'updated',
			field_name: 'estimate',
			new_value: options?.forcedFinalization ? 'finalized_and_sent_with_missing_fields' : 'finalized_and_sent',
			metadata: {
				finalized_at: timestamp,
				event: 'estimate_finalized_sent',
				forced_finalization: options?.forcedFinalization || false,
				missing_fields: options?.missingFields || [],
				snapshotted_rates: {
					labour_rate: estimate.labour_rate,
					paint_rate: estimate.paint_rate,
					oem_markup: estimate.oem_markup_percentage,
					alt_markup: estimate.alt_markup_percentage,
					second_hand_markup: estimate.second_hand_markup_percentage,
					outwork_markup: estimate.outwork_markup_percentage
				}
			}
		});

		return data;
	}

	/**
	 * Update current tab
	 */
	async updateCurrentTab(id: string, tab: string): Promise<Assessment> {
		return this.updateAssessment(id, { current_tab: tab });
	}

	/**
	 * Mark tab as completed
	 */
	async markTabCompleted(id: string, tab: string): Promise<Assessment> {
		const assessment = await this.getAssessment(id);
		if (!assessment) {
			throw new Error('Assessment not found');
		}

		const tabsCompleted = assessment.tabs_completed || [];
		if (!tabsCompleted.includes(tab)) {
			tabsCompleted.push(tab);
		}

		return this.updateAssessment(id, { tabs_completed: tabsCompleted });
	}

	/**
	 * List all assessments
	 */
	async listAssessments(filters?: {
		status?: 'in_progress' | 'completed' | 'submitted';
		inspection_id?: string;
	}): Promise<Assessment[]> {
		let query = supabase.from('assessments').select('*').order('created_at', { ascending: false });

		if (filters?.status) {
			query = query.eq('status', filters.status);
		}
		if (filters?.inspection_id) {
			query = query.eq('inspection_id', filters.inspection_id);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error listing assessments:', error);
			return [];
		}

		return data || [];
	}

	/**
	 * Get assessment count by status
	 */
	async getAssessmentCount(status?: 'in_progress' | 'completed' | 'submitted'): Promise<number> {
		let query = supabase.from('assessments').select('*', { count: 'exact', head: true });

		if (status) {
			query = query.eq('status', status);
		}

		const { count, error } = await query;

		if (error) {
			console.error('Error counting assessments:', error);
			return 0;
		}

		return count || 0;
	}

	/**
	 * Delete assessment (soft delete by updating status)
	 */
	async deleteAssessment(id: string): Promise<void> {
		const { error } = await supabase.from('assessments').delete().eq('id', id);

		if (error) {
			console.error('Error deleting assessment:', error);
			throw new Error(`Failed to delete assessment: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'assessment',
				entity_id: id,
				action: 'cancelled'
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}
	}

	/**
	 * List archived assessments for archive page
	 * Joins with appointments, inspections, requests, and clients
	 * Only returns assessments with 'archived' status (FRC completed)
	 */
	async listArchivedAssessments(): Promise<any[]> {
		const { data, error } = await supabase
			.from('assessments')
			.select(`
				*,
				appointment:appointments!inner(
					id,
					inspection:inspections!inner(
						id,
						request:requests!inner(
							id,
							request_number,
							vehicle_make,
							vehicle_model,
							vehicle_year,
							vehicle_registration,
							client:clients!inner(
								id,
								name,
								type
							)
						)
					)
				)
			`)
			.eq('status', 'archived')
			.order('updated_at', { ascending: false });

		if (error) {
			console.error('Error listing archived assessments:', error);
			return [];
		}

		return data || [];
	}

	/**
	 * @deprecated Use listArchivedAssessments instead
	 * List completed assessments for archive
	 */
	async listCompletedAssessments(): Promise<any[]> {
		return this.listArchivedAssessments();
	}

	/**
	 * List cancelled assessments for archive page
	 * Joins with appointments, inspections, requests, and clients
	 * Only returns assessments with 'cancelled' status
	 */
	async listCancelledAssessments(): Promise<any[]> {
		const { data, error } = await supabase
			.from('assessments')
			.select(`
				*,
				appointment:appointments!inner(
					id,
					inspection:inspections!inner(
						id,
						request:requests!inner(
							id,
							request_number,
							vehicle_make,
							vehicle_model,
							vehicle_year,
							vehicle_registration,
							client:clients!inner(
								id,
								name,
								type
							)
						)
					)
				)
			`)
			.eq('status', 'cancelled')
			.order('cancelled_at', { ascending: false });

		if (error) {
			console.error('Error listing cancelled assessments:', error);
			return [];
		}

		return data || [];
	}
}

export const assessmentService = new AssessmentService();

