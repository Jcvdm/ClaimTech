// NOTE: Using untyped SupabaseClient because shop tables are not yet reflected
// in database.types.ts. Run `npm run generate:types` after applying migrations
// to get full type safety.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ShopAdditionals, ShopAdditionalLineItem } from '$lib/types/shop-additionals';
import type { EstimateLineItem } from '$lib/types/assessment';
import { calculateVAT, calculateTotal, recalculateLineItem } from '$lib/utils/estimateCalculations';

function generateId(): string {
    return crypto.randomUUID();
}

/**
 * Calculate approved totals from line items using the snapshotted rates.
 * Mirrors the assessment additionals.service.ts calculateApprovedTotals logic.
 */
function calculateApprovedTotals(
    lineItems: ShopAdditionalLineItem[],
    rates: {
        oem_markup_pct: number;
        alt_markup_pct: number;
        second_hand_markup_pct: number;
        outwork_markup_pct: number;
        vat_rate: number;
    }
): { subtotal_approved: number; vat_amount_approved: number; total_approved: number } {
    const approved = lineItems.filter(li => li.status === 'approved' && li.action !== 'reversal');
    const reversals = lineItems.filter(li => li.action === 'reversal');

    // Get IDs that have been reversed
    const reversedIds = new Set(reversals.map(r => r.reverses_line_id).filter(Boolean));

    // Only count approved items that haven't been reversed
    const effectiveApproved = approved.filter(li => !reversedIds.has(li.id));

    let partsNett = 0;
    let saTotal = 0;
    let labourTotal = 0;
    let paintTotal = 0;
    let outworkNett = 0;

    for (const item of effectiveApproved) {
        if (item.process_type === 'N') partsNett += item.part_price_nett || 0;
        if (item.process_type === 'O') outworkNett += item.outwork_charge_nett || 0;
        saTotal += item.strip_assemble || 0;
        labourTotal += item.labour_cost || 0;
        paintTotal += item.paint_cost || 0;
    }

    // Calculate markup per item based on part type
    let partsMarkup = 0;
    for (const item of effectiveApproved) {
        if (item.process_type === 'N' && item.part_price_nett) {
            let m = 0;
            if (item.part_type === 'OEM') m = rates.oem_markup_pct;
            else if (item.part_type === 'ALT') m = rates.alt_markup_pct;
            else if (item.part_type === '2ND') m = rates.second_hand_markup_pct;
            partsMarkup += item.part_price_nett * (m / 100);
        }
    }
    const outworkMarkup = outworkNett * (rates.outwork_markup_pct / 100);
    const markupTotal = Number((partsMarkup + outworkMarkup).toFixed(2));

    const subtotal = Number(
        (partsNett + saTotal + labourTotal + paintTotal + outworkNett + markupTotal).toFixed(2)
    );
    const vatAmount = calculateVAT(subtotal, rates.vat_rate);
    const total = calculateTotal(subtotal, vatAmount);

    return { subtotal_approved: subtotal, vat_amount_approved: vatAmount, total_approved: total };
}

// ─── Service Factory ──────────────────────────────────────────────────────────

