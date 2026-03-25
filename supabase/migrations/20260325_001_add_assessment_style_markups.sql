-- Migration: Add assessment-style markup percentage columns to shop_settings
-- Date: 2026-03-25
-- Purpose: Break out markup into separate columns per part type (OEM, ALT, second-hand, outwork)
--          and add default labour and paint rates, mirroring the ClaimTech assessment estimate pattern.

ALTER TABLE shop_settings
  ADD COLUMN IF NOT EXISTS oem_markup_percentage         DECIMAL(5,2) DEFAULT 25.00,
  ADD COLUMN IF NOT EXISTS alt_markup_percentage         DECIMAL(5,2) DEFAULT 25.00,
  ADD COLUMN IF NOT EXISTS second_hand_markup_percentage DECIMAL(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS outwork_markup_percentage     DECIMAL(5,2) DEFAULT 25.00,
  ADD COLUMN IF NOT EXISTS default_labour_rate           DECIMAL(10,2) DEFAULT 450.00,
  ADD COLUMN IF NOT EXISTS default_paint_rate            DECIMAL(10,2) DEFAULT 350.00;

-- Migrate any existing generic markup value into the OEM column so no data is lost.
UPDATE shop_settings
SET oem_markup_percentage = default_markup_parts
WHERE default_markup_parts IS NOT NULL;
