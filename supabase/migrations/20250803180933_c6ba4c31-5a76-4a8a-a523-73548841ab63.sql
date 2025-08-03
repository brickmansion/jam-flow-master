-- Create an enum for project member roles
CREATE TYPE IF NOT EXISTS project_member_role AS ENUM ('producer', 'manager', 'editor', 'artist', 'assistant');

-- Update the project_members table to use the enum (if not already using it)
-- First, let's check the current column type and update if needed
DO $$
BEGIN
  -- Update the role column to use the enum type
  BEGIN
    ALTER TABLE project_members 
    ALTER COLUMN role TYPE project_member_role 
    USING role::project_member_role;
  EXCEPTION
    WHEN invalid_text_representation THEN
      -- If there are invalid values, let's update them first
      UPDATE project_members SET role = 'editor' WHERE role NOT IN ('producer', 'manager', 'editor', 'artist', 'assistant');
      
      -- Now try the conversion again
      ALTER TABLE project_members 
      ALTER COLUMN role TYPE project_member_role 
      USING role::project_member_role;
  END;
END
$$;