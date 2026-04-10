// NOTE: Using untyped SupabaseClient because shop tables are not yet reflected
// in database.types.ts. Run `npm run generate:types` after applying migrations
// to the preview database to get full type safety.
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ShopJobStatus =
	| 'quote_requested'
	| 'quoted'
	| 'approved'
	| 'checked_in'
	| 'in_progress'
	| 'quality_check'
	| 'ready_for_collection'
	| 'completed'
	| 'cancelled';

export interface ShopJob {
	id: string;
	shop_id: string;
	job_number: string;
	status: ShopJobStatus;
	job_type: 'autobody' | 'mechanical';
	customer_id: string | null;
	customer_name: string;
	customer_phone: string | null;
	customer_email: string | null;
	vehicle_make: string;
	vehicle_model: string;
	vehicle_year: number | null;
	vehicle_reg: string | null;
	vehicle_vin: string | null;
	vehicle_color: string | null;
	vehicle_mileage: number | null;
	damage_description: string | null;
	complaint: string | null;
	diagnosis: string | null;
	fault_codes: string | null;
	date_quoted: string | null;
	date_booked: string | null;
	date_in: string | null;
	date_promised: string | null;
	date_completed: string | null;
	assigned_to: string | null;
	created_by: string;
	notes: string | null;
	created_at: string;
	updated_at: string;
	status_history: Array<{ status: string; timestamp: string; user_id?: string | null }> | null;
}

// Valid status transitions for the shop job workflow
const VALID_TRANSITIONS: Record<ShopJobStatus, ShopJobStatus[]> = {
	quote_requested: ['quoted', 'cancelled'],
	quoted: ['approved', 'cancelled'],
	approved: ['checked_in', 'cancelled'],
	checked_in: ['in_progress', 'cancelled'],
	in_progress: ['quality_check', 'cancelled'],
	quality_check: ['ready_for_collection', 'in_progress'],
	ready_for_collection: ['completed'],
	completed: [],
	cancelled: []
};

// ─── Service Factory ──────────────────────────────────────────────────────────

