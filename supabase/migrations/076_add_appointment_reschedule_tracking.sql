-- Migration 076: Add Appointment Reschedule Tracking
-- Created: January 27, 2025
-- Description: Add columns to track appointment rescheduling history

-- Add columns for reschedule tracking
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS rescheduled_from_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reschedule_reason TEXT;

-- Add comments explaining usage
COMMENT ON COLUMN appointments.rescheduled_from_date IS
  'Original appointment date before most recent reschedule (used for history tracking)';

COMMENT ON COLUMN appointments.reschedule_count IS
  'Number of times this appointment has been rescheduled';

COMMENT ON COLUMN appointments.reschedule_reason IS
  'Reason provided for most recent reschedule';
