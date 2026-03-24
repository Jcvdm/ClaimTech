-- =============================================================================
-- Migration: Create shop_customers table
-- Purpose: Customer database for the shop module. Each customer belongs to
--          a shop (shop_id). Supports both individual and company customers.
-- Created: 2026-03-24
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.shop_customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Shop association
  shop_id         UUID NOT NULL REFERENCES public.shop_settings(id) ON DELETE CASCADE,

  -- Customer identity
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,

  -- Address
  address         TEXT,
  city            TEXT,
  province        TEXT,

  -- South Africa-specific identifiers
  id_number       TEXT,

  -- Company details (optional - for corporate customers)
  company_name    TEXT,
  vat_number      TEXT,

  -- Internal
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common lookup patterns
CREATE INDEX IF NOT EXISTS idx_shop_customers_shop_id
  ON public.shop_customers(shop_id);

CREATE INDEX IF NOT EXISTS idx_shop_customers_name
  ON public.shop_customers(shop_id, name);

CREATE INDEX IF NOT EXISTS idx_shop_customers_phone
  ON public.shop_customers(shop_id, phone)
  WHERE phone IS NOT NULL;

-- updated_at trigger
CREATE TRIGGER update_shop_customers_updated_at
  BEFORE UPDATE ON public.shop_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- ROLLBACK: DROP TABLE IF EXISTS public.shop_customers CASCADE;
-- =============================================================================
