import { supabase } from '$lib/supabase';
import { auditService } from './audit.service';
import type {
	Inspection,
	CreateInspectionInput,
	UpdateInspectionInput
} from '$lib/types/inspection';
import type { Request } from '$lib/types/request';
import type { ServiceClient } from '$lib/types/service';

export class InspectionService {
	/**
	 * Generate unique inspection number (INS-2025-001)
	 */
	private async generateInspectionNumber(client?: ServiceClient): Promise<string> {
		const db = client ?? supabase;
		const year = new Date().getFullYear();

		const { count, error } = await db
			.from('inspections')
			.select('*', { count: 'exact', head: true })
			.like('inspection_number', `INS-${year}-%`);

		if (error) {
			console.error('Error counting inspections:', error);
			throw new Error(`Failed to generate inspection number: ${error.message}`);
		}

		const nextNumber = (count || 0) + 1;
		return `INS-${year}-${String(nextNumber).padStart(3, '0')}`;
	}

	/**
	 * Create inspection from request with retry logic to handle race conditions
	 */
	async createInspectionFromRequest(request: Request, client?: ServiceClient, maxRetries: number = 3): Promise<Inspection> {
		const db = client ?? supabase;

		// Check if inspection already exists for this request
		const { data: existing } = await db
			.from('inspections')
			.select('id')
			.eq('request_id', request.id)
			.maybeSingle();

		if (existing) {
			throw new Error('An inspection already exists for this request');
		}

		const inspectionData: CreateInspectionInput = {
			request_id: request.id,
			client_id: request.client_id,
			type: request.type,
			claim_number: request.claim_number || undefined,
			request_number: request.request_number,
			vehicle_make: request.vehicle_make || undefined,
			vehicle_model: request.vehicle_model || undefined,
			vehicle_year: request.vehicle_year || undefined,
			vehicle_vin: request.vehicle_vin || undefined,
			vehicle_registration: request.vehicle_registration || undefined,
			vehicle_color: request.vehicle_color || undefined,
			vehicle_mileage: request.vehicle_mileage || undefined,
			vehicle_province: request.vehicle_province || undefined,
			inspection_location: request.incident_location || undefined,
			notes: request.description || undefined
		};

		// Retry loop to handle race conditions in inspection number generation
		for (let attempt = 0; attempt < maxRetries; attempt++) {
			try {
				const inspectionNumber = await this.generateInspectionNumber(client);

				const { data, error } = await db
					.from('inspections')
					.insert({
						...inspectionData,
						inspection_number: inspectionNumber,
						status: 'pending'
					})
					.select()
					.single();

				if (error) {
					// Check if this is a duplicate key error (race condition)
					if (error.code === '23505' && attempt < maxRetries - 1) {
						console.log(`Duplicate inspection number detected (attempt ${attempt + 1}/${maxRetries}), retrying...`);
						await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
						continue;
					}

					console.error('Error creating inspection:', error);
					throw new Error(`Failed to create inspection: ${error.message}`);
				}

				// Success! Log inspection creation
				await auditService.logChange({
					entity_type: 'inspection',
					entity_id: data.id,
					action: 'created',
					new_value: inspectionNumber,
					metadata: {
						request_id: request.id,
						request_number: request.request_number
					}
				});

				return data;

			} catch (error) {
				if (attempt === maxRetries - 1) {
					console.error('Failed to create inspection after maximum retries:', error);
					throw error;
				}
			}
		}

		throw new Error('Failed to create inspection after maximum retries');
	}

