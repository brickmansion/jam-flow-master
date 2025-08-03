-- Create enum for project member roles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_member_role') THEN
        CREATE TYPE project_member_role AS ENUM ('producer', 'manager', 'editor', 'artist', 'assistant');
    END IF;
END $$;

-- Update existing invalid roles to 'editor' as default
UPDATE project_members 
SET role = 'editor' 
WHERE role NOT IN ('producer', 'manager', 'editor', 'artist', 'assistant');

-- Now update the column type to use the enum
ALTER TABLE project_members 
ALTER COLUMN role TYPE project_member_role 
USING role::project_member_role;