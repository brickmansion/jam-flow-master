-- Add progress field to projects table to store phase statuses
ALTER TABLE public.projects 
ADD COLUMN progress JSONB DEFAULT '{
  "preProduction": "Not Started",
  "recording": "Not Started", 
  "editing": "Not Started",
  "mixing": "Not Started",
  "mastering": "Not Started"
}'::jsonb;