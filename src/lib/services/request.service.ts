import { supabase } from '$lib/supabase';
import { auditService } from './audit.service';
import type { ServiceClient } from '$lib/types/service';
import type {
	Request,
	CreateRequestInput,
	UpdateRequestInput,
	RequestStatus,
	RequestStep
} from '$lib/types/request';

export class RequestService {
	/**
	 * Generate a unique request number
	 */
	private async generateRequestNumber(type: 'insurance' | 'private', client?: ServiceClient): Promise<string> {
		const db = client ?? supabase;
		const prefix = type === 'insurance' ? 'CLM' : 'REQ';
		const year = new Date().getFullYear();

		// Get the count of requests for this year
		const { count, error } = await db
			.from('requests')
			.select('*', { count: 'exact', head: true })
			.like('request_number', `${prefix}-${year}-%`);

		if (error) {
			console.error('Error counting requests:', error);
		}

		const nextNumber = (count || 0) + 1;
		const paddedNumber = String(nextNumber).padStart(3, '0');

		return `${prefix}-${year}-${paddedNumber}`;
	}

	/**
	 * List all requests with optional filters
	 */
	async listRequests(filters?: {
		status?: RequestStatus;
		client_id?: string;
		step?: RequestStep;
		assigned_engineer_id?: string;
	}, client?: ServiceClient): Promise<Request[]> {
		const db = client ?? supabase;
		let query = db.from('requests').select('*').order('created_at', { ascending: false });

		if (filters?.status) {
			query = query.eq('status', filters.status);
		}
		if (filters?.client_id) {
			query = query.eq('client_id', filters.client_id);
		}
		if (filters?.step) {
			query = query.eq('current_step', filters.step);
		}
		if (filters?.assigned_engineer_id) {
			query = query.eq('assigned_engineer_id', filters.assigned_engineer_id);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error fetching requests:', error);
			throw new Error(`Failed to fetch requests: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Get a single request by ID
	 */
	async getRequest(id: string, client?: ServiceClient): Promise<Request | null> {
		const db = client ?? supabase;
		const { data, error } = await db.from('requests').select('*').eq('id', id).single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			console.error('Error fetching request:', error);
			throw new Error(`Failed to fetch request: ${error.message}`);
		}

		return data;
	}

	/**
	 * Get request by request number
	 */
	async getRequestByNumber(requestNumber: string, client?: ServiceClient): Promise<Request | null> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('requests')
			.select('*')
			.eq('request_number', requestNumber)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			console.error('Error fetching request:', error);
			throw new Error(`Failed to fetch request: ${error.message}`);
		}

		return data;
	}

	/**
	 * Create a new request
	 */
	async createRequest(input: CreateRequestInput, client?: ServiceClient): Promise<Request> {
		const db = client ?? supabase;
		const requestNumber = await this.generateRequestNumber(input.type, client);

		const { data, error } = await db
			.from('requests')
			.insert({
				...input,
				request_number: requestNumber,
				status: 'draft',
				current_step: 'request'
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating request:', error);
			throw new Error(`Failed to create request: ${error.message}`);
		}

		// Log creation
		await auditService.logChange({
			entity_type: 'request',
			entity_id: data.id,
			action: 'created',
			new_value: requestNumber,
			metadata: {
				type: input.type,
				client_id: input.client_id
			}
		});

		return data;
	}

	/**
	 * Update an existing request
	 */
	async updateRequest(id: string, input: UpdateRequestInput, client?: ServiceClient): Promise<Request | null> {
		const db = client ?? supabase;
		// Get old request for audit logging
		const oldRequest = await this.getRequest(id, client);

		const { data, error } = await db
			.from('requests')
			.update(input)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			console.error('Error updating request:', error);
			throw new Error(`Failed to update request: ${error.message}`);
		}

		// Log status changes
		if (input.status && oldRequest && input.status !== oldRequest.status) {
			await auditService.logChange({
				entity_type: 'request',
				entity_id: id,
				action: 'status_changed',
				field_name: 'status',
				old_value: oldRequest.status,
				new_value: input.status,
				metadata: {
					request_number: data.request_number
				}
			});
		}

		// Log step changes
		if (input.current_step && oldRequest && input.current_step !== oldRequest.current_step) {
			await auditService.logChange({
				entity_type: 'request',
				entity_id: id,
				action: 'updated',
				field_name: 'current_step',
				old_value: oldRequest.current_step,
				new_value: input.current_step,
				metadata: {
					request_number: data.request_number
				}
			});
		}

		// Log engineer assignment
		if (
			input.assigned_engineer_id &&
			oldRequest &&
			input.assigned_engineer_id !== oldRequest.assigned_engineer_id
		) {
			await auditService.logChange({
				entity_type: 'request',
				entity_id: id,
				action: 'assigned',
				field_name: 'assigned_engineer_id',
				old_value: oldRequest.assigned_engineer_id || 'None',
				new_value: input.assigned_engineer_id,
				metadata: {
					request_number: data.request_number
				}
			});
		}

		return data;
	}

	/**
	 * Update request status
	 */
	async updateRequestStatus(id: string, status: RequestStatus, client?: ServiceClient): Promise<Request | null> {
		return this.updateRequest(id, { status }, client);
	}

	/**
	 * Assign an engineer to a request
	 */
	async assignEngineer(id: string, engineerId: string, client?: ServiceClient): Promise<Request | null> {
		return this.updateRequest(id, { assigned_engineer_id: engineerId }, client);
	}

	/**
	 * Move request to next step in workflow
	 */
	async moveToNextStep(id: string, client?: ServiceClient): Promise<Request | null> {
		const request = await this.getRequest(id, client);
		if (!request) return null;

		const steps: RequestStep[] = ['request', 'assessment', 'quote', 'approval'];
		const currentIndex = steps.indexOf(request.current_step);

		if (currentIndex < steps.length - 1) {
			return this.updateRequest(id, { current_step: steps[currentIndex + 1] }, client);
		}

		return request;
	}

	/**
	 * Get requests by client
	 */
	async getRequestsByClient(clientId: string, client?: ServiceClient): Promise<Request[]> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('requests')
			.select('*')
			.eq('client_id', clientId)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error fetching requests by client:', error);
			throw new Error(`Failed to fetch requests by client: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Get requests by engineer
	 */
	async getRequestsByEngineer(engineerId: string, client?: ServiceClient): Promise<Request[]> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('requests')
			.select('*')
			.eq('assigned_engineer_id', engineerId)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error fetching requests by engineer:', error);
			throw new Error(`Failed to fetch requests by engineer: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Search requests
	 */
	async searchRequests(searchTerm: string, client?: ServiceClient): Promise<Request[]> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('requests')
			.select('*')
			.or(
				`request_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,vehicle_registration.ilike.%${searchTerm}%,owner_name.ilike.%${searchTerm}%`
			)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error searching requests:', error);
			throw new Error(`Failed to search requests: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Get request count with optional filters
	 */
	async getRequestCount(filters?: { status?: RequestStatus }, client?: ServiceClient): Promise<number> {
		const db = client ?? supabase;
		let query = db.from('requests').select('*', { count: 'exact', head: true });

		if (filters?.status) {
			query = query.eq('status', filters.status);
		}

		const { count, error } = await query;

		if (error) {
			console.error('Error counting requests:', error);
			return 0;
		}

		return count || 0;
	}

	/**
	 * List cancelled requests with client data for archive
	 */
	async listCancelledRequests(client?: ServiceClient): Promise<any[]> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('requests')
			.select(`
				*,
				client:clients!inner(
					id,
					name,
					type
				)
			`)
			.eq('status', 'cancelled')
			.order('updated_at', { ascending: false });

		if (error) {
			console.error('Error listing cancelled requests:', error);
			return [];
		}

		return data || [];
	}
}

export const requestService = new RequestService();

