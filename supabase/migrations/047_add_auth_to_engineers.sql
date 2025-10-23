-- Add auth_user_id to engineers table
-- Links engineers to auth.users for role-based access control

-- Add auth_user_id column to engineers table
ALTER TABLE engineers 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_engineers_auth_user_id ON engineers(auth_user_id);

-- Add unique constraint to ensure one engineer per auth user
ALTER TABLE engineers 
ADD CONSTRAINT unique_engineer_auth_user UNIQUE (auth_user_id);

-- Add comment for documentation
COMMENT ON COLUMN engineers.auth_user_id IS 'Links engineer to auth.users for authentication and role-based access control';

