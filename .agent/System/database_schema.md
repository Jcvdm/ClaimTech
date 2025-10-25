# Database Schema

## Overview

The ClaimTech database is built on **PostgreSQL** via **Supabase**. The schema consists of 50+ tables organized around the core workflow: Requests → Inspections → Appointments → Assessments → Estimates → FRC.

All tables have:
- UUID primary keys (`id`)
- `created_at` and `updated_at` timestamps (auto-managed via triggers)
- Row Level Security (RLS) enabled
- Appropriate indexes for performance

---

## Core Entity Tables

### `clients`
Insurance companies or private clients who request assessments.

**Columns:**
- `id` (UUID, PK)
- `name` (TEXT, NOT NULL)
- `type` (TEXT, CHECK: 'insurance' | 'private')
- `contact_name` (TEXT)
- `email` (TEXT)
- `phone` (TEXT)
- `address` (TEXT)
- `city` (TEXT)
- `postal_code` (TEXT)
- `notes` (TEXT)
- `is_active` (BOOLEAN, DEFAULT true)
- `borderline_writeoff_percentage` (DECIMAL, DEFAULT 65.00) - Percentage threshold for borderline write-off
- `total_writeoff_percentage` (DECIMAL, DEFAULT 70.00) - Percentage threshold for total write-off
- `salvage_percentage` (DECIMAL, DEFAULT 28.00) - Percentage for salvage value calculation
- `created_at`, `updated_at`

**Indexes:**
- `idx_clients_type` on `type`
- `idx_clients_active` on `is_active`
- `idx_clients_name` on `name`

---

### `engineers`
Field engineers who perform vehicle assessments.

**Columns:**
- `id` (UUID, PK)
- `name` (TEXT, NOT NULL)
- `email` (TEXT, UNIQUE, NOT NULL)
- `phone` (TEXT)
- `specialization` (TEXT)
- `province` (TEXT) - Operating province
- `is_active` (BOOLEAN, DEFAULT true)
- `company_name` (TEXT) - Company affiliation
- `company_type` (TEXT, CHECK: 'internal' | 'external') - Internal or external engineer
- `auth_user_id` (UUID) - Links to `auth.users` table for authentication and role-based access control
- `created_at`, `updated_at`

**Indexes:**
- `idx_engineers_active` on `is_active`
- `idx_engineers_email` on `email`

**Note:** Engineers can have associated user accounts in `user_profiles` table.

---

### `repairers`
Repair shops that will perform vehicle repairs.

**Columns:**
- `id` (UUID, PK)
- `name` (TEXT, NOT NULL)
- `contact_name` (TEXT)
- `email` (TEXT)
- `phone` (TEXT)
- `address` (TEXT)
- `city` (TEXT)
- `province` (TEXT)
- `postal_code` (TEXT)
- `is_active` (BOOLEAN, DEFAULT true)
- `created_at`, `updated_at`

---

### `requests`
Initial claim or inspection requests from clients.

**Columns:**
- `id` (UUID, PK)
- `request_number` (TEXT, UNIQUE, NOT NULL) - Auto-generated unique identifier
- `client_id` (UUID, FK → clients)
- `type` (TEXT, CHECK: 'insurance' | 'private')
- `claim_number` (TEXT)
- `status` (TEXT, CHECK: 'draft' | 'submitted' | 'in_progress' | 'completed' | 'cancelled')
- `description` (TEXT)

**Incident Details:**
- `date_of_loss` (DATE)
- `insured_value` (DECIMAL)
- `incident_type` (TEXT)
- `incident_description` (TEXT)
- `incident_location` (TEXT)

**Vehicle Information:**
- `vehicle_make`, `vehicle_model`, `vehicle_year` (INTEGER)
- `vehicle_vin`, `vehicle_registration`, `vehicle_color`
- `vehicle_mileage` (INTEGER)
- `vehicle_province` (TEXT) - Province where vehicle is registered

**Owner Details:**
- `owner_name`, `owner_phone`, `owner_email`, `owner_address`

**Third Party Details:**
- `third_party_name`, `third_party_phone`, `third_party_email`
- `third_party_insurance`

**Workflow:**
- `current_step` (TEXT, CHECK: 'request' | 'assessment' | 'quote' | 'approval')
- `assigned_engineer_id` (UUID, FK → engineers)
- `created_at`, `updated_at`

**Indexes:**
- `idx_requests_client` on `client_id`
- `idx_requests_status` on `status`
- `idx_requests_step` on `current_step`
- `idx_requests_engineer` on `assigned_engineer_id`
- `idx_requests_number` on `request_number`

---

### `request_tasks`
Tasks associated with requests for workflow tracking.

**Columns:**
- `id` (UUID, PK)
- `request_id` (UUID, FK → requests, ON DELETE CASCADE)
- `step` (TEXT, CHECK: 'request' | 'assessment' | 'quote' | 'approval')
- `title` (TEXT, NOT NULL)
- `description` (TEXT)
- `status` (TEXT, CHECK: 'pending' | 'in_progress' | 'completed' | 'blocked')
- `assigned_to` (UUID)
- `due_date` (DATE)
- `completed_at` (TIMESTAMPTZ)
- `created_at`, `updated_at`

---

### `inspections`
Inspection records created from requests.

