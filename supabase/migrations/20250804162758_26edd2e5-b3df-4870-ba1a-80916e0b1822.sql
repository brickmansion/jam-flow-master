-- Remove file size limits from storage buckets
UPDATE storage.buckets 
SET file_size_limit = NULL 
WHERE id IN ('project-files', 'sessions');

-- Remove the file size validation trigger
DROP TRIGGER IF EXISTS validate_file_size_trigger ON public.file_uploads;

-- Remove the file size validation function
DROP FUNCTION IF EXISTS public.validate_file_size();