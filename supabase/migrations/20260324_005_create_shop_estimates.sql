-- =============================================================================
-- Migration: Create shop_estimates table
-- Purpose: Quotes / estimates for shop jobs. Uses JSONB line_items matching
--          the existing assessment_estimates pattern for component reuse.
--          Multiple estimates can exist per job (versioning).
-- Created: 2026-03-24
-- =============================================================================

-- Estimate lifecycle status enum
CREATE TYPE public.shop_estimate_status AS ENUM (
  'draft',
  'sent',
  'approved',
  'declined',
  'revised',
  'expired'
);

CREATE TABLE IF NOT EXISTS public.shop_estimates (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job association
  job_id                  UUID NOT NULL REFERENCES public.shop_jobs(id) ON DELETE CASCADE,

  -- Unique human-readable reference (e.g. EST-2026-0001)
  estimate_number         TEXT NOT NULL UNIQUE,

  -- Status and versioning
  status                  public.shop_estimate_status NOT NULL DEFAULT 'draft',
  version                 INTEGER NOT NULL DEFAULT 1,

  -- Line items stored as JSONB array
  -- Each item: { id, type, description, quantity, unit_price, markup_pct, total, ... }
  line_items              JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Totals breakdown
  parts_total             DECIMAL(12,2) NOT NULL DEFAULT 0,
  labor_total             DECIMAL(12,2) NOT NULL DEFAULT 0,
  sublet_total            DECIMAL(12,2) NOT NULL DEFAULT 0,
  sundries_total          DECIMAL(12,2) NOT NULL DEFAULT 0,
  subtotal                DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Discount
  discount_amount         DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_description    TEXT,

  -- VAT
  vat_rate                DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  vat_amount              DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Grand total
  total                   DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Markup percentages applied (snapshot at time of creation)
  markup_parts_pct        DECIMAL(5,2),
  markup_labor_pct        DECIMAL(5,2),

  -- Validity
  valid_until             DATE,

  -- Notes
  notes                   TEXT,
  internal_notes          TEXT,

  -- Document
  pdf_url                 TEXT,

  -- Lifecycle timestamps
  sent_at                 TIMESTAMPTZ,
  approved_at             TIMESTAMPTZ,

  -- Timestamps
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_shop_estimates_job_id
  ON public.shop_estimates(job_id);

CREATE INDEX IF NOT EXISTS idx_shop_estimates_status
  ON public.shop_estimates(status);

-- updated_at trigger
CREATE TRIGGER update_shop_estimates_updated_at
  BEFORE UPDATE ON public.shop_estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- ROLLBACK:
--   DROP TABLE IF EXISTS public.shop_estimates CASCADE;
--   DROP TYPE IF EXISTS public.shop_estimate_status;
-- =============================================================================
