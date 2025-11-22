import { supabase } from '$lib/supabase';
import { auditService } from './audit.service';
import { AssessmentService } from './assessment.service';
import type {
	Appointment,
	CreateAppointmentInput,
	UpdateAppointmentInput,
	RescheduleAppointmentInput,
	AppointmentStatus
} from '$lib/types/appointment';
import type { ServiceClient } from '$lib/types/service';

export class AppointmentService {
	/**
	 * Generate unique appointment number (APT-2025-001)
	 */
	private async generateAppointmentNumber(client?: ServiceClient): Promise<string> {
		const db = client ?? supabase;
		const year = new Date().getFullYear();

		const { count, error } = await db
			.from('appointments')
			.select('*', { count: 'exact', head: true })
			.like('appointment_number', `APT-${year}-%`);

		if (error) {
			console.error('Error counting appointments:', error);
			throw new Error(`Failed to generate appointment number: ${error.message}`);
		}

		const nextNumber = (count || 0) + 1;
		return `APT-${year}-${String(nextNumber).padStart(3, '0')}`;
	}

	/**
	 * Create appointment from inspection with retry logic to handle race conditions
	 */
	async createAppointment(input: CreateAppointmentInput, client?: ServiceClient, maxRetries: number = 3): Promise<Appointment> {
		const db = client ?? supabase;

		// Retry loop to handle race conditions in appointment number generation
		for (let attempt = 0; attempt < maxRetries; attempt++) {
			try {
				const appointmentNumber = await this.generateAppointmentNumber(client);

				const { data, error } = await db
					.from('appointments')
					.insert({
						...input,
						appointment_number: appointmentNumber,
				status: 'scheduled' as AppointmentStatus,
				duration_minutes: input.duration_minutes || 60
					})
					.select()
					.single();

				if (error) {
					// Check if this is a duplicate key error (race condition)
					if (error.code === '23505' && attempt < maxRetries - 1) {
						console.log(`Duplicate appointment number detected (attempt ${attempt + 1}/${maxRetries}), retrying...`);
						await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
						continue;
					}

					console.error('Error creating appointment:', error);
					throw new Error(`Failed to create appointment: ${error.message}`);
				}

				// Success! Log appointment creation
				await auditService.logChange({
					entity_type: 'appointment',
					entity_id: data.id,
					action: 'created',
					new_value: appointmentNumber,
					metadata: {
						inspection_id: input.inspection_id,
						appointment_type: input.appointment_type,
						appointment_date: input.appointment_date
					}
				});

				return data as Appointment;

			} catch (error) {
				if (attempt === maxRetries - 1) {
					console.error('Failed to create appointment after maximum retries:', error);
					throw error;
				}
			}
		}

		throw new Error('Failed to create appointment after maximum retries');
	}

	/**
	 * List appointments with optional filters
	 */
	async listAppointments(filters?: {
		status?: AppointmentStatus;
		engineer_id?: string;
		appointment_type?: 'in_person' | 'digital';
		date_from?: string;
		date_to?: string;
		inspection_id?: string;
	}, client?: ServiceClient): Promise<Appointment[]> {
		const db = client ?? supabase;

		let query = db
			.from('appointments')
			.select('*')
			.order('appointment_date', { ascending: true });

		if (filters?.status) {
			query = query.eq('status', filters.status);
		}
		if (filters?.engineer_id) {
			query = query.eq('engineer_id', filters.engineer_id);
		}
		if (filters?.appointment_type) {
			query = query.eq('appointment_type', filters.appointment_type);
		}
		if (filters?.date_from) {
			query = query.gte('appointment_date', filters.date_from);
		}
		if (filters?.date_to) {
			query = query.lte('appointment_date', filters.date_to);
		}
		if (filters?.inspection_id) {
			query = query.eq('inspection_id', filters.inspection_id);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error fetching appointments:', error);
			throw new Error(`Failed to fetch appointments: ${error.message}`);
		}

		return (data as Appointment[]) || [];
	}

