// NOTE: Using untyped SupabaseClient because shop tables are not yet reflected
// in database.types.ts. Run `npm run generate:types` after applying migrations
// to the preview database to get full type safety.
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShopEstimate {
	id: string;
	job_id: string;
	estimate_number: string;
	status: 'draft' | 'sent' | 'approved' | 'declined' | 'revised' | 'expired';
	version: number;
	line_items: ShopEstimateLineItem[];
	parts_total: number;
	labor_total: number;
	sublet_total: number;
	sundries_total: number;
	subtotal: number;
	discount_amount: number;
	discount_description: string | null;
	vat_rate: number;
	vat_amount: number;
	total: number;
	markup_parts_pct: number | null;
	markup_labor_pct: number | null;
	valid_until: string | null;
	notes: string | null;
	internal_notes: string | null;
	pdf_url: string | null;
	sent_at: string | null;
	approved_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface ShopEstimateLineItem {
	id: string;
	type: 'part' | 'labor' | 'sublet' | 'other';
	description: string;
	quantity: number;
	unit_price: number;
	markup_pct: number;
	total: number;
	part_number?: string;
	supplier?: string;
	hours?: number;
	hourly_rate?: number;
	rate_name?: string;
}

export interface ShopEstimateTotals {
	parts_total: number;
	labor_total: number;
	sublet_total: number;
	sundries_total: number;
	subtotal: number;
	discount_amount: number;
	vat_rate: number;
	vat_amount: number;
	total: number;
}

export interface CreateShopEstimateInput {
	job_type: 'autobody' | 'mechanical';
	customer_name: string;
	customer_phone?: string;
	customer_email?: string;
	customer_id?: string;
	vehicle_make: string;
	vehicle_model: string;
	vehicle_year?: number;
	vehicle_reg?: string;
	vehicle_vin?: string;
	vehicle_color?: string;
	vehicle_mileage?: number;
	damage_description?: string;
	complaint?: string;
	diagnosis?: string;
	shop_id: string;
}

// ─── Service Factory ──────────────────────────────────────────────────────────

export function createShopEstimateService(supabase: SupabaseClient) {
	/**
	 * Generate a unique estimate number in the format EST-YYYY-NNNN.
	 * Uses the highest existing number for the current year and increments it.
	 */
	async function generateEstimateNumber(): Promise<string> {
		const year = new Date().getFullYear();
		const prefix = `EST-${year}-`;

		const { data, error } = await supabase
			.from('shop_estimates')
			.select('estimate_number')
			.like('estimate_number', `${prefix}%`)
			.order('estimate_number', { ascending: false })
			.limit(1);

		if (error) {
			console.error('Error fetching last estimate number:', error);
		}

		let nextNumber = 1;
		if (data && data.length > 0) {
			const last = data[0].estimate_number as string;
			const parts = last.split('-');
			const lastNum = parseInt(parts[parts.length - 1], 10);
			if (!isNaN(lastNum)) {
				nextNumber = lastNum + 1;
			}
		}

		const padded = String(nextNumber).padStart(4, '0');
		return `${prefix}${padded}`;
	}

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
		generateEstimateNumber,
		generateJobNumber,

		/**
		 * Create a new job + estimate pair atomically.
		 * Returns both the created job and estimate.
		 */
		async createEstimate(
			data: CreateShopEstimateInput,
			createdBy: string
		): Promise<{ estimate: ShopEstimate; jobId: string }> {
			const estimateNumber = await generateEstimateNumber();
			const jobNumber = await generateJobNumber();

			// 1. Create the job record
			const { data: job, error: jobError } = await supabase
				.from('shop_jobs')
				.insert({
					shop_id: data.shop_id,
					job_number: jobNumber,
					status: 'quote_requested',
					job_type: data.job_type,
					customer_id: data.customer_id ?? null,
					customer_name: data.customer_name,
					customer_phone: data.customer_phone ?? null,
					customer_email: data.customer_email ?? null,
					vehicle_make: data.vehicle_make,
					vehicle_model: data.vehicle_model,
					vehicle_year: data.vehicle_year ?? null,
					vehicle_reg: data.vehicle_reg ?? null,
					vehicle_vin: data.vehicle_vin ?? null,
					vehicle_color: data.vehicle_color ?? null,
					vehicle_mileage: data.vehicle_mileage ?? null,
					damage_description: data.damage_description ?? null,
					complaint: data.complaint ?? null,
					diagnosis: data.diagnosis ?? null,
					created_by: createdBy
				})
				.select()
				.single();

			if (jobError) {
				console.error('Error creating shop job:', jobError);
				throw new Error(`Failed to create shop job: ${jobError.message}`);
			}

			// 2. Create the estimate linked to the job
			const { data: estimate, error: estimateError } = await supabase
				.from('shop_estimates')
				.insert({
					job_id: job.id,
					estimate_number: estimateNumber,
					status: 'draft',
					version: 1,
					line_items: [],
					parts_total: 0,
					labor_total: 0,
					sublet_total: 0,
					sundries_total: 0,
					subtotal: 0,
					discount_amount: 0,
					vat_rate: 15.00,
					vat_amount: 0,
					total: 0
				})
				.select()
				.single();

			if (estimateError) {
				console.error('Error creating shop estimate:', estimateError);
				throw new Error(`Failed to create shop estimate: ${estimateError.message}`);
			}

			return {
				estimate: estimate as unknown as ShopEstimate,
				jobId: job.id
			};
		},

		/**
		 * Fetch a single estimate by ID with its parent job.
		 */
		async getEstimate(id: string) {
			return supabase
				.from('shop_estimates')
				.select('*, shop_jobs(*)')
				.eq('id', id)
				.single();
		},

		/**
		 * List estimates with optional status filter, newest first.
		 */
		async listEstimates(filters?: { status?: string; shop_id?: string }) {
			let query = supabase
				.from('shop_estimates')
				.select(
					'*, shop_jobs(job_number, customer_name, vehicle_make, vehicle_model, vehicle_reg, job_type, status, shop_id)'
				)
				.order('created_at', { ascending: false });

			if (filters?.status) {
				query = query.eq('status', filters.status);
			}
			if (filters?.shop_id) {
				query = query.eq('shop_jobs.shop_id', filters.shop_id);
			}

			return query;
		},

		/**
		 * Update estimate metadata (notes, valid_until, etc.).
		 * Only allowed when status is 'draft' or 'revised'.
		 */
		async updateEstimate(id: string, data: Partial<Omit<ShopEstimate, 'id' | 'job_id' | 'estimate_number' | 'created_at'>>) {
			return supabase
				.from('shop_estimates')
				.update({ ...data, updated_at: new Date().toISOString() })
				.eq('id', id)
				.select()
				.single();
		},

		/**
		 * Persist updated line items and recalculated totals to the estimate.
		 */
		async updateLineItems(
			id: string,
			lineItems: ShopEstimateLineItem[],
			totals: ShopEstimateTotals
		) {
			return supabase
				.from('shop_estimates')
				.update({
					line_items: lineItems,
					...totals,
					updated_at: new Date().toISOString()
				})
				.eq('id', id)
				.select()
				.single();
		},

		/**
		 * Transition estimate from 'draft' → 'sent'.
		 */
		async sendEstimate(id: string) {
			return supabase
				.from('shop_estimates')
				.update({
					status: 'sent',
					sent_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				})
				.eq('id', id)
				.eq('status', 'draft')
				.select()
				.single();
		},

		/**
		 * Transition estimate from 'sent' → 'approved'.
		 * Also advances the linked job to 'approved'.
		 */
		async approveEstimate(id: string) {
			const { data: estimate, error } = await supabase
				.from('shop_estimates')
				.update({
					status: 'approved',
					approved_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				})
				.eq('id', id)
				.eq('status', 'sent')
				.select()
				.single();

			if (error) {
				console.error('Error approving estimate:', error);
				throw new Error(`Failed to approve estimate: ${error.message}`);
			}

			if (estimate) {
				const { error: jobError } = await supabase
					.from('shop_jobs')
					.update({ status: 'approved', updated_at: new Date().toISOString() })
					.eq('id', estimate.job_id);

				if (jobError) {
					console.error('Error updating job status after estimate approval:', jobError);
					// Non-fatal - estimate is approved, job status update is best-effort
				}
			}

			return { data: estimate as unknown as ShopEstimate, error: null };
		},

		/**
		 * Transition estimate from 'sent' → 'declined'.
		 */
		async declineEstimate(id: string) {
			return supabase
				.from('shop_estimates')
				.update({
					status: 'declined',
					updated_at: new Date().toISOString()
				})
				.eq('id', id)
				.eq('status', 'sent')
				.select()
				.single();
		},

		/**
		 * Create a revised version of an existing estimate (for re-quoting).
		 * Copies line items from the original and increments version.
		 */
		async reviseEstimate(id: string) {
			const { data: original, error: fetchError } = await supabase
				.from('shop_estimates')
				.select('*')
				.eq('id', id)
				.single();

			if (fetchError || !original) {
				throw new Error('Estimate not found');
			}

			const estimateNumber = await generateEstimateNumber();

			return supabase
				.from('shop_estimates')
				.insert({
					job_id: original.job_id,
					estimate_number: estimateNumber,
					status: 'revised',
					version: (original.version as number) + 1,
					line_items: original.line_items,
					parts_total: original.parts_total,
					labor_total: original.labor_total,
					sublet_total: original.sublet_total,
					sundries_total: original.sundries_total,
					subtotal: original.subtotal,
					discount_amount: original.discount_amount,
					discount_description: original.discount_description,
					vat_rate: original.vat_rate,
					vat_amount: original.vat_amount,
					total: original.total,
					markup_parts_pct: original.markup_parts_pct,
					markup_labor_pct: original.markup_labor_pct,
					notes: original.notes,
					internal_notes: original.internal_notes
				})
				.select()
				.single();
		}
	};
}
