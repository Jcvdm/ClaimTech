-- Create assessments table
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_number TEXT UNIQUE NOT NULL,
  appointment_id UUID REFERENCES appointments(id) NOT NULL,
  inspection_id UUID REFERENCES inspections(id) NOT NULL,
  request_id UUID REFERENCES requests(id) NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'submitted')),
  
  -- Progress tracking
  current_tab TEXT DEFAULT 'identification',
  tabs_completed JSONB DEFAULT '[]',
  
  -- Metadata
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create assessment_vehicle_identification table
CREATE TABLE assessment_vehicle_identification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES assessments(id) NOT NULL UNIQUE,
  
  -- Vehicle Details (confirmed/updated)
  registration_number TEXT,
  vin_number TEXT,
  engine_number TEXT,
  license_disc_expiry DATE,
  
  -- Photos
  registration_photo_url TEXT,
  vin_photo_url TEXT,
  engine_number_photo_url TEXT,
  license_disc_photo_url TEXT,
  
  -- Driver/Client Documents
  driver_license_photo_url TEXT,
  driver_license_number TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create assessment_360_exterior table
CREATE TABLE assessment_360_exterior (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES assessments(id) NOT NULL UNIQUE,
  
  -- Vehicle Condition
  overall_condition TEXT CHECK (overall_condition IN ('excellent', 'very_good', 'good', 'fair', 'poor', 'very_poor')),
  vehicle_color TEXT,
  
  -- 360 Photos (standard positions)
  front_photo_url TEXT,
  front_left_photo_url TEXT,
  left_photo_url TEXT,
  rear_left_photo_url TEXT,
  rear_photo_url TEXT,
  rear_right_photo_url TEXT,
  right_photo_url TEXT,
  front_right_photo_url TEXT,
  
  -- Additional exterior photos
  additional_photos JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create assessment_accessories table
CREATE TABLE assessment_accessories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES assessments(id) NOT NULL,
  
  -- Accessory details
  accessory_type TEXT NOT NULL,
  custom_name TEXT,
  condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
  notes TEXT,
  photo_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create assessment_interior_mechanical table
CREATE TABLE assessment_interior_mechanical (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES assessments(id) NOT NULL UNIQUE,
  
  -- Photos
  engine_bay_photo_url TEXT,
  battery_photo_url TEXT,
  oil_level_photo_url TEXT,
  coolant_photo_url TEXT,
  mileage_photo_url TEXT,
  interior_front_photo_url TEXT,
  interior_rear_photo_url TEXT,
  dashboard_photo_url TEXT,
  
  -- Readings
  mileage_reading INTEGER,
  
  -- Interior Condition
  interior_condition TEXT CHECK (interior_condition IN ('excellent', 'very_good', 'good', 'fair', 'poor', 'very_poor')),
  
  -- Systems Check
  srs_system TEXT CHECK (srs_system IN ('working', 'not_working', 'warning_light', 'not_applicable')),
  steering TEXT CHECK (steering IN ('working', 'not_working', 'issues')),
  brakes TEXT CHECK (brakes IN ('working', 'not_working', 'issues')),
  handbrake TEXT CHECK (handbrake IN ('working', 'not_working', 'issues')),
  
  -- Notes
  mechanical_notes TEXT,
  interior_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create assessment_tyres table
CREATE TABLE assessment_tyres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES assessments(id) NOT NULL,
  
  -- Tyre position
  position TEXT NOT NULL,
  position_label TEXT,
  
  -- Tyre details
  tyre_make TEXT,
  tyre_size TEXT,
  load_index TEXT,
  speed_rating TEXT,
  tread_depth_mm DECIMAL(4,2),
  condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'replace')),
  
  -- Photo
  photo_url TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create assessment_damage table
CREATE TABLE assessment_damage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES assessments(id) NOT NULL,
  
  -- Damage matching
  matches_description BOOLEAN,
  mismatch_notes TEXT,
  
  -- Damage classification
  damage_area TEXT NOT NULL CHECK (damage_area IN ('structural', 'non_structural')),
  damage_type TEXT NOT NULL,
  
  -- Damage details
  affected_panels JSONB DEFAULT '[]',
  severity TEXT CHECK (severity IN ('minor', 'moderate', 'severe', 'total_loss')),
  repair_method TEXT,
  repair_duration_hours DECIMAL(5,2),
  
  -- Location on vehicle
  location_description TEXT,
  
  -- Photos
  photos JSONB DEFAULT '[]',
  
  -- Notes
  damage_description TEXT,
  repair_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_assessments_appointment ON assessments(appointment_id);
CREATE INDEX idx_assessments_inspection ON assessments(inspection_id);
CREATE INDEX idx_assessments_request ON assessments(request_id);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessment_accessories_assessment ON assessment_accessories(assessment_id);
CREATE INDEX idx_assessment_tyres_assessment ON assessment_tyres(assessment_id);
CREATE INDEX idx_assessment_damage_assessment ON assessment_damage(assessment_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_assessment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_updated_at();

CREATE TRIGGER update_assessment_vehicle_identification_updated_at
  BEFORE UPDATE ON assessment_vehicle_identification
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_updated_at();

CREATE TRIGGER update_assessment_360_exterior_updated_at
  BEFORE UPDATE ON assessment_360_exterior
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_updated_at();

CREATE TRIGGER update_assessment_accessories_updated_at
  BEFORE UPDATE ON assessment_accessories
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_updated_at();

CREATE TRIGGER update_assessment_interior_mechanical_updated_at
  BEFORE UPDATE ON assessment_interior_mechanical
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_updated_at();

CREATE TRIGGER update_assessment_tyres_updated_at
  BEFORE UPDATE ON assessment_tyres
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_updated_at();

CREATE TRIGGER update_assessment_damage_updated_at
  BEFORE UPDATE ON assessment_damage
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_updated_at();

-- Enable Row Level Security
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_vehicle_identification ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_360_exterior ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_interior_mechanical ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_tyres ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_damage ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for development
CREATE POLICY "Allow all operations on assessments" ON assessments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on assessment_vehicle_identification" ON assessment_vehicle_identification FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on assessment_360_exterior" ON assessment_360_exterior FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on assessment_accessories" ON assessment_accessories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on assessment_interior_mechanical" ON assessment_interior_mechanical FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on assessment_tyres" ON assessment_tyres FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on assessment_damage" ON assessment_damage FOR ALL USING (true) WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE assessments IS 'Main assessment records for vehicle inspections';
COMMENT ON TABLE assessment_vehicle_identification IS 'Vehicle identification details and photos';
COMMENT ON TABLE assessment_360_exterior IS '360-degree exterior photos and condition assessment';
COMMENT ON TABLE assessment_accessories IS 'Vehicle accessories and aftermarket additions';
COMMENT ON TABLE assessment_interior_mechanical IS 'Interior condition and mechanical systems check';
COMMENT ON TABLE assessment_tyres IS 'Individual tyre inspection records';
COMMENT ON TABLE assessment_damage IS 'Damage identification and repair assessment records';

