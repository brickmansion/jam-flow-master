-- PHASE 1: Critical RLS / Role Escalation Fixes

-- 1. Add user_id enforcement constraint
ALTER TABLE project_members 
ADD CONSTRAINT user_id_required 
CHECK (user_id IS NOT NULL OR email IS NOT NULL);

-- 2. Create trigger to auto-set user_id when email matches auth.email()
CREATE OR REPLACE FUNCTION public.auto_set_user_id_on_project_members()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = auth.email() AND NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_set_user_id_trigger
  BEFORE INSERT OR UPDATE ON public.project_members
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_user_id_on_project_members();

-- 3. Prevent role escalation - users cannot upgrade their own role
CREATE POLICY "cannot_self_upgrade_role" 
ON public.project_members 
FOR UPDATE 
USING (user_id != auth.uid() OR role = OLD.role);

-- 4. Producer role assignment constraint
ALTER TABLE project_members 
ADD CONSTRAINT producer_role_assign 
CHECK (
  role != 'producer' 
  OR auth.uid() = (
    SELECT producer_id 
    FROM projects p 
    WHERE p.id = project_id
  )
);

-- PHASE 2: DB Function & View Security

-- 1. Update all existing functions to be SECURITY DEFINER with proper search_path
CREATE OR REPLACE FUNCTION public.get_next_file_version(p_project_id uuid, p_category file_category)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(MAX(version), 0) + 1
  FROM public.file_uploads
  WHERE project_id = p_project_id AND category = p_category;
$$;

CREATE OR REPLACE FUNCTION public.workspace_has_pro_access(workspace_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    CASE 
      WHEN plan = 'pro' THEN true
      WHEN plan = 'free' AND trial_expires_at IS NOT NULL AND trial_expires_at > now() THEN true
      ELSE false
    END
  FROM public.workspaces 
  WHERE id = workspace_uuid;
$$;

CREATE OR REPLACE FUNCTION public.can_view_project(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.projects 
    WHERE id = project_uuid 
    AND producer_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 
    FROM public.project_members 
    WHERE project_id = project_uuid 
    AND (user_id = auth.uid() OR email = auth.email())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_producer_of_any_project(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.projects 
    WHERE producer_id = user_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.project_members 
    WHERE project_id = project_uuid 
    AND (user_id = auth.uid() OR email = auth.email())
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, prefs)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', ''),
    '{
      "theme": "system",
      "dateFormat": "MM/DD/YYYY",
      "notifications": {
        "invite": true,
        "taskReady": true,
        "commentMention": true
      }
    }'::jsonb
  );
  RETURN NEW;
END;
$$;

-- 2. Fix storage view permissions with proper security
DROP VIEW IF EXISTS public.workspace_storage_usage_gb;
CREATE VIEW public.workspace_storage_usage_gb
WITH (security_definer = true)
AS
SELECT
  w.id AS workspace_id,
  w.name AS workspace_name,
  COALESCE(SUM(fu.file_size)::numeric / (1024^3), 0) AS storage_gb
FROM public.workspaces w
LEFT JOIN public.projects p ON p.workspace_id = w.id
LEFT JOIN public.file_uploads fu ON fu.project_id = p.id
WHERE w.owner_id = auth.uid()
GROUP BY w.id, w.name;

-- Grant access to the view
GRANT SELECT ON public.workspace_storage_usage_gb TO authenticated;

-- 3. Server-side validation triggers

-- BPM validation trigger
CREATE OR REPLACE FUNCTION public.validate_project_bpm()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bpm < 40 OR NEW.bpm > 300 THEN
    RAISE EXCEPTION 'BPM must be between 40 and 300';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER validate_file_size_trigger
  BEFORE INSERT OR UPDATE ON public.file_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_file_size();