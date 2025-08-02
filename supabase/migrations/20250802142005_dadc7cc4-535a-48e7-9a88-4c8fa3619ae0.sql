-- Add external_link column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN external_link TEXT;

-- Add constraint to validate URLs when provided
ALTER TABLE public.tasks 
ADD CONSTRAINT valid_external_link 
CHECK (
  external_link IS NULL OR 
  external_link ~ '^https?://.*$'
);