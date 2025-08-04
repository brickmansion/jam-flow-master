-- Fix privilege escalation vulnerability in project_members
-- Add policy to prevent users from upgrading their own role
CREATE POLICY "Users cannot upgrade their own role to producer" 
ON public.project_members 
FOR UPDATE 
USING (
  NOT (
    user_id = auth.uid() 
    AND role = 'producer' 
    AND (
      SELECT role FROM public.project_members 
      WHERE id = project_members.id
    ) != 'producer'
  )
);

-- Add audit logging for role changes
CREATE TABLE public.role_change_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL,
  member_id uuid NOT NULL,
  old_role text,
  new_role text NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  reason text
);

-- Enable RLS on audit table
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Only project producers can view audit logs
CREATE POLICY "Producers can view role change audit" 
ON public.role_change_audit 
FOR SELECT 
USING (
  project_id IN (
    SELECT projects.id 
    FROM projects 
    WHERE projects.producer_id = auth.uid()
  )
);

-- Create function to validate role assignments
CREATE OR REPLACE FUNCTION public.validate_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  project_producer_id UUID;
  old_role TEXT;
BEGIN
  -- Get project producer
  SELECT producer_id INTO project_producer_id 
  FROM projects 
  WHERE id = NEW.project_id;
  
  -- Get old role for audit
  SELECT role INTO old_role 
  FROM project_members 
  WHERE id = NEW.id;
  
  -- Only project producer can assign producer role
  IF NEW.role = 'producer' AND auth.uid() != project_producer_id THEN
    RAISE EXCEPTION 'Only project producers can assign producer role';
  END IF;
  
  -- Prevent self role upgrades to producer
  IF NEW.user_id = auth.uid() AND NEW.role = 'producer' AND old_role != 'producer' THEN
    RAISE EXCEPTION 'Users cannot upgrade their own role to producer';
  END IF;
  
  -- Log role change
  IF old_role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.role_change_audit (
      project_id, member_id, old_role, new_role, changed_by
    ) VALUES (
      NEW.project_id, NEW.id, old_role, NEW.role, auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for role validation
CREATE TRIGGER validate_role_change_trigger
  BEFORE UPDATE ON public.project_members
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_change();

-- Add invitation rate limiting table
CREATE TABLE public.invitation_rate_limit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  invited_email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id, invited_email)
);

-- Enable RLS on rate limit table
ALTER TABLE public.invitation_rate_limit ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limit records
CREATE POLICY "Users can view their own rate limits" 
ON public.invitation_rate_limit 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create function to check invitation rate limits
CREATE OR REPLACE FUNCTION public.check_invitation_rate_limit(
  p_user_id uuid,
  p_project_id uuid,
  p_email text
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*) < 10
  FROM public.invitation_rate_limit
  WHERE user_id = p_user_id 
    AND created_at > now() - interval '1 hour';
$$;

-- Add invitation tokens for security
CREATE TABLE public.invitation_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on invitation tokens
ALTER TABLE public.invitation_tokens ENABLE ROW LEVEL SECURITY;

-- Project members and producers can view invitation tokens
CREATE POLICY "Project members can view invitation tokens" 
ON public.invitation_tokens 
FOR SELECT 
USING (
  project_id IN (
    SELECT projects.id 
    FROM projects 
    WHERE projects.producer_id = auth.uid()
  ) OR 
  project_id IN (
    SELECT project_members.project_id 
    FROM project_members 
    WHERE (project_members.user_id = auth.uid() OR project_members.email = auth.email())
  )
);