-- Raise server-side limits for storage buckets
UPDATE storage.buckets
SET file_size_limit = 209715200  -- 200 MB in bytes
WHERE id IN ('project-files', 'sessions');