export function createShopAdditionalsService(supabase: SupabaseClient) {
    return {
        /**
         * Get additionals for a job. Returns null if not found.
         */
        async getByJobId(jobId: string): Promise<ShopAdditionals | null> {
            const { data, error } = await supabase
                .from('shop_additionals')
                .select('*')
                .eq('job_id', jobId)
                .maybeSingle();

            if (error) throw new Error(`Failed to fetch additionals: ${error.message}`);
            return data as ShopAdditionals | null;
        },

        /**
         * Create default additionals record, snapshotting rates from the estimate.
         */
        async createDefault(jobId: string, estimateId: string): Promise<ShopAdditionals> {
            // Fetch estimate to snapshot rates
            const { data: estimate, error: estErr } = await supabase
                .from('shop_estimates')
                .select(
                    'labour_rate, paint_rate, vat_rate, oem_markup_pct, alt_markup_pct, second_hand_markup_pct, outwork_markup_pct, line_items, subtotal, vat_amount, total'
                )
                .eq('id', estimateId)
                .single();

            if (estErr || !estimate) {
                throw new Error('Failed to fetch estimate for rate snapshot');
            }

            const { data, error } = await supabase
                .from('shop_additionals')
                .insert({
                    job_id: jobId,
                    estimate_id: estimateId,
                    labour_rate: estimate.labour_rate || 0,
                    paint_rate: estimate.paint_rate || 0,
                    vat_rate: estimate.vat_rate || 15,
                    oem_markup_pct: estimate.oem_markup_pct || 25,
                    alt_markup_pct: estimate.alt_markup_pct || 25,
                    second_hand_markup_pct: estimate.second_hand_markup_pct || 25,
                    outwork_markup_pct: estimate.outwork_markup_pct || 25,
                    status: 'draft',
                    line_items: [],
                    original_line_items: estimate.line_items || [],
                    original_subtotal: estimate.subtotal || 0,
                    original_vat_amount: estimate.vat_amount || 0,
                    original_total: estimate.total || 0
                })
                .select()
                .single();

            if (error) throw new Error(`Failed to create additionals: ${error.message}`);
            return data as ShopAdditionals;
        },

        /**
         * Add a new line item (status: pending, action: added).
         */
        async addLineItem(
            jobId: string,
            lineItem: Partial<EstimateLineItem>
        ): Promise<ShopAdditionals> {
            const record = await this.getByJobId(jobId);
            if (!record) throw new Error('Additionals record not found');

            const newItem: ShopAdditionalLineItem = {
                ...(lineItem as EstimateLineItem),
                id: generateId(),
                status: 'pending',
                action: 'added',
                approved_at: null,
                declined_at: null,
                decline_reason: null
            };

            const updatedItems = [...record.line_items, newItem];

            const { data, error } = await supabase
                .from('shop_additionals')
                .update({
                    line_items: updatedItems,
                    updated_at: new Date().toISOString()
                })
                .eq('id', record.id)
                .select()
                .single();

            if (error) throw new Error(`Failed to add line item: ${error.message}`);
            return data as ShopAdditionals;
        },

        /**
         * Add a removed line item (marks original estimate item as removed, auto-approved with negated values).
         */
        async addRemovedLineItem(
            jobId: string,
            originalLineItem: EstimateLineItem
        ): Promise<ShopAdditionals> {
            const record = await this.getByJobId(jobId);
            if (!record) throw new Error('Additionals record not found');

            // Create a removal entry with negated values — auto-approved
            const removedItem: ShopAdditionalLineItem = {
                ...originalLineItem,
                id: generateId(),
                original_line_id: originalLineItem.id,
                status: 'approved',
                action: 'removed',
                // Negate all cost values
                part_price_nett: -(originalLineItem.part_price_nett || 0),
                part_price: -(originalLineItem.part_price || 0),
                strip_assemble: -(originalLineItem.strip_assemble || 0),
                labour_cost: -(originalLineItem.labour_cost || 0),
                paint_cost: -(originalLineItem.paint_cost || 0),
                outwork_charge_nett: -(originalLineItem.outwork_charge_nett || 0),
                outwork_charge: -(originalLineItem.outwork_charge || 0),
                total: -(originalLineItem.total || 0),
                approved_at: new Date().toISOString(),
                declined_at: null,
                decline_reason: null
            };

            const updatedItems = [...record.line_items, removedItem];
            const totals = calculateApprovedTotals(updatedItems, record);

            const { data, error } = await supabase
                .from('shop_additionals')
                .update({
                    line_items: updatedItems,
                    ...totals,
                    updated_at: new Date().toISOString()
                })
                .eq('id', record.id)
                .select()
                .single();

            if (error) throw new Error(`Failed to add removed line item: ${error.message}`);
            return data as ShopAdditionals;
        },

        /**
         * Approve a pending line item and recalculate approved totals.
         */
        async approveLineItem(jobId: string, lineItemId: string): Promise<ShopAdditionals> {
            const record = await this.getByJobId(jobId);
            if (!record) throw new Error('Additionals record not found');

            const updatedItems = record.line_items.map(li => {
                if (li.id === lineItemId && li.status === 'pending') {
                    return {
                        ...li,
                        status: 'approved' as const,
                        approved_at: new Date().toISOString()
                    };
                }
                return li;
            });

            const totals = calculateApprovedTotals(updatedItems, record);

            const { data, error } = await supabase
                .from('shop_additionals')
                .update({
                    line_items: updatedItems,
                    ...totals,
                    updated_at: new Date().toISOString()
                })
                .eq('id', record.id)
                .select()
                .single();

            if (error) throw new Error(`Failed to approve line item: ${error.message}`);
            return data as ShopAdditionals;
        },

        /**
         * Decline a pending line item with reason.
         */
        async declineLineItem(
            jobId: string,
            lineItemId: string,
            reason: string
        ): Promise<ShopAdditionals> {
            const record = await this.getByJobId(jobId);
            if (!record) throw new Error('Additionals record not found');

            const updatedItems = record.line_items.map(li => {
                if (li.id === lineItemId && li.status === 'pending') {
                    return {
                        ...li,
                        status: 'declined' as const,
                        decline_reason: reason,
                        declined_at: new Date().toISOString()
                    };
                }
                return li;
            });

            const { data, error } = await supabase
                .from('shop_additionals')
                .update({
                    line_items: updatedItems,
                    updated_at: new Date().toISOString()
                })
                .eq('id', record.id)
                .select()
                .single();

            if (error) throw new Error(`Failed to decline line item: ${error.message}`);
            return data as ShopAdditionals;
        },

        /**
         * Delete a pending line item. Only pending items can be deleted.
         */
        async deleteLineItem(jobId: string, lineItemId: string): Promise<ShopAdditionals> {
            const record = await this.getByJobId(jobId);
            if (!record) throw new Error('Additionals record not found');

            const item = record.line_items.find(li => li.id === lineItemId);
            if (!item || item.status !== 'pending') {
                throw new Error('Can only delete pending items');
            }

            const updatedItems = record.line_items.filter(li => li.id !== lineItemId);

            const { data, error } = await supabase
                .from('shop_additionals')
                .update({
                    line_items: updatedItems,
                    updated_at: new Date().toISOString()
                })
                .eq('id', record.id)
                .select()
                .single();

            if (error) throw new Error(`Failed to delete line item: ${error.message}`);
            return data as ShopAdditionals;
        },

        /**
         * Reverse an approved line item by creating a negating reversal entry.
         */
        async reverseApprovedLineItem(
            jobId: string,
            lineItemId: string,
            reason: string
        ): Promise<ShopAdditionals> {
            const record = await this.getByJobId(jobId);
            if (!record) throw new Error('Additionals record not found');

            const original = record.line_items.find(
                li => li.id === lineItemId && li.status === 'approved'
            );
            if (!original) throw new Error('Approved line item not found');

            const reversalItem: ShopAdditionalLineItem = {
                ...original,
                id: generateId(),
                status: 'approved',
                action: 'reversal',
                reverses_line_id: lineItemId,
                reversal_reason: reason,
                // Negate values
                part_price_nett: -(original.part_price_nett || 0),
                part_price: -(original.part_price || 0),
                strip_assemble: -(original.strip_assemble || 0),
                labour_cost: -(original.labour_cost || 0),
                paint_cost: -(original.paint_cost || 0),
                outwork_charge_nett: -(original.outwork_charge_nett || 0),
                outwork_charge: -(original.outwork_charge || 0),
                total: -(original.total || 0),
                approved_at: new Date().toISOString()
            };

            const updatedItems = [...record.line_items, reversalItem];
            const totals = calculateApprovedTotals(updatedItems, record);

            const { data, error } = await supabase
                .from('shop_additionals')
                .update({
                    line_items: updatedItems,
                    ...totals,
                    updated_at: new Date().toISOString()
                })
                .eq('id', record.id)
                .select()
                .single();

            if (error) throw new Error(`Failed to reverse line item: ${error.message}`);
            return data as ShopAdditionals;
        },

        /**
         * Reinstate a declined line item by creating an approved reversal entry with positive values.
         */
        async reinstateDeclinedLineItem(jobId: string, lineItemId: string, reason: string): Promise<ShopAdditionals> {
            const record = await this.getByJobId(jobId);
            if (!record) throw new Error('Additionals record not found');

            const originalItem = record.line_items.find(li => li.id === lineItemId);
            if (!originalItem || originalItem.status !== 'declined') throw new Error('Can only reinstate declined items');

            const alreadyReinstated = record.line_items.some(
                li => li.action === 'reversal' && li.reverses_line_id === lineItemId
            );
            if (alreadyReinstated) throw new Error('Already reinstated');

            const reversalItem: ShopAdditionalLineItem = {
                ...originalItem,
                id: generateId(),
                status: 'approved',
                action: 'reversal',
                reverses_line_id: lineItemId,
                reversal_reason: reason,
                approved_at: new Date().toISOString(),
                decline_reason: null,
            };

            const updatedItems = [...record.line_items, reversalItem];
            const totals = calculateApprovedTotals(updatedItems, record);

            const { data, error } = await supabase
                .from('shop_additionals')
                .update({ line_items: updatedItems, ...totals, updated_at: new Date().toISOString() })
                .eq('id', record.id)
                .select()
                .single();

            if (error) throw new Error(`Failed to reinstate: ${error.message}`);
            return data as ShopAdditionals;
        },

        /**
         * Reinstate a removed original estimate line by creating a reversal that negates the removal.
         */
        async reinstateRemovedOriginal(jobId: string, originalLineId: string, reason: string): Promise<ShopAdditionals> {
            const record = await this.getByJobId(jobId);
            if (!record) throw new Error('Additionals record not found');

            const removalItem = record.line_items.find(
                li => li.action === 'removed' && li.original_line_id === originalLineId
            );
            if (!removalItem) throw new Error('Removal entry not found');

            const alreadyReinstated = record.line_items.some(
                li => li.action === 'reversal' && li.reverses_line_id === removalItem.id
            );
            if (alreadyReinstated) throw new Error('Already reinstated');

            const negate = (v: number | null | undefined): number => (v == null ? 0 : -Math.abs(v));

            const reversalItem: ShopAdditionalLineItem = {
                ...removalItem,
                id: generateId(),
                status: 'approved',
                action: 'reversal',
                reverses_line_id: removalItem.id,
                reversal_reason: reason,
                approved_at: new Date().toISOString(),
                part_price_nett: removalItem.part_price_nett ? negate(removalItem.part_price_nett) : null,
                part_price: removalItem.part_price ? negate(removalItem.part_price) : null,
                strip_assemble: removalItem.strip_assemble ? negate(removalItem.strip_assemble) : null,
                labour_cost: negate(removalItem.labour_cost || 0),
                paint_cost: negate(removalItem.paint_cost || 0),
                outwork_charge_nett: removalItem.outwork_charge_nett ? negate(removalItem.outwork_charge_nett) : null,
                outwork_charge: removalItem.outwork_charge ? negate(removalItem.outwork_charge) : null,
                total: negate(removalItem.total || 0),
            };

            const updatedItems = [...record.line_items, reversalItem];
            const totals = calculateApprovedTotals(updatedItems, record);

            const { data, error } = await supabase
                .from('shop_additionals')
                .update({ line_items: updatedItems, ...totals, updated_at: new Date().toISOString() })
                .eq('id', record.id)
                .select()
                .single();

            if (error) throw new Error(`Failed to reinstate: ${error.message}`);
            return data as ShopAdditionals;
        },

        /**
         * Mark additionals as sent to customer.
         */
        async markSent(jobId: string, sentTo: string): Promise<ShopAdditionals> {
            const record = await this.getByJobId(jobId);
            if (!record) throw new Error('Additionals record not found');

            const { data, error } = await supabase
                .from('shop_additionals')
                .update({
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    sent_to: sentTo,
                    updated_at: new Date().toISOString()
                })
                .eq('id', record.id)
                .select()
                .single();

            if (error) throw new Error(`Failed to mark as sent: ${error.message}`);
            return data as ShopAdditionals;
        },

        /**
         * Update a pending additional line item's values and recalculate costs.
         */
        async updatePendingLineItem(jobId: string, lineItemId: string, patch: Partial<EstimateLineItem>): Promise<ShopAdditionals> {
            const record = await this.getByJobId(jobId);
            if (!record) throw new Error('Additionals record not found');

            const updatedItems = record.line_items.map(li => {
                if (li.id === lineItemId && li.status === 'pending') {
                    const merged = { ...li, ...patch };
                    // Recalculate using the additionals' snapshotted rates
                    const recalculated = recalculateLineItem(merged, record.labour_rate, record.paint_rate);
                    return { ...recalculated, status: li.status, action: li.action } as ShopAdditionalLineItem;
                }
                return li;
            });

            const { data, error } = await supabase
                .from('shop_additionals')
                .update({
                    line_items: updatedItems,
                    updated_at: new Date().toISOString()
                })
                .eq('id', record.id)
                .select()
                .single();

            if (error) throw new Error(`Failed to update line item: ${error.message}`);
            return data as ShopAdditionals;
        }
    };
}
