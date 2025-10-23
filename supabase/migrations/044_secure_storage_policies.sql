-- Secure Storage Policies Migration
-- Changes storage buckets to private and requires authentication for all operations

-- Change buckets to private (no public access)
UPDATE storage.buckets
SET public = false
WHERE id IN ('documents', 'SVA Photos');

-- Drop existing public/anon policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can read SVA photos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload SVA photos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update SVA photos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete SVA photos" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow anon uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow anon updates" ON storage.objects;
  DROP POLICY IF EXISTS "Allow anon deletes" ON storage.objects;
  DROP POLICY IF EXISTS "Public Access" ON storage.objects;
  DROP POLICY IF EXISTS "Anon can upload" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create authenticated-only policies for documents bucket

-- SELECT: Authenticated users can read documents
CREATE POLICY "Authenticated users can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- INSERT: Authenticated users can upload documents
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- UPDATE: Authenticated users can update their documents
CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- DELETE: Authenticated users can delete documents
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- Create authenticated-only policies for SVA Photos bucket

-- SELECT: Authenticated users can read photos
CREATE POLICY "Authenticated users can read SVA photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'SVA Photos');

-- INSERT: Authenticated users can upload photos
CREATE POLICY "Authenticated users can upload SVA photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'SVA Photos');

-- UPDATE: Authenticated users can update photos
CREATE POLICY "Authenticated users can update SVA photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'SVA Photos')
WITH CHECK (bucket_id = 'SVA Photos');

-- DELETE: Authenticated users can delete photos
CREATE POLICY "Authenticated users can delete SVA photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'SVA Photos');

