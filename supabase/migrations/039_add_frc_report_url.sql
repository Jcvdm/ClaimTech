-- Add frc_report_url column to assessment_frc table
-- This stores the URL of the generated FRC PDF report

ALTER TABLE assessment_frc 
ADD COLUMN IF NOT EXISTS frc_report_url TEXT;

COMMENT ON COLUMN assessment_frc.frc_report_url IS 'URL of the generated FRC PDF report in Supabase Storage';