	/**
	 * Get single appointment
	 */
	async getAppointment(id: string, client?: ServiceClient): Promise<Appointment | null> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('appointments')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			console.error('Error fetching appointment:', error);
			throw new Error(`Failed to fetch appointment: ${error.message}`);
		}

		return data as Appointment;
	}

	/**
	 * Update appointment
	 */
	async updateAppointment(id: string, input: UpdateAppointmentInput, client?: ServiceClient): Promise<Appointment> {
		const oldAppointment = await this.getAppointment(id, client);

		const db = client ?? supabase;
		const { data, error } = await db
			.from('appointments')
			.update(input)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Error updating appointment:', error);
			throw new Error(`Failed to update appointment: ${error.message}`);
		}

		// Log status changes
		if (input.status && oldAppointment && input.status !== oldAppointment.status) {
			await auditService.logChange({
				entity_type: 'appointment',
				entity_id: id,
				action: 'status_changed',
				field_name: 'status',
				old_value: oldAppointment.status,
				new_value: input.status,
				metadata: {
					appointment_number: data.appointment_number
				}
				});
		}

		return data as Appointment;
	}

	/**
	 * Update appointment status
	 */
	async updateAppointmentStatus(id: string, status: AppointmentStatus, client?: ServiceClient): Promise<Appointment> {
	const updateData: UpdateAppointmentInput = { status: status as AppointmentStatus };

		if (status === 'completed') {
			updateData.completed_at = new Date().toISOString();
		} else if (status === 'cancelled') {
			updateData.cancelled_at = new Date().toISOString();
		}

		const updated = await this.updateAppointment(id, updateData, client);

		// Log status change for audit trail
		await auditService.logChange({
			entity_type: 'appointment',
			entity_id: id,
			action: 'status_changed',
			field_name: 'status',
			new_value: status,
			metadata: {
				appointment_number: updated.appointment_number
			}
		});

		return updated;
	}

	/**
	 * Get appointment by inspection ID
	 */
	async getAppointmentByInspection(inspectionId: string, client?: ServiceClient): Promise<Appointment | null> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('appointments')
			.select('*')
			.eq('inspection_id', inspectionId)
			.not('status', 'in', '(cancelled,completed)')
			.maybeSingle();

		if (error) {
			console.error('Error fetching appointment:', error);
			return null;
		}

		return data as Appointment | null;
	}

	/**
	 * Cancel appointment
	 */
	async cancelAppointment(id: string, reason?: string, client?: ServiceClient): Promise<Appointment> {
		const updateData: UpdateAppointmentInput = {
			status: 'cancelled' as AppointmentStatus,
			cancelled_at: new Date().toISOString()
		};

		if (reason) {
			updateData.cancellation_reason = reason;
		}

		return this.updateAppointment(id, updateData as any, client);
	}

	/**
	 * Get appointment count with optional filters
	 */
	async getAppointmentCount(filters?: {
		status?: AppointmentStatus;
		appointment_type?: 'in_person' | 'digital';
		engineer_id?: string;
	}, client?: ServiceClient): Promise<number> {
		const db = client ?? supabase;

		let query = db.from('appointments').select('*', { count: 'exact', head: true });

		if (filters?.status) {
			query = query.eq('status', filters.status);
		}
		if (filters?.appointment_type) {
			query = query.eq('appointment_type', filters.appointment_type);
		}
		if (filters?.engineer_id) {
			query = query.eq('engineer_id', filters.engineer_id);
		}

		const { count, error } = await query;

		if (error) {
			console.error('Error counting appointments:', error);
			return 0;
		}

		return count || 0;
	}

	/**
	 * List cancelled appointments with related data for archive
	 * @param client - Supabase client
	 * @param engineer_id - Optional engineer ID to filter by assigned engineer
	 */
	async listCancelledAppointments(client?: ServiceClient, engineer_id?: string | null): Promise<any[]> {
		const db = client ?? supabase;

		let query = db
			.from('appointments')
			.select(`
				*,
				inspection:inspections!inner(
					id,
					inspection_number,
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
			`)
			.eq('status', 'cancelled')
			.order('updated_at', { ascending: false });

		// Filter by engineer if engineer_id provided
		if (engineer_id) {
			query = query.eq('engineer_id', engineer_id);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error listing cancelled appointments:', error);
			return [];
		}

		return data || [];
	}

	/**
	 * Cancel appointment and revert assessment to inspection_scheduled stage.
	 * This ensures proper workflow fallback when appointments are cancelled.
	 *
	 * @param id - Appointment ID
	 * @param reason - Optional cancellation reason
	 * @param client - ServiceClient for RLS authentication
	 * @returns Cancelled appointment with updated assessment
	 */
	async cancelAppointmentWithFallback(
		id: string,
		reason?: string,
		client?: ServiceClient
	): Promise<Appointment> {
		const db = client ?? supabase;

		// Step 1: Get appointment to find related assessment
		const appointment = await this.getAppointment(id, client);
		if (!appointment) {
			throw new Error('Appointment not found');
		}

		// Step 2: Cancel appointment (existing logic)
		const cancelledAppointment = await this.cancelAppointment(id, reason, client);

		// Step 3: Find related assessment by inspection_id
		const { data: assessment, error: assessmentError } = await db
			.from('assessments')
			.select('id, stage')
			.eq('inspection_id', appointment.inspection_id)
			.single();

		if (assessmentError) {
			console.error('Error finding assessment:', assessmentError);
			// Return cancelled appointment even if assessment update fails
			return cancelledAppointment;
		}

		// Step 4: Update assessment stage to inspection_scheduled (fallback)
		if (assessment && assessment.stage !== 'inspection_scheduled') {
			const assessmentService = new AssessmentService();
			try {
				await assessmentService.updateAssessment(
					assessment.id,
					{ stage: 'inspection_scheduled' },
					client
				);

				// Step 5: Create audit log for stage transition
				await auditService.logChange({
					entity_type: 'assessment',
					entity_id: assessment.id,
					action: 'stage_transition',
					field_name: 'stage',
					old_value: assessment.stage,
					new_value: 'inspection_scheduled',
					metadata: {
						reason: 'Appointment cancelled - fallback to inspection scheduling',
						related_appointment_id: id,
						cancellation_reason: reason
					}
				});
			} catch (updateError) {
				console.error('Error updating assessment stage:', updateError);
				// Continue - appointment is still cancelled
			}
		}

		return cancelledAppointment;
	}

	/**
	 * Reschedule an appointment with proper tracking and audit trail.
	 * Updates status to 'rescheduled', tracks original date, and logs the change.
	 *
	 * @param id - Appointment ID
	 * @param input - New appointment details (date, time, location, etc.)
	 * @param reason - Optional reason for rescheduling
	 * @param client - ServiceClient for RLS authentication
	 * @returns Updated appointment with reschedule tracking
	 */
	async rescheduleAppointment(
		id: string,
		input: RescheduleAppointmentInput,
		reason?: string,
		client?: ServiceClient
	): Promise<Appointment> {
		const db = client ?? supabase;

		// Step 1: Get current appointment to capture original date
		const currentAppointment = await this.getAppointment(id, client);
		if (!currentAppointment) {
			throw new Error('Appointment not found');
		}

		// Step 2: Check if date/time actually changed
		const dateChanged = input.appointment_date !== currentAppointment.appointment_date;
		const timeChanged = input.appointment_time !== currentAppointment.appointment_time;

		if (!dateChanged && !timeChanged) {
			// No reschedule needed - just update other fields
			return this.updateAppointment(id, input as UpdateAppointmentInput, client);
		}

		// Step 3: Prepare update data with reschedule tracking
		// Filter out null values from input to match UpdateAppointmentInput type
		const filteredInput = Object.fromEntries(
			Object.entries(input).filter(([, v]) => v !== null)
		) as UpdateAppointmentInput;

		const updateData: UpdateAppointmentInput = {
			...filteredInput,
			status: 'rescheduled',
			rescheduled_from_date: currentAppointment.appointment_date, // Preserve original
			reschedule_count: (currentAppointment.reschedule_count || 0) + 1,
			reschedule_reason: reason
		};

		// Step 4: Update appointment
		const { data: updatedAppointment, error } = await db
			.from('appointments')
			.update(updateData)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Error rescheduling appointment:', error);
			throw new Error(`Failed to reschedule appointment: ${error.message}`);
		}

		// Step 5: Create audit log for reschedule event
		await auditService.logChange({
			entity_type: 'appointment',
			entity_id: id,
			action: 'status_changed',
			field_name: 'appointment_date',
			old_value: currentAppointment.appointment_date,
			new_value: input.appointment_date,
			metadata: {
				appointment_number: updatedAppointment.appointment_number,
				original_date: currentAppointment.appointment_date,
				original_time: currentAppointment.appointment_time,
				new_date: input.appointment_date,
				new_time: input.appointment_time,
				reschedule_count: updateData.reschedule_count,
				reason: reason,
				changed_fields: Object.keys(input)
			}
		});

		return updatedAppointment as Appointment;
	}
}

export const appointmentService = new AppointmentService();