export function createShopJobService(supabase: SupabaseClient) {
	/**
	 * Generate a unique job number in the format JOB-YYYY-NNNN.
	 */
	async function generateJobNumber(): Promise<string> {
		const year = new Date().getFullYear();
		const prefix = `JOB-${year}-`;

		const { data, error } = await supabase
			.from('shop_jobs')
			.select('job_number')
			.like('job_number', `${prefix}%`)
			.order('job_number', { ascending: false })
			.limit(1);

		if (error) {
			console.error('Error fetching last job number:', error);
		}

		let nextNumber = 1;
		if (data && data.length > 0) {
			const last = data[0].job_number as string;
			const parts = last.split('-');
			const lastNum = parseInt(parts[parts.length - 1], 10);
			if (!isNaN(lastNum)) {
				nextNumber = lastNum + 1;
			}
		}

		const padded = String(nextNumber).padStart(4, '0');
		return `${prefix}${padded}`;
	}

	return {
		generateJobNumber,

		/**
		 * Fetch a single job by ID with its estimates and customer.
		 */
		async getJob(id: string) {
			return supabase
				.from('shop_jobs')
				.select('*, shop_estimates(*), shop_customers(*)')
				.eq('id', id)
				.single();
		},

		/**
		 * List jobs with optional status/type filters, newest first.
		 */
		async listJobs(filters?: { status?: ShopJobStatus; job_type?: string; shop_id?: string }) {
			let query = supabase
				.from('shop_jobs')
				.select('*, shop_estimates(id, estimate_number, status, total)')
				.order('created_at', { ascending: false });

			if (filters?.status) {
				query = query.eq('status', filters.status);
			}
			if (filters?.job_type) {
				query = query.eq('job_type', filters.job_type);
			}
			if (filters?.shop_id) {
				query = query.eq('shop_id', filters.shop_id);
			}

			return query;
		},

		/**
		 * Update arbitrary job fields. Use updateJobStatus for status transitions.
		 */
		async updateJob(id: string, data: Partial<Omit<ShopJob, 'id' | 'job_number' | 'created_at' | 'created_by'>>) {
			return supabase
				.from('shop_jobs')
				.update({ ...data, updated_at: new Date().toISOString() })
				.eq('id', id)
				.select()
				.single();
		},

		/**
		 * Transition a job to a new status, enforcing the valid workflow transitions.
		 * Automatically sets date_in when checked_in and date_completed when completed.
		 *
		 * @throws Error if the transition is not valid from the current status.
		 */
		async updateJobStatus(id: string, newStatus: ShopJobStatus, userId?: string, reason?: string) {
			const { data: job, error: fetchError } = await supabase
				.from('shop_jobs')
				.select('status, status_history')
				.eq('id', id)
				.single();

			if (fetchError || !job) {
				throw new Error(`Job not found: ${id}`);
			}

			const currentStatus = job.status as ShopJobStatus;
			const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

			if (!allowed.includes(newStatus)) {
				throw new Error(
					`Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowed.join(', ') || 'none'}`
				);
			}

			const updateData: Record<string, unknown> = {
				status: newStatus,
				updated_at: new Date().toISOString()
			};

			if (newStatus === 'approved') {
				updateData.date_booked = new Date().toISOString().split('T')[0]; // DATE only
			}
			if (newStatus === 'checked_in') {
				updateData.date_in = new Date().toISOString().split('T')[0]; // DATE only
				updateData.checked_in_at = new Date().toISOString();
				if (userId) updateData.checked_in_by = userId;
			}
			if (newStatus === 'completed') {
				updateData.date_completed = new Date().toISOString().split('T')[0]; // DATE only
			}
			if (newStatus === 'ready_for_collection') {
				updateData.qc_passed_by = userId ?? null;
				updateData.qc_passed_at = new Date().toISOString();
			}

			const currentHistory = Array.isArray(job.status_history) ? job.status_history : [];
			const historyEntry: Record<string, unknown> = {
				status: newStatus,
				timestamp: new Date().toISOString(),
				user_id: userId ?? null
			};
			if (reason) historyEntry.reason = reason;
			updateData.status_history = [...currentHistory, historyEntry];

			return supabase
				.from('shop_jobs')
				.update(updateData)
				.eq('id', id)
				.select()
				.single();
		},

		/**
		 * Assign a staff member to a job.
		 */
		async assignJob(id: string, userId: string) {
			return supabase
				.from('shop_jobs')
				.update({ assigned_to: userId, updated_at: new Date().toISOString() })
				.eq('id', id)
				.select()
				.single();
		},

		/**
		 * Set or update the promised completion date for a job.
		 */
		async setPromisedDate(id: string, date: string) {
			return supabase
				.from('shop_jobs')
				.update({ date_promised: date, updated_at: new Date().toISOString() })
				.eq('id', id)
				.select()
				.single();
		},

		/**
		 * Record a work milestone (parts_ordered, parts_arrived, strip_started) with timestamp and user.
		 */
		async setMilestone(id: string, milestone: 'parts_ordered' | 'parts_arrived' | 'strip_started', userId: string) {
			const atField = `${milestone}_at`;
			const byField = `${milestone}_by`;
			return supabase
				.from('shop_jobs')
				.update({
					[atField]: new Date().toISOString(),
					[byField]: userId,
					updated_at: new Date().toISOString()
				})
				.eq('id', id)
				.select()
				.single();
		},

		/**
		 * Clear a previously recorded work milestone.
		 */
		async clearMilestone(id: string, milestone: 'parts_ordered' | 'parts_arrived' | 'strip_started') {
			const atField = `${milestone}_at`;
			const byField = `${milestone}_by`;
			return supabase
				.from('shop_jobs')
				.update({
					[atField]: null,
					[byField]: null,
					updated_at: new Date().toISOString()
				})
				.eq('id', id)
				.select()
				.single();
		}
	};
}
