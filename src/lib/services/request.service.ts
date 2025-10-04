import { supabase } from '$lib/supabase';
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
	private async generateRequestNumber(type: 'insurance' | 'private'): Promise<string> {
		const prefix = type === 'insurance' ? 'CLM' : 'REQ';
		const year = new Date().getFullYear();

		// Get the count of requests for this year
		const { count, error } = await supabase
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
	}): Promise<Request[]> {
		let query = supabase.from('requests').select('*').order('created_at', { ascending: false });

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
	async getRequest(id: string): Promise<Request | null> {
		const { data, error } = await supabase.from('requests').select('*').eq('id', id).single();

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
	async getRequestByNumber(requestNumber: string): Promise<Request | null> {
		const { data, error } = await supabase
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
	async createRequest(input: CreateRequestInput): Promise<Request> {
		const requestNumber = await this.generateRequestNumber(input.type);

		const { data, error } = await supabase
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

		return data;
	}

	/**
	 * Update an existing request
	 */
	async updateRequest(id: string, input: UpdateRequestInput): Promise<Request | null> {
		const { data, error } = await supabase
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

		return data;
	}

	/**
	 * Update request status
	 */
	async updateRequestStatus(id: string, status: RequestStatus): Promise<Request | null> {
		return this.updateRequest(id, { status });
	}

	/**
	 * Assign an engineer to a request
	 */
	async assignEngineer(id: string, engineerId: string): Promise<Request | null> {
		return this.updateRequest(id, { assigned_engineer_id: engineerId });
	}

	/**
	 * Move request to next step in workflow
	 */
	async moveToNextStep(id: string): Promise<Request | null> {
		const request = await this.getRequest(id);
		if (!request) return null;

		const steps: RequestStep[] = ['request', 'assessment', 'quote', 'approval'];
		const currentIndex = steps.indexOf(request.current_step);

		if (currentIndex < steps.length - 1) {
			return this.updateRequest(id, { current_step: steps[currentIndex + 1] });
		}

		return request;
	}

	/**
	 * Get requests by client
	 */
	async getRequestsByClient(clientId: string): Promise<Request[]> {
		const { data, error } = await supabase
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
	async getRequestsByEngineer(engineerId: string): Promise<Request[]> {
		const { data, error } = await supabase
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
	async searchRequests(searchTerm: string): Promise<Request[]> {
		const { data, error } = await supabase
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
}

export const requestService = new RequestService();

