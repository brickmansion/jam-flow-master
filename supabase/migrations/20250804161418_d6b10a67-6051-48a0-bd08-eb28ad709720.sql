-- Check and update storage bucket configuration for larger file sizes
-- Update the project-files bucket to allow larger uploads

UPDATE storage.buckets 
SET file_size_limit = 104857600 -- 100MB in bytes
WHERE id = 'project-files';

UPDATE storage.buckets 
SET file_size_limit = 64424509440 -- 60GB in bytes  
WHERE id = 'sessions';