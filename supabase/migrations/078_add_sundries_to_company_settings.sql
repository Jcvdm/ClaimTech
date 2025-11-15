ALTER TABLE company_settings 
  ADD COLUMN IF NOT EXISTS sundries_percentage DECIMAL(5,2) DEFAULT 1.00 NOT NULL;

UPDATE company_settings
SET sundries_percentage = 1.00
WHERE sundries_percentage IS NULL;

COMMENT ON COLUMN company_settings.sundries_percentage IS 'Default sundries percentage applied to estimates when not explicitly set';