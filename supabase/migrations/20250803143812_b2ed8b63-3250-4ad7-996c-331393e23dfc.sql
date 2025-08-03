-- Fix function search path for get_next_file_version
CREATE OR REPLACE FUNCTION public.get_next_file_version(
  p_project_id UUID,
  p_category file_category
) RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(version), 0) + 1
  FROM public.file_uploads
  WHERE project_id = p_project_id AND category = p_category;
$$;