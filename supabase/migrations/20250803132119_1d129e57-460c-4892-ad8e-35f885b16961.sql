-- Fix search path for existing functions
CREATE OR REPLACE FUNCTION public.is_project_member(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.project_members 
    WHERE project_id = project_uuid 
    AND (user_id = auth.uid() OR email = auth.email())
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_project(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
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