**Columns:**
- `id` (UUID, PK)
- `inspection_number` (TEXT, UNIQUE, NOT NULL)
- `request_id` (UUID, FK → requests, NOT NULL)
- `client_id` (UUID, FK → clients, NOT NULL)
- `type` (TEXT, CHECK: 'insurance' | 'private')
- `claim_number` (TEXT)
- `request_number` (TEXT, NOT NULL)
- `status` (TEXT, CHECK: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled', DEFAULT 'pending')

**Vehicle Information (duplicated from request for quick access):**
- `vehicle_make`, `vehicle_model`, `vehicle_year` (INTEGER)
- `vehicle_vin`, `vehicle_registration`, `vehicle_color`
- `vehicle_mileage` (INTEGER)
- `vehicle_province` (TEXT)

**Scheduling:**
- `scheduled_date` (TIMESTAMPTZ)
- `inspection_location` (TEXT)
- `assigned_engineer_id` (UUID, FK → engineers)

**Acceptance:**
- `accepted_by` (UUID) - Engineer who accepted the inspection
- `accepted_at` (TIMESTAMPTZ, DEFAULT now())

**Notes:**
- `notes` (TEXT)

**Timestamps:**
- `created_at`, `updated_at`

---

### `appointments`
Scheduled appointments for inspections - supports both in-person and digital assessments.

**Columns:**
- `id` (UUID, PK)
- `appointment_number` (TEXT, UNIQUE, NOT NULL)
- `inspection_id` (UUID, FK → inspections, NOT NULL)
- `request_id` (UUID, FK → requests, NOT NULL)
- `client_id` (UUID, FK → clients, NOT NULL)
- `engineer_id` (UUID, FK → engineers)

**Appointment Type:**
- `appointment_type` (TEXT, CHECK: 'in_person' | 'digital') - Physical inspection or remote assessment
- `duration_minutes` (INTEGER, DEFAULT 60) - Expected duration in minutes

**Date & Time:**
- `appointment_date` (TIMESTAMPTZ) - Date and time of the appointment
- `appointment_time` (TIME)

**Location (for in-person appointments):**
- `location_address` (TEXT)
- `location_city` (TEXT)
- `location_province` (TEXT)
- `location_notes` (TEXT)

**Status:**
- `status` (TEXT, CHECK: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled', DEFAULT 'scheduled')

**Vehicle Information (quick reference):**
- `vehicle_make`, `vehicle_model`, `vehicle_year` (INTEGER)
- `vehicle_registration` (TEXT)

**Notes & Instructions:**
- `notes` (TEXT)
- `special_instructions` (TEXT)

**Audit:**
- `created_by` (TEXT)
- `created_at`, `updated_at`

**Completion & Cancellation:**
- `completed_at` (TIMESTAMPTZ)
- `cancelled_at` (TIMESTAMPTZ)
- `cancellation_reason` (TEXT)

---

## Assessment Tables

### `assessments`
Main assessment records for vehicle inspections.

**Columns:**
- `id` (UUID, PK)
- `assessment_number` (TEXT, UNIQUE, NOT NULL)
- `appointment_id` (UUID, FK → appointments, NOT NULL)
- `inspection_id` (UUID, FK → inspections, NOT NULL)
- `request_id` (UUID, FK → requests, NOT NULL)
- `status` (TEXT, CHECK: 'in_progress' | 'completed' | 'submitted' | 'archived' | 'cancelled')

**Progress Tracking:**
- `current_tab` (TEXT, DEFAULT 'identification')
- `tabs_completed` (JSONB, DEFAULT '[]') - Array of completed tab names

**Timestamps:**
- `started_at`, `completed_at`, `submitted_at`, `cancelled_at`
- `created_at`, `updated_at`

**Document Generation:**
- `report_pdf_url`, `report_pdf_path`
- `estimate_pdf_url`, `estimate_pdf_path`
- `photos_pdf_url`, `photos_pdf_path`
- `photos_zip_url`, `photos_zip_path`
- `documents_generated_at` (TIMESTAMPTZ)
- `report_number` (TEXT)
- `assessor_name`, `assessor_contact`, `assessor_email`

**Estimate Finalization (rates frozen for FRC consistency):**
- `estimate_finalized_at` (TIMESTAMPTZ)
- `finalized_labour_rate` (DECIMAL) - Labour rate (per hour) frozen at finalization
- `finalized_paint_rate` (DECIMAL) - Paint rate (per panel) frozen at finalization
- `finalized_oem_markup` (DECIMAL) - OEM parts markup percentage frozen at finalization
- `finalized_alt_markup` (DECIMAL) - Alternative parts markup percentage frozen at finalization
- `finalized_second_hand_markup` (DECIMAL) - Second-hand parts markup percentage frozen at finalization
- `finalized_outwork_markup` (DECIMAL) - Outwork markup percentage frozen at finalization

**Cancellation:**
- `cancelled_at` (TIMESTAMPTZ)

**Indexes:**
- `idx_assessments_appointment` on `appointment_id`
- `idx_assessments_inspection` on `inspection_id`
- `idx_assessments_request` on `request_id`
- `idx_assessments_status` on `status`

---

### `assessment_vehicle_identification`
Vehicle identification details and photos (1:1 with assessments).

**Columns:**
- `id` (UUID, PK)
- `assessment_id` (UUID, FK → assessments, UNIQUE, NOT NULL)

**Vehicle Details:**
- `registration_number`, `vin_number`, `engine_number`
- `license_disc_expiry` (DATE)
- `make`, `model`, `year` (INTEGER)
- `color`, `mileage` (INTEGER)
- `transmission` (TEXT, CHECK: 'automatic' | 'manual')

**Photos:**
- `registration_photo_url`, `vin_photo_url`
- `engine_number_photo_url`, `license_disc_photo_url`
- `driver_license_photo_url`
- `driver_license_number`

---

### `assessment_360_exterior`
360-degree exterior photos and condition (1:1 with assessments).

**Columns:**
- `id` (UUID, PK)
- `assessment_id` (UUID, FK → assessments, UNIQUE, NOT NULL)

**Condition:**
- `overall_condition` (TEXT, CHECK: 'excellent' | 'very_good' | 'good' | 'fair' | 'poor' | 'very_poor')
- `vehicle_color` (TEXT)

**Standard 360° Photos:**
- `front_photo_url`, `front_left_photo_url`, `left_photo_url`
- `rear_left_photo_url`, `rear_photo_url`, `rear_right_photo_url`
- `right_photo_url`, `front_right_photo_url`

**Additional Photos:**
- `additional_photos` (JSONB, DEFAULT '[]') - Array of photo URLs

---

### `assessment_tyres`
Individual tyre inspection records (1:N with assessments).

**Columns:**
- `id` (UUID, PK)
- `assessment_id` (UUID, FK → assessments, NOT NULL)
- `position` (TEXT, NOT NULL) - e.g., 'front_left', 'front_right', 'rear_left', 'rear_right'
- `position_label` (TEXT)

**Tyre Details:**
- `tyre_make`, `tyre_size`, `load_index`, `speed_rating`
- `tread_depth_mm` (DECIMAL)
- `condition` (TEXT, CHECK: 'excellent' | 'good' | 'fair' | 'poor' | 'replace')

**Documentation (three photos per tyre):**
- `face_photo_url` (TEXT) - Photo of tyre face
- `tread_photo_url` (TEXT) - Photo of tyre tread
- `measurement_photo_url` (TEXT) - Photo of tread depth measurement
- `notes` (TEXT)

**Index:** `idx_assessment_tyres_assessment` on `assessment_id`

---

### `assessment_interior_mechanical`
Interior condition and mechanical systems check (1:1 with assessments).

**Columns:**
- `id` (UUID, PK)
- `assessment_id` (UUID, FK → assessments, UNIQUE, NOT NULL)

**Photos:**
- `engine_bay_photo_url`, `battery_photo_url`
- `oil_level_photo_url`, `coolant_photo_url`
- `mileage_photo_url`
- `interior_front_photo_url`, `interior_rear_photo_url`
- `dashboard_photo_url`
- `gear_lever_photo_url` (TEXT) - Photo of the gear lever/shifter

**Readings:**
- `mileage_reading` (INTEGER)

**Vehicle Status:**
- `vehicle_has_power` (BOOLEAN) - Whether the vehicle has electrical power (battery connected and working)

**Transmission:**
- `transmission_type` (TEXT, CHECK: 'automatic' | 'manual') - Type of transmission

**Condition:**
- `interior_condition` (TEXT, CHECK: 'excellent' | 'very_good' | 'good' | 'fair' | 'poor' | 'very_poor')

**Systems Check:**
- `srs_system` (TEXT, CHECK: 'operational' | 'warning_light' | 'not_working' | 'deployed') - SRS (airbag) system status
- `steering`, `brakes`, `handbrake` (TEXT, CHECK: 'working' | 'not_working' | 'issues')

**Notes:**
- `mechanical_notes`, `interior_notes`

---

### `assessment_accessories`
Vehicle accessories and aftermarket additions (1:N with assessments).

**Columns:**
- `id` (UUID, PK)
- `assessment_id` (UUID, FK → assessments, NOT NULL)
- `accessory_type` (TEXT, NOT NULL) - e.g., 'mags', 'tow_bar', 'canopy'
- `custom_name` (TEXT) - For 'custom' accessory type
- `condition` (TEXT, CHECK: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged')
- `notes`, `photo_url`

**Index:** `idx_assessment_accessories_assessment` on `assessment_id`

---

### `assessment_damage`
Damage identification and repair assessment record (1:1 with assessments).

**Columns:**
- `id` (UUID, PK)
- `assessment_id` (UUID, FK → assessments, UNIQUE, NOT NULL)

**Damage Matching:**
- `matches_description` (BOOLEAN)
- `mismatch_notes` (TEXT)

**Classification:**
- `damage_area` (TEXT, CHECK: 'structural' | 'non_structural')
- `damage_type` (TEXT) - e.g., 'collision', 'hail', 'fire'
- `severity` (TEXT, CHECK: 'minor' | 'moderate' | 'severe' | 'total_loss')

**Repair Details:**
- `affected_panels` (JSONB, DEFAULT '[]') - Array of panel names
- `repair_method` (TEXT)
- `estimated_repair_duration_days` (DECIMAL) - Estimated repair duration in days
- `location_description` (TEXT)

**Documentation:**
- `photos` (JSONB, DEFAULT '[]') - Array of photo URLs
- `damage_description`, `repair_notes`

**Index:** `idx_assessment_damage_assessment` on `assessment_id`

**Note:** Only one damage record allowed per assessment due to UNIQUE constraint on assessment_id

---

## Estimate Tables

### `assessment_estimates`
Cost estimates for vehicle repairs (1:1 with assessments using JSONB for line items).

**Architecture:** Uses document-oriented JSONB storage for line items rather than relational rows.

**Columns:**
- `id` (UUID, PK)
- `assessment_id` (UUID, FK → assessments, UNIQUE, NOT NULL) - One estimate per assessment

**Line Items (JSONB Array):**
- `line_items` (JSONB, DEFAULT '[]') - Array of estimate line item objects

**Line Item Structure (in JSONB):**
Each object in the `line_items` array contains:
- `id` (TEXT) - Unique identifier for the line item
- `process_type` (TEXT) - N (New), R (Repair), P (Paint), B (Blend), A (Align), O (Outwork)
- `part_type` (TEXT) - OEM (Original), ALT (Alternative), 2ND (Second Hand) - only for process_type=N
- `description` (TEXT) - Item description
- `part_price_nett` (DECIMAL) - Nett price without markup (user input for N only)
- `part_price` (DECIMAL) - Selling price with markup applied (calculated for N only)
- `strip_assemble_hours` (DECIMAL) - Hours for strip & assemble (user input for N,R,P,B)
- `strip_assemble` (DECIMAL) - S&A cost = hours × labour_rate (calculated for N,R,P,B)
- `labour_hours` (DECIMAL) - Hours of labour (N, R, A)
- `labour_cost` (DECIMAL) - Calculated labour cost
- `paint_panels` (INTEGER) - Number of panels to paint (N, R, P, B)
- `paint_cost` (DECIMAL) - Calculated paint cost
- `outwork_charge_nett` (DECIMAL) - Nett outwork cost (user input for O only)
- `outwork_charge` (DECIMAL) - Selling price with markup (calculated for O only)
- `total` (DECIMAL) - Total cost for line item

**Betterment Fields (in JSONB line items):**
- `betterment_part_percentage` (DECIMAL) - Percentage deduction on part_price_nett (0-100)
- `betterment_sa_percentage` (DECIMAL) - Percentage deduction on strip_assemble (0-100)
- `betterment_labour_percentage` (DECIMAL) - Percentage deduction on labour_cost (0-100)
- `betterment_paint_percentage` (DECIMAL) - Percentage deduction on paint_cost (0-100)
- `betterment_outwork_percentage` (DECIMAL) - Percentage deduction on outwork_charge_nett (0-100)
- `betterment_total` (DECIMAL) - Total betterment amount deducted from line item (calculated)

**Totals:**
- `subtotal` (DECIMAL, DEFAULT 0.00) - Sum of all line item totals before VAT
- `vat_percentage` (DECIMAL, DEFAULT 15.00) - VAT percentage applied
- `vat_amount` (DECIMAL, DEFAULT 0.00) - Calculated VAT amount
- `total` (DECIMAL, DEFAULT 0.00) - Final total including VAT

**Rates & Markups (frozen at estimate creation):**
- `labour_rate` (DECIMAL, DEFAULT 500.00) - Labour cost per hour (e.g., R500/hour)
- `paint_rate` (DECIMAL, DEFAULT 2000.00) - Paint cost per panel (e.g., R2000/panel)
- `oem_markup_percentage` (DECIMAL, DEFAULT 25.00) - OEM parts markup
- `alt_markup_percentage` (DECIMAL, DEFAULT 25.00) - Alternative parts markup
- `second_hand_markup_percentage` (DECIMAL, DEFAULT 25.00) - Second-hand parts markup
- `outwork_markup_percentage` (DECIMAL, DEFAULT 25.00) - Outwork markup

**Additional Fields:**
- `repairer_id` (UUID, FK → repairers) - Assigned repairer/workshop
- `assessment_result` (ENUM: assessment_result_type) - Final outcome: 'repair', 'code_2', 'code_3', 'total_loss'
- `notes` (TEXT)
- `currency` (TEXT, DEFAULT 'ZAR') - Currency code (South African Rand)
- `created_at`, `updated_at`

**Index:** `idx_assessment_estimates_assessment` on `assessment_id`

**Process Types:**
- **N** (New): New part installation
- **R** (Repair): Repair existing part
- **P** (Paint): Paint work only
- **B** (Blend): Blend paint
- **A** (Align): Alignment work
- **O** (Outwork): Subcontracted work

**Assessment Result Types:**
- **repair**: Economic to repair
- **code_2**: Repairable write-off
- **code_3**: Non-repairable write-off
- **total_loss**: Complete loss

**Note:** RLS is currently DISABLED on this table (security issue - should be enabled)

---

### `estimate_photos`
Photos attached to estimates (1:N with assessment_estimates).

**Columns:**
- `id` (UUID, PK, DEFAULT gen_random_uuid())
- `estimate_id` (UUID, FK → assessment_estimates, ON DELETE CASCADE)
- `photo_url` (TEXT, NOT NULL)
- `photo_path` (TEXT, NOT NULL)
- `label` (TEXT) - Optional label/description for the photo
- `display_order` (INTEGER, DEFAULT 0) - Order in which photos should be displayed
- `created_at`, `updated_at`

---

### `pre_incident_estimates`
Pre-existing damage estimates (1:1 with assessments using JSONB for line items).

**Architecture:** Same document-oriented JSONB structure as `assessment_estimates`.

**Columns:**
- `id` (UUID, PK)
- `assessment_id` (UUID, FK → assessments, UNIQUE, NOT NULL) - One pre-incident estimate per assessment

**Rates & Markups:**
- `labour_rate` (DECIMAL, DEFAULT 500.00)
- `paint_rate` (DECIMAL, DEFAULT 2000.00)
- `oem_markup_percentage` (DECIMAL, DEFAULT 25.00)
- `alt_markup_percentage` (DECIMAL, DEFAULT 25.00)
- `second_hand_markup_percentage` (DECIMAL, DEFAULT 25.00)
- `outwork_markup_percentage` (DECIMAL, DEFAULT 25.00)

**Line Items (JSONB Array):**
- `line_items` (JSONB, DEFAULT '[]') - Array of pre-incident estimate line items
  - Same structure as `assessment_estimates.line_items` including betterment fields

**Totals:**
- `subtotal` (DECIMAL, DEFAULT 0.00) - Sum of all line item totals before VAT
- `vat_percentage` (DECIMAL, DEFAULT 15.00)
- `vat_amount` (DECIMAL, DEFAULT 0.00)
- `total` (DECIMAL, DEFAULT 0.00)

**Additional Fields:**
- `notes` (TEXT)
- `currency` (TEXT, DEFAULT 'ZAR')
- `created_at`, `updated_at`

**Purpose:** Used to separate pre-incident damage from current claim damage.

**Note:** RLS is currently DISABLED on this table (security issue - should be enabled)

---

### `pre_incident_estimate_photos`
Photos for pre-incident damage estimates (1:N with pre_incident_estimates).

**Columns:**
- `id` (UUID, PK)
- `estimate_id` (UUID, FK → pre_incident_estimates, NOT NULL) - Reference to pre_incident_estimates table
- `photo_url` (TEXT, NOT NULL) - Public URL of the photo
- `photo_path` (TEXT, NOT NULL) - Storage path of the photo
- `label` (TEXT) - Optional label/description for the photo
- `display_order` (INTEGER, DEFAULT 0) - Order in which photos should be displayed
- `created_at`, `updated_at`

**Note:** RLS is currently DISABLED on this table (security issue - should be enabled)

---

### `assessment_vehicle_values`
Comprehensive vehicle valuation from third-party valuators with write-off calculations (1:1 with assessments).

**Columns:**
- `id` (UUID, PK)
- `assessment_id` (UUID, FK → assessments, UNIQUE, NOT NULL)

**Valuation Source:**
- `sourced_from` (TEXT) - Name of valuation source (e.g., TransUnion, Lightstone Auto)
- `sourced_code` (TEXT) - Reference code from valuation report
- `sourced_date` (DATE) - Date when valuation was performed

**Base Values (from valuation report):**
- `trade_value` (DECIMAL) - Trade-in value
- `market_value` (DECIMAL) - Market value
- `retail_value` (DECIMAL) - Retail value

**New List Price & Depreciation:**
- `new_list_price` (DECIMAL)
- `depreciation_percentage` (DECIMAL)

**Valuation Adjustments:**
- `valuation_adjustment` (DECIMAL) - Fixed amount adjustment from valuator (e.g., R82,413.00)
- `valuation_adjustment_percentage` (DECIMAL) - Percentage adjustment from valuator (e.g., 9%)
- `condition_adjustment_value` (DECIMAL) - Condition adjustment amount (not percentage). System calculates percentage as (value / base_value) × 100

**Adjusted Values (after adjustments):**
- `trade_adjusted_value` (DECIMAL)
- `market_adjusted_value` (DECIMAL)
- `retail_adjusted_value` (DECIMAL)

**Optional Extras (JSONB):**
- `extras` (JSONB, DEFAULT '[]') - Array of optional extras: `[{id, description, trade_value, market_value, retail_value}]`
- `trade_extras_total` (DECIMAL, DEFAULT 0.00)
- `market_extras_total` (DECIMAL, DEFAULT 0.00)
- `retail_extras_total` (DECIMAL, DEFAULT 0.00)

**Total Adjusted Values (with extras):**
- `trade_total_adjusted_value` (DECIMAL)
- `market_total_adjusted_value` (DECIMAL)
- `retail_total_adjusted_value` (DECIMAL)

**Write-off Calculations (using client percentages):**
- `borderline_writeoff_trade` (DECIMAL) - Calculated borderline write-off value for trade
- `borderline_writeoff_market` (DECIMAL)
- `borderline_writeoff_retail` (DECIMAL)
- `total_writeoff_trade` (DECIMAL) - Calculated total write-off value for trade
- `total_writeoff_market` (DECIMAL)
- `total_writeoff_retail` (DECIMAL)
- `salvage_trade` (DECIMAL) - Calculated salvage value for trade
- `salvage_market` (DECIMAL)
- `salvage_retail` (DECIMAL)

**Valuation Document:**
- `valuation_pdf_url` (TEXT) - Public URL of uploaded valuation PDF
- `valuation_pdf_path` (TEXT) - Storage path of uploaded valuation PDF

**Warranty Information:**
- `warranty_status` (TEXT, CHECK: 'active' | 'expired' | 'void' | 'transferred' | 'unknown') - Current warranty status
- `warranty_period_years` (INTEGER) - Warranty period in years (e.g., 3, 5, 7)
- `warranty_start_date` (DATE) - Warranty start date (From)
- `warranty_end_date` (DATE) - Warranty end date (To)
- `warranty_expiry_mileage` (TEXT) - Warranty expiry mileage (e.g., "unlimited", "100000", "150000")

**Service History:**
- `service_history_status` (TEXT, CHECK: 'checked' | 'not_checked' | 'incomplete' | 'up_to_date' | 'overdue' | 'unknown')

**Notes:**
- `warranty_notes` (TEXT) - Additional warranty and service information
- `remarks` (TEXT)

**Timestamps:**
- `created_at`, `updated_at`

**Note:** RLS is currently DISABLED on this table (security issue - should be enabled)

---

### `assessment_additionals`
Additional work items discovered after initial assessment (1:1 with assessments using JSONB for line items).

**Columns:**
- `id` (UUID, PK)
- `assessment_id` (UUID, FK → assessments, UNIQUE, NOT NULL) - One additionals record per assessment

**Repairer:**
- `repairer_id` (UUID, FK → repairers)

**Rates & Markups:**
- `labour_rate` (DECIMAL, DEFAULT 0)
- `paint_rate` (DECIMAL, DEFAULT 0)
- `vat_percentage` (DECIMAL, DEFAULT 15)
- `oem_markup_percentage` (DECIMAL, DEFAULT 25)
- `alt_markup_percentage` (DECIMAL, DEFAULT 25)
- `second_hand_markup_percentage` (DECIMAL, DEFAULT 25)
- `outwork_markup_percentage` (DECIMAL, DEFAULT 25)

**Line Items (JSONB Array):**
- `line_items` (JSONB, DEFAULT '[]') - Array of additional work line items
  - Same structure as `assessment_estimates.line_items`

**Totals (Approved Amounts):**
- `subtotal_approved` (DECIMAL, DEFAULT 0)
- `vat_amount_approved` (DECIMAL, DEFAULT 0)
- `total_approved` (DECIMAL, DEFAULT 0)

**Deprecated Field:**
- `excluded_line_item_ids` (JSONB, DEFAULT '[]') - **DEPRECATED:** Use `action='removed'` line items instead. Kept for backward compatibility. Should always be empty array after migration 037.

**Timestamps:**
- `created_at`, `updated_at`

**Note:** RLS is currently DISABLED on this table (security issue - should be enabled)

---

### `assessment_additionals_photos`
Photos for additional work items (1:N with assessment_additionals).

**Columns:**
- `id` (UUID, PK)
- `additionals_id` (UUID, FK → assessment_additionals, NOT NULL)
- `photo_url` (TEXT, NOT NULL)
- `photo_path` (TEXT, NOT NULL)
- `label` (TEXT) - Optional label/description
- `display_order` (INTEGER, DEFAULT 0)
- `created_at`, `updated_at`

**Note:** RLS is currently DISABLED on this table (security issue - should be enabled)

---

## Final Repair Costing (FRC) Tables

### `assessment_frc`
Final Repair Costing records tracking quoted vs. actual costs (1:1 with assessments, but not UNIQUE on assessment_id).

**Columns:**
- `id` (UUID, PK, DEFAULT gen_random_uuid())
- `assessment_id` (UUID, FK → assessments, NOT NULL)

**Status:**
- `status` (TEXT, CHECK: 'not_started' | 'in_progress' | 'completed', DEFAULT 'not_started')

**Line Items (JSONB Array):**
- `line_items` (JSONB, DEFAULT '[]') - Array of FRC line items with quoted/actual totals and decisions

**VAT:**
- `vat_percentage` (DECIMAL, DEFAULT 15.00)

**Quoted Totals (from initial estimate):**
- `quoted_parts_total` (DECIMAL, DEFAULT 0)
- `quoted_labour_total` (DECIMAL, DEFAULT 0)
- `quoted_paint_total` (DECIMAL, DEFAULT 0)
- `quoted_outwork_total` (DECIMAL, DEFAULT 0)
- `quoted_subtotal` (DECIMAL, DEFAULT 0)
- `quoted_vat_amount` (DECIMAL, DEFAULT 0)
- `quoted_total` (DECIMAL, DEFAULT 0)

**Quoted Estimate Breakdown:**
- `quoted_estimate_parts_nett` (DECIMAL, DEFAULT 0.00)
- `quoted_estimate_labour` (DECIMAL, DEFAULT 0.00)
- `quoted_estimate_paint` (DECIMAL, DEFAULT 0.00)
- `quoted_estimate_outwork_nett` (DECIMAL, DEFAULT 0.00)
- `quoted_estimate_markup` (DECIMAL, DEFAULT 0.00)
- `quoted_estimate_subtotal` (DECIMAL, DEFAULT 0.00)

**Quoted Additionals Breakdown:**
- `quoted_additionals_parts_nett` (DECIMAL, DEFAULT 0.00)
- `quoted_additionals_labour` (DECIMAL, DEFAULT 0.00)
- `quoted_additionals_paint` (DECIMAL, DEFAULT 0.00)
- `quoted_additionals_outwork_nett` (DECIMAL, DEFAULT 0.00)
- `quoted_additionals_markup` (DECIMAL, DEFAULT 0.00)
- `quoted_additionals_subtotal` (DECIMAL, DEFAULT 0.00)

**Actual Totals (final costs incurred):**
- `actual_parts_total` (DECIMAL, DEFAULT 0)
- `actual_labour_total` (DECIMAL, DEFAULT 0)
- `actual_paint_total` (DECIMAL, DEFAULT 0)
- `actual_outwork_total` (DECIMAL, DEFAULT 0)
- `actual_subtotal` (DECIMAL, DEFAULT 0)
- `actual_vat_amount` (DECIMAL, DEFAULT 0)
- `actual_total` (DECIMAL, DEFAULT 0)

**Actual Estimate Breakdown:**
- `actual_estimate_parts_nett` (DECIMAL, DEFAULT 0.00)
- `actual_estimate_labour` (DECIMAL, DEFAULT 0.00)
- `actual_estimate_paint` (DECIMAL, DEFAULT 0.00)
- `actual_estimate_outwork_nett` (DECIMAL, DEFAULT 0.00)
- `actual_estimate_markup` (DECIMAL, DEFAULT 0.00)
- `actual_estimate_subtotal` (DECIMAL, DEFAULT 0.00)

**Actual Additionals Breakdown:**
- `actual_additionals_parts_nett` (DECIMAL, DEFAULT 0.00)
- `actual_additionals_labour` (DECIMAL, DEFAULT 0.00)
- `actual_additionals_paint` (DECIMAL, DEFAULT 0.00)
- `actual_additionals_outwork_nett` (DECIMAL, DEFAULT 0.00)
- `actual_additionals_markup` (DECIMAL, DEFAULT 0.00)
- `actual_additionals_subtotal` (DECIMAL, DEFAULT 0.00)

**Sign-off:**
- `signed_off_by_name` (TEXT) - Name of person signing off
- `signed_off_by_email` (TEXT) - Email of person signing off
- `signed_off_by_role` (TEXT) - Role of person signing off
- `signed_off_at` (TIMESTAMPTZ) - When FRC was signed off
- `sign_off_notes` (TEXT) - Notes from sign-off

**Report:**
- `frc_report_url` (TEXT) - URL of the generated FRC PDF report in Supabase Storage

**Timestamps:**
- `started_at` (TIMESTAMPTZ)
- `completed_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())

**Note:** RLS is currently DISABLED on this table (security issue - should be enabled)

---

### `assessment_frc_documents`
Documents (invoices, attachments) attached to FRC records (1:N with assessment_frc).

**Columns:**
- `id` (UUID, PK, DEFAULT gen_random_uuid())
- `frc_id` (UUID, FK → assessment_frc, NOT NULL)
- `document_url` (TEXT, NOT NULL)
- `document_path` (TEXT, NOT NULL)
- `label` (TEXT) - Optional label/description
- `document_type` (TEXT, CHECK: 'invoice' | 'attachment', DEFAULT 'invoice') - Type of document
- `file_size_bytes` (BIGINT) - File size in bytes
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())

**Note:** RLS is currently DISABLED on this table (security issue - should be enabled)

---

## Notes & Audit Tables

### `assessment_notes`
Notes attached to assessments with chat-style editing and categorization (1:N with assessments).

**Columns:**
- `id` (UUID, PK, DEFAULT gen_random_uuid())
- `assessment_id` (UUID, FK → assessments, NOT NULL)

**Note Content:**
- `note_text` (TEXT, NOT NULL) - The note content
- `note_type` (TEXT, CHECK: 'manual' | 'betterment' | 'system', DEFAULT 'manual') - Note category
- `note_title` (TEXT) - Optional title for the note
- `source_tab` (TEXT) - Assessment tab ID where note was created (e.g., "summary", "identification", "360", "interior", "tyres", "damage", "values", "pre-incident", "estimate", "finalize", "additionals", "frc")

**Authorship & Editing:**
- `created_by` (UUID, FK → auth.users) - User who created the note
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `is_edited` (BOOLEAN, DEFAULT false) - Whether note has been edited
- `edited_by` (UUID, FK → auth.users) - User who last edited the note
- `edited_at` (TIMESTAMPTZ) - When the note was last edited
- `updated_at` (TIMESTAMPTZ, DEFAULT now())

**Display:** Notes are displayed as chat-style bubbles in the UI with full edit history tracking.

---

### `audit_logs`
Comprehensive audit trail for all entity changes.

**Columns:**
- `id` (UUID, PK)
- `entity_type` (TEXT, NOT NULL) - e.g., 'request', 'assessment', 'estimate'
- `entity_id` (UUID, NOT NULL) - ID of the affected entity
- `action` (TEXT, NOT NULL) - e.g., 'created', 'updated', 'deleted'
- `changed_fields` (JSONB) - Object containing field changes
- `old_values` (JSONB)
- `new_values` (JSONB)
- `user_id` (UUID) - User who performed the action
- `user_email` (TEXT)
- `ip_address` (TEXT)
- `user_agent` (TEXT)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Indexes:**
- `idx_audit_logs_entity` on `(entity_type, entity_id)`
- `idx_audit_logs_user` on `user_id`
- `idx_audit_logs_created_at` on `created_at`

**Supported Entity Types:**
- `request`, `inspection`, `appointment`, `assessment`
- `estimate`, `pre_incident_estimate`, `vehicle_values`, `frc`

---

## Authentication & User Tables

### `user_profiles`
User accounts extending `auth.users` with application-specific data.

**Columns:**
- `id` (UUID, PK, FK → auth.users ON DELETE CASCADE)
- `email` (TEXT, UNIQUE, NOT NULL)
- `full_name` (TEXT)
- `role` (TEXT, CHECK: 'admin' | 'engineer')
- `province` (TEXT) - For engineers: operating province
- `company` (TEXT) - For engineers: company affiliation
- `is_active` (BOOLEAN, DEFAULT true)
- `created_at`, `updated_at`

**Indexes:**
- `idx_user_profiles_email` on `email`
- `idx_user_profiles_role` on `role`
- `idx_user_profiles_province` on `province`

**RLS Policies:**
- Users can read their own profile
- Admins can read/update/delete all profiles
- Automatic profile creation via trigger on `auth.users` insert

**Functions:**
- `handle_new_user()`: Creates profile on signup (triggered by `auth.users` insert)
- `update_user_profile_updated_at()`: Auto-updates `updated_at` timestamp

---

## Company Settings Table

### `company_settings`
Singleton table for company information used in document generation (single row).

**Columns:**
- `id` (UUID, PK)
- `company_name` (TEXT, DEFAULT 'Claimtech')

**Address:**
- `po_box` (TEXT, DEFAULT 'P.O. Box 12345') - PO Box address
- `city` (TEXT, DEFAULT 'Johannesburg')
- `province` (TEXT, DEFAULT 'Gauteng')
- `postal_code` (TEXT, DEFAULT '2000')

**Contact Information:**
- `phone` (TEXT, DEFAULT '+27 (0) 11 123 4567')
- `fax` (TEXT, DEFAULT '+27 (0) 86 123 4567')
- `email` (TEXT, DEFAULT 'info@claimtech.co.za')
- `website` (TEXT, DEFAULT 'www.claimtech.co.za')

**Branding:**
- `logo_url` (TEXT) - URL to company logo

**Timestamps:**
- `created_at`, `updated_at`

**Note:**
- Typically only one row exists in this table
- Rates and markups are NOT stored here - they are stored per estimate/repairer
- RLS is currently DISABLED on this table (security issue - should be enabled)

---

## Note on Provinces

**The `provinces` reference table does NOT exist in the database.** Province data is stored as TEXT fields directly in tables like `clients`, `engineers`, `repairers`, `requests`, and `inspections`.

---

## Storage Buckets

### `documents`
Stores generated PDFs and other documents.

**Configuration:**
- Public: false (private bucket) ✓
- File size limit: **NULL (not enforced)** ❌
- Allowed MIME types: **NULL (not enforced)** ❌

**RLS Policies:**
- Authenticated users can SELECT/INSERT/UPDATE/DELETE

**Security Issue:** File size limits and MIME type restrictions are configured as NULL, meaning they are not enforced at the bucket level.

**File Organization:**
```
documents/
  assessments/{assessment_id}/
    report_{report_number}.pdf
    estimate_{assessment_number}.pdf
    photos_{assessment_number}.pdf
    photos_{assessment_number}.zip
  frc/{frc_id}/
    frc_report_{frc_number}.pdf
    invoice_{filename}
    completion_certificate_{filename}
```

---

### `SVA Photos`
Stores all assessment photos (identification, exterior, tyres, damage, etc.).

**Configuration:**
- Public: false (private bucket) ✓
- File size limit: **NULL (not enforced)** ❌
- Allowed MIME types: **NULL (not enforced)** ❌

**RLS Policies:**
- Authenticated users can SELECT/INSERT/UPDATE/DELETE

**Security Issue:** File size limits and MIME type restrictions are configured as NULL, meaning they are not enforced at the bucket level.

**File Organization:**
```
SVA Photos/
  assessments/{assessment_id}/
    identification/
      registration_{timestamp}.jpg
      vin_{timestamp}.jpg
      engine_number_{timestamp}.jpg
      license_disc_{timestamp}.jpg
    exterior/
      front_{timestamp}.jpg
      front_left_{timestamp}.jpg
      ...
    tyres/
      front_left_{timestamp}.jpg
      ...
    interior/
      dashboard_{timestamp}.jpg
      ...
    damage/
      {damage_id}_{timestamp}.jpg
      ...
    accessories/
      {accessory_id}_{timestamp}.jpg
      ...
    estimate/
      {estimate_id}_{timestamp}.jpg
      ...
```

---

## Triggers

### Auto-Update `updated_at`
Most tables have a trigger that automatically updates the `updated_at` column:

```sql
CREATE TRIGGER update_{table_name}_updated_at
  BEFORE UPDATE ON {table_name}
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Auto-Create User Profile
When a new user signs up via `auth.users`, a profile is automatically created:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## Row Level Security (RLS) Policies

**Current State:** RLS is PARTIALLY implemented. 18 out of 28 tables (64%) have RLS enabled.

### ❌ Tables with RLS DISABLED (Critical Security Issue)

The following 10 tables have RLS **disabled** and are publicly accessible:

1. `assessment_estimates`
2. `pre_incident_estimates`
3. `pre_incident_estimate_photos`
4. `assessment_vehicle_values`
5. `repairers` (has policies defined but RLS not enabled!)
6. `company_settings`
7. `assessment_additionals`
8. `assessment_additionals_photos`
9. `assessment_frc`
10. `assessment_frc_documents`

**Action Required:** Enable RLS on these tables immediately for production security.

### ✅ Tables with RLS Enabled (18 tables)

RLS is enabled on:
- `clients`, `requests`, `request_tasks`, `engineers`, `inspections`
- `audit_logs`, `appointments`, `assessments`
- `assessment_vehicle_identification`, `assessment_360_exterior`
- `assessment_accessories`, `assessment_interior_mechanical`
- `assessment_tyres`, `assessment_damage`, `assessment_notes`
- `estimate_photos`, `user_profiles`

**Current Policies:** Most tables use permissive policies for development:

```sql
CREATE POLICY "Allow all operations on {table_name} for now"
  ON {table_name}
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

**Production-ready policies** (implemented for `user_profiles` and `repairers`):
- Users can read their own profile
- Admins can read/update/delete all profiles
- Role-based access for engineers vs. admins

**Future:** Tighten RLS policies for all tables to enforce:
- Engineers can only access their assigned assessments
- Admins have full access
- Clients can only access their own requests/assessments

---

## Indexes Summary

### Critical Indexes
- All foreign keys are indexed
- `request_number`, `inspection_number`, `appointment_number`, `assessment_number` are indexed
- `status` fields are indexed for filtering
- `created_at` is indexed on `audit_logs` for time-based queries

### Compound Indexes
- `(entity_type, entity_id)` on `audit_logs`
- Unique constraints act as indexes:
  - `(assessment_id, damage_type, location_description)` on `assessment_damage`

---

## Data Flow Example

### Complete Assessment Workflow

1. **Request Created**
   - Insert into `requests` table
   - `request_number` auto-generated
   - Status: 'draft' → 'submitted'

2. **Inspection Created**
   - Insert into `inspections` table
   - Linked to `requests.id`
   - `inspection_number` auto-generated
   - Engineer assigned

3. **Appointment Scheduled**
   - Insert into `appointments` table
   - Linked to `inspections.id` and `requests.id`
   - `appointment_number` auto-generated
   - Date/time set

4. **Assessment Started**
   - Insert into `assessments` table
   - Linked to `appointment_id`, `inspection_id`, `request_id`
   - `assessment_number` auto-generated
   - Status: 'in_progress'

5. **Assessment Data Collection**
   - Insert/update `assessment_vehicle_identification`
   - Insert/update `assessment_360_exterior`
   - Insert multiple `assessment_tyres` records
   - Insert/update `assessment_interior_mechanical`
   - Insert multiple `assessment_accessories` records
   - Insert multiple `assessment_damage` records
   - Insert multiple `assessment_estimates` records
   - Upload photos to `SVA Photos` bucket

6. **Assessment Finalized**
   - Update `assessments.status` to 'submitted'
   - Set `submitted_at` timestamp
   - Set `estimate_finalized_at` timestamp

7. **Documents Generated**
   - Generate report PDF → upload to `documents` bucket
   - Generate estimate PDF → upload to `documents` bucket
   - Generate photos PDF/ZIP → upload to `documents` bucket
   - Update `assessments` with PDF URLs
   - Set `documents_generated_at` timestamp

8. **FRC (Final Repair Costing)**
   - Insert into `assessment_frc` table
   - Upload completion photos to `SVA Photos`
   - Upload invoices/documents to `documents` bucket
   - Insert into `frc_documents` table
   - Update status: 'in_progress' → 'submitted' → 'approved'

9. **Assessment Archived**
   - Update `assessments.status` to 'archived'
   - Assessment complete

---

## Related Documentation
- Project Architecture: `project_architecture.md`
- Adding Migrations SOP: `../SOP/adding_migration.md`
