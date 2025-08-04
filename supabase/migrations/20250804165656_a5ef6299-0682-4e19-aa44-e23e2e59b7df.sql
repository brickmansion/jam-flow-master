-- Check current bucket settings and remove all file size limits
UPDATE storage.buckets 
SET 
  file_size_limit = NULL,
  allowed_mime_types = NULL
WHERE id IN ('project-files', 'sessions');

-- Also ensure the buckets exist with proper settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES 
  ('project-files', 'project-files', false, NULL, NULL),
  ('sessions', 'sessions', false, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = NULL,
  allowed_mime_types = NULL;