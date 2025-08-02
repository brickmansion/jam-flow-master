-- Fix infinite recursion in project_members RLS policy
-- First drop the problematic policy
DROP POLICY IF EXISTS "Project members can view other members" ON public.project_members;

-- Create a security definer function to check if user is project member
CREATE OR REPLACE FUNCTION public.is_project_member(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.project_members 
    WHERE project_id = project_uuid 
    AND (user_id = auth.uid() OR email = auth.email())
  );
$$;

-- Create new policy using the security definer function
CREATE POLICY "Project members can view other members" 
ON public.project_members 
FOR SELECT 
USING (
  public.is_project_member(project_id) 
  OR project_id IN (
    SELECT id 
    FROM projects 
    WHERE producer_id = auth.uid()
  )
);