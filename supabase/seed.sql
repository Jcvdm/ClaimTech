-- Seed data for development and testing

-- Insert sample clients
INSERT INTO clients (id, name, type, contact_name, email, phone, address, city, postal_code, notes) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Santam Insurance', 'insurance', 'John Smith', 'john@santam.co.za', '+27 11 123 4567', '123 Insurance Street', 'Johannesburg', '2000', 'Preferred insurance partner'),
  ('22222222-2222-2222-2222-222222222222', 'Discovery Insure', 'insurance', 'Sarah Johnson', 'sarah@discovery.co.za', '+27 21 987 6543', '456 Discovery Way', 'Cape Town', '8001', 'Large volume partner'),
  ('33333333-3333-3333-3333-333333333333', 'Old Mutual Insure', 'insurance', 'Michael Brown', 'michael@oldmutual.co.za', '+27 31 555 7890', '789 Mutual Road', 'Durban', '4001', NULL),
  ('44444444-4444-4444-4444-444444444444', 'Private Client - David Brown', 'private', 'David Brown', 'david.brown@email.com', '+27 82 555 1234', '789 Private Road', 'Pretoria', '0001', 'Regular private client'),
  ('55555555-5555-5555-5555-555555555555', 'Private Client - Lisa Anderson', 'private', 'Lisa Anderson', 'lisa.a@email.com', '+27 83 444 5678', '321 Oak Avenue', 'Sandton', '2196', NULL);

-- Insert sample engineers
INSERT INTO engineers (id, name, email, phone, specialization) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'James Wilson', 'james.wilson@claimtech.co.za', '+27 82 111 2222', 'Collision Assessment'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Emma Thompson', 'emma.thompson@claimtech.co.za', '+27 83 333 4444', 'Hail Damage'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Robert Davis', 'robert.davis@claimtech.co.za', '+27 84 555 6666', 'General Assessment');

-- Insert sample requests
INSERT INTO requests (
  id, request_number, client_id, type, claim_number, status, description,
  date_of_loss, insured_value, incident_type, incident_description, incident_location,
  vehicle_make, vehicle_model, vehicle_year, vehicle_vin, vehicle_registration, vehicle_color, vehicle_mileage,
  owner_name, owner_phone, owner_email, owner_address,
  third_party_name, third_party_phone, third_party_email, third_party_insurance,
  current_step, assigned_engineer_id
) VALUES
  (
    'req-1111-1111-1111-111111111111',
    'CLM-2025-001',
    '11111111-1111-1111-1111-111111111111',
    'insurance',
    'SANT-2025-12345',
    'submitted',
    'Front-end collision damage assessment',
    '2025-01-15',
    350000.00,
    'collision',
    'Vehicle collided with another vehicle at intersection',
    'Corner of Main Rd and 5th Ave, Sandton',
    'BMW',
    '320i',
    2022,
    'WBA8E9C50HK123456',
    'CA 123 456',
    'White',
    45000,
    'Michael Peterson',
    '+27 83 456 7890',
    'michael.p@email.com',
    '12 Oak Street, Sandton, 2196',
    'Jane Williams',
    '+27 84 321 9876',
    'jane.w@email.com',
    'Old Mutual',
    'assessment',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  (
    'req-2222-2222-2222-222222222222',
    'REQ-2025-001',
    '44444444-4444-4444-4444-444444444444',
    'private',
    NULL,
    'draft',
    'Hail damage assessment',
    '2025-01-20',
    180000.00,
    'weather',
    'Hail damage to roof and bonnet',
    'Pretoria East',
    'Toyota',
    'Corolla',
    2020,
    'JTDBL40E099123456',
    'GP 789 012',
    'Silver',
    68000,
    'David Brown',
    '+27 82 555 1234',
    'david.brown@email.com',
    '789 Private Road, Pretoria, 0001',
    NULL,
    NULL,
    NULL,
    NULL,
    'request',
    NULL
  ),
  (
    'req-3333-3333-3333-333333333333',
    'CLM-2025-002',
    '22222222-2222-2222-2222-222222222222',
    'insurance',
    'DISC-2025-67890',
    'in_progress',
    'Rear-end collision assessment',
    '2025-01-18',
    420000.00,
    'collision',
    'Vehicle was rear-ended while stopped at traffic light',
    'N1 Highway, Midrand',
    'Mercedes-Benz',
    'C-Class',
    2023,
    'WDD2050071F123456',
    'CA 456 789',
    'Black',
    28000,
    'Sarah Mitchell',
    '+27 82 777 8888',
    'sarah.m@email.com',
    '45 Luxury Lane, Midrand, 1685',
    'Tom Jackson',
    '+27 83 999 0000',
    'tom.j@email.com',
    'Santam',
    'quote',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  );

-- Insert sample tasks
INSERT INTO request_tasks (request_id, step, title, description, status, assigned_to, due_date) VALUES
  ('req-1111-1111-1111-111111111111', 'assessment', 'Initial vehicle inspection', 'Conduct on-site inspection of BMW 320i', 'in_progress', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE + INTERVAL '2 days'),
  ('req-1111-1111-1111-111111111111', 'assessment', 'Document damage with photos', 'Take comprehensive photos of all damage', 'pending', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE + INTERVAL '2 days'),
  ('req-3333-3333-3333-333333333333', 'quote', 'Prepare repair quote', 'Create detailed quote for rear-end repairs', 'in_progress', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', CURRENT_DATE + INTERVAL '3 days'),
  ('req-3333-3333-3333-333333333333', 'quote', 'Source parts pricing', 'Get pricing for Mercedes parts', 'pending', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', CURRENT_DATE + INTERVAL '4 days');

