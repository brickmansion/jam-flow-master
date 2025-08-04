-- Fix the security definer view issue
DROP VIEW IF EXISTS public.workspace_storage_usage_gb;

-- Create a regular view without security definer (RLS will handle security)
CREATE VIEW public.workspace_storage_usage_gb AS
SELECT
  w.id AS workspace_id,
  w.name AS workspace_name,
  COALESCE(SUM(fu.file_size)::numeric / (1024^3), 0) AS storage_gb
FROM public.workspaces w
LEFT JOIN public.projects p ON p.workspace_id = w.id
LEFT JOIN public.file_uploads fu ON fu.project_id = p.id
WHERE w.owner_id = auth.uid()
GROUP BY w.id, w.name;

-- Server-side validation triggers

-- BPM validation trigger
CREATE OR REPLACE FUNCTION public.validate_project_bpm()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bpm < 40 OR NEW.bpm > 300 THEN
    RAISE EXCEPTION 'BPM must be between 40 and 300';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER validate_bpm_trigger
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_project_bpm();

-- Bio length validation trigger
CREATE OR REPLACE FUNCTION public.validate_bio_length()
RETURNS TRIGGER AS $$
BEGIN
  IF LENGTH(NEW.bio) > 280 THEN
    RAISE EXCEPTION 'Bio must be 280 characters or less';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER validate_bio_trigger
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  WHEN (NEW.bio IS NOT NULL)
  EXECUTE FUNCTION public.validate_bio_length();

-- File size validation trigger
CREATE OR REPLACE FUNCTION public.validate_file_size()
RETURNS TRIGGER AS $$
BEGIN
  -- 5 GB limit for regular files, 60 GB for sessions
  IF NEW.category = 'sessions' AND NEW.file_size > 64424509440 THEN -- 60 GB
    RAISE EXCEPTION 'Session files cannot exceed 60 GB';
  ELSIF NEW.category != 'sessions' AND NEW.file_size > 5368709120 THEN -- 5 GB
    RAISE EXCEPTION 'Files cannot exceed 5 GB';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER validate_file_size_trigger
  BEFORE INSERT OR UPDATE ON public.file_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_file_size();