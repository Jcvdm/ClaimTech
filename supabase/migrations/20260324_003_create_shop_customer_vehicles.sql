-- =============================================================================
-- Migration: Create shop_customer_vehicles table
-- Purpose: Vehicles linked to shop customers. Tracks vehicle history per
--          customer. Walk-in vehicles are stored inline on shop_jobs instead.
-- Created: 2026-03-24
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.shop_customer_vehicles (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer association
  customer_id                 UUID NOT NULL REFERENCES public.shop_customers(id) ON DELETE CASCADE,

  -- Vehicle details
  make                        TEXT NOT NULL,
  model                       TEXT NOT NULL,
  year                        INTEGER,
  reg_number                  TEXT,
  vin                         TEXT,
  color                       TEXT,
  engine_number               TEXT,

  -- Tracked at registration time
  mileage_at_registration     INTEGER,

  -- Internal
  notes                       TEXT,

  -- Timestamps
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A customer cannot have two vehicles with the same registration number
CREATE UNIQUE INDEX IF NOT EXISTS uq_shop_customer_vehicles_reg
  ON public.shop_customer_vehicles(customer_id, reg_number)
  WHERE reg_number IS NOT NULL;

-- Index for customer lookups
CREATE INDEX IF NOT EXISTS idx_shop_customer_vehicles_customer_id
  ON public.shop_customer_vehicles(customer_id);

-- =============================================================================
-- ROLLBACK: DROP TABLE IF EXISTS public.shop_customer_vehicles CASCADE;
-- =============================================================================
