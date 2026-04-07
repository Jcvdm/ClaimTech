ALTER TABLE shop_jobs
  ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;
