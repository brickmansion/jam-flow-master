-- Fix security warnings from linter

-- Fix search path for security functions
CREATE OR REPLACE FUNCTION public.validate_role_assignment()
RETURNS TRIGGER AS $$
DECLARE
  project_producer_id UUID;
  current_user_role TEXT;
  requester_id UUID := auth.uid();
BEGIN
  -- Get project producer
  SELECT producer_id INTO project_producer_id 
  FROM public.projects 
  WHERE id = NEW.project_id;
  
  -- Get current user's role in this project
  SELECT role INTO current_user_role 
  FROM public.project_members 
  WHERE project_id = NEW.project_id AND user_id = requester_id;
  
  -- Only project producers can assign producer role
  IF NEW.role = 'producer' AND requester_id != project_producer_id THEN
    RAISE EXCEPTION 'Only project producers can assign producer role';
  END IF;
  
  -- Prevent self role upgrades to producer or manager
  IF NEW.user_id = requester_id AND NEW.role IN ('producer', 'manager') AND 
     COALESCE(current_user_role, 'none') NOT IN ('producer', 'manager') THEN
    RAISE EXCEPTION 'Users cannot upgrade their own role to % from %', NEW.role, COALESCE(current_user_role, 'none');
  END IF;
  
  -- Only producers and managers can assign manager role
  IF NEW.role = 'manager' AND requester_id != project_producer_id AND 
     COALESCE(current_user_role, 'none') != 'manager' THEN
    RAISE EXCEPTION 'Only producers and managers can assign manager role';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.validate_invitation_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure token expires within reasonable time (max 7 days)
  IF NEW.expires_at > now() + interval '7 days' THEN
    NEW.expires_at := now() + interval '7 days';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'medium'
)
RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO public.security_audit (
    event_type, user_id, resource_type, resource_id, details, severity
  ) VALUES (
    p_event_type, COALESCE(p_user_id, auth.uid()), p_resource_type, p_resource_id, p_details, p_severity
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.validate_file_upload_security()
RETURNS TRIGGER AS $$
DECLARE
  workspace_storage_limit_gb NUMERIC := 5.0;
  current_storage_gb NUMERIC;
  file_extension TEXT;
  dangerous_extensions TEXT[] := ARRAY['.exe', '.bat', '.cmd', '.scr', '.com', '.pif', '.vbs', '.js', '.jar', '.app', '.deb', '.pkg', '.dmg'];
BEGIN
  -- Extract file extension
  file_extension := lower(right(NEW.original_filename, 4));
  
  -- Block dangerous file extensions
  IF file_extension = ANY(dangerous_extensions) THEN
    RAISE EXCEPTION 'File type % is not allowed for security reasons', file_extension;
  END IF;
  
  -- Check workspace storage limits
  SELECT COALESCE(SUM(file_size), 0) / (1024*1024*1024.0) 
  INTO current_storage_gb
  FROM public.file_uploads 
  WHERE workspace_id = NEW.workspace_id;
  
  IF current_storage_gb + (NEW.file_size / (1024*1024*1024.0)) > workspace_storage_limit_gb THEN
    RAISE EXCEPTION 'Upload would exceed workspace storage limit of % GB', workspace_storage_limit_gb;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.validate_user_profile_security()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate bio length and content
  IF LENGTH(NEW.bio) > 500 THEN
    RAISE EXCEPTION 'Bio must be 500 characters or less';
  END IF;
  
  -- Basic XSS prevention for bio field
  IF NEW.bio ~ '<script|javascript:|onload=|onerror=' THEN
    RAISE EXCEPTION 'Bio contains potentially dangerous content';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update RLS policies to require authentication
DROP POLICY IF EXISTS "Collection members can view other collection members" ON public.collection_members;
DROP POLICY IF EXISTS "Collection producers can manage collection members" ON public.collection_members;

CREATE POLICY "Collection members can view other collection members" 
ON public.collection_members 
FOR SELECT 
TO authenticated
USING (collection_id IN ( SELECT collections.id
   FROM collections
  WHERE (collections.producer_id = auth.uid())));

CREATE POLICY "Collection producers can manage collection members" 
ON public.collection_members 
FOR ALL 
TO authenticated
USING (collection_id IN ( SELECT collections.id
   FROM collections
  WHERE (collections.producer_id = auth.uid())));

-- Update other policies to require authentication
DROP POLICY IF EXISTS "Users can view their own collections" ON public.collections;
CREATE POLICY "Users can view their own collections" 
ON public.collections 
FOR SELECT 
TO authenticated
USING (auth.uid() = producer_id);

DROP POLICY IF EXISTS "Users can update their own collections" ON public.collections;
CREATE POLICY "Users can update their own collections" 
ON public.collections 
FOR UPDATE 
TO authenticated
USING (auth.uid() = producer_id);

DROP POLICY IF EXISTS "Users can delete their own collections" ON public.collections;
CREATE POLICY "Users can delete their own collections" 
ON public.collections 
FOR DELETE 
TO authenticated
USING (auth.uid() = producer_id);

-- Update project policies
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;
CREATE POLICY "Users can view projects they are members of" 
ON public.projects 
FOR SELECT 
TO authenticated
USING (can_view_project(id) OR (collection_id IN ( SELECT collection_members.collection_id
   FROM collection_members
  WHERE ((collection_members.user_id = auth.uid()) OR (collection_members.email = auth.email())))));

DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update their own projects" 
ON public.projects 
FOR UPDATE 
TO authenticated
USING (auth.uid() = producer_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
CREATE POLICY "Users can delete their own projects" 
ON public.projects 
FOR DELETE 
TO authenticated
USING (auth.uid() = producer_id);

-- Update user profile policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

-- Update workspace policies
DROP POLICY IF EXISTS "Users can view their own workspaces" ON public.workspaces;
CREATE POLICY "Users can view their own workspaces" 
ON public.workspaces 
FOR SELECT 
TO authenticated
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own workspaces" ON public.workspaces;
CREATE POLICY "Users can update their own workspaces" 
ON public.workspaces 
FOR UPDATE 
TO authenticated
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own workspaces" ON public.workspaces;
CREATE POLICY "Users can delete their own workspaces" 
ON public.workspaces 
FOR DELETE 
TO authenticated
USING (owner_id = auth.uid());