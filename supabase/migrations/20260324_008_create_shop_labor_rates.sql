-- =============================================================================
-- Migration: Create shop_labor_rates table
-- Purpose: Configurable labor rates per shop and job type. Allows the shop to
--          define named rates (e.g. "Standard", "Specialist") with different
--          hourly rates for autobody vs mechanical work.
-- Created: 2026-03-24
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.shop_labor_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Shop association
  shop_id         UUID NOT NULL REFERENCES public.shop_settings(id) ON DELETE CASCADE,

  -- Rate classification
  job_type        TEXT NOT NULL CHECK (job_type IN ('autobody', 'mechanical')),
  rate_name       TEXT NOT NULL,
  description     TEXT,

  -- Rate
  hourly_rate     DECIMAL(10,2) NOT NULL,

  -- Flags
  is_default      BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A shop cannot have two rates with the same name for the same job type
CREATE UNIQUE INDEX IF NOT EXISTS uq_shop_labor_rates_name
  ON public.shop_labor_rates(shop_id, job_type, rate_name);

-- Index for shop + job type lookups
CREATE INDEX IF NOT EXISTS idx_shop_labor_rates_shop_job_type
  ON public.shop_labor_rates(shop_id, job_type);

-- updated_at trigger
CREATE TRIGGER update_shop_labor_rates_updated_at
  BEFORE UPDATE ON public.shop_labor_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- ROLLBACK: DROP TABLE IF EXISTS public.shop_labor_rates CASCADE;
-- =============================================================================
