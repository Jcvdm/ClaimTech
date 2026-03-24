-- =============================================================================
-- Migration: Create shop_jobs table
-- Purpose: Core job / work order record for the shop module. Supports both
--          autobody and mechanical job types. Customer and vehicle info is
--          stored inline to support walk-ins (customer_id is optional).
-- Created: 2026-03-24
-- =============================================================================

-- Job lifecycle status enum
CREATE TYPE public.shop_job_status AS ENUM (
  'quote_requested',
  'quoted',
  'approved',
  'checked_in',
  'in_progress',
  'quality_check',
  'ready_for_collection',
  'completed',
  'cancelled'
);

CREATE TABLE IF NOT EXISTS public.shop_jobs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Shop association
  shop_id               UUID NOT NULL REFERENCES public.shop_settings(id) ON DELETE RESTRICT,

  -- Unique human-readable reference (e.g. JOB-2026-0001)
  job_number            TEXT NOT NULL UNIQUE,

  -- Status and type
  status                public.shop_job_status NOT NULL DEFAULT 'quote_requested',
  job_type              TEXT NOT NULL CHECK (job_type IN ('autobody', 'mechanical')),

  -- Customer link (nullable - walk-ins may not be registered customers)
  customer_id           UUID REFERENCES public.shop_customers(id) ON DELETE SET NULL,

  -- Inline customer snapshot (always populated; mirrors registered customer or walk-in details)
  customer_name         TEXT NOT NULL,
  customer_phone        TEXT,
  customer_email        TEXT,

  -- Inline vehicle details (always populated)
  vehicle_make          TEXT NOT NULL,
  vehicle_model         TEXT NOT NULL,
  vehicle_year          INTEGER,
  vehicle_reg           TEXT,
  vehicle_vin           TEXT,
  vehicle_color         TEXT,
  vehicle_mileage       INTEGER,

  -- Autobody-specific fields
  damage_description    TEXT,

  -- Mechanical-specific fields
  complaint             TEXT,
  diagnosis             TEXT,
  fault_codes           TEXT,

  -- Workflow dates
  date_in               DATE,
  date_promised         DATE,
  date_completed        DATE,

  -- Staff assignment
  assigned_to           UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_by            UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,

  -- Internal notes
  notes                 TEXT,

  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_shop_jobs_shop_id
  ON public.shop_jobs(shop_id);

CREATE INDEX IF NOT EXISTS idx_shop_jobs_customer_id
  ON public.shop_jobs(customer_id)
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shop_jobs_status
  ON public.shop_jobs(shop_id, status);

CREATE INDEX IF NOT EXISTS idx_shop_jobs_job_type
  ON public.shop_jobs(shop_id, job_type);

CREATE INDEX IF NOT EXISTS idx_shop_jobs_job_number
  ON public.shop_jobs(job_number);

-- updated_at trigger
CREATE TRIGGER update_shop_jobs_updated_at
  BEFORE UPDATE ON public.shop_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- ROLLBACK:
--   DROP TABLE IF EXISTS public.shop_jobs CASCADE;
--   DROP TYPE IF EXISTS public.shop_job_status;
-- =============================================================================
