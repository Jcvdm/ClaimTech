-- 1. Payment history table
CREATE TABLE IF NOT EXISTS public.shop_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID NOT NULL REFERENCES public.shop_invoices(id) ON DELETE CASCADE,
    amount          DECIMAL(12,2) NOT NULL,
    payment_method  TEXT NOT NULL CHECK (payment_method IN ('eft', 'cash', 'card', 'cheque')),
    payment_reference TEXT,
    payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    notes           TEXT,
    recorded_by     UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_payments_invoice_id ON public.shop_payments(invoice_id);

ALTER TABLE public.shop_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage shop payments"
    ON public.shop_payments
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Add pdf_path to invoices (for storage delete-and-replace pattern)
ALTER TABLE public.shop_invoices ADD COLUMN IF NOT EXISTS pdf_path TEXT;

-- 3. Add bank details to shop_settings (for invoice payment instructions)
ALTER TABLE public.shop_settings
    ADD COLUMN IF NOT EXISTS bank_name TEXT,
    ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
    ADD COLUMN IF NOT EXISTS bank_branch_code TEXT,
    ADD COLUMN IF NOT EXISTS bank_account_holder TEXT;
