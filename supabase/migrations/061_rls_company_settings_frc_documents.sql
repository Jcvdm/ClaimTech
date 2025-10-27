-- Enable RLS and create policies for company settings and FRC documents
-- Pattern: Authenticated users can view, admins only can modify

-- ============================================================================
-- COMPANY_SETTINGS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view company settings
CREATE POLICY "Authenticated users can view company_settings"
ON company_settings FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert company settings
CREATE POLICY "Only admins can insert company_settings"
ON company_settings FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Only admins can update company settings
CREATE POLICY "Only admins can update company_settings"
ON company_settings FOR UPDATE
TO authenticated
USING (is_admin());

-- Only admins can delete company settings
CREATE POLICY "Only admins can delete company_settings"
ON company_settings FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- ASSESSMENT_FRC_DOCUMENTS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE assessment_frc_documents ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all FRC documents
CREATE POLICY "Authenticated users can view assessment_frc_documents"
ON assessment_frc_documents FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert FRC documents
CREATE POLICY "Only admins can insert assessment_frc_documents"
ON assessment_frc_documents FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Only admins can update FRC documents
CREATE POLICY "Only admins can update assessment_frc_documents"
ON assessment_frc_documents FOR UPDATE
TO authenticated
USING (is_admin());

-- Only admins can delete FRC documents
CREATE POLICY "Only admins can delete assessment_frc_documents"
ON assessment_frc_documents FOR DELETE
TO authenticated
USING (is_admin());

-- Add comments for documentation
COMMENT ON TABLE company_settings IS 'Company configuration and branding - RLS enabled, admin-only modifications';
COMMENT ON TABLE assessment_frc_documents IS 'Documents attached to FRC records - RLS enabled, admin-only modifications';
