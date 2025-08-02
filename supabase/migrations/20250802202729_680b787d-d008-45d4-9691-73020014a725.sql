-- Fix infinite recursion in projects RLS policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;

-- Create a security definer function to check if user can view project
CREATE OR REPLACE FUNCTION public.can_view_project(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
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

-- Create new policy using the security definer function
CREATE POLICY "Users can view projects they are members of" 
ON public.projects 
FOR SELECT 
USING (public.can_view_project(id));