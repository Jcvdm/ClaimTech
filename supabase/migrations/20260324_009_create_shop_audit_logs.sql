-- =============================================================================
-- Migration: Create shop_audit_logs table
-- Purpose: Audit trail for shop module operations. Separate from the
--          assessment system's audit_logs table. Tracks who changed what
--          and when for compliance and debugging.
-- Entity types: job, estimate, invoice, customer, settings, labor_rate
-- Created: 2026-03-24
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.shop_audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was changed
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  action          TEXT NOT NULL,   -- e.g. 'created', 'updated', 'deleted', 'status_changed'

  -- Change details (before/after values as JSONB)
  changes         JSONB,

  -- Who made the change
  performed_by    UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,

  -- Request context (optional - for server-side logging)
  ip_address      TEXT,
  user_agent      TEXT,

  -- Timestamp (no updated_at - audit logs are immutable)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_shop_audit_logs_entity
  ON public.shop_audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_shop_audit_logs_performed_by
  ON public.shop_audit_logs(performed_by)
  WHERE performed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shop_audit_logs_created_at
  ON public.shop_audit_logs(created_at DESC);

-- =============================================================================
-- ROLLBACK: DROP TABLE IF EXISTS public.shop_audit_logs CASCADE;
-- =============================================================================