	/**
	 * List all inspections
	 */
	async listInspections(filters?: { status?: string }, client?: ServiceClient): Promise<Inspection[]> {
		const db = client ?? supabase;

		let query = db
			.from('inspections')
			.select('*')
			.order('created_at', { ascending: false });

		if (filters?.status) {
			query = query.eq('status', filters.status);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error fetching inspections:', error);
			throw new Error(`Failed to fetch inspections: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * List inspections without appointments (for Inspections list page)
	 * Only shows inspections that haven't had an appointment scheduled yet
	 * @param client - Supabase client
	 * @param engineer_id - Optional engineer ID to filter by assigned engineer
	 */
	async listInspectionsWithoutAppointments(client?: ServiceClient, engineer_id?: string | null): Promise<Inspection[]> {
		const db = client ?? supabase;

		// Query inspections and check if they have appointments
		let query = db
			.from('inspections')
			.select('*')
			.in('status', ['pending', 'scheduled'])
			.order('created_at', { ascending: false });

		// Filter by assigned engineer if engineer_id provided
		if (engineer_id) {
			query = query.eq('assigned_engineer_id', engineer_id);
		}

		const { data: inspections, error: inspError } = await query;

		if (inspError) {
			console.error('Error fetching inspections:', inspError);
			throw new Error(`Failed to fetch inspections: ${inspError.message}`);
		}

		if (!inspections || inspections.length === 0) {
			return [];
		}

		// Get all appointments for these inspections
		const inspectionIds = inspections.map((i) => i.id);
		const { data: appointments, error: appError } = await db
			.from('appointments')
			.select('inspection_id')
			.in('inspection_id', inspectionIds);

		if (appError) {
			console.error('Error fetching appointments:', appError);
			// Continue without filtering if appointments query fails
			return inspections;
		}

		// Filter out inspections that have appointments
		const inspectionsWithAppointments = new Set(
			appointments?.map((a) => a.inspection_id) || []
		);

		return inspections.filter((i) => !inspectionsWithAppointments.has(i.id));
	}

	/**
	 * Get single inspection by ID
	 */
	async getInspection(id: string, client?: ServiceClient): Promise<Inspection | null> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('inspections')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			console.error('Error fetching inspection:', error);
			throw new Error(`Failed to fetch inspection: ${error.message}`);
		}

		return data;
	}

	/**
	 * Update inspection
	 */
	async updateInspection(id: string, input: UpdateInspectionInput, client?: ServiceClient): Promise<Inspection> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('inspections')
			.update(input)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Error updating inspection:', error);
			throw new Error(`Failed to update inspection: ${error.message}`);
		}

		return data;
	}

	/**
	 * Update inspection status
	 */
	async updateInspectionStatus(
		id: string,
		status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
		client?: ServiceClient
	): Promise<Inspection> {
		// Get old inspection for audit logging
		const oldInspection = await this.getInspection(id, client);

		const updated = await this.updateInspection(id, { status }, client);

		// Log status change
		if (oldInspection && status !== oldInspection.status) {
			await auditService.logChange({
				entity_type: 'inspection',
				entity_id: id,
				action: 'status_changed',
				field_name: 'status',
				old_value: oldInspection.status,
				new_value: status,
				metadata: {
					inspection_number: updated.inspection_number
				}
			});
		}

		return updated;
	}

	/**
	 * Get inspection count
	 * @param filters - Optional filters including status and engineer_id
	 * @param client - Supabase client
	 */
	async getInspectionCount(filters?: { status?: string; engineer_id?: string }, client?: ServiceClient): Promise<number> {
		const db = client ?? supabase;

		let query = db.from('inspections').select('*', { count: 'exact', head: true });

		if (filters?.status) {
			query = query.eq('status', filters.status);
		}

		if (filters?.engineer_id) {
			query = query.eq('assigned_engineer_id', filters.engineer_id);
		}

		const { count, error } = await query;

		if (error) {
			console.error('Error counting inspections:', error);
			return 0;
		}

		return count || 0;
	}

	/**
	 * Appoint engineer to inspection
	 */
	async appointEngineer(
		inspectionId: string,
		engineerId: string,
		scheduledDate?: string,
		client?: ServiceClient
	): Promise<Inspection> {
		const db = client ?? supabase;

		const updateData: any = {
			assigned_engineer_id: engineerId,
			status: 'scheduled'
		};

		if (scheduledDate) {
			updateData.scheduled_date = scheduledDate;
		}

		const { data, error } = await db
			.from('inspections')
			.update(updateData)
			.eq('id', inspectionId)
			.select()
			.single();

		if (error) {
			console.error('Error appointing engineer:', error);
			throw new Error(`Failed to appoint engineer: ${error.message}`);
		}

		// Log engineer appointment
		await auditService.logChange({
			entity_type: 'inspection',
			entity_id: inspectionId,
			action: 'appointed',
			field_name: 'assigned_engineer_id',
			new_value: engineerId,
			metadata: {
				inspection_number: data.inspection_number,
				scheduled_date: scheduledDate
			}
		});

		return data;
	}

	/**
	 * List completed inspections for archive
	 * Joins with requests and clients
	 */
	async listCompletedInspections(client?: ServiceClient): Promise<any[]> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('inspections')
			.select(`
				*,
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
			`)
			.eq('status', 'completed')
			.order('updated_at', { ascending: false });

		if (error) {
			console.error('Error listing completed inspections:', error);
			return [];
		}

		return data || [];
	}

	/**
	 * List cancelled inspections with related data for archive
	 * Includes assessment ID for navigation (found via request_id since inspection_id is cleared on cancellation)
	 */
	async listCancelledInspections(client?: ServiceClient): Promise<any[]> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('inspections')
			.select(`
				*,
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
					),
					assessments!request_id(
						id
					)
				)
			`)
			.eq('status', 'cancelled')
			.order('updated_at', { ascending: false });

		if (error) {
			console.error('Error listing cancelled inspections:', error);
			return [];
		}

		return data || [];
	}
}

export const inspectionService = new InspectionService();

