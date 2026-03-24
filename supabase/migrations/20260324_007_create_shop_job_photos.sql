-- =============================================================================
-- Migration: Create shop_job_photos table
-- Purpose: Photos for shop jobs. Uses a single table with categories (before,
--          during, after, damage, general) - simpler than the assessment
--          system's 5+ separate photo tables.
-- Created: 2026-03-24
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.shop_job_photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job association
  job_id          UUID NOT NULL REFERENCES public.shop_jobs(id) ON DELETE CASCADE,

  -- Storage
  storage_path    TEXT NOT NULL,

  -- Display
  label           TEXT,
  category        TEXT NOT NULL DEFAULT 'general'
                    CHECK (category IN ('before', 'during', 'after', 'damage', 'general')),
  sort_order      INTEGER NOT NULL DEFAULT 0,

  -- Timestamp
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_shop_job_photos_job_id
  ON public.shop_job_photos(job_id);

CREATE INDEX IF NOT EXISTS idx_shop_job_photos_category
  ON public.shop_job_photos(job_id, category);

-- =============================================================================
-- ROLLBACK: DROP TABLE IF EXISTS public.shop_job_photos CASCADE;
-- =============================================================================
