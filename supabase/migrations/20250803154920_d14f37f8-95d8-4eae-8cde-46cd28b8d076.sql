-- Update existing 'references' category to 'sessions'
UPDATE file_uploads 
SET category = 'sessions' 
WHERE category = 'references';

-- Update storage bucket policies to handle the migration
-- (Keep existing sessions policies, they already cover this)