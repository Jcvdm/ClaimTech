-- =============================================================================
-- Migration: Create shop_invoices table
-- Purpose: Invoices for completed shop work. This is a new concept not present
--          in the assessment system. Tracks full payment lifecycle including
--          partial payments, method, and reference numbers.
-- Created: 2026-03-24
-- =============================================================================

-- Invoice lifecycle status enum
CREATE TYPE public.shop_invoice_status AS ENUM (
  'draft',
  'sent',
  'paid',
  'partially_paid',
  'overdue',
  'void',
  'credited'
);

CREATE TABLE IF NOT EXISTS public.shop_invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job association
  job_id              UUID NOT NULL REFERENCES public.shop_jobs(id) ON DELETE CASCADE,

  -- Estimate this invoice was generated from (optional)
  estimate_id         UUID REFERENCES public.shop_estimates(id) ON DELETE SET NULL,

  -- Unique human-readable reference (e.g. INV-2026-0001)
  invoice_number      TEXT NOT NULL UNIQUE,

  -- Status
  status              public.shop_invoice_status NOT NULL DEFAULT 'draft',

  -- Line items (same JSONB pattern as shop_estimates)
  line_items          JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Totals
  subtotal            DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  vat_rate            DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  vat_amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
  total               DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Payment tracking
  amount_paid         DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_due          DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method      TEXT,
  payment_date        DATE,
  payment_reference   TEXT,

  -- Dates
  issue_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date            DATE,

  -- Notes and document
  notes               TEXT,
  pdf_url             TEXT,

  -- Lifecycle timestamps
  sent_at             TIMESTAMPTZ,
  paid_at             TIMESTAMPTZ,

  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_shop_invoices_job_id
  ON public.shop_invoices(job_id);

CREATE INDEX IF NOT EXISTS idx_shop_invoices_status
  ON public.shop_invoices(status);

CREATE INDEX IF NOT EXISTS idx_shop_invoices_estimate_id
  ON public.shop_invoices(estimate_id)
  WHERE estimate_id IS NOT NULL;

-- updated_at trigger
CREATE TRIGGER update_shop_invoices_updated_at
  BEFORE UPDATE ON public.shop_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- ROLLBACK:
--   DROP TABLE IF EXISTS public.shop_invoices CASCADE;
--   DROP TYPE IF EXISTS public.shop_invoice_status;
-- =============================================================================
