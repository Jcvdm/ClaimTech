import { supabase } from '$lib/supabase';
import type {
	Inspection,
	CreateInspectionInput,
	UpdateInspectionInput
} from '$lib/types/inspection';
import type { Request } from '$lib/types/request';

export class InspectionService {
	/**
	 * Generate unique inspection number (INS-2025-001)
	 */
	private async generateInspectionNumber(): Promise<string> {
		const year = new Date().getFullYear();

		const { count, error } = await supabase
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
	 * Create inspection from request
	 */
	async createInspectionFromRequest(request: Request): Promise<Inspection> {
		// Check if inspection already exists for this request
		const { data: existing } = await supabase
			.from('inspections')
			.select('id')
			.eq('request_id', request.id)
			.single();

		if (existing) {
			throw new Error('An inspection already exists for this request');
		}

		const inspectionNumber = await this.generateInspectionNumber();

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
			inspection_location: request.incident_location || undefined,
			notes: request.description || undefined
		};

		const { data, error } = await supabase
			.from('inspections')
			.insert({
				...inspectionData,
				inspection_number: inspectionNumber,
				status: 'pending'
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating inspection:', error);
			throw new Error(`Failed to create inspection: ${error.message}`);
		}

		return data;
	}

	/**
	 * List all inspections
	 */
	async listInspections(filters?: { status?: string }): Promise<Inspection[]> {
		let query = supabase
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
	 * Get single inspection by ID
	 */
	async getInspection(id: string): Promise<Inspection | null> {
		const { data, error } = await supabase
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
	async updateInspection(id: string, input: UpdateInspectionInput): Promise<Inspection> {
		const { data, error } = await supabase
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
		status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
	): Promise<Inspection> {
		return this.updateInspection(id, { status });
	}

	/**
	 * Get inspection count
	 */
	async getInspectionCount(filters?: { status?: string }): Promise<number> {
		let query = supabase.from('inspections').select('*', { count: 'exact', head: true });

		if (filters?.status) {
			query = query.eq('status', filters.status);
		}

		const { count, error } = await query;

		if (error) {
			console.error('Error counting inspections:', error);
			return 0;
		}

		return count || 0;
	}
}

export const inspectionService = new InspectionService();

