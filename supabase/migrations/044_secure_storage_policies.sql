-- Secure Storage Policies Migration
-- Changes documents bucket to private and requires authentication for all operations

-- Change bucket to private (no public access)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'documents';

-- Drop existing public/anon policies if they exist
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon deletes" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload" ON storage.objects;

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

-- Add comment for documentation
COMMENT ON TABLE storage.objects IS 'Storage objects with authenticated-only access. Public access disabled for security.';

