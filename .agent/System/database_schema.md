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
- `writeoff_percentage` (DECIMAL) - Threshold for write-off determination
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
- `auth_user_id` (UUID) - Links to `auth.users` table
- `created_at`

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
- `status` (TEXT, CHECK: 'scheduled' | 'in_progress' | 'completed' | 'cancelled')
- `inspection_type` (TEXT)
- `scheduled_date` (DATE)
- `assigned_engineer_id` (UUID, FK → engineers)
- `notes` (TEXT)
- `created_at`, `updated_at`

---

### `appointments`
Scheduled appointments for inspections.

**Columns:**
- `id` (UUID, PK)
- `appointment_number` (TEXT, UNIQUE, NOT NULL)
- `inspection_id` (UUID, FK → inspections, NOT NULL)
- `request_id` (UUID, FK → requests, NOT NULL)
- `client_id` (UUID, FK → clients, NOT NULL)
- `assigned_engineer_id` (UUID, FK → engineers)
- `appointment_date` (DATE)
- `appointment_time` (TIME)
- `appointment_datetime` (TIMESTAMPTZ)
- `status` (TEXT, CHECK: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled')
- `location` (TEXT)
- `contact_name`, `contact_phone`, `contact_email`
- `notes` (TEXT)
- `created_at`, `updated_at`

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

**Estimate Finalization:**
- `estimate_finalized_at` (TIMESTAMPTZ)
- `estimate_finalized_by` (TEXT)

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

**Documentation:**
- `photo_url`, `notes`

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

**Readings:**
- `mileage_reading` (INTEGER)

**Condition:**
- `interior_condition` (TEXT, CHECK: 'excellent' | 'very_good' | 'good' | 'fair' | 'poor' | 'very_poor')

**Systems Check:**
- `srs_system` (TEXT, CHECK: 'operational' | 'warning_light' | 'not_working' | 'deployed')
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
Damage identification and repair assessment records (1:N with assessments).

**Columns:**
- `id` (UUID, PK)
- `assessment_id` (UUID, FK → assessments, NOT NULL)

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
- `repair_duration_hours` (DECIMAL)
- `location_description` (TEXT)

**Documentation:**
- `photos` (JSONB, DEFAULT '[]') - Array of photo URLs
- `damage_description`, `repair_notes`

**Index:** `idx_assessment_damage_assessment` on `assessment_id`

**Unique Constraint:** `(assessment_id, damage_type, location_description)` to prevent duplicates

---

## Estimate Tables

### `assessment_estimates`
Estimate line items for repair costs (1:N with assessments).

**Columns:**
- `id` (UUID, PK)
- `assessment_id` (UUID, FK → assessments, NOT NULL)
- `line_number` (INTEGER) - Display order
- `process_type` (TEXT) - N, R, P, B, A, O (see Process Types below)
- `part_type` (TEXT, CHECK: 'OEM' | 'ALT' | '2ND')

**Line Item Details:**
- `description` (TEXT, NOT NULL)
- `part_number` (TEXT)
- `quantity` (DECIMAL, DEFAULT 1)

**Pricing:**
- `part_price` (DECIMAL)
- `strip_assemble` (DECIMAL)
- `labour` (DECIMAL)
- `paint` (DECIMAL)
- `outwork` (DECIMAL)
- `betterment_percentage` (DECIMAL) - Depreciation for wear

**Calculations:**
- `line_total` (DECIMAL) - Calculated sum

**Metadata:**
- `notes` (TEXT)
- `is_removed` (BOOLEAN, DEFAULT false) - Soft delete for exclusions
- `created_at`, `updated_at`

**Index:** `idx_assessment_estimates_assessment` on `assessment_id`

**Process Types:**
- **N** (New): New part installation
- **R** (Repair): Repair existing part
- **P** (Paint): Paint work only
- **B** (Strip & Build): Strip and rebuild
- **A** (Assess): Assessment/diagnostic
- **O** (Outwork): Subcontracted work

---

### `estimate_photos`
Photos attached to specific estimate line items (1:N with estimates).

**Columns:**
- `id` (UUID, PK)
- `estimate_id` (UUID, FK → assessment_estimates, ON DELETE CASCADE)
- `photo_url` (TEXT, NOT NULL)
- `photo_path` (TEXT)
- `caption` (TEXT)
- `created_at`, `updated_at`

---

### `assessment_pre_incident_estimates`
Pre-existing damage estimates (1:N with assessments).

**Columns:**
- Similar structure to `assessment_estimates`
- Used to separate pre-incident damage from current damage

---

### `pre_incident_estimate_photos`
Photos for pre-incident estimate items (1:N with pre-incident estimates).

---

### `assessment_vehicle_values`
Vehicle valuation data (1:1 with assessments).

**Columns:**
- `id` (UUID, PK)
- `assessment_id` (UUID, FK → assessments, UNIQUE, NOT NULL)

**Values:**
- `market_value` (DECIMAL)
- `trade_in_value` (DECIMAL)
- `retail_value` (DECIMAL)
- `condition_adjustment_value` (DECIMAL) - Positive/negative adjustment

**Warranty & Service:**
- `warranty_exists` (BOOLEAN)
- `warranty_type` (TEXT) - e.g., 'manufacturer', 'extended'
- `warranty_expiry_date` (DATE)
- `service_plan_exists` (BOOLEAN)
- `service_plan_type` (TEXT)
- `service_plan_expiry_date` (DATE)

**Notes:**
- `valuation_notes` (TEXT)

---

### `assessment_additionals`
Additional work items discovered after initial assessment (1:N with assessments).

**Columns:**
- Similar to `assessment_estimates`
- Tracks additional damage or work discovered later
- Has separate photos table: `assessment_additionals_photos`

---

## Final Repair Costing (FRC) Tables

### `assessment_frc`
Final Repair Costing records (1:1 with assessments).

**Columns:**
- `id` (UUID, PK)
- `assessment_id` (UUID, FK → assessments, UNIQUE, NOT NULL)
- `frc_number` (TEXT, UNIQUE, NOT NULL)
- `status` (TEXT, CHECK: 'in_progress' | 'submitted' | 'approved')

**Cost Breakdown:**
- `total_parts` (DECIMAL)
- `total_labour` (DECIMAL)
- `total_paint` (DECIMAL)
- `total_outwork` (DECIMAL)
- `vat_amount` (DECIMAL)
- `grand_total` (DECIMAL)

**Separate Breakdowns:**
- `claim_related_total`, `non_claim_related_total`
- `pre_incident_total`, `betterment_total`

**Photos & Documents:**
- `completion_photos` (JSONB) - Array of completion photo URLs
- `invoice_document_url` (TEXT)

**Sign-off:**
- `signed_by` (TEXT) - Name of person signing off
- `signature_url` (TEXT) - Signature image
- `signed_at` (TIMESTAMPTZ)

**Report Generation:**
- `frc_report_url` (TEXT)
- `frc_report_path` (TEXT)

**Frozen Rates & Markups:**
- `frozen_labour_rate` (DECIMAL)
- `frozen_paint_rate` (DECIMAL)
- `frozen_parts_markup` (DECIMAL)
- `frozen_labour_markup` (DECIMAL)
- `frozen_paint_markup` (DECIMAL)
- `frozen_outwork_markup` (DECIMAL)

**Timestamps:**
- `started_at`, `completed_at`, `submitted_at`
- `created_at`, `updated_at`

---

### `frc_documents`
Documents attached to FRC records (1:N with FRC).

**Columns:**
- `id` (UUID, PK)
- `frc_id` (UUID, FK → assessment_frc, ON DELETE CASCADE)
- `document_type` (TEXT) - e.g., 'invoice', 'receipt', 'completion_certificate'
- `document_url` (TEXT, NOT NULL)
- `document_path` (TEXT)
- `file_name` (TEXT)
- `file_size` (INTEGER)
- `mime_type` (TEXT)
- `caption` (TEXT)
- `created_at`, `updated_at`

---

## Notes & Audit Tables

### `assessment_notes`
Notes attached to assessments by tab/section (1:N with assessments).

**Columns:**
- `id` (UUID, PK)
- `assessment_id` (UUID, FK → assessments, NOT NULL)
- `source_tab` (TEXT) - Which tab the note was created from
- `note_text` (TEXT, NOT NULL)
- `created_by` (TEXT) - User who created the note
- `created_at`, `updated_at`

**Unique Constraint:** `(assessment_id, source_tab)` (deprecated, now allows multiple notes per tab)

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
Singleton table for company-wide settings (rates, markups, etc.).

**Columns:**
- `id` (UUID, PK)
- `company_name` (TEXT)
- `company_address` (TEXT)
- `company_phone` (TEXT)
- `company_email` (TEXT)

**Rates:**
- `labour_rate` (DECIMAL) - Hourly labour rate
- `paint_rate` (DECIMAL) - Hourly paint rate

**Markups (percentages):**
- `parts_markup` (DECIMAL)
- `labour_markup` (DECIMAL)
- `paint_markup` (DECIMAL)
- `outwork_markup` (DECIMAL)

**VAT:**
- `vat_percentage` (DECIMAL, DEFAULT 15)

**Timestamps:**
- `created_at`, `updated_at`

**Note:** Typically only one row exists in this table.

---

## Provinces Reference Table

### `provinces`
South African provinces for location filtering.

**Columns:**
- `id` (UUID, PK)
- `code` (TEXT, UNIQUE, NOT NULL) - e.g., 'GT', 'WC'
- `name` (TEXT, NOT NULL) - e.g., 'Gauteng', 'Western Cape'
- `created_at`

**Data:**
- Gauteng (GT)
- Western Cape (WC)
- Eastern Cape (EC)
- KwaZulu-Natal (KZN)
- Free State (FS)
- Limpopo (LP)
- Mpumalanga (MP)
- Northern Cape (NC)
- North West (NW)

---

## Storage Buckets

### `documents`
Stores generated PDFs and other documents.

**Configuration:**
- Public: false (private bucket)
- File size limit: 50 MB
- Allowed MIME types: `application/pdf`, `application/zip`

**RLS Policies:**
- Authenticated users can SELECT/INSERT/UPDATE/DELETE

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
- Public: false (private bucket)
- File size limit: 10 MB per file
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

**RLS Policies:**
- Authenticated users can SELECT/INSERT/UPDATE/DELETE

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

All tables have RLS enabled. Current policies are permissive for development:

```sql
CREATE POLICY "Allow all operations on {table_name} for now"
  ON {table_name}
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

**Production-ready policies** (implemented for `user_profiles`):
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
