import { supabase } from '$lib/supabase';
import { auditService } from './audit.service';
import type {
	Appointment,
	CreateAppointmentInput,
	UpdateAppointmentInput,
	AppointmentStatus
} from '$lib/types/appointment';

export class AppointmentService {
	/**
	 * Generate unique appointment number (APT-2025-001)
	 */
	private async generateAppointmentNumber(): Promise<string> {
		const year = new Date().getFullYear();

		const { count, error } = await supabase
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
	 * Create appointment from inspection
	 */
	async createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
		const appointmentNumber = await this.generateAppointmentNumber();

		const { data, error } = await supabase
			.from('appointments')
			.insert({
				...input,
				appointment_number: appointmentNumber,
				status: 'scheduled',
				duration_minutes: input.duration_minutes || 60
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating appointment:', error);
			throw new Error(`Failed to create appointment: ${error.message}`);
		}

		// Log appointment creation
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

		return data;
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
	}): Promise<Appointment[]> {
		let query = supabase
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

		const { data, error } = await query;

		if (error) {
			console.error('Error fetching appointments:', error);
			throw new Error(`Failed to fetch appointments: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Get single appointment
	 */
	async getAppointment(id: string): Promise<Appointment | null> {
		const { data, error } = await supabase
			.from('appointments')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			console.error('Error fetching appointment:', error);
			throw new Error(`Failed to fetch appointment: ${error.message}`);
		}

		return data;
	}

	/**
	 * Update appointment
	 */
	async updateAppointment(id: string, input: UpdateAppointmentInput): Promise<Appointment> {
		const oldAppointment = await this.getAppointment(id);

		const { data, error } = await supabase
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

		return data;
	}

	/**
	 * Update appointment status
	 */
	async updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
		const updateData: UpdateAppointmentInput = { status };

		if (status === 'completed') {
			updateData.completed_at = new Date().toISOString();
		} else if (status === 'cancelled') {
			updateData.cancelled_at = new Date().toISOString();
		}

		return this.updateAppointment(id, updateData);
	}

	/**
	 * Get appointment by inspection ID
	 */
	async getAppointmentByInspection(inspectionId: string): Promise<Appointment | null> {
		const { data, error } = await supabase
			.from('appointments')
			.select('*')
			.eq('inspection_id', inspectionId)
			.not('status', 'in', '(cancelled,completed)')
			.maybeSingle();

		if (error) {
			console.error('Error fetching appointment:', error);
			return null;
		}

		return data;
	}

	/**
	 * Cancel appointment
	 */
	async cancelAppointment(id: string, reason?: string): Promise<Appointment> {
		const updateData: UpdateAppointmentInput = {
			status: 'cancelled',
			cancelled_at: new Date().toISOString()
		};

		if (reason) {
			updateData.cancellation_reason = reason;
		}

		return this.updateAppointment(id, updateData);
	}

	/**
	 * Get appointment count with optional filters
	 */
	async getAppointmentCount(filters?: {
		status?: AppointmentStatus;
		appointment_type?: 'in_person' | 'digital';
	}): Promise<number> {
		let query = supabase.from('appointments').select('*', { count: 'exact', head: true });

		if (filters?.status) {
			query = query.eq('status', filters.status);
		}
		if (filters?.appointment_type) {
			query = query.eq('appointment_type', filters.appointment_type);
		}

		const { count, error } = await query;

		if (error) {
			console.error('Error counting appointments:', error);
			return 0;
		}

		return count || 0;
	}
}

export const appointmentService = new AppointmentService();

