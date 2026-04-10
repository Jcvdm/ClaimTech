import type { EstimateLineItem } from '$lib/types/assessment';

export type ShopAdditionalLineItemStatus = 'pending' | 'approved' | 'declined';
export type ShopAdditionalLineItemAction = 'added' | 'removed' | 'reversal';
export type ShopAdditionalsStatus = 'draft' | 'sent' | 'responded';

export interface ShopAdditionalLineItem extends EstimateLineItem {
    status: ShopAdditionalLineItemStatus;
    action: ShopAdditionalLineItemAction;
    original_line_id?: string | null;
    reverses_line_id?: string | null;
    reversal_reason?: string | null;
    decline_reason?: string | null;
    approved_at?: string | null;
    declined_at?: string | null;
}

export interface ShopAdditionals {
    id: string;
    job_id: string;
    estimate_id: string;
    labour_rate: number;
    paint_rate: number;
    vat_rate: number;
    oem_markup_pct: number;
    alt_markup_pct: number;
    second_hand_markup_pct: number;
    outwork_markup_pct: number;
    status: ShopAdditionalsStatus;
    line_items: ShopAdditionalLineItem[];
    subtotal_approved: number;
    vat_amount_approved: number;
    total_approved: number;
    original_line_items: EstimateLineItem[] | null;
    original_subtotal: number | null;
    original_vat_amount: number | null;
    original_total: number | null;
    additionals_letter_url: string | null;
    additionals_letter_path: string | null;
    sent_at: string | null;
    sent_to: string | null;
    created_at: string;
    updated_at: string;
}
