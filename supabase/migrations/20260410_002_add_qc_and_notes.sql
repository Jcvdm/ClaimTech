-- QC tracking columns on shop_jobs
ALTER TABLE public.shop_jobs
    ADD COLUMN IF NOT EXISTS qc_passed_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS qc_passed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.shop_jobs.qc_passed_by IS 'User who passed quality check';
COMMENT ON COLUMN public.shop_jobs.qc_passed_at IS 'Timestamp of quality check pass';

-- Job notes table for activity log
CREATE TABLE IF NOT EXISTS public.shop_job_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.shop_jobs(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    note_type TEXT NOT NULL DEFAULT 'manual' CHECK (note_type IN ('manual', 'system', 'qc_rejection')),
    note_title TEXT,
    context TEXT DEFAULT 'general',
    created_by UUID REFERENCES auth.users(id),
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_job_notes_job_id ON public.shop_job_notes(job_id);

ALTER TABLE public.shop_job_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage shop job notes"
    ON public.shop_job_notes
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
