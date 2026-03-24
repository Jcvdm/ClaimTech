-- =============================================================================
-- Migration: Enable RLS on all shop tables and create access policies
-- Purpose: Secure all shop_* tables. Current approach uses simple policies
--          suitable for single-tenant deployment:
--            - Admin users (role = 'admin' in user_profiles): full CRUD access
--            - Other authenticated users: read-only access
--          Policies will be tightened when multi-tenant support is added
--          (linking users to specific shops via shop_id on user_profiles).
-- Created: 2026-03-24
-- =============================================================================

-- ---------------------------------------------------------------------------
-- shop_settings
-- ---------------------------------------------------------------------------
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_settings_admin_full_access"
  ON public.shop_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "shop_settings_authenticated_read"
  ON public.shop_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- shop_customers
-- ---------------------------------------------------------------------------
ALTER TABLE public.shop_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_customers_admin_full_access"
  ON public.shop_customers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "shop_customers_authenticated_read"
  ON public.shop_customers
  FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- shop_customer_vehicles
-- ---------------------------------------------------------------------------
ALTER TABLE public.shop_customer_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_customer_vehicles_admin_full_access"
  ON public.shop_customer_vehicles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "shop_customer_vehicles_authenticated_read"
  ON public.shop_customer_vehicles
  FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- shop_jobs
-- ---------------------------------------------------------------------------
ALTER TABLE public.shop_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_jobs_admin_full_access"
  ON public.shop_jobs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "shop_jobs_authenticated_read"
  ON public.shop_jobs
  FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- shop_estimates
-- ---------------------------------------------------------------------------
ALTER TABLE public.shop_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_estimates_admin_full_access"
  ON public.shop_estimates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "shop_estimates_authenticated_read"
  ON public.shop_estimates
  FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- shop_invoices
-- ---------------------------------------------------------------------------
ALTER TABLE public.shop_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_invoices_admin_full_access"
  ON public.shop_invoices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "shop_invoices_authenticated_read"
  ON public.shop_invoices
  FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- shop_job_photos
-- ---------------------------------------------------------------------------
ALTER TABLE public.shop_job_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_job_photos_admin_full_access"
  ON public.shop_job_photos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "shop_job_photos_authenticated_read"
  ON public.shop_job_photos
  FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- shop_labor_rates
-- ---------------------------------------------------------------------------
ALTER TABLE public.shop_labor_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_labor_rates_admin_full_access"
  ON public.shop_labor_rates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "shop_labor_rates_authenticated_read"
  ON public.shop_labor_rates
  FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- shop_audit_logs
-- ---------------------------------------------------------------------------
ALTER TABLE public.shop_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_audit_logs_admin_full_access"
  ON public.shop_audit_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "shop_audit_logs_authenticated_read"
  ON public.shop_audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- ROLLBACK:
--   (Dropping the tables in migration 001-009 will also drop their policies)
--   No additional rollback steps needed here.
-- =============================================================================
