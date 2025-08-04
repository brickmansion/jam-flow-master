-- Critical Security Fixes Migration
-- This migration addresses privilege escalation vulnerabilities and enhances security

-- Remove conflicting RLS policies that create privilege escalation risks
DROP POLICY IF EXISTS "cannot_self_upgrade_role" ON public.project_members;
DROP POLICY IF EXISTS "Users cannot upgrade their own role to producer" ON public.project_members;

-- Create comprehensive role assignment validation function
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
  
  -- Log security event for role assignments
  INSERT INTO public.security_audit (
    event_type, user_id, resource_type, resource_id, details, severity
  ) VALUES (
    'role_assignment', requester_id, 'project_member', NEW.id,
    jsonb_build_object(
      'new_role', NEW.role,
      'target_user', NEW.user_id,
      'project_id', NEW.project_id
    ),
    CASE WHEN NEW.role IN ('producer', 'manager') THEN 'high' ELSE 'medium' END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role assignment validation
DROP TRIGGER IF EXISTS validate_role_assignment_trigger ON public.project_members;
CREATE TRIGGER validate_role_assignment_trigger
  BEFORE INSERT OR UPDATE ON public.project_members
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_assignment();

-- Enhanced invitation token security
CREATE OR REPLACE FUNCTION public.validate_invitation_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure token expires within reasonable time (max 7 days)
  IF NEW.expires_at > now() + interval '7 days' THEN
    NEW.expires_at := now() + interval '7 days';
  END IF;
  
  -- Log invitation creation for security monitoring
  INSERT INTO public.security_audit (
    event_type, user_id, resource_type, resource_id, details, severity
  ) VALUES (
    'invitation_created', NEW.created_by, 'invitation_token', NEW.id,
    jsonb_build_object(
      'email', NEW.email,
      'project_id', NEW.project_id,
      'expires_at', NEW.expires_at
    ),
    'medium'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for invitation validation
DROP TRIGGER IF EXISTS validate_invitation_token_trigger ON public.invitation_tokens;
CREATE TRIGGER validate_invitation_token_trigger
  BEFORE INSERT ON public.invitation_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_invitation_token();

-- Create security audit table for monitoring
CREATE TABLE IF NOT EXISTS public.security_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on security audit
ALTER TABLE public.security_audit ENABLE ROW LEVEL SECURITY;

-- Only system administrators can view security audit logs
CREATE POLICY "Only system can access security audit" 
ON public.security_audit 
FOR ALL 
USING (false);

-- Security event logging function
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced file upload security validation
CREATE OR REPLACE FUNCTION public.validate_file_upload_security()
RETURNS TRIGGER AS $$
DECLARE
  workspace_storage_limit_gb NUMERIC := 5.0; -- 5GB default limit
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
  
  -- Log file upload for security monitoring
  INSERT INTO public.security_audit (
    event_type, user_id, resource_type, resource_id, details, severity
  ) VALUES (
    'file_upload', NEW.uploaded_by, 'file_upload', NEW.id,
    jsonb_build_object(
      'filename', NEW.original_filename,
      'file_size', NEW.file_size,
      'mime_type', NEW.mime_type,
      'workspace_id', NEW.workspace_id
    ),
    CASE WHEN NEW.file_size > 100*1024*1024 THEN 'high' ELSE 'low' END -- Flag large files
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for file upload validation
DROP TRIGGER IF EXISTS validate_file_upload_security_trigger ON public.file_uploads;
CREATE TRIGGER validate_file_upload_security_trigger
  BEFORE INSERT ON public.file_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_file_upload_security();

-- Enhanced user profile security validation
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
  
  -- Log profile updates for security monitoring
  IF TG_OP = 'UPDATE' AND (OLD.bio IS DISTINCT FROM NEW.bio OR OLD.display_name IS DISTINCT FROM NEW.display_name) THEN
    INSERT INTO public.security_audit (
      event_type, user_id, resource_type, resource_id, details, severity
    ) VALUES (
      'profile_update', NEW.id, 'user_profile', NEW.id,
      jsonb_build_object(
        'old_display_name', OLD.display_name,
        'new_display_name', NEW.display_name,
        'bio_changed', (OLD.bio IS DISTINCT FROM NEW.bio)
      ),
      'low'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user profile validation
DROP TRIGGER IF EXISTS validate_user_profile_security_trigger ON public.user_profiles;
CREATE TRIGGER validate_user_profile_security_trigger
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_profile_security();