-- =============================================================================
-- Migration: Create shop_settings table
-- Purpose: Shop configuration - contact details, business info, and defaults
--          for the workshop/shop module. No FK to existing assessment tables.
-- Created: 2026-03-24
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.shop_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic shop info
  shop_name               TEXT NOT NULL,
  phone                   TEXT,
  email                   TEXT,

  -- Address
  address                 TEXT,
  city                    TEXT,
  province                TEXT,
  postal_code             TEXT,

  -- Business registration
  vat_number              TEXT,
  registration_number     TEXT,

  -- Pricing defaults
  default_vat_rate        DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  default_markup_parts    DECIMAL(5,2) NOT NULL DEFAULT 25.00,
  default_markup_labor    DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  currency                TEXT NOT NULL DEFAULT 'ZAR',

  -- Branding and documents
  logo_url                TEXT,
  estimate_terms          TEXT,
  invoice_terms           TEXT,
  invoice_payment_days    INTEGER NOT NULL DEFAULT 30,

  -- Timestamps
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger (function already exists in baseline)
CREATE TRIGGER update_shop_settings_updated_at
  BEFORE UPDATE ON public.shop_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- ROLLBACK: DROP TABLE IF EXISTS public.shop_settings CASCADE;
-- =============================================================================
