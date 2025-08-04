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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add search_path to the new functions we created
CREATE OR REPLACE FUNCTION public.auto_set_user_id_on_project_members()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = auth.email() AND NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.validate_producer_role_assignment()
RETURNS TRIGGER AS $$
DECLARE
  project_producer_id UUID;
BEGIN
  IF NEW.role = 'producer' THEN
    SELECT producer_id INTO project_producer_id 
    FROM projects 
    WHERE id = NEW.project_id;
    
    IF project_producer_id != auth.uid() THEN
      RAISE EXCEPTION 'Only project producers can assign producer role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';