-- Shop Additionals: additional work items discovered after initial estimate approval
CREATE TABLE IF NOT EXISTS public.shop_additionals (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                  UUID NOT NULL REFERENCES public.shop_jobs(id) ON DELETE CASCADE,
    estimate_id             UUID NOT NULL REFERENCES public.shop_estimates(id) ON DELETE CASCADE,

    -- Snapshot rates from estimate at time of creation
    labour_rate             DECIMAL(10,2) NOT NULL DEFAULT 0,
    paint_rate              DECIMAL(10,2) NOT NULL DEFAULT 0,
    vat_rate                DECIMAL(5,2) NOT NULL DEFAULT 15,
    oem_markup_pct          DECIMAL(5,2) NOT NULL DEFAULT 25,
    alt_markup_pct          DECIMAL(5,2) NOT NULL DEFAULT 25,
    second_hand_markup_pct  DECIMAL(5,2) NOT NULL DEFAULT 25,
    outwork_markup_pct      DECIMAL(5,2) NOT NULL DEFAULT 25,

    -- Status: draft (building list), sent (sent to customer), responded (all items decided)
    status                  TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'responded')),

    -- Line items JSONB with per-item approval workflow
    line_items              JSONB NOT NULL DEFAULT '[]'::JSONB,

    -- Totals (only approved items counted)
    subtotal_approved       DECIMAL(12,2) NOT NULL DEFAULT 0,
    vat_amount_approved     DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_approved          DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Document
    additionals_letter_url  TEXT,
    additionals_letter_path TEXT,

    -- Sent tracking
    sent_at                 TIMESTAMPTZ,
    sent_to                 TEXT,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One additionals record per job
    CONSTRAINT shop_additionals_job_unique UNIQUE (job_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_additionals_job_id ON public.shop_additionals(job_id);
CREATE INDEX IF NOT EXISTS idx_shop_additionals_estimate_id ON public.shop_additionals(estimate_id);

-- Enable RLS
ALTER TABLE public.shop_additionals ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (matches shop_jobs pattern)
CREATE POLICY "Authenticated users can manage shop additionals"
    ON public.shop_additionals
